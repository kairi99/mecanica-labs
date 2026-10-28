// Drag-and-drop assembly controller, shared by the 3D scene and the 2D side view. It owns the parts tray (DOM), the floating drag
// chip, the pick-then-place alternative (WCAG 2.5.7: no drag needed) and the keyboard flow. The stage supplies a StageAdapter that
// knows how to turn a pointer into a point on the table and how to draw zones and the preview. Rules stay in the Apparatus (drop.ts).
import type { ItemId, ApparatusState } from '../../apparatus/index.ts'
import type { ViewContext } from '../view.ts'
import { button, el, rebuild, watch } from '../../../../core/views/dom.ts'
import { itemIcon } from '../itemIcons.ts'
import { reasonText } from '../reasons.ts'
import { strings as invStrings } from '../strings/inventory.ts'
import { strings } from '../strings/dragdrop.ts'
import { benchDraggable, defaultTarget, resolveDrop, zonesFor, type Target, type Zone, type ZoneId } from './snap.ts'
import { executeDrop, type DragSource } from './drop.ts'

/** Items shown in the guide's order. */
export const TRAY_ORDER: readonly ItemId[] = ['rail', 'cart', 'rackStand', 'standBase', 'twoLegStand', 'screws', 'level', 'receiver', 'stopwatch', 'tape', 'markers']

export interface StageAdapter {
  /** Pointer to a probe on the table planes; null when the pointer is not over the stage. */
  probe(clientX: number, clientY: number): import('./snap.ts').Probe | null
  /** Draw the target zones (and which one the pointer would snap to). An empty list clears them. */
  showZones(zones: readonly Zone[], activeId: ZoneId | null): void
  /** Preview of the dragged part following the pointer, snapped to `target` when there is one. */
  showPreview(part: ItemId, at: { x: number; y: number }, target: Target | null): void
  hidePreview(): void
  /** The movable part under the pointer (a part already on the bench), or null. */
  pickBenchPart(clientX: number, clientY: number): ItemId | null
  /** Hide the bench copy of a part while it is carried (null: show it again). */
  lift(part: ItemId | null): void
  /** Freeze the orbit camera while a part is carried. */
  lockCamera(on: boolean): void
  /** Show a refusal message card. */
  refuse(text: string): void
  /** A drop was accepted (the 3D scene uses it to remember where the level lies). */
  placed(target: Target): void
}

export interface DragDropDeps { ctx: ViewContext; stage: HTMLElement; mount: HTMLElement }
export interface DragDropController {
  setAdapter(a: StageAdapter | null): void
  update(): void
  relabel(): void
  /** True while a part is carried or picked: other pointer logic of the stage should keep out. */
  busy(): boolean
  /** Is this client point over the tray? (dropping a part there takes it off the table) */
  overTray(clientX: number, clientY: number): boolean
  /** Drop a part dragged by another handler (the cart handle) on the tray: takes it off the table. */
  removeFromTray(part: ItemId): void
  destroy(): void
}

const MOVE_PX = 5
const HOLD_MS = 240

interface Session {
  part: ItemId
  source: DragSource
  pointerId: number
  pointerType: string
  x0: number
  y0: number
  armed: boolean
  timer: number
  active: boolean
  zones: Zone[]
  chip: HTMLElement | null
  last: { x: number; y: number }
}

