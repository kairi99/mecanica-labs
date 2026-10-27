// Trial-to-trial scatter of friction and of the student's pull, separate from the deterministic expectation (springBlock.ts, incline.ts).
// Every function takes an injected RNG (mulberry32). All sigmas are ASSUMED; PARAMETERS.md, section Practica 4.
import { gaussian } from '../../../core/physics/noise.ts'
import {
  BLOCK_MASS_NOMINAL_kg, BLOCK_MASS_SPREAD_kg, HAND_TAU_s, MASS_COUNT, MASS_NOMINAL_kg, MASS_SIGMA_REL, type SurfacePair,
} from './constants.ts'
import type { HandParams } from './springBlock.ts'

export interface FrictionScatter {
  /** Relative sigma of the static coefficient between trials (the patch of surface under the block; dust, fibres). */
  sigma_mu_s_rel: number
  /** Relative sigma of the kinetic coefficient between trials. */
  sigma_mu_k_rel: number
}
/** Block faces on paper. ASSUMED. */
export const FACE_SCATTER: FrictionScatter = { sigma_mu_s_rel: 0.05, sigma_mu_k_rel: 0.03 }
/** Bars on the rail: more scatter (oxide film, handling, a slightly different track each time). ASSUMED. */
export const BAR_SCATTER: FrictionScatter = { sigma_mu_s_rel: 0.06, sigma_mu_k_rel: 0.04 }
/** Paper sliding under the block (paper not fixed): erratic, three times the face scatter. ASSUMED. */
export const LOOSE_PAPER_SCATTER: FrictionScatter = { sigma_mu_s_rel: 0.15, sigma_mu_k_rel: 0.1 }
export const NO_SCATTER: FrictionScatter = { sigma_mu_s_rel: 0, sigma_mu_k_rel: 0 }

/** Correlation between the per-trial deviations of mu_s and mu_k (shared patch factor). ASSUMED 0.7. */
export const MU_CORRELATION = 0.7

/** Smallest ratio mu_s / mu_k a trial may have (the draw cannot make kinetic friction exceed static: physical, one-sided guard). */
export const MIN_MU_RATIO = 1.02

/** Coefficients of ONE trial: fixed draw order (shared, static, kinetic), correlation MU_CORRELATION. The static one is kept at least MIN_MU_RATIO times the kinetic one. */
export function sampleTrialCoefficients(rng: () => number, pair: SurfacePair, cfg: FrictionScatter): { mu_s: number; mu_k: number } {
  // a shared surface-patch factor (the same dust, fibres or oxide acts on both coefficients) plus independent parts; fixed draw order
  const zc = gaussian(rng), zs = gaussian(rng), zk = gaussian(rng)
  const a = Math.sqrt(MU_CORRELATION), b = Math.sqrt(1 - MU_CORRELATION)
  const mu_s = pair.mu_s * (1 + cfg.sigma_mu_s_rel * (a * zc + b * zs))
  const mu_k = pair.mu_k * (1 + cfg.sigma_mu_k_rel * (a * zc + b * zk))
  return { mu_s: Math.max(mu_s, mu_k * MIN_MU_RATIO), mu_k }
}

/** The hand of one pull: lag, wobble amplitude (ASSUMED 4 to 10 %), wobble frequency 1 to 2.5 Hz, random phase. Draw order fixed. */
export function sampleHand(rng: () => number): HandParams {
  return {
    tau_s: HAND_TAU_s * (0.7 + 0.6 * rng()),
    wobbleRel: 0.04 + 0.06 * rng(),
    wobbleFreq_hz: 1 + 1.5 * rng(),
    wobblePhase_rad: 2 * Math.PI * rng(),
  }
}

/** Hidden masses of a bench: block (uniform about the nominal) and the three 50 g masses (normal about their label). */
export function sampleBenchMasses(rng: () => number): { block_kg: number; masses_kg: number[] } {
  const block_kg = BLOCK_MASS_NOMINAL_kg + BLOCK_MASS_SPREAD_kg * (2 * rng() - 1)
  const masses_kg = Array.from({ length: MASS_COUNT }, () => MASS_NOMINAL_kg * (1 + MASS_SIGMA_REL * gaussian(rng)))
  return { block_kg: Math.round(block_kg * 1e5) / 1e5, masses_kg: masses_kg.map((m) => Math.round(m * 1e5) / 1e5) }
}
