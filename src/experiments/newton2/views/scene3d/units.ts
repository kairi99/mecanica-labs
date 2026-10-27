// Pure helpers of the 3D scene (no three.js, no DOM): coordinate mapping, rail-scale conversions, staging layout, camera preset boxes.
// Unit tests: tests/newton2/scene3d-units.test.ts.
//
// Scene units: 1 unit = 1 cm, y up, x from the stand end toward the receiver (the cart's direction of travel), z toward the viewer.
// The bench top is y = 0 and the floor is y = -BENCH_HEIGHT.
import { RAIL_LENGTH_m, RAIL_SCALE_MAX_mm, SUPPORT_FROM_END_m, type ItemId } from '../../apparatus/index.ts'
import { BENCH_HEIGHT_m, CANISTER_HANG_m, STRING_ABOVE_RAIL_m } from '../../physics/index.ts'

export const CM_PER_M = 100

/** Bench top (top face at y = 0), centimetres. */
export const BENCH = { x: 62, z: 0, width: 200, depth: 90, thickness: 3 }
/** Floor level, y in scene cm. */
export const FLOOR_Y_cm = -BENCH_HEIGHT_m * CM_PER_M
export const RAIL = { halfW: 1.25, height: 2.0, length: RAIL_LENGTH_m * CM_PER_M }
export const SUPPORT_FROM_END_cm = SUPPORT_FROM_END_m * CM_PER_M
/** Height of the string above the rail top at the cart, cm; canister body height. */
export const STRING_ABOVE_RAIL_cm = STRING_ABOVE_RAIL_m * CM_PER_M
export const CANISTER_H_cm = (CANISTER_HANG_m - 0.01) * CM_PER_M

/** Local rail x (cm from the stand end of the rail) of a printed-scale position (mm). */
export function railLocalX_cm(pos_mm: number, scaleZeroAtStand: boolean): number {
  return ((scaleZeroAtStand ? pos_mm : RAIL_SCALE_MAX_mm - pos_mm) / 1000) * CM_PER_M
}
/** Printed-scale position (mm) of a local rail x (cm), clamped to the rail. */
export function railPosFromLocalX_mm(x_cm: number, scaleZeroAtStand: boolean): number {
  const D = Math.min(RAIL_SCALE_MAX_mm, Math.max(0, x_cm * 10))
  return scaleZeroAtStand ? D : RAIL_SCALE_MAX_mm - D
}

/** A point in the rail frame to the world, for a rail whose stand end sits at `high` and which is rotated about z by `tilt_rad`. */
export function railLocalToWorld(high: readonly [number, number, number], tilt_rad: number, p: readonly [number, number, number]): [number, number, number] {
  const c = Math.cos(tilt_rad), s = Math.sin(tilt_rad)
  return [high[0] + p[0] * c - p[1] * s, high[1] + p[0] * s + p[1] * c, high[2] + p[2]]
}

/** Rail tilt used to draw the rail (rad, rotation about z): the geometric angle from the two support heights, not the hidden bench tilt. */
export function drawnRailTilt_rad(standHeight_m: number, receiverHeight_m: number, d_m: number): number {
  return -Math.asin((standHeight_m - receiverHeight_m) / d_m)
}

export interface Slot { x: number; z: number; rotY: number }
/** Resting places in cm (bench frame). The loose rail lies in the front row. */
export const STAGING: Record<Exclude<ItemId, 'rail'>, Slot> = {
  cart: { x: 24, z: 36, rotY: 0 },
  rackStand: { x: -16, z: -34, rotY: 0 },
  standBase: { x: 6, z: -33, rotY: 0 },
  receiver: { x: 84, z: 36, rotY: 0 },
  screws: { x: 52, z: 36, rotY: 0 },
  level: { x: 130, z: 34, rotY: -0.03 },
  string: { x: 112, z: 36, rotY: 0.2 },
  canister: { x: 150, z: -10, rotY: 0 },
  brassScrew: { x: 70, z: 36, rotY: 0.4 },
  plasticScrews: { x: 62, z: 36, rotY: 0.2 },
  masses: { x: 132, z: 8, rotY: 0 },
  balance: { x: 150, z: -30, rotY: -0.2 },
  dynamometer: { x: 118, z: -36, rotY: 0 },
  dynamometer2N: { x: 128, z: -36, rotY: 0 },
  stopwatch: { x: 96, z: -34, rotY: 0.3 },
  markers: { x: 76, z: -34, rotY: 0 },
  twoLegStand: { x: 36, z: -34, rotY: 0 },
  mass50: { x: 148, z: 24, rotY: 0 },
  marble: { x: 155, z: 30, rotY: 0 },
}
/** Where the 10 g masses wait on the bench (index 0..3) when left out of the system. */
export const BENCH_MASS_SLOT: Slot = { x: 140, z: 20, rotY: 0 }
/** The post that holds the dynamometer when it weighs the canister, and the hook height. */
export const SCALE_POST = { x: 150, z: 10, rotY: 0, armLength: 10, height: 70 }

export type PresetName = 'overview' | 'start' | 'pulley' | 'floor' | 'balance' | 'scale'
export const PRESET_NAMES: readonly PresetName[] = ['overview', 'start', 'pulley', 'floor', 'balance', 'scale']
/** Parse a preset name from a URL parameter or a caller; null when unknown. */
export function parsePreset(s: string | null | undefined): PresetName | null {
  return s && (PRESET_NAMES as readonly string[]).includes(s) ? (s as PresetName) : null
}

export type Vec = readonly [number, number, number]
/** Box (min, max) in scene cm to frame for each preset, and the viewing angles (deg). */
export const PRESET_VIEWS: Record<PresetName, { min: Vec; max: Vec; azimuth: number; elevation: number }> = {
  overview: { min: [-15, -4, -24], max: [158, 38, 36], azimuth: 10, elevation: 22 },
  start: { min: [-12, -2, -14], max: [38, 20, 14], azimuth: -28, elevation: 20 },
  pulley: { min: [96, -30, -12], max: [140, 14, 12], azimuth: 30, elevation: 14 },
  floor: { min: [90, FLOOR_Y_cm - 6, -20], max: [150, 12, 20], azimuth: 28, elevation: 8 },
  balance: { min: [140, -2, -42], max: [162, 14, -20], azimuth: -20, elevation: 24 },
  scale: { min: [140, 0, 0], max: [162, 80, 20], azimuth: -10, elevation: 8 },
}
