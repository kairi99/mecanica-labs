// Analysis of Tabla 2.1 (guide section 2.4, tasks 2 to 8). Pure and DOM-free: takes the table values, returns numbers.
// Statistics and propagation come from src/core/physics; this module only arranges them per task. Views read the result.
//
// Conventions (shown in the panel and in the help page):
//  * Time of a trial: t_bar = mean of the repetitions. Delta t = sqrt(uA^2 + uRes^2 + uReact^2): Type A s/sqrt(n) (GUM 4.2),
//    Type B of the display resolution 0.01 s / sqrt(12) (GUM 4.3.7) and Type B of the unknown mean reaction bias of the hand
//    (start press vs stop press), half-width 0.1 s, u = 0.1/sqrt(3) (ASSUMED; core reactionBiasTypeB_s). The bias is common to
//    every repetition and every trial, so it does not average down with n (Taylor ch. 4); that is why Delta t is far larger
//    than the scatter of the five readings. `uStat_s` (Type A + resolution only) is kept for the breakdown columns.
//  * Range of a trial: x_bar = mean; Delta x = sqrt(uA^2 + uTape^2 + uProj^2): Type A, tape reading Type B (analog, 1 mm
//    division, core typeBAnalog) and the placement of the edge projection point on the floor (ASSUMED 2 mm, the same value the
//    bench draws; a common, systematic start of every range). The tape MPE is reported in the help, not applied (as in Practica 1).
//  * Launch speed: v0 = x_bar / t_bar (task 4), Delta v = v0 sqrt((Dx/x)^2 + (Dt/t)^2) (GUM 5.1.2, independent inputs;
//    core meanVelocity with x1 = t1 = 0). The shared reaction bias makes the v0 of different trials correlated.
//  * Expected flight time (task 5): t = sqrt(2H/g), u_t = t/2 sqrt((u_H/H)^2 + (u_g/g)^2). H is typed by the student from the
//    tape, u_H = sqrt(2) typeBAnalog(1 mm) (two ends to align). g is local gravity in Quito (core constants), u_g ASSUMED.
//  * Final speed (task 7): v = sqrt(v0^2 + 2 g H), with vx = v0 constant and vy = g t; ideal projectile. Propagation of v0, H, g.
import {
  G_QUITO_mps2, STOPWATCH_RESOLUTION_s, TAPE_DIVISION_m, combinedUncertainty, compareToExpected, mean, meanVelocity, reactionBiasTypeB_s,
  sampleSd, typeBAnalog, typeBDigital, type Comparison,
} from '../../../core/physics/index.ts'
import { EDGE_PROJECTION_SIGMA_m, TABLE_TRIALS } from '../apparatus/constants.ts'

/** Uncertainty of local g, m/s^2. ASSUMED: free-air formula without Bouguer or anomaly terms (core constants.ts says a few 1e-3). */
export const G_UNCERTAINTY_mps2 = 0.005
/** Two tape ends to place (floor and table top) for the launch height. */
export const SIGMA_H_m = Math.SQRT2 * typeBAnalog(TAPE_DIVISION_m)
/** Valid range of the typed launch height, m (a lab table). */
export const H_MIN_m = 0.2
export const H_MAX_m = 2

export interface TrialStat {
  trial: number
  n_t: number
  n_x: number
  t_s: number | null
  /** Sample standard deviation of the times. */
  sd_t_s: number
  uA_t_s: number
  uRes_s: number
  uReact_s: number
  /** Type A + resolution only (the scatter-based part). */
  uStat_t_s: number | null
  /** Delta t of Tabla 2.1: with the reaction bias. */
  u_t_s: number | null
  x_m: number | null
  sd_x_m: number
  uA_x_m: number
  uTape_m: number
  uProj_m: number
  u_x_m: number | null
  v0_mps: number | null
  u_v0_mps: number | null
}

export interface BallAnalysis {
  trials: TrialStat[]
  /** Trials with both a mean time and a mean range. */
  complete: number
  /** All readings pooled (task 3, 6). */
  pooled: { n: number; t_s: number; sd_s: number; uA_s: number; u_s: number } | null
  /** Max minus min of the trial mean times, s, and the largest trial Delta t_stat (scatter-based). */
  timeSpread_s: number | null
}

const present = (xs: readonly (number | null)[]): number[] => xs.filter((v): v is number => v !== null)

