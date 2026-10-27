// Analysis of Practica 4 (pure, DOM-free): Tabla 4.1 means and the force-weight fit per face, Tabla 4.2 static coefficients, Tabla 4.3 slide
// coefficients, and the comparison with a literature value the STUDENT looked up (the app never supplies literature values).
// Never answers the qualitative questions (static or kinetic, which pair has the largest coefficient, whether mu_s > mu_k was shown).
// Uncertainty follows statistics.ts (GUM): Type A s/sqrt(n), Type B d/sqrt(12), combined in quadrature; Taylor ch. 8 for weighted fits.
import {
  G_QUITO_mps2, combinedUncertainty, compareToExpected, mean, reactionBiasTypeB_s, repeatedStats, sampleSd, sem, typeBAnalog, typeBDigital,
  weightedLinearFit, STOPWATCH_RESOLUTION_s, TAPE_DIVISION_m, type Comparison, type RepeatedStats, type WeightedFit,
} from '../../../core/physics/index.ts'
import { SPRING_SCALES } from '../../../core/instruments/springScale.ts'
import { COURSE_m, MASS_NOMINAL_kg, RAIL_SUPPORT_DIST_m } from '../physics/constants.ts'
import { inclineAngle_rad, muFromSlide } from '../physics/incline.ts'
import { BALANCE_RESOLUTION_kg } from '../apparatus/constants.ts'

/** Uncertainty of local g in the weights, m/s^2 (same ASSUMED value as Practica 2). */
export const G_UNCERTAINTY_mps2 = 0.005
/** Division assumed for a typed reading with no known scale: the finer scale (1 N), N. */
export const DEFAULT_DIVISION_N = SPRING_SCALES['1N'].division_N

// ---- Tabla 4.1 / 4.2 -----------------------------------------------------------------------------------------------
export interface ForceRowInput {
  /** Readings in N (nulls ignored). */
  readings_N: readonly (number | null)[]
  /** Smallest division of the scale used, N (0.02 for 1 N, 0.05 for 2 N). */
  division_N: number
}
export interface ForceRow extends RepeatedStats {
  /** Combined uncertainty used as Delta F, N. */
  dF_N: number
  division_N: number
}
/** Mean force with Type A (s/sqrt(n)) and Type B (analog scale, d/sqrt(12)) uncertainty. Null when there are no readings. */
export function forceRow(r: ForceRowInput): ForceRow | null {
  const xs = r.readings_N.filter((x): x is number => x !== null)
  if (xs.length === 0) return null
  const st = repeatedStats(xs, typeBAnalog(r.division_N))
  return { ...st, dF_N: st.u, division_N: r.division_N }
}

export interface Table41Input {
  /** Student's balance reading of the block, kg. */
  M_kg: number
  /** Mass the student uses for each added silver mass, kg (nominal 0.050 unless weighed). */
  mEach_kg?: number
  /** [row][rep] readings, row = face index * 4 + added masses. */
  rows: readonly ForceRowInput[]
}
export interface FaceFit {
  face: 'cloth' | 'sandpaper'
  /** Weights W = (M + m) g and mean forces used, N. */
  W_N: number[]
  F_N: number[]
  dF_N: number[]
  /** Added masses (0..3) of the rows used. */
  masses: number[]
  fit: WeightedFit | null
  /** Slope = mu_k estimate; uncertainty scaled by sqrt(max(1, chi2_red)) (Taylor 8.4: a poor fit widens the error). */
  mu_k: number | null
  sigma_mu_k: number | null
  /** Intercept, N: the force at zero weight (a non-zero value signals a zero error or a constant offset). */
  intercept_N: number | null
  sigma_intercept_N: number | null
  /** Rows whose readings touched the 1 N stop (all readings at full scale). */
  rowsAtStop: number[]
}
export interface Table41Result { rows: (ForceRow | null)[]; fits: FaceFit[] }

const FACES = ['cloth', 'sandpaper'] as const
/** Weight W = (M + n m) g in N and its standard uncertainty (balance 0.1 g digit as Type B, g uncertainty). */
export function weight_N(M_kg: number, n_added: number, mEach_kg: number = MASS_NOMINAL_kg, g_mps2: number = G_QUITO_mps2): { W_N: number; sigma_W_N: number } {
  const m = M_kg + n_added * mEach_kg
  const sM = typeBDigital(BALANCE_RESOLUTION_kg)
  // masses taken at their nominal value; the 0.5 % scatter of each (PARAMETERS.md) is not known to the student
  const sigma_m = combinedUncertainty(sM, n_added * 0.005 * mEach_kg)
  return { W_N: m * g_mps2, sigma_W_N: Math.sqrt((g_mps2 * sigma_m) ** 2 + (m * G_UNCERTAINTY_mps2) ** 2) }
}

