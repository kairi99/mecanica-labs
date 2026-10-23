// Tabla 2.1 (raw cells only; the means, errors and v0 are the student's analysis work). One table per ball:
// 5 trials (marks) x 5 repetitions, each repetition holds a flight time (s) and a range (m).
import { parseDecimalInput, type DecimalInputReason } from '../../../core/instruments/numberInput.ts'
import {
  TABLE_MAX_RANGE_m, TABLE_MAX_TIME_s, TABLE_RANGE_DECIMALS, TABLE_REPS, TABLE_TIME_DECIMALS, TABLE_TRIALS,
} from './constants.ts'
import type { BallTable, TableData, TableRep } from './types.ts'
import type { BallId } from './model.ts'

export type ParsedTime = { ok: true; value_s: number } | { ok: false; reason: DecimalInputReason }
export type ParsedRange = { ok: true; value_m: number } | { ok: false; reason: DecimalInputReason }

/** Parse a typed flight time (decimal point or comma, at most 2 decimals like the stopwatch, up to 30 s). */
export function parseTimeInput(input: string | number): ParsedTime {
  const p = parseDecimalInput(input, { max: TABLE_MAX_TIME_s, maxDecimals: TABLE_TIME_DECIMALS })
  return p.ok ? { ok: true, value_s: p.value } : p
}
/** Parse a typed range in metres (decimal point or comma, at most 3 decimals: the tape is read to the millimetre, up to 3 m). */
export function parseRangeInput(input: string | number): ParsedRange {
  const p = parseDecimalInput(input, { max: TABLE_MAX_RANGE_m, maxDecimals: TABLE_RANGE_DECIMALS })
  return p.ok ? { ok: true, value_m: p.value } : p
}

export const emptyRep = (): TableRep => ({ t_s: null, x_m: null, timeRunId: null, timeStopId: null, rangeCarbonId: null, rangeRunId: null })
export const emptyBallTable = (): BallTable => Array.from({ length: TABLE_TRIALS }, () => Array.from({ length: TABLE_REPS }, emptyRep))

/** Plain data of one ball's table: times and ranges as [trial][rep] (null = empty) plus the provenance of each cell. */
export function tableData(ball: BallId, t: BallTable): TableData {
  return {
    ball, trials: TABLE_TRIALS, reps: TABLE_REPS,
    t_s: t.map((r) => r.map((c) => c.t_s)),
    x_m: t.map((r) => r.map((c) => c.x_m)),
    cells: t.map((r) => r.map((c) => ({ ...c }))),
  }
}

/** Filled cells (times and ranges counted separately) and whether every cell of both columns is filled. */
export function tableFill(t: BallTable): { filled: number; complete: boolean } {
  let n = 0
  for (const r of t) for (const c of r) n += (c.t_s !== null ? 1 : 0) + (c.x_m !== null ? 1 : 0)
  return { filled: n, complete: n === TABLE_TRIALS * TABLE_REPS * 2 }
}
