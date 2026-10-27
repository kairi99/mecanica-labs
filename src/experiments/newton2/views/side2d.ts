// 2D side view (SVG) at true scale (1 unit = 1 mm): the bench, the rail on its stand and receiver, the DigiCart, the string over the pulley
// and the canister above the floor. Driven by the same Apparatus state as the 3D scene (cartState); used when WebGL2 is missing, when the 3D
// view fails, and when the student picks 2D. It only draws what the apparatus reports.
import {
  CART_LENGTH_m, RAIL_LENGTH_m, RECEIVER_STOP_FROM_END_m, SUPPORT_SEPARATION_m,
} from '../apparatus/index.ts'
import { BENCH_HEIGHT_m, CANISTER_HANG_m, STRING_ABOVE_RAIL_m, SUPPORT_BASE_HEIGHT_m } from '../physics/index.ts'
import type { MountView, View } from './view.ts'
import { el, svg, watch } from '../../../core/views/dom.ts'
import { strings } from './strings/side2d.ts'

const MM = 1000
const X0 = 100 // x of the rail's printed 0 mm
const VB_W = 1540
const H_TOP = 1180 // height drawn at the top edge of the view, mm above the floor
const Y = (h_mm: number): number => H_TOP - h_mm
const VB_H = H_TOP + 60

