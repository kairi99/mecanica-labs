// Direct manipulation of the table: orbit (OrbitControls) versus dragging a handle, wheel fine adjustment, taps, tools,
// hover tooltips and keyboard orbit. Part of the lazy scene chunk. Every action here is an Apparatus call; refusals are shown
// as a message card with the reason text. Pointer events carry event.timeStamp (same clock as ctx.now()).
//
// Pointer rules (as in the photoelectric bench): a press on a handle disables OrbitControls, captures the pointer and swallows
// the event in the container's capture phase, before OrbitControls sees it. Everything else is left to OrbitControls; a short
// still press (a tap) on it selects, uses the active tool or opens the part card.
import * as THREE from 'three'
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { Apparatus, CaliperTarget, Reason, Result } from '../../apparatus/index.ts'
import type { ViewContext } from '../view.ts'
import type { strings } from '../strings/scene3d.ts'
import { CART, ROD_Z } from './models.ts'
import {
  RAIL, cartFrontValid, ghostsFor, footFromDrag_mm, footWheelStep_mm, markerLabels, onRailFootprint, rackFromHeight_mm, rackWheelStep_mm,
  railLocalX_cm, railPosFromLocalX_mm, type GhostId,
} from './units.ts'
import { FOOT_STEP_mm, railPos_mm } from '../../apparatus/index.ts'
import type { CardInfo } from './types.ts'

type Strs = typeof strings.es
type Tool = 'select' | 'markers' | 'level' | 'caliper'
type Handle = 'rack' | 'foot' | 'marker' | 'cart'

interface Pick {
  partId: string | null
  handle: Handle | null
  ghost: GhostId | null
  markId: string | null
  point: THREE.Vector3 | null
  object: THREE.Object3D | null
}

export interface InteractionDeps {
  a: Apparatus
  ctx: ViewContext
  container: HTMLElement
  canvas: HTMLCanvasElement
  camera: THREE.PerspectiveCamera
  controls: OrbitControls
  pickables(): THREE.Object3D[]
  requestRender(): void
  S(): Strs
  rail: { root: THREE.Object3D; localX(world: THREE.Vector3): THREE.Vector3 }
  cart: { root: THREE.Object3D; preview: { active: boolean; front_mm: number | null; world: THREE.Vector3 | null; invalid: boolean } }
  rackKnob: THREE.Object3D
  markerPreview: Map<string, number>
  setLevelX(x_cm: number): void
  getTool(): Tool
  setCaliperTarget(t: CaliperTarget): void
  onCard(card: CardInfo | null): void
  onStatus(text: string): void
  outline: { hover: THREE.Material }
  changed(): void
  refreshSoon(): void
  onUserCamera(): void
  openPanel?(panel: string): void
}

export interface Interaction {
  /** Per frame; returns true while something animates. */
  tick(): boolean
  setTool(t: Tool): void
  relabel(): void
  destroy(): void
}

const MOVE_PX = 5, TAP_MS = 500
const PANEL_OF: Record<string, string> = { cart: 'digicart', stopwatch: 'stopwatch', caliper: 'caliper', level: 'level' }

