// Pure helpers of the 3D scene (no three.js, no DOM): coordinate mapping, rail-scale conversions, staging layout, camera preset boxes.
// Unit tests: tests/newton2/scene3d-units.test.ts.
//
// Scene units: 1 unit = 1 cm, y up, x from the stand end toward the receiver (the cart's direction of travel), z toward the viewer.
// The bench top is y = 0 and the floor is y = -BENCH_HEIGHT.
import { CART_LENGTH_m, RAIL_LENGTH_m, RAIL_SCALE_MAX_mm, SUPPORT_FROM_END_m, SUPPORT_SEPARATION_m, type ApparatusState, type ItemId } from '../../apparatus/index.ts'
import { BENCH_HEIGHT_m, CANISTER_HANG_m, RAIL_FREE_END_SAG_m, STRING_ABOVE_RAIL_m, SUPPORT_BASE_HEIGHT_m } from '../../physics/index.ts'

export const CM_PER_M = 100

/** Floor level, y in scene cm. */
export const FLOOR_Y_cm = -BENCH_HEIGHT_m * CM_PER_M
export const RAIL = { halfW: 1.25, height: 2.0, length: RAIL_LENGTH_m * CM_PER_M }
export const SUPPORT_FROM_END_cm = SUPPORT_FROM_END_m * CM_PER_M
/** The rail root sits at -SUPPORT_FROM_END_cm (the stand), so the rail end / receiver is here: the bench ends flush with it and the canister hangs past it. */
export const BENCH_EDGE_X_cm = RAIL.length - SUPPORT_FROM_END_cm
/** Bench top (top face at y = 0), centimetres: its right edge is the receiver. */
export const BENCH = { x: BENCH_EDGE_X_cm - 90, z: 0, width: 180, depth: 90, thickness: 3 }
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

/** Rail root (its stand end) in the table frame: x = -SUPPORT_FROM_END, so the clamp sits at x = 0. */
export const RAIL_ROOT_X_cm = -SUPPORT_FROM_END_cm
export const CART_LENGTH_cm = CART_LENGTH_m * CM_PER_M
/** Height of the rail top at the stand clamp above the bench top, cm. */
export const clampHeight_cm = (s: Pick<ApparatusState, 'rack_mm'>): number => (SUPPORT_BASE_HEIGHT_m + s.rack_mm / 1000) * CM_PER_M
/**
 * Rotation about z used to draw the rail once it is in the clamp (negative: slopes down toward +x, the receiver end). Held at both ends
 * it follows the support heights; with the receiver missing its free end sags RAIL_FREE_END_SAG_m (physics/constants.ts); loose: 0.
 */
export function drawnTilt_rad(s: Pick<ApparatusState, 'geometry' | 'joints'>): number {
  if (s.geometry) return drawnRailTilt_rad(s.geometry.standHeight_m, s.geometry.receiverHeight_m, SUPPORT_SEPARATION_m)
  return s.joints.rackClamp !== null ? -Math.asin(RAIL_FREE_END_SAG_m / SUPPORT_SEPARATION_m) : 0
}
/** World position of a point `d_cm` along the clamped rail (rail top surface), for the state's clamp height and tilt. */
export function railPoint(s: Pick<ApparatusState, 'geometry' | 'joints' | 'rack_mm'>, d_cm: number, y_cm = 0): [number, number, number] {
  return railLocalToWorld([RAIL_ROOT_X_cm, clampHeight_cm(s), 0], drawnTilt_rad(s), [d_cm, y_cm, 0])
}
/**
 * Where the front of a cart that has run off the rail end is (origin of the cart model: front, wheel bottoms), given the offsets of its
 * fall from the physics (centre left the rail end `x_m` ago in distance and `drop_m` in height). Never below the floor.
 */
export function fallenCartOrigin(s: Pick<ApparatusState, 'geometry' | 'joints' | 'rack_mm'>, fall: { x_m: number; drop_m: number }): [number, number, number] {
  const exit = railPoint(s, RAIL.length + CART_LENGTH_cm / 2)
  return [exit[0] + fall.x_m * CM_PER_M, Math.max(FLOOR_Y_cm, exit[1] - fall.drop_m * CM_PER_M), exit[2]]
}