/**
 * Task 2 and 3 of the guide (exp. 1): per face a weighted straight line of mean force against weight, F = mu_k W + F0 (Taylor ch. 8:
 * weights 1/(Delta F)^2; errors in W, about 0.01 N, are negligible next to Delta F and ignored). The slope is the kinetic coefficient
 * for motion at constant speed (F = mu_k N, N = W on a level table).
 */
export function table41(inp: Table41Input): Table41Result {
  const mEach = inp.mEach_kg ?? MASS_NOMINAL_kg
  const rows = inp.rows.map((r) => forceRow(r))
  const fits: FaceFit[] = FACES.map((face, fi) => {
    const W_N: number[] = [], F_N: number[] = [], dF_N: number[] = [], masses: number[] = [], rowsAtStop: number[] = []
    for (let k = 0; k < 4; k++) {
      const row = rows[fi * 4 + k]
      if (!row) continue
      W_N.push(weight_N(inp.M_kg, k, mEach).W_N); F_N.push(row.mean); dF_N.push(row.dF_N); masses.push(k)
      const rr = inp.rows[fi * 4 + k]!
      const full = SPRING_SCALES['1N'].range_N
      if (rr.division_N === SPRING_SCALES['1N'].division_N && rr.readings_N.some((x) => x !== null && x >= full - 1e-9)) rowsAtStop.push(k)
    }
    if (W_N.length < 2) return { face, W_N, F_N, dF_N, masses, fit: null, mu_k: null, sigma_mu_k: null, intercept_N: null, sigma_intercept_N: null, rowsAtStop }
    const fit = weightedLinearFit(W_N, F_N, dF_N)
    const widen = fit.chi2_red !== null ? Math.sqrt(Math.max(1, fit.chi2_red)) : 1
    return { face, W_N, F_N, dF_N, masses, fit, mu_k: fit.slope, sigma_mu_k: fit.sigma_slope * widen, intercept_N: fit.intercept, sigma_intercept_N: fit.sigma_intercept * widen, rowsAtStop }
  })
  return { rows, fits }
}

export interface StaticCoefficient {
  face: 'cloth' | 'sandpaper'
  Fmax: ForceRow
  /** mu = F_max / (M g). */
  mu_s: number
  sigma_mu_s: number
}
/**
 * Task 4 (exp. 2): at the point of breakaway the applied force equals the maximum static friction, F_max = mu_s N with N = M g (no added
 * masses), so mu_s = F_max / (M g). Propagation (GUM 5.1.2, independent terms):
 * (sigma_mu / mu)^2 = (u_F / F)^2 + (u_M / M)^2 + (u_g / g)^2.
 */
export function table42(rows: readonly ForceRowInput[], M_kg: number, g_mps2: number = G_QUITO_mps2): (StaticCoefficient | null)[] {
  return rows.map((r, i) => {
    const row = forceRow(r)
    if (!row || !(row.mean > 0)) return null
    const mu_s = row.mean / (M_kg * g_mps2)
    const uM = typeBDigital(BALANCE_RESOLUTION_kg)
    const rel = Math.sqrt((row.dF_N / row.mean) ** 2 + (uM / M_kg) ** 2 + (G_UNCERTAINTY_mps2 / g_mps2) ** 2)
    return { face: FACES[i] ?? 'cloth', Fmax: row, mu_s, sigma_mu_s: mu_s * rel }
  })
}

// ---- Tabla 4.3 -----------------------------------------------------------------------------------------------------------
export interface InclineTrialInput { h_m: number | null; t_s: number | null }
export interface InclineTrialResult {
  h_m: number
  t_s: number
  theta_rad: number
  /** a = 2 d / t^2 (MRUV from rest). */
  a_mps2: number
  /** mu = tan(theta) - a / (g cos theta). */
  mu: number
  /** Standard uncertainty of this trial's mu from the time (reaction bias + display) and the tape reading of h. */
  sigma_mu_t: number
  sigma_mu_h: number
}
export interface InclineMaterialResult {
  trials: (InclineTrialResult | null)[]
  n: number
  mu: number | null
  /** delta mu = combined(s/sqrt(n), mean time term, mean height term). */
  delta_mu: number | null
  sd: number | null
  uA: number | null
}
export interface InclineOptions {
  /** Course length d, m (the guide's 1.00 m unless the student marked another). */
  d_m?: number
  /** Distance from the table contact to the raised support, m (RAIL_SUPPORT_DIST_m: stated on the help page). */
  L_m?: number
  g_mps2?: number
}
/** Time uncertainty of one hand timing, s: display (0.01 s digital) with the reaction bias (ASSUMED half-width 0.1 s), in quadrature. */
export const slideTimeUncertainty_s = (): number => combinedUncertainty(typeBDigital(STOPWATCH_RESOLUTION_s), reactionBiasTypeB_s())
/** Tape reading uncertainty of h, m (analog tape, 1 mm). */
export const heightUncertainty_m = (): number => typeBAnalog(TAPE_DIVISION_m)

