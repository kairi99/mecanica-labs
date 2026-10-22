// Least-squares fits for position-time data. Pure, DOM-free. Taylor ch. 8 (weighted fits), ch. 8.4 / Orear (1982)
// "effective variance" for errors in the independent variable.

export interface LinearFit {
  slope: number
  intercept: number
  sigma_slope: number
  sigma_intercept: number
  r2: number
}

/** Ordinary least squares y = slope*x + intercept with standard errors (n-2 dof; sigma 0 for n<=2). */
export function linearFit(xs: readonly number[], ys: readonly number[]): LinearFit {
  const n = xs.length
  if (n < 2 || ys.length !== n) throw new Error('linearFit needs >=2 matching points')
  const mx = xs.reduce((a, b) => a + b, 0) / n
  const my = ys.reduce((a, b) => a + b, 0) / n
  let sxx = 0, sxy = 0, syy = 0
  for (let k = 0; k < n; k++) {
    sxx += (xs[k]! - mx) ** 2
    sxy += (xs[k]! - mx) * (ys[k]! - my)
    syy += (ys[k]! - my) ** 2
  }
  const slope = sxy / sxx
  const intercept = my - slope * mx
  let ssr = 0
  for (let k = 0; k < n; k++) ssr += (ys[k]! - (slope * xs[k]! + intercept)) ** 2
  const s2 = n > 2 ? ssr / (n - 2) : 0
  return {
    slope,
    intercept,
    sigma_slope: Math.sqrt(s2 / sxx),
    sigma_intercept: Math.sqrt(s2 * (1 / n + (mx * mx) / sxx)),
    r2: syy === 0 ? 1 : 1 - ssr / syy,
  }
}

export interface QuadraticFit {
  /** Coefficients of x = c0 + c1 t + c2 t^2: x0_m, v0_mps, a/2 in m/s^2. */
  c0: number
  c1: number
  c2: number
  /** Covariance matrix of (c0, c1, c2). */
  cov: [[number, number, number], [number, number, number], [number, number, number]]
  sigma_c0: number
  sigma_c1: number
  sigma_c2: number
  /** a = 2 c2, m/s^2, with sigma_a = 2 sigma_c2. */
  a_mps2: number
  sigma_a_mps2: number
  chi2: number
  /** n - 3. */
  dof: number
  /** chi2/dof; null if dof < 1. Only meaningful when sigma_x was given. */
  chi2_red: number | null
  /** Whether the covariance was rescaled by the residual variance (no sigma_x given). */
  rescaled: boolean
}

type M3 = [[number, number, number], [number, number, number], [number, number, number]]

function invert3(m: M3): M3 {
  const [[a, b, c], [d, e, f], [g, h, i]] = m
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g
  const det = a * A + b * B + c * C
  if (!Number.isFinite(det) || Math.abs(det) < 1e-300) throw new Error('quadratic fit: singular normal matrix')
  return [
    [A / det, -(b * i - c * h) / det, (b * f - c * e) / det],
    [B / det, (a * i - c * g) / det, -(a * f - c * d) / det],
    [C / det, -(a * h - b * g) / det, (a * e - b * d) / det],
  ]
}

/**
 * Weighted least squares x = c0 + c1 t + c2 t^2 (Taylor ch. 8) with weights 1/sigma_x^2 (scalar or per point).
 * Constant acceleration from rest: c1 ~ 0, a = 2 c2. With sigma_x given the covariance is (A^T W A)^-1 as is;
 * without it, unit weights are used and the covariance is rescaled by the residual variance s^2 = SSR/(n-3).
 */
export function weightedQuadraticFit(
  t: readonly number[], x: readonly number[], sigma_x?: number | readonly number[],
): QuadraticFit {
  const n = t.length
  if (n < 3 || x.length !== n) throw new Error('weightedQuadraticFit needs >=3 matching points')
  const sig: number[] = typeof sigma_x === 'number' ? Array(n).fill(sigma_x) : sigma_x ? [...sigma_x] : Array(n).fill(1)
  if (sig.length !== n || sig.some((s) => !(s > 0) || !Number.isFinite(s))) throw new Error('weightedQuadraticFit needs sigma > 0')
  const N: M3 = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
  const b = [0, 0, 0]
  for (let k = 0; k < n; k++) {
    const w = 1 / sig[k]! ** 2
    const phi = [1, t[k]!, t[k]! * t[k]!]
    for (let i = 0; i < 3; i++) {
      b[i]! += w * phi[i]! * x[k]!
      for (let j = 0; j < 3; j++) N[i]![j]! += w * phi[i]! * phi[j]!
    }
  }
  let cov = invert3(N)
  const c = [0, 1, 2].map((i) => cov[i]![0]! * b[0]! + cov[i]![1]! * b[1]! + cov[i]![2]! * b[2]!)
  let chi2 = 0
  for (let k = 0; k < n; k++) {
    const r = x[k]! - (c[0]! + c[1]! * t[k]! + c[2]! * t[k]! * t[k]!)
    chi2 += (r / sig[k]!) ** 2
  }
  const dof = n - 3
  const rescaled = sigma_x === undefined
  if (rescaled) {
    const s2 = dof >= 1 ? chi2 / dof : 0
    cov = cov.map((row) => row.map((v) => v * s2)) as M3
  }
  return {
    c0: c[0]!, c1: c[1]!, c2: c[2]!, cov,
    sigma_c0: Math.sqrt(cov[0][0]), sigma_c1: Math.sqrt(cov[1][1]), sigma_c2: Math.sqrt(cov[2][2]),
    a_mps2: 2 * c[2]!, sigma_a_mps2: 2 * Math.sqrt(cov[2][2]),
    chi2, dof, chi2_red: dof >= 1 ? chi2 / dof : null, rescaled,
  }
}