export const mountSide2d: MountView = (root, ctx): View => {
  const app = ctx.apparatus
  const S = () => strings[ctx.lang()]
  const w = watch(app)
  const wrap = el('div', 'side2d')
  const g = svg('svg', { class: 's2d', role: 'img', preserveAspectRatio: 'xMidYMid meet', viewBox: `0 0 ${VB_W} ${VB_H}` })
  const staticLayer = svg('g')
  const dynLayer = svg('g')
  g.append(staticLayer, dynLayer)
  const note = el('p', 'stage-note')
  wrap.append(g, note)
  root.append(wrap)

  let kPx = 1
  const ro = new ResizeObserver(() => {
    const wpx = g.getBoundingClientRect().width
    if (wpx <= 0) return
    const k = VB_W / wpx
    if (Math.abs(k - kPx) > 0.01) { kPx = k; g.style.setProperty('--k', String(k)); w.touch() }
  })
  ro.observe(g)

  const bench_h = BENCH_HEIGHT_m * MM
  const rail_top = (h: number): number => bench_h + SUPPORT_BASE_HEIGHT_m * MM + h

  function drawStatic(): void {
    const T = S()
    const s = app.getState()
    const L: SVGElement[] = []
    // floor and bench
    L.push(svg('rect', { x: 0, y: Y(0), width: VB_W, height: 60, class: 's2d-table' }))
    L.push(svg('line', { x1: 0, y1: Y(0), x2: VB_W, y2: Y(0), class: 's2d-ground' }))
    L.push(svg('text', { x: 12, y: Y(0) + 34, class: 's2d-label' }, T.floor))
    L.push(svg('rect', { x: X0 - 80, y: Y(bench_h), width: RAIL_LENGTH_m * MM + 160, height: 40, class: 's2d-metal' }))
    L.push(svg('rect', { x: X0 + 420, y: Y(bench_h) + 40, width: 20, height: bench_h - 40, class: 's2d-leg thin' }))
    L.push(svg('text', { x: X0 - 70, y: Y(bench_h) - 8, class: 's2d-label' }, T.bench))
    const geo = s.geometry
    const endLeft = s.joints.rackClamp === 'E1' || s.joints.rackClamp === null
    if (!s.items.rail) {
      L.push(svg('text', { x: X0 + 300, y: Y(rail_top(0)) - 20, class: 's2d-label' }, T.noRail))
    } else {
      const hS = rail_top(s.rack_mm), hR = rail_top(s.foot_mm)
      const left = endLeft ? hS : hR, right = endLeft ? hR : hS
      // rail as a thick line between its two support heights (extended to the rail ends)
      const slope = (right - left) / (SUPPORT_SEPARATION_m * MM)
      const yAt = (x: number): number => left + slope * (x - 50)
      L.push(svg('line', { x1: X0, y1: Y(yAt(0)), x2: X0 + RAIL_LENGTH_m * MM, y2: Y(yAt(RAIL_LENGTH_m * MM)), class: 's2d-rail' }))
      for (let p = 0; p <= 1200; p += 100) L.push(svg('line', { x1: X0 + p, y1: Y(yAt(p)) + 8, x2: X0 + p, y2: Y(yAt(p)) + (p % 200 === 0 ? 26 : 16), class: 's2d-tick' }))
      for (let p = 0; p <= 1200; p += 200) L.push(svg('text', { x: X0 + p, y: Y(yAt(p)) + 48, class: 's2d-scale', 'text-anchor': 'middle' }, String(p / 10)))
      // stand at one end, receiver at the other
      const standX = X0 + (endLeft ? 50 : 1150), recX = X0 + (endLeft ? 1150 : 50)
      L.push(svg('line', { x1: standX, y1: Y(bench_h + 40), x2: standX, y2: Y(endLeft ? hS : hS), class: 's2d-leg' }))
      L.push(svg('text', { x: standX, y: Y(bench_h) - 8, class: 's2d-label', 'text-anchor': 'middle' }, T.stand))
      if (s.items.receiver && s.joints.receiver) {
        const pxn = X0 + (endLeft ? RAIL_LENGTH_m * MM : 0)
        L.push(svg('rect', { x: pxn - (endLeft ? 40 : 0), y: Y(endLeft ? right : left) - 50, width: 40, height: 90, class: 's2d-blue' }))
        const py = Y((endLeft ? right : left) + STRING_ABOVE_RAIL_m * MM)
        L.push(svg('circle', { cx: pxn + (endLeft ? 10 : -10), cy: py - 4, r: 24, class: 's2d-pulley' }))
        L.push(svg('line', { x1: recX, y1: Y(bench_h + 40), x2: recX, y2: Y(endLeft ? right : left) + 40, class: 's2d-leg thin' }))
        L.push(svg('text', { x: pxn + (endLeft ? 20 : -20), y: py - 40, class: 's2d-label', 'text-anchor': 'end' }, T.receiver))
      }
      if (geo === null && !s.joints.receiver) { /* loose rail: nothing more */ }
      // marks
      for (const [pos, label] of [[s.marks.start_mm, T.start], [s.marks.end_mm, T.end]] as const) {
        if (pos === null) continue
        L.push(svg('line', { x1: X0 + pos, y1: Y(yAt(pos)) - 22, x2: X0 + pos, y2: Y(yAt(pos)) + 12, class: 's2d-mark' }))
        L.push(svg('text', { x: X0 + pos, y: Y(yAt(pos)) - 30, class: 's2d-label', 'text-anchor': 'middle' }, label))
      }
    }
    staticLayer.replaceChildren(...L)
    note.textContent = T.scaleNote
    g.setAttribute('aria-label', T.aria)
  }

  let lastKey = ''
  function drawDynamic(): void {
    const T = S()
    const s = app.getState()
    const st = app.cartState(ctx.now())
    const connected = s.joints.stringCart && s.joints.stringCanister && s.joints.stringPulley
    const key = [st.frontRailPos_mm?.toFixed(1), st.canisterDrop_m.toFixed(4), st.canisterOnFloor, s.masses.join(), connected, s.rack_mm, s.foot_mm, s.joints.rackClamp, s.joints.receiver, kPx].join('|')
    if (key === lastKey) return
    lastKey = key
    const L: SVGElement[] = []
    const endLeft = s.joints.rackClamp === 'E1' || s.joints.rackClamp === null
    const hS = rail_top(s.rack_mm), hR = rail_top(s.foot_mm)
    const left = endLeft ? hS : hR, right = endLeft ? hR : hS
    const slope = (right - left) / (SUPPORT_SEPARATION_m * MM)
    const yAt = (x: number): number => left + slope * (x - 50)
    const dir = endLeft ? 1 : -1
    const nCan = s.masses.filter((m) => m === 'canister').length
    const nCart = s.masses.filter((m) => m === 'cart').length
    if (st.frontRailPos_mm !== null && s.items.cart) {
      const f = st.frontRailPos_mm
      const rear = f - dir * CART_LENGTH_m * MM
      const x0 = X0 + Math.min(f, rear), cy = Y(yAt(f))
      L.push(svg('rect', { x: x0, y: cy - 30, width: CART_LENGTH_m * MM, height: 30, rx: 6, class: 's2d-cart-body' }))
      for (const wx of [x0 + 18, x0 + CART_LENGTH_m * MM - 18]) L.push(svg('circle', { cx: wx, cy: cy - 5, r: 8, class: 's2d-wheel' }))
      for (let i = 0; i < nCart; i++) L.push(svg('rect', { x: x0 + 10 + i * 20, y: cy - 46, width: 16, height: 16, class: 's2d-metal-hi' }))
      L.push(svg('text', { x: x0 + (CART_LENGTH_m * MM) / 2, y: cy - 54, class: 's2d-label', 'text-anchor': 'middle' }, T.cart))
      // string: brass screw on the cart front -> pulley -> canister
      if (connected && s.items.receiver) {
        const px = X0 + (endLeft ? RAIL_LENGTH_m * MM + 10 : -10)
        const py = Y((endLeft ? right : left) + STRING_ABOVE_RAIL_m * MM) - 4 - 24
        const hang = app.hangBelowPulley_m() ?? 0
        const top = py + 24 + (hang + st.canisterDrop_m) * MM
        const fx = X0 + f
        const fy = Y(yAt(f) + STRING_ABOVE_RAIL_m * MM)
        L.push(svg('polyline', { points: `${fx},${fy} ${px},${py} ${px + dir * 24},${py + 24} ${px + dir * 24},${top}`, class: 's2d-dash', fill: 'none' }))
        const cx = px + dir * 24
        L.push(svg('rect', { x: cx - 18, y: top, width: 36, height: CANISTER_HANG_m * MM - 10, rx: 4, class: 's2d-cart-body' }))
        for (let i = 0; i < nCan; i++) L.push(svg('rect', { x: cx - 14, y: top + 10 + i * 9, width: 28, height: 7, class: 's2d-metal-hi' }))
        L.push(svg('text', { x: cx, y: top + CANISTER_HANG_m * MM + 22, class: 's2d-label', 'text-anchor': 'middle' }, `${T.canister} · ${nCan} ${T.masses}`))
      }
    }
    dynLayer.replaceChildren(...L)
  }

  return {
    update() { if (w.dirty()) { w.clear(); drawStatic(); lastKey = '' } drawDynamic() },
    relabel() { lastKey = ''; w.touch() },
    destroy() { ro.disconnect(); w.off(); wrap.remove() },
  }
}
void RECEIVER_STOP_FROM_END_m
