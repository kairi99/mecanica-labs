// Resolutions of the measuring instruments (ASSUMED, typical values; PARAMETERS.md) and reading quantisation.

/** Stopwatch display resolution, s (typical hand-held digital stopwatch, 1/100 s). */
export const STOPWATCH_RESOLUTION_s = 0.01
/** Rail scale division, m (millimetre scale on the aluminium rail). */
export const RAIL_DIVISION_m = 0.001
/** Vernier caliper least count, m (0.05 mm analog vernier). */
export const VERNIER_LEAST_COUNT_m = 0.00005
/** Digital caliper resolution, m (0.01 mm). */
export const DIGITAL_CALIPER_RESOLUTION_m = 0.00001

/** A value as displayed by an instrument with the given resolution (rounded to the nearest step). */
export function quantize(value: number, resolution: number): number {
  if (!(resolution > 0)) return value
  return Math.round(value / resolution) * resolution
}
