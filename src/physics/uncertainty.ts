// Propagation of uncertainty for the analysis tasks (mean velocities) and comparison with an expected value.
// Pure. GUM (JCGM 100) 5.1; Taylor ch. 3.

export interface MeanVelocity {
  v_mps: number
  sigma_v_mps: number
}

/**
 * Mean velocity over an interval, v = (x2 - x1) / (t2 - t1), with uncertainty propagated for independent errors:
 * sigma_v^2 = [sigma_x1^2 + sigma_x2^2 + v^2 (sigma_t1^2 + sigma_t2^2)] / (t2 - t1)^2.
 * Positions in m, times in s (here t1 is usually 0 with sigma_t1 = 0, the start of the stopwatch).
 */
export function meanVelocity(
  x1_m: number, t1_s: number, x2_m: number, t2_s: number,
  sigma_x_m = 0, sigma_t1_s = 0, sigma_t2_s = 0,
): MeanVelocity {
  const dt = t2_s - t1_s
  if (!(dt > 0)) throw new Error('meanVelocity needs t2 > t1')
  const v = (x2_m - x1_m) / dt
  const sigma = Math.sqrt(2 * sigma_x_m ** 2 + v * v * (sigma_t1_s ** 2 + sigma_t2_s ** 2)) / dt
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

/** Compare a result with an expected value in units of the combined standard uncertainty (Taylor ch. 5). */
export function compareToExpected(value: number, sigma: number, expected: number, sigmaExpected = 0): Comparison {
  const diff = value - expected
  const s = Math.sqrt(sigma * sigma + sigmaExpected * sigmaExpected)
  const nSigma = s > 0 ? diff / s : diff === 0 ? 0 : Math.sign(diff) * Infinity
  const a = Math.abs(nSigma)
  return {
    deviation_pct: (diff / expected) * 100,
    deviation_sigma: nSigma,
    sigma_tot: s,
    verdict: a <= 1 ? 'within1' : a <= 2 ? 'within2' : 'beyond2',
  }
}
