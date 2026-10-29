// 2D side view (SVG): the table in profile with its edge, the inclined rail on its stands, the ball animated along the same
// trajectory as the 3D scene (it only renders ballStatus / the stored flight samples), the dotted trail of the last flight, the
// floor with the paper, the carbon marks and the tape measure when a target was measured. Used when WebGL2 is missing, when the 3D view
// fails, and when the student picks 2D.
import '../styles/side2d.css'
import { sheetToFloor, type ApparatusEvent, type TapeTarget } from '../apparatus/index.ts'
import { el, svg, watch } from '../../../core/views/dom.ts'
import type { MountView, View } from './view.ts'
import { strings } from './strings/side2d.ts'
import { strings as invStrings } from './strings/inventory.ts'
import { strings as ddStrings } from './strings/dragdrop.ts'
import { createDragDrop, type StageAdapter } from './dragdrop/controller.ts'
import { SNAP_CM, type Zone } from './dragdrop/snap.ts'
import type { ItemId } from '../apparatus/index.ts'
import { CM, RAIL, STAGING, TABLE, landMaxFor, markLabel, planTape, railFrame, railLocalToWorld, railLocalX_cm, sheetRectCm } from './scene3d/units.ts'

/** Viewbox units per cm: the whole bench, rack stand to landing zone, is about 260 cm wide. */
const S = 4

