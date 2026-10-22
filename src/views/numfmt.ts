// Number formatting and parsing for the views (decimal comma in Spanish). Pure, no DOM.
import type { Lang } from '../i18n.ts'

/** Fixed decimals with the language's decimal mark. */
export function formatNum(x: number, decimals: number, lang: Lang): string {
  const s = x.toFixed(decimals)
  return lang === 'es' ? s.replace('.', ',') : s
}

/** Parse typed text with a decimal point or comma. NaN if it is not a plain number. */
export function parseDecimal(text: string): number {
  const s = text.trim().replace(',', '.')
  if (!/^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(s)) return NaN
  return Number(s)
}

/** A Table 1.1 cell value (s) as shown: two decimals, '' when empty. */
export function formatCell(value_s: number | null, lang: Lang): string {
  return value_s === null ? '' : formatNum(value_s, 2, lang)
}

/** Stopwatch LCD text mm:ss.cc from seconds (floored to 0.01 s, like the display). */
export function lcdText(t_s: number): string {
  const cs = Math.max(0, Math.floor(t_s * 100 + 1e-6))
  const m = Math.floor(cs / 6000)
  const s = Math.floor((cs % 6000) / 100)
  const c = cs % 100
  const p = (n: number): string => String(n).padStart(2, '0')
  return `${p(m)}:${p(s)}.${p(c)}`
}
