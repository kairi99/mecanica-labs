// Pure CSV export of Table 1.1. No DOM. ES: ";" separator and decimal comma. EN: "," and decimal point.
import type { Lang } from '../i18n.ts'
import { formatNum } from './numfmt.ts'

const HEAD_X: Record<Lang, string> = { es: 'x (cm)', en: 'x (cm)' }

export function toCSV(positions_cm: readonly number[], values_s: readonly (readonly (number | null)[])[], lang: Lang): string {
  const sep = lang === 'es' ? ';' : ','
  const cols = values_s[0]?.length ?? 0
  const header = [HEAD_X[lang], ...Array.from({ length: cols }, (_, i) => `t${i + 1} (s)`)]
  const rows = [header]
  positions_cm.forEach((x, r) => {
    rows.push([String(x), ...(values_s[r] ?? []).map((v) => (v === null ? '' : formatNum(v, 2, lang)))])
  })
  return rows.map((r) => r.join(sep)).join('\n') + '\n'
}
