// 24 px line icons, one per item (generic drawings, no brand marks). Shared by the inventory panel and the parts tray.
import { type ItemId } from '../apparatus/index.ts'
import { svg } from '../../../core/views/dom.ts'

const ICONS: Record<ItemId, string[]> = {
  alBar: ['M3 10h18v5H3z', 'M3 12.5h18'], woodBar: ['M3 10h18v5H3z', 'M6 12h4M13 13h4'], ironBar: ['M3 10h18v5H3z', 'M3 10l3-2h15'],
  block: ['M5 9h14v9H5z', 'M5 9l3-3h14l-3 3', 'M19 12h3'], scale1N: ['M10 3h4v14h-4z', 'M12 17v4', 'M12 3V1'], scale2N: ['M10 3h4v14h-4z', 'M12 17v4', 'M10 8h4'],
  rail: ['M3 15L21 9', 'M3 18L21 12'], masses50: ['M6 12h12v6H6z', 'M9 12v-2h6v2'], tape: ['M4 8h16v10H4z', 'M4 12h6M7 12v3M20 11h2v4h-2'],
  paper: ['M7 3h8l4 4v14H7z', 'M15 3v4h4'], rackStand: ['M9 3v18', 'M9 7h6M9 11h6', 'M5 21h8'], standBase: ['M3 17h18v4H3z', 'M12 17V9'],
  stopwatch: ['M12 21a7 7 0 1 0 0-.1', 'M12 14v-4M10 3h4'], balance: ['M4 18h16', 'M12 18V6', 'M5 9h14', 'M5 9l-2 4h4zM19 9l-2 4h4z'],
  masses10: ['M8 14h8v4H8z', 'M10 14v-2h4v2'], marble: ['M12 20a7 7 0 1 0 0-.1', 'M9 9a3.5 3.5 0 0 1 3-2'],
}
export function itemIcon(id: ItemId): SVGElement {
  const g = svg('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', class: 'icon inv-icon' })
  for (const d of ICONS[id]) g.append(svg('path', { d }))
  return g
}

