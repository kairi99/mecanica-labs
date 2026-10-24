// Pure helpers of the 3D bench (no three.js, no DOM): unit conversion, layout constants, camera-framing point sets, the pose
// of the tape measure for each target, and small drag maths. Scene units are cm (1 unit = 1 cm), y up, the table top is y = 0
// and the floor is y = -H. x runs from the table edge outward (the ball flies toward +x), z is lateral (+z toward the camera).
// The apparatus frames are the launch frame (x_m, y_m, z_m): rail poses use the table frame (y = 0 on the table top), ball poses
// and floor items the floor frame (y = 0 on the floor).
import {
  GAP_MAX_m, GAP_MIN_m, RACK_BASE_HEIGHT_m, RACK_MAX_mm, RACK_MIN_mm, RACK_FROM_TIP_m, RAIL_HEIGHT_m, RAIL_LENGTH_m, TWO_LEG_FROM_TIP_m, SHEET_LONG_m, SHEET_SHORT_m,
  type RailGeometry, type SheetPose, type TapeTarget, type Vec3,
} from '../../apparatus/index.ts'
import { boxCorners, type Vec } from '../../../../core/scene3d/framing.ts'
import type { PresetName } from '../stage.ts'

export type V3 = [number, number, number]
export const CM = 100

// ---- Layout (cm) -----------------------------------------------------------------------------------------------------
/** Lab table: the edge is the plane x = 0, the top face is y = 0. */
export const TABLE = { x0: -205, x1: 0, halfD: 45, thickness: 3.5, legSize: 5, legInset: 6 } as const
/** Floor extent: big enough that its far edge is lost in the fog. */
export const FLOOR = { x0: -1100, x1: 1100, halfZ: 900 } as const
/** Rail profile of the shared model (half width, height), cm. */
export const RAIL = { halfW: 1.25, height: RAIL_HEIGHT_m * CM, length: RAIL_LENGTH_m * CM } as const
/** Rod of the rack stand behind the rail axis (core default), cm. */
export const ROD_Z = -3.4
/** Where the loose parts wait on the table (x, z in cm; rotY in rad). Front strip z > 12 is free of the rail and the stands. */
export const STAGING = {
  rail: { x: -180, z: 8, rotY: 0 },
  base: { x: -120, z: -22, rotY: 0 },
  rackStand: { x: -168, z: -22, rotY: 0 },
  twoLeg: { x: -92, z: -22, rotY: 0 },
  stopwatch: { x: -16, z: 31, rotY: 0.1 },
  bond: { x: -44, z: 27 },
  carbon: { x: -84, z: 27 },
  level: { x: -118, z: 29, rotY: 0 },
  tape: { x: -146, z: 30 },
  screws: { x: -172, z: 29 },
  marble: { x: -78, z: 14 },
  pingPong: { x: -64, z: 14 },
} as const
/** Home x of the rack stand while the rail is not mounted (cm). */
export const STAND_HOME_x = -125
/** Default landing zone shown by the 'edge' and 'floor' views, cm from the edge. Covers the farthest landing of any bench (see tests). */
export const ZONE_MAX_cm = 110
/** Half width of the default landing zone, cm. */
export const ZONE_HALF_Z_cm = 22
/** Smallest dot drawn for a carbon mark, cm (real dots are 2 to 4 mm: too small to see otherwise). */
export const MARK_MIN_DIAMETER_cm = 0.4
/** Plumb cross arm half length, cm. */
export const CROSS_ARM_cm = 1.6
/** Hit radius of a carbon mark for the tape tool, cm. */
export const MARK_HIT_cm = 1.6

