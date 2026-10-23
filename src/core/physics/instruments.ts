// Resolutions of the measuring instruments (ASSUMED, typical values; PARAMETERS.md) and reading quantisation.

/** Stopwatch display resolution, s (typical hand-held digital stopwatch, 1/100 s). */
export const STOPWATCH_RESOLUTION_s = 0.01
/** Class II tape: MPE = a + b L, a = 0.3 mm, b = 0.2 mm/m (MID 2014/32/EU, Annex MI-008). */
export const TAPE_MPE_OFFSET_m = 0.0003
export const TAPE_MPE_PER_m = 0.0002
/** Tape measure (flexometro) division, m (steel blade graduated in millimetres, read by eye). */
export const TAPE_DIVISION_m = 0.001

/** A value as displayed by an instrument with the given resolution (rounded to the nearest step). */
export function quantize(value: number, resolution: number): number {
  if (!(resolution > 0)) return value
  return Math.round(value / resolution) * resolution
}

/**
 * Maximum permissible error of a class II steel tape measure for a measured length L (m): 0.3 mm + 0.2 mm per metre
 * (MID 2014/32/EU, Annex MI-008, class II). A documented systematic of the instrument, not a random reading error.
 */
export function tapeMaxPermissibleError_m(length_m: number): number {
  return TAPE_MPE_OFFSET_m + TAPE_MPE_PER_m * length_m
}

/** What the view draws for a tape measure showing a length L (m): 1 mm graduation, numbers every cm. */
export interface TapeGeometry {
  division_mm: number
  /** Where the measured edge falls on the blade, mm (the true length, not quantised: the student estimates between ticks). */
  edge_mm: number
  /** What a careful student reads to the nearest division, m. */
  idealReading_m: number
}
export function tapeGeometry(length_m: number): TapeGeometry {
  const edge_mm = length_m * 1000
  return { division_mm: TAPE_DIVISION_m * 1000, edge_mm, idealReading_m: quantize(length_m, TAPE_DIVISION_m) }
}

/** Default reach of the tape measure, m (a 3 m pocket tape). */
export const TAPE_RANGE_DEFAULT_m = 3
/** Is the length within the reach of the tape (0..range_m)? */
export const inTapeRange = (length_m: number, range_m: number = TAPE_RANGE_DEFAULT_m): boolean => length_m >= 0 && length_m <= range_m
