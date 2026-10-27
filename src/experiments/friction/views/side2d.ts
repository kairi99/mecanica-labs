// 2D fallback of the stage (SVG): the block pulled over the paper by the spring scale (top) and the raised rail with the bar and the stand
// (bottom). Used when WebGL2 is missing, when the 3D view fails, and when the student picks 2D. It only draws the apparatus state.
import { COURSE_m, RAIL_LENGTH_m, RAIL_SUPPORT_DIST_m, inclineAngle_rad } from '../physics/index.ts'
import { START_FRONT_m } from '../apparatus/index.ts'
import { el, svg, watch } from '../../../core/views/dom.ts'
import type { MountView, View } from './view.ts'
import { strings } from './strings/side2d.ts'

const VBW = 400, VBH = 330
const PX_PER_M_TOP = 700, X_BLOCK0 = 60, Y_TABLE = 110
const RAIL_PX = 300, X_LOW = 40, Y_LOW = 300

export const mountSide2d: MountView = (root, ctx): View => {
  const app = ctx.apparatus
  const T = () => strings[ctx.lang()]
  const w = watch(app)
  const wrap = el('div', 'side2d')
  const g = svg('svg', { class: 's2d', role: 'img', viewBox: `0 0 ${VBW} ${VBH}`, preserveAspectRatio: 'xMidYMid meet' })
  const stat = svg('g'), dyn = svg('g')
  g.append(stat, dyn)
  const legend = el('p', 'stage-note')
  const note = el('p', 'stage-note')
  wrap.append(g, legend, note)
  root.append(wrap)

  function drawStatic(): void {
    stat.replaceChildren()
    stat.append(
      svg('rect', { class: 's2d-table', x: 0, y: Y_TABLE, width: VBW, height: 8 }),
      svg('rect', { class: 's2d-paper', x: X_BLOCK0 - 20, y: Y_TABLE - 2, width: 297 * 0.7 + 20, height: 2 }),
      svg('line', { class: 's2d-floor', x1: 0, x2: VBW, y1: Y_LOW + 4, y2: Y_LOW + 4 }),
    )
    const t = svg('text', { class: 's2d-label', x: 6, y: Y_TABLE + 22 }, T().table)
    const r = svg('text', { class: 's2d-label', x: 6, y: Y_LOW + 20 }, T().rail)
    stat.append(t, r)
    legend.textContent = `${T().legendBlock} ${T().legendRail}`
    note.textContent = T().note
    g.setAttribute('aria-label', T().aria)
  }
  drawStatic()

  function frame(): void {
    dyn.replaceChildren()
    const s = app.getState()
    const st = app.pullStatus(ctx.now())
    // --- block and scale (top)
    const xb = X_BLOCK0 + st.x_block_m * PX_PER_M_TOP, xp = X_BLOCK0 + 50 + st.x_pull_m * PX_PER_M_TOP
    const bw = 44, bh = 26
    const masses = s.addedMasses
    dyn.append(svg('rect', { class: `s2d-block ${s.face === 'sandpaper' ? 'sand' : 'cloth'}`, x: xb, y: Y_TABLE - bh - 2, width: bw, height: bh, rx: 3 }))
    for (let i = 0; i < masses; i++) dyn.append(svg('rect', { class: 's2d-mass', x: xb + 6, y: Y_TABLE - bh - 2 - (i + 1) * 9, width: bw - 12, height: 8, rx: 2 }))
    dyn.append(svg('line', { class: 's2d-spring', x1: xb + bw, x2: xp, y1: Y_TABLE - 16, y2: Y_TABLE - 16 }), svg('circle', { class: 's2d-hand', cx: xp, cy: Y_TABLE - 16, r: 6 }))
    dyn.append(svg('text', { class: 's2d-label', x: xp + 10, y: Y_TABLE - 40 }, T().hand), svg('text', { class: 's2d-label', x: xb, y: Y_TABLE - bh - 12 - masses * 9 }, T().block))
    // --- rail (bottom)
    const inc = app.inclineStatus(ctx.now())
    const th = inc.theta_rad
    const slope = inclineAngle_rad(Math.min(inc.h_m, RAIL_SUPPORT_DIST_m))
    const ang = inc.phase === 'idle' ? slope : slope
    const ux = Math.cos(ang), uy = -Math.sin(ang)
    const P = (s_m: number): [number, number] => [X_LOW + ux * (s_m / RAIL_LENGTH_m) * RAIL_PX, Y_LOW + uy * (s_m / RAIL_LENGTH_m) * RAIL_PX]
    const [hx, hy] = P(RAIL_LENGTH_m)
    dyn.append(svg('line', { class: 's2d-rail', x1: X_LOW, y1: Y_LOW, x2: hx, y2: hy }))
    const [cx, cy] = P(RAIL_SUPPORT_DIST_m)
    dyn.append(svg('line', { class: 's2d-stand', x1: cx, y1: cy, x2: cx, y2: Y_LOW }), svg('line', { class: 's2d-base', x1: cx - 18, y1: Y_LOW, x2: cx + 18, y2: Y_LOW }))
    if (s.course_mark) {
      for (const m of [START_FRONT_m, START_FRONT_m - COURSE_m]) {
        const [mx, my] = P(m)
        dyn.append(svg('line', { class: 's2d-mark', x1: mx - uy * 8, y1: my + ux * 8 - 0, x2: mx + uy * 8, y2: my - ux * 8 }))
      }
    }
    if (s.bar) {
      const front = START_FRONT_m - inc.s_m
      const [fx, fy] = P(front), [rx, ry] = P(front + 0.1)
      dyn.append(svg('line', { class: `s2d-bar ${s.bar}`, x1: fx, y1: fy - 4, x2: rx, y2: ry - 4 }))
    }
    void th
  }
  return {
    update() { if (w.dirty()) { w.clear(); drawStatic() } frame() },
    relabel() { w.touch() },
    destroy() { w.off(); wrap.remove() },
  }
}
