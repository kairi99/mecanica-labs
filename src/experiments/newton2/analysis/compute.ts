// Analysis of Tabla 3.1 (guide tasks 2, 3, 5 and 6, numbers only). Pure: takes the table values, returns numbers. Statistics, fits
// and propagation come from the physics layer (src/core/physics); this module only arranges them. The qualitative tasks
// (1, 4 text, what the slope means, 7, 8) are the student's: nothing here answers them.
//
// Conventions (as Practica 1):
//  * Time of a trial: t_bar = mean of the readings; u(t_bar) = sqrt(uA^2 + uRes^2), uA = s/sqrt(n) (GUM Type A), uRes = 0.01 s/sqrt(12)
//    (digital display, Type B). The reaction-time bias (unknown mean difference between the stop and start presses) is common to
//    all readings and does not average down: shown in uTotal = sqrt(u^2 + uReact^2) and as a separate effect on the fit
//    (`reactionEffect`), never as a per-point weight (GUM F.1.2.4, Taylor ch. 4).
//  * Distance d = 0.90 m between the two marks: two scale readings, sigma_d = sqrt(2) * 1 mm/sqrt(12).
//  * a = 2 d / t_bar^2 (rest start, constant acceleration), sigma_a^2/a^2 = (sigma_d/d)^2 + (2 u/t_bar)^2 (GUM 5.1.2).
//  * Force: the spring-scale reading, Type B u_F = division/sqrt(12) (springScaleUncertainty_N: 0.0058 N for the 1 N scale, 0.0144 N for the 2 N scale).
//  * Fit F = M_fit a + F0 by weighted least squares with the effective-variance method (Orear 1982; Taylor ch. 8): the noisy
//    variable a is the abscissa, sigma_eff^2 = u_F^2 + (M_fit u_a)^2, iterated.
import {
  combinedUncertainty, compareToExpected, reactionBiasTypeB_s, repeatedStats, STOPWATCH_RESOLUTION_s, typeBAnalog, typeBDigital,
  weightedLinearFit, type Comparison, type WeightedFit,
} from '../../../core/physics/index.ts'
import { SPRING_SCALES, springScaleUncertainty_N } from '../../../core/instruments/springScale.ts'
import { RAIL_DIVISION_m, balanceTypeB_kg } from '../physics/instruments.ts'
import { DISTANCE_TARGET_m, TRIAL_MASSES_IN_CANISTER } from '../apparatus/constants.ts'

export type { Comparison }
/** Distance of the run, m (the guide's 90 cm). */
export const DISTANCE_m = DISTANCE_TARGET_m
/** sigma_d of the 90 cm between two mark readings on the millimetre scale, m. */
export const SIGMA_D_m = Math.SQRT2 * typeBAnalog(RAIL_DIVISION_m)
/** Type B uncertainty of a force reading with the default 1 N spring scale, N. */
export const SIGMA_F_N = springScaleUncertainty_N(SPRING_SCALES['1N'])
export const MIN_READINGS = 2
export const MIN_TRIALS_FOR_FIT = 2

export interface TrialStat {
  row: number
  /** Masses in the canister of this trial (4, 3, 2, 1, 0). */
  massesInCanister: number
  F_N: number | null
  readings_s: number[]
  n: number
  mean_s: number | null
  sd_s: number
  uA_s: number
  uRes_s: number
  uReact_s: number
  /** sqrt(uA^2 + uRes^2): the weight in the fit. null with fewer than MIN_READINGS readings. */
  u_s: number | null
  /** Combined with the common reaction bias: shown as Delta t. */
  uTotal_s: number | null
  /** a = 2 d / t_bar^2 and its statistical uncertainty (weight) and the one including the reaction bias. */
  a_mps2: number | null
  u_a_mps2: number | null
  uTotal_a_mps2: number | null
}

export interface FitPoint { row: number; a_mps2: number; u_a_mps2: number; F_N: number; u_F_N: number }

export interface ForceFit {
  fit: WeightedFit
  /** Slope: the fitted mass M_fit, kg, and its uncertainty. */
  M_kg: number
  sigma_M_kg: number
  /** Intercept F0, N, and its uncertainty. */
  F0_N: number
  sigma_F0_N: number
  iterations: number
}

export interface MassComparison {
  Mt_kg: number
  uMt_kg: number
  /** (M_fit - Mt)/Mt, percent, signed; and the absolute error in percent. */
  error_pct: number
  absError_pct: number
  comparison: Comparison
}

export interface ReactionEffect {
  shift_s: number
  /** Relative change of M_fit, %, and absolute change of F0, N, when every time is shifted by shift_s. */
  dM_pct: number
  dF0_N: number
}

export interface AnalysisResult {
  trials: TrialStat[]
  points: FitPoint[]
  fit: ForceFit | null
  massComparison: MassComparison | null
  reactionEffect: ReactionEffect | null
}

export interface AnalysisInput {
  /** F per trial row (N), null = not entered. */
  forces_N: readonly (number | null)[]
  /** [row][col] times in s. */
  values_s: readonly (readonly (number | null)[])[]
  /** Mt from the balance, kg, or null. */
  Mt_kg?: number | null
  /** Distance, m (default 0.90). */
  distance_m?: number
  /** Uncertainty of a force reading, N: one value for all rows or one per row (the scale each force was read with). */
  uF_N?: number | readonly number[]
  uMt_kg?: number
}

