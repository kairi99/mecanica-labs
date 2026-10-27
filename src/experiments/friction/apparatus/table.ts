// Tablas 4.1, 4.2 and 4.3 (raw cells only; means, fits and coefficients are the student's analysis work).
import { parseDecimalInput, type DecimalInputReason } from '../../../core/instruments/numberInput.ts'
import {
  BAR_ORDER, FORCE_DECIMALS, FORCE_MAX_N, HEIGHT_DECIMALS, HEIGHT_MAX_m, T41_ROWS, T42_ROWS, T43_TRIALS, T4_READINGS, TIME_DECIMALS, TIME_MAX_s,
} from './constants.ts'
import type { ForceCell, T43Cell, TableData } from './types.ts'

export type ParsedForce = { ok: true; value_N: number } | { ok: false; reason: DecimalInputReason }
export type ParsedHeight = { ok: true; value_m: number } | { ok: false; reason: DecimalInputReason }
export type ParsedTime = { ok: true; value_s: number } | { ok: false; reason: DecimalInputReason }

/** Typed force in N (decimal point or comma, up to 3 decimals: finer than any scale mark, so a typed value is never finer than a reading). */
export function parseForceInput(input: string | number): ParsedForce {
  const p = parseDecimalInput(input, { max: FORCE_MAX_N, maxDecimals: FORCE_DECIMALS })
  return p.ok ? { ok: true, value_N: p.value } : p
}
/** Typed height in m (tape reads to the mm). */
export function parseHeightInput(input: string | number): ParsedHeight {
  const p = parseDecimalInput(input, { max: HEIGHT_MAX_m, maxDecimals: HEIGHT_DECIMALS })
  return p.ok ? { ok: true, value_m: p.value } : p
}
/** Typed time in s (stopwatch shows 0.01 s). */
export function parseTimeInput(input: string | number): ParsedTime {
  const p = parseDecimalInput(input, { max: TIME_MAX_s, maxDecimals: TIME_DECIMALS })
  return p.ok ? { ok: true, value_s: p.value } : p
}

export const emptyForceCell = (): ForceCell => ({ F_N: null, runId: null, setup: null, overRange: false })
export const emptyT43Cell = (): T43Cell => ({ h_m: null, t_s: null, hTrialId: null, tTrialId: null, tStopId: null })
export const emptyTables = (): TableData => ({
  t41: Array.from({ length: T41_ROWS }, () => Array.from({ length: T4_READINGS }, emptyForceCell)),
  t42: Array.from({ length: T42_ROWS }, () => Array.from({ length: T4_READINGS }, emptyForceCell)),
  t43: Array.from({ length: BAR_ORDER.length }, () => Array.from({ length: T43_TRIALS }, emptyT43Cell)),
})

export function tableFill(t: TableData): { t41: number; t42: number; t43: number; complete: { t41: boolean; t42: boolean; t43: boolean } } {
  const n = (rows: ForceCell[][]): number => rows.reduce((a, r) => a + r.filter((c) => c.F_N !== null).length, 0)
  const t41 = n(t.t41), t42 = n(t.t42)
  const t43 = t.t43.reduce((a, r) => a + r.reduce((b, c) => b + (c.h_m !== null ? 1 : 0) + (c.t_s !== null ? 1 : 0), 0), 0)
  return {
    t41, t42, t43,
    complete: { t41: t41 === T41_ROWS * T4_READINGS, t42: t42 === T42_ROWS * T4_READINGS, t43: t43 === BAR_ORDER.length * T43_TRIALS * 2 },
  }
}
