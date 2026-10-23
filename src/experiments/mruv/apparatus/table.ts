// Validation of values typed into Table 1.1 (times in s, two decimals like the stopwatch).
import { TABLE_MAX_DECIMALS, TABLE_MAX_TIME_s } from './constants.ts'

export type TableInputReason = 'empty' | 'notANumber' | 'negative' | 'tooLarge' | 'tooManyDecimals'
export type ParsedInput = { ok: true; value_s: number } | { ok: false; reason: TableInputReason }

/** Parse typed text (decimal point or comma) or a number. Rejects more decimals than the stopwatch shows. */
export function parseTimeInput(input: string | number): ParsedInput {
  let text: string
  if (typeof input === 'number') {
    if (!Number.isFinite(input)) return { ok: false, reason: 'notANumber' }
    if (input < 0) return { ok: false, reason: 'negative' }
    text = Math.abs(input) < 1e-6 ? '0' : input.toFixed(9).replace(/0+$/, '').replace(/\.$/, '')
  } else {
    text = input.trim().replace(',', '.')
    if (text === '') return { ok: false, reason: 'empty' }
    if (/^-\s*\d/.test(text) || /^-\.\d/.test(text)) return { ok: false, reason: 'negative' }
    if (!/^(\d+(\.\d*)?|\.\d+)$/.test(text)) return { ok: false, reason: 'notANumber' }
  }
  const decimals = text.includes('.') ? text.split('.')[1]!.replace(/0+$/, '').length : 0
  if (decimals > TABLE_MAX_DECIMALS) return { ok: false, reason: 'tooManyDecimals' }
  const v = Number(text)
  if (v > TABLE_MAX_TIME_s) return { ok: false, reason: 'tooLarge' }
  return { ok: true, value_s: Math.round(v * 100) / 100 }
}
