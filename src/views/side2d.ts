// 2D side view (SVG), like the guide's figure. Driven by the same Apparatus state as the 3D scene; used when WebGL2
// is missing, when the 3D view fails, and when the student picks 2D. Controls here call the same Apparatus actions.
import { CART_LENGTH_m, RACK_BASE_HEIGHT_m, TWO_LEG_BASE_HEIGHT_m, downSlope_m, railPointAt, railPos_mm, type RailPose, type Vec3 } from '../apparatus/index.ts'
import type { MountView, View } from './view.ts'
import { el, svg, watch } from './dom.ts'
import { strings } from './strings/side2d.ts'

const S_PX = 600 // px per metre
const VEX = 1.4 // vertical exaggeration
const XO = 190
const GY = 290
/** Viewbox: x from VB_X0 over VB_W units; the top is fitted to the drawing so there is no empty band above the rail. */
const VB_X0 = 100
const VB_W = 960
const GROUND_PAD = 62
const X = (x_m: number): number => XO + x_m * S_PX
const Y = (y_m: number): number => GY - y_m * S_PX * VEX
const pt = (p: Vec3): [number, number] => [X(p.x_m), Y(p.y_m)]

export const mountSide2d: MountView = (root, ctx): View => {
  const app = ctx.apparatus
  const S = () => strings[ctx.lang()]
  const w = watch(app)
  const wrap = el('div', 'side2d')
  const g = svg('svg', { class: 's2d', role: 'img', preserveAspectRatio: 'xMidYMid meet' })
  const staticLayer = svg('g')
  const cartLayer = svg('g', { class: 's2d-cart' })
  g.append(staticLayer, cartLayer)
  const legend = el('ul', 's2d-legend')
  const note = el('p', 'stage-note')
  wrap.append(g, legend, note)
  root.append(wrap)

  // Text and strokes are sized in screen pixels: --k is the number of viewbox units per CSS pixel (fit to width on any screen).
  let kPx = 1
  let top = 0
  const setViewBox = (): void => g.setAttribute('viewBox', `${VB_X0} ${top} ${VB_W} ${GY + GROUND_PAD - top}`)
  const ro = new ResizeObserver(() => {
    const wpx = g.getBoundingClientRect().width
    if (wpx <= 0) return
    const k = VB_W / wpx
    if (Math.abs(k - kPx) > 0.01) { kPx = k; g.style.setProperty('--k', String(k)); w.touch() }
  })
  ro.observe(g)

  let slope = { cos: 1, sin: 0, deg: 0 }

  function drawStatic(): void {
    const T = S()
    const s = app.getState()
    const geo = s.geometry
    const pose: RailPose = app.railPoseNow()
    const L: SVGElement[] = []
    const add = (...e: SVGElement[]): void => { L.push(...e) }

    add(svg('rect', { x: VB_X0, y: GY, width: VB_W, height: GROUND_PAD, class: 's2d-table' }))
    add(svg('line', { x1: VB_X0, y1: GY, x2: VB_X0 + VB_W, y2: GY, class: 's2d-ground' }))
    const legendItems: Array<{ cls: string; text: string }> = []
    let minY = GY - 90

    // rack stand
    const clampH = geo ? geo.clampHeight_m : RACK_BASE_HEIGHT_m + s.rack_mm / 1000
    if (s.items.standBase) {
      const bx = s.joints.standBase ? 0 : -0.3
      add(svg('rect', { x: X(bx) - 52, y: GY - 12, width: 104, height: 12, rx: 3, class: 's2d-metal' }))
      legendItems.push({ cls: 's2d-metal', text: T.base })
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
      legendItems.push({ cls: 's2d-metal-hi', text: T.rack })
      minY = Math.min(minY, top - 12)
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
      legendItems.push({ cls: 's2d-leg-sw', text: T.twoLeg })
      minY = Math.min(minY, ty - 8)
    }

    // rail
    const zeroHigh = geo?.scaleZeroAtHighEnd ?? true
    const H = pt(pose.highEnd)
    const Lw = pt(pose.lowEnd)
    const a = Math.atan2(Lw[1] - H[1], Lw[0] - H[0])
    slope = { cos: Math.cos(a), sin: Math.sin(a), deg: (a * 180) / Math.PI }
    if (s.items.rail) {
      minY = Math.min(minY, H[1] - 8, Lw[1] - 8)
      add(svg('line', { x1: H[0], y1: H[1] + 6, x2: Lw[0], y2: Lw[1] + 6, class: 's2d-rail' }))
      for (let mm = 0; mm <= 1200; mm += 100) {
        const D = mm / 1000
        const p = pt(railPointAt(pose, D))
        add(svg('line', { x1: p[0], y1: p[1] + 12, x2: p[0], y2: p[1] + 19, class: 's2d-tick' }))
        const printed = geo ? railPos_mm(D, zeroHigh) : mm
        add(svg('text', { x: p[0], y: p[1] + 12 + 12 * kPx + 8, class: 's2d-scale', 'text-anchor': 'middle' }, String(Math.round(printed / 10))))
      }
    }

    // receiver
    if (s.items.receiver) {
      if (s.joints.receiver) {
        add(svg('rect', { x: Lw[0] - 14, y: Lw[1] - 18, width: 28, height: 36, rx: 4, class: 's2d-blue' }))
        add(svg('circle', { cx: Lw[0] + 6, cy: Lw[1] - 2, r: 9, class: 's2d-pulley' }))
        legendItems.push({ cls: 's2d-blue', text: T.receiver })
      } else {
        add(svg('rect', { x: X(1.2) - 14, y: GY - 28, width: 28, height: 28, rx: 4, class: 's2d-blue' }))
        add(svg('circle', { cx: X(1.2) + 6, cy: GY - 14, r: 8, class: 's2d-pulley' }))
      }
    }

    // marks: yellow tape labels, the distance from A (cm), at rail height above the rail
    if (s.items.rail && s.markers.length > 0) {
      const ev = app.evaluateMarks()
      const wide = (S_PX * 0.1) / kPx >= 36 // px between neighbouring 10 cm marks
      ev.orderedRailPos_mm.forEach((pos, i) => {
        const D = geo ? downSlope_m(pos, zeroHigh) : pos / 1000
        const p = pt(railPointAt(pose, D))
        const cm = Math.round(ev.fromA_mm[i]! / 10)
        const txt = i === 0 ? 'A' : wide ? `A+${cm}` : String(cm)
        const tw = (txt.length * 7 + 8) * kPx, th = 17 * kPx
        add(svg('line', { x1: p[0], y1: p[1] + 1, x2: p[0], y2: p[1] - 6 * kPx, class: 's2d-mark' }))
        add(svg('rect', { x: p[0] - tw / 2, y: p[1] - 6 * kPx - th, width: tw, height: th, rx: 2 * kPx, class: 's2d-tape' }))
        add(svg('text', { x: p[0], y: p[1] - 6 * kPx - th / 2 + 4.2 * kPx, class: 's2d-tape-label', 'text-anchor': 'middle' }, txt))
        minY = Math.min(minY, p[1] - 6 * kPx - th - 4)
      })
      legendItems.push({ cls: 's2d-tape', text: T.tapeLegend })
    }

    // level
    if (s.items.level && s.level.placement) {
      const onRail = s.level.placement === 'rail' && s.items.rail
      const p = onRail ? pt(railPointAt(pose, 0.6)) : [X(0.55), GY] as [number, number]
      const rot = onRail ? slope.deg : 0
      const lv = svg('g', { transform: `translate(${p[0]} ${p[1]}) rotate(${rot})` })
      lv.append(svg('rect', { x: -34, y: -14, width: 68, height: 14, rx: 3, class: 's2d-level' }), svg('ellipse', { cx: 0, cy: -7, rx: 8, ry: 4, class: 's2d-bubble' }))
      add(lv)
      legendItems.push({ cls: 's2d-level', text: T.level })
      minY = Math.min(minY, p[1] - 16)
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
    }
    if (s.items.cart) legendItems.push({ cls: 's2d-cart-body', text: T.cart })
    staticLayer.replaceChildren(...L)
    top = Math.max(0, Math.floor(minY - 10))
    setViewBox()
    legend.replaceChildren(...legendItems.map((li) => {
      const item = el('li', 's2d-legend-item')
      const sw = svg('svg', { viewBox: '0 0 16 12', class: 's2d-swatch', 'aria-hidden': 'true' }, svg('rect', { x: 1, y: 1, width: 14, height: 10, rx: 2, class: li.cls }))
      item.append(sw, document.createTextNode(li.text))
      return item
    }))
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
    )
    cartLayer.replaceChildren(grp)
  }

  function labels(): void {
    const T = S()
    g.setAttribute('aria-label', T.aria)
    note.textContent = T.scaleNote
  }
  function sync(): void {
    drawStatic()
    cartKey = ''
  }

  labels()
  return {
    update() {
      if (w.dirty()) { w.clear(); sync() }
      drawCart()
    },
    relabel() { labels(); w.touch() },
    destroy() { ro.disconnect(); w.off(); wrap.remove() },
  }
}
