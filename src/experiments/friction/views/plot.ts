// Tiny SVG plot used by the record and analysis panels (lines, points, horizontal guides). No physics: it draws the numbers it is given.
import { svg } from '../../../core/views/dom.ts'
import { formatNum } from '../../../core/views/numfmt.ts'
import type { Lang } from '../../../core/i18n.ts'

export interface PlotSeries { pts: readonly [number, number][]; kind: 'line' | 'points'; cls: string; bars?: readonly number[] }
export interface PlotHLine { y: number; cls: string; label: string }
export interface PlotOpts {
  aria: string
  xLabel: string
  yLabel: string
  xMax: number
  yMax: number
  series: readonly PlotSeries[]
  hlines?: readonly PlotHLine[]
  lang: Lang
}

const W = 360, H = 220, L = 46, R = 12, T = 12, B = 38

/** Round an axis maximum up to a 1-2-5 step and return the ticks. */
export function niceTicks(max: number, n = 5): { max: number; ticks: number[] } {
  const raw = max / n
  const p = 10 ** Math.floor(Math.log10(raw || 1))
  const f = raw / p
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p
  const top = Math.ceil(max / step - 1e-9) * step
  const ticks: number[] = []
  for (let v = 0; v <= top + 1e-9; v += step) ticks.push(Math.round(v / step) * step)
  return { max: top, ticks }
}

export function linePlot(o: PlotOpts): SVGElement {
  const xs = niceTicks(o.xMax), ys = niceTicks(o.yMax)
  const X = (x: number): number => L + (x / xs.max) * (W - L - R)
  const Y = (y: number): number => H - B - (y / ys.max) * (H - T - B)
  const root = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'plot', role: 'img', 'aria-label': o.aria, preserveAspectRatio: 'xMidYMid meet' })
  const dec = (v: number): string => formatNum(v, v % 1 === 0 ? 0 : v * 10 % 1 === 0 || ys.max >= 1 ? 1 : 2, o.lang)
  for (const t of ys.ticks) {
    root.append(svg('line', { class: 'plot-grid', x1: L, x2: W - R, y1: Y(t), y2: Y(t) }), svg('text', { class: 'plot-num', x: L - 5, y: Y(t) + 3, 'text-anchor': 'end' }, dec(t)))
  }
  for (const t of xs.ticks) root.append(svg('text', { class: 'plot-num', x: X(t), y: H - B + 14, 'text-anchor': 'middle' }, formatNum(t, t % 1 === 0 ? 0 : 1, o.lang)))
  root.append(svg('line', { class: 'plot-axis', x1: L, x2: W - R, y1: H - B, y2: H - B }), svg('line', { class: 'plot-axis', x1: L, x2: L, y1: T, y2: H - B }))
  root.append(svg('text', { class: 'plot-lab', x: (L + W - R) / 2, y: H - 6, 'text-anchor': 'middle' }, o.xLabel), svg('text', { class: 'plot-lab', x: 12, y: (T + H - B) / 2, 'text-anchor': 'middle', transform: `rotate(-90 12 ${(T + H - B) / 2})` }, o.yLabel))
  for (const h of o.hlines ?? []) {
    root.append(svg('line', { class: `plot-hline ${h.cls}`, x1: L, x2: W - R, y1: Y(h.y), y2: Y(h.y) }), svg('text', { class: `plot-hlab ${h.cls}`, x: W - R - 2, y: Y(h.y) - 3, 'text-anchor': 'end' }, h.label))
  }
  for (const s of o.series) {
    if (s.kind === 'line') root.append(svg('polyline', { class: `plot-line ${s.cls}`, fill: 'none', points: s.pts.map(([x, y]) => `${X(x).toFixed(1)},${Y(y).toFixed(1)}`).join(' ') }))
    else s.pts.forEach(([x, y], i) => {
      const e = s.bars?.[i] ?? 0
      if (e > 0) root.append(svg('line', { class: `plot-err ${s.cls}`, x1: X(x), x2: X(x), y1: Y(y + e), y2: Y(Math.max(0, y - e)) }))
      root.append(svg('circle', { class: `plot-pt ${s.cls}`, cx: X(x), cy: Y(y), r: 3.5 }))
    })
  }
  return root
}