/** Fitted position x(t), m. */
export function quadraticPosition_m(fit: QuadraticFit, t_s: number): number {
  return fit.c0 + fit.c1 * t_s + fit.c2 * t_s * t_s
}

/** Fitted velocity v(t) = c1 + 2 c2 t (task 7) with its propagated uncertainty from the covariance matrix. */
export function quadraticVelocity(fit: QuadraticFit, t_s: number): { v_mps: number; sigma_v_mps: number } {
  const v = fit.c1 + 2 * fit.c2 * t_s
  const varV = fit.cov[1][1] + 4 * t_s * fit.cov[1][2] + 4 * t_s * t_s * fit.cov[2][2]
  return { v_mps: v, sigma_v_mps: Math.sqrt(Math.max(0, varV)) }
}

export interface EffectiveVarianceFit {
  fit: QuadraticFit
  /** Per-point effective sigma_x used in the last iteration, m. */
  sigmaEff_m: number[]
  iterations: number
}

/**
 * Quadratic fit of x vs t when the times are the noisy quantity (the stopwatch). Effective-variance method
 * (Orear 1982; Taylor ch. 8): sigma_eff^2 = sigma_x^2 + (dx/dt)^2 sigma_t^2, with dx/dt = c1 + 2 c2 t from the
 * previous fit; start from the plain sigma_x weights and iterate (default 3 times). Approximate for large sigma_t.
 */
export function quadraticFitEffectiveVariance(
  t: readonly number[], x: readonly number[],
  sigma_x: number | readonly number[], sigma_t: number | readonly number[], iterations = 3,
): EffectiveVarianceFit {
  const n = t.length
  const sx: number[] = typeof sigma_x === 'number' ? Array(n).fill(sigma_x) : [...sigma_x]
  const st: number[] = typeof sigma_t === 'number' ? Array(n).fill(sigma_t) : [...sigma_t]
  if (sx.length !== n || st.length !== n) throw new Error('quadraticFitEffectiveVariance needs per-point or scalar sigmas')
  let sigEff = sx
  let fit = weightedQuadraticFit(t, x, sigEff)
  for (let it = 0; it < iterations; it++) {
    sigEff = t.map((tk, k) => Math.hypot(sx[k]!, (fit.c1 + 2 * fit.c2 * tk) * st[k]!))
    fit = weightedQuadraticFit(t, x, sigEff)
  }
  return { fit, sigmaEff_m: sigEff, iterations }
}

export interface WeightedFit {
  slope: number
  intercept: number
  sigma_slope: number
  sigma_intercept: number
  chi2: number
  dof: number
  chi2_red: number | null
  r2: number
}

/**
 * Weighted least squares y = slope*x + intercept with weights 1/sigma^2 (Taylor ch. 8). Used for v vs t straight-line
 * checks: slope = a.
 */
export function weightedLinearFit(xs: readonly number[], ys: readonly number[], sigmas: readonly number[]): WeightedFit {
  const n = xs.length
  if (n < 2 || ys.length !== n || sigmas.length !== n) throw new Error('weightedLinearFit needs >=2 matching points')
  if (sigmas.some((s) => !(s > 0) || !Number.isFinite(s))) throw new Error('weightedLinearFit needs sigma > 0')
  let S = 0, Sx = 0, Sy = 0, Sxx = 0, Sxy = 0
  for (let k = 0; k < n; k++) {
    const w = 1 / sigmas[k]! ** 2
    S += w; Sx += w * xs[k]!; Sy += w * ys[k]!; Sxx += w * xs[k]! ** 2; Sxy += w * xs[k]! * ys[k]!
  }
  const D = S * Sxx - Sx * Sx
  const slope = (S * Sxy - Sx * Sy) / D
  const intercept = (Sxx * Sy - Sx * Sxy) / D
  const ybar = Sy / S
  let chi2 = 0, tot = 0
  for (let k = 0; k < n; k++) {
    const w = 1 / sigmas[k]! ** 2
    chi2 += w * (ys[k]! - (slope * xs[k]! + intercept)) ** 2
    tot += w * (ys[k]! - ybar) ** 2
  }
  const dof = n - 2
  return {
    slope, intercept, sigma_slope: Math.sqrt(S / D), sigma_intercept: Math.sqrt(Sxx / D),
    chi2, dof, chi2_red: dof >= 1 ? chi2 / dof : null, r2: tot === 0 ? 1 : Math.max(0, 1 - chi2 / tot),
  }
}