// ---- Footprints on the table (cm) -------------------------------------------------------------------------------------
/** Rectangle on the tabletop (x, z in cm). */
export interface Box2 { x0: number; x1: number; z0: number; z1: number }
/** The level lying on the table: half extents (12 x 2.2 cm body). */
export const LEVEL_HALF = { x: 6, z: 1.1 } as const
/** Where the loose parts wait (footprints of STAGING, with a little margin), cm. Used to keep the level from landing on them. */
export const STAGED_BOXES: readonly Box2[] = [
  { x0: -180, x1: -60, z0: 6.5, z1: 9.5 }, // rail
  { x0: -128, x1: -110, z0: -29, z1: -17 }, // base plate
  { x0: -170, x1: -129, z0: -24, z1: -20 }, // rack stand lying
  { x0: -94, x1: -90, z0: -28, z1: -16 }, // two-leg stand
  { x0: -22, x1: -10, z0: 24, z1: 38 }, // stopwatch
  { x0: -60, x1: -28, z0: 16, z1: 38 }, // bond sheet
  { x0: -100, x1: -68, z0: 16, z1: 38 }, // carbon sheet
  { x0: -124, x1: -112, z0: 27, z1: 31 }, // level
  { x0: -150, x1: -142, z0: 26, z1: 34 }, // tape measure
  { x0: -176, x1: -167, z0: 26, z1: 32 }, // screws
  { x0: -80, x1: -76, z0: 12, z1: 16 }, // marble
  { x0: -67, x1: -61, z0: 11, z1: 17 }, // ping-pong ball
]
/** Footprints of what stands on the table around the mounted rail: the rail strip, the stand base and rod, the two-leg stand's legs. */
export function mountedBoxes(geo: RailGeometry, standOn: boolean, twoLegOn: boolean): Box2[] {
  const out: Box2[] = []
  const hi = geo.pose.highEnd.x_m * CM, lo = geo.pose.tip.x_m * CM
  out.push({ x0: hi - 1, x1: lo + 1, z0: -RAIL.halfW - 0.5, z1: RAIL.halfW + 0.5 })
  const cx = geo.pose.clamp.x_m * CM
  if (standOn) out.push({ x0: cx - 6.5, x1: cx + 9.5, z0: -6.5, z1: 4.5 })
  if (twoLegOn) { const tx = geo.pose.twoLeg.x_m * CM; out.push({ x0: tx - 1.8, x1: tx + 1.8, z0: -5.2, z1: 5.2 }) }
  return out
}
/**
 * Nearest spot to (x, z) for the level on the table: inside the table and clear of every box (its own half extents added).
 * The spot itself when it is free; otherwise the nearest free point of a 1 cm grid over the tabletop (null result impossible: the
 * table is far larger than the boxes).
 */
export function levelTableSpot(x: number, z: number, boxes: readonly Box2[]): { x: number; z: number } {
  const lim = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))
  const xLo = TABLE.x0 + LEVEL_HALF.x + 2, xHi = -LEVEL_HALF.x - 2, zLo = -TABLE.halfD + LEVEL_HALF.z + 2, zHi = TABLE.halfD - LEVEL_HALF.z - 2
  const free = (px: number, pz: number): boolean => boxes.every((b) => !(px > b.x0 - LEVEL_HALF.x && px < b.x1 + LEVEL_HALF.x && pz > b.z0 - LEVEL_HALF.z && pz < b.z1 + LEVEL_HALF.z))
  const p = { x: lim(x, xLo, xHi), z: lim(z, zLo, zHi) }
  if (free(p.x, p.z)) return p
  let best = p, bestD = Infinity
  for (let px = Math.ceil(xLo); px <= xHi; px++) {
    for (let pz = Math.ceil(zLo); pz <= zHi; pz++) {
      const d = (px - p.x) ** 2 + (pz - p.z) ** 2
      if (d < bestD && free(px, pz)) { bestD = d; best = { x: px, z: pz } }
    }
  }
  return best
}
/** Allowed range of the level's centre on the rail, rail-frame x (cm from the high end): clear of the rack-stand collar and of the two-leg stand. */
export function levelRailRange_cm(twoLegOn: boolean): { min: number; max: number } {
  const clampX = RAIL.length - RACK_FROM_TIP_m * CM, legX = RAIL.length - TWO_LEG_FROM_TIP_m * CM
  return { min: clampX + 2.4 + LEVEL_HALF.x + 0.3, max: twoLegOn ? legX - 1.2 - LEVEL_HALF.x - 0.3 : RAIL.length - LEVEL_HALF.x }
}

