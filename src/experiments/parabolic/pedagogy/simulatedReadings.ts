// Simulated human timing and tape reading for demos, tests and the teacher key: drives the REAL apparatus actions (place the ball
// on a mark, release, stopwatch start at the edge and stop at the landing with reaction delays, copy the time, measure the carbon
// mark with the tape and copy the range), so every cell has a run, a stop and a carbon mark behind it. Not used in the student
// flow; the dev-only ?demo=table flag and the tests call it. Uses an injected seeded RNG (no Math.random).
import { BALL_IDS, TABLE_REPS, TABLE_TRIALS, type BallId, type ParabolicApparatus } from '../apparatus/index.ts'
import { gaussian, mulberry32 } from '../../../core/physics/index.ts'

export interface SimulatedTiming {
  /** RNG seed of the reaction noise. Default 1. */
  seed?: number
  /** Mean delay of the START press after the ball passes the edge, s. Default 0.20. */
  startLag_s?: number
  /** Mean delay of the STOP press after the landing, s. Default 0.22. */
  stopLag_s?: number
  /** Standard deviation of each press delay, s. Default 0.05. */
  reactionSd_s?: number
  /** Balls to fill, in order. Default both. */
  balls?: readonly BallId[]
  /** Repetitions per trial. Default all. */
  perTrial?: number
  /** Trials (rail marks, ordered from the low tip) to fill. Default all. */
  trials?: readonly number[]
  /** Time of the first release, ms. Default 1000. */
  start_ms?: number
}

/** Fill Tabla 2.1. The bench must be ready (e.g. preset 'assembled'). Returns the number of (time, range) pairs written. */
export function fillTableSimulated(app: ParabolicApparatus, opts: SimulatedTiming = {}): number {
  const rng = mulberry32(opts.seed ?? 1)
  const startLag = opts.startLag_s ?? 0.2, stopLag = opts.stopLag_s ?? 0.22, sd = opts.reactionSd_s ?? 0.05
  const perTrial = Math.min(TABLE_REPS, opts.perTrial ?? TABLE_REPS)
  const balls = opts.balls ?? BALL_IDS
  const marks = [...app.getMarks()].sort((a, b) => a.s_m - b.s_m)
  const trials = opts.trials ?? Array.from({ length: Math.min(TABLE_TRIALS, marks.length) }, (_, i) => i)
  let clock = opts.start_ms ?? 1000
  let written = 0
  for (const ball of balls) {
    if (app.getState().ball.released) app.resetBall()
    if (!app.selectBall(ball).ok) return written
    for (const trial of trials) {
      const mark = marks[trial]
      if (!mark) return written
      for (let rep = 0; rep < perTrial; rep++) {
        // a faint carbon mark (ping-pong) or an off-paper landing gives no range: the student repeats the launch
        for (let attempt = 0; attempt < 8; attempt++) {
          app.stopwatchReset()
          if (!app.placeBall({ markId: mark.id }).ok) return written
          const rel = app.release(clock)
          if (!rel.ok) return written
          const run = app.getRun(rel.runId)!
          if (run.times.edge_s === null || run.times.land_s === null) { clock += 8000; app.tick(clock); continue }
          const edgeAt = clock + run.times.edge_s * 1000, landAt = clock + run.times.land_s * 1000
          app.stopwatchStartStop(edgeAt + Math.max(0.02, startLag + sd * gaussian(rng)) * 1000)
          const stopAt = landAt + Math.max(0.02, stopLag + sd * gaussian(rng)) * 1000
          app.stopwatchStartStop(stopAt, { trial })
          const end = clock + run.times.end_s * 1000 + 500
          app.tick(end)
          const carbon = app.paperMarks(end).find((m) => m.runId === rel.runId)
          clock = end + 3000
          if (!carbon) continue
          const tape = app.tapeMeasure({ kind: 'range', carbonId: carbon.id })
          if (!tape.ok) continue
          app.tableCopyRange(ball, trial, rep)
          app.tableCopyTime(ball, trial, rep, stopAt + 300)
          written++
          break
        }
      }
    }
  }
  return written
}
