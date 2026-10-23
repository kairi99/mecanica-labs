// Run-to-run scatter of the physical launch, separate from the deterministic expectation (launch.ts).
// Every function takes an injected RNG (noise.ts mulberry32 in tests/app). All sigmas are ASSUMED; PARAMETERS.md.
// A run with all offsets zero (ZERO_RUN) is the expectation.
import { gaussian } from '../../../core/physics/noise.ts'
import type { BallSpec } from './constants.ts'
import type { RunOffsets } from './launch.ts'

export interface VariabilityConfig {
  /** Release position offset along the rail, 1-sigma, m (finger placement against the mark). */
  sigma_release_m: number
  /** Release push, scale of a HALF-normal draw |N(0,1)| sigma, m/s (a push cannot go uphill). */
  sigma_push_mps: number
  /**
   * Extra loss at the corner (tip contact, rail joint, dust): the junction factor is 1 - sigma |N(0,1)| (one-sided, never
   * above 1, so the scatter cannot create energy). Mean extra loss 0.8 sigma of the post-impact speed. ASSUMED.
   */
  sigma_junction_rel: number
  /** Lateral launch angle, 1-sigma, rad (ball leaves slightly off the rail axis). */
  sigma_lateral_rad: number
}

const deg = Math.PI / 180

/** ASSUMED values (PARAMETERS.md). */
export const MARBLE_VARIABILITY: VariabilityConfig = { sigma_release_m: 0.002, sigma_push_mps: 0.005, sigma_junction_rel: 0.015, sigma_lateral_rad: 1 * deg }
/** Ping-pong: larger junction scatter (light, soft, hollow shell; air currents on the way) and wider lateral spread. ASSUMED. */
export const PING_PONG_VARIABILITY: VariabilityConfig = { sigma_release_m: 0.002, sigma_push_mps: 0.01, sigma_junction_rel: 0.03, sigma_lateral_rad: 1.5 * deg }
export const NO_VARIABILITY: VariabilityConfig = { sigma_release_m: 0, sigma_push_mps: 0, sigma_junction_rel: 0, sigma_lateral_rad: 0 }

export const variabilityFor = (ball: BallSpec): VariabilityConfig => (ball.id === 'marble' ? MARBLE_VARIABILITY : PING_PONG_VARIABILITY)

/**
 * Draw the offsets of one run (fixed draw order: release, push, junction, lateral, mark). The junction factor is
 * 1 - sigma |N(0,1)|, one-sided (<= 1, floor 0.5). `u_mark` is a plain uniform draw for the carbon-mark threshold (marks.ts).
 */
export function sampleRun(rng: () => number, ball: BallSpec, cfg: VariabilityConfig = variabilityFor(ball)): RunOffsets {
  const releaseOffset_m = cfg.sigma_release_m > 0 ? cfg.sigma_release_m * gaussian(rng) : 0
  const pushSpeed_mps = cfg.sigma_push_mps > 0 ? cfg.sigma_push_mps * Math.abs(gaussian(rng)) : 0
  const junctionFactor = cfg.sigma_junction_rel > 0 ? Math.max(0.5, 1 - cfg.sigma_junction_rel * Math.abs(gaussian(rng))) : 1
  const lateralAngle_rad = cfg.sigma_lateral_rad > 0 ? cfg.sigma_lateral_rad * gaussian(rng) : 0
  return { releaseOffset_m, pushSpeed_mps, junctionFactor, lateralAngle_rad, u_mark: rng() }
}
