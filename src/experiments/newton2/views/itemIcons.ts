// 24 px line icons, one per item (generic drawings, no brand marks). Shared by the inventory panel, the parts tray and the 2D stage.
import type { ItemId } from '../apparatus/index.ts'
import { svg } from '../../../core/views/dom.ts'
import { isMassPart, type MassPart, type PartId } from './dragdrop/snap.ts'

type IconPart = ItemId | MassPart

export const ICONS: Record<ItemId, string[]> = {
  rail: ['M3 15h18', 'M5 15v-3M9 15v-2M13 15v-3M17 15v-2'],
  cart: ['M4 9h16v7H4z', 'M8 19a1.5 1.5 0 1 0 0-.1M16 19a1.5 1.5 0 1 0 0-.1'],
  rackStand: ['M8 3v18', 'M8 8h9', 'M5 21h6'],
  standBase: ['M3 17h18v4H3z', 'M12 17V9'],
  twoLegStand: ['M12 4L6 20M12 4l6 16', 'M8.5 14h7'],
  screws: ['M12 3v13', 'M9 6h6M9 9h6M9 12h6', 'M10 16l2 5 2-5'],
  level: ['M3 9h18v6H3z', 'M10 12h4'],
  receiver: ['M4 7h8v11H4z', 'M17 14a3.5 3.5 0 1 0 0-.1'],
  stopwatch: ['M12 21a7 7 0 1 0 0-.1', 'M12 14v-4M10 3h4'],
  markers: ['M12 20a8 8 0 1 0 0-.1', 'M12 14a2 2 0 1 0 0-.1'],
  string: ['M4 6c6 0 4 12 10 12s4-12 6-12'],
  canister: ['M8 7h8v13H8z', 'M7 7h10M10 4h4'],
  brassScrew: ['M12 3v13', 'M10 16l2 5 2-5', 'M9 5h6'],
  plasticScrews: ['M12 3v11', 'M9 4h6M10 14l2 5 2-5'],
  masses: ['M6 12h12v7H6z', 'M9 12V9h6v3'],
  balance: ['M4 18h16', 'M7 18v-4h10v4', 'M9 14l1-4h4l1 4'],
  dynamometer: ['M12 3v4', 'M9 7h6v11H9z', 'M12 18v3', 'M10 11h4M10 14h4'],
  dynamometer2N: ['M12 3v4', 'M9 7h6v11H9z', 'M12 18v3', 'M10 10h4M10 13h4M10 16h4'],
  mass50: ['M5 11h14v8H5z', 'M8 11V8h8v3'],
  marble: ['M12 20a7 7 0 1 0 0-.1'],
}
export function iconPaths(part: IconPart): string[] { return ICONS[isMassPart(part as PartId) ? 'masses' : (part as ItemId)] }
export function itemIcon(part: IconPart): SVGElement {
  const g = svg('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', class: 'icon inv-icon' })
  for (const d of iconPaths(part)) g.append(svg('path', { d }))
  return g
}
