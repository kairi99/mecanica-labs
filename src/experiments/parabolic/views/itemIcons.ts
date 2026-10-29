// 24 px line icons, one per item (generic drawings, no brand marks). Shared by the inventory panel and the parts tray.
import type { ItemId } from '../apparatus/index.ts'
import { svg } from '../../../core/views/dom.ts'

const ICONS: Record<ItemId, string[]> = {
  rail: ['M3 15L21 9', 'M3 18L21 12'],
  rackStand: ['M9 3v18', 'M9 7h6M9 11h6', 'M5 21h8'],
  base: ['M3 17h18v4H3z', 'M12 17V9'],
  twoLeg: ['M12 4L6 20M12 4l6 16', 'M8.5 14h7'],
  screws: ['M12 3v13', 'M9 6h6M9 9h6M9 12h6', 'M10 16l2 5 2-5'],
  level: ['M3 9h18v6H3z', 'M10 12h4'],
  marble: ['M12 20a7 7 0 1 0 0-.1', 'M9 9a3.5 3.5 0 0 1 3-2'],
  pingPong: ['M12 21a8 8 0 1 0 0-.1', 'M7 9a6 6 0 0 1 4-3'],
  tapeMeasure: ['M4 8h16v10H4z', 'M4 12h6M7 12v3M20 11h2v4h-2'],
  stopwatch: ['M12 21a7 7 0 1 0 0-.1', 'M12 14v-4M10 3h4'],
  bondPaper: ['M7 3h8l4 4v14H7z', 'M15 3v4h4'],
  carbonPaper: ['M7 3h8l4 4v14H7z', 'M10 12h6M10 16h6'],
}
export function itemIcon(id: ItemId): SVGElement {
  const g = svg('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', class: 'icon inv-icon' })
  for (const d of ICONS[id]) g.append(svg('path', { d }))
  return g
}