/**
 * Tasks 1 to 5 of exp. 3: theta = asin(h / L); a = 2 d / t^2 (MRUV from rest, constant angle); free-body diagram along the rail
 * m a = m g sin(theta) - mu m g cos(theta) gives mu = tan(theta) - a / (g cos(theta)). Propagation per trial:
 * du/da = -1/(g cos theta), da/dt = -2a/t, du/dtheta = sec^2(theta) - a sin(theta)/(g cos^2 theta), dtheta/dh = 1/(L cos theta).
 */
export function inclineTrial(h_m: number, t_s: number, o: InclineOptions = {}): InclineTrialResult | null {
  const d = o.d_m ?? COURSE_m, L = o.L_m ?? RAIL_SUPPORT_DIST_m, g = o.g_mps2 ?? G_QUITO_mps2
  if (!(h_m > 0) || !(h_m < L) || !(t_s > 0) || !(d > 0)) return null
  const theta_rad = inclineAngle_rad(h_m, L)
  const a_mps2 = (2 * d) / (t_s * t_s)
  const mu = muFromSlide(theta_rad, a_mps2, g)
  const c = Math.cos(theta_rad), s = Math.sin(theta_rad)
  const sigma_mu_t = ((2 * a_mps2) / t_s / (g * c)) * slideTimeUncertainty_s()
  const dMuDTheta = 1 / (c * c) - (a_mps2 * s) / (g * c * c)
  const sigma_mu_h = Math.abs(dMuDTheta / (L * c)) * heightUncertainty_m()
  return { h_m, t_s, theta_rad, a_mps2, mu, sigma_mu_t, sigma_mu_h }
}
export function table43Material(trials: readonly InclineTrialInput[], o: InclineOptions = {}): InclineMaterialResult {
  const res = trials.map((t) => (t.h_m !== null && t.t_s !== null ? inclineTrial(t.h_m, t.t_s, o) : null))
  const ok = res.filter((r): r is InclineTrialResult => r !== null)
  if (ok.length === 0) return { trials: res, n: 0, mu: null, delta_mu: null, sd: null, uA: null }
  const mus = ok.map((r) => r.mu)
  const uA = sem(mus)
  const delta_mu = combinedUncertainty(uA, mean(ok.map((r) => r.sigma_mu_t)), mean(ok.map((r) => r.sigma_mu_h)))
  return { trials: res, n: ok.length, mu: mean(mus), delta_mu, sd: sampleSd(mus), uA }
}

// ---- literature comparison (task 7) ----------------------------------------------------------------------------------------------
export interface LiteratureComparison {
  /** (value - literature) / literature, percent (signed). */
  relativeError_pct: number
  comparison: Comparison
}
/** Compare a result with a value the student cites from their own source. The app never supplies the literature value. */
export function compareWithLiterature(value: number, sigma: number, literature: number, sigmaLiterature = 0): LiteratureComparison | null {
  if (!(literature > 0) || !Number.isFinite(value)) return null
  return { relativeError_pct: ((value - literature) / literature) * 100, comparison: compareToExpected(value, sigma, literature, sigmaLiterature) }
}

// ---- everything ----------------------------------------------------------------------------------------------------------------------
export interface FrictionAnalysisInput {
  M_kg: number | null
  mEach_kg?: number
  t41: readonly ForceRowInput[]
  t42: readonly ForceRowInput[]
  t43: readonly (readonly InclineTrialInput[])[]
  options?: InclineOptions
}
export interface FrictionAnalysis {
  t41: Table41Result | null
  t42: (StaticCoefficient | null)[]
  t43: InclineMaterialResult[]
}
export function fullAnalysis(inp: FrictionAnalysisInput): FrictionAnalysis {
  const M = inp.M_kg
  return {
    t41: M !== null && M > 0 ? table41({ M_kg: M, ...(inp.mEach_kg !== undefined ? { mEach_kg: inp.mEach_kg } : {}), rows: inp.t41 }) : null,
    t42: M !== null && M > 0 ? table42(inp.t42, M) : inp.t42.map(() => null),
    t43: inp.t43.map((m) => table43Material(m, inp.options ?? {})),
  }
}
