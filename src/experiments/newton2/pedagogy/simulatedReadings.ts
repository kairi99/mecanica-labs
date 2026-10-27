// Simulated human timing for demos, tests and the teacher key: drives the REAL apparatus actions (trial set-up, dynamometer, release,
// stopwatch start and stop with reaction delays, copy to Tabla 3.1). Not used in the student flow. Injected seeded RNG (no Math.random).
import type { Apparatus } from '../apparatus/index.ts'
import { TABLE_COLS } from '../apparatus/index.ts'
import { gaussian, mulberry32 } from '../physics/index.ts'

export interface SimulatedTiming {
  /** RNG seed of the reaction noise. Default 1. */
  seed?: number
  /** Mean delay of the START press after the release, s. Default 0.20. */
  startLag_s?: number
  /** Mean delay of the STOP press after the cart crosses the end mark, s. Default 0.25. */
  stopLag_s?: number
  /** Standard deviation of each press delay, s. Default 0.05. */
  reactionSd_s?: number
  /** Trial rows to fill (0..3 = 4, 3, 2, 1 masses in the canister; 4 = empty canister). Default 0..3. */
  rows?: readonly number[]
  /** Timings per row. Default 10. */
  perRow?: number
}

/** Fill Tabla 3.1 with simulated readings, trial by trial as the guide does. The bench must be ready (preset('assembled')). Returns the number of time cells written. */
export function fillTableSimulated(app: Apparatus, opts: SimulatedTiming = {}): number {
  const rng = mulberry32(opts.seed ?? 1)
  const startLag = opts.startLag_s ?? 0.2
  const stopLag = opts.stopLag_s ?? 0.25
  const sd = opts.reactionSd_s ?? 0.05
  const perRow = Math.min(TABLE_COLS, opts.perRow ?? TABLE_COLS)
  const rows = opts.rows ?? [0, 1, 2, 3]
  let clock_ms = 1000
  let written = 0
  for (const row of rows) {
    if (!app.setTrial(4 - row).ok) return written
    if (!app.dynamometerRead().ok || !app.tableCopyForce(row).ok) return written
    for (let col = 0; col < perRow; col++) {
      if (app.getState().cart.released) app.resetCart()
      app.stopwatchReset()
      const rel = app.releaseCart(clock_ms)
      if (!rel.ok) return written
      const trueT = app.getRun(rel.runId)!.tEnd_s
      if (trueT === null) return written
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
