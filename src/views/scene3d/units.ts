// Pure helpers of the 3D table scene (no three.js, no DOM): coordinate mapping, rail-scale conversions, marker labels,
// staging layout, ghost (assembly affordance) and snap decisions, drag maths. Unit tests: tests/scene3d-*.test.ts.
//
// Scene units: 1 unit = 1 cm, y up, same axes as the apparatus world frame (x down-slope, z toward the viewer).
import {
  CART_LENGTH_m, FOOT_RANGE_mm, FOOT_STEP_mm, RACK_BASE_HEIGHT_m, RACK_MAX_mm, RACK_MIN_mm, RAIL_LENGTH_m,
  RAIL_SCALE_MAX_mm, RECEIVER_STOP_FROM_END_m, TWO_LEG_BASE_HEIGHT_m, CART_FRONT_REFERENCE_OFFSET_m,
  downSlope_m, railPointAt, railPos_mm,
  type ApparatusState, type CaliperTarget, type ItemId, type MarksEvaluation, type RailGeometry, type RailPose, type Vec3,
} from '../../apparatus/index.ts'

export const CM_PER_M = 100

/** World metres (apparatus frame) to scene centimetres. */
export function toScene(v: Vec3): [number, number, number] {
  return [v.x_m * CM_PER_M, v.y_m * CM_PER_M, v.z_m * CM_PER_M]
}

/** Table (top face at y = 0), centimetres. */
export const TABLE = { x: 62, z: 0, width: 200, depth: 90, thickness: 3 }

// ---- Rail geometry (visual, cm; the rail is a child frame: x along the rail from the high end, y normal, z across) -----
export const RAIL = { halfW: 1.25, height: 2.0, length: RAIL_LENGTH_m * CM_PER_M }
/** Distance of the supports from the nearest rail end, cm (apparatus SUPPORT_FROM_END_m). */
export const SUPPORT_FROM_END_cm = 5

/** Local rail x (cm from the high end) of a printed-scale position. */
export function railLocalX_cm(pos_mm: number, scaleZeroAtHighEnd: boolean): number {
  return downSlope_m(pos_mm, scaleZeroAtHighEnd) * CM_PER_M
}
/** Printed-scale position (mm) of a local rail x (cm), clamped to the rail. */
export function railPosFromLocalX_mm(x_cm: number, scaleZeroAtHighEnd: boolean): number {
  const D = Math.min(RAIL_LENGTH_m, Math.max(0, x_cm / CM_PER_M))
  return railPos_mm(D, scaleZeroAtHighEnd)
}

// ---- Markers -------------------------------------------------------------------------------------------------------
/** Tape label from the distance to A in mm (marks snap to 0.5 mm): "30", "30.5", "9.95" cm (dot decimals, no trailing zeros). */
export function markerLabel(fromA_mm: number): string {
  const cm = Math.round(fromA_mm * 2) / 20
  return String(Number(cm.toFixed(2)))
}
/** Label of every marker (id -> text) relative to A (the highest mark). */
export function markerLabels(markers: readonly { id: string; railPos_mm: number }[], ev: Pick<MarksEvaluation, 'aRailPos_mm'>): Map<string, string> {
  const out = new Map<string, string>()
  for (const m of markers) out.set(m.id, ev.aRailPos_mm === null ? '' : markerLabel(Math.abs(m.railPos_mm - ev.aRailPos_mm)))
  return out
}

// ---- Staging area (unattached items rest on the table) -----------------------------------------------------------
export interface Slot { x: number; z: number; rotY: number }
/** Resting places in cm (table frame). The loose rail is placed by the apparatus (z = 25 cm, front row). */
export const STAGING: Record<Exclude<ItemId, 'rail'> | 'caliperRest', Slot> = {
  cart: { x: 24, z: 38, rotY: 0 },
  twoLegStand: { x: 56, z: 38, rotY: 0 },
  receiver: { x: 84, z: 37, rotY: 0 },
  screws: { x: 103, z: 38, rotY: 0 },
  level: { x: 120, z: 36, rotY: 0.05 },
  stopwatch: { x: -3, z: 33, rotY: -0.3 },
  rackStand: { x: 8, z: -34, rotY: 0 },
  standBase: { x: 62, z: -33, rotY: 0 },
  markers: { x: 92, z: -32, rotY: 0 },
  caliper: { x: 118, z: -30, rotY: 0.12 },
  caliperRest: { x: 118, z: -30, rotY: 0.12 },
}
/** Where a level lying on the table sits (tool "table"). */
export const LEVEL_ON_TABLE: Slot = { x: 60, z: -14, rotY: 0 }

