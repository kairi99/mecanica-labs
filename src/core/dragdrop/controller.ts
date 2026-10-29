// Drag-and-drop assembly controller, shared by every experiment. It owns the parts tray (DOM), the floating drag chip, the
// pick-then-place alternative (WCAG 2.5.7: no drag needed) and the keyboard flow. The experiment supplies a `DragDropModel`
// (its parts, zones and the call that executes a drop) and, per stage (3D scene, 2D side view), a `StageAdapter` that turns a
// pointer into a point on the table and draws zones and the preview. No rules live here: the model decides what a drop does.
import type { Lang } from '../i18n.ts'
import { button, el, rebuild, watch, type Subscribable } from '../views/dom.ts'
import { strings } from './strings.ts'
import { resolveDrop, type Probe, type Zone, type ZoneTarget } from './snap.ts'

export type DragSource = 'tray' | 'bench'

/** What a drop did. A refusal carries the text to show (the model turns its own reason into the player's language). */
export type DropOutcome = { ok: true; added?: boolean; removed?: boolean } | { ok: false; message: string }

/** Everything the controller needs to know about the experiment. P: part id, Z: zone, T: drop target (zone target plus own fields). */
export interface DragDropModel<P extends string, Z extends Zone, T extends ZoneTarget<Z>> {
  /** The parts in the order the tray shows them. */
  parts: readonly P[]
  name(part: P): string
  icon(part: P): Element
  /** The part lies on the table (else it is in the tray). */
  onBench(part: P): boolean
  /** A part on the table can be lifted again (default true). */
  benchDraggable?(part: P): boolean
  /** Every place the part can be dropped now, the table (area zone) included. */
  zonesFor(part: P): Z[]
  zoneLabel(zone: Z): string
  /** Zone for a drop point. Default: the nearest in snap range (core `resolveDrop`; then T is a plain ZoneTarget). Override to add fields to the target. */
  resolve?(zones: readonly Z[], probe: Probe): T | null
  /** The target for a zone chosen without a pointer (keyboard, zone buttons). */
  defaultTarget(zone: Z): T
  /** Do the drop. From the tray the part must be put on the table first and taken back off if the zone refuses. */
  executeDrop(part: P, source: DragSource, target: T): DropOutcome
  /** Announces every change of the model (the controller re-renders). */
  changes: Subscribable
}

export interface StageAdapter<P extends string, Z extends Zone, T extends ZoneTarget<Z>> {
  /** Pointer to a probe on the table planes; null when the pointer is not over the stage. */
  probe(clientX: number, clientY: number): Probe | null
  /** Draw the target zones (and which one the pointer would snap to). An empty list clears them. */
  showZones(zones: readonly Z[], activeId: string | null): void
  /** Preview of the dragged part following the pointer, snapped to `target` when there is one. */
  showPreview(part: P, at: { x: number; y: number }, target: T | null): void
  hidePreview(): void
  /** The movable part under the pointer (a part already on the bench), or null. */
  pickBenchPart(clientX: number, clientY: number): P | null
  /** Hide the bench copy of a part while it is carried (null: show it again). */
  lift(part: P | null): void
  /** Freeze the orbit camera while a part is carried. */
  lockCamera(on: boolean): void
  /** Show a refusal message card. */
  refuse(text: string): void
  /** A drop was accepted. */
  placed(target: T): void
}

export interface DragDropDeps<P extends string, Z extends Zone, T extends ZoneTarget<Z>> {
  model: DragDropModel<P, Z, T>
  lang: () => Lang
  reducedMotion: () => boolean
  /** Tell the shell the model changed (after every drop, accepted or not). */
  changed: () => void
  stage: HTMLElement
  mount: HTMLElement
  /** Clicks on these stage overlays never place a picked part. */
  stageOverlays?: string
}
export interface DragDropController<P extends string, Z extends Zone, T extends ZoneTarget<Z>> {
  setAdapter(a: StageAdapter<P, Z, T> | null): void
  update(): void
  relabel(): void
  /** True while a part is carried or picked: other pointer logic of the stage should keep out. */
  busy(): boolean
  /** Is this client point over the tray? (dropping a part there takes it off the table) */
  overTray(clientX: number, clientY: number): boolean
  /** Drop a part dragged by another handler (e.g. a handle on the part) on the tray: takes it off the table. */
  removeFromTray(part: P): void
  destroy(): void
}

const MOVE_PX = 5
/** Touch: a part on the table needs this long a press before it moves (a quick swipe orbits the camera instead). */
const HOLD_MS = 240
const DEFAULT_OVERLAYS = '.scene3d-chip, .scene3d-card, .scene3d-menu, .scene3d-topleft, .scene3d-topright'