/** Tabla 2.1 statistics of one ball (tasks 2 and 4). `t_s[trial][rep]`, `x_m[trial][rep]`, nulls allowed. */
export function analyseBall(t_s: readonly (readonly (number | null)[])[], x_m: readonly (readonly (number | null)[])[], reactionHalfWidth_s = 0.1): BallAnalysis {
  const uRes = typeBDigital(STOPWATCH_RESOLUTION_s)
  const uReact = reactionBiasTypeB_s(reactionHalfWidth_s)
  const uTape = typeBAnalog(TAPE_DIVISION_m)
  const trials: TrialStat[] = []
  for (let i = 0; i < TABLE_TRIALS; i++) {
    const ts = present(t_s[i] ?? []), xs = present(x_m[i] ?? [])
    const tBar = ts.length ? mean(ts) : null, xBar = xs.length ? mean(xs) : null
    const sdT = sampleSd(ts), sdX = sampleSd(xs)
    const uAT = ts.length ? sdT / Math.sqrt(ts.length) : 0
    const uAX = xs.length ? sdX / Math.sqrt(xs.length) : 0
    const uStat = tBar === null ? null : combinedUncertainty(uAT, uRes)
    const ut = tBar === null ? null : combinedUncertainty(uAT, uRes, uReact)
    const ux = xBar === null ? null : combinedUncertainty(uAX, uTape, EDGE_PROJECTION_SIGMA_m)
    let v0: number | null = null, uv: number | null = null
    if (tBar !== null && xBar !== null && tBar > 0) {
      const v = meanVelocity(0, 0, xBar, tBar, 0, ux!, 0, ut!)
      v0 = v.v_mps; uv = v.sigma_v_mps
    }
    trials.push({
      trial: i, n_t: ts.length, n_x: xs.length, t_s: tBar, sd_t_s: sdT, uA_t_s: uAT, uRes_s: uRes, uReact_s: uReact, uStat_t_s: uStat, u_t_s: ut,
      x_m: xBar, sd_x_m: sdX, uA_x_m: uAX, uTape_m: uTape, uProj_m: EDGE_PROJECTION_SIGMA_m, u_x_m: ux, v0_mps: v0, u_v0_mps: uv,
    })
  }
  const all = trials.flatMap((_, i) => present(t_s[i] ?? []))
  const pooled = all.length
    ? { n: all.length, t_s: mean(all), sd_s: sampleSd(all), uA_s: sampleSd(all) / Math.sqrt(all.length), u_s: combinedUncertainty(sampleSd(all) / Math.sqrt(all.length), uRes, uReact) }
    : null
  const means = trials.map((t) => t.t_s).filter((v): v is number => v !== null)
  return {
    trials, complete: trials.filter((t) => t.v0_mps !== null).length, pooled,
    timeSpread_s: means.length >= 2 ? Math.max(...means) - Math.min(...means) : null,
  }
}

export interface ExpectedTime { H_m: number; u_H_m: number; g_mps2: number; t_s: number; u_t_s: number }

/**
 * Task 5: flight time of a horizontal launch from rest in the vertical direction, t = sqrt(2H/g) (y = H - g t^2/2 = 0).
 * Independent of v0. Null for an unusable H.
 */
export function expectedFlightTime(H_m: number, u_H_m: number = SIGMA_H_m, g_mps2: number = G_QUITO_mps2, u_g_mps2: number = G_UNCERTAINTY_mps2): ExpectedTime | null {
  if (!(H_m >= H_MIN_m && H_m <= H_MAX_m)) return null
  const t = Math.sqrt((2 * H_m) / g_mps2)
  return { H_m, u_H_m, g_mps2, t_s: t, u_t_s: 0.5 * t * Math.hypot(u_H_m / H_m, u_g_mps2 / g_mps2) }
}

/** Task 6: percent error of a measured time against the expected one, (t - t_theo)/t_theo * 100, and the verdict in sigmas. */
export function timeError(t_s: number, u_t_s: number, exp: ExpectedTime): { error_pct: number; comparison: Comparison } {
  return { error_pct: ((t_s - exp.t_s) / exp.t_s) * 100, comparison: compareToExpected(t_s, u_t_s, exp.t_s, exp.u_t_s) }
}

export interface FinalSpeed { v_mps: number; u_v_mps: number; vy_mps: number; angle_deg: number }

/**
 * Task 7: speed just before landing, v = sqrt(v0^2 + 2 g H) (energy, or vx = v0 and vy = g t with t = sqrt(2H/g)). Propagation:
 * u_v = sqrt((v0 u_v0)^2 + (g u_H)^2 + (H u_g)^2) / v. The angle is below the horizontal.
 */
export function finalSpeed(v0_mps: number, u_v0_mps: number, exp: ExpectedTime, u_g_mps2: number = G_UNCERTAINTY_mps2): FinalSpeed {
  const v = Math.sqrt(v0_mps * v0_mps + 2 * exp.g_mps2 * exp.H_m)
  const vy = Math.sqrt(2 * exp.g_mps2 * exp.H_m)
  return {
    v_mps: v, u_v_mps: Math.sqrt((v0_mps * u_v0_mps) ** 2 + (exp.g_mps2 * exp.u_H_m) ** 2 + (exp.H_m * u_g_mps2) ** 2) / v,
    vy_mps: vy, angle_deg: (Math.atan2(vy, v0_mps) * 180) / Math.PI,
  }
}

