// Analysis of Table 1.1 (guide section 1.4, tasks 1 to 10). Pure: takes the table values, returns numbers. All statistics,
// fits and propagation come from src/physics; this module only arranges them per task. Views read the result.
//
// Conventions (documented in the panel and in help):
//  * Time of a mark: t_bar = mean of the readings; u(t_bar) = sqrt(uA^2 + uRes^2 + uReact^2) with uA = s/sqrt(n) (GUM Type A),
//    uRes = 0.01 s / sqrt(12) (digital display, Type B) and uReact = reactionBiasTypeB_s() (the unknown mean bias between the
//    start and stop presses; common to all readings, so it does not average down). Taylor ch. 4; GUM 4.2, 4.3.7.
//  * Position of a mark: nominal 10 cm steps with sigma_x = sqrt(2) * rail division / sqrt(12) (two scale readings, A and the mark).
//    The origin (t = 0, x = 0) is kept in the fit (physics/fit.ts option (a)) with sigma_x = release-position sigma, sigma_t = 0.
//  * The Type B bias is treated as independent per mark for the fit and for the velocities, which is a simplification
//    (it is common to all marks); the comparison block shows the real effect.
import {
  DEFAULT_CART, DEFAULT_VARIABILITY, RAIL_DIVISION_m, STOPWATCH_RESOLUTION_s, combinedUncertainty, constantAcceleration_mps2,
  meanVelocity, quadraticFitEffectiveVariance, quadraticPosition_m, quadraticVelocity, reactionBiasTypeB_s, repeatedStats,
  typeBAnalog, typeBDigital, type QuadraticFit,
} from '../physics/index.ts'

export const TABLE_POSITIONS_CM: readonly number[] = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90]
/** Marks needed for a fit: this many marks with at least MIN_READINGS_FOR_FIT readings (plus the origin). */
export const MIN_MARKS_FOR_FIT = 3
export const MIN_READINGS_FOR_FIT = 2
/** sigma_x of a mark position: distance between two scale readings (A and the mark), m. */
export const SIGMA_X_MARK_m = Math.SQRT2 * typeBAnalog(RAIL_DIVISION_m)
/** sigma_x of the origin: how well the cart front sits on A at the release, m (variability.ts, ASSUMED). */
export const SIGMA_X_ORIGIN_m = DEFAULT_VARIABILITY.sigma_release_m

export interface MarkStat {
  row: number
  x_cm: number
  x_m: number
  readings_s: number[]
  n: number
  mean_s: number | null
  /** Sample standard deviation s (0 with one reading). */
  sd_s: number
  /** Type A, s/sqrt(n). */
  uA_s: number
  /** Type B of the display resolution. */
  uRes_s: number
  /** Type B of the reaction bias. */
  uReact_s: number
  /** Combined standard uncertainty of the mean. null when there is no reading. */
  u_s: number | null
}

export interface Velocity {
  from_cm: number
  to_cm: number
  v_mps: number
  sigma_v_mps: number
}

export interface FitPoint {
  t_s: number
  x_m: number
  sigmaX_m: number
  sigmaT_s: number
  sigmaEff_m: number
  isOrigin: boolean
  row: number
}

export interface FitData {
  points: FitPoint[]
  fit: QuadraticFit
  /** Residuals x - x_fit(t) per point, m. */
  residuals_m: number[]
  tMax_s: number
}

export interface AnalysisResult {
  marks: MarkStat[]
  /** Marks (rows 1..9) with at least one reading. */
  marksWithData: number
  /** Marks usable for the fit (>= MIN_READINGS_FOR_FIT readings). */
  marksForFit: number
  readingsTotal: number
  whole: Velocity | null
  d30: Array<Velocity | null>
  d10: Array<Velocity | null>
  fit: FitData | null
  /** Task 9: v(t_90) from the fit and twice the mean velocity 0..90 cm. */
  vEnd: { fitted_mps: number; sigma_fitted_mps: number; twiceMean_mps: number; sigma_twiceMean_mps: number; t_s: number } | null
}

export function stopwatchTypeB_s(reactionHalfWidth_s = 0.1): { res: number; react: number } {
  return { res: typeBDigital(STOPWATCH_RESOLUTION_s), react: reactionBiasTypeB_s(reactionHalfWidth_s) }
}

/** Per-mark statistics (task 1). `values_s[row]` are the Table 1.1 readings (nulls allowed). */
export function markStats(values_s: readonly (readonly (number | null)[])[], reactionHalfWidth_s = 0.1): MarkStat[] {
  const b = stopwatchTypeB_s(reactionHalfWidth_s)
  return TABLE_POSITIONS_CM.map((x_cm, row): MarkStat => {
    const xs = (values_s[row] ?? []).filter((v): v is number => v !== null)
    if (row === 0 || xs.length === 0) {
      return { row, x_cm, x_m: x_cm / 100, readings_s: xs, n: xs.length, mean_s: row === 0 ? 0 : null, sd_s: 0, uA_s: 0, uRes_s: 0, uReact_s: 0, u_s: row === 0 ? 0 : null }
    }
    const s = repeatedStats(xs, combinedUncertainty(b.res, b.react))
    return { row, x_cm, x_m: x_cm / 100, readings_s: xs, n: s.n, mean_s: s.mean, sd_s: s.sd, uA_s: s.uA, uRes_s: b.res, uReact_s: b.react, u_s: s.u }
  })
}

