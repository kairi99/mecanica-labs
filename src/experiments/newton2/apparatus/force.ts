// Force reading of the hanging canister with the shared analog spring scale (core/instruments/springScale.ts), used VERTICALLY: the
// scale is zeroed hanging, so there is no zero error. The student reads the needle to the nearest division (1 N scale: 0.02 N, 2 N
// scale: 0.05 N); Type B uncertainty from springScaleUncertainty_N (typeBAnalog: u = d / sqrt(12)).
import {
  SPRING_SCALES, createSpringScale, springScaleReading, springScaleUncertainty_N, type SpringScaleId,
} from '../../../core/instruments/springScale.ts'
import type { ForceReading } from './types.ts'

/** What the dynamometer shows for a true weight, with its division and Type B uncertainty. */
export function readHangingForce(trueWeight_N: number, massesInCanister: number, id: SpringScaleId = '1N'): ForceReading {
  const scale = createSpringScale(id, 'vertical', 'vertical')
  const r = springScaleReading(scale, trueWeight_N)
  return {
    reading_N: Math.round(r.reading_N * 1e6) / 1e6, resolution_N: scale.spec.division_N, uB_N: springScaleUncertainty_N(scale.spec),
    massesInCanister, scaleId: id, extension_m: r.extension_m, indicated_N: r.indicated_N, overRange: r.overRange,
  }
}
export const forceUncertainty_N = (id: SpringScaleId = '1N'): number => springScaleUncertainty_N(SPRING_SCALES[id])