export interface Slot { x: number; z: number; rotY: number }
/** Where the loose rail lies (its stand end), cm: in the front row, within the bench top. */
export const LOOSE_RAIL = { x: -8, y: 2, z: 28 }
/** Resting places in cm (bench frame). The loose rail lies in the front row. */
export const STAGING: Record<Exclude<ItemId, 'rail'>, Slot> = {
  cart: { x: 24, z: 36, rotY: 0 },
  rackStand: { x: -16, z: -34, rotY: 0 },
  standBase: { x: 6, z: -33, rotY: 0 },
  receiver: { x: 84, z: 36, rotY: 0 },
  screws: { x: 52, z: 36, rotY: 0 },
  level: { x: 60, z: -24, rotY: -0.03 },
  string: { x: 104, z: 36, rotY: 0.2 },
  canister: { x: 46, z: -24, rotY: 0 },
  brassScrew: { x: 70, z: 36, rotY: 0.4 },
  plasticScrews: { x: 62, z: 36, rotY: 0.2 },
  masses: { x: 27, z: -24, rotY: 0 },
  balance: { x: 100, z: -24, rotY: -0.2 },
  dynamometer: { x: 13, z: -24, rotY: 0 },
  dynamometer2N: { x: 20, z: -24, rotY: 0 },
  stopwatch: { x: 96, z: -34, rotY: 0.3 },
  markers: { x: 76, z: -34, rotY: 0 },
  twoLegStand: { x: 36, z: -34, rotY: 0 },
  mass50: { x: 80, z: -24, rotY: 0 },
  marble: { x: 88, z: -24, rotY: 0 },
}
/** Where the 10 g masses wait on the bench (index 0..3) when left out of the system. */
export const BENCH_MASS_SLOT: Slot = { x: 27, z: -24, rotY: 0 }
/** The post that holds the dynamometer when it weighs the canister, and the hook height. */
export const SCALE_POST = { x: 100, z: 16, rotY: 0, armLength: 10, height: 70 }

export type PresetName = 'overview' | 'start' | 'pulley' | 'floor' | 'balance' | 'scale'
export const PRESET_NAMES: readonly PresetName[] = ['overview', 'start', 'pulley', 'floor', 'balance', 'scale']
/** Parse a preset name from a URL parameter or a caller; null when unknown. */
export function parsePreset(s: string | null | undefined): PresetName | null {
  return s && (PRESET_NAMES as readonly string[]).includes(s) ? (s as PresetName) : null
}

export type Vec = readonly [number, number, number]
/** Box (min, max) in scene cm to frame for each preset, and the viewing angles (deg). */
export const PRESET_VIEWS: Record<PresetName, { min: Vec; max: Vec; azimuth: number; elevation: number }> = {
  overview: { min: [-12, -35, -24], max: [124, 38, 36], azimuth: 10, elevation: 22 },
  start: { min: [-12, -2, -14], max: [38, 20, 14], azimuth: -28, elevation: 20 },
  pulley: { min: [96, -30, -12], max: [140, 14, 12], azimuth: 30, elevation: 14 },
  // wide enough for the canister at the floor and for a cart that ran off the rail end (lands about 35 cm and rests about 65 cm beyond the bench edge)
  floor: { min: [90, FLOOR_Y_cm - 6, -22], max: [190, 12, 22], azimuth: 24, elevation: 8 },
  balance: { min: [88, -2, -34], max: [112, 14, -14], azimuth: -20, elevation: 24 },
  scale: { min: [84, 0, 4], max: [108, 80, 28], azimuth: -10, elevation: 8 },
}
/** Overview for a portrait stage (phones): a closer, steeper view of the rail end, pulley and hanging canister. */
export const PORTRAIT_OVERVIEW = { min: [-10, -35, -24] as Vec, max: [122, 30, 36] as Vec, azimuth: 55, elevation: 24 }
