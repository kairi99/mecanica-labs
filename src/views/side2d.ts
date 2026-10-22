// 2D side view (SVG), like the guide's figure. Driven by the same Apparatus state as the 3D scene; used when WebGL2
// is missing, when the 3D view fails, and when the student picks 2D. Controls here call the same Apparatus actions.
import { CART_LENGTH_m, RACK_BASE_HEIGHT_m, TWO_LEG_BASE_HEIGHT_m, downSlope_m, railPointAt, railPos_mm, type RailPose, type Vec3 } from '../apparatus/index.ts'
import type { MountView, View } from './view.ts'
import { button, el, svg, watch } from './dom.ts'
import { lcdText } from './numfmt.ts'
import { onPress } from './press.ts'
import { getMarkRow } from './uistate.ts'
import { strings } from './strings/side2d.ts'

const S_PX = 600 // px per metre
const VEX = 1.4 // vertical exaggeration
const XO = 190
const GY = 290
const VB_W = 1000
const VB_H = 355
const X = (x_m: number): number => XO + x_m * S_PX
const Y = (y_m: number): number => GY - y_m * S_PX * VEX
const pt = (p: Vec3): [number, number] => [X(p.x_m), Y(p.y_m)]

export const mountSide2d: MountView = (root, ctx): View => {
  const app = ctx.apparatus
  const S = () => strings[ctx.lang()]
  const w = watch(app)
  const wrap = el('div', 'side2d')
  const scroll = el('div', 's2d-scroll')
  const g = svg('svg', { viewBox: `0 0 ${VB_W} ${VB_H}`, class: 's2d', role: 'img', preserveAspectRatio: 'xMidYMid meet' })
  const staticLayer = svg('g')
  const cartLayer = svg('g', { class: 's2d-cart' })
  g.append(staticLayer, cartLayer)
  scroll.append(g)
  const note = el('p', 'stage-note')
  const bar = el('div', 's2d-bar')
  const releaseBtn = button('', 'btn btn-primary')
  const backBtn = button('', 'btn btn-quiet')
  const swGroup = el('div', 's2d-sw')
  const swLcd = el('span', 'lcd-mini')
  const swStart = button('', 'btn btn-quiet')
  const swReset = button('', 'btn btn-quiet')
  swGroup.append(swLcd, swStart, swReset)
  bar.append(releaseBtn, backBtn, swGroup)
  const keys = el('p', 'stage-note')
  wrap.append(scroll, note, bar, keys)
  root.append(wrap)

  onPress(releaseBtn, (t) => { app.releaseCart(t); ctx.changed() })
  onPress(swStart, (t) => { app.stopwatchStartStop(t, { markTarget: getMarkRow() }); ctx.changed() })
  swReset.addEventListener('click', () => { app.stopwatchReset(); ctx.changed() })
  backBtn.addEventListener('click', () => { app.resetCart(); ctx.changed() })

  let slope = { cos: 1, sin: 0, deg: 0 }

  function drawStatic(): void {
    const T = S()
    const s = app.getState()
    const geo = s.geometry
    const pose: RailPose = app.railPoseNow()
    const L: SVGElement[] = []
    const add = (...e: SVGElement[]): void => { L.push(...e) }

    add(svg('rect', { x: 0, y: GY, width: VB_W, height: VB_H - GY, class: 's2d-table' }))
    add(svg('line', { x1: 0, y1: GY, x2: VB_W, y2: GY, class: 's2d-ground' }))

    // rack stand
    const clampH = geo ? geo.clampHeight_m : RACK_BASE_HEIGHT_m + s.rack_mm / 1000
    if (s.items.standBase) {
      const bx = s.joints.standBase ? 0 : -0.3
      add(svg('rect', { x: X(bx) - 52, y: GY - 12, width: 104, height: 12, rx: 3, class: 's2d-metal' }))
      add(svg('text', { x: X(bx), y: GY + 22, class: 's2d-label', 'text-anchor': 'middle' }, T.base))
    }
    if (s.items.rackStand) {
      const rx = s.joints.standBase ? 0 : -0.3
      const top = Y(clampH)
      const bottom = s.joints.standBase ? GY - 12 : GY
      add(svg('rect', { x: X(rx) - 5, y: Math.min(top, bottom - 8), width: 10, height: Math.max(8, bottom - top), class: 's2d-metal-hi' }))
      for (let mm = 0; mm <= 250; mm += 50) {
        const yy = Y(RACK_BASE_HEIGHT_m + mm / 1000)
        if (yy < bottom && yy >= top) add(svg('line', { x1: X(rx) - 12, y1: yy, x2: X(rx) - 5, y2: yy, class: 's2d-tick' }))
      }
      add(svg('rect', { x: X(rx) - 12, y: top - 10, width: 26, height: 14, rx: 3, class: 's2d-metal' }))
      add(svg('circle', { cx: X(rx) + 22, cy: top - 3, r: 8, class: 's2d-blue' }))
      add(svg('text', { x: X(rx), y: GY + 38, class: 's2d-label', 'text-anchor': 'middle' }, T.rack))
    }

    // two-leg stand
    if (s.items.twoLegStand) {
      const att = s.joints.twoLegStand
      const xs = att ? pose.twoLeg.x_m : 1.38
      const topH = att && geo ? geo.twoLegHeight_m : TWO_LEG_BASE_HEIGHT_m
      const tx = X(xs), ty = Y(topH)
      add(svg('line', { x1: tx, y1: ty, x2: tx - 30, y2: GY, class: 's2d-leg' }))
      add(svg('line', { x1: tx, y1: ty, x2: tx + 30, y2: GY, class: 's2d-leg' }))
      add(svg('line', { x1: tx - 20, y1: GY - (GY - ty) * 0.5 + 2, x2: tx + 20, y2: GY - (GY - ty) * 0.5 + 2, class: 's2d-leg thin' }))
      add(svg('rect', { x: tx - 6, y: ty - 4, width: 12, height: 8, class: 's2d-metal' }))
      add(svg('text', { x: tx, y: GY + 38, class: 's2d-label', 'text-anchor': 'middle' }, T.twoLeg))
    }

    // rail
    const zeroHigh = geo?.scaleZeroAtHighEnd ?? true
    const H = pt(pose.highEnd)
    const Lw = pt(pose.lowEnd)
    const a = Math.atan2(Lw[1] - H[1], Lw[0] - H[0])
    slope = { cos: Math.cos(a), sin: Math.sin(a), deg: (a * 180) / Math.PI }
    if (s.items.rail) {
      add(svg('line', { x1: H[0], y1: H[1] + 6, x2: Lw[0], y2: Lw[1] + 6, class: 's2d-rail' }))
      for (let mm = 0; mm <= 1200; mm += 100) {
        const D = mm / 1000
        const p = pt(railPointAt(pose, D))
        add(svg('line', { x1: p[0], y1: p[1] + 12, x2: p[0], y2: p[1] + 19, class: 's2d-tick' }))
        const printed = geo ? railPos_mm(D, zeroHigh) : mm
        add(svg('text', { x: p[0], y: p[1] + 32, class: 's2d-scale', 'text-anchor': 'middle' }, String(Math.round(printed / 10))))
      }
    }

    // receiver
    if (s.items.receiver) {
      if (s.joints.receiver) {
        add(svg('rect', { x: Lw[0] - 14, y: Lw[1] - 18, width: 28, height: 36, rx: 4, class: 's2d-blue' }))
        add(svg('circle', { cx: Lw[0] + 6, cy: Lw[1] - 2, r: 9, class: 's2d-pulley' }))
        add(svg('text', { x: Lw[0], y: GY + 54, class: 's2d-label', 'text-anchor': 'middle' }, T.receiver))
      } else {
        add(svg('rect', { x: X(1.2) - 14, y: GY - 28, width: 28, height: 28, rx: 4, class: 's2d-blue' }))
        add(svg('circle', { cx: X(1.2) + 6, cy: GY - 14, r: 8, class: 's2d-pulley' }))
      }
    }

    // marks: label relative to A
    if (s.items.rail && s.markers.length > 0) {
      const ev = app.evaluateMarks()
      ev.orderedRailPos_mm.forEach((pos, i) => {
        const D = geo ? downSlope_m(pos, zeroHigh) : pos / 1000
        const p = pt(railPointAt(pose, D))
        add(svg('line', { x1: p[0], y1: p[1] - 2, x2: p[0], y2: p[1] - 14, class: 's2d-mark' }))
        const cm = Math.round(ev.fromA_mm[i]! / 10)
        add(svg('text', { x: p[0], y: p[1] - 18, class: 's2d-mark-label', 'text-anchor': 'middle' }, i === 0 ? 'A' : String(cm)))
      })
    }

    // level
    if (s.items.level && s.level.placement) {
      const onRail = s.level.placement === 'rail' && s.items.rail
      const p = onRail ? pt(railPointAt(pose, 0.6)) : [X(0.55), GY] as [number, number]
      const rot = onRail ? slope.deg : 0
      const lv = svg('g', { transform: `translate(${p[0]} ${p[1]}) rotate(${rot})` })
      lv.append(svg('rect', { x: -34, y: -14, width: 68, height: 14, rx: 3, class: 's2d-level' }), svg('ellipse', { cx: 0, cy: -7, rx: 8, ry: 4, class: 's2d-bubble' }))
      add(lv)
      add(svg('text', { x: p[0], y: p[1] - 20, class: 's2d-label', 'text-anchor': 'middle' }, T.level))
    }

    // angle arc at the high end
    if (geo?.supportedBothEnds) {
      const r = 130
      add(svg('line', { x1: H[0], y1: H[1], x2: H[0] + 175, y2: H[1], class: 's2d-dash' }))
      add(svg('path', { d: `M ${H[0] + r} ${H[1]} A ${r} ${r} 0 0 1 ${H[0] + r * Math.cos(a)} ${H[1] + r * Math.sin(a)}`, class: 's2d-arc' }))
      add(svg('text', { x: H[0] + r + 14, y: H[1] + 26, class: 's2d-theta' }, T.theta))
    }

    // loose cart on the bench
    if (s.items.cart && !s.cart.placed) {
      const gx = X(0.3)
      add(svg('rect', { x: gx, y: GY - 24, width: CART_LENGTH_m * S_PX, height: 22, rx: 4, class: 's2d-cart-body' }))
      add(svg('circle', { cx: gx + 12, cy: GY - 4, r: 5, class: 's2d-wheel' }), svg('circle', { cx: gx + CART_LENGTH_m * S_PX - 12, cy: GY - 4, r: 5, class: 's2d-wheel' }))
      add(svg('text', { x: gx + 30, y: GY + 22, class: 's2d-label', 'text-anchor': 'middle' }, T.cart))
    }
    staticLayer.replaceChildren(...L)
  }

  let cartKey = ''
  function drawCart(): void {
    const s = app.getState()
    const pose = app.cartPose(ctx.now())
    if (!pose || !s.cart.placed || !s.geometry) { if (cartKey !== '') { cartLayer.replaceChildren(); cartKey = '' } return }
    const [fx, fy] = pt(pose.front)
    const [rx, ry] = pt(pose.rear)
    const len = Math.hypot(fx - rx, fy - ry)
    const deg = (Math.atan2(fy - ry, fx - rx) * 180) / Math.PI
    const key = `${rx.toFixed(1)}|${ry.toFixed(1)}|${deg.toFixed(2)}`
    if (key === cartKey) return
    cartKey = key
    const grp = svg('g', { transform: `translate(${rx.toFixed(1)} ${ry.toFixed(1)}) rotate(${deg.toFixed(3)})` })
    grp.append(
      svg('rect', { x: 0, y: -26, width: len, height: 22, rx: 4, class: 's2d-cart-body' }),
      svg('circle', { cx: 11, cy: -4, r: 5, class: 's2d-wheel' }), svg('circle', { cx: len - 11, cy: -4, r: 5, class: 's2d-wheel' }),
      svg('line', { x1: len, y1: -26, x2: len, y2: 0, class: 's2d-front' }),
      svg('text', { x: len / 2, y: -11, class: 's2d-cart-label', 'text-anchor': 'middle' }, S().cart),
    )
    cartLayer.replaceChildren(grp)
    if (app.cartState(ctx.now()).phase === 'rolling' && scroll.scrollWidth > scroll.clientWidth) {
      scroll.scrollLeft = (fx / VB_W) * scroll.scrollWidth - scroll.clientWidth / 2
    }
  }

  let lcdShown = ''
  function labels(): void {
    const T = S()
    g.setAttribute('aria-label', T.aria)
    note.textContent = T.scaleNote
    releaseBtn.textContent = T.release
    backBtn.textContent = T.returnStart
    swReset.textContent = T.reset
    keys.textContent = T.keys
    swGroup.setAttribute('aria-label', T.watch)
  }
  function sync(): void {
    drawStatic()
    cartKey = ''
    swStart.textContent = app.getState().stopwatch.running ? S().stop : S().start
    const has = app.hasItem('stopwatch')
    swStart.setAttribute('aria-disabled', String(!has)); if (has) swStart.removeAttribute('aria-disabled')
    swReset.disabled = !has
  }

  labels()
  return {
    update() {
      if (w.dirty()) { w.clear(); sync() }
      drawCart()
      const txt = app.hasItem('stopwatch') ? lcdText(app.stopwatchDisplay_s(ctx.now())) : '--:--.--'
      if (txt !== lcdShown) { lcdShown = txt; swLcd.textContent = txt }
    },
    relabel() { labels(); w.touch() },
    destroy() { w.off(); wrap.remove() },
  }
}
