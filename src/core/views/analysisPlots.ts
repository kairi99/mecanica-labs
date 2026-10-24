// uPlot charts of the analysis panel (tasks 6 to 10). Drawing only: every number arrives ready from the experiment's analysis layer.
// Colours come from the design tokens (resolved at build time so the light/dark theme is followed).
import uPlot from 'uplot'
import 'uplot/dist/uPlot.min.css'

export interface Palette { text: string; grid: string; pos: string; vel: string; res: string; accent: string; font: string }
export interface PlotHandle { destroy(): void; resize(width_px: number): void }

function resolveColor(token: string): string {
  const probe = document.createElement('span')
  probe.style.color = `var(${token})`
  probe.style.display = 'none'
  document.body.append(probe)
  const c = getComputedStyle(probe).color
  probe.remove()
  return c
}
export function readPalette(): Palette {
  const font = getComputedStyle(document.body).fontFamily || 'system-ui, sans-serif'
  return {
    text: resolveColor('--label-2'), grid: resolveColor('--separator'),
    pos: resolveColor('--phys-a'), vel: resolveColor('--phys-b'), res: resolveColor('--phys-c'), accent: resolveColor('--accent'), font,
  }
}
/** rgb()/rgba() text with a new alpha. */
export function withAlpha(color: string, alpha: number): string {
  const m = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/.exec(color)
  return m ? `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${alpha})` : color
}

interface Row { t: number; ys: Array<number | null> }
function toData(rows: Row[], nSeries: number): uPlot.AlignedData {
  const sorted = [...rows].sort((a, b) => a.t - b.t)
  const out: Array<Array<number | null>> = [sorted.map((r) => r.t)]
  for (let s = 0; s < nSeries; s++) out.push(sorted.map((r) => r.ys[s] ?? null))
  return out as uPlot.AlignedData
}
const height = (w: number): number => (w < 480 ? 240 : 300)

function axes(p: Palette, xLabel: string, yLabel: string): uPlot.Axis[] {
  const common = { stroke: p.text, grid: { stroke: p.grid, width: 1 }, ticks: { stroke: p.grid, width: 1 }, font: `12px ${p.font}`, labelFont: `12px ${p.font}`, labelSize: 18 }
  return [{ ...common, label: xLabel, size: 36 }, { ...common, label: yLabel, size: 56 }]
}
function make(host: HTMLElement, opts: (w: number) => uPlot.Options, data: uPlot.AlignedData): PlotHandle | null {
  const w = Math.floor(host.clientWidth)
  if (w < 120) return null
  host.replaceChildren()
  const u = new uPlot(opts(w), data, host)
  return { destroy: () => u.destroy(), resize: (nw) => { if (nw >= 120) u.setSize({ width: nw, height: height(nw) }) } }
}
const dpr = (): number => (typeof devicePixelRatio === 'number' ? devicePixelRatio : 1)

