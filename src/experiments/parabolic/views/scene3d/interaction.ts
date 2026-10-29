// Direct manipulation of the bench: orbit (OrbitControls) versus dragging a handle, wheel fine adjustment, taps, tools, hover
// tooltips and keyboard orbit. Part of the lazy scene chunk. Every action here is a ParabolicApparatus call; refusals are shown
// as a message card with the reason text. Pointer events carry event.timeStamp (same clock as ctx.now()).
//
// Pointer rules (as in the MRUV bench): a press on a handle disables OrbitControls, captures the pointer and swallows the event in
// the container's capture phase, before OrbitControls sees it. Everything else is left to OrbitControls; a short still press (a
// tap) on it selects, uses the active tool or opens the part card.
import * as THREE from 'three'
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import {
  FOOT_RANGE_mm, FOOT_STEP_mm, RAIL_LENGTH_m, type BallId, type ParabolicApparatus, type Reason, type Result, type SheetPose, type TapeTarget,
} from '../../apparatus/index.ts'
import type { CardInfo } from '../../../../core/scene3d/types.ts'
import type { strings } from '../strings/scene3d.ts'
import type { Tool } from '../stage.ts'
import type { ViewContext } from '../view.ts'
import { CM, RAIL, gapFromDrag_mm, markLabel, rackFromKnobY_mm, railLocalToWorld, railS_m, wheelStep, worldToRailLocal, type RailFrame, type V3 } from './units.ts'

type Strs = typeof strings.es
type Handle = 'rack' | 'foot' | 'rail' | 'mark' | 'ball' | 'sheet'

interface Pick {
  partId: string | null
  handle: Handle | null
  markId: string | null
  carbonId: string | null
  point: THREE.Vector3 | null
  object: THREE.Object3D | null
}

/** Live previews the scene draws while a drag is in progress (the apparatus is only called when the drag ends). */
export interface Preview {
  ball: { id: BallId; world: V3 | null; s_m: number | null } | null
  marks: Map<string, number>
  sheet: { kind: 'bond' | 'carbon'; x_m: number; z_m: number } | null
}

export interface InteractionDeps {
  a: ParabolicApparatus
  ctx: ViewContext
  container: HTMLElement
  canvas: HTMLCanvasElement
  camera: THREE.PerspectiveCamera
  controls: OrbitControls
  pickables(): THREE.Object3D[]
  requestRender(): void
  S(): Strs
  railRoot: THREE.Object3D
  railFrame(): RailFrame | null
  rackKnob: THREE.Object3D
  /** Table height H, cm. */
  floorY(): number
  ballRadius_cm(id: BallId): number
  preview: Preview
  setLevelX(x_cm: number): void
  setLevelTable(x_cm: number, z_cm: number): void
  getTool(): Tool
  setTapeTarget(t: TapeTarget): void
  onCard(card: CardInfo | null): void
  onStatus(text: string): void
  outline: { hover: THREE.Material }
  changed(): void
  refreshSoon(): void
  onUserCamera(): void
  openPanel?(panel: string): void
  dd?: { busy(): boolean }
}

export interface Interaction {
  /** True while a drag is active (the scene does not reframe the camera meanwhile). */
  busy(): boolean
  setTool(t: Tool): void
  relabel(): void
  destroy(): void
}