export const mountSide2d: MountView = (root, ctx): View => {
  const app = ctx.apparatus
  const T = () => strings[ctx.lang()]
  const w = watch(app)
  const wrap = el('div', 'side2d side2d-pb')
  const g = svg('svg', { class: 's2d', role: 'img', preserveAspectRatio: 'xMidYMid meet' })
  const staticLayer = svg('g')
  const dynLayer = svg('g', { class: 's2d-dyn' })
  const zoneLayer = svg('g', { class: 's2d-zones' })
  g.append(staticLayer, dynLayer, zoneLayer)
  const legend = el('ul', 's2d-legend')
  const note = el('p', 'stage-note')
  wrap.append(g, legend, note)
  wrap.classList.add('has-tray')
  root.append(wrap)
  /** Mark an element as a movable part (drag it to another spot or onto the tray). */
  const tagPart = <E extends SVGElement>(e: E, id: ItemId): E => { e.dataset.part = id; e.classList.add('s2d-part'); return e }

  const X = (x_cm: number): number => x_cm * S
  const Y = (y_cm: number): number => -y_cm * S

  // Text and strokes are sized in screen pixels: --k is the number of viewbox units per CSS pixel (fit to width on any screen).
  let kPx = 1
  let vb = { x0: 0, y0: 0, w: 1000, h: 500 }
  const setViewBox = (): void => g.setAttribute('viewBox', `${vb.x0} ${vb.y0} ${vb.w} ${vb.h}`)
  const ro = new ResizeObserver(() => {
    const wpx = g.getBoundingClientRect().width
    if (wpx <= 0) return
    const k = vb.w / wpx
    if (Math.abs(k - kPx) > 0.01) { kPx = k; g.style.setProperty('--k', String(k)); w.touch() }
  })
  ro.observe(g)

  // the last tape target the student measured (the tape measure has no state of its own: it is drawn from the measured event)
  let tapeTarget: TapeTarget | null = null
  const offEv = app.on((e: ApparatusEvent) => {
    if (e.type === 'measured') tapeTarget = e.target
    if (e.type === 'presetApplied' || e.type === 'loaded') tapeTarget = null
  })

  let H_cm = 76
  let trailRun = -1
  let lastMarks = -1
  let lastRestKey = ''

  function drawStatic(): void {
    const t = T()
    const st = app.getState()
    const geo = st.geometry
    const it = st.items
    H_cm = st.world.H_m * CM
    const frame = geo ? railFrame(geo) : null
    const L: SVGElement[] = []
    const add = (...e: SVGElement[]): void => { L.push(...e) }
    const legendItems: Array<{ cls: string; text: string }> = []

    // Text labels are placed last, each at the first of its candidate spots that touches no shape and no earlier label; if the
    // full text does not fit anywhere the short one is tried, and a label that fits nowhere is left out (it has a legend or a tooltip role elsewhere).
    type Box = [number, number, number, number]
    const occupied: Box[] = []
    const occupy = (x0: number, y0: number, x1: number, y1: number): void => { occupied.push([Math.min(x0, x1), Math.min(y0, y1), Math.max(x0, x1), Math.max(y0, y1)]) }
    type Spot = { x: number; y: number; anchor?: 'start' | 'middle' | 'end'; to?: [number, number] }
    /** Free sky to the right of the bench: a label that fits nowhere near its part goes here with a leader line to it. */
    const sky = (to: [number, number], first = 0): Spot[] => [0, 1, 2, 3].map((i) => ({ x: vb.x0 + vb.w - 6 * kPx, y: Y(0) - (34 + 17 * (i + first)) * kPx, anchor: 'end' as const, to }))
    const requests: Array<{ texts: string[]; spots: Spot[]; cls: string }> = []
    const label = (texts: string[], spots: Spot[], cls = 's2d-label'): void => { requests.push({ texts, spots, cls }) }
    const boxOf = (text: string, sp: Spot): Box => {
      const wText = text.length * 6 * kPx + 4 * kPx, a = sp.anchor ?? 'start'
      const x0 = a === 'start' ? sp.x : a === 'end' ? sp.x - wText : sp.x - wText / 2
      return [x0, sp.y - 11 * kPx, x0 + wText, sp.y + 1.5 * kPx]
    }
    const hits = (b: Box): boolean => occupied.some((o) => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1]) || b[0] < vb.x0 || b[2] > vb.x0 + vb.w
    const placeLabels = (): void => {
      const topLimit = minY - 2 * kPx // labels never grow the viewbox: it is already as tall as the flags need
      for (const r of requests) {
        let done = false
        for (const text of r.texts) {
          for (const sp of r.spots) {
            const b = boxOf(text, sp)
            if (hits(b) || b[1] < topLimit) continue
            if (sp.to) add(svg('line', { x1: sp.anchor === 'end' ? b[0] - 3 * kPx : b[2] + 3 * kPx, y1: sp.y - 4 * kPx, x2: sp.to[0], y2: sp.to[1], class: 's2d-leader' }))
            add(svg('text', { x: sp.x, y: sp.y, class: r.cls, ...(sp.anchor && sp.anchor !== 'start' ? { 'text-anchor': sp.anchor } : {}) }, text))
            occupied.push(b)
            minY = Math.min(minY, b[1])
            done = true
            break
          }
          if (done) break
        }
      }
    }

    // extent: from a little behind the rail's high end to the landing zone
    const sheets = [st.paper.bond, st.paper.carbon].filter((p) => p !== null).map((p) => sheetRectCm(p!))
    const marks = st.paper.bond ? app.paperMarks(ctx.now()).map((m) => { const p = sheetToFloor(st.paper.bond!, m.a_m, m.b_m); return [p.x_m * CM, p.z_m * CM] as [number, number] }) : []
    const rest = app.ballRest()
    const xMax = landMaxFor(sheets, rest ? [...marks, [rest.x_m * CM, rest.z_m * CM] as [number, number]] : marks)
    const xMin = geo ? Math.min(-60, geo.pose.highEnd.x_m * CM - 14) : -160
    const topCm = Math.max(geo ? geo.clampHeight_m * CM + 14 : 0, 34)
    const floorPad = 26 * kPx // room under the floor line for its label
    vb = { x0: X(xMin), y0: Y(topCm), w: X(xMax) - X(xMin), h: Y(-H_cm) + floorPad - Y(topCm) }
    let minY = Y(topCm)

    // floor, table, legs and the table edge
    add(svg('rect', { x: vb.x0, y: Y(-H_cm), width: vb.w, height: floorPad, class: 's2d-floor' }))
    add(svg('line', { x1: vb.x0, y1: Y(-H_cm), x2: vb.x0 + vb.w, y2: Y(-H_cm), class: 's2d-ground' }))
    label([t.floor], [{ x: vb.x0 + 6 * kPx, y: Y(-H_cm) + 15 * kPx }])
    for (const lx of [TABLE.x1 - TABLE.legInset, TABLE.x0 + TABLE.legInset]) {
      if (X(lx) < vb.x0 - 40) continue
      add(svg('rect', { x: X(lx) - (TABLE.legSize * S) / 2, y: Y(-TABLE.thickness), width: TABLE.legSize * S, height: (H_cm - TABLE.thickness) * S, class: 's2d-leg-body' }))
      occupy(X(lx) - (TABLE.legSize * S) / 2, Y(-TABLE.thickness), X(lx) + (TABLE.legSize * S) / 2, Y(-H_cm))
    }
    add(svg('rect', { x: vb.x0 - 40, y: Y(0), width: X(0) - vb.x0 + 40, height: TABLE.thickness * S, class: 's2d-table' }))
    add(svg('line', { x1: X(0), y1: Y(0), x2: X(0), y2: Y(-H_cm), class: 's2d-edge' }))
    occupy(vb.x0 - 40, Y(0), X(0), Y(0) + TABLE.thickness * S)
    occupy(X(0) - 1, Y(0), X(0) + 1, Y(-H_cm))
    label([t.edge, t.short.edge], [
      { x: X(0) + 6 * kPx, y: Y(0) - 7 * kPx }, { x: X(0) - 6 * kPx, y: Y(0) - 7 * kPx, anchor: 'end' },
      { x: X(0) + 6 * kPx, y: Y(-H_cm * 0.5) }, { x: X(0) + 6 * kPx, y: Y(-H_cm * 0.3) },
    ], 's2d-label s2d-edge-label')
    label([t.table, t.short.table], [
      { x: vb.x0 + 6 * kPx, y: Y(0) - 7 * kPx }, { x: vb.x0 + 6 * kPx, y: Y(0) + TABLE.thickness * S + 13 * kPx },
    ])

    // paper on the floor, the plumb point and the carbon marks
    if (st.paper.bond) {
      const r = sheetRectCm(st.paper.bond)
      add(svg('rect', { x: X(r.x0), y: Y(-H_cm) - 3, width: X(r.x1) - X(r.x0), height: 3, class: 's2d-bond' }))
      add(tagPart(svg('rect', { x: X(r.x0), y: Y(-H_cm) - 12 * kPx, width: X(r.x1) - X(r.x0), height: 12 * kPx, class: 's2d-hit' }), 'bondPaper'))
      legendItems.push({ cls: 's2d-bond', text: t.bond })
    }
    if (st.paper.carbon) {
      const r = sheetRectCm(st.paper.carbon)
      add(svg('rect', { x: X(r.x0), y: Y(-H_cm) - 5, width: X(r.x1) - X(r.x0), height: 2, class: 's2d-carbon' }))
      if (!st.paper.bond) add(tagPart(svg('rect', { x: X(r.x0), y: Y(-H_cm) - 12 * kPx, width: X(r.x1) - X(r.x0), height: 12 * kPx, class: 's2d-hit' }), 'carbonPaper'))
      legendItems.push({ cls: 's2d-carbon', text: t.carbon })
    }
    if (st.paper.bond) {
      const ms = app.paperMarks(ctx.now())
      lastMarks = ms.length
      for (const m of ms) {
        const p = sheetToFloor(st.paper.bond, m.a_m, m.b_m)
        add(svg('circle', { cx: X(p.x_m * CM), cy: Y(-H_cm) - 7, r: 2.6 * kPx, class: 's2d-mark-dot', opacity: 0.45 + 0.55 * m.darkness }))
      }
      if (ms.length > 0) legendItems.push({ cls: 's2d-mark-dot', text: t.carbonMark })
    }
    if (st.edgeProjection) {
      const p = app.hiddenTruth().edgeProjection
      const px = X((p?.x_m ?? 0) * CM), py = Y(-H_cm)
      add(svg('line', { x1: px - 5 * kPx, y1: py - 1, x2: px + 5 * kPx, y2: py - 1, class: 's2d-plumb' }), svg('line', { x1: px, y1: py - 6 * kPx, x2: px, y2: py + 4 * kPx, class: 's2d-plumb' }))
      legendItems.push({ cls: 's2d-plumb-sw', text: t.plumb })
    }

    // rack stand
    const standX = geo ? geo.pose.clamp.x_m * CM : -125
    const clampH = geo ? geo.clampHeight_m * CM : (0.06 + st.rack_mm / 1000) * CM
    if (it.base && st.joints.standBase) {
      add(tagPart(svg('rect', { x: X(standX) - 8 * S, y: Y(0.7), width: 16 * S, height: 0.7 * S, rx: 2, class: 's2d-metal' }), 'base'))
      occupy(X(standX) - 8 * S, Y(0.7), X(standX) + 8 * S, Y(0))
    }
    if (it.rackStand && st.joints.standBase) {
      add(tagPart(svg('rect', { x: X(standX) - 0.6 * S, y: Y(38), width: 1.2 * S, height: 38 * S, class: 's2d-metal-hi' }), 'rackStand'))
      add(svg('rect', { x: X(standX) - 2.2 * S, y: Y(clampH) - 1 * S, width: 4.4 * S, height: 3.6 * S, rx: 2, class: 's2d-clamp' }))
      occupy(X(standX) - 0.6 * S, Y(38), X(standX) + 0.6 * S, Y(0))
      occupy(X(standX) - 2.2 * S, Y(clampH) - 1 * S, X(standX) + 2.2 * S, Y(clampH) + 2.6 * S)
      occupy(X(standX) + 3.4 * S - 5 * kPx, Y(clampH) + 1 * S - 5 * kPx, X(standX) + 3.4 * S + 5 * kPx, Y(clampH) + 1 * S + 5 * kPx)
      const rackSpots: Spot[] = []
      for (const f of [0.3, 0.22, 0.14]) rackSpots.push({ x: X(standX) + 3 * S + 3 * kPx, y: Y(clampH * f) + 4 * kPx }, { x: X(standX) - 3 * S - 3 * kPx, y: Y(clampH * f) + 4 * kPx, anchor: 'end' })
      label([t.rack, t.short.rack], [...rackSpots, ...sky([X(standX), Y(Math.min(38, clampH + 6))], 1)])
      add(svg('circle', { cx: X(standX) + 3.4 * S, cy: Y(clampH) + 1 * S, r: Math.max(1.5 * S, 5 * kPx), class: 's2d-blue' }))
    }

    // two-leg stand
    if (it.twoLeg && geo && st.joints.twoLegStand) {
      const tx = X(geo.pose.twoLeg.x_m * CM), ty = Y(geo.legHeight_m * CM)
      add(tagPart(svg('line', { x1: tx, y1: ty, x2: tx - 3 * S, y2: Y(0), class: 's2d-leg' }), 'twoLeg'), tagPart(svg('line', { x1: tx, y1: ty, x2: tx + 3 * S, y2: Y(0), class: 's2d-leg' }), 'twoLeg'))
      occupy(tx - 3 * S - 2 * kPx, ty, tx + 3 * S + 2 * kPx, Y(0))
      label([t.twoLeg, t.short.twoLeg], [
        { x: tx, y: Y(0) + TABLE.thickness * S + 13 * kPx, anchor: 'middle' }, { x: tx + 3 * S + 5 * kPx, y: Y(0) + TABLE.thickness * S + 13 * kPx },
        { x: tx - 3 * S - 5 * kPx, y: Y(0) + TABLE.thickness * S + 13 * kPx, anchor: 'end' }, { x: tx + 3 * S + 5 * kPx, y: Y(0) + TABLE.thickness * S + 28 * kPx },
      ])
    }

    // rail
    if (it.rail && geo && frame) {
      const a = railLocalToWorld(frame, [0, -RAIL.height / 2, 0]), b = railLocalToWorld(frame, [RAIL.length, -RAIL.height / 2, 0])
      add(svg('line', { x1: X(a[0]), y1: Y(a[1]), x2: X(b[0]), y2: Y(b[1]), class: 's2d-rail' }))
      // shoe: the sloped end piece, a wedge from the beam's low end down to the lip (same polygon as the 3D model)
      {
        const kk = geo.shoe.kink_rad, Ls = geo.shoe.length_m * CM
        if (Ls > 0.05) {
          const P = (lx: number, ly: number): string => { const w = railLocalToWorld(frame, [lx, ly, 0]); return `${X(w[0]).toFixed(1)},${Y(w[1]).toFixed(1)}` }
          const lx = RAIL.length + Ls * Math.cos(kk), ly = -Ls * Math.sin(kk)
          add(svg('polygon', { points: [P(RAIL.length, 0), P(lx, ly), P(lx, ly - 0.12), P(RAIL.length, -RAIL.height)].join(' '), class: 's2d-shoe' }))
        }
      }
      for (let i = 0; i <= 16; i++) { const f = i / 16, cx = X(a[0] * (1 - f) + b[0] * f), cy = Y(a[1] * (1 - f) + b[1] * f); occupy(cx - 5 * kPx, cy - 5 * kPx, cx + 5 * kPx, cy + 5 * kPx) }
      const railSpot = (f: number, dy: number, anchor: 'middle' = 'middle'): Spot => ({ x: X(a[0] * (1 - f) + b[0] * f), y: Y(a[1] * (1 - f) + b[1] * f) + dy * kPx, anchor })
      label([t.rail], [railSpot(0.7, -13), railSpot(0.5, -13), railSpot(0.85, -13), railSpot(0.3, -13), railSpot(0.7, 21), railSpot(0.5, 21), railSpot(0.85, 21), railSpot(0.3, 21), ...sky([X(a[0] * 0.25 + b[0] * 0.75), Y(a[1] * 0.25 + b[1] * 0.75) - 3 * kPx])])
      // marks: yellow flags above the rail, staggered so neighbouring labels never overlap
      const sorted = [...st.marks].sort((p, q) => p.s_m - q.s_m)
      sorted.forEach((m, i) => {
        const p = railLocalToWorld(frame, [railLocalX_cm(m.s_m), 0, 0])
        const txt = markLabel(m.s_m)
        const row = i % 2
        const tw = (txt.length * 7 + 8) * kPx, th = 17 * kPx
        const yTop = Y(p[1]) - 9 * kPx - row * (th + 5 * kPx)
        add(svg('line', { x1: X(p[0]), y1: Y(p[1]), x2: X(p[0]), y2: yTop, class: 's2d-mark' }))
        occupy(X(p[0]) - tw / 2, yTop - th, X(p[0]) + tw / 2, Y(p[1]))
        minY = Math.min(minY, yTop - th)
        add(svg('rect', { x: X(p[0]) - tw / 2, y: yTop - th, width: tw, height: th, rx: 2 * kPx, class: 's2d-tape' }))
        add(svg('text', { x: X(p[0]), y: yTop - th / 2 + 4.2 * kPx, class: 's2d-tape-label', 'text-anchor': 'middle' }, txt))
      })
      if (sorted.length > 0) legendItems.push({ cls: 's2d-tape', text: t.tapeLegend })
      // level on the rail
      if (it.level && st.level.placement === 'rail') {
        const p = railLocalToWorld(frame, [60, 0, 0])
        const deg = (frame.tilt_rad * -180) / Math.PI
        const lv = svg('g', { transform: `translate(${X(p[0])} ${Y(p[1])}) rotate(${-deg})` })
        lv.append(svg('rect', { x: -5 * S, y: -1.6 * S, width: 10 * S, height: 1.6 * S, rx: 3, class: 's2d-level' }), svg('ellipse', { cx: 0, cy: -0.8 * S, rx: 1.2 * S, ry: 0.5 * S, class: 's2d-bubble' }))
        add(lv)
      }
    }

    // loose materials lying on the table (nothing is joined yet): the rail on the bench, the small parts in a row above it
    {
      const T = invStrings[ctx.lang()].items
      const part = (id: ItemId, shape: SVGElement, x: number, y: number, wCm: number, hCm: number): void => {
        const title = svg('title'); title.textContent = T[id]
        const hit = svg('rect', { x: X(x - wCm / 2) - 3 * kPx, y: Y(y + hCm) - 3 * kPx, width: wCm * S + 6 * kPx, height: hCm * S + 6 * kPx, class: 's2d-hit' })
        const grp = svg('g'); grp.append(shape, hit, title)
        add(tagPart(grp, id))
        occupy(X(x - wCm / 2), Y(y + hCm), X(x + wCm / 2), Y(y))
      }
      if (it.rail && !st.joints.rackClamp) {
        const x0 = -150, x1 = -30
        part('rail', svg('line', { x1: X(x0), y1: Y(1.2), x2: X(x1), y2: Y(1.2), class: 's2d-rail' }), (x0 + x1) / 2, 0, x1 - x0, 2.5)
      }
      const row: Array<[ItemId, SVGElement, number, number]> = []
      if (it.rackStand && !st.joints.standBase) row.push(['rackStand', svg('rect', { x: 0, y: 0, width: 9 * S, height: 1.4 * S, rx: 2, class: 's2d-metal-hi' }), 9, 1.4])
      if (it.base && !st.joints.standBase) row.push(['base', svg('rect', { x: 0, y: 0, width: 9 * S, height: 0.9 * S, rx: 2, class: 's2d-metal' }), 9, 0.9])
      if (it.twoLeg && !st.joints.twoLegStand) row.push(['twoLeg', svg('path', { d: `M 0 ${5 * S} L ${3 * S} 0 L ${6 * S} ${5 * S}`, class: 's2d-leg' }), 6, 5])
      if (it.screws && st.screwsAvailable > 0) row.push(['screws', svg('rect', { x: 0, y: 0, width: 4 * S, height: 1.2 * S, rx: 2, class: 's2d-metal' }), 4, 1.2])
      if (it.level && st.level.placement !== 'rail') row.push(['level', svg('rect', { x: 0, y: 0, width: 10 * S, height: 1.6 * S, rx: 3, class: 's2d-level' }), 10, 1.6])
      if (it.tapeMeasure) row.push(['tapeMeasure', svg('rect', { x: 0, y: 0, width: 6 * S, height: 3.5 * S, rx: 3, class: 's2d-tape' }), 6, 3.5])
      if (it.stopwatch) row.push(['stopwatch', svg('rect', { x: 0, y: 0, width: 6 * S, height: 2.6 * S, rx: 4, class: 's2d-metal-hi' }), 6, 2.6])
      if (it.marble && !(st.ball.placed && st.ball.selected === 'marble')) row.push(['marble', svg('circle', { cx: 0.8 * S, cy: 0.8 * S, r: 0.8 * S + 2, class: 's2d-ball marble' }), 1.6, 1.6])
      if (it.pingPong && !(st.ball.placed && st.ball.selected === 'pingpong')) row.push(['pingPong', svg('circle', { cx: 2 * S, cy: 2 * S, r: 2 * S, class: 's2d-ball pingpong' }), 4, 4])
      if (it.bondPaper && !st.paper.bond) row.push(['bondPaper', svg('rect', { x: 0, y: 0, width: 9 * S, height: 0.7 * S, class: 's2d-bond' }), 9, 0.7])
      if (it.carbonPaper && !st.paper.carbon) row.push(['carbonPaper', svg('rect', { x: 0, y: 0, width: 9 * S, height: 0.7 * S, class: 's2d-carbon' }), 9, 0.7])
      row.forEach(([id, shape, w, h], i) => {
        const x = -150 + 7 + i * 12
        const y = 5
        shape.setAttribute('transform', `translate(${X(x) - (w * S) / 2} ${Y(y + h)})`)
        part(id, shape, x, y, w, h)
      })
    }

    // tape measure of the last measured target (a yellow bar between its hook and its reading point)
    if (tapeTarget && it.tapeMeasure) {
      const truth = app.hiddenTruth()
      const plan = planTape(tapeTarget, {
        H_m: st.world.H_m, geo, markS_m: (id) => truth.markTrueS_m[id] ?? null, markOnFloor: (id) => app.markOnFloor(id), edgeProjection: truth.edgeProjection,
      })
      if (plan) {
        const dx = plan.mode === 'down' ? 6 * kPx : 0
        add(svg('line', { x1: X(plan.hook[0]) + dx, y1: Y(plan.hook[1]) - (plan.flat ? 4 : 0), x2: X(plan.reading[0]) + dx, y2: Y(plan.reading[1]) - (plan.flat ? 4 : 0), class: 's2d-tapebar' }))
      }
    }

    placeLabels()
    staticLayer.replaceChildren(...L)
    // the viewbox grows upward to hold the flags: no clipped labels, no empty band
    vb.y0 = Math.min(vb.y0, minY - 6 * kPx)
    vb.h = Y(-H_cm) + floorPad - vb.y0
    setViewBox()
    legend.replaceChildren(...legendItems.filter((li, i, arr) => arr.findIndex((o) => o.text === li.text) === i).map((li) => {
      const item = el('li', 's2d-legend-item')
      const sw = svg('svg', { viewBox: '0 0 16 12', class: 's2d-swatch', 'aria-hidden': 'true' }, svg('rect', { x: 1, y: 1, width: 14, height: 10, rx: 2, class: li.cls }))
      item.append(sw, document.createTextNode(li.text))
      return item
    }))
  }

  // ---- ball and trail --------------------------------------------------------------------------------------------------
  const ball = svg('circle', { class: 's2d-ball', r: 4 })
  const trailEl = svg('polyline', { class: 's2d-trail', fill: 'none' })
  dynLayer.append(trailEl, ball)
  let ballKey = ''
  let trailPts = ''
  const setTrail = (runId: number): void => {
    trailRun = runId
    const traj = app.runPath(runId) // the whole path: shoe, arc, hops, flight
    const step = Math.max(1, Math.ceil(traj.length / 60))
    const pts: string[] = []
    for (let i = 0; i < traj.length; i += step) pts.push(`${X(traj[i]!.x_m * CM).toFixed(1)},${Y((traj[i]!.y_m - app.getState().world.H_m) * CM).toFixed(1)}`)
    trailPts = pts.join(' ')
    trailEl.setAttribute('points', trailPts)
  }
  // a trail of the last flight survives a reload: adopt the newest run that flew
  for (const r of app.getRuns().reverse()) if (r.flight) { setTrail(r.id); break }
  const drawBall = (): void => {
    const st = app.getState()
    const status = app.ballStatus(ctx.now())
    const id = status.ball ?? 'marble'
    const R = id === 'marble' ? 0.8 : 2
    // the ball is drawn larger than life when small: a 16 mm marble would be a 1 px dot at this scale
    const r = Math.max(R * S, 3.4 * kPx)
    const pos = status.pos ? { x: status.pos.x_m * CM, y: (status.pos.y_m - st.world.H_m) * CM } : { x: STAGING.marble.x, y: R }
    const key = `${id}|${pos.x.toFixed(2)}|${pos.y.toFixed(2)}|${r.toFixed(2)}|${st.items.marble}|${st.items.pingPong}`
    if (key !== ballKey) {
      ballKey = key
      ball.setAttribute('cx', String(X(pos.x))); ball.setAttribute('cy', String(Y(pos.y) - (r - R * S))); ball.setAttribute('r', String(r))
      ball.setAttribute('class', id === 'marble' ? 's2d-ball marble' : 's2d-ball pingpong')
      ball.style.display = status.pos === null ? 'none' : ''
    }
    // dotted trail of the flight: the newest run that flew; hidden while the next ball is still rolling
    const runId = status.runId
    if (runId !== null && runId !== trailRun && (status.phase === 'flying' || status.phase === 'landed')) {
      setTrail(runId)
    } else if (runId !== null && runId !== trailRun && trailPts !== '') {
      trailPts = ''
      trailEl.setAttribute('points', '')
    }
  }

  // ---- drag-and-drop assembly (same controller as the 3D scene; this is the stage side) -------------------------------------
  const toCm = (clientX: number, clientY: number): { x: number; y: number } | null => {
    const r = g.getBoundingClientRect()
    if (r.width === 0 || clientX < r.left || clientX > r.right || clientY < r.top || clientY > r.bottom) return null
    const k = vb.w / r.width
    return { x: (vb.x0 + (clientX - r.left) * k) / S, y: -(vb.y0 + (clientY - r.top) * k) / S }
  }
  const zoneName = (z: Zone): string => ddStrings[ctx.lang()].zones[z.id]
  let hidden: Element[] = []
  const dd = createDragDrop({ ctx, stage: wrap, mount: wrap })
  const adapter: StageAdapter = {
    probe(cx, cy) {
      const p = toCm(cx, cy)
      if (!p) return null
      const H = app.getState().world.H_m * CM
      // the side view has no depth: z is ignored, and a spot counts when the pointer is near it in height too
      return (zone) => {
        const z = zone as Zone
        let ok: boolean
        if (z.id === 'table') ok = p.y >= -8 && p.y <= 60
        else if (z.id === 'floor') ok = p.y < -H * 0.5
        else if (z.rail) ok = Math.abs(p.y - (z.rail.highY_cm - ((p.x - z.rail.highX_cm) / z.rail.cos) * Math.sin(z.rail.tilt_rad))) <= 26
        else ok = Math.abs(p.y - z.cy) <= SNAP_CM + 8
        return ok ? { x_cm: p.x, z_cm: null } : null
      }
    },
    showZones(zones, active) {
      zoneLayer.replaceChildren()
      for (const z of zones as Zone[]) {
        const on = active === z.id
        if (z.id === 'table') {
          zoneLayer.append(svg('rect', { x: X(TABLE.x0), y: Y(0) - 4, width: X(TABLE.x1) - X(TABLE.x0), height: TABLE.thickness * S + 8, rx: 6, class: `s2d-zone s2d-zone-table${on ? ' on' : ''}` }))
          continue
        }
        const cls = `s2d-zone${z.ready ? ' ready' : ' early'}${on ? ' on' : ''}`
        let shape: SVGElement
        let labelY: number
        if (z.hx > 0) {
          const w = z.rail ? z.hx / z.rail.cos : z.hx
          const deg = ((z.tilt_rad ?? 0) * 180) / Math.PI
          const hh = z.id === 'floor' ? 5 : 3.5
          shape = svg('rect', { x: -w * S, y: -hh * S, width: 2 * w * S, height: 2 * hh * S, rx: 8, class: cls, transform: `translate(${X(z.cx)} ${Y(z.cy)}) rotate(${deg})` })
          labelY = Y(z.cy) - hh * S - 8 * kPx
        } else {
          shape = svg('circle', { cx: X(z.cx), cy: Y(z.cy), r: SNAP_CM * S * 0.5, class: cls })
          labelY = Y(z.cy) - SNAP_CM * S * 0.5 - 6 * kPx
        }
        zoneLayer.append(shape, svg('text', { x: X(z.cx), y: labelY, class: 's2d-label s2d-zone-text', 'text-anchor': 'middle' }, zoneName(z)))
      }
    },
    showPreview() { /* the floating chip of the controller follows the pointer */ },
    hidePreview() { /* nothing to hide */ },
    pickBenchPart(cx, cy) {
      const hit = document.elementFromPoint(cx, cy)?.closest<SVGElement>('[data-part]')
      return hit && g.contains(hit) ? (hit.dataset.part as ItemId) : null
    },
    lift(part) {
      for (const n of hidden) n.setAttribute('visibility', 'visible')
      hidden = []
      if (part) { hidden = [...g.querySelectorAll(`[data-part="${part}"]`)]; for (const n of hidden) n.setAttribute('visibility', 'hidden') }
    },
    lockCamera() { /* the side view has no camera */ },
    refuse() { /* the shell toast shows the reason */ },
    placed() { /* nothing to remember */ },
  }
  dd.setAdapter(adapter)

  function labels(): void {
    const t = T()
    g.setAttribute('aria-label', t.aria)
    note.textContent = t.scaleNote
  }
  labels()
  return {
    update() {
      dd.update()
      const now = ctx.now()
      app.tick(now)
      if (app.getState().paper.bond && app.paperMarks(now).length !== lastMarks) w.touch()
      const rest = app.ballRest()
      const restKey = rest ? `${rest.x_m.toFixed(3)},${rest.z_m.toFixed(3)}` : ''
      if (restKey !== lastRestKey) { lastRestKey = restKey; w.touch() }
      if (w.dirty()) { w.clear(); drawStatic(); ballKey = '' }
      drawBall()
    },
    relabel() { labels(); dd.relabel(); w.touch() },
    destroy() { dd.destroy(); ro.disconnect(); w.off(); offEv(); wrap.remove() },
  }
}