// ---- Conversions -----------------------------------------------------------------------------------------------------
/** Launch-frame point to scene cm. `base_m` = 0 for table-frame points, H for floor-frame points (y above the floor). */
export const toScene = (p: Vec3, base_m = 0): V3 => [p.x_m * CM, (p.y_m - base_m) * CM, p.z_m * CM]
/** Floor-frame ball centre to scene cm (table top is y = 0). */
export const ballToScene = (p: Vec3, H_m: number): V3 => toScene(p, H_m)
/** Rail-frame x (cm from the HIGH end along the rail) of a position s_m measured from the low tip. */
export const railLocalX_cm = (s_m: number): number => (RAIL_LENGTH_m - s_m) * CM
/** Position from the low tip (m) of a rail-frame x (cm from the high end), clamped to the rail. */
export const railS_m = (localX_cm: number): number => Math.min(RAIL_LENGTH_m, Math.max(0, RAIL_LENGTH_m - localX_cm / CM))

/** Rail frame in the scene: origin at the HIGH end (top surface), +x toward the low end, rotated about z by `tilt`. */
export interface RailFrame { origin: V3; tilt_rad: number }
export function railFrame(geo: RailGeometry): RailFrame {
  const hi = geo.pose.highEnd
  return { origin: toScene(hi), tilt_rad: -geo.theta_rad }
}
/** Rail-frame point (cm) to scene cm. */
export function railLocalToWorld(f: RailFrame, p: Vec): V3 {
  const c = Math.cos(f.tilt_rad), s = Math.sin(f.tilt_rad)
  return [f.origin[0] + p[0] * c - p[1] * s, f.origin[1] + p[0] * s + p[1] * c, f.origin[2] + p[2]]
}
/** Scene point (cm) to the rail frame (inverse of railLocalToWorld). */
export function worldToRailLocal(f: RailFrame, p: Vec): V3 {
  const dx = p[0] - f.origin[0], dy = p[1] - f.origin[1]
  const c = Math.cos(f.tilt_rad), s = Math.sin(f.tilt_rad)
  return [dx * c + dy * s, -dx * s + dy * c, p[2] - f.origin[2]]
}

/** Label of a rail mark: its distance from the low tip in cm, as the student aimed it ("80", "85.5"). */
export function markLabel(s_m: number): string {
  const cm = Math.round(s_m * CM * 10) / 10
  return Number.isInteger(cm) ? String(cm) : cm.toFixed(1)
}

// ---- Sheets on the floor -----------------------------------------------------------------------------------------------
/** Half extents of a sheet on the floor in x and z, cm. */
export function sheetHalf_cm(p: Pick<SheetPose, 'orientation'>): { hx: number; hz: number } {
  const long = (SHEET_LONG_m * CM) / 2, short = (SHEET_SHORT_m * CM) / 2
  return p.orientation === 'alongX' ? { hx: long, hz: short } : { hx: short, hz: long }
}
export interface RectCm { x0: number; x1: number; z0: number; z1: number }
export function sheetRectCm(p: SheetPose): RectCm {
  const { hx, hz } = sheetHalf_cm(p)
  return { x0: p.x_m * CM - hx, x1: p.x_m * CM + hx, z0: p.z_m * CM - hz, z1: p.z_m * CM + hz }
}
/** Dot diameter drawn for a mark, cm (never below the visibility floor). */
export const markDiameter_cm = (d_m: number): number => Math.max(MARK_MIN_DIAMETER_cm, d_m * CM)

// ---- Ball spin -----------------------------------------------------------------------------------------------------------
/** Rotation (rad about z, ball rolling toward +x turns clockwise seen from +z) for a rolled path length, no slip. */
export const rollAngle_rad = (path_cm: number, radius_cm: number): number => -path_cm / radius_cm

// ---- Drag maths ----------------------------------------------------------------------------------------------------------
/** Rack setting (whole mm) for a knob height (cm above the table): the clamp sits 2.4 cm above the knob axis. */
export function rackFromKnobY_mm(knobY_cm: number): number {
  const mm = Math.round(((knobY_cm + 2.4) / CM - RACK_BASE_HEIGHT_m) * 1000)
  return Math.min(RACK_MAX_mm, Math.max(RACK_MIN_mm, mm))
}
/** Gap (whole mm) after dragging the rail by dx_cm along +x (toward the edge shrinks the gap). Kept inside what the apparatus accepts. */
export function gapFromDrag_mm(startGap_mm: number, dx_cm: number): number {
  return Math.min(Math.round(GAP_MAX_m * 1000), Math.max(Math.round(GAP_MIN_m * 1000), Math.round(startGap_mm - dx_cm * 10)))
}
/** Wheel step for fine adjustment: one unit per notch, sign opposite to the scroll direction (scroll up raises). */
export const wheelStep = (deltaY: number): number => (deltaY < 0 ? 1 : -1)

