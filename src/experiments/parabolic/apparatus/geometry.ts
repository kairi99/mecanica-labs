// Pure geometry of the rail, level, paper and tape measure. Launch frame (x_m, y_m, z_m), also the world frame of the views:
//   x_m: horizontal, from the table edge outward (the ball flies toward +x); the rail lies at x < 0 on the table
//   y_m: up. Rail poses use the TABLE frame (y = 0 on the table top); ball poses use the FLOOR frame (y = 0 on the floor)
//   z_m: lateral, across the bench; the rail axis is z = 0
import { rad2deg } from '../../../core/physics/angles.ts'
import { inTapeRange as coreInTapeRange } from '../../../core/physics/instruments.ts'
import type { PaperRect } from './model.ts'
import {
  LEVEL_BUBBLE_MAX_mm, RACK_BASE_HEIGHT_m, RACK_FROM_TIP_m, RAIL_LENGTH_m, SHEET_LONG_m, SHEET_SHORT_m, TAPE_RANGE_m,
  TIP_LIFT_TOL_m, TWO_LEG_FROM_TIP_m, TWO_LEG_SPAN_m, LEVEL_SENSITIVITY_mm_per_deg,
} from './constants.ts'

export interface Vec3 { x_m: number; y_m: number; z_m: number }

/** Rail on the table, table frame. Positions along the rail are s_m from the low tip (the guide's "upper half" is s >= 0.60 m). */
export interface RailPose {
  tip: Vec3
  /** The high end of the rail (s = L). */
  highEnd: Vec3
  /** Rack-stand clamp point and two-leg support point on the rail top surface. */
  clamp: Vec3
  twoLeg: Vec3
  /** Unit vector along the rail, up the slope (x < 0: away from the edge). */
  direction: Vec3
}

export interface RailInput {
  rack_mm: number
  leg_mm: number
  foot_mm: number
  gap_m: number
  tableRoll_rad: number
  /** The two-leg stand is screwed to the rail. */
  twoLegAttached: boolean
}

export interface RailGeometry {
  /** Rail top surface height above the table at the clamp / at the two-leg stand, m. */
  clampHeight_m: number
  legHeight_m: number
  /** Rail top surface height above the table at the low tip, m: 0 when the tip rests on the table. */
  tipHeight_m: number
  /** The two-leg stand holds the rail up so that its tip hangs in the air (tip height > tolerance). */
  tipLifted: boolean
  /** Drop of the ball from the rail tip to the table, m (= tipHeight_m); fed to the physics as stepDrop_m. */
  stepDrop_m: number
  /** Height of the high support above the tip, m. THE rise the ball feels (not necessarily what the tape reads at the clamp). */
  rise_m: number
  /** Incline angle of the rail, rad: asin(rise / distance tip-clamp). Negative when the two-leg stand holds the tip above the clamp. */
  theta_rad: number
  /** Roll of the rail about its axis, rad: hidden table tilt plus the screw foot of the two-leg stand. Drives the lateral drift. */
  roll_rad: number
  gap_m: number
  pose: RailPose
}

const dirOf = (theta_rad: number): Vec3 => ({ x_m: -Math.cos(theta_rad), y_m: Math.sin(theta_rad), z_m: 0 })
const along = (tip: Vec3, d: Vec3, s: number): Vec3 => ({ x_m: tip.x_m + d.x_m * s, y_m: tip.y_m + d.y_m * s, z_m: tip.z_m + d.z_m * s })

/**
 * Rail resting on the rack-stand clamp (height set by the rack) and on the table at its low tip. If the two-leg stand is
 * attached and set higher than the straight line from the tip (on the table) to the clamp, it lifts the rail and the tip
 * hangs in the air: tip height = extrapolation of the line through the two supports to the tip. A lower two-leg stand
 * simply does not touch the rail. Heights are vertical and distances are along the rail (small-angle bookkeeping).
 */
