// Force reading of the hanging canister. PHASE 1 PLACEHOLDER: the true weight quantised to FORCE_RESOLUTION_N (ASSUMED).
// TODO phase 2: replace by the shared core spring-scale model (src/core/instruments/springScale.ts); keep `ForceReading`
// as the apparatus-facing shape so only this file changes.
import { quantize } from '../../../core/physics/instruments.ts'
import { typeBDigital } from '../../../core/physics/statistics.ts'
import { FORCE_RESOLUTION_N } from './constants.ts'
import type { ForceReading } from './types.ts'

/** What the dynamometer shows for a true weight, with its resolution and Type B uncertainty. */
export function readHangingForce(trueWeight_N: number, massesInCanister: number): ForceReading {
  return {
    reading_N: Math.round(quantize(trueWeight_N, FORCE_RESOLUTION_N) * 1e6) / 1e6,
    resolution_N: FORCE_RESOLUTION_N,
    uB_N: typeBDigital(FORCE_RESOLUTION_N),
    massesInCanister,
  }
}
