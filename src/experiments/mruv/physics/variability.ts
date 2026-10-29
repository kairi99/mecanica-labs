// Run-to-run variability of the physical experiment, separate from the deterministic expectation (cart.ts).
// Every function takes an injected RNG (noise.ts mulberry32 in tests/app). All sigmas are ASSUMED; PARAMETERS.md.
import { constantAcceleration_mps2, crossingTime_s, type CartParams, type CartState } from './cart.ts'
import { LANDING_RETENTION } from './falloff.ts'
import { gaussian } from '../../../core/physics/noise.ts'

export interface VariabilityConfig {
  /** Release-position offset from the 0 cm mark, 1-sigma, m (student places the cart front by eye). */
  sigma_release_m: number
  /** Initial velocity given by the release (finger lift), scale of a HALF-normal draw |N(0,1)| sigma, m/s: a lift cannot push the cart uphill. */
  sigma_v0_mps: number
  /** Relative run-to-run scatter of c_rr (dust, track film, wheel flat spots), 1-sigma. */
  sigma_crr_rel: number
  /** Relative scatter of the horizontal speed kept at the landing of a fallen cart (falloff.ts), 1-sigma. Optional: absent = 0. */
  sigma_landing_rel?: number
}

/** ASSUMED values (PARAMETERS.md). */
export const DEFAULT_VARIABILITY: VariabilityConfig = { sigma_release_m: 0.001, sigma_v0_mps: 0.001, sigma_crr_rel: 0.05, sigma_landing_rel: 0.1 }
/** No variability: for tests of the pure expectation. */
export const NO_VARIABILITY: VariabilityConfig = { sigma_release_m: 0, sigma_v0_mps: 0, sigma_crr_rel: 0 }

export interface RunConditions {
  init: CartState
  params: CartParams
}

/**
 * Draw the conditions of one release: offset, initial velocity (half-normal, >= 0; zeroed if static friction holds the
 * cart) and this run's c_rr (never negative). The half-normal draw makes timings run early by about E|v0|/a on average.
 */
export function sampleRun(base: CartParams, rng: () => number, cfg: VariabilityConfig = DEFAULT_VARIABILITY): RunConditions {
  const s0 = cfg.sigma_release_m > 0 ? cfg.sigma_release_m * gaussian(rng) : 0
  let v0 = cfg.sigma_v0_mps > 0 ? cfg.sigma_v0_mps * Math.abs(gaussian(rng)) : 0
  const crr = cfg.sigma_crr_rel > 0 ? Math.max(0, base.c_rr * (1 + cfg.sigma_crr_rel * gaussian(rng))) : base.c_rr
  const params = { ...base, c_rr: crr }
  // A cart that static friction (kinetic resistances + breakaway) would hold is not set going by the ~1 mm/s lift jolt.
  if (constantAcceleration_mps2(params) === 0) v0 = 0
  return { init: { s_m: s0, v_mps: v0 }, params }
}

/**
 * True time, s, from release to the cart front crossing mark_m for one randomly varied release. This is the physical
 * event time; the student's stopwatch presses (reaction time, resolution) are added by the apparatus layer.
 * Returns null if the cart never reaches the mark.
 */
export function sampleCrossingTime_s(mark_m: number, base: CartParams, rng: () => number, cfg: VariabilityConfig = DEFAULT_VARIABILITY): number | null {
  const run = sampleRun(base, rng, cfg)
  return crossingTime_s(mark_m, run.params, run.init)
}

/**
 * Fraction of the horizontal speed a fallen cart keeps at its landing for one run: the expectation LANDING_RETENTION
 * times (1 + sigma_landing_rel N(0,1)), clamped to [0, 1]. No draw (and no RNG use) when the sigma is 0.
 */
export function sampleLandingRetention(rng: () => number, cfg: VariabilityConfig = DEFAULT_VARIABILITY): number {
  const sig = cfg.sigma_landing_rel ?? 0
  if (sig <= 0) return LANDING_RETENTION
  return Math.min(1, Math.max(0, LANDING_RETENTION * (1 + sig * gaussian(rng))))
}
