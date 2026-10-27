// Analog spring scale (dynamometer) shared by the experiments that pull or weigh with a spring. Pure, DOM-free.
// A linear spring (Hooke, F = k e) pulls a needle along a printed scale; the student reads it to the nearest division by eye
// (same convention as the tape measure in core/physics/instruments.ts), and the Type B uncertainty follows statistics.ts
// (typeBAnalog: u = d / sqrt(12)). Every value of the two scales (k, divisions, damping, moving mass) is ASSUMED: PARAMETERS.md.
import { G_QUITO_mps2 } from '../physics/constants.ts'
import { quantize } from '../physics/instruments.ts'
import { typeBAnalog } from '../physics/statistics.ts'

export type SpringScaleId = '1N' | '2N'

export interface SpringScaleSpec {
  id: SpringScaleId
  /** Full scale, N (needle at the stop). */
  range_N: number
  /** Smallest printed division, N (the reading step). */
  division_N: number
  /** Spring constant, N/m (ASSUMED from the printed length: range / fullExtension_m). */
  k_Npm: number
  /** Extension of the spring at full scale, m (length of the printed scale). */
  fullExtension_m: number
  /** Internal damping of the needle and spring (dashpot in parallel with the spring), N s/m. ASSUMED. */
  damping_Nspm: number
  /** Mass of the moving parts (rod, hook, needle) whose weight sets the zero when the scale is used in another orientation, kg. ASSUMED. */
  movingMass_kg: number
  /** Label step of the printed numerals, N. */
  labelStep_N: number
}

/** ASSUMED: scale length 10 cm for both (1 N: 50 divisions of 0.02 N, 2 mm apart; 2 N: 40 divisions of 0.05 N, 2.5 mm apart). */
export const SPRING_SCALES: Readonly<Record<SpringScaleId, SpringScaleSpec>> = {
  '1N': { id: '1N', range_N: 1, division_N: 0.02, k_Npm: 10, fullExtension_m: 0.1, damping_Nspm: 1.0, movingMass_kg: 0.002, labelStep_N: 0.1 },
  '2N': { id: '2N', range_N: 2, division_N: 0.05, k_Npm: 20, fullExtension_m: 0.1, damping_Nspm: 1.0, movingMass_kg: 0.003, labelStep_N: 0.5 },
}
export const SPRING_SCALE_IDS: readonly SpringScaleId[] = ['1N', '2N']

export type ScaleOrientation = 'vertical' | 'horizontal'

/** A scale on the bench: the spec plus the zero error it currently has (N added to the true force before the needle moves). */
export interface SpringScale {
  spec: SpringScaleSpec
  zeroedFor: ScaleOrientation
  usedIn: ScaleOrientation
  /** Signed zero error, N: -m_moving g when zeroed hanging and used horizontally (reads low), +m_moving g the other way, else 0. */
  zeroError_N: number
}

/**
 * Zero error of a scale zeroed in one orientation and used in another. Hanging, the moving parts stretch the spring by their weight and the
 * zero screw cancels it; lying horizontally that stretch is gone, so the needle sits below zero (clamped at the stop) and every reading is
 * low by m g (Hooke's law, weight of the moving parts). Same g as the rest of the lab.
 */
export function zeroError_N(spec: SpringScaleSpec, zeroedFor: ScaleOrientation, usedIn: ScaleOrientation, g_mps2 = G_QUITO_mps2): number {
  if (zeroedFor === usedIn) return 0
  const w = spec.movingMass_kg * g_mps2
  return usedIn === 'horizontal' ? -w : w
}

/** A scale as it leaves the box: zeroed hanging (vertical), used in `usedIn`. */
export function createSpringScale(id: SpringScaleId, usedIn: ScaleOrientation = 'horizontal', zeroedFor: ScaleOrientation = 'vertical'): SpringScale {
  const spec = SPRING_SCALES[id]
  return { spec, zeroedFor, usedIn, zeroError_N: zeroError_N(spec, zeroedFor, usedIn) }
}
/** Turn the zero screw with the scale in its working orientation: the zero error is removed. */
export function rezeroSpringScale(s: SpringScale): SpringScale {
  return { ...s, zeroedFor: s.usedIn, zeroError_N: 0 }
}

export interface ScaleReading {
  /** True force on the hook, N (input). */
  force_N: number
  /** Where the needle sits, N: force + zero error clamped to [0, range] (unquantised: the student estimates between ticks). */
  indicated_N: number
  /** What a student reads to the nearest division, N. */
  reading_N: number
  /** Needle held at the full-scale stop: the true force is at least the range (reading unreliable). */
  overRange: boolean
  /** Needle held at the zero stop (force below the zero error). */
  belowZero: boolean
  /** Extension of the spring at the needle, m (for drawing). */
  extension_m: number
}

/** Needle position, reading and flags for a true force (N) on the hook. */
export function springScaleReading(s: SpringScale, force_N: number): ScaleReading {
  const raw = force_N + s.zeroError_N
  const overRange = raw > s.spec.range_N
  const belowZero = raw < 0
  const indicated_N = Math.min(s.spec.range_N, Math.max(0, raw))
  return {
    force_N, indicated_N, reading_N: quantize(indicated_N, s.spec.division_N), overRange, belowZero,
    extension_m: indicated_N / s.spec.k_Npm,
  }
}

/** Type B standard uncertainty of one reading, N (rectangular within half a division: statistics.ts typeBAnalog). */
export const springScaleUncertainty_N = (spec: SpringScaleSpec): number => typeBAnalog(spec.division_N)