// ---- Camera framing ------------------------------------------------------------------------------------------------------
/** Azimuth and elevation (deg) of every preset. Edge looks perpendicular to the launch plane, raised enough to show the table top. */
export const VIEW_ANGLES: Record<Exclude<PresetName, 'tape'>, { azimuth: number; elevation: number }> = {
  overview: { azimuth: -24, elevation: 24 },
  release: { azimuth: -22, elevation: 16 },
  edge: { azimuth: 0, elevation: 8 },
  floor: { azimuth: 0, elevation: 88 },
}
/** Edge view: slack kept beyond the paper's far end, and the least extent when paper sits close to the table. */
const EDGE_PAPER_MARGIN_cm = 10
const EDGE_MIN_RIGHT_cm = 60
/** Room under the floor line: the 3D/2D toggle floats over the bottom corner of a phone stage and must not cover the paper. */
const EDGE_FLOOR_SLACK_cm = 16
/** Everything a preset needs to know about the current bench (cm). */
export interface FrameInput {
  H_cm: number
  /** Rail tip x (cm, negative); null while the rail is not mounted. */
  tipX_cm: number | null
  highEnd: V3 | null
  clamp: V3 | null
  /** Rail frame, when mounted. */
  frame: RailFrame | null
  /** Farthest x the ball may reach, cm: at least ZONE_MAX_cm, grows with paper and marks outside it. */
  landMax_cm: number
  sheets: RectCm[]
  /** Points on the floor that must stay visible (marks, the plumb cross). */
  floorPoints: [number, number][]
}
/** Vertical field of view (deg) per preset. The edge view is nearly telephoto so perspective does not blow up the near table legs. */
export const FOV_DEFAULT_deg = 35
export const FOV_EDGE_deg = 20
export const fovFor = (name: PresetName): number => (name === 'edge' ? FOV_EDGE_deg : FOV_DEFAULT_deg)
export const defaultFrameInput = (H_cm: number): FrameInput => ({
  H_cm, tipX_cm: null, highEnd: null, clamp: null, frame: null, landMax_cm: ZONE_MAX_cm, sheets: [], floorPoints: [],
})
/** Farthest x to keep in view: the default landing zone, or beyond when paper or marks lie further out. */
export function landMaxFor(sheets: readonly RectCm[], floorPoints: readonly [number, number][], extra_cm = 0): number {
  let m = ZONE_MAX_cm
  for (const r of sheets) m = Math.max(m, r.x1 + 6)
  for (const p of floorPoints) m = Math.max(m, p[0] + 8)
  return Math.ceil(Math.max(m, extra_cm) / 10) * 10
}

/** Overview: the whole set-up from the rack stand to the landing zone on the floor, table and floor together. */
export function overviewPoints(f: FrameInput): Vec[] {
  const left = (f.highEnd ? f.highEnd[0] : STAND_HOME_x) - 22
  const top = Math.max(f.clamp ? f.clamp[1] + 24 : 0, 42)
  return boxCorners([left, -f.H_cm - 1, -TABLE.halfD], [f.landMax_cm, top, TABLE.halfD])
}
/** Release: the high end of the rail with the rack stand, and the upper half of the track where the marks go. */
export function releasePoints(f: FrameInput): Vec[] {
  const fr = f.frame
  if (!fr) return boxCorners([STAND_HOME_x - 40, -2, -14], [STAND_HOME_x + 60, 42, 16])
  const pts: Vec[] = []
  // rail-frame x from the high end to just past the middle of the rail (s >= 50 cm), plus the rod and base of the stand
  for (const x of [-12, RAIL.length * 0.55]) for (const y of [-RAIL.height - 1, 9]) for (const z of [-RAIL.halfW - 1, RAIL.halfW + 1]) pts.push(railLocalToWorld(fr, [x, y, z]))
  const cx = f.clamp ? f.clamp[0] : fr.origin[0] + 10
  pts.push(...boxCorners([cx - 10, 0, -10], [cx + 10, 40, 8]))
  return pts
}
/**
 * Edge: the timing view, a side profile perpendicular to the launch plane (narrow FOV, the near legs fade out in the scene). Frames the
 * rail's low end on the table, the table edge (with its near corner) and the floor out to slightly beyond the far end of the paper (or the marks); with no paper laid yet it
 * keeps the whole default landing zone. Tighter than the zone on purpose: on a narrow phone stage the empty floor beyond the
 * paper would shrink everything the student has to watch.
 */