interface Session<P extends string, Z extends Zone> {
  part: P
  source: DragSource
  pointerId: number
  pointerType: string
  x0: number
  y0: number
  armed: boolean
  timer: number
  active: boolean
  zones: Z[]
  chip: HTMLElement | null
  last: { x: number; y: number }
}

export function createDragDrop<P extends string, Z extends Zone, T extends ZoneTarget<Z>>(d: DragDropDeps<P, Z, T>): DragDropController<P, Z, T> {
  const { model, stage } = d
  type Ses = Session<P, Z>
  const S = () => strings[d.lang()]
  const name = (id: P): string => model.name(id)
  const fill = (tpl: string, x: string): string => tpl.replace('{x}', x)
  const w = watch(model.changes)

  // ---- DOM -----------------------------------------------------------------------------------------------------------
  const root = el('section', 'dd-tray')
  const head = el('div', 'dd-head')
  const title = el('h3', 'dd-title')
  const hint = el('p', 'dd-hint')
  head.append(title, hint)
  const strip = el('ul', 'dd-strip')
  // parts lying on the table, for the pick-then-place flow (keyboard, screen reader, no dragging)
  const bench = el('details', 'dd-bench')
  const benchSum = el('summary', 'dd-bench-sum')
  const benchStrip = el('ul', 'dd-strip dd-bench-strip')
  bench.append(benchSum, benchStrip)
  const zonesBox = el('div', 'dd-zones')
  zonesBox.hidden = true
  const live = el('p', 'dd-live', '', { role: 'status', 'aria-live': 'polite' })
  root.append(head, strip, bench, zonesBox, live)
  d.mount.append(root)

  let adapter: StageAdapter<P, Z, T> | null = null
  let session: Ses | null = null
  let picked: P | null = null
  let suppressClick = false
  const say = (t: string): void => { live.textContent = t }

  const inTray = (part: P): boolean => !model.onBench(part)
  const trayParts = (): P[] => model.parts.filter(inTray)
  const rectOf = (n: HTMLElement): DOMRect => n.getBoundingClientRect()
  const overTray = (x: number, y: number): boolean => {
    const r = rectOf(root)
    return r.width > 0 && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
  }

  const resolveOf = (zones: readonly Z[], probe: Probe): T | null => model.resolve ? model.resolve(zones, probe) : (resolveDrop(zones, probe) as T | null)

  // ---- tray -----------------------------------------------------------------------------------------------------------
  function chip(part: P, onTable = false): HTMLElement {
    const li = el('li', 'dd-item')
    const b = button('', 'dd-part', () => {
      if (suppressClick) return
      if (picked === part) cancelPick(); else pick(part)
    })
    b.dataset.k = `part-${part}`
    b.dataset.part = part
    b.setAttribute('aria-pressed', String(picked === part))
    b.setAttribute('aria-label', fill(onTable ? S().benchAria : S().partAria, name(part)))
    b.append(model.icon(part), el('span', 'dd-name', name(part)))
    // parts on the table are dragged on the stage itself; their chips only pick the part (then choose a spot)
    if (!onTable) b.addEventListener('pointerdown', (e) => startPending(part, 'tray', e))
    else b.classList.add('dd-part-bench')
    li.append(b)
    return li
  }
  function renderTray(): void {
    title.textContent = S().tray
    const parts = trayParts()
    const onTable = model.parts.filter((p) => !inTray(p))
    hint.textContent = parts.length === 0 ? S().empty : S().hint
    root.classList.toggle('dd-empty', parts.length === 0)
    strip.hidden = parts.length === 0
    rebuild(strip, () => { for (const p of parts) strip.append(chip(p)) })
    benchSum.textContent = fill(S().benchSummary, String(onTable.length))
    bench.hidden = onTable.length === 0
    rebuild(benchStrip, () => { for (const p of onTable) benchStrip.append(chip(p, true)) })
    renderZones()
  }
  function zonesOf(part: P): Z[] { return model.zonesFor(part) }

  function renderZones(): void {
    zonesBox.hidden = picked === null
    if (picked === null) { zonesBox.replaceChildren(); return }
    const part = picked
    const zones = zonesOf(part)
    adapter?.showZones(zones, null)
    rebuild(zonesBox, () => {
      zonesBox.append(el('p', 'dd-zones-title', fill(S().picked, name(part))))
      const row = el('div', 'dd-zone-row', undefined, { role: 'group', 'aria-label': S().chooseZone })
      for (const z of zones) {
        const b = button(model.zoneLabel(z), `dd-zone${z.ready ? '' : ' dd-zone-early'}`, () => placeAtZone(part, z))
        b.dataset.k = `zone-${z.id}`
        if (!z.ready) b.append(el('span', 'dd-zone-note', ` (${S().notReady})`))
        row.append(b)
      }
      const cancel = button(S().cancel, 'dd-zone dd-cancel', () => cancelPick())
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
  function pick(part: P): void {
    picked = part
    if (!inTray(part)) bench.open = true
    renderTray()
    say(fill(S().picked, name(part)))
    zonesBox.querySelector<HTMLElement>('.dd-zone')?.focus({ preventScroll: true })
  }
  function cancelPick(): void {
    if (picked === null) return
    const part = picked
    picked = null
    adapter?.showZones([], null)
    renderTray()
    root.querySelector<HTMLElement>(`[data-part="${part}"]`)?.focus({ preventScroll: true })
  }
  function placeAtZone(part: P, zone: Z): void {
    apply(part, 'tray', model.defaultTarget(zone))
  }

  // ---- applying a drop -----------------------------------------------------------------------------------------------
  function apply(part: P, source: DragSource, target: T): boolean {
    const res = model.executeDrop(part, source, target)
    d.changed()
    if (res.ok) {
      adapter?.placed(target)
      say(fill(target.kind === 'tray' && source === 'bench' ? S().removed : S().placed, name(part)))
      if (picked === part) { picked = null; adapter?.showZones([], null) }
      renderTray()
      return true
    }
    adapter?.refuse(res.message)
    say(fill(S().returned, name(part)))
    renderTray()
    return false
  }

  // ---- dragging ---------------------------------------------------------------------------------------------------------
  function targetAt(s: Ses, x: number, y: number): T | null {
    if (overTray(x, y)) return { kind: 'tray' } as T
    const probe = adapter?.probe(x, y)
    return probe ? resolveOf(s.zones, probe) : null
  }
  function startPending(part: P, source: DragSource, e: PointerEvent): void {
    if (session || !adapter && source === 'bench') return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const touch = e.pointerType !== 'mouse'
    const s: Ses = {
      part, source, pointerId: e.pointerId, pointerType: e.pointerType, x0: e.clientX, y0: e.clientY, armed: source === 'tray' || !touch,
      timer: 0, active: false, zones: [] as Z[], chip: null, last: { x: e.clientX, y: e.clientY },
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
  function activate(s: Ses): void {
    s.active = true
    s.zones = zonesOf(s.part)
    const c = el('div', 'dd-chip')
    c.append(model.icon(s.part), el('span', undefined, name(s.part)))
    document.body.append(c)
    s.chip = c
    adapter?.lockCamera(true)
    if (s.source === 'bench') adapter?.lift(s.part)
    adapter?.showZones(s.zones, null)
    say(fill(S().dragging, name(s.part)))
    suppressClick = true
  }
  function moveChip(s: Ses, x: number, y: number): void {
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
    if (target?.kind === 'tray' && s.source === 'bench') say(fill(S().overTray, name(s.part)))
  }
  function flyBack(s: Ses): void {
    const c = s.chip
    if (!c) return
    const home = s.source === 'tray' ? strip.querySelector<HTMLElement>(`[data-part="${s.part}"]`) : null
    const r = home ? rectOf(home) : null
    if (r && !d.reducedMotion() && typeof c.animate === 'function') {
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
      say(S().noTarget)
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
      if (e.target instanceof HTMLElement && e.target.closest(d.stageOverlays ?? DEFAULT_OVERLAYS)) return
      e.preventDefault()
      e.stopImmediatePropagation()
      placing = { id: e.pointerId, x: e.clientX, y: e.clientY }
      window.addEventListener('pointerup', onPlaceUp, true)
      return
    }
    if (!(e.target instanceof HTMLCanvasElement) && !(e.target instanceof SVGElement)) return
    const part = adapter.pickBenchPart(e.clientX, e.clientY)
    if (part && (model.benchDraggable?.(part) ?? true)) startPending(part, 'bench', e)
  }
  const onPlaceUp = (e: PointerEvent): void => {
    window.removeEventListener('pointerup', onPlaceUp, true)
    const p = placing
    placing = null
    if (!p || p.id !== e.pointerId || picked === null || !adapter) return
    if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > 6) return
    const probe = adapter.probe(e.clientX, e.clientY)
    const target = probe ? resolveOf(zonesOf(picked), probe) : null
    if (!target || target.kind === 'tray') { say(S().noTarget); return }
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
      renderTray()
    },
    relabel() { w.touch() },
    busy: () => picked !== null || session?.active === true,
    overTray,
    removeFromTray(part) { apply(part, 'bench', { kind: 'tray' } as T) },
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
