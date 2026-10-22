// Simulated human timing for demos, tests and the teacher key: drives the REAL apparatus actions (release, stopwatch start and
// stop with reaction delays, copy to Table 1.1), so every cell has a stop record and a DigiCart run behind it. Not used in the
// student flow; the dev-only ?demo=table flag and the tests call it. Uses an injected seeded RNG (no Math.random).
import type { Apparatus } from '../apparatus/index.ts'
import { TABLE_COLS, TABLE_ROWS } from '../apparatus/index.ts'
import { gaussian, mulberry32 } from '../physics/index.ts'

export interface SimulatedTiming {
  /** RNG seed of the reaction noise. Default 1. */
  seed?: number
  /** Mean delay of the START press after the release, s. Default 0.20. */
  startLag_s?: number
  /** Mean delay of the STOP press after the cart crosses the mark, s. Default 0.25. */
  stopLag_s?: number
  /** Standard deviation of each press delay, s. Default 0.05. */
  reactionSd_s?: number
  /** Table rows to fill (1..9 = 10..90 cm). Default all. */
  rows?: readonly number[]
  /** Columns (timings) per row. Default 10. */
  perRow?: number
}

/** Fill Table 1.1 with simulated stopwatch readings. The bench must be ready to run (e.g. preset('assembled')). Returns the number of cells written. */
export function fillTableSimulated(app: Apparatus, opts: SimulatedTiming = {}): number {
  const rng = mulberry32(opts.seed ?? 1)
  const startLag = opts.startLag_s ?? 0.2
  const stopLag = opts.stopLag_s ?? 0.25
  const sd = opts.reactionSd_s ?? 0.05
  const perRow = Math.min(TABLE_COLS, opts.perRow ?? TABLE_COLS)
  const rows = opts.rows ?? Array.from({ length: TABLE_ROWS - 1 }, (_, i) => i + 1)
  let clock_ms = 1000
  let written = 0
  for (const row of rows) {
    for (let col = 0; col < perRow; col++) {
      if (app.getState().cart.released) app.resetCart()
      app.stopwatchReset()
      const rel = app.releaseCart(clock_ms)
      if (!rel.ok) return written
      const rec = app.getRun(rel.runId)!
      const trueT = rec.marks[row]?.trueTime_s
      if (trueT === null || trueT === undefined) return written
      const startDelay = Math.max(0.02, startLag + sd * gaussian(rng))
      const stopDelay = Math.max(0.02, stopLag + sd * gaussian(rng))
      app.stopwatchStartStop(clock_ms + startDelay * 1000)
      const stopAt = clock_ms + (trueT + stopDelay) * 1000
      app.stopwatchStartStop(stopAt, { markTarget: row })
      if (app.tableCopyDisplay(row, col, stopAt + 500).ok) written++
      clock_ms = stopAt + 5000
    }
  }
  if (app.getState().cart.released) app.resetCart()
  app.stopwatchReset()
  return written
}
