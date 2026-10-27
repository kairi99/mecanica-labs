// Instruments of the force-acceleration bench: the digital balance. Resolutions ASSUMED (PARAMETERS.md, Practica 3).
import { quantize } from '../../../core/physics/instruments.ts'
import { typeBDigital } from '../../../core/physics/statistics.ts'

/** Balance resolution, kg (0.1 g, a typical teaching-lab digital balance). */
export const BALANCE_RESOLUTION_kg = 0.0001
/** Balance capacity, kg. ASSUMED. */
export const BALANCE_MAX_kg = 0.6
/** Rail scale division, m (millimetre scale), for the distance uncertainty. */
export const RAIL_DIVISION_m = 0.001

/** What the balance shows for a true mass: rounded to the resolution. */
export const balanceReading_kg = (true_kg: number): number => Math.round(quantize(true_kg, BALANCE_RESOLUTION_kg) * 1e7) / 1e7
/** Type B standard uncertainty of a balance reading, kg: resolution / sqrt(12) (GUM 4.3.7). */
export const balanceTypeB_kg = (): number => typeBDigital(BALANCE_RESOLUTION_kg)
