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
 * CONVENTION. Analog scale (ruler, vernier caliper): the observer can read to half of the smallest division d,
 * giving half-width a = d/2 and u = a / sqrt(3) = d / sqrt(12). Numerically equal to typeBDigital(d); both are kept
 * so the analysis panel can show the reasoning that matches the instrument. For a vernier, d is its least count.
 */
export function typeBAnalog(smallestDivision: number): number {
  const halfWidth = smallestDivision / 2
  return halfWidth / Math.sqrt(3)
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

/** Mean of repeated readings with Type A (s/sqrt(n)), Type B and combined uncertainty. */
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
}

/**
 * Round sigma to 1 or 2 significant digits (2 when its leading digit is 1 or 2, where one digit would lose too
 * much: 0.14 -> 0.14, 0.36 -> 0.4) and the value to the same decimal place (Taylor ch. 2, GUM 7.2.6).
 */
export function roundWithUncertainty(value: number, sigma: number): Rounded {
  if (!(sigma > 0) || !Number.isFinite(sigma)) return { value, sigma: 0, decimals: 3 }
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
  return { value: Math.round(value * 10 ** decimals) / 10 ** decimals, sigma: s, decimals }
}