export function railGeometry(inp: RailInput): RailGeometry {
  const hHigh = RACK_BASE_HEIGHT_m + inp.rack_mm / 1000
  const hLeg = inp.leg_mm / 1000
  let tip = 0
  if (inp.twoLegAttached) {
    const slope = (hHigh - hLeg) / (RACK_FROM_TIP_m - TWO_LEG_FROM_TIP_m)
    const raw = hLeg - slope * TWO_LEG_FROM_TIP_m
    if (raw > TIP_LIFT_TOL_m) tip = raw
  }
  const rise = hHigh - tip
  const theta = Math.asin(Math.max(-1, Math.min(1, rise / RACK_FROM_TIP_m)))
  const tipPt: Vec3 = { x_m: -inp.gap_m, y_m: tip, z_m: 0 }
  const d = dirOf(theta)
  const roll = inp.tableRoll_rad + (inp.twoLegAttached ? Math.asin(Math.max(-1, Math.min(1, inp.foot_mm / 1000 / TWO_LEG_SPAN_m))) : 0)
  return {
    clampHeight_m: hHigh, legHeight_m: hLeg, tipHeight_m: tip, tipLifted: tip > 0, stepDrop_m: tip, rise_m: rise, theta_rad: theta,
    roll_rad: roll, gap_m: inp.gap_m,
    pose: { tip: tipPt, highEnd: along(tipPt, d, RAIL_LENGTH_m), clamp: along(tipPt, d, RACK_FROM_TIP_m), twoLeg: along(tipPt, d, TWO_LEG_FROM_TIP_m), direction: d },
  }
}

/** Point on the rail top surface at s_m from the low tip (table frame). */
export const railPointAt = (pose: RailPose, s_m: number): Vec3 => along(pose.tip, pose.direction, s_m)

/**
 * Level (nivelador) bubble offset from the vial centre, mm, for a tilt (rad). Proportional, saturating; ASSUMED sensitivity
 * 2 mm per 0.1 deg (PARAMETERS.md). On the rail it shows the roll of the rail about its axis (the lateral tilt).
 */
export function bubbleOffset_mm(tilt_rad: number): number {
  const raw = LEVEL_SENSITIVITY_mm_per_deg * rad2deg(tilt_rad)
  return Math.max(-LEVEL_BUBBLE_MAX_mm, Math.min(LEVEL_BUBBLE_MAX_mm, raw))
}

// ---- Paper on the floor ------------------------------------------------------------------------------------------
/** Which way the long side (297 mm) of the A4 sheet lies on the floor. */
export type PaperOrientation = 'alongX' | 'alongZ'
/** A sheet on the floor: centre in the launch frame (x from the table edge, z lateral). */
export interface SheetPose { x_m: number; z_m: number; orientation: PaperOrientation }

export function sheetRect(p: SheetPose): PaperRect {
  const hx = (p.orientation === 'alongX' ? SHEET_LONG_m : SHEET_SHORT_m) / 2
  const hz = (p.orientation === 'alongX' ? SHEET_SHORT_m : SHEET_LONG_m) / 2
  return { xMin_m: p.x_m - hx, xMax_m: p.x_m + hx, zMin_m: p.z_m - hz, zMax_m: p.z_m + hz }
}
/** Overlap of two sheets, or null when they share no area. */
export function rectOverlap(a: PaperRect, b: PaperRect): PaperRect | null {
  const r: PaperRect = {
    xMin_m: Math.max(a.xMin_m, b.xMin_m), xMax_m: Math.min(a.xMax_m, b.xMax_m),
    zMin_m: Math.max(a.zMin_m, b.zMin_m), zMax_m: Math.min(a.zMax_m, b.zMax_m),
  }
  return r.xMax_m > r.xMin_m && r.zMax_m > r.zMin_m ? r : null
}
/**
 * A point fixed on a sheet is given in the sheet's own frame: a_m along the long side, b_m along the short side, from the
 * centre. These convert to and from the floor frame, so marks travel with the paper when it is moved or turned.
 */
export function sheetToFloor(p: SheetPose, a_m: number, b_m: number): { x_m: number; z_m: number } {
  return p.orientation === 'alongX' ? { x_m: p.x_m + a_m, z_m: p.z_m + b_m } : { x_m: p.x_m - b_m, z_m: p.z_m + a_m }
}
export function floorToSheet(p: SheetPose, x_m: number, z_m: number): { a_m: number; b_m: number } {
  const dx = x_m - p.x_m
  const dz = z_m - p.z_m
  return p.orientation === 'alongX' ? { a_m: dx, b_m: dz } : { a_m: dz, b_m: -dx }
}
export const floorDistance_m = (x1: number, z1: number, x2: number, z2: number): number => Math.hypot(x2 - x1, z2 - z1)

/** Tape measure helpers are shared (core/physics/instruments.ts); the reach is this bench's. */
export { tapeGeometry, type TapeGeometry } from '../../../core/physics/instruments.ts'
export const inTapeRange = (length_m: number): boolean => coreInTapeRange(length_m, TAPE_RANGE_m)
