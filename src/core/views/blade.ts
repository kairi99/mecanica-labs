// Close-up of a steel tape-measure blade (SVG). Pure drawing: the true length goes in, no reading is printed.
import { svg } from './dom.ts'

export const PX_BASE = 11
export const WIN_BEFORE_MM = 14
const WIN_AFTER_MM = 14

/**
 * Close-up of the blade where the measured edge (the underside of the rail, the cart front) meets it. mm ticks, 5 mm
 * ticks longer, numerals every cm. Pure drawing from the true length: no reading is printed.
 */
export function drawBlade(L_mm: number, zoom: number): SVGSVGElement {
  const px = PX_BASE * zoom
  const x0 = Math.floor(L_mm) - WIN_BEFORE_MM
  const X = (mm: number): number => (mm - x0) * px
  const width = (WIN_BEFORE_MM + WIN_AFTER_MM + 1) * px
  const H = 132
  const Y0 = 22 // top edge of the blade
  const g = svg('svg', { viewBox: `0 0 ${width} ${H}`, width, height: H, class: 'blade', role: 'img', preserveAspectRatio: 'xMinYMid meet' })
  g.append(svg('rect', { x: 0, y: Y0, width, height: 86, class: 'bl-blade' }))
  // graduations hang down from the blade's top edge; numerals in cm every 10 mm
  for (let m = x0; m <= x0 + WIN_BEFORE_MM + WIN_AFTER_MM + 1; m++) {
    if (m < 0) continue
    const len = m % 10 === 0 ? 38 : m % 5 === 0 ? 26 : 16
    g.append(svg('line', { x1: X(m), y1: Y0, x2: X(m), y2: Y0 + len, class: m % 10 === 0 ? 'bl-tick bl-tick-cm' : 'bl-tick' }))
    if (m % 10 === 0) g.append(svg('text', { x: X(m), y: Y0 + 64, class: 'bl-num', 'text-anchor': 'middle' }, String(m / 10)))
  }
  g.append(svg('text', { x: width - 8, y: Y0 + 80, class: 'bl-num bl-num-small', 'text-anchor': 'end' }, 'cm'))
  // the object: everything beyond the measured edge, drawn over the blade's upper strip
  g.append(svg('rect', { x: X(L_mm), y: 0, width: Math.max(0, width - X(L_mm)), height: Y0, class: 'bl-object' }))
  g.append(svg('line', { x1: X(L_mm), y1: 0, x2: X(L_mm), y2: Y0, class: 'bl-edge' }))
  return g
}
