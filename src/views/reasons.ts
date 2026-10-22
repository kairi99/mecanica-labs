// Turn an apparatus refusal into text. Views never show a raw reason id.
import type { Reason, ItemId } from '../apparatus/index.ts'
import type { Lang } from '../i18n.ts'
import { strings as reasonStrings } from './strings/reasons.ts'
import { strings as inv } from './strings/inventory.ts'

/** Text for a refusal reason; `{item}` becomes the item's name (or a generic word). */
export function reasonText(lang: Lang, reason: Reason, item?: ItemId): string {
  const raw = reasonStrings[lang][reason]
  if (!raw.includes('{item}')) return raw
  let name = item ? inv[lang].itemShort[item] : inv[lang].genericItem
  if (raw.startsWith('{item}')) name = name.charAt(0).toUpperCase() + name.slice(1)
  return raw.replace('{item}', name)
}