function velocityBetween(marks: readonly MarkStat[], r1: number, r2: number): Velocity | null {
  const m1 = marks[r1], m2 = marks[r2]
  if (!m1 || !m2 || m1.mean_s === null || m2.mean_s === null || m1.u_s === null || m2.u_s === null) return null
  if (!(m2.mean_s > m1.mean_s)) return null
  const sx = (m: MarkStat): number => (m.row === 0 ? SIGMA_X_ORIGIN_m : SIGMA_X_MARK_m)
  const v = meanVelocity(m1.x_m, m1.mean_s, m2.x_m, m2.mean_s, sx(m1), sx(m2), m1.u_s, m2.u_s)
  return { from_cm: m1.x_cm, to_cm: m2.x_cm, v_mps: v.v_mps, sigma_v_mps: v.sigma_v_mps }
}

/** Points of the fit: origin plus every mark with enough readings. null when there are too few marks. */
export function fitPoints(marks: readonly MarkStat[]): FitPoint[] | null {
  const usable = marks.filter((m) => m.row > 0 && m.n >= MIN_READINGS_FOR_FIT && m.mean_s !== null && m.u_s !== null)
  if (usable.length < MIN_MARKS_FOR_FIT) return null
  const pts: FitPoint[] = [{ t_s: 0, x_m: 0, sigmaX_m: SIGMA_X_ORIGIN_m, sigmaT_s: 0, sigmaEff_m: SIGMA_X_ORIGIN_m, isOrigin: true, row: 0 }]
  for (const m of usable) pts.push({ t_s: m.mean_s!, x_m: m.x_m, sigmaX_m: SIGMA_X_MARK_m, sigmaT_s: m.u_s!, sigmaEff_m: 0, isOrigin: false, row: m.row })
  return pts
}

/** Task 6: quadratic fit x(t) = c0 + c1 t + c2 t^2 with the effective-variance method (times are the noisy variable). */
export function fitFromPoints(pts: FitPoint[]): FitData {
  const r = quadraticFitEffectiveVariance(pts.map((p) => p.t_s), pts.map((p) => p.x_m), pts.map((p) => p.sigmaX_m), pts.map((p) => p.sigmaT_s))
  const points = pts.map((p, k) => ({ ...p, sigmaEff_m: r.sigmaEff_m[k]! }))
  return {
    points, fit: r.fit,
    residuals_m: points.map((p) => p.x_m - quadraticPosition_m(r.fit, p.t_s)),
    tMax_s: Math.max(...points.map((p) => p.t_s)),
  }
}

/** The whole analysis from the table values. Safe with empty or partial tables. */
export function analyse(values_s: readonly (readonly (number | null)[])[], reactionHalfWidth_s = 0.1): AnalysisResult {
  const marks = markStats(values_s, reactionHalfWidth_s)
  const whole = velocityBetween(marks, 0, 9)
  const d30 = [[0, 3], [3, 6], [6, 9]].map(([a, b]) => velocityBetween(marks, a!, b!))
  const d10 = Array.from({ length: 9 }, (_, i) => velocityBetween(marks, i, i + 1))
  const pts = fitPoints(marks)
  const fit = pts ? fitFromPoints(pts) : null
  let vEnd: AnalysisResult['vEnd'] = null
  const m9 = marks[9]!
  if (fit && whole && m9.mean_s !== null) {
    const v = quadraticVelocity(fit.fit, m9.mean_s)
    vEnd = { fitted_mps: v.v_mps, sigma_fitted_mps: v.sigma_v_mps, twiceMean_mps: 2 * whole.v_mps, sigma_twiceMean_mps: 2 * whole.sigma_v_mps, t_s: m9.mean_s }
  }
  return {
    marks,
    marksWithData: marks.filter((m) => m.row > 0 && m.n > 0).length,
    marksForFit: marks.filter((m) => m.row > 0 && m.n >= MIN_READINGS_FOR_FIT).length,
    readingsTotal: marks.reduce((a, m) => a + (m.row > 0 ? m.n : 0), 0),
    whole, d30, d10, fit, vEnd,
  }
}

// ---- comparison with the DigiCart record and the model --------------------------------------------------------------------

