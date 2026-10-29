// 2D side view (SVG) at true scale (1 unit = 1 mm): the bench, the rail on its stand and receiver, the DigiCart, the string over the pulley
// and the canister above the floor. Driven by the same Apparatus state as the 3D scene (cartState); used when WebGL2 is missing, when the 3D
// view fails, and when the student picks 2D. It only draws what the apparatus reports. It is also a stage of the drag-and-drop assembly:
// every loose part lies on the bench as a small icon (data-part), the highlighted zones show where it can go (same controller as the 3D scene).
// The stand is always at the left, as in 3D; with the 1200 mm end in the clamp the printed scale simply reads from the right.
import { CART_LENGTH_m, RAIL_LENGTH_m, SUPPORT_SEPARATION_m, type ApparatusState } from '../apparatus/index.ts'
import { BENCH_HEIGHT_m, CANISTER_HANG_m, RAIL_FREE_END_SAG_m, STRING_ABOVE_RAIL_m, SUPPORT_BASE_HEIGHT_m } from '../physics/index.ts'
import type { MountView, View } from './view.ts'
import { el, svg, watch } from '../../../core/views/dom.ts'
import { formatNum } from '../../../core/views/numfmt.ts'
import { strings } from './strings/side2d.ts'
import { strings as ddStrings } from './strings/dragdrop.ts'
import { strings as invStrings } from './strings/inventory.ts'
import { createDragDrop, TRAY_ORDER, type StageAdapter } from './dragdrop/controller.ts'
import { isMassPart, massIndex, LEVEL_ON_TABLE, type PartId, type Zone, type ZoneId } from './dragdrop/snap.ts'
import { iconPaths } from './itemIcons.ts'
import { LEVEL_ON_RAIL_cm } from './dragdrop/snap.ts'
import { fallenCartOrigin, RAIL_ROOT_X_cm } from './scene3d/units.ts'

const MM = 1000
const X0 = 100 // x of the rail's left end (the stand end)
const VB_W = 2020 // the bench ends at the rail end; the canister hangs and the fallen cart lies in the air to its right
const H_TOP = 1190 // height drawn at the top edge of the view, mm above the floor
const Y = (h_mm: number): number => H_TOP - h_mm
const VB_H = 1250
const SLOT = 55.5 // width of the bench slot of a loose part, svg units
const GLYPH = 2.3 // scale of the 24 px icon
const BENCH_BAND = 76 // thickness of the bench top as drawn, svg units: the loose parts lie in it like on a plan view of the bench