export function createDragDrop(d: DragDropDeps): DragDropController {
  const { ctx, stage } = d
  const app = ctx.apparatus
  const T = () => strings[ctx.lang()]
  const name = (id: ItemId): string => invStrings[ctx.lang()].items[id].name
  const fill = (tpl: string, x: string): string => tpl.replace('{x}', x)
  const w = watch(app)

  // ---- DOM -----------------------------------------------------------------------------------------------------------
  const root = el('section', 'dd-tray')
  const head = el('div', 'dd-head')
  const title = el('h3', 'dd-title')
  const hint = el('p', 'dd-hint')
  head.append(title, hint)
  const strip = el('ul', 'dd-strip')
  const zonesBox = el('div', 'dd-zones')
  zonesBox.hidden = true
  const live = el('p', 'dd-live', '', { role: 'status', 'aria-live': 'polite' })
  root.append(head, strip, zonesBox, live)
  d.mount.append(root)

  let adapter: StageAdapter | null = null
  let session: Session | null = null
  let picked: ItemId | null = null
  let suppressClick = false
  const say = (t: string): void => { live.textContent = t }

  const inTray = (part: ItemId): boolean => !app.getState().items[part]
  const trayParts = (): ItemId[] => TRAY_ORDER.filter(inTray)
  const rectOf = (n: HTMLElement): DOMRect => n.getBoundingClientRect()
  const overTray = (x: number, y: number): boolean => {
    const r = rectOf(root)
    return r.width > 0 && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
  }

  // ---- tray -----------------------------------------------------------------------------------------------------------
  function chip(part: ItemId): HTMLElement {
    const li = el('li', 'dd-item')
    const b = button('', 'dd-part', () => {
      if (suppressClick) return
      if (picked === part) cancelPick(); else pick(part)
    })
    b.dataset.k = `part-${part}`
    b.dataset.part = part
    b.setAttribute('aria-pressed', String(picked === part))
    b.setAttribute('aria-label', fill(T().partAria, name(part)))
    b.append(itemIcon(part), el('span', 'dd-name', name(part)))
    b.addEventListener('pointerdown', (e) => startPending(part, 'tray', e))
    li.append(b)
    return li
  }
  function renderTray(): void {
    title.textContent = T().tray
    hint.textContent = T().hint
    const parts = trayParts()
    root.classList.toggle('dd-empty', parts.length === 0)
    rebuild(strip, () => {
      if (parts.length === 0) strip.append(el('li', 'dd-none', T().empty))
      for (const p of parts) strip.append(chip(p))
    })
    renderZones()
  }
  function ctxFor(): { s: ApparatusState } { return { s: app.getState() } }
  function zonesOf(part: ItemId): Zone[] { return zonesFor(part, ctxFor().s, app.railPoseNow()) }

  function renderZones(): void {
    zonesBox.hidden = picked === null
    if (picked === null) { zonesBox.replaceChildren(); return }
    const part = picked
    const zones = zonesOf(part)
    adapter?.showZones(zones, null)
    rebuild(zonesBox, () => {
      zonesBox.append(el('p', 'dd-zones-title', fill(T().picked, name(part))))
      const row = el('div', 'dd-zone-row', undefined, { role: 'group', 'aria-label': T().chooseZone })
      for (const z of zones) {
        const b = button(T().zones[z.id], `dd-zone${z.ready ? '' : ' dd-zone-early'}`, () => placeAtZone(part, z))
        b.dataset.k = `zone-${z.id}`
        if (!z.ready) b.append(el('span', 'dd-zone-note', ` (${T().notReady})`))
        row.append(b)
      }
      const cancel = button(T().cancel, 'dd-zone dd-cancel', () => cancelPick())
      cancel.dataset.k = 'zone-cancel'
      row.append(cancel)
      row.addEventListener('keydown', (e) => {
        const btns = [...row.querySelectorAll<HTMLButtonElement>('button')]
        const i = btns.indexOf(document.activeElement as HTMLButtonElement)
        if (i < 0) return
        const next = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
        if (!next) return
        e.preventDefault()
        btns[(i + next + btns.length) % btns.length]!.focus()
      })
      zonesBox.append(row)
    })
  }

  // ---- pick then place (no dragging needed) -----------------------------------------------------------------------------
  function pick(part: ItemId): void {
    picked = part
    renderTray()
    say(fill(T().picked, name(part)))
    zonesBox.querySelector<HTMLElement>('.dd-zone')?.focus({ preventScroll: true })
  }
  function cancelPick(): void {
    if (picked === null) return
    const part = picked
    picked = null
    adapter?.showZones([], null)
    renderTray()
    strip.querySelector<HTMLElement>(`[data-part="${part}"]`)?.focus({ preventScroll: true })
  }
  function placeAtZone(part: ItemId, zone: Zone): void {
    const target = defaultTarget(zone, ctxFor().s, app.evaluateMarks().aRailPos_mm)
    apply(part, 'tray', target)
  }

  // ---- applying a drop -----------------------------------------------------------------------------------------------
  function apply(part: ItemId, source: DragSource, target: Target): boolean {
    const res = executeDrop(app, part, source, target)
    ctx.changed()
    if (res.ok) {
      adapter?.placed(target)
      say(fill(target.kind === 'tray' && source === 'bench' ? T().removed : T().placed, name(part)))
      if (picked === part) { picked = null; adapter?.showZones([], null) }
      renderTray()
      return true
    }
    adapter?.refuse(reasonText(ctx.lang(), res.reason, res.item))
    say(fill(T().returned, name(part)))
    renderTray()
    return false
  }

  // ---- dragging ---------------------------------------------------------------------------------------------------------
  function targetAt(s: Session, x: number, y: number): Target | null {
    if (overTray(x, y)) return { kind: 'tray' }
    const probe = adapter?.probe(x, y)
    return probe ? resolveDrop(s.zones, probe) : null
  }
  function startPending(part: ItemId, source: DragSource, e: PointerEvent): void {
    if (session || !adapter && source === 'bench') return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const touch = e.pointerType !== 'mouse'
    const s: Session = {
      part, source, pointerId: e.pointerId, pointerType: e.pointerType, x0: e.clientX, y0: e.clientY, armed: source === 'tray' || !touch,
      timer: 0, active: false, zones: [], chip: null, last: { x: e.clientX, y: e.clientY },
    }
    if (source === 'bench' && touch) s.timer = window.setTimeout(() => { s.armed = true }, HOLD_MS)
    session = s
    window.addEventListener('pointermove', onMove, true)
    window.addEventListener('pointerup', onUp, true)
    window.addEventListener('pointercancel', onCancel, true)
    window.addEventListener('keydown', onKeyDrag, true)
  }
  function endSession(): void {
    const s = session
    if (!s) return
    window.clearTimeout(s.timer)
    window.removeEventListener('pointermove', onMove, true)
    window.removeEventListener('pointerup', onUp, true)
    window.removeEventListener('pointercancel', onCancel, true)
    window.removeEventListener('keydown', onKeyDrag, true)
    root.classList.remove('dd-hot')
    if (s.active) {
      adapter?.hidePreview()
      adapter?.showZones([], null)
      adapter?.lockCamera(false)
      adapter?.lift(null)
    }
    session = null
  }
  function activate(s: Session): void {
    s.active = true
    s.zones = zonesOf(s.part)
    const c = el('div', 'dd-chip')
    c.append(itemIcon(s.part), el('span', undefined, name(s.part)))
    document.body.append(c)
    s.chip = c
    adapter?.lockCamera(true)
    if (s.source === 'bench') adapter?.lift(s.part)
    adapter?.showZones(s.zones, null)
    say(fill(T().dragging, name(s.part)))
    suppressClick = true
  }
  function moveChip(s: Session, x: number, y: number): void {
    if (s.chip) s.chip.style.transform = `translate(${Math.round(x + 12)}px, ${Math.round(y + 12)}px)`
  }
  function onMove(e: PointerEvent): void {
    const s = session
    if (!s || e.pointerId !== s.pointerId) return
    s.last = { x: e.clientX, y: e.clientY }
    if (!s.active) {
      const dx = e.clientX - s.x0, dy = e.clientY - s.y0
      const dist = Math.hypot(dx, dy)
      if (dist <= MOVE_PX) return
      if (s.source === 'bench' && !s.armed) { endSession(); return } // a quick swipe on a part orbits the camera instead
      if (s.pointerType !== 'mouse' && s.source === 'tray' && Math.abs(dx) > Math.abs(dy) * 1.2) { endSession(); return } // scrolling the strip
      if (!adapter) { endSession(); return }
      activate(s)
    }
    e.preventDefault()
    moveChip(s, e.clientX, e.clientY)
    const target = targetAt(s, e.clientX, e.clientY)
    root.classList.toggle('dd-hot', target?.kind === 'tray' && s.source === 'bench')
    adapter?.showZones(s.zones, target?.kind === 'zone' ? target.zone.id : null)
    adapter?.showPreview(s.part, { x: e.clientX, y: e.clientY }, target)
    if (target?.kind === 'tray' && s.source === 'bench') say(fill(T().overTray, name(s.part)))
  }
  function flyBack(s: Session): void {
    const c = s.chip
    if (!c) return
    const home = s.source === 'tray' ? strip.querySelector<HTMLElement>(`[data-part="${s.part}"]`) : null
    const r = home ? rectOf(home) : null
    if (r && !ctx.reducedMotion() && typeof c.animate === 'function') {
      const from = c.style.transform
      const a = c.animate([{ transform: from }, { transform: `translate(${Math.round(r.left)}px, ${Math.round(r.top)}px)` }], { duration: 260, easing: 'ease-out' })
      a.onfinish = () => c.remove()
      a.oncancel = () => c.remove()
    } else c.remove()
  }
  function onUp(e: PointerEvent): void {
    const s = session
    if (!s || e.pointerId !== s.pointerId) return
    const wasActive = s.active
    const target = wasActive ? targetAt(s, e.clientX, e.clientY) : null
    endSession()
    if (!wasActive) return // a click: the button's click handler picks the part
    window.setTimeout(() => { suppressClick = false }, 0)
    if (!target || (target.kind === 'tray' && s.source === 'tray')) {
      flyBack(s)
      say(T().noTarget)
      return
    }
    const ok = apply(s.part, s.source, target)
    if (ok) s.chip?.remove(); else flyBack(s)
  }
  function onCancel(e: PointerEvent): void {
    const s = session
    if (!s || e.pointerId !== s.pointerId) return
    endSession()
    s.chip?.remove()
    window.setTimeout(() => { suppressClick = false }, 0)
  }
  function onKeyDrag(e: KeyboardEvent): void {
    if (e.key !== 'Escape' || !session) return
    const s = session
    endSession()
    s.chip?.remove()
    window.setTimeout(() => { suppressClick = false }, 0)
  }

  // ---- stage pointer: place a picked part, or lift a part off the bench -------------------------------------------------
  let placing: { id: number; x: number; y: number } | null = null
  const onStageDown = (e: PointerEvent): void => {
    if (!adapter || session) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    if (picked !== null) {
      if (e.target instanceof HTMLElement && e.target.closest('.scene3d-chip, .scene3d-card, .scene3d-menu, .scene3d-topleft, .scene3d-topright')) return
      e.preventDefault()
      e.stopImmediatePropagation()
      placing = { id: e.pointerId, x: e.clientX, y: e.clientY }
      window.addEventListener('pointerup', onPlaceUp, true)
      return
    }
    if (!(e.target instanceof HTMLCanvasElement) && !(e.target instanceof SVGElement)) return
    const part = adapter.pickBenchPart(e.clientX, e.clientY)
    if (part && benchDraggable(part, app.getState())) startPending(part, 'bench', e)
  }
  const onPlaceUp = (e: PointerEvent): void => {
    window.removeEventListener('pointerup', onPlaceUp, true)
    const p = placing
    placing = null
    if (!p || p.id !== e.pointerId || picked === null || !adapter) return
    if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > 6) return
    const probe = adapter.probe(e.clientX, e.clientY)
    const target = probe ? resolveDrop(zonesOf(picked), probe) : null
    if (!target) { say(T().noTarget); return }
    apply(picked, 'tray', target)
  }
  const onKeyPick = (e: KeyboardEvent): void => { if (e.key === 'Escape' && picked !== null && !session) cancelPick() }
  stage.addEventListener('pointerdown', onStageDown, true)
  window.addEventListener('keydown', onKeyPick)
  root.addEventListener('keydown', onKeyPick)

  renderTray()
  return {
    setAdapter(a) { adapter = a; if (a && picked !== null) renderZones() },
    update() {
      if (!w.dirty()) return
      w.clear()
      if (session?.active) return
      if (picked !== null && !inTray(picked)) { picked = null; adapter?.showZones([], null) }
      renderTray()
    },
    relabel() { w.touch() },
    busy: () => picked !== null || session?.active === true,
    overTray,
    removeFromTray(part) { apply(part, 'bench', { kind: 'tray' }) },
    destroy() {
      endSession()
      w.off()
      stage.removeEventListener('pointerdown', onStageDown, true)
      window.removeEventListener('keydown', onKeyPick)
      window.removeEventListener('pointerup', onPlaceUp, true)
      document.querySelectorAll('.dd-chip').forEach((n) => n.remove())
      root.remove()
    },
  }
}
