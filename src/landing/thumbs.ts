// Landing card drawings, our own and tiny: inline SVG painted with the theme tokens, so they follow light and dark.
import { svg } from '../core/views/dom.ts'
import type { ExperimentManifest } from '../experiments/manifest.ts'

const W = 320, H = 120

function inclineDrawing(): SVGElement[] {
  // a rail on a stand tilted about 8 degrees (exaggerated), a cart on it, a few marks
  const x0 = 40, y0 = 48, x1 = 280, y1 = 86
  const ang = (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI
  const cx = 150, cy = y0 + ((cx - x0) / (x1 - x0)) * (y1 - y0)
  const marks: SVGElement[] = []
  for (let i = 0; i <= 8; i++) {
    const x = x0 + 20 + i * 27, y = y0 + ((x - x0) / (x1 - x0)) * (y1 - y0)
    marks.push(svg('line', { x1: x, y1: y + 5, x2: x, y2: y + 10, class: 'th-line' }))
  }
  return [
    svg('line', { x1: 0, y1: 104, x2: W, y2: 104, class: 'th-ground' }),
    svg('rect', { x: x0 - 4, y: y0 + 4, width: 5, height: 100 - y0, class: 'th-leg' }),
    svg('rect', { x: x0 - 22, y: 100, width: 44, height: 4, rx: 2, class: 'th-leg' }),
    svg('line', { x1: x0, y1: y0, x2: x1, y2: y1, class: 'th-rail' }),
    ...marks,
    svg('g', { transform: `translate(${cx} ${cy}) rotate(${ang})` },
      svg('rect', { x: -22, y: -17, width: 44, height: 13, rx: 4, class: 'th-body' }),
      svg('rect', { x: -22, y: -17, width: 8, height: 13, rx: 3, class: 'th-accent' }),
      svg('circle', { cx: -13, cy: -4, r: 4, class: 'th-wheel' }),
      svg('circle', { cx: 13, cy: -4, r: 4, class: 'th-wheel' })),
  ]
}

function arcDrawing(): SVGElement[] {
  // a table with its edge on the left half, a ball arc down to a sheet of paper on the floor
  const ex = 108, ty = 44, fy = 104
  const pts: string[] = []
  const x1 = 262, g = (fy - 8 - ty) / ((x1 - ex) * (x1 - ex))
  for (let x = ex; x <= x1; x += 6) pts.push(`${x},${(ty - 6 + g * (x - ex) * (x - ex)).toFixed(1)}`)
  return [
    svg('line', { x1: 0, y1: fy, x2: W, y2: fy, class: 'th-ground' }),
    svg('rect', { x: 12, y: ty, width: ex - 12, height: 6, rx: 2, class: 'th-leg' }),
    svg('rect', { x: ex - 16, y: ty + 6, width: 5, height: fy - ty - 6, class: 'th-leg' }),
    svg('line', { x1: 20, y1: ty - 22, x2: ex, y2: ty - 6, class: 'th-rail' }),
    svg('polyline', { points: pts.join(' '), class: 'th-dots', fill: 'none' }),
    svg('rect', { x: x1 - 26, y: fy - 3, width: 52, height: 3, class: 'th-paper' }),
    svg('circle', { cx: ex, cy: ty - 10, r: 5, class: 'th-accent' }),
    svg('circle', { cx: x1, cy: fy - 5, r: 3, class: 'th-accent' }),
  ]
}

function blockDrawing(): SVGElement[] {
  // a block on a surface pulled to the right by a spring scale (barrel, needle, hook) held by a hand ring
  const gy = 84
  return [
    svg('line', { x1: 0, y1: gy, x2: W, y2: gy, class: 'th-ground' }),
    svg('rect', { x: 44, y: gy - 30, width: 62, height: 30, rx: 4, class: 'th-body' }),
    svg('rect', { x: 44, y: gy - 6, width: 62, height: 6, rx: 2, class: 'th-paper' }),
    svg('line', { x1: 106, y1: gy - 15, x2: 150, y2: gy - 15, class: 'th-line' }),
    svg('rect', { x: 150, y: gy - 24, width: 92, height: 18, rx: 9, class: 'th-body' }),
    svg('line', { x1: 168, y1: gy - 24, x2: 168, y2: gy - 6, class: 'th-line' }),
    svg('line', { x1: 188, y1: gy - 24, x2: 188, y2: gy - 6, class: 'th-line' }),
    svg('line', { x1: 208, y1: gy - 24, x2: 208, y2: gy - 6, class: 'th-line' }),
    svg('line', { x1: 196, y1: gy - 28, x2: 196, y2: gy - 2, class: 'th-needle' }),
    svg('circle', { cx: 256, cy: gy - 15, r: 8, class: 'th-ring' }),
    svg('line', { x1: 244, y1: gy - 15, x2: 248, y2: gy - 15, class: 'th-line' }),
  ]
}

export function thumb(kind: ExperimentManifest['thumb']): SVGElement {
  const s = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'lp-thumb', 'aria-hidden': 'true', focusable: 'false' })
  s.append(svg('rect', { width: W, height: H, class: 'th-bg' }), ...(kind === 'incline' ? inclineDrawing() : kind === 'block' ? blockDrawing() : arcDrawing()))
  return s
}
