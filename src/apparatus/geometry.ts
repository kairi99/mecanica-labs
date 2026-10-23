// Pure geometry of the rail, level and tape measure. World frame and conventions: docs/architecture.md.
//   x_m: horizontal, from the rack stand toward the two-leg stand / receiver (down-slope direction)
//   y_m: up, normal to the table top (table frame)   z_m: across the bench, toward the viewer
//   origin: on the table top, directly under the rack-stand clamp point
import { quantize, rad2deg, TAPE_DIVISION_m } from '../physics/index.ts'
import {
  LEVEL_BUBBLE_MAX_mm, LEVEL_SENSITIVITY_mm_per_deg, RAIL_LENGTH_m, RAIL_SCALE_MAX_mm,
  RECEIVER_STOP_FROM_END_m, SUPPORT_FROM_END_m, SUPPORT_SEPARATION_m, TAPE_RANGE_m,
} from './constants.ts'

export interface Vec3 { x_m: number; y_m: number; z_m: number }

/** Where the rail top-surface centre line lies in the world frame (table frame, tilt of the table not drawn). */
export interface RailPose {
  /** Rail end at the top of the slope (down-slope distance 0). */
  highEnd: Vec3
  lowEnd: Vec3
  /** Rack-stand clamp point on the rail top surface. */
  clamp: Vec3
  /** Two-leg stand support point on the rail top surface. */
  twoLeg: Vec3
  /** Where the cart front touches the receiver end stop (top surface level). */
  stopFace: Vec3
  /** Unit vector along the rail, down-slope (x > 0). */
  direction: Vec3
  /** Unit vector normal to the rail top surface, pointing up. */
  normal: Vec3
  /** Geometric rail angle in the table frame, rad: asin((h_high - h_low)/d). Table tilt is NOT included. */
  railAngle_rad: number
}

const add = (a: Vec3, b: Vec3, k: number): Vec3 => ({ x_m: a.x_m + b.x_m * k, y_m: a.y_m + b.y_m * k, z_m: a.z_m + b.z_m * k })

/** Rail pose from the heights of its top surface at the two supports (m above the table) and their separation d. */
export function railPose(h_high_m: number, h_low_m: number, d_m: number = SUPPORT_SEPARATION_m): RailPose {
  const ang = Math.asin((h_high_m - h_low_m) / d_m)
  const direction: Vec3 = { x_m: Math.cos(ang), y_m: -Math.sin(ang), z_m: 0 }
  const normal: Vec3 = { x_m: Math.sin(ang), y_m: Math.cos(ang), z_m: 0 }
  const clamp: Vec3 = { x_m: 0, y_m: h_high_m, z_m: 0 }
  const highEnd = add(clamp, direction, -SUPPORT_FROM_END_m)
  return {
    highEnd, clamp, direction, normal, railAngle_rad: ang,
    twoLeg: add(clamp, direction, d_m),
    lowEnd: add(highEnd, direction, RAIL_LENGTH_m),
    stopFace: add(highEnd, direction, RAIL_LENGTH_m - RECEIVER_STOP_FROM_END_m),
  }
}

/** Point on the rail top surface at down-slope distance D_m from the high end. */
export function railPointAt(pose: RailPose, downSlope_m: number): Vec3 {
  return add(pose.highEnd, pose.direction, downSlope_m)
}

/** Pose of a rail lying loose on the table (not mounted): along x, 0.25 m toward the viewer, top surface 0.02 m up. ASSUMED layout. */
export function looseRailPose(): RailPose {
  const p = railPose(0.02, 0.02)
  const shift = (v: Vec3): Vec3 => ({ x_m: v.x_m + 0.1, y_m: v.y_m, z_m: 0.25 })
  return { ...p, highEnd: shift(p.highEnd), lowEnd: shift(p.lowEnd), clamp: shift(p.clamp), twoLeg: shift(p.twoLeg), stopFace: shift(p.stopFace) }
}

/** Down-slope distance D_m from the high rail end for a printed-scale position (mm). */
export function downSlope_m(railPos_mm: number, scaleZeroAtHighEnd: boolean): number {
  return (scaleZeroAtHighEnd ? railPos_mm : RAIL_SCALE_MAX_mm - railPos_mm) / 1000
}
/** Printed-scale position (mm) for a down-slope distance from the high end (m). */
export function railPos_mm(downSlope_m_: number, scaleZeroAtHighEnd: boolean): number {
  const mm = downSlope_m_ * 1000
  return scaleZeroAtHighEnd ? mm : RAIL_SCALE_MAX_mm - mm
}

/**
 * Level (nivelador) bubble offset from the vial centre, mm, for a tilt along the rail axis (rad, positive when the
 * low end is lower). Positive offset = bubble toward the high (up-slope) end. Proportional, saturating. ASSUMED
 * sensitivity 2 mm per 0.1 deg (PARAMETERS.md).
 */
export function bubbleOffset_mm(tilt_rad: number): number {
  const raw = LEVEL_SENSITIVITY_mm_per_deg * rad2deg(tilt_rad)
  return Math.max(-LEVEL_BUBBLE_MAX_mm, Math.min(LEVEL_BUBBLE_MAX_mm, raw))
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

export const inTapeRange = (length_m: number): boolean => length_m >= 0 && length_m <= TAPE_RANGE_m
