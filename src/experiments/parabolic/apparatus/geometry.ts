// Pure geometry of the rail, level, paper and tape measure. Launch frame (x_m, y_m, z_m), also the world frame of the views:
//   x_m: horizontal, from the table edge outward (the ball flies toward +x); the rail lies at x < 0 on the table
//   y_m: up. Rail poses use the TABLE frame (y = 0 on the table top); ball poses use the FLOOR frame (y = 0 on the floor)
//   z_m: lateral, across the bench; the rail axis is z = 0
import { rad2deg } from '../../../core/physics/angles.ts'
import { inTapeRange as coreInTapeRange } from '../../../core/physics/instruments.ts'
import type { PaperRect } from './model.ts'
import {
  LEG_BASE_HEIGHT_m, LEVEL_BUBBLE_MAX_mm, RACK_BASE_HEIGHT_m, RAIL_HEIGHT_m, RACK_FROM_TIP_m, RAIL_LENGTH_m, SHEET_LONG_m, SHEET_SHORT_m, PAPER_THICKNESS_m, TAPE_RANGE_m,
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

/** Which supports the rail rests on. */
export interface RailContacts {
  /** Held by the rack-stand clamp (always: the geometry exists only then). */
  rack: true
  /** The two-leg stand's support touches the rail underside (it is attached and higher than the free line). */
  twoLeg: boolean
  /** The low end of the rail rests on the table (its underside corner at the tip touches the tabletop). */
  table: boolean
}

export interface RailGeometry {
  /** Rail top surface height above the table at the clamp, m (what the tape reads). */
  clampHeight_m: number
  /** Height of the two-leg stand's support above the table, m (the rail underside rests on it when it touches). */
  legHeight_m: number
  /**
   * Rail top surface height above the table at the low tip, m. The rail is a beam RAIL_HEIGHT_m thick, so when it rests on the
   * table at its tip this is RAIL_HEIGHT_m cos(theta) (about 2 cm), never 0.
   */
  tipHeight_m: number
  /** Where the tip top surface sits when the rail stands on the table at its tip: RAIL_HEIGHT_m cos(theta), m. */
  tipRestHeight_m: number
  /** The two-leg stand holds the rail up so that its tip hangs above its resting height (by more than TIP_LIFT_TOL_m). */
  tipLifted: boolean
  /** Drop of the ball from the rail tip (top surface) to the table, m (= tipHeight_m); fed to the physics as stepDrop_m. */
  stepDrop_m: number
  /** Height of the high support above the tip, m (= distance tip-clamp x sin(theta)). THE rise the ball feels. */
  rise_m: number
  /** Incline angle of the rail, rad: asin(rise / distance tip-clamp). Negative when the two-leg stand holds the tip above the clamp. */
  theta_rad: number
  /** Roll of the rail about its axis, rad: hidden table tilt plus the screw foot of the two-leg stand. Drives the lateral drift. */
  roll_rad: number
  gap_m: number
  contacts: RailContacts
  /** Clearance between the two-leg support top and the rail underside at the stand, m: > 0 when it does not touch (a gap shows), 0 when it does. */
  twoLegClearance_m: number
  /** Lowest point of the rail body (the underside corners of both ends) above the table, m. Never below 0 up to rounding. */
  lowest_m: number
  pose: RailPose
}

const dirOf = (theta_rad: number): Vec3 => ({ x_m: -Math.cos(theta_rad), y_m: Math.sin(theta_rad), z_m: 0 })
const along = (tip: Vec3, d: Vec3, s: number): Vec3 => ({ x_m: tip.x_m + d.x_m * s, y_m: tip.y_m + d.y_m * s, z_m: tip.z_m + d.z_m * s })
const clampUnit = (v: number): number => Math.max(-1, Math.min(1, v))

/**
 * Rail as a rigid straight beam of thickness t = RAIL_HEIGHT_m (rigid-body statics: a beam rests on its contacts and can never
 * penetrate the surface that supports it). Contacts: the rack clamp holds the top surface at height h at distance Dc from the
 * low tip (along the rail); the tabletop touches the underside corner of the low end; the two-leg stand's support (height b)
 * touches the underside at distance Ds. The top line has height tip + s sin(theta).
 *   Free line (rack + table): tip = t cos(theta) and Dc sin(theta) + t cos(theta) = h, so theta = asin(h / hypot(Dc, t)) - atan(t / Dc).
 *   The stand touches only if it is higher than the free line's underside at Ds: b > Ds sin(theta_free). A lower stand does
 *   not touch (a gap shows above it) and the rail rests on rack + table.
 *   Otherwise the rail rests on rack + stand: (Dc - Ds) sin(theta) + t cos(theta) = h - b (same closed form) and the tip hangs
 *   above the table at b + t cos(theta) - Ds sin(theta) >= t cos(theta).
 * The hidden table roll and the screw foot only roll the rail about its axis (tenths of a millimetre at the groove walls).
 */
export function railGeometry(inp: RailInput): RailGeometry {
  const t = RAIL_HEIGHT_m
  const hHigh = RACK_BASE_HEIGHT_m + inp.rack_mm / 1000
  const bLeg = LEG_BASE_HEIGHT_m + inp.leg_mm / 1000
  /** theta of a beam with D sin(theta) + t cos(theta) = h (h above a support underside point D metres along the rail from the clamp). */
  const thetaFor = (h: number, D: number): number => Math.asin(clampUnit(h / Math.hypot(D, t))) - Math.atan2(t, D)
  const thetaFree = thetaFor(hHigh, RACK_FROM_TIP_m)
  let theta = thetaFree
  let twoLeg = false
  if (inp.twoLegAttached && bLeg > TWO_LEG_FROM_TIP_m * Math.sin(thetaFree)) {
    twoLeg = true
    theta = thetaFor(hHigh - bLeg, RACK_FROM_TIP_m - TWO_LEG_FROM_TIP_m)
  }
  const cos = Math.cos(theta)
  const sin = Math.sin(theta)
  const tipRest = t * cos
  const tip = twoLeg ? bLeg + t * cos - TWO_LEG_FROM_TIP_m * sin : tipRest
  const rise = RACK_FROM_TIP_m * sin
  const tipPt: Vec3 = { x_m: -inp.gap_m, y_m: tip, z_m: 0 }
  const d = dirOf(theta)
  const roll = inp.tableRoll_rad + (inp.twoLegAttached ? Math.asin(clampUnit(inp.foot_mm / 1000 / TWO_LEG_SPAN_m)) : 0)
  const pose: RailPose = { tip: tipPt, highEnd: along(tipPt, d, RAIL_LENGTH_m), clamp: along(tipPt, d, RACK_FROM_TIP_m), twoLeg: along(tipPt, d, TWO_LEG_FROM_TIP_m), direction: d }
  const lifted = tip - tipRest > TIP_LIFT_TOL_m
  const underAtStand = pose.twoLeg.y_m - t * cos
  return {
    clampHeight_m: hHigh, legHeight_m: bLeg, tipHeight_m: tip, tipRestHeight_m: tipRest, tipLifted: lifted, stepDrop_m: tip, rise_m: rise, theta_rad: theta,
    roll_rad: roll, gap_m: inp.gap_m, contacts: { rack: true, twoLeg, table: !lifted }, twoLegClearance_m: twoLeg ? 0 : Math.max(0, underAtStand - bLeg),
    lowest_m: Math.min(tip - t * cos, pose.highEnd.y_m - t * cos), pose,
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
/** Heights above the floor at which the sheets lie: the carbon sheet lies on the bond paper where they overlap, else on the floor. */
export interface PaperStack { bondBase_m: number; carbonBase_m: number }
export function paperStack(bond: SheetPose | null, carbon: SheetPose | null): PaperStack {
  return { bondBase_m: 0, carbonBase_m: bond && carbon && rectOverlap(sheetRect(bond), sheetRect(carbon)) ? PAPER_THICKNESS_m : 0 }
}
/** Height above the floor of the top surface under a floor point (0 on bare floor): a ball resting there has its centre R above it. */
export function paperSurfaceAt_m(x_m: number, z_m: number, bond: SheetPose | null, carbon: SheetPose | null): number {
  const inside = (r: PaperRect): boolean => x_m >= r.xMin_m && x_m <= r.xMax_m && z_m >= r.zMin_m && z_m <= r.zMax_m
  const st = paperStack(bond, carbon)
  const onBond = bond !== null && inside(sheetRect(bond))
  const onCarbon = carbon !== null && inside(sheetRect(carbon))
  return Math.max(onBond ? st.bondBase_m + PAPER_THICKNESS_m : 0, onCarbon ? st.carbonBase_m + PAPER_THICKNESS_m : 0)
}
export const floorDistance_m = (x1: number, z1: number, x2: number, z2: number): number => Math.hypot(x2 - x1, z2 - z1)

/** Tape measure helpers are shared (core/physics/instruments.ts); the reach is this bench's. */
export { tapeGeometry, type TapeGeometry } from '../../../core/physics/instruments.ts'
export const inTapeRange = (length_m: number): boolean => coreInTapeRange(length_m, TAPE_RANGE_m)
