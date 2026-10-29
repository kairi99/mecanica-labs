// 2D fallback of the stage (SVG): the block pulled over the paper by the spring scale (top) and the raised rail with the bar and the stand
// (bottom). Used when WebGL2 is missing, when the 3D view fails, and when the student picks 2D. It only draws the apparatus state.
// It is also the 2D stage of the drag-and-drop setup: loose materials lie in the bench band under the table line, every part carries
// `data-part`, and the drop zones are rectangles of this drawing (the controller and the Apparatus calls are shared with the 3D stage).
import { COURSE_m, RAIL_LENGTH_m, RAIL_SUPPORT_DIST_m, inclineAngle_rad } from '../physics/index.ts'
import { BAR_ITEM, START_FRONT_m, type BarId, type ItemId } from '../apparatus/index.ts'
import { el, svg, watch } from '../../../core/views/dom.ts'
import type { MountView, View } from './view.ts'
import { strings } from './strings/side2d.ts'
import { strings as ddStrings } from './strings/dragdrop.ts'
import { createDragDrop, type StageAdapter } from './dragdrop/controller.ts'
import type { Zone, ZoneId } from './dragdrop/snap.ts'

const VBW = 400, VBH = 330
const PX_PER_M_TOP = 700, X_BLOCK0 = 60, Y_TABLE = 110
const RAIL_PX = 300, X_LOW = 40, Y_LOW = 300
/** Loose layout (viewbox units): the bench band under the table line. */
const BENCH_Y = 120, BENCH_H = 40
const LOOSE2D = {
  paper: { x: 20, y: BENCH_Y + 14, w: 78, h: 8 }, block: { x: 118, y: BENCH_Y + 8 },
  scale1N: { x: 176, y: BENCH_Y + 8, w: 60, h: 8 }, scale2N: { x: 176, y: BENCH_Y + 22, w: 60, h: 8 },
  masses: { x0: 290, y: BENCH_Y + 16, w: 24, h: 8, dx: 30 },
  bars: { wood: 20, aluminium: 100, iron: 180 } as Record<BarId, number>, barsY: BENCH_Y + BENCH_H + 24, barLen: 56,
} as const
const BLOCK2D = { w: 44, h: 26 }
const PART_OF_BAR: Record<BarId, ItemId> = { wood: 'woodBar', aluminium: 'alBar', iron: 'ironBar' }
type Rect = { x: number; y: number; w: number; h: number }