// ---- Ghosts (assembly affordance) ---------------------------------------------------------------------------------
export type GhostId = 'stand' | 'clamp' | 'twoLeg' | 'receiver' | 'cart'
type GhostInput = Pick<ApparatusState, 'items' | 'joints' | 'cart'> & { geometry: RailGeometry | null | object }
/** Which parts can be attached right now (a translucent ghost is drawn at the target). Screws are checked by the apparatus. */
export function ghostsFor(s: GhostInput): GhostId[] {
  const out: GhostId[] = []
  const { items: it, joints: j } = s
  if (it.rackStand && it.standBase && !j.standBase) out.push('stand')
  if (it.rail && it.rackStand && j.standBase && j.rackClamp === null) out.push('clamp')
  if (it.rail && it.twoLegStand && j.rackClamp !== null && !j.twoLegStand) out.push('twoLeg')
  if (it.rail && it.receiver && j.rackClamp !== null && !j.receiver) out.push('receiver')
  if (it.cart && s.geometry && !s.cart.placed) out.push('cart')
  return out
}
/** The item whose staging copy gets the pulsing highlight for a ghost. */
export const GHOST_ITEMS: Record<GhostId, ItemId[]> = {
  stand: ['rackStand', 'standBase'], clamp: ['rail'], twoLeg: ['twoLegStand'], receiver: ['receiver'], cart: ['cart'],
}

// ---- Cart ----------------------------------------------------------------------------------------------------------
/** Can the cart front sit at this printed position? Mirrors the rule the apparatus applies (whole cart on the rail, before the stop). */
export function cartFrontValid(frontPos_mm: number, scaleZeroAtHighEnd: boolean, hasReceiver: boolean): boolean {
  if (!Number.isFinite(frontPos_mm) || frontPos_mm < 0 || frontPos_mm > RAIL_SCALE_MAX_mm) return false
  const D = downSlope_m(frontPos_mm, scaleZeroAtHighEnd)
  return D >= CART_LENGTH_m - 1e-9 && D <= RAIL_LENGTH_m - (hasReceiver ? RECEIVER_STOP_FROM_END_m : 0) + 1e-9
}
/** Nearest valid front position to a wanted one (used for the drag preview colour only; the apparatus decides). */
export function clampCartFront(frontPos_mm: number, scaleZeroAtHighEnd: boolean, hasReceiver: boolean): number {
  const lo = CART_LENGTH_m, hi = RAIL_LENGTH_m - (hasReceiver ? RECEIVER_STOP_FROM_END_m : 0)
  const D = Math.min(hi, Math.max(lo, downSlope_m(frontPos_mm, scaleZeroAtHighEnd)))
  return railPos_mm(D, scaleZeroAtHighEnd)
}
/** Default front position for the cart ghost: mark A when there is one, else the first valid spot from the top. */
export function cartGhostFront_mm(aRailPos_mm: number | null, scaleZeroAtHighEnd: boolean): number {
  if (aRailPos_mm !== null) return aRailPos_mm
  return railPos_mm(CART_LENGTH_m + 0.01, scaleZeroAtHighEnd)
}
/** Rotation angle (rad) of a wheel of radius r_cm after the cart front travelled D_cm down the rail. */
export const wheelAngle_rad = (D_cm: number, r_cm: number): number => D_cm / r_cm