export interface ComparisonInput {
  /** One entry per released run: true crossing time of each mark (index 0 = A), s; null when never crossed. */
  runTimes_s: Array<ReadonlyArray<number | null>>
  /** Table cells that came from a stopwatch stop: the student's reading and the true crossing time of that run and mark. */
  pairs: Array<{ row: number; reading_s: number; true_s: number }>
  /** Expected a of the model at the actual incline, m/s^2 (teacher only). null when unknown. */
  aModel_mps2: number | null
}

export interface Comparison {
  /** Fit of the true crossing times of all runs (the DigiCart reference). */
  reference: { a_mps2: number; sigma_a_mps2: number; runs: number; fit: QuadraticFit } | null
  /** Mean offset of your readings minus the true times, per mark row (1..9). */
  offsets: Array<{ row: number; x_cm: number; n: number; mean_s: number; sem_s: number } | null>
  aModel_mps2: number | null
}

export function compare(input: ComparisonInput): Comparison {
  const pts: FitPoint[] = [{ t_s: 0, x_m: 0, sigmaX_m: SIGMA_X_ORIGIN_m, sigmaT_s: 0, sigmaEff_m: SIGMA_X_ORIGIN_m, isOrigin: true, row: 0 }]
  let marksOk = 0
  for (let row = 1; row < TABLE_POSITIONS_CM.length; row++) {
    const ts = input.runTimes_s.map((r) => r[row] ?? null).filter((v): v is number => v !== null)
    if (ts.length < 2) continue
    const s = repeatedStats(ts, 0)
    marksOk++
    pts.push({ t_s: s.mean, x_m: TABLE_POSITIONS_CM[row]! / 100, sigmaX_m: SIGMA_X_MARK_m, sigmaT_s: Math.max(s.uA, 1e-4), sigmaEff_m: 0, isOrigin: false, row })
  }
  let reference: Comparison['reference'] = null
  if (marksOk >= MIN_MARKS_FOR_FIT) {
    const f = fitFromPoints(pts).fit
    reference = { a_mps2: f.a_mps2, sigma_a_mps2: f.sigma_a_mps2, runs: input.runTimes_s.length, fit: f }
  }
  const offsets = TABLE_POSITIONS_CM.map((x_cm, row) => {
    if (row === 0) return null
    const d = input.pairs.filter((p) => p.row === row).map((p) => p.reading_s - p.true_s)
    if (d.length === 0) return null
    const s = repeatedStats(d, 0)
    return { row, x_cm, n: s.n, mean_s: s.mean, sem_s: s.uA }
  })
  return { reference, offsets, aModel_mps2: input.aModel_mps2 }
}

/** Expected a of the model for the given true incline (the "model" a, constant-force part), m/s^2. */
export function modelAcceleration_mps2(theta_rad: number): number {
  return constantAcceleration_mps2({ ...DEFAULT_CART, theta_rad })
}

// ---- curves for the plots (sampled from the fit; the views only draw them) ------------------------------------------------

/** Fitted x(t) sampled over [0, tMax * 1.05]. */
export function xtCurve(f: FitData, n = 60): Array<{ t: number; x: number }> {
  const end = f.tMax_s * 1.05
  return Array.from({ length: n + 1 }, (_, i) => { const t = (end * i) / n; return { t, x: quadraticPosition_m(f.fit, t) } })
}

/** Fitted v(t) = c1 + 2 c2 t (task 7) with its propagated sigma, sampled over [0, tMax * 1.05]. */
export function vtCurve(f: FitData, n = 40): Array<{ t: number; v: number; sigma: number }> {
  const end = f.tMax_s * 1.05
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = (end * i) / n
    const q = quadraticVelocity(f.fit, t)
    return { t, v: q.v_mps, sigma: q.sigma_v_mps }
  })
}

/** Tangent of the fitted x(t) at t0: its point, slope (= instantaneous velocity) and a segment to draw. */
export function tangentAt(f: FitData, t0_s: number): { t_s: number; x_m: number; v_mps: number; sigma_v_mps: number; segment: Array<{ t: number; x: number }> } {
  const x0 = quadraticPosition_m(f.fit, t0_s)
  const q = quadraticVelocity(f.fit, t0_s)
  const half = 0.3 * f.tMax_s
  const seg = [t0_s - half, t0_s, t0_s + half].filter((t) => t >= 0).map((t) => ({ t, x: x0 + q.v_mps * (t - t0_s) }))
  return { t_s: t0_s, x_m: x0, v_mps: q.v_mps, sigma_v_mps: q.sigma_v_mps, segment: seg }
}

/** Residuals of the marks (not the origin) in mm with their effective sigma in mm. */
export function residualsMm(f: FitData): Array<{ t: number; r_mm: number; sigma_mm: number }> {
  return f.points.map((p, k) => ({ p, r: f.residuals_m[k]! })).filter(({ p }) => !p.isOrigin)
    .map(({ p, r }) => ({ t: p.t_s, r_mm: r * 1000, sigma_mm: p.sigmaEff_m * 1000 }))
}