const MOVE_PX = 5, TAP_MS = 500
/** Which panel a part card opens (data-panel ids of the page). */
const PANEL_OF: Record<string, string> = {
  rail: 'adjust', rackKnob: 'adjust', foot: 'adjust', mark: 'adjust', level: 'adjust', tapeMeasure: 'tape', stopwatch: 'table',
  rackStand: 'inventory', standBase: 'inventory', twoLegStand: 'inventory', screws: 'inventory', marble: 'inventory', pingPong: 'inventory',
  bond: 'inventory', carbon: 'inventory', carbonMark: 'table',
}
/** A tap on the rail this close to the low tip (cm) means "the gap"; this close to the high end means "the clamp". */
const TIP_ZONE_cm = 14, CLAMP_ZONE_cm = 20
/** A tap on the floor this far from the edge line (cm) still counts as "under the edge". */
const EDGE_FLOOR_ZONE_cm = 14
/** Dropping the ball this close to a rail mark (cm) snaps it to the mark. */
const MARK_SNAP_cm = 1.6
/** Dropping the ball this far off the rail axis (cm) cancels the placement. */
const OFF_RAIL_cm = 7

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
  const markLabelOf = (markId: string): string => {
    const m = a.getState().marks.find((x) => x.id === markId)
    return m ? markLabel(m.s_m) : ''
  }
  const nameOf = (p: Pick): string => {
    if (!p.partId || p.partId === 'floor') return ''
    if (p.partId === 'table') return p.point && p.point.x > -5 && d.getTool() === 'tape' ? partInfo('edge').name : ''
    if (p.partId === 'mark' && p.markId) return `${partInfo('mark').name} ${markLabelOf(p.markId)} cm`
    return partInfo(p.partId).name
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
  const turned = (p: SheetPose): 'alongX' | 'alongZ' => (p.orientation === 'alongX' ? 'alongZ' : 'alongX')
  const cardFor = (p: Pick): CardInfo | null => {
    const id = p.partId
    if (!id || id === 'table' || id === 'floor') return null
    const S = d.S()
    const { name, info } = partInfo(id)
    const st = a.getState()
    const actions: CardInfo['actions'] = []
    const add = (label: string, run: () => Result): void => { actions.push({ label, run: () => { act(run()) } }) }
    if (id === 'mark' && p.markId) { const mid = p.markId; add(S.removeMark, () => a.removeMark(mid)) }
    if ((id === 'marble' || id === 'pingPong') && st.ball.placed) add(S.resetBall, () => a.resetBall())
    if (id === 'level') { add(S.levelOnRail, () => a.placeLevel('rail')); add(S.levelOnTable, () => a.placeLevel('table')) }
    if (id === 'bond' && st.paper.bond) { const b = st.paper.bond; add(S.rotateSheet, () => a.placeBond(b.x_m, b.z_m, turned(b))); add(S.removeBond, () => a.removeBond()) }
    if (id === 'carbon' && st.paper.carbon) { const c = st.paper.carbon; add(S.rotateSheet, () => a.placeCarbon(c.x_m, c.z_m, turned(c))); add(S.removeCarbon, () => a.removeCarbon()) }
    const title = id === 'mark' && p.markId ? `${name} ${markLabelOf(p.markId)} cm` : name
    return { title, text: info, actions, panel: PANEL_OF[id] ?? 'inventory', alert: false }
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
    const none: Pick = { partId: null, handle: null, markId: null, carbonId: null, point: null, object: null }
    if (!setRay(clientX, clientY)) return none
    const hits = ray.intersectObjects(d.pickables(), true).filter((h) => (h.object as THREE.Mesh).isMesh && !h.object.userData.overlay && visibleChain(h.object))
    const h0 = hits[0]
    if (!h0) return none
    const out: Pick = { ...none, point: h0.point.clone(), object: h0.object }
    for (let o: THREE.Object3D | null = h0.object; o; o = o.parent) {
      const u = o.userData
      if (u.dragHandle && !out.handle) out.handle = u.dragHandle as Handle
      if (u.partId && !out.partId) out.partId = u.partId as string
      if (u.markId && !out.markId) out.markId = u.markId as string
      if (u.carbonId && !out.carbonId) out.carbonId = u.carbonId as string
    }
    return out
  }

  // ---------------------------------------------------------------- geometry of drags
  const railLocal = (w: THREE.Vector3): THREE.Vector3 | null => {
    const f = d.railFrame()
    if (f) { const p = worldToRailLocal(f, [w.x, w.y, w.z]); return new THREE.Vector3(p[0], p[1], p[2]) }
    return null
  }
  /** Plane parallel to the rail top surface, `height_cm` above it. With no mounted rail: the table plane. */
  const railPlane = (height_cm = 0): THREE.Plane => {
    d.railRoot.updateWorldMatrix(true, false)
    const n = new THREE.Vector3(0, 1, 0).transformDirection(d.railRoot.matrixWorld)
    const o = d.railRoot.getWorldPosition(new THREE.Vector3()).addScaledVector(n, height_cm)
    return new THREE.Plane().setFromNormalAndCoplanarPoint(n, o)
  }
  const hitPlane = (cx: number, cy: number, plane: THREE.Plane): THREE.Vector3 | null => {
    if (!setRay(cx, cy)) return null
    return ray.ray.intersectPlane(plane, tmp) ? tmp.clone() : null
  }
  const horizontal = (y: number): THREE.Plane => new THREE.Plane(new THREE.Vector3(0, 1, 0), -y)
  const rackPlane = (): THREE.Plane => {
    const f = d.rackKnob.getWorldPosition(new THREE.Vector3())
    const n = new THREE.Vector3(camera.position.x - f.x, 0, camera.position.z - f.z).normalize()
    return new THREE.Plane().setFromNormalAndCoplanarPoint(n, new THREE.Vector3(f.x, 0, f.z))
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
    grab: number
    start: number
    startX: number
    pending: number | null
    pendingPos: { x: number; z: number } | null
    ballId: BallId | null
    sheet: 'bond' | 'carbon' | null
    sheetOri: 'alongX' | 'alongZ'
  }
  let active: Active | null = null
  let plain: { id: number; x: number; y: number; t: number } | null = null
  const setCursor = (c: string): void => { canvas.style.cursor = c }

  const showReadout = (x: number, y: number, text: string): void => {
    readout.textContent = text
    readout.hidden = false
    placeLabel(readout, x + 14, y, -44)
  }
  const hideReadout = (): void => { readout.hidden = true }
  const ballIdOf = (p: Pick): BallId | null => (p.partId === 'marble' ? 'marble' : p.partId === 'pingPong' ? 'pingpong' : null)

  const startDrag = (e: PointerEvent, pick: Pick): void => {
    const h = pick.handle!
    const st = a.getState()
    const ac: Active = {
      pointerId: e.pointerId, handle: h, pick, sx: e.clientX, sy: e.clientY, moved: false, grab: 0, start: 0, startX: 0, pending: null, pendingPos: null,
      ballId: ballIdOf(pick), sheet: pick.partId === 'bond' ? 'bond' : pick.partId === 'carbon' ? 'carbon' : null, sheetOri: 'alongX',
    }
    active = ac
    if (h === 'rack') {
      const hit = hitPlane(e.clientX, e.clientY, rackPlane())
      ac.grab = hit ? hit.y - d.rackKnob.getWorldPosition(new THREE.Vector3()).y : 0
    } else if (h === 'foot') ac.start = st.foot_mm
    else if (h === 'rail') {
      ac.start = st.gap_mm
      const hit = hitPlane(e.clientX, e.clientY, horizontal(0))
      ac.startX = hit ? hit.x : 0
    } else if (h === 'mark' && pick.markId) {
      const m = st.marks.find((x) => x.id === pick.markId)
      ac.start = m?.s_m ?? 0
      const hit = hitPlane(e.clientX, e.clientY, railPlane())
      const l = hit ? railLocal(hit) : null
      ac.grab = l && m ? m.s_m - railS_m(l.x) : 0
    } else if (h === 'sheet' && ac.sheet) {
      const pose = ac.sheet === 'bond' ? st.paper.bond : st.paper.carbon
      ac.sheetOri = pose?.orientation ?? 'alongX'
    }
    setCursor('grabbing')
  }

  /** Nearest rail mark to a rail position, within the snapping distance (cm). */
  const nearMark = (s_m: number): { id: string; s_m: number } | null => {
    let best: { id: string; s_m: number } | null = null
    let dist = MARK_SNAP_cm / CM
    for (const m of a.getState().marks) { const dd = Math.abs(m.s_m - s_m); if (dd <= dist) { dist = dd; best = { id: m.id, s_m: m.s_m } } }
    return best
  }

  const moveDrag = (ac: Active, e: PointerEvent): void => {
    const S = d.S()
    const pv = d.preview
    if (ac.handle === 'rack') {
      const hit = hitPlane(e.clientX, e.clientY, rackPlane())
      if (!hit) return
      const rack = rackFromKnobY_mm(hit.y - ac.grab)
      if (rack !== a.getState().rack_mm) act(a.setRackHeight_mm(rack))
      showReadout(e.clientX, e.clientY, `${S.rackReadout}: ${a.getState().rack_mm} mm`)
    } else if (ac.handle === 'foot') {
      const foot = Math.round(Math.min(FOOT_RANGE_mm, Math.max(-FOOT_RANGE_mm, ac.start + (ac.sy - e.clientY) * 0.02)) / FOOT_STEP_mm) * FOOT_STEP_mm
      if (Math.abs(foot - a.getState().foot_mm) > 1e-9) act(a.setFoot_mm(foot))
      showReadout(e.clientX, e.clientY, `${S.footReadout}: ${a.getState().foot_mm.toFixed(2)} mm`)
    } else if (ac.handle === 'rail') {
      const hit = hitPlane(e.clientX, e.clientY, horizontal(0))
      if (!hit) return
      const gap = gapFromDrag_mm(ac.start, hit.x - ac.startX)
      if (gap !== a.getState().gap_mm) act(a.setGap_mm(gap))
      showReadout(e.clientX, e.clientY, S.gapReadout)
    } else if (ac.handle === 'mark' && ac.pick.markId) {
      const hit = hitPlane(e.clientX, e.clientY, railPlane())
      const l = hit ? railLocal(hit) : null
      if (!l) return
      const s = Math.round(Math.min(RAIL_LENGTH_m, Math.max(0, railS_m(l.x) + ac.grab)) * 2000) / 2000
      pv.marks.set(ac.pick.markId, s)
      ac.pending = s
      d.refreshSoon()
      showReadout(e.clientX, e.clientY, `${S.markReadout}: ${markLabel(s)} cm`)
    } else if (ac.handle === 'ball' && ac.ballId) {
      const R = d.ballRadius_cm(ac.ballId)
      const f = d.railFrame()
      const hit = hitPlane(e.clientX, e.clientY, f ? railPlane(R) : horizontal(R))
      if (!hit) return
      const l = f ? railLocal(hit) : null
      if (f && l && Math.abs(l.z) <= OFF_RAIL_cm) {
        const m = nearMark(railS_m(l.x))
        const s = m ? m.s_m : railS_m(l.x)
        const x = (RAIL_LENGTH_m - s) * CM
        const w = railLocalToWorld(f, [x, R, 0])
        pv.ball = { id: ac.ballId, world: w, s_m: s }
        ac.pending = s
        showReadout(e.clientX, e.clientY, m ? `${S.ballReadout}: ${markLabel(m.s_m)} cm` : S.ballReadout)
      } else {
        pv.ball = { id: ac.ballId, world: [hit.x, Math.max(R, hit.y), hit.z], s_m: null }
        ac.pending = null
        showReadout(e.clientX, e.clientY, S.ballReadout)
      }
      d.requestRender()
    } else if (ac.handle === 'sheet' && ac.sheet) {
      const hit = hitPlane(e.clientX, e.clientY, horizontal(-d.floorY()))
      if (!hit) return
      const x = Math.round(hit.x) / CM, z = Math.round(hit.z) / CM
      pv.sheet = { kind: ac.sheet, x_m: x, z_m: z }
      ac.pendingPos = { x, z }
      d.requestRender()
      showReadout(e.clientX, e.clientY, S.sheetReadout)
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
    const pv = d.preview
    const tapped = !ac.moved && !cancelled
    if (ac.handle === 'mark' && ac.pick.markId) {
      pv.marks.delete(ac.pick.markId)
      if (!cancelled && ac.moved && ac.pending !== null) act(a.moveMark(ac.pick.markId, ac.pending))
      else if (tapped) {
        if (d.getTool() === 'marks') act(a.removeMark(ac.pick.markId))
        else if (d.getTool() === 'tape') d.setTapeTarget({ kind: 'markPosition', markId: ac.pick.markId })
        else d.onCard(cardFor(ac.pick))
      }
    } else if (ac.handle === 'ball' && ac.ballId) {
      pv.ball = null
      if (!cancelled && ac.moved && ac.pending !== null) {
        const st = a.getState()
        const snapped = nearMark(ac.pending)
        let ok = true
        if (st.ball.selected !== ac.ballId) ok = act(a.selectBall(ac.ballId))
        if (ok) act(snapped ? a.placeBall({ markId: snapped.id }) : a.placeBall({ s_m: ac.pending }))
      } else if (tapped) {
        d.onCard(cardFor(ac.pick))
      }
    } else if (ac.handle === 'sheet' && ac.sheet) {
      pv.sheet = null
      if (!cancelled && ac.moved && ac.pendingPos) {
        const { x, z } = ac.pendingPos
        act(ac.sheet === 'bond' ? a.placeBond(x, z, ac.sheetOri) : a.placeCarbon(x, z, ac.sheetOri))
      } else if (tapped) d.onCard(cardFor(ac.pick))
    } else if (tapped) {
      if (ac.handle === 'rail') tapPart(ac.pick)
      else {
        // a tap on the knob or the foot: fine step by one (above the handle's centre raises, below lowers)
        const cy = e?.clientY
        const up = cy !== undefined && cy < knobScreenY(ac.handle === 'rack' ? d.rackKnob : (ac.pick.object ?? d.rackKnob))
        if (ac.handle === 'rack') act(a.setRackHeight_mm(a.getState().rack_mm + (up ? 1 : -1)))
        else act(a.setFoot_mm(a.getState().foot_mm + (up ? 1 : -1) * FOOT_STEP_mm))
      }
    }
    d.refreshSoon()
    d.requestRender()
  }

  // ---------------------------------------------------------------- taps (tools and cards)
  const announce = (text: string): void => d.onStatus(text)
  const tapeTargetFor = (p: Pick): TapeTarget | null => {
    const id = p.partId
    if (id === 'edge') return { kind: 'launchHeight' }
    if (id === 'table' && p.point && p.point.x > -5) return { kind: 'launchHeight' }
    if (id === 'carbonMark' && p.carbonId) return { kind: 'range', carbonId: p.carbonId }
    if (id === 'mark' && p.markId) return { kind: 'markPosition', markId: p.markId }
    if (id === 'rackStand' || id === 'rackKnob' || id === 'standBase') return { kind: 'rise' }
    if (id === 'rail' && p.point) {
      const l = railLocal(p.point)
      if (l && l.x >= RAIL.length - TIP_ZONE_cm) return { kind: 'gap' }
      if (l && l.x <= CLAMP_ZONE_cm) return { kind: 'rise' }
    }
    return null
  }
  const tapPart = (p: Pick): void => {
    const S = d.S()
    const tool = d.getTool()
    if (tool === 'marks') {
      if (p.partId === 'rail' && p.point) {
        const l = railLocal(p.point)
        if (l) act(a.placeMark(railS_m(l.x)))
        return
      }
    }
    if (tool === 'level') {
      if ((p.partId === 'rail' || p.partId === 'mark') && p.point) {
        const l = railLocal(p.point)
        if (l) d.setLevelX(l.x)
        act(a.placeLevel('rail'))
        return
      }
      if ((p.partId === 'table' || p.partId === 'edge') && p.point) { d.setLevelTable(p.point.x, p.point.z); act(a.placeLevel('table')); return }
    }
    if (tool === 'paper' && p.partId === 'floor' && p.point) {
      if (Math.abs(p.point.x) <= EDGE_FLOOR_ZONE_cm) { act(a.placeEdgeProjection(Math.round(p.point.z) / CM)); announce(S.parts.edgeProjection.name) }
      return
    }
    if (tool === 'tape') {
      const t = tapeTargetFor(p)
      if (t) { d.setTapeTarget(t); d.changed(); announce(S.measureHere); return }
    }
    d.onCard(cardFor(p))
  }

  // ---------------------------------------------------------------- pointer events
  const draggable = (p: Pick): boolean => {
    if (!p.handle) return false
    const tool = d.getTool()
    const st = a.getState()
    // loose parts are moved by the drag-and-drop layer; these handles only adjust a part that is already mounted
    switch (p.handle) {
      case 'rack': return tool === 'select' && st.joints.standBase
      case 'foot': return tool === 'select' && st.joints.twoLegStand
      case 'rail': return tool === 'select' && st.joints.rackClamp
      case 'ball': { const b = ballIdOf(p); return tool === 'select' && b !== null && st.ball.selected === b && st.ball.placed }
      case 'mark': return (tool === 'select' || tool === 'marks') && !!p.markId
      case 'sheet': return tool === 'paper'
    }
  }
  const onDown = (e: PointerEvent): void => {
    if (e.target !== canvas) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    if (active) { e.stopPropagation(); return }
    const p = pickAt(e.clientX, e.clientY)
    plain = null
    if (!draggable(p)) { plain = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp }; return }
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
    tapPart(pickAt(e.clientX, e.clientY))
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
        if (!m.isMesh || m.userData.overlay || m.geometry.type === 'CircleGeometry' || m.geometry.type === 'RingGeometry') return
        const ov = new THREE.Mesh(m.geometry, d.outline.hover)
        ov.userData.overlay = true; ov.raycast = () => {}; ov.renderOrder = 3
        m.add(ov); hoverOv.push(ov)
      })
    }
    d.requestRender()
  }
  const rootOf = (o: THREE.Object3D | null): THREE.Object3D | null => {
    for (let x = o; x; x = x.parent) if (x.userData.partId) return x
    return null
  }
  const hideTip = (): void => { tip.hidden = true; setHoverOutline(null) }
  const scheduleHover = (x: number, y: number): void => {
    hoverXY = { x, y }
    if (hoverRaf) return
    hoverRaf = requestAnimationFrame(() => {
      hoverRaf = 0
      if (active || d.dd?.busy()) return
      const p = pickAt(hoverXY.x, hoverXY.y)
      const name = nameOf(p)
      if (name) {
        tip.textContent = name
        tip.hidden = false
        placeLabel(tip, hoverXY.x + 14, hoverXY.y, 16)
        const big = p.partId === 'table' || p.partId === 'floor' || p.partId === 'rail'
        setHoverOutline(p.handle === 'rack' ? d.rackKnob : big ? null : rootOf(p.object))
        setCursor(draggable(p) ? 'grab' : 'pointer')
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

  // wheel: fine adjustment over the rack handle (1 mm) and the screw foot (one 0.05 mm step)
  let wheelTimer = 0
  const onWheel = (e: WheelEvent): void => {
    if (e.target !== canvas) return
    const p = pickAt(e.clientX, e.clientY)
    if (p.handle !== 'rack' && p.handle !== 'foot') return
    e.preventDefault()
    e.stopPropagation()
    const S = d.S()
    const st = a.getState()
    if (p.handle === 'rack') {
      act(a.setRackHeight_mm(st.rack_mm + wheelStep(e.deltaY)))
      showReadout(e.clientX, e.clientY, `${S.rackReadout}: ${a.getState().rack_mm} mm`)
    } else {
      act(a.setFoot_mm(st.foot_mm + wheelStep(e.deltaY) * (e.shiftKey ? 5 : 1) * FOOT_STEP_mm))
      showReadout(e.clientX, e.clientY, `${S.footReadout}: ${a.getState().foot_mm.toFixed(2)} mm`)
    }
    window.clearTimeout(wheelTimer)
    wheelTimer = window.setTimeout(hideReadout, 900)
  }

  const onTouchStart = (e: TouchEvent): void => {
    const t = e.touches[0]
    if (!t || (e.touches.length > 1 && !active)) return
    if (active || draggable(pickAt(t.clientX, t.clientY))) e.preventDefault()
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

  return {
    busy: () => active !== null,
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