export interface XtInput {
  readings: Array<{ t: number; x: number }>
  means: Array<{ t: number; x: number; u: number }>
  curve: Array<{ t: number; x: number }>
  tangent: Array<{ t: number; x: number }> | null
}
export function plotXt(host: HTMLElement, d: XtInput, p: Palette, labels: { t: string; x: string }): PlotHandle | null {
  const rows: Row[] = [
    ...d.readings.map((r) => ({ t: r.t, ys: [r.x, null, null, null] })),
    ...d.means.map((r) => ({ t: r.t, ys: [null, r.x, null, null] })),
    ...d.curve.map((r) => ({ t: r.t, ys: [null, null, r.x, null] })),
    ...(d.tangent ?? []).map((r) => ({ t: r.t, ys: [null, null, null, r.x] })),
  ]
  const drawBars = (u: uPlot): void => {
    const c = u.ctx, k = dpr()
    c.save()
    c.strokeStyle = p.pos; c.fillStyle = p.pos; c.lineWidth = 1.5 * k
    for (const m of d.means) {
      const y = u.valToPos(m.x, 'y', true), x0 = u.valToPos(m.t - m.u, 'x', true), x1 = u.valToPos(m.t + m.u, 'x', true), xc = u.valToPos(m.t, 'x', true)
      c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.moveTo(x0, y - 4 * k); c.lineTo(x0, y + 4 * k); c.moveTo(x1, y - 4 * k); c.lineTo(x1, y + 4 * k); c.stroke()
      c.fillRect(xc - 4 * k, y - 4 * k, 8 * k, 8 * k)
    }
    c.restore()
  }
  return make(host, (w) => ({
    width: w, height: height(w), legend: { show: false }, cursor: { drag: { x: false, y: false } },
    scales: { x: { time: false, range: (_u, _min, max) => [0, max * 1.05] }, y: { range: (_u, _min, max) => [0, max * 1.05] } },
    axes: axes(p, labels.t, labels.x),
    series: [
      {},
      { paths: () => null, points: { show: true, size: 5, stroke: p.pos, fill: withAlpha(p.pos, 0.25), width: 1 } },
      { paths: () => null, points: { show: false } },
      { stroke: p.pos, width: 2, spanGaps: true, points: { show: false } },
      { stroke: p.accent, width: 2, dash: [6, 4], spanGaps: true, points: { show: false } },
    ],
    hooks: { draw: [drawBars] },
  }), toData(rows, 4))
}

export interface VtInput { curve: Array<{ t: number; v: number; sigma: number }> }
export function plotVt(host: HTMLElement, d: VtInput, p: Palette, labels: { t: string; v: string }): PlotHandle | null {
  const rows: Row[] = d.curve.map((r) => ({ t: r.t, ys: [r.v, r.v + r.sigma, r.v - r.sigma] }))
  return make(host, (w) => ({
    width: w, height: height(w), legend: { show: false }, cursor: { drag: { x: false, y: false } },
    scales: { x: { time: false, range: (_u, _min, max) => [0, max] } },
    axes: axes(p, labels.t, labels.v),
    series: [
      {},
      { stroke: p.vel, width: 2, points: { show: false } },
      { stroke: 'transparent', width: 0, points: { show: false } },
      { stroke: 'transparent', width: 0, points: { show: false } },
    ],
    bands: [{ series: [2, 3], fill: withAlpha(p.vel, 0.22) }],
  }), toData(rows, 3))
}

export interface ResInput { points: Array<{ t: number; r_mm: number; sigma_mm: number }>; tMax: number }
export function plotResiduals(host: HTMLElement, d: ResInput, p: Palette, labels: { t: string; r: string }): PlotHandle | null {
  const rows: Row[] = [
    ...d.points.map((r) => ({ t: r.t, ys: [r.r_mm, null] })),
    { t: 0, ys: [null, 0] }, { t: d.tMax, ys: [null, 0] },
  ]
  const bars = (u: uPlot): void => {
    const c = u.ctx, k = dpr()
    c.save()
    c.strokeStyle = p.res; c.lineWidth = 1.5 * k
    for (const m of d.points) {
      const x = u.valToPos(m.t, 'x', true), y0 = u.valToPos(m.r_mm - m.sigma_mm, 'y', true), y1 = u.valToPos(m.r_mm + m.sigma_mm, 'y', true)
      c.beginPath(); c.moveTo(x, y0); c.lineTo(x, y1); c.moveTo(x - 4 * k, y0); c.lineTo(x + 4 * k, y0); c.moveTo(x - 4 * k, y1); c.lineTo(x + 4 * k, y1); c.stroke()
    }
    c.restore()
  }
  const span = Math.max(1, ...d.points.map((q) => Math.abs(q.r_mm) + q.sigma_mm))
  return make(host, (w) => ({
    width: w, height: height(w), legend: { show: false }, cursor: { drag: { x: false, y: false } },
    scales: { x: { time: false, range: (_u, _min, max) => [0, max * 1.05] }, y: { range: () => [-span * 1.1, span * 1.1] } },
    axes: axes(p, labels.t, labels.r),
    series: [
      {},
      { paths: () => null, points: { show: true, size: 8, stroke: p.res, fill: p.res, width: 1 } },
      { stroke: p.text, width: 1.5, dash: [6, 4], spanGaps: true, points: { show: false } },
    ],
    hooks: { draw: [bars] },
  }), toData(rows, 2))
}