export const mountSide2d: MountView = (root, ctx): View => {
  const app = ctx.apparatus
  const T = () => strings[ctx.lang()]
  const w = watch(app)
  const wrap = el('div', 'side2d')
  const g = svg('svg', { class: 's2d', role: 'img', viewBox: `0 0 ${VBW} ${VBH}`, preserveAspectRatio: 'xMidYMid meet' })
  const stat = svg('g'), dyn = svg('g'), zoneLayer = svg('g', { class: 's2d-zones' })
  g.append(stat, dyn, zoneLayer)
  const legend = el('p', 'stage-note')
  const note = el('p', 'stage-note')
  wrap.append(g, legend, note)
  wrap.classList.add('has-tray')
  root.append(wrap)
  /** Mark an element as a movable part (drag it to another spot or onto the tray). */
  const tagPart = <E extends SVGElement>(e: E, id: ItemId): E => { e.dataset.part = id; e.classList.add('s2d-part'); return e }

  function drawStatic(): void {
    stat.replaceChildren()
    stat.append(
      svg('rect', { class: 's2d-table', x: 0, y: Y_TABLE, width: VBW, height: 8 }),
      svg('rect', { class: 's2d-bench', x: 0, y: BENCH_Y - 2, width: VBW, height: BENCH_H + 72 }),
      svg('line', { class: 's2d-floor', x1: 0, x2: VBW, y1: Y_LOW + 4, y2: Y_LOW + 4 }),
    )
    stat.append(svg('text', { class: 's2d-label sm', x: VBW - 6, y: Y_TABLE - 6, 'text-anchor': 'end' }, T().table), svg('text', { class: 's2d-label', x: 6, y: Y_LOW + 20 }, T().rail))
    legend.textContent = `${T().legendBlock} ${T().legendRail}`
    note.textContent = T().note
    g.setAttribute('aria-label', T().aria)
  }
  drawStatic()

  // rectangles of the drop zones in this drawing (set by frame(), read by the adapter)
  const zoneRect: Partial<Record<ZoneId, Rect>> = {}
  let lifted: ItemId | null = null

  function frame(): void {
    dyn.replaceChildren()
    const s = app.getState()
    const st = app.pullStatus(ctx.now())
    const L = T().looseLabels
    const add = (...e: SVGElement[]): void => { dyn.append(...e) }
    const text = (x: number, y: number, t: string): SVGElement => svg('text', { class: 's2d-label sm', x, y }, t)
    // --- paper
    if (s.items.paper) {
      if (s.paper !== 'none') add(tagPart(svg('rect', { class: 's2d-paper', x: X_BLOCK0 - 20, y: Y_TABLE - 5, width: 297 * 0.7 + 20, height: 5 }), 'paper'))
      else {
        const p = LOOSE2D.paper
        add(tagPart(svg('rect', { class: 's2d-paper', x: p.x, y: p.y, width: p.w, height: p.h }), 'paper'), text(p.x, p.y + p.h + 12, L.paper))
      }
    }
    // --- block, masses and scale (top)
    const xb = X_BLOCK0 + st.x_block_m * PX_PER_M_TOP, xp = X_BLOCK0 + 50 + st.x_pull_m * PX_PER_M_TOP
    const bw = BLOCK2D.w, bh = BLOCK2D.h
    const placed = s.face !== null
    const bx = placed ? xb : LOOSE2D.block.x
    const by = placed ? Y_TABLE - bh - 2 : LOOSE2D.block.y
    if (s.items.block) {
      add(tagPart(svg('rect', { class: `s2d-block ${s.face === 'sandpaper' ? 'sand' : 'cloth'}`, x: bx, y: by, width: bw, height: bh, rx: 3 }), 'block'))
      if (!placed) add(text(bx, by + bh + 12, L.block))
    }
    if (s.items.masses50) {
      for (let i = 0; i < s.addedMasses; i++) add(tagPart(svg('rect', { class: 's2d-mass', x: bx + 6, y: by - (i + 1) * 9, width: bw - 12, height: 8, rx: 2 }), 'masses50'))
      const free = 3 - s.addedMasses
      const m = LOOSE2D.masses
      for (let k = 0; k < free; k++) add(tagPart(svg('rect', { class: 's2d-mass', x: m.x0 + k * m.dx, y: m.y, width: m.w, height: m.h, rx: 2 }), 'masses50'))
      if (free > 0) add(text(m.x0, m.y + m.h + 12, L.masses50))
    }
    for (const id of ['1N', '2N'] as const) {
      const part: ItemId = id === '1N' ? 'scale1N' : 'scale2N'
      if (!s.items[part]) continue
      if (s.scale === id && s.items.block) {
        add(tagPart(svg('rect', { class: 's2d-scale', x: bx + bw, y: by + bh / 2 - 4, width: Math.max(10, xp - bx - bw), height: 8, rx: 2 }), part))
        add(svg('line', { class: 's2d-spring', x1: bx + bw, x2: xp, y1: by + bh / 2, y2: by + bh / 2 }), tagPart(svg('circle', { class: 's2d-hand', cx: xp, cy: by + bh / 2, r: 7 }), part))
        add(text(xp + 10, by - 12, T().hand))
      } else {
        const p = id === '1N' ? LOOSE2D.scale1N : LOOSE2D.scale2N
        add(tagPart(svg('rect', { class: 's2d-scale', x: p.x, y: p.y, width: p.w, height: p.h, rx: 2 }), part), text(p.x + p.w + 4, p.y + 8, L[id === '1N' ? 'scale1N' : 'scale2N']))
      }
    }
    zoneRect.paper = { x: X_BLOCK0 - 20, y: Y_TABLE - 30, w: 297 * 0.7 + 20, h: 36 }
    zoneRect.faceCloth = { x: X_BLOCK0 - 10, y: Y_TABLE - 52, w: 100, h: 56 }
    zoneRect.faceSand = { x: X_BLOCK0 + 95, y: Y_TABLE - 52, w: 100, h: 56 }
    zoneRect.hook = { x: bx + bw - 4, y: by + bh / 2 - 22, w: 60, h: 44 }
    zoneRect.masses = { x: bx - 6, y: by - 50, w: bw + 12, h: 56 }
    // --- rail (bottom)
    const inc = app.inclineStatus(ctx.now())
    const slope = inclineAngle_rad(Math.min(inc.h_m, RAIL_SUPPORT_DIST_m))
    const ux = Math.cos(slope), uy = -Math.sin(slope)
    const P = (s_m: number): [number, number] => [X_LOW + ux * (s_m / RAIL_LENGTH_m) * RAIL_PX, Y_LOW + uy * (s_m / RAIL_LENGTH_m) * RAIL_PX]
    const [hx, hy] = P(RAIL_LENGTH_m)
    add(svg('line', { class: 's2d-rail', x1: X_LOW, y1: Y_LOW, x2: hx, y2: hy }))
    const [cx, cy] = P(RAIL_SUPPORT_DIST_m)
    add(svg('line', { class: 's2d-stand', x1: cx, y1: cy, x2: cx, y2: Y_LOW }), svg('line', { class: 's2d-base', x1: cx - 18, y1: Y_LOW, x2: cx + 18, y2: Y_LOW }))
    if (s.course_mark) {
      for (const m of [START_FRONT_m, START_FRONT_m - COURSE_m]) {
        const [mx, my] = P(m)
        add(svg('line', { class: 's2d-mark', x1: mx - uy * 8, y1: my + ux * 8, x2: mx + uy * 8, y2: my - ux * 8 }))
      }
    }
    const [sx, sy] = P(START_FRONT_m - 0.05)
    zoneRect.barStart = { x: sx - 34, y: sy - 34, w: 68, h: 44 }
    for (const k of ['wood', 'aluminium', 'iron'] as const) {
      const part = PART_OF_BAR[k]
      if (!s.items[BAR_ITEM[k]]) continue
      if (s.bar === k) {
        const front = START_FRONT_m - inc.s_m
        const [fx, fy] = P(front), [rx, ry] = P(front + 0.1)
        add(tagPart(svg('line', { class: `s2d-bar ${k}`, x1: fx, y1: fy - 4, x2: rx, y2: ry - 4 }), part))
      } else {
        const x = LOOSE2D.bars[k]
        add(tagPart(svg('line', { class: `s2d-bar ${k}`, x1: x, y1: LOOSE2D.barsY, x2: x + LOOSE2D.barLen, y2: LOOSE2D.barsY }), part), text(x, LOOSE2D.barsY + 16, L[part as keyof typeof L]))
      }
    }
    if (lifted) for (const n of dyn.querySelectorAll(`[data-part="${lifted}"]`)) n.setAttribute('visibility', 'hidden')
  }

  // ---- drag-and-drop setup (same controller as the 3D stage; this is the 2D stage side) -------------------------------------
  const toView = (clientX: number, clientY: number): { x: number; y: number } | null => {
    const r = g.getBoundingClientRect()
    if (r.width === 0 || r.height === 0 || clientX < r.left || clientX > r.right || clientY < r.top || clientY > r.bottom) return null
    return { x: ((clientX - r.left) / r.width) * VBW, y: ((clientY - r.top) / r.height) * VBH }
  }
  const inRect = (p: { x: number; y: number }, r: Rect): boolean => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h
  const dd = createDragDrop({ ctx, stage: wrap, mount: wrap })
  const adapter: StageAdapter = {
    probe(cx, cy) {
      const p = toView(cx, cy)
      if (!p) return null
      // a zone counts when the pointer is inside its rectangle of the drawing; the table counts anywhere on the drawing
      return (zone) => {
        if (zone.id === 'table') return { x_cm: zone.cx, z_cm: null }
        const r = zoneRect[zone.id as ZoneId]
        return r && inRect(p, r) ? { x_cm: zone.cx, z_cm: null } : null
      }
    },
    showZones(zones: readonly Zone[], active: string | null) {
      zoneLayer.replaceChildren()
      for (const z of zones) {
        const on = active === z.id
        if (z.id === 'table') {
          zoneLayer.append(svg('rect', { x: 4, y: BENCH_Y - 2, width: VBW - 8, height: BENCH_H + 70, rx: 6, class: `s2d-zone s2d-zone-table${on ? ' on' : ''}` }))
          continue
        }
        const r = zoneRect[z.id]
        if (!r) continue
        zoneLayer.append(svg('rect', { x: r.x, y: r.y, width: r.w, height: r.h, rx: 8, class: `s2d-zone${z.ready ? ' ready' : ' early'}${on ? ' on' : ''}` }))
        zoneLayer.append(svg('text', { x: r.x + r.w / 2, y: r.y - 4, class: 's2d-label s2d-zone-text', 'text-anchor': 'middle' }, ddStrings[ctx.lang()].zones[z.id]))
      }
    },
    showPreview() { /* the floating chip of the controller follows the pointer */ },
    hidePreview() { /* nothing to hide */ },
    pickBenchPart(cx, cy) {
      const hit = document.elementFromPoint(cx, cy)?.closest<SVGElement>('[data-part]')
      return hit && g.contains(hit) ? (hit.dataset.part as ItemId) : null
    },
    lift(part) {
      lifted = part
      frame()
    },
    lockCamera() { /* the side view has no camera */ },
    refuse() { /* the shell toast shows the reason */ },
    placed() { /* nothing to remember */ },
  }
  dd.setAdapter(adapter)
  frame()

  return {
    update() { dd.update(); if (w.dirty()) { w.clear(); drawStatic() } frame() },
    relabel() { w.touch() },
    destroy() { dd.destroy(); w.off(); wrap.remove() },
  }
}

