// Run-to-run variability of the physical experiment, separate from the deterministic expectation (cart.ts).
// Every function takes an injected RNG (noise.ts mulberry32 in tests/app). All sigmas are ASSUMED; PARAMETERS.md.
import { crossingTime_s, type CartParams, type CartState } from './cart.ts'
import { gaussian } from './noise.ts'

export interface VariabilityConfig {
  /** Release-position offset from the 0 cm mark, 1-sigma, m (student places the cart front by eye). */
  sigma_release_m: number
  /** Initial velocity given by the release (finger lift), 1-sigma, m/s. */
  sigma_v0_mps: number
  /** Relative run-to-run scatter of c_rr (dust, track film, wheel flat spots), 1-sigma. */
  sigma_crr_rel: number
}

/** ASSUMED values (PARAMETERS.md). */
export const DEFAULT_VARIABILITY: VariabilityConfig = { sigma_release_m: 0.001, sigma_v0_mps: 0.004, sigma_crr_rel: 0.05 }
/** No variability: for tests of the pure expectation. */
export const NO_VARIABILITY: VariabilityConfig = { sigma_release_m: 0, sigma_v0_mps: 0, sigma_crr_rel: 0 }

export interface RunConditions {
  init: CartState
  params: CartParams
}

/** Draw the conditions of one release: offset, initial velocity and this run's c_rr (never negative). */
export function sampleRun(base: CartParams, rng: () => number, cfg: VariabilityConfig = DEFAULT_VARIABILITY): RunConditions {
  const s0 = cfg.sigma_release_m > 0 ? cfg.sigma_release_m * gaussian(rng) : 0
  const v0 = cfg.sigma_v0_mps > 0 ? cfg.sigma_v0_mps * gaussian(rng) : 0
  const crr = cfg.sigma_crr_rel > 0 ? Math.max(0, base.c_rr * (1 + cfg.sigma_crr_rel * gaussian(rng))) : base.c_rr
  return { init: { s_m: s0, v_mps: v0 }, params: { ...base, c_rr: crr } }
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