export function edgePoints(f: FrameInput): Vec[] {
  const left = f.tipX_cm !== null ? Math.min(-20, f.tipX_cm - 5) : -34
  let right = f.landMax_cm
  if (f.sheets.length > 0) {
    right = EDGE_MIN_RIGHT_cm
    for (const r of f.sheets) right = Math.max(right, r.x1 + EDGE_PAPER_MARGIN_cm)
    for (const p of f.floorPoints) right = Math.max(right, p[0] + EDGE_PAPER_MARGIN_cm)
    right = Math.min(right, f.landMax_cm)
  }
  const pts: Vec[] = boxCorners([left, -f.H_cm - EDGE_FLOOR_SLACK_cm, -4], [right, 20, 4])
  pts.push(...boxCorners([-3, -TABLE.thickness, -TABLE.halfD], [0, 0, TABLE.halfD]))
  return pts
}
/** Floor: top-down view of the paper and the marks (or the default landing zone), with the plumb cross when it exists. */
export function floorPoints(f: FrameInput): Vec[] {
  const y = -f.H_cm
  let x0 = -8, x1 = ZONE_MAX_cm * 0.9, z0 = -ZONE_HALF_Z_cm, z1 = ZONE_HALF_Z_cm
  if (f.sheets.length > 0) {
    x0 = Infinity; x1 = -Infinity; z0 = Infinity; z1 = -Infinity
    for (const r of f.sheets) { x0 = Math.min(x0, r.x0); x1 = Math.max(x1, r.x1); z0 = Math.min(z0, r.z0); z1 = Math.max(z1, r.z1) }
    x0 -= 4; x1 += 4; z0 -= 4; z1 += 4
  }
  for (const p of f.floorPoints) { x0 = Math.min(x0, p[0] - 4); x1 = Math.max(x1, p[0] + 4); z0 = Math.min(z0, p[1] - 4); z1 = Math.max(z1, p[1] + 4) }
  return boxCorners([x0, y, z0], [x1, y + 0.2, z1])
}

// ---- Tape measure plan ---------------------------------------------------------------------------------------------------
/** What the tape plan needs from the apparatus (all true geometry, for DRAWING only; no number is shown as text). */
export interface TapeWorld {
  H_m: number
  geo: RailGeometry | null
  /** True position of a rail mark from the low tip, m. */
  markS_m(id: string): number | null
  /** Floor position of a carbon mark, launch frame, m. */
  markOnFloor(id: string): { x_m: number; z_m: number } | null
  /** True position of the edge projection point, m. */
  edgeProjection: { x_m: number; z_m: number } | null
}
/** Where and how the tape measure model is placed. `frame` 'rail' means rail-frame coordinates (child of the rail). */
export interface TapePlan {
  mode: 'down' | 'right' | 'left'
  length_cm: number
  frame: 'scene' | 'rail'
  position: V3
  /** Euler angles (order YXZ): yaw about y, then flat (pitch -90 deg about x lays the blade face up). */
  yaw_rad: number
  flat: boolean
  /** The reading point (where the blade meets the object) in the SCENE frame, cm. */
  reading: V3
  /** The hook (zero) in the scene frame, cm. */
  hook: V3
}
const TAPE_Z_BESIDE_RAIL = 3.4
/** z of the vertical blade of the rise measurement: in front of the knob and of the base plate (plate edge at z = 4.5), cm. */
const TAPE_Z_RISE = 5.2
/**
 * Pose of the tape measure for a target, or null when the target cannot be drawn now. Conventions (core model): 'down' hangs from
 * the reading point at the origin to the hook at y = -L; 'right'/'left' run along +x/-x from the hook to the reading point.
 */