// ---- Drag maths ---------------------------------------------------------------------------------------------------
/** Rack reading (mm, clamped to the scale) for a wanted clamp (rail top surface) height in cm. */
export function rackFromHeight_mm(clampHeight_cm: number): number {
  const mm = (clampHeight_cm - RACK_BASE_HEIGHT_m * CM_PER_M) * 10
  return Math.min(RACK_MAX_mm, Math.max(RACK_MIN_mm, Math.round(mm)))
}
/** Clamp surface height (cm) for a rack reading. */
export const clampHeight_cm = (rack_mm: number): number => RACK_BASE_HEIGHT_m * CM_PER_M + rack_mm / 10
/** Two-leg height (cm) for a foot reading. */
export const twoLegHeight_cm = (foot_mm: number): number => TWO_LEG_BASE_HEIGHT_m * CM_PER_M + foot_mm / 10
/** Screw foot (mm) after a vertical drag of dy_px screen pixels (up positive), 1 px = one apparatus step. Clamped, step-snapped. */
export function footFromDrag_mm(startFoot_mm: number, dyUp_px: number): number {
  const v = startFoot_mm + dyUp_px * FOOT_STEP_mm
  const snapped = Math.round(v / FOOT_STEP_mm) * FOOT_STEP_mm
  return Math.round(Math.min(FOOT_RANGE_mm, Math.max(-FOOT_RANGE_mm, snapped)) * 1e6) / 1e6
}
/** One mouse-wheel notch on the rack knob: +-1 mm (wheel up raises). */
export const rackWheelStep_mm = (deltaY: number): number => (deltaY < 0 ? 1 : -1)
/** One wheel notch on the foot: +-1 step, 5 steps with shift. */
export const footWheelStep_mm = (deltaY: number, shift: boolean): number => (deltaY < 0 ? 1 : -1) * FOOT_STEP_mm * (shift ? 5 : 1)

// ---- Caliper (visual only: the reading itself comes from apparatus.caliperMeasure) --------------------------------------
/** Jaw opening (m) the caliper model shows for a target, from the same geometry the apparatus uses; null when not drawable. */
export function caliperOpening_m(t: CaliperTarget, geo: RailGeometry | null): number | null {
  if (t.kind === 'cartLength') return CART_LENGTH_m
  if (t.kind === 'frontReferenceOffset') return CART_FRONT_REFERENCE_OFFSET_m
  if (!geo) return null
  if (t.at === 'clamp') return geo.clampHeight_m
  if (t.at === 'twoLeg') return geo.supportedBothEnds ? geo.twoLegHeight_m : null
  const p = t.at.railPos_mm
  if (!Number.isFinite(p) || p < 0 || p > RAIL_SCALE_MAX_mm) return null
  return railPointAt(geo.pose, downSlope_m(p, geo.scaleZeroAtHighEnd!)).y_m
}
/** Local x (cm from the high end, along the rail) where the depth rod of the caliper stands for a rail-height target. */
export function caliperRailX_cm(t: Extract<CaliperTarget, { kind: 'railHeight' }>, geo: Pick<RailGeometry, 'scaleZeroAtHighEnd'> | null): number {
  if (t.at === 'clamp') return SUPPORT_FROM_END_cm + 3.4
  if (t.at === 'twoLeg') return RAIL.length - SUPPORT_FROM_END_cm - 2.6
  return railLocalX_cm(t.at.railPos_mm, geo?.scaleZeroAtHighEnd ?? true)
}

// ---- Misc ----------------------------------------------------------------------------------------------------------
/** Pose helper: tilt angle (rad about z, scene) of things lying in the rail frame. */
export const railTilt_rad = (pose: Pick<RailPose, 'railAngle_rad'>): number => -pose.railAngle_rad
/** Hit of a ray on the rail frame: local x (cm) and local z (cm) -> within the rail footprint? */
export function onRailFootprint(x_cm: number, z_cm: number, margin_cm = 0): boolean {
  return x_cm >= -margin_cm && x_cm <= RAIL.length + margin_cm && Math.abs(z_cm) <= RAIL.halfW + margin_cm
}