export const mountSide2d: MountView = (root, ctx): View => {
  const app = ctx.apparatus
  const S = () => strings[ctx.lang()]
  const w = watch(app)
  const wrap = el('div', 'side2d')
  const g = svg('svg', { class: 's2d', role: 'img', preserveAspectRatio: 'xMidYMid meet', viewBox: `0 0 ${VB_W} ${VB_H}` })
  const staticLayer = svg('g')
  const dynLayer = svg('g')
  const zoneLayer = svg('g', { class: 's2d-zones' })
  g.append(staticLayer, dynLayer, zoneLayer)
  const note = el('p', 'stage-note')
  wrap.append(g, note)
  wrap.classList.add('has-tray')
  root.append(wrap)

  let kPx = 1
  const ro = new ResizeObserver(() => {
    const r = g.getBoundingClientRect()
    if (r.width <= 0 || r.height <= 0) return
    const k = Math.max(VB_W / r.width, VB_H / r.height) // 'meet' letterboxes: the smaller scale wins
    if (Math.abs(k - kPx) > 0.01) { kPx = k; g.style.setProperty('--k', String(k)); w.touch() }
  })
  ro.observe(g)

  const bench_h = BENCH_HEIGHT_m * MM
  const rail_top = (h: number): number => bench_h + SUPPORT_BASE_HEIGHT_m * MM + h
  /** Table frame (scene cm: x from the stand clamp, y above the bench top) to svg units. */
  const sx = (x_cm: number): number => X0 + (x_cm - RAIL_ROOT_X_cm) * 10
  const sy = (y_cm: number): number => Y(bench_h + y_cm * 10)
  /** Rail geometry of a state: heights of the two ends above the floor (mm) and the rail's height at a distance from its stand end. */
  function railShape(s: ApparatusState): { hS: number; hR: number; yAt: (xmm: number) => number } {
    const hS = rail_top(s.rack_mm)
    const hR = s.joints.receiver ? rail_top(s.foot_mm) : hS - RAIL_FREE_END_SAG_m * MM
    const slope = (hR - hS) / (SUPPORT_SEPARATION_m * MM)
    return { hS, hR, yAt: (x) => hS + slope * (x - 50) }
  }
  const zeroAtStand = (s: ApparatusState): boolean => (s.joints.rackClamp ?? 'E1') === 'E1'

  const tagPart = (e: SVGElement, id: PartId): SVGElement => { e.dataset.part = id; e.classList.add('s2d-part'); return e }
  function nameOf(id: PartId): string {
    return isMassPart(id) ? ddStrings[ctx.lang()].massName.replace('{n}', String(massIndex(id) + 1)) : invStrings[ctx.lang()].items[id].name
  }
  /** A part as a small icon with a generous hit area. (x, y) = bottom centre. */
  function glyph(id: PartId, x: number, y: number): SVGElement {
    const grp = svg('g', { transform: `translate(${x - 12 * GLYPH} ${y - 24 * GLYPH}) scale(${GLYPH})` })
    grp.append(svg('rect', { x: -3, y: -3, width: 30, height: 30, class: 's2d-hit' }))
    for (const d of iconPaths(id)) grp.append(svg('path', { d, class: 's2d-glyph' }))
    grp.append(svg('title', {}, nameOf(id)))
    return tagPart(grp, id)
  }

  function slotX(id: PartId): number { return X0 - 50 + SLOT * (TRAY_ORDER.indexOf(id) + 0.5) }

  /** Is the part lying loose (as a glyph on the bench)? Mounted parts are drawn in place. */
  function isLoose(id: PartId, s: ApparatusState): boolean {
    const j = s.joints
    if (isMassPart(id)) return s.items.masses && s.masses[massIndex(id)] === 'bench'
    if (!s.items[id]) return false
    switch (id) {
      case 'rail': return j.rackClamp === null
      case 'cart': return !s.cart.placed
      case 'rackStand': case 'standBase': return !j.standBase
      case 'receiver': return !j.receiver
      case 'string': return !(j.stringPulley && j.receiver)
      case 'canister': return !(j.stringPulley && j.stringCanister && j.receiver)
      case 'brassScrew': return !j.stringCart
      case 'level': return s.level.placement === null
      default: return true
    }
  }

  function drawStatic(): void {
    const T = S()
    const s = app.getState()
    const L: SVGElement[] = []
    const zs = zeroAtStand(s)
    // floor and bench: the bench ends at the receiver (the rail end); the canister hangs past that edge
    L.push(svg('rect', { x: 0, y: Y(0), width: VB_W, height: 60, class: 's2d-table' }))
    L.push(svg('line', { x1: 0, y1: Y(0), x2: VB_W, y2: Y(0), class: 's2d-ground' }))
    L.push(svg('text', { x: 12, y: Y(0) + 34, class: 's2d-label' }, T.floor))
    const benchX0 = X0 - 80
    L.push(svg('rect', { x: benchX0, y: Y(bench_h), width: RAIL_LENGTH_m * MM + 80, height: BENCH_BAND, class: 's2d-bench-top' }))
    L.push(svg('line', { x1: benchX0, y1: Y(bench_h), x2: benchX0 + RAIL_LENGTH_m * MM + 80, y2: Y(bench_h), class: 's2d-ground' }))
    for (const lx of [X0 + RAIL_LENGTH_m * MM - 20, benchX0 + 20]) L.push(svg('line', { x1: lx, y1: Y(bench_h) + BENCH_BAND, x2: lx, y2: Y(0), class: 's2d-leg thin' }))
    L.push(svg('text', { x: X0 + RAIL_LENGTH_m * MM + 10, y: Y(bench_h) + BENCH_BAND + 30, class: 's2d-label', 'text-anchor': 'end' }, T.bench))
    const mounted = s.joints.rackClamp !== null
    const sh = railShape(s)
    const standX = X0 + 50
    // stand on its base
    if (s.items.standBase && s.joints.standBase) L.push(tagPart(svg('rect', { x: standX - 60, y: Y(bench_h) - 12, width: 120, height: 12, rx: 3, class: 's2d-metal' }), 'standBase'))
    if (s.items.rackStand && s.joints.standBase) {
      const top = mounted ? sh.hS : rail_top(s.rack_mm)
      L.push(tagPart(svg('line', { x1: standX, y1: Y(bench_h) - 12, x2: standX, y2: Y(top), class: 's2d-leg' }), 'rackStand'))
      L.push(svg('text', { x: standX, y: Y(bench_h) - 22, class: 's2d-label', 'text-anchor': 'middle' }, T.stand))
    }
    if (s.items.rail && mounted) {
      const yAt = sh.yAt
      L.push(tagPart(svg('line', { x1: X0, y1: Y(yAt(0)), x2: X0 + RAIL_LENGTH_m * MM, y2: Y(yAt(RAIL_LENGTH_m * MM)), class: 's2d-rail' }), 'rail'))
      for (let p = 0; p <= 1200; p += 100) L.push(svg('line', { x1: X0 + p, y1: Y(yAt(p)) + 8, x2: X0 + p, y2: Y(yAt(p)) + (p % 200 === 0 ? 26 : 16), class: 's2d-tick' }))
      for (let p = 0; p <= 1200; p += 200) L.push(svg('text', { x: X0 + p, y: Y(yAt(p)) + 48, class: 's2d-scale', 'text-anchor': 'middle' }, String((zs ? p : 1200 - p) / 10)))
      if (s.items.receiver && s.joints.receiver) {
        const pxn = X0 + RAIL_LENGTH_m * MM
        L.push(tagPart(svg('rect', { x: pxn - 40, y: Y(sh.hR) - 50, width: 40, height: 90, class: 's2d-blue' }), 'receiver'))
        const py = Y(sh.hR + STRING_ABOVE_RAIL_m * MM)
        L.push(svg('circle', { cx: pxn + 10, cy: py - 4, r: 24, class: 's2d-pulley' }))
        L.push(svg('line', { x1: pxn - 10, y1: Y(bench_h + 40), x2: pxn - 10, y2: Y(sh.hR) + 40, class: 's2d-leg thin' }))
        L.push(svg('text', { x: pxn + 20, y: py - 40, class: 's2d-label', 'text-anchor': 'end' }, T.receiver))
      }
      for (const [pos, label] of [[s.marks.start_mm, T.start], [s.marks.end_mm, T.end]] as const) {
        if (pos === null) continue
        const p = zs ? pos : 1200 - pos
        L.push(svg('line', { x1: X0 + p, y1: Y(yAt(p)) - 22, x2: X0 + p, y2: Y(yAt(p)) + 12, class: 's2d-mark' }))
        L.push(svg('text', { x: X0 + p, y: Y(yAt(p)) - 30, class: 's2d-label', 'text-anchor': 'middle' }, label))
      }
      // the level, once it rests on the rail or on the table
      if (s.items.level && s.level.placement !== null) {
        const lx = s.level.placement === 'rail' ? X0 + LEVEL_ON_RAIL_cm * 10 : sx(LEVEL_ON_TABLE.x)
        const ly = s.level.placement === 'rail' ? Y(yAt(LEVEL_ON_RAIL_cm * 10)) - 4 : Y(bench_h) - 2
        L.push(glyph('level', lx, ly))
      }
    } else {
      if (!s.items.rail) L.push(svg('text', { x: X0 + 300, y: Y(rail_top(0)) - 20, class: 's2d-label' }, T.noRail))
      if (s.items.level && s.level.placement !== null) L.push(glyph('level', sx(LEVEL_ON_TABLE.x), Y(bench_h) - 2))
    }
    // everything else lies on the bench, one fixed slot per part
    for (const id of TRAY_ORDER) if (isLoose(id, s) && !(id === 'level' && s.level.placement !== null)) L.push(glyph(id, slotX(id), Y(bench_h) + BENCH_BAND - 8))
    staticLayer.replaceChildren(...L)
    note.textContent = T.scaleNote
    g.setAttribute('aria-label', T.aria)
  }

  let lastKey = ''
  function drawDynamic(): void {
    const T = S()
    const s = app.getState()
    let st = app.cartState(ctx.now())
    if (st.phase === 'falling' && ctx.reducedMotion()) st = app.cartState(ctx.now() + 1e7) // reduced motion: straight to the resting pose
    const j = s.joints
    const tiedCan = j.stringPulley && j.stringCanister && j.receiver && s.items.string && s.items.canister
    const key = [st.frontRailPos_mm?.toFixed(1), st.canisterDrop_m.toFixed(4), st.canisterOnFloor, st.fall?.x_m.toFixed(3), st.fall?.drop_m.toFixed(3), s.masses.join(),
      tiedCan, j.stringCart, j.stringPulley, s.rack_mm, s.foot_mm, j.rackClamp, j.receiver, kPx, s.cart.placed].join('|')
    if (key === lastKey) return
    lastKey = key
    const L: SVGElement[] = []
    const zs = zeroAtStand(s)
    const sh = railShape(s)
    const nCan = s.masses.filter((m) => m === 'canister').length
    const px = X0 + RAIL_LENGTH_m * MM + 10
    const py = Y(sh.hR + STRING_ABOVE_RAIL_m * MM) - 4 - 24
    const hang = app.hangBelowPulley_m() ?? 0.05
    if (s.items.cart && s.cart.placed && (st.fall || st.frontRailPos_mm !== null)) {
      const len = CART_LENGTH_m * MM
      let x0: number, cy: number
      if (st.fall) {
        const o = fallenCartOrigin(s, st.fall)
        x0 = sx(o[0]) - len; cy = sy(o[1])
      } else {
        const f = st.frontRailPos_mm!
        const fl = zs ? f : 1200 - f
        x0 = X0 + fl - len; cy = Y(sh.yAt(fl))
      }
      const grp = svg('g')
      grp.append(svg('rect', { x: x0, y: cy - 30, width: len, height: 30, rx: 6, class: 's2d-cart-body' }))
      for (const wx of [x0 + 18, x0 + len - 18]) grp.append(svg('circle', { cx: wx, cy: cy - 5, r: 8, class: 's2d-wheel' }))
      tagPart(grp, 'cart')
      L.push(grp)
      let k = 0
      s.masses.forEach((m, i) => {
        if (m !== 'cart' || !s.items.masses) return
        L.push(tagPart(svg('rect', { x: x0 + 10 + k * 20, y: cy - 46, width: 16, height: 16, class: 's2d-metal-hi' }), `mass${i}` as PartId))
        k++
      })
      L.push(svg('text', { x: x0 + len / 2, y: cy - 54, class: 's2d-label', 'text-anchor': 'middle' }, T.cart))
    }
    // string: brass screw on the cart front -> pulley -> canister (as far as it is made)
    if (j.stringPulley && j.receiver && s.items.string) {
      const top = py + 24 + (hang + st.canisterDrop_m) * MM
      const cx = px + 24
      let pts = `${px},${py} ${px + 24},${py + 24} ${cx},${top}`
      if (j.stringCart && s.cart.placed && s.items.cart && st.frontRailPos_mm !== null && !st.fall) {
        const fl = zs ? st.frontRailPos_mm : 1200 - st.frontRailPos_mm
        pts = `${X0 + fl},${Y(sh.yAt(fl) + STRING_ABOVE_RAIL_m * MM)} ${pts}`
      }
      L.push(svg('polyline', { points: pts, class: 's2d-dash', fill: 'none' }))
      if (tiedCan) {
        const can = svg('g')
        can.append(svg('rect', { x: cx - 18, y: top, width: 36, height: CANISTER_HANG_m * MM - 10, rx: 4, class: 's2d-cart-body' }))
        for (let i = 0; i < nCan; i++) can.append(svg('rect', { x: cx - 14, y: top + 10 + i * 9, width: 28, height: 7, class: 's2d-metal-hi' }))
        tagPart(can, 'canister')
        L.push(can)
        L.push(svg('text', { x: cx + 30, y: top + 24, class: 's2d-label', 'text-anchor': 'start' }, `${T.canister} · ${nCan} ${T.masses}`))
        // height of the canister bottom above the floor, read from the drawn geometry (not a physics result)
        const bottom = top + CANISTER_HANG_m * MM - 10
        const h_m = Math.max(0, (Y(0) - bottom) / MM)
        const dx = cx + 130
        L.push(svg('line', { x1: dx, y1: bottom, x2: dx, y2: Y(0), class: 's2d-dim' }))
        for (const yy of [bottom, Y(0)]) L.push(svg('line', { x1: dx - 14, y1: yy, x2: dx + 14, y2: yy, class: 's2d-dim' }))
        L.push(svg('text', { x: dx + 20, y: (bottom + Y(0)) / 2 + 6, class: 's2d-label', 'text-anchor': 'start' }, T.height.replace('{h}', formatNum(h_m, 2, ctx.lang()))))
      }
    }
    dynLayer.replaceChildren(...L)
    applyLift()
  }

  // ---- drag-and-drop assembly (same controller as the 3D scene; this is the stage side) -------------------------------------
  /** Pointer to the table frame: x in scene cm, y in cm above the bench top. */
  const toCm = (clientX: number, clientY: number): { x: number; y: number } | null => {
    const r = g.getBoundingClientRect()
    const m = g.getScreenCTM()
    if (r.width === 0 || !m || clientX < r.left || clientX > r.right || clientY < r.top || clientY > r.bottom) return null
    const p = new DOMPoint(clientX, clientY).matrixTransform(m.inverse())
    return { x: (p.x - X0) / 10 + RAIL_ROOT_X_cm, y: (H_TOP - p.y - bench_h) / 10 }
  }
  let lifted: PartId | null = null
  function applyLift(): void {
    if (!lifted) return
    for (const n of g.querySelectorAll(`[data-part="${lifted}"]`)) n.setAttribute('visibility', 'hidden')
  }
  const dd = createDragDrop({ ctx, stage: wrap, mount: wrap })
  const adapter: StageAdapter = {
    probe(cx, cy) {
      const p = toCm(cx, cy)
      if (!p) return null
      // the side view has no depth: z is ignored, and a spot counts when the pointer is near it in height too
      return (zone) => (zone.id === 'table' ? p.y <= 45 && p.y >= -12 : Math.abs(p.y - zone.cy) <= zone.snap_cm + 8) ? { x_cm: p.x, z_cm: null } : null
    },
    showZones(zones: readonly Zone[], active: string | null) {
      zoneLayer.replaceChildren()
      const names = ddStrings[ctx.lang()].zones
      let row = 0
      for (const z of zones) {
        if (z.id === 'table') {
          zoneLayer.append(svg('rect', { x: X0 - 76, y: Y(bench_h) + 4, width: RAIL_LENGTH_m * MM + 72, height: BENCH_BAND - 8, rx: 6, class: `s2d-zone s2d-zone-table${active === z.id ? ' on' : ''}` }))
          continue
        }
        const on = active === z.id
        const cls = `s2d-zone${z.ready ? ' ready' : ' early'}${on ? ' on' : ''}`
        let shape: SVGElement
        if (z.kind === 'band') {
          shape = svg('rect', { x: -z.hx * 10, y: -22, width: z.hx * 20, height: 44, rx: 8, class: cls, transform: `translate(${sx(z.cx)} ${sy(z.cy)}) rotate(${((z.tilt_rad ?? 0) * 180) / Math.PI})` })
        } else shape = svg('circle', { cx: sx(z.cx), cy: sy(z.cy), r: z.snap_cm * 10 * 0.5, class: cls })
        zoneLayer.append(shape)
        // neighbouring labels sit on different lines so the longer ones do not run into each other
        zoneLayer.append(svg('text', { x: sx(z.cx), y: sy(z.cy) - z.snap_cm * 5 - (6 + 15 * (row++ % 3)) * kPx, class: 's2d-label s2d-zone-text', 'text-anchor': 'middle' }, names[z.id as ZoneId]))
      }
    },
    showPreview() { /* the floating chip of the controller follows the pointer */ },
    hidePreview() { /* nothing to hide */ },
    pickBenchPart(cx, cy) {
      const hit = document.elementFromPoint(cx, cy)?.closest<SVGElement>('[data-part]')
      return hit && g.contains(hit) ? (hit.dataset.part as PartId) : null
    },
    lift(part) {
      for (const n of g.querySelectorAll('[visibility="hidden"][data-part]')) n.setAttribute('visibility', 'visible')
      lifted = part
      applyLift()
    },
    lockCamera() { /* the side view has no camera */ },
    refuse() { /* the shell toast shows the reason */ },
    placed() { /* nothing to remember */ },
  }
  dd.setAdapter(adapter)

  return {
    update() { dd.update(); if (w.dirty()) { w.clear(); drawStatic(); lastKey = '' } drawDynamic() },
    relabel() { lastKey = ''; dd.relabel(); w.touch() },
    destroy() { dd.destroy(); ro.disconnect(); w.off(); wrap.remove() },
  }
}