export function planTape(t: TapeTarget, w: TapeWorld): TapePlan | null {
  const H = w.H_m * CM
  const geo = w.geo
  const frame = geo ? railFrame(geo) : null
  switch (t.kind) {
    case 'launchHeight': {
      // hangs from the front corner of the table edge to the floor; the reading point is the table top at the edge
      const reading: V3 = [0, 0, TABLE.halfD + 0.3]
      return { mode: 'down', length_cm: H, frame: 'scene', position: reading, yaw_rad: 0, flat: false, reading, hook: [0, -H, reading[2]] }
    }
    case 'gap': {
      if (!geo) return null
      // hook over the table edge, blade laid flat on the table beside the rail, reading at the rail tip
      const L = geo.gap_m * CM
      const hook: V3 = [0, 0.06, TAPE_Z_BESIDE_RAIL]
      return { mode: 'left', length_cm: L, frame: 'scene', position: hook, yaw_rad: 0, flat: true, reading: [-L, 0.06, TAPE_Z_BESIDE_RAIL], hook }
    }
    case 'rise': {
      if (!geo || !frame) return null
      // vertical blade just in front of the rack knob, from the table up to the rail top at the clamp
      const c = toScene(geo.pose.clamp)
      const reading: V3 = [c[0], c[1], TAPE_Z_RISE]
      return { mode: 'down', length_cm: geo.clampHeight_m * CM, frame: 'scene', position: reading, yaw_rad: 0, flat: false, reading, hook: [c[0], c[1] - geo.clampHeight_m * CM, TAPE_Z_RISE] }
    }
    case 'markPosition': {
      if (!geo || !frame) return null
      const s = w.markS_m(t.markId)
      if (s === null) return null
      // blade laid on the front face of the rail from the low tip to the mark (rail frame: tip at x = L, mark at L - s)
      const pos: V3 = [RAIL.length, -RAIL.height / 2, RAIL.halfW + 0.2]
      return {
        mode: 'left', length_cm: s * CM, frame: 'rail', position: pos, yaw_rad: 0, flat: false,
        reading: railLocalToWorld(frame, [RAIL.length - s * CM, pos[1], pos[2]]), hook: railLocalToWorld(frame, pos),
      }
    }
    case 'range': {
      const m = w.markOnFloor(t.carbonId)
      const p = w.edgeProjection
      if (!m || !p) return null
      // flat on the floor from the plumb point to the carbon mark
      const dx = (m.x_m - p.x_m) * CM, dz = (m.z_m - p.z_m) * CM
      const L = Math.hypot(dx, dz)
      if (L < 0.5) return null
      const y = -H + 0.2
      const hook: V3 = [p.x_m * CM, y, p.z_m * CM]
      return { mode: 'right', length_cm: L, frame: 'scene', position: hook, yaw_rad: Math.atan2(-dz, dx), flat: true, reading: [m.x_m * CM, y, m.z_m * CM], hook }
    }
  }
}

/** Points the 'tape' preset keeps in view: a box around the reading point (and the hook for short blades). */
export function tapePoints(plan: TapePlan | null, restBox: { min: V3; max: V3 } | null): Vec[] {
  if (!plan) {
    const b = restBox ?? { min: [STAGING.tape.x - 6, 0, STAGING.tape.z - 6] as V3, max: [STAGING.tape.x + 6, 6, STAGING.tape.z + 6] as V3 }
    return boxCorners([b.min[0] - 2, b.min[1], b.min[2] - 2], [b.max[0] + 2, b.max[1], b.max[2] + 2])
  }
  const r = plan.reading
  if (plan.mode === 'down') return boxCorners([r[0] - 4.5, r[1] - 6, r[2] - 3], [r[0] + 4.5, r[1] + 3, r[2] + 3])
  const far = plan.flat ? 1.5 : 6
  return boxCorners([r[0] - 5.5, r[1] - 1.5, r[2] - 4.5], [r[0] + 5.5, r[1] + far, r[2] + 4.5])
}
/** Camera angles of the tape close-up for a plan (down: low and almost frontal; flat on the table: from above and the front). */
export function tapeAngles(plan: TapePlan | null): { azimuth: number; elevation: number } {
  if (!plan) return { azimuth: 22, elevation: 35 }
  if (plan.mode === 'down') return { azimuth: 8, elevation: 8 }
  if (plan.flat) return { azimuth: 0, elevation: 62 }
  return { azimuth: 0, elevation: 14 }
}
