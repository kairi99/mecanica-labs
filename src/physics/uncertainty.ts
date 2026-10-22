// Propagation of uncertainty for the analysis tasks (mean velocities) and comparison with an expected value.
// Pure. GUM (JCGM 100) 5.1; Taylor ch. 3.

export interface MeanVelocity {
  v_mps: number
  sigma_v_mps: number
}

/**
 * Mean velocity over an interval, v = (x2 - x1) / (t2 - t1), with uncertainty propagated for independent errors:
 * sigma_v^2 = [sigma_x1^2 + sigma_x2^2 + v^2 (sigma_t1^2 + sigma_t2^2)] / (t2 - t1)^2 (GUM 5.1.2).
 * Positions in m, times in s (t1 is 0 with sigma_t1 = 0 when the interval starts at the stopwatch start).
 * CORRELATION: consecutive intervals (marks i-1,i and i,i+1) share the time (and position) of the common mark, so
 * their velocities are correlated (negatively for the shared time error); this function treats one interval only and
 * the independence assumption does not hold between neighbouring intervals.
 */
export function meanVelocity(
  x1_m: number, t1_s: number, x2_m: number, t2_s: number,
  sigma_x1_m = 0, sigma_x2_m = 0, sigma_t1_s = 0, sigma_t2_s = 0,
): MeanVelocity {
  const dt = t2_s - t1_s
  if (!(dt > 0)) throw new Error('meanVelocity needs t2 > t1')
  const v = (x2_m - x1_m) / dt
  const sigma = Math.sqrt(sigma_x1_m ** 2 + sigma_x2_m ** 2 + v * v * (sigma_t1_s ** 2 + sigma_t2_s ** 2)) / dt
  return { v_mps: v, sigma_v_mps: sigma }
}

export type Agreement = 'within1' | 'within2' | 'beyond2'
export interface Comparison {
  /** (value - expected) / expected, percent. */
  deviation_pct: number
  /** (value - expected) / sigma_tot, signed; Infinity if sigma_tot is 0 and the values differ. */
  deviation_sigma: number
  sigma_tot: number
  verdict: Agreement
}

/**
 * Compare a result with an expected value in units of the combined standard uncertainty (Taylor ch. 5).
 * `sigma` is the combined standard uncertainty, or an array of independent contributions combined here in
 * quadrature (e.g. [fit sigma_a, the a-uncertainty from the time bias reactionBiasTypeB_s()]); `sigmaExpected` is
 * added in quadrature too.
 */
export function compareToExpected(value: number, sigma: number | readonly number[], expected: number, sigmaExpected = 0): Comparison {
  const diff = value - expected
  const parts = typeof sigma === 'number' ? [sigma] : sigma
  const s = Math.sqrt(parts.reduce((a, b) => a + b * b, sigmaExpected * sigmaExpected))
  const nSigma = s > 0 ? diff / s : diff === 0 ? 0 : Math.sign(diff) * Infinity
  const a = Math.abs(nSigma)
  return {
    deviation_pct: (diff / expected) * 100,
    deviation_sigma: nSigma,
    sigma_tot: s,
    verdict: a <= 1 ? 'within1' : a <= 2 ? 'within2' : 'beyond2',
  }
}
