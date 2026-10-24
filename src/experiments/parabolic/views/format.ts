// Number formatting and CSV for the parabolic views. Pure, no DOM. Units: times in s (2 decimals, the stopwatch shows hundredths),
// ranges in m (3 decimals, the tape is read to the millimetre), lengths typed by the student in cm.
import type { Lang } from '../../../core/i18n.ts'
import { joinCSV } from '../../../core/views/csv.ts'
import { formatNum, parseDecimal } from '../../../core/views/numfmt.ts'
import type { TableData } from '../apparatus/index.ts'

export const formatTime = (v: number | null, lang: Lang): string => (v === null ? '' : formatNum(v, 2, lang))
export const formatRange = (v: number | null, lang: Lang): string => (v === null ? '' : formatNum(v, 3, lang))
/** Time of a slow-motion frame, s, three decimals, with a minus sign before the launch. */
export const formatFrameTime = (t_s: number, lang: Lang): string => formatNum(Math.abs(t_s) < 5e-4 ? 0 : t_s, 3, lang).replace('-', '−')

/** Metres shown as centimetres ("12,5"): the unit the student types and reads for lengths on the bench. */
export const cmText = (len_m: number, lang: Lang, decimals = 1): string => formatNum(len_m * 100, decimals, lang).replace(/([.,]\d*?)0+$/, '$1').replace(/[.,]$/, '')
/** Typed centimetres to metres; NaN when it is not a plain number. */
export function parseCm(text: string): number {
  const v = parseDecimal(text)
  return Number.isNaN(v) ? NaN : v / 100
}

export interface Comparison { difference_s: number; relative: number }
/** Student's stopwatch reading against a reference time: difference (reading - reference) and relative difference to the reference. */
export function compareReading(reading_s: number, reference_s: number): Comparison {
  return { difference_s: reading_s - reference_s, relative: reference_s > 0 ? (reading_s - reference_s) / reference_s : NaN }
}
export const signedText = (v: number, decimals: number, lang: Lang): string => `${v > 0 ? '+' : v < 0 ? '−' : ''}${formatNum(Math.abs(v), decimals, lang)}`

/** Tabla 2.1 of one ball as CSV: No., five times, five ranges (ES: ";" and decimal comma; EN: "," and decimal point). */
export function tableCsv(d: TableData, lang: Lang): string {
  const head = ['No.']
  for (let r = 0; r < d.reps; r++) head.push(`t${r + 1} (s)`)
  for (let r = 0; r < d.reps; r++) head.push(`x${r + 1} (m)`)
  const rows: string[][] = [head]
  for (let t = 0; t < d.trials; t++) rows.push([String(t + 1), ...d.t_s[t]!.map((v) => formatTime(v, lang)), ...d.x_m[t]!.map((v) => formatRange(v, lang))])
  return joinCSV(rows, lang)
}