export function createInteraction(d: InteractionDeps): Interaction {
  const { container, canvas, camera, controls, a } = d
  const ray = new THREE.Raycaster()
  const ndc = new THREE.Vector2()
  const tmp = new THREE.Vector3()

  // ---------------------------------------------------------------- DOM: tooltip and drag readout
  const tip = document.createElement('div')
  tip.className = 'scene3d-tip'
  tip.hidden = true
  tip.setAttribute('aria-hidden', 'true')
  const readout = document.createElement('div')
  readout.className = 'scene3d-readout'
  readout.hidden = true
  readout.setAttribute('aria-hidden', 'true')
  container.append(tip, readout)
  const placeLabel = (el: HTMLElement, cx: number, cy: number, dy: number): void => {
    const r = container.getBoundingClientRect()
    const x = Math.min(Math.max(cx - r.left, 8), Math.max(8, r.width - el.offsetWidth - 8))
    const y = Math.min(Math.max(cy - r.top + dy, 8), Math.max(8, r.height - el.offsetHeight - 8))
    el.style.transform = `translate(${x}px, ${y}px)`
  }

  // ---------------------------------------------------------------- names and cards
  const partInfo = (id: string): { name: string; info: string } => (d.S().parts as Record<string, { name: string; info: string }>)[id] ?? { name: id, info: '' }
  const labelOf = (markId: string): string => markerLabels(a.getMarkers(), a.evaluateMarks()).get(markId) ?? ''
  const nameOf = (p: Pick): string => {
    if (p.ghost) return `${d.S().parts.ghost.name}: ${ghostName(p.ghost)}`
    if (p.partId === 'tape' && p.markId) return `${partInfo('tape').name} ${labelOf(p.markId)} cm`
    return p.partId && p.partId !== 'table' ? partInfo(p.partId).name : ''
  }
  const ghostName = (g: GhostId): string => {
    const P = d.S().parts
    return ({ stand: P.rackStand.name, clamp: P.rail.name, twoLeg: P.twoLegStand.name, receiver: P.receiver.name, cart: P.cart.name })[g]
  }
  const message = (reason: Reason | string): void => {
    const R = d.S().refused as Record<string, string>
    d.onCard({ title: '', text: R[reason] ?? `${d.S().refusedGeneric} (${reason}).`, actions: [], panel: null, alert: true })
  }
  /** Run an apparatus action: refreshes everything on success, shows the reason on refusal. */
  const act = (res: Result): boolean => {
    if (res.ok) { d.changed(); return true }
    message(res.reason)
    d.refreshSoon()
    return false
  }
  const cardFor = (p: Pick): CardInfo | null => {
    const id = p.partId
    if (!id || id === 'table') return null
    const S = d.S()
    const { name, info } = partInfo(id)
    const st = a.getState()
    const gids = ghostsFor(st)
    const actions: CardInfo['actions'] = []
    const attach = (label: string, run: () => Result): void => { actions.push({ label, run: () => { act(run()) } }) }
    if ((id === 'rackStand' || id === 'standBase' || id === 'rackKnob') && gids.includes('stand')) attach(S.attach, () => a.attach('standBase'))
    if (id === 'rail' && gids.includes('clamp')) {
      attach(S.attachClampE1, () => a.attach('rackClamp', { railEnd: 'E1' }))
      attach(S.attachClampE2, () => a.attach('rackClamp', { railEnd: 'E2' }))
    }
    if (id === 'twoLegStand' && gids.includes('twoLeg')) attach(S.attach, () => a.attach('twoLegStand'))
    if (id === 'receiver' && gids.includes('receiver')) attach(S.attach, () => a.attach('receiver'))
    if (id === 'cart') {
      if (gids.includes('cart')) attach(S.placeCartHere, () => a.placeCart(ghostFront()))
      else if (st.cart.placed) {
        actions.push({ label: S.release, run: (ts) => { act(a.releaseCart(ts)) } })
        attach(S.resetCart, () => a.resetCart())
      }
    }
    if (id === 'level') {
      attach(S.levelOnRail, () => a.placeLevel('rail'))
      attach(S.levelOnTable, () => a.placeLevel('table'))
    }
    if (id === 'tape' && p.markId) { const mid = p.markId; attach(S.removeMark, () => a.removeMarker(mid)) }
    const title = id === 'tape' && p.markId ? `${name} ${labelOf(p.markId)} cm` : name
    return { title, text: info, actions, panel: id === 'tape' || id === 'rackKnob' ? 'inventory' : PANEL_OF[id] ?? 'inventory', alert: false }
  }
  const ghostFront = (): number => {
    const geo = a.geometry()
    const ev = a.evaluateMarks()
    return ev.aRailPos_mm ?? railPos_mm((CART.length + 1) / 100, geo?.scaleZeroAtHighEnd ?? true)
  }

  // ---------------------------------------------------------------- picking
  const setRay = (clientX: number, clientY: number): boolean => {
    const r = canvas.getBoundingClientRect()
    if (r.width === 0 || r.height === 0) return false
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1)
    ray.setFromCamera(ndc, camera)
    return true
  }
  const visibleChain = (o: THREE.Object3D | null): boolean => { for (let x = o; x; x = x.parent) if (!x.visible) return false; return true }
  const pickAt = (clientX: number, clientY: number): Pick => {
    const none: Pick = { partId: null, handle: null, ghost: null, markId: null, point: null, object: null }
    if (!setRay(clientX, clientY)) return none
    const hits = ray.intersectObjects(d.pickables(), true).filter((h) => (h.object as THREE.Mesh).isMesh && !h.object.userData.overlay && visibleChain(h.object))
    const h0 = hits[0]
    if (!h0) return none
    const out: Pick = { ...none, point: h0.point.clone(), object: h0.object }
    for (let o: THREE.Object3D | null = h0.object; o; o = o.parent) {
      const u = o.userData
      if (u.ghostId && !out.ghost) out.ghost = u.ghostId as GhostId
      if (u.dragHandle && !out.handle) out.handle = u.dragHandle as Handle
      if (u.partId && !out.partId) out.partId = u.partId as string
      if (u.markId && !out.markId) out.markId = u.markId as string
    }
    if (out.ghost) { out.handle = null; out.partId = 'ghost' }
    return out
  }

  // ---------------------------------------------------------------- geometry of drags
  /** Plane parallel to the rail top surface, `height_cm` above it (grabbing a tall part keeps its pointer offset exact). */
  const railPlane = (height_cm = 0): THREE.Plane => {
    d.rail.root.updateWorldMatrix(true, false)
    const n = new THREE.Vector3(0, 1, 0).transformDirection(d.rail.root.matrixWorld)
    const o = d.rail.root.getWorldPosition(new THREE.Vector3()).addScaledVector(n, height_cm)
    return new THREE.Plane().setFromNormalAndCoplanarPoint(n, o)
  }
  const zeroHigh = (): boolean => a.geometry()?.scaleZeroAtHighEnd ?? true
  /** Printed-scale position under the pointer on the rail surface plane (and the local point), or null. */
  const railPointer = (cx: number, cy: number, height_cm = 0): { pos_mm: number; local: THREE.Vector3 } | null => {
    if (!setRay(cx, cy)) return null
    const hit = ray.ray.intersectPlane(railPlane(height_cm), tmp)
    if (!hit) return null
    const local = d.rail.localX(hit)
    return { pos_mm: railPosFromLocalX_mm(local.x, zeroHigh()), local }
  }
  const rackPlane = (): THREE.Plane => {
    const nx = camera.position.x, nz = camera.position.z - ROD_Z
    const n = new THREE.Vector3(nx, 0, nz).normalize()
    return new THREE.Plane().setFromNormalAndCoplanarPoint(n, new THREE.Vector3(0, 0, ROD_Z))
  }
  const knobScreenY = (obj: THREE.Object3D): number => {
    const v = obj.getWorldPosition(new THREE.Vector3()).project(camera)
    const r = canvas.getBoundingClientRect()
    return r.top + ((1 - v.y) / 2) * r.height
  }

  // ---------------------------------------------------------------- drag state
  interface Active {
    pointerId: number
    handle: Handle
    pick: Pick
    sx: number; sy: number
    moved: boolean
    // per-kind scratch
    grab: number
    planeY: number
    start: number
    time: number
    pending: number | null
  }
  let active: Active | null = null
  let plain: { id: number; x: number; y: number; t: number } | null = null
  const setCursor = (c: string): void => { canvas.style.cursor = c }
  const knobOf = (): THREE.Object3D => d.rackKnob

  const showReadout = (x: number, y: number, text: string): void => {
    readout.textContent = text
    readout.hidden = false
    placeLabel(readout, x + 14, y, -44)
  }
  const hideReadout = (): void => { readout.hidden = true }

  const startDrag = (e: PointerEvent, pick: Pick): void => {
    const h = pick.handle!
    const st = a.getState()
    const ac: Active = { pointerId: e.pointerId, handle: h, pick, sx: e.clientX, sy: e.clientY, moved: false, grab: 0, planeY: 0, start: 0, time: e.timeStamp, pending: null }
    active = ac
    if (h === 'rack') {
      if (setRay(e.clientX, e.clientY)) {
        const hit = ray.ray.intersectPlane(rackPlane(), tmp)
        ac.grab = hit ? hit.y - knobOf().getWorldPosition(new THREE.Vector3()).y : 0
      }
    } else if (h === 'foot') ac.start = st.foot_mm
    else if (h === 'marker' && pick.markId) {
      const m = a.getMarkers().find((x) => x.id === pick.markId)
      const rp = railPointer(e.clientX, e.clientY)
      ac.start = m?.railPos_mm ?? 0
      ac.grab = rp && m ? m.railPos_mm - rp.pos_mm : 0
    } else if (h === 'cart') {
      const cs = a.cartState(d.ctx.now())
      ac.planeY = pick.point ? Math.max(0, d.rail.localX(pick.point).y) : 0
      const rp = railPointer(e.clientX, e.clientY, ac.planeY)
      ac.start = cs.frontRailPos_mm ?? NaN
      ac.grab = rp && cs.frontRailPos_mm !== null ? cs.frontRailPos_mm - rp.pos_mm : 0
    }
    setCursor('grabbing')
  }

  const moveDrag = (ac: Active, e: PointerEvent): void => {
    const S = d.S()
    if (ac.handle === 'rack') {
      if (!setRay(e.clientX, e.clientY)) return
      const hit = ray.ray.intersectPlane(rackPlane(), tmp)
      if (!hit) return
      const knobY = hit.y - ac.grab
      const rack = rackFromHeight_mm(knobY + 2.4)
      if (rack !== a.getState().rack_mm) act(a.setRackHeight_mm(rack))
      showReadout(e.clientX, e.clientY, `${S.rackReadout}: ${a.getState().rack_mm} mm`)
    } else if (ac.handle === 'foot') {
      const foot = footFromDrag_mm(ac.start, ac.sy - e.clientY)
      if (foot !== a.getState().foot_mm) act(a.setFoot_mm(foot))
      showReadout(e.clientX, e.clientY, `${S.footReadout}: ${a.getState().foot_mm.toFixed(2)} mm`)
    } else if (ac.handle === 'marker' && ac.pick.markId) {
      const rp = railPointer(e.clientX, e.clientY)
      if (!rp) return
      const pos = Math.round(Math.min(1200, Math.max(0, rp.pos_mm + ac.grab)) * 2) / 2
      d.markerPreview.set(ac.pick.markId, pos)
      ac.pending = pos
      d.refreshSoon()
      showReadout(e.clientX, e.clientY, `${pos.toFixed(1)} mm`)
    } else if (ac.handle === 'cart') {
      const st = a.getState()
      const geo = st.geometry
      const pv = d.cart.preview
      const rp = railPointer(e.clientX, e.clientY, ac.planeY)
      if (geo && rp && (st.cart.placed || onRailFootprint(rp.local.x, rp.local.z, 6))) {
        const zh = geo.scaleZeroAtHighEnd!
        const front = st.cart.placed ? rp.pos_mm + ac.grab : railPos_mm((rp.local.x + CART.length / 2) / 100, zh)
        pv.active = true; pv.world = null; pv.front_mm = Math.round(front * 2) / 2
        pv.invalid = !cartFrontValid(pv.front_mm, zh, st.joints.receiver)
        ac.pending = pv.front_mm
      } else if (setRay(e.clientX, e.clientY)) {
        const hit = ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.3), tmp)
        if (hit) { pv.active = true; pv.front_mm = null; pv.world = new THREE.Vector3(hit.x + CART.length / 2, 0.3, hit.z); pv.invalid = false; ac.pending = null }
      }
      d.requestRender()
      showReadout(e.clientX, e.clientY, pv.front_mm !== null ? `${S.cartDrag}: ${pv.front_mm.toFixed(1)} mm` : S.cartDrag)
    }
  }

  const finishDrag = (e: { pointerId: number; timeStamp: number; clientY?: number } | null, cancelled: boolean): void => {
    const ac = active
    if (!ac || (e && e.pointerId !== ac.pointerId)) return
    active = null
    try { canvas.releasePointerCapture(ac.pointerId) } catch { /* released */ }
    controls.enabled = true
    hideReadout()
    setCursor('')
    const pv = d.cart.preview
    if (ac.handle === 'marker' && ac.pick.markId) {
      d.markerPreview.delete(ac.pick.markId)
      if (!cancelled && ac.moved && ac.pending !== null) act(a.moveMarker(ac.pick.markId, ac.pending))
      else if (!ac.moved && !cancelled) d.onCard(cardFor(ac.pick))
      d.refreshSoon()
    } else if (ac.handle === 'cart') {
      pv.active = false
      const st = a.getState()
      if (!cancelled && ac.moved) {
        if (ac.pending !== null) act(a.placeCart(ac.pending))
      } else if (!cancelled) {
        const phase = a.cartState(e?.timeStamp ?? d.ctx.now()).phase
        if (!st.cart.placed) d.onCard(cardFor(ac.pick))
        else if (phase === 'stopped' || phase === 'stuck') act(a.resetCart())
        else act(a.releaseCart(e?.timeStamp ?? d.ctx.now()))
      }
      d.refreshSoon()
    } else if (!ac.moved && !cancelled) {
      // a tap on the knob or the foot: fine step by halves (above the handle's centre raises, below lowers)
      const cy = e?.clientY
      const up = cy !== undefined && cy < knobScreenY(ac.handle === 'rack' ? knobOf() : (ac.pick.object ?? knobOf()))
      if (ac.handle === 'rack') act(a.setRackHeight_mm(a.getState().rack_mm + (up ? 1 : -1)))
      else act(a.setFoot_mm(a.getState().foot_mm + (up ? 1 : -1) * FOOT_STEP_mm))
    }
    d.requestRender()
  }

  // ---------------------------------------------------------------- taps (tools, cards, ghosts)
  const announce = (text: string): void => d.onStatus(text)
  const tapPart = (p: Pick, e: PointerEvent): void => {
    const S = d.S()
    if (p.ghost) {
      const g = p.ghost
      if (g === 'clamp') { d.onCard(cardFor({ ...p, partId: 'rail', ghost: null })); return }
      if (g === 'stand') act(a.attach('standBase'))
      else if (g === 'twoLeg') act(a.attach('twoLegStand'))
      else if (g === 'receiver') act(a.attach('receiver'))
      else if (g === 'cart') act(a.placeCart(ghostFront()))
      return
    }
    const tool = d.getTool()
    const onRail = p.partId === 'rail' || p.partId === 'tape'
    if (tool === 'markers' && p.partId === 'rail' && p.point) {
      const rp = d.rail.localX(p.point)
      act(a.placeMarker(railPosFromLocalX_mm(rp.x, zeroHigh())))
      return
    }
    if (tool === 'level') {
      if (onRail && p.point) { d.setLevelX(d.rail.localX(p.point).x); act(a.placeLevel('rail')); return }
      if (p.partId === 'table') { act(a.placeLevel('table')); return }
    }
    if (tool === 'caliper') {
      const t = caliperTargetFor(p)
      if (t) { d.setCaliperTarget(t); d.changed(); announce(S.measureHere); return }
    }
    void e
    d.onCard(cardFor(p))
  }
  const caliperTargetFor = (p: Pick): CaliperTarget | null => {
    const id = p.partId
    if (id === 'rackStand' || id === 'rackKnob' || id === 'standBase') return { kind: 'railHeight', at: 'clamp' }
    if (id === 'twoLegStand' || id === 'foot') return { kind: 'railHeight', at: 'twoLeg' }
    if (id === 'rail' && p.point) return { kind: 'railHeight', at: { railPos_mm: Math.round(railPosFromLocalX_mm(d.rail.localX(p.point).x, zeroHigh())) } }
    if (id === 'cart' && p.point) {
      const lx = d.cart.root.worldToLocal(p.point.clone()).x
      return { kind: lx > -2 ? 'frontReferenceOffset' : 'cartLength' }
    }
    return null
  }

  // ---------------------------------------------------------------- pointer events
  const onDown = (e: PointerEvent): void => {
    if (e.target !== canvas) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    if (active) { e.stopPropagation(); return }
    const p = pickAt(e.clientX, e.clientY)
    plain = null
    const draggable = p.handle !== null && !p.ghost && !(p.handle === 'marker' && !p.markId)
    // dragging the cart is only offered for a cart on the table or on the rail
    if (!draggable) { plain = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp }; return }
    e.preventDefault()
    e.stopPropagation()
    controls.enabled = false
    try { canvas.setPointerCapture(e.pointerId) } catch { /* synthetic pointer */ }
    hideTip()
    startDrag(e, p)
  }
  const onMove = (e: PointerEvent): void => {
    const ac = active
    if (ac) {
      if (e.pointerId !== ac.pointerId) return
      if (!ac.moved && Math.hypot(e.clientX - ac.sx, e.clientY - ac.sy) > MOVE_PX) ac.moved = true
      if (ac.moved) moveDrag(ac, e)
      return
    }
    if (e.pointerType !== 'mouse') return
    scheduleHover(e.clientX, e.clientY)
  }
  const onUp = (e: PointerEvent): void => {
    if (active) { finishDrag({ pointerId: e.pointerId, timeStamp: e.timeStamp, clientY: e.clientY }, false); return }
    const p = plain
    plain = null
    if (!p || p.id !== e.pointerId) return
    if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > MOVE_PX || e.timeStamp - p.t > TAP_MS) return
    tapPart(pickAt(e.clientX, e.clientY), e)
  }
  const onCancel = (e: PointerEvent): void => { plain = null; finishDrag({ pointerId: e.pointerId, timeStamp: e.timeStamp }, true) }

  // hover tooltip + outline
  let hoverRaf = 0
  let hoverXY = { x: 0, y: 0 }
  let hoverRoot: THREE.Object3D | null = null
  let hoverOv: THREE.Mesh[] = []
  const setHoverOutline = (root: THREE.Object3D | null): void => {
    if (root === hoverRoot) return
    for (const o of hoverOv) o.parent?.remove(o)
    hoverOv = []
    hoverRoot = root
    if (root) {
      root.traverse((o) => {
        const m = o as THREE.Mesh
        if (!m.isMesh || m.userData.overlay) return
        const ov = new THREE.Mesh(m.geometry, d.outline.hover)
        ov.userData.overlay = true; ov.raycast = () => {}; ov.renderOrder = 3
        m.add(ov); hoverOv.push(ov)
      })
    }
    d.requestRender()
  }
  const rootOf = (o: THREE.Object3D | null): THREE.Object3D | null => {
    for (let x = o; x; x = x.parent) if (x.userData.partId || x.userData.ghostId) return x
    return null
  }
  const hideTip = (): void => { tip.hidden = true; setHoverOutline(null) }
  const scheduleHover = (x: number, y: number): void => {
    hoverXY = { x, y }
    if (hoverRaf) return
    hoverRaf = requestAnimationFrame(() => {
      hoverRaf = 0
      if (active) return
      const p = pickAt(hoverXY.x, hoverXY.y)
      const name = nameOf(p)
      if (name && p.partId !== 'table') {
        tip.textContent = name
        tip.hidden = false
        placeLabel(tip, hoverXY.x + 14, hoverXY.y, 16)
        setHoverOutline(p.ghost ? null : p.handle === 'rack' ? d.rackKnob : rootOf(p.object))
        setCursor(p.handle || p.ghost ? 'pointer' : '')
        announce(name)
      } else { hideTip(); setCursor('') }
    })
  }
  const clearHover = (): void => {
    if (active) return
    if (hoverRaf) { cancelAnimationFrame(hoverRaf); hoverRaf = 0 }
    hideTip()
    setCursor('')
  }

  // wheel: fine adjustment over the rack handle (1 mm) and the screw foot (one 0.05 mm step, 5 with shift)
  const onWheel = (e: WheelEvent): void => {
    if (e.target !== canvas) return
    const p = pickAt(e.clientX, e.clientY)
    if (p.handle !== 'rack' && p.handle !== 'foot') return
    e.preventDefault()
    e.stopPropagation()
    const S = d.S()
    const st = a.getState()
    if (p.handle === 'rack') {
      act(a.setRackHeight_mm(st.rack_mm + rackWheelStep_mm(e.deltaY)))
      showReadout(e.clientX, e.clientY, `${S.rackReadout}: ${a.getState().rack_mm} mm`)
    } else {
      act(a.setFoot_mm(st.foot_mm + footWheelStep_mm(e.deltaY, e.shiftKey)))
      showReadout(e.clientX, e.clientY, `${S.footReadout}: ${a.getState().foot_mm.toFixed(2)} mm`)
    }
    window.clearTimeout(wheelTimer)
    wheelTimer = window.setTimeout(hideReadout, 900)
  }
  let wheelTimer = 0

  const onTouchStart = (e: TouchEvent): void => {
    const t = e.touches[0]
    if (!t || (e.touches.length > 1 && !active)) return
    if (active || pickAt(t.clientX, t.clientY).handle) e.preventDefault()
  }

  // keyboard: arrows orbit, plus and minus zoom
  const onKey = (e: KeyboardEvent): void => {
    if (e.altKey || e.ctrlKey || e.metaKey) return
    const step = (5 * Math.PI) / 180
    let dTheta = 0, dPhi = 0, zoom = 1
    switch (e.key) {
      case 'ArrowLeft': dTheta = -step; break
      case 'ArrowRight': dTheta = step; break
      case 'ArrowUp': dPhi = -step; break
      case 'ArrowDown': dPhi = step; break
      case '+': case '=': zoom = 0.9; break
      case '-': case '_': zoom = 1.1; break
      default: return
    }
    e.preventDefault()
    const off = camera.position.clone().sub(controls.target)
    const sph = new THREE.Spherical().setFromVector3(off)
    sph.theta += dTheta
    sph.phi = Math.min(controls.maxPolarAngle, Math.max(0.05, sph.phi + dPhi))
    sph.radius = Math.min(controls.maxDistance, Math.max(controls.minDistance, sph.radius * zoom))
    off.setFromSpherical(sph)
    camera.position.copy(controls.target).add(off)
    camera.lookAt(controls.target)
    controls.update()
    d.onUserCamera()
    d.requestRender()
  }
  const onBlur = (): void => { if (active) finishDrag({ pointerId: active.pointerId, timeStamp: d.ctx.now() }, true) }

  container.addEventListener('pointerdown', onDown, true)
  canvas.addEventListener('pointermove', onMove)
  canvas.addEventListener('pointerup', onUp)
  canvas.addEventListener('pointercancel', onCancel)
  canvas.addEventListener('lostpointercapture', onCancel)
  canvas.addEventListener('pointerleave', clearHover)
  canvas.addEventListener('touchstart', onTouchStart, { passive: false })
  container.addEventListener('wheel', onWheel, { passive: false, capture: true })
  canvas.addEventListener('keydown', onKey)
  window.addEventListener('blur', onBlur)
  void railLocalX_cm; void RAIL

  return {
    tick() { return false },
    setTool(t) {
      d.onStatus(d.S().toolHint[t])
      canvas.style.cursor = ''
    },
    relabel() { hideTip() },
    destroy() {
      onBlur()
      window.clearTimeout(wheelTimer)
      container.removeEventListener('pointerdown', onDown, true)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointercancel', onCancel)
      canvas.removeEventListener('lostpointercapture', onCancel)
      canvas.removeEventListener('pointerleave', clearHover)
      canvas.removeEventListener('touchstart', onTouchStart)
      container.removeEventListener('wheel', onWheel, true)
      canvas.removeEventListener('keydown', onKey)
      window.removeEventListener('blur', onBlur)
      if (hoverRaf) cancelAnimationFrame(hoverRaf)
      for (const o of hoverOv) o.parent?.remove(o)
      tip.remove(); readout.remove()
    },
  }
}
