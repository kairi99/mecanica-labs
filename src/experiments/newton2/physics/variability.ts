// Run-to-run variability of the physical experiment, separate from the deterministic expectation (system.ts).
// Every function takes an injected RNG (mulberry32). All sigmas are ASSUMED; PARAMETERS.md (Practica 3).
// Human timing (reaction, resolution) is NOT here: it is the stopwatch step in the apparatus.
import { gaussian } from '../../../core/physics/noise.ts'
import type { KinematicState } from '../../../core/physics/kinematics.ts'
import { constantAcceleration_mps2, type Newton2Params } from './system.ts'

export interface VariabilityConfig {
  /** Release-position offset from the 0 cm mark, 1-sigma, m (student places the cart front by eye). */
  sigma_release_m: number
  /** Push given by the release (finger lift): scale of a HALF-normal draw |N(0,1)| sigma, m/s; a lift cannot push the cart back. */
  sigma_v0_mps: number
  /** Relative run-to-run scatter of c_rr (dust, wheel flat spots), 1-sigma. */
  sigma_crr_rel: number
  /** Relative run-to-run scatter of the pulley axle friction, 1-sigma. */
  sigma_pulley_rel: number
}

/** ASSUMED values (PARAMETERS.md). */
export const DEFAULT_VARIABILITY: VariabilityConfig = { sigma_release_m: 0.001, sigma_v0_mps: 0.001, sigma_crr_rel: 0.05, sigma_pulley_rel: 0.2 }
/** No variability: for tests of the pure expectation. */
export const NO_VARIABILITY: VariabilityConfig = { sigma_release_m: 0, sigma_v0_mps: 0, sigma_crr_rel: 0, sigma_pulley_rel: 0 }

export interface RunConditions {
  init: KinematicState
  params: Newton2Params
}

/**
 * Draw the conditions of one release: offset, push (half-normal, zeroed if static friction would hold the cart) and this
 * run's c_rr and pulley friction (never negative). The push makes timings run early by about E|v0|/a on average.
 */
export function sampleRun(base: Newton2Params, rng: () => number, cfg: VariabilityConfig = DEFAULT_VARIABILITY): RunConditions {
  const s0 = cfg.sigma_release_m > 0 ? cfg.sigma_release_m * gaussian(rng) : 0
  let v0 = cfg.sigma_v0_mps > 0 ? cfg.sigma_v0_mps * Math.abs(gaussian(rng)) : 0
  const crr = cfg.sigma_crr_rel > 0 ? Math.max(0, base.cart.c_rr * (1 + cfg.sigma_crr_rel * gaussian(rng))) : base.cart.c_rr
  const pf = cfg.sigma_pulley_rel > 0 ? Math.max(0, base.pulley.F_friction_N * (1 + cfg.sigma_pulley_rel * gaussian(rng))) : base.pulley.F_friction_N
  const params: Newton2Params = { ...base, cart: { ...base.cart, c_rr: crr }, pulley: { ...base.pulley, F_friction_N: pf } }
  if (constantAcceleration_mps2(params) === 0) v0 = 0
  return { init: { s_m: s0, v_mps: v0 }, params }
}
