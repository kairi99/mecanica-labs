// Basic statistics and measurement-uncertainty conventions (GUM, JCGM 100; Taylor, "An Introduction to Error Analysis").
// Pure, DOM-free.

export function mean(xs: readonly number[]): number {
  if (xs.length < 1) throw new Error('mean needs >=1 value')
  return xs.reduce((a, b) => a + b, 0) / xs.length
}

/** Sample standard deviation s (n-1 dof); 0 for a single value. */
export function sampleSd(xs: readonly number[]): number {
  const n = xs.length
  if (n < 2) return 0
  const m = mean(xs)
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1))
}

/** Standard error of the mean s / sqrt(n). */
export function sem(xs: readonly number[]): number {
  return xs.length < 1 ? 0 : sampleSd(xs) / Math.sqrt(xs.length)
}

/**
 * CONVENTION (Type B, rectangular distribution). A reading known only to the instrument resolution r lies uniformly
 * within +-r/2 of the shown value, so the standard uncertainty is (r/2)/sqrt(3) = r / sqrt(12) (GUM 4.3.7).
 * Digital display (stopwatch, digital caliper): r is the last displayed digit.
 */
export function typeBDigital(resolution: number): number {
  return resolution / Math.sqrt(12)
}

/**
 * CONVENTION. Analog scale (ruler, vernier caliper): the observer reads to the nearest division d, so the true value
 * lies within a half-width a = d/2 (rectangular) and u = a / sqrt(3) = d / sqrt(12). Numerically equal to
 * typeBDigital(d); both are kept so the analysis panel can show the reasoning that matches the instrument. For a
 * vernier, d is its least count. NOTE: the commonly taught "maximum error" d/2 is the HALF-WIDTH a, not the standard
 * uncertainty u (u = a/sqrt(3) = 0.29 d).
 */
export function typeBAnalog(smallestDivision: number): number {
  const halfWidth = smallestDivision / 2
  return halfWidth / Math.sqrt(3)
}

/**
 * Type B standard uncertainty, s, of the unknown mean reaction bias (stop delay minus start delay) of a hand-held
 * stopwatch: rectangular with half-width halfWidth_s, u = halfWidth_s / sqrt(3). The default half-width 0.1 s is
 * ASSUMED, a typical range of human visual reaction-time asymmetry (~0.1-0.2 s total reaction, differences between
 * start and stop of order 0.1 s); not measured. Does not average down with n.
 */
export function reactionBiasTypeB_s(halfWidth_s = 0.1): number {
  return halfWidth_s / Math.sqrt(3)
}

/** Combined standard uncertainty of independent contributions: root sum of squares. */
export function combinedUncertainty(...parts: readonly number[]): number {
  return Math.sqrt(parts.reduce((a, b) => a + b * b, 0))
}

export interface RepeatedStats {
  n: number
  mean: number
  /** Sample standard deviation s. */
  sd: number
  /** Type A: s / sqrt(n). */
  uA: number
  /** Type B: given instrument term. */
  uB: number
  /** Combined u = sqrt(uA^2 + uB^2). The type B term does not average down with n (same scale marks each time). */
  u: number
}

/**
 * Mean of repeated readings with Type A (s/sqrt(n)), Type B and combined uncertainty.
 *
 * STOPWATCH CAVEAT: for hand timing, uA = s/sqrt(n) captures only the SCATTER of the reaction delays. A mean reaction
 * bias (stop delay minus start delay, which need not be zero) is common to all n readings and does not average out.
 * Pass it in uB (e.g. combinedUncertainty(typeBDigital(0.01), reactionBiasTypeB_s())) for the combined time uncertainty.
 */
export function repeatedStats(xs: readonly number[], uB = 0): RepeatedStats {
  const m = mean(xs)
  const sd = sampleSd(xs)
  const uA = sd / Math.sqrt(xs.length)
  return { n: xs.length, mean: m, sd, uA, uB, u: combinedUncertainty(uA, uB) }
}

/** Round a value to a number of significant figures. */
export function roundSignificant(value: number, sig: number): number {
  if (value === 0 || !Number.isFinite(value)) return value
  const d = sig - 1 - Math.floor(Math.log10(Math.abs(value)))
  const f = 10 ** d
  return Math.round(value * f) / f
}

export interface Rounded {
  value: number
  sigma: number
  /** Decimal places of both (negative: rounded to tens, hundreds ...). */
  decimals: number
  /** Value and sigma as strings with `decimals` places, keeping trailing zeros (0.030, not 0.03). */
  valueText: string
  sigmaText: string
}

/** Fixed-point text with `decimals` places (negative: no decimals) keeping trailing zeros. */
export function formatFixed(x: number, decimals: number): string {
  return x.toFixed(Math.max(0, decimals))
}

/**
 * Round sigma to 1 or 2 significant digits (2 when its leading digit is 1 or 2, where one digit would lose too
 * much: 0.14 -> 0.14, 0.36 -> 0.4) and the value to the same decimal place (Taylor ch. 2, GUM 7.2.6).
 * valueText / sigmaText keep trailing zeros (sigma 0.030 stays "0.030"; a bare number would show 0.03).
 */
export function roundWithUncertainty(value: number, sigma: number): Rounded {
  if (!(sigma > 0) || !Number.isFinite(sigma)) return { value, sigma: 0, decimals: 3, valueText: formatFixed(value, 3), sigmaText: formatFixed(0, 3) }
  const exp = Math.floor(Math.log10(sigma))
  const lead = Math.floor(sigma / 10 ** exp)
  let sig = lead <= 2 ? 2 : 1
  let decimals = sig - 1 - exp
  let s = Math.round(sigma * 10 ** decimals) / 10 ** decimals
  if (sig === 2 && Math.round(s * 10 ** decimals) % 10 === 0) {
    sig = 1
    decimals -= 1
    s = Math.round(sigma * 10 ** decimals) / 10 ** decimals
  }
  if (Math.floor(Math.log10(s)) > exp) {
    sig = 1
    decimals = -Math.floor(Math.log10(s)) + sig - 1
    s = Math.round(sigma * 10 ** decimals) / 10 ** decimals
  }
  const v = Math.round(value * 10 ** decimals) / 10 ** decimals
  return { value: v, sigma: s, decimals, valueText: formatFixed(v, decimals), sigmaText: formatFixed(s, decimals) }
}
