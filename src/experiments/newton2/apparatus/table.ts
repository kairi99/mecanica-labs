// Validation of values typed into Tabla 3.1 (times in s, forces in N) and the recorded total mass (g).
import { parseDecimalInput, type DecimalInputReason } from '../../../core/instruments/numberInput.ts'
import {
  FORCE_MAX_DECIMALS, FORCE_MAX_N, MT_MAX_DECIMALS, MT_MAX_g, TABLE_MAX_DECIMALS, TABLE_MAX_TIME_s,
} from './constants.ts'

export type TableInputReason = DecimalInputReason
export type Parsed = { ok: true; value: number } | { ok: false; reason: TableInputReason }

/** Time in s, decimal point or comma, at most 2 decimals (stopwatch). */
export const parseTimeInput = (input: string | number): Parsed => parseDecimalInput(input, { max: TABLE_MAX_TIME_s, maxDecimals: TABLE_MAX_DECIMALS })
/** Force in N, at most 2 decimals (dynamometer), up to FORCE_MAX_N. */
export const parseForceInput = (input: string | number): Parsed => parseDecimalInput(input, { max: FORCE_MAX_N, maxDecimals: FORCE_MAX_DECIMALS })
/** Mass in g, at most 1 decimal (balance 0.1 g), up to the balance capacity. */
export const parseMassInput_g = (input: string | number): Parsed => parseDecimalInput(input, { max: MT_MAX_g, maxDecimals: MT_MAX_DECIMALS })
