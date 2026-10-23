// Validation of values typed into Table 1.1 (times in s, two decimals like the stopwatch).
import { parseDecimalInput, type DecimalInputReason } from '../../../core/instruments/numberInput.ts'
import { TABLE_MAX_DECIMALS, TABLE_MAX_TIME_s } from './constants.ts'

export type TableInputReason = DecimalInputReason
export type ParsedInput = { ok: true; value_s: number } | { ok: false; reason: TableInputReason }

/** Parse typed text (decimal point or comma) or a number. Rejects more decimals than the stopwatch shows. */
export function parseTimeInput(input: string | number): ParsedInput {
  const p = parseDecimalInput(input, { max: TABLE_MAX_TIME_s, maxDecimals: TABLE_MAX_DECIMALS })
  return p.ok ? { ok: true, value_s: p.value } : p
}
