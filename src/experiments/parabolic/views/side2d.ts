// 2D side view (SVG): the table in profile with its edge, the inclined rail on its stands, the ball animated along the same
// trajectory as the 3D scene (it only renders ballStatus / the stored flight samples), the dotted trail of the last flight, the
// floor with the paper, the carbon marks and the tape measure when a target was measured. Used when WebGL2 is missing, when the 3D view
// fails, and when the student picks 2D.
import '../styles/side2d.css'
import { sheetToFloor, type ApparatusEvent, type TapeTarget } from '../apparatus/index.ts'
import { el, svg, watch } from '../../../core/views/dom.ts'
import type { MountView, View } from './view.ts'
import { strings } from './strings/side2d.ts'
import { CM, RAIL, STAGING, TABLE, landMaxFor, markLabel, planTape, railFrame, railLocalToWorld, railLocalX_cm, sheetRectCm } from './scene3d/units.ts'

/** Viewbox units per cm: the whole bench, rack stand to landing zone, is about 260 cm wide. */
const S = 4

export const mountSide2d: MountView = (root, ctx): View => {
  const app = ctx.apparatus
  const T = () => strings[ctx.lang()]
  const w = watch(app)
  const wrap = el('div', 'side2d')
  const g = svg('svg', { class: 's2d', role: 'img', preserveAspectRatio: 'xMidYMid meet' })
  const staticLayer = svg('g')
  const dynLayer = svg('g', { class: 's2d-dyn' })
  g.append(staticLayer, dynLayer)
  const legend = el('ul', 's2d-legend')
  const note = el('p', 'stage-note')
  wrap.append(g, legend, note)
  root.append(wrap)

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

    // extent: from a little behind the rail's high end to the landing zone
    const sheets = [st.paper.bond, st.paper.carbon].filter((p) => p !== null).map((p) => sheetRectCm(p!))
    const marks = st.paper.bond ? app.paperMarks(ctx.now()).map((m) => { const p = sheetToFloor(st.paper.bond!, m.a_m, m.b_m); return [p.x_m * CM, p.z_m * CM] as [number, number] }) : []
    const xMax = landMaxFor(sheets, marks)
    const xMin = geo ? Math.min(-60, geo.pose.highEnd.x_m * CM - 14) : -150
    const topCm = Math.max(geo ? geo.clampHeight_m * CM + 14 : 0, 34)
    const floorPad = 26 * kPx // room under the floor line for its label
    vb = { x0: X(xMin), y0: Y(topCm), w: X(xMax) - X(xMin), h: Y(-H_cm) + floorPad - Y(topCm) }
    let minY = Y(topCm)

    // floor, table, legs and the table edge
    add(svg('rect', { x: vb.x0, y: Y(-H_cm), width: vb.w, height: floorPad, class: 's2d-floor' }))
    add(svg('line', { x1: vb.x0, y1: Y(-H_cm), x2: vb.x0 + vb.w, y2: Y(-H_cm), class: 's2d-ground' }))
    add(svg('text', { x: vb.x0 + 6 * kPx, y: Y(-H_cm) + 15 * kPx, class: 's2d-label' }, t.floor))
    for (const lx of [TABLE.x1 - TABLE.legInset, TABLE.x0 + TABLE.legInset]) {
      if (X(lx) < vb.x0 - 40) continue
      add(svg('rect', { x: X(lx) - (TABLE.legSize * S) / 2, y: Y(-TABLE.thickness), width: TABLE.legSize * S, height: (H_cm - TABLE.thickness) * S, class: 's2d-leg-body' }))
    }
    add(svg('rect', { x: vb.x0 - 40, y: Y(0), width: X(0) - vb.x0 + 40, height: TABLE.thickness * S, class: 's2d-table' }))
    add(svg('line', { x1: X(0), y1: Y(0), x2: X(0), y2: Y(-H_cm), class: 's2d-edge' }))
    add(svg('text', { x: X(0) + 6 * kPx, y: Y(0) - 7 * kPx, class: 's2d-label s2d-edge-label' }, t.edge))
    add(svg('text', { x: vb.x0 + 6 * kPx, y: Y(0) - 7 * kPx, class: 's2d-label' }, t.table))
    legendItems.push({ cls: 's2d-table', text: t.table })

    // paper on the floor, the plumb point and the carbon marks
    if (st.paper.bond) {
      const r = sheetRectCm(st.paper.bond)
      add(svg('rect', { x: X(r.x0), y: Y(-H_cm) - 3, width: X(r.x1) - X(r.x0), height: 3, class: 's2d-bond' }))
      legendItems.push({ cls: 's2d-bond', text: t.bond })
    }
    if (st.paper.carbon) {
      const r = sheetRectCm(st.paper.carbon)
      add(svg('rect', { x: X(r.x0), y: Y(-H_cm) - 5, width: X(r.x1) - X(r.x0), height: 2, class: 's2d-carbon' }))
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
    if (it.base) {
      add(svg('rect', { x: X(standX) - 8 * S, y: Y(0.7), width: 16 * S, height: 0.7 * S, rx: 2, class: 's2d-metal' }))
      legendItems.push({ cls: 's2d-metal', text: t.base })
    }
    if (it.rackStand) {
      add(svg('rect', { x: X(standX) - 0.6 * S, y: Y(38), width: 1.2 * S, height: 38 * S, class: 's2d-metal-hi' }))
      add(svg('rect', { x: X(standX) - 2.2 * S, y: Y(clampH) - 1 * S, width: 4.4 * S, height: 3.6 * S, rx: 2, class: 's2d-clamp' }))
      add(svg('circle', { cx: X(standX) + 3.4 * S, cy: Y(clampH) + 1 * S, r: Math.max(1.5 * S, 5 * kPx), class: 's2d-blue' }))
      legendItems.push({ cls: 's2d-metal-hi', text: t.rack })
    }

    // two-leg stand
    if (it.twoLeg && geo && st.joints.twoLegStand) {
      const tx = X(geo.pose.twoLeg.x_m * CM), ty = Y(geo.legHeight_m * CM - RAIL.height)
      add(svg('line', { x1: tx, y1: ty, x2: tx - 3 * S, y2: Y(0), class: 's2d-leg' }), svg('line', { x1: tx, y1: ty, x2: tx + 3 * S, y2: Y(0), class: 's2d-leg' }))
      legendItems.push({ cls: 's2d-leg-sw', text: t.twoLeg })
    }

    // rail
    if (it.rail && geo && frame) {
      const a = railLocalToWorld(frame, [0, -RAIL.height / 2, 0]), b = railLocalToWorld(frame, [RAIL.length, -RAIL.height / 2, 0])
      add(svg('line', { x1: X(a[0]), y1: Y(a[1]), x2: X(b[0]), y2: Y(b[1]), class: 's2d-rail' }))
      legendItems.push({ cls: 's2d-rail-sw', text: t.rail })
      // marks: yellow flags above the rail, staggered so neighbouring labels never overlap
      const sorted = [...st.marks].sort((p, q) => p.s_m - q.s_m)
      sorted.forEach((m, i) => {
        const p = railLocalToWorld(frame, [railLocalX_cm(m.s_m), 0, 0])
        const txt = markLabel(m.s_m)
        const row = i % 2
        const tw = (txt.length * 7 + 8) * kPx, th = 17 * kPx
        const yTop = Y(p[1]) - 9 * kPx - row * (th + 5 * kPx)
        add(svg('line', { x1: X(p[0]), y1: Y(p[1]), x2: X(p[0]), y2: yTop, class: 's2d-mark' }))
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
        legendItems.push({ cls: 's2d-level', text: t.level })
      }
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
    const traj = app.runTrajectory(runId)
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
      ball.style.display = status.ball === null && !st.items.marble && !st.items.pingPong ? 'none' : ''
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

  function labels(): void {
    const t = T()
    g.setAttribute('aria-label', t.aria)
    note.textContent = t.scaleNote
  }
  labels()
  return {
    update() {
      const now = ctx.now()
      app.tick(now)
      if (app.getState().paper.bond && app.paperMarks(now).length !== lastMarks) w.touch()
      if (w.dirty()) { w.clear(); drawStatic(); ballKey = '' }
      drawBall()
    },
    relabel() { labels(); w.touch() },
    destroy() { ro.disconnect(); w.off(); offEv(); wrap.remove() },
  }
}

