// Geometry of the inclined rail. Pure. SI units, unit in the name.

/**
 * Incline angle of the rail, rad, from the two support heights (above the table) and the distance d between the
 * supports measured along the rail: sin(theta_rail) = (h_high - h_low) / d. The table's own tilt (an unlevel bench,
 * seen by the "nivelador") adds to it: theta = theta_rail + tableTilt (small-angle, same plane). Guide: 1.30 deg.
 */
export function inclineAngle_rad(h_high_m: number, h_low_m: number, d_m: number, tableTilt_rad = 0): number {
  if (!(d_m > 0)) throw new Error('inclineAngle_rad needs d_m > 0')
  const ratio = (h_high_m - h_low_m) / d_m
  if (Math.abs(ratio) > 1) throw new Error('inclineAngle_rad: height difference exceeds the separation')
  return Math.asin(ratio) + tableTilt_rad
}

/** Height difference h_high - h_low, m, needed for a target incline angle (inverse of inclineAngle_rad). */
export function heightDifferenceForAngle_m(theta_rad: number, d_m: number, tableTilt_rad = 0): number {
  return d_m * Math.sin(theta_rad - tableTilt_rad)
}

/** Required high-stand height, m, for a target angle given the low support height. */
export function standHeightForAngle_m(theta_rad: number, d_m: number, h_low_m: number, tableTilt_rad = 0): number {
  return h_low_m + heightDifferenceForAngle_m(theta_rad, d_m, tableTilt_rad)
}

export const deg2rad = (deg: number): number => (deg * Math.PI) / 180
export const rad2deg = (rad: number): number => (rad * 180) / Math.PI

/** Target incline of the guide, rad (1.30 deg). */
export const THETA_GUIDE_rad = deg2rad(1.3)