export interface TrialBarsInput {
  /** One entry per series (for example one per ball); `points[i]` is trial i + 1 (null: no data). */
  series: Array<{ points: Array<{ y: number; u: number } | null>; shape: 'circle' | 'square' }>
  /** Optional horizontal reference (an expected value) with its uncertainty band. */
  ref?: { y: number; u: number } | null
}
/** Values with uncertainty bars against a trial number (1..n); series are offset a little and use different marker shapes. */
export function plotTrialBars(host: HTMLElement, d: TrialBarsInput, p: Palette, labels: { x: string; y: string }): PlotHandle | null {
  const n = Math.max(1, ...d.series.map((s) => s.points.length))
  const xs = Array.from({ length: n }, (_, i) => i + 1)
  const all = d.series.flatMap((s) => s.points.filter((q): q is { y: number; u: number } => q !== null))
  const top = Math.max(1e-9, ...all.map((q) => q.y + q.u), d.ref ? d.ref.y + d.ref.u : 0)
  const colors = [p.pos, p.vel]
  const draw = (u: uPlot): void => {
    const c = u.ctx, k = dpr()
    c.save()
    if (d.ref) {
      const y0 = u.valToPos(d.ref.y - d.ref.u, 'y', true), y1 = u.valToPos(d.ref.y + d.ref.u, 'y', true), yc = u.valToPos(d.ref.y, 'y', true)
      const xa = u.valToPos(0.5, 'x', true), xb = u.valToPos(n + 0.5, 'x', true)
      c.fillStyle = withAlpha(p.accent, 0.18); c.fillRect(xa, y1, xb - xa, y0 - y1)
      c.strokeStyle = p.accent; c.lineWidth = 2 * k; c.setLineDash([6 * k, 4 * k]); c.beginPath(); c.moveTo(xa, yc); c.lineTo(xb, yc); c.stroke(); c.setLineDash([])
    }
    d.series.forEach((s, si) => {
      const off = d.series.length > 1 ? (si - (d.series.length - 1) / 2) * 0.16 : 0
      c.strokeStyle = colors[si % colors.length]!; c.fillStyle = colors[si % colors.length]!; c.lineWidth = 1.5 * k
      s.points.forEach((q, i) => {
        if (!q) return
        const x = u.valToPos(i + 1 + off, 'x', true), y = u.valToPos(q.y, 'y', true), ya = u.valToPos(q.y - q.u, 'y', true), yb = u.valToPos(q.y + q.u, 'y', true)
        c.beginPath(); c.moveTo(x, ya); c.lineTo(x, yb); c.moveTo(x - 4 * k, ya); c.lineTo(x + 4 * k, ya); c.moveTo(x - 4 * k, yb); c.lineTo(x + 4 * k, yb); c.stroke()
        if (s.shape === 'circle') { c.beginPath(); c.arc(x, y, 4.5 * k, 0, Math.PI * 2); c.fill() } else c.fillRect(x - 4 * k, y - 4 * k, 8 * k, 8 * k)
      })
    })
    c.restore()
  }
  return make(host, (w) => ({
    width: w, height: height(w), legend: { show: false }, cursor: { drag: { x: false, y: false } },
    scales: { x: { time: false, range: () => [0.5, n + 0.5] }, y: { range: () => [0, top * 1.1] } },
    axes: [
      { ...axes(p, labels.x, labels.y)[0]!, splits: () => xs, values: (_u, v) => v.map((q) => String(q)) },
      axes(p, labels.x, labels.y)[1]!,
    ],
    series: [{}, { paths: () => null, points: { show: false } }],
    hooks: { draw: [draw] },
  }), [xs, xs.map(() => null)] as unknown as uPlot.AlignedData)
}
