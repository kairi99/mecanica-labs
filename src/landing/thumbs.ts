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

function pulleyDrawing(): SVGElement[] {
  // a level rail on a stand, a cart on it tied over a pulley at the end to a hanging weight above the floor
  const ty = 46, x0 = 30, x1 = 232, fy = 108
  return [
    svg('line', { x1: 0, y1: fy, x2: W, y2: fy, class: 'th-ground' }),
    svg('rect', { x: x0 - 3, y: ty + 4, width: 5, height: fy - ty - 4, class: 'th-leg' }),
    svg('rect', { x: x0 - 20, y: fy - 4, width: 40, height: 4, rx: 2, class: 'th-leg' }),
    svg('line', { x1: x0, y1: ty, x2: x1, y2: ty, class: 'th-rail' }),
    svg('rect', { x: 92, y: ty - 18, width: 44, height: 13, rx: 4, class: 'th-body' }),
    svg('rect', { x: 128, y: ty - 18, width: 8, height: 13, rx: 3, class: 'th-accent' }),
    svg('circle', { cx: 104, cy: ty - 5, r: 4, class: 'th-wheel' }),
    svg('circle', { cx: 124, cy: ty - 5, r: 4, class: 'th-wheel' }),
    svg('circle', { cx: x1 + 6, cy: ty - 6, r: 9, class: 'th-body' }),
    svg('line', { x1: 136, y1: ty - 12, x2: x1 + 6, y2: ty - 15, class: 'th-line' }),
    svg('line', { x1: x1 + 15, y1: ty - 6, x2: x1 + 15, y2: 84, class: 'th-line' }),
    svg('rect', { x: x1 + 7, y: 84, width: 16, height: 18, rx: 3, class: 'th-accent' }),
  ]
}

export function thumb(kind: ExperimentManifest['thumb']): SVGElement {
  const s = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'lp-thumb', 'aria-hidden': 'true', focusable: 'false' })
  s.append(svg('rect', { width: W, height: H, class: 'th-bg' }), ...(kind === 'incline' ? inclineDrawing() : kind === 'pulley' ? pulleyDrawing() : arcDrawing()))
  return s
}