/** Statistics of one trial row (task 2) and its acceleration (task 3). */
export function analyseTrial(row: number, F_N: number | null, times: readonly (number | null)[], distance_m = DISTANCE_m, shift_s = 0): TrialStat {
  const xs = times.filter((v): v is number => v !== null).map((v) => v + shift_s)
  const uRes = typeBDigital(STOPWATCH_RESOLUTION_s)
  const uReact = reactionBiasTypeB_s()
  const base = { row, massesInCanister: TRIAL_MASSES_IN_CANISTER[row] ?? 0, F_N, readings_s: xs, n: xs.length, uRes_s: uRes, uReact_s: uReact }
  if (xs.length < MIN_READINGS) {
    return { ...base, mean_s: xs.length ? xs[0]! : null, sd_s: 0, uA_s: 0, u_s: null, uTotal_s: null, a_mps2: null, u_a_mps2: null, uTotal_a_mps2: null }
  }
  const st = repeatedStats(xs, uRes)
  const t = st.mean
  const a = (2 * distance_m) / (t * t)
  const ua = (u: number): number => a * Math.sqrt((SIGMA_D_m / distance_m) ** 2 + ((2 * u) / t) ** 2)
  const uStat = combinedUncertainty(st.uA, uRes)
  const uTot = combinedUncertainty(uStat, uReact)
  return {
    ...base, mean_s: t, sd_s: st.sd, uA_s: st.uA, u_s: uStat, uTotal_s: uTot, a_mps2: a, u_a_mps2: ua(uStat), uTotal_a_mps2: ua(uTot),
  }
}

/**
 * Weighted linear fit y = slope x + intercept with errors in both variables, effective-variance method (Orear 1982): weights
 * 1/(sy^2 + slope^2 sx^2), iterated from the weights without sx until the slope changes by less than 1e-12 (max 20).
 */
export function linearFitEffectiveVariance(
  x: readonly number[], y: readonly number[], sx: readonly number[], sy: readonly number[],
): { fit: WeightedFit; iterations: number } {
  let fit = weightedLinearFit(x, y, sy)
  let it = 0
  while (it < 20) {
    const eff = x.map((_, k) => Math.hypot(sy[k]!, fit.slope * sx[k]!))
    const next = weightedLinearFit(x, y, eff)
    it++
    const d = Math.abs(next.slope - fit.slope)
    fit = next
    if (d < 1e-12) break
  }
  return { fit, iterations: it }
}

function fitPoints(trials: readonly TrialStat[], uF: number | readonly number[]): FitPoint[] {
  return trials.flatMap((t) => (t.a_mps2 !== null && t.u_a_mps2 !== null && t.F_N !== null
    ? [{ row: t.row, a_mps2: t.a_mps2, u_a_mps2: t.u_a_mps2, F_N: t.F_N, u_F_N: typeof uF === 'number' ? uF : uF[t.row] ?? SIGMA_F_N }]
    : []))
}
function fitOf(points: readonly FitPoint[]): ForceFit | null {
  if (points.length < MIN_TRIALS_FOR_FIT) return null
  const { fit, iterations } = linearFitEffectiveVariance(points.map((p) => p.a_mps2), points.map((p) => p.F_N), points.map((p) => p.u_a_mps2), points.map((p) => p.u_F_N))
  return { fit, M_kg: fit.slope, sigma_M_kg: fit.sigma_slope, F0_N: fit.intercept, sigma_F0_N: fit.sigma_intercept, iterations }
}

/** Everything the analysis panel shows from Tabla 3.1: tasks 2 and 3 per trial, the F-a points, the fit (task 5 numbers) and M_fit against Mt (task 6 numbers). */
export function analyse(input: AnalysisInput): AnalysisResult {
  const d = input.distance_m ?? DISTANCE_m
  const uF = input.uF_N ?? SIGMA_F_N
  const trials = input.values_s.map((r, i) => analyseTrial(i, input.forces_N[i] ?? null, r, d))
  const points = fitPoints(trials, uF)
  const fit = fitOf(points)
  let massComparison: MassComparison | null = null
  if (fit && input.Mt_kg !== null && input.Mt_kg !== undefined && input.Mt_kg > 0) {
    const uMt = input.uMt_kg ?? balanceTypeB_kg()
    const diff = fit.M_kg - input.Mt_kg
    massComparison = {
      Mt_kg: input.Mt_kg, uMt_kg: uMt, error_pct: (diff / input.Mt_kg) * 100, absError_pct: (Math.abs(diff) / input.Mt_kg) * 100,
      comparison: compareToExpected(fit.M_kg, fit.sigma_M_kg, input.Mt_kg, uMt),
    }
  }
  let reactionEffect: ReactionEffect | null = null
  if (fit) {
    const shift = reactionBiasTypeB_s() // one standard uncertainty of the bias
    const shifted = fitOf(fitPoints(input.values_s.map((r, i) => analyseTrial(i, input.forces_N[i] ?? null, r, d, shift)), uF))
    if (shifted) reactionEffect = { shift_s: shift, dM_pct: ((shifted.M_kg - fit.M_kg) / fit.M_kg) * 100, dF0_N: shifted.F0_N - fit.F0_N }
  }
  return { trials, points, fit, massComparison, reactionEffect }
}
