// 24 px line icons, one per item (generic drawings, no brand marks). Shared by the inventory panel and the parts tray.
import type { ItemId } from '../apparatus/index.ts'
import { svg } from '../../../core/views/dom.ts'

const ICONS: Record<ItemId, string[]> = {
  rail: ['M3 15h18', 'M5 15v-3M9 15v-2M13 15v-3M17 15v-2'],
  cart: ['M4 9h16v7H4z', 'M8 19a1.5 1.5 0 1 0 0-.1M16 19a1.5 1.5 0 1 0 0-.1'],
  rackStand: ['M8 3v18', 'M8 8h9', 'M5 21h6'],
  standBase: ['M3 17h18v4H3z', 'M12 17V9'],
  twoLegStand: ['M12 4L6 20M12 4l6 16', 'M8.5 14h7'],
  screws: ['M12 3v13', 'M9 6h6M9 9h6M9 12h6', 'M10 16l2 5 2-5'],
  level: ['M3 9h18v6H3z', 'M10 12h4'],
  receiver: ['M4 7h8v11H4z', 'M17 14a3.5 3.5 0 1 0 0-.1'],
  stopwatch: ['M12 21a7 7 0 1 0 0-.1', 'M12 14v-4M10 3h4'],
  tape: ['M4 8h16v10H4z', 'M4 12h6M7 12v3M20 11h2v4h-2'],
  markers: ['M12 20a8 8 0 1 0 0-.1', 'M12 14a2 2 0 1 0 0-.1'],
}
export function itemIcon(id: ItemId): SVGElement {
  const g = svg('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', class: 'icon inv-icon' })
  for (const d of ICONS[id]) g.append(svg('path', { d }))
  return g
}

