// Number formatting of analysis results with GUM-style rounding (value rounded to the decimals of its uncertainty).
import type { Lang } from '../i18n.ts'
import { roundWithUncertainty } from '../physics/index.ts'

const mark = (s: string, lang: Lang): string => (lang === 'es' ? s.replace('.', ',') : s)

/** "1.02 ± 0.06" (ES: decimal comma). */
export function pmText(value: number, sigma: number, lang: Lang): string {
  const r = roundWithUncertainty(value, sigma)
  const neg = (t: string): string => t.replace(/^-/, '\u2212') // a true minus sign, as the percentage error uses
  return `${neg(mark(r.valueText, lang))} ± ${mark(r.sigmaText, lang)}`
}

/** Fixed decimals with the language's decimal mark. */
export function numText(x: number, decimals: number, lang: Lang): string {
  return mark(x.toFixed(Math.max(0, decimals)), lang)
}

/** Value only, rounded to the decimals its uncertainty asks for. */
export function valueText(value: number, sigma: number, lang: Lang): string {
  return mark(roundWithUncertainty(value, sigma).valueText, lang)
}