/** Task 8: difference of two independent results in units of the combined standard uncertainty (null if either is missing). */
export function differenceInSigma(a: number | null, ua: number | null, b: number | null, ub: number | null): { diff: number; u: number; sigma: number } | null {
  if (a === null || ua === null || b === null || ub === null) return null
  const u = Math.hypot(ua, ub)
  return { diff: a - b, u, sigma: u > 0 ? (a - b) / u : 0 }
}

/**
 * Slow-motion reference (step 4): mean flight time counted in frames over the given runs, with u = frame / sqrt(6) (the launch
 * and landing instants each fall uniformly within one frame, so their difference is triangular with that standard deviation).
 */
export function referenceTime(flightsFromFrames_s: readonly number[], frame_s: number): { t_s: number; u_s: number; n: number } | null {
  if (flightsFromFrames_s.length === 0) return null
  const n = flightsFromFrames_s.length
  const sd = sampleSd(flightsFromFrames_s)
  return { t_s: mean(flightsFromFrames_s), u_s: combinedUncertainty(frame_s / Math.sqrt(6) / Math.sqrt(n), sd / Math.sqrt(n)), n }
}


// ---- the whole panel in one pure result -------------------------------------------------------------------------------

export type BallKey = 'marble' | 'pingpong'
export interface TrialDerived {
  /** Task 6: per trial error of the mean time against the expected one. */
  error: { error_pct: number; comparison: Comparison } | null
  /** Task 7. */
  final: FinalSpeed | null
}
export interface FullAnalysis {
  balls: Record<BallKey, BallAnalysis>
  expected: ExpectedTime | null
  derived: Record<BallKey, TrialDerived[]>
  /** Task 6: all readings of a ball pooled against the expected time. */
  pooledError: Record<BallKey, { error_pct: number; comparison: Comparison } | null>
  /** Task 8 per trial: marble minus ping-pong. */
  compare: Array<{ v0: ReturnType<typeof differenceInSigma>; x: ReturnType<typeof differenceInSigma>; t: ReturnType<typeof differenceInSigma>; v0Ratio: number | null; xRatio: number | null }>
}

export interface FullInput {
  tables: Record<BallKey, { t_s: (number | null)[][]; x_m: (number | null)[][] }>
  /** Launch height typed by the student, m (null: not given). */
  H_m: number | null
}

/** Everything the analysis panel shows for tasks 2 to 8, from the table values and the typed launch height. */
export function fullAnalysis(inp: FullInput): FullAnalysis {
  const balls = { marble: analyseBall(inp.tables.marble.t_s, inp.tables.marble.x_m), pingpong: analyseBall(inp.tables.pingpong.t_s, inp.tables.pingpong.x_m) }
  const expected = inp.H_m === null ? null : expectedFlightTime(inp.H_m)
  const keys: BallKey[] = ['marble', 'pingpong']
  const derived = Object.fromEntries(keys.map((k) => [k, balls[k].trials.map((t): TrialDerived => ({
    error: expected && t.t_s !== null && t.u_t_s !== null ? timeError(t.t_s, t.u_t_s, expected) : null,
    final: expected && t.v0_mps !== null && t.u_v0_mps !== null ? finalSpeed(t.v0_mps, t.u_v0_mps, expected) : null,
  }))])) as Record<BallKey, TrialDerived[]>
  const pooledError = Object.fromEntries(keys.map((k) => {
    const pl = balls[k].pooled
    return [k, expected && pl ? timeError(pl.t_s, pl.u_s, expected) : null]
  })) as FullAnalysis['pooledError']
  const compare = balls.marble.trials.map((m, i) => {
    const p = balls.pingpong.trials[i]!
    return {
      v0: differenceInSigma(m.v0_mps, m.u_v0_mps, p.v0_mps, p.u_v0_mps),
      x: differenceInSigma(m.x_m, m.u_x_m, p.x_m, p.u_x_m),
      t: differenceInSigma(m.t_s, m.u_t_s, p.t_s, p.u_t_s),
      v0Ratio: m.v0_mps !== null && p.v0_mps !== null && p.v0_mps > 0 ? m.v0_mps / p.v0_mps : null,
      xRatio: m.x_m !== null && p.x_m !== null && p.x_m > 0 ? m.x_m / p.x_m : null,
    }
  })
  return { balls, expected, derived, pooledError, compare }
}
