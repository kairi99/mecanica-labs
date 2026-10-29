// Parabolic side of the pure snap logic of the drag-and-drop assembly (no DOM, no three.js): which target zones exist for a part and
// which Apparatus call each stands for. The generic zone type and the nearest-zone resolution live in core/dragdrop/snap.ts. The
// rules stay in the Apparatus: a zone only names the call (`attach`, `placeLevel`, `placeBond`, ...) and the Apparatus decides
// whether it is allowed (see drop.ts).
//
// Frame: scene centimetres as in scene3d/units.ts (x from the table edge outward, the rail lies at x < 0; y up, the table top is y = 0
// and the floor is y = -H; z toward the viewer). The rail runs from its high end (x very negative) down to the low tip near the edge.
import {
  ITEM_IDS, RAIL_LENGTH_m, railGeometry, type ApparatusState, type BallId, type ItemId, type JointId, type RailPose, type SheetPose,
} from '../../apparatus/index.ts'
import { nearestZone, distanceToZone, type Probe, type Zone as CoreZone } from '../../../../core/dragdrop/snap.ts'
import { CM, RAIL, STAGING, STAND_HOME_x, TABLE, ZONE_HALF_Z_cm, ZONE_MAX_cm, levelRailRange_cm } from '../scene3d/units.ts'

export type ZoneId = 'table' | 'stand' | 'clamp' | 'twoLeg' | 'railLevel' | 'tableLevel' | 'railBall' | 'floor'

/** What dropping in a zone asks of the Apparatus. */
export type DropAction =
  | { kind: 'table' }
  | { kind: 'attach'; joint: JointId }
  | { kind: 'placeLevel'; where: 'rail' | 'table' }
  | { kind: 'placeBall' }
  | { kind: 'placePaper' }

/** Where a rail lies in the scene (mounted: the rail pose; loose: lying on the table at its waiting spot). */
export interface RailPlace {
  highX_cm: number
  highY_cm: number
  z_cm: number
  /** cos of the slope: horizontal run per cm along the rail. */
  cos: number
  /** Tilt for drawing: positive = the low end at +x and lower. */
  tilt_rad: number
}

/** A core zone plus the Apparatus call it stands for. */
export interface Zone extends CoreZone {
  id: ZoneId
  action: DropAction
  /** Zones along the rail: the drop point maps to a distance along it. */
  rail?: RailPlace
}

export { distanceToZone }
export type { Probe }

export type Target =
  | { kind: 'tray' }
  | {
      kind: 'zone'; zone: Zone; dist_cm: number
      /** Rail zones: distance from the rail's high end, cm, and the position from the low tip, m. */
      along_cm: number | null
      s_m: number | null
      /** Where the pointer met the zone's plane (x, z in cm). */
      at: { x_cm: number; z_cm: number | null } | null
    }

/** Snap radius of the point zones, cm. Generous on purpose: touch pointers are imprecise. */
export const SNAP_CM = 12
/** Along-rail zones are narrow, so they take a wider margin across. */
export const RAIL_SNAP_CM = 9
/** Snap margin of the landing area on the floor, cm. */
export const FLOOR_SNAP_CM = 16
/** Dropping a ball this close to a rail mark (cm) snaps it to the mark (as in the scene's own ball drag). */
export const MARK_SNAP_cm = 1.6
/** Where the level goes on the table when it is dropped there without a pointer (the spot the scene starts with), cm. */
export const LEVEL_TABLE_DEFAULT = { x: -22, z: -20 } as const
/** Where a paper goes when it is placed without a pointer and none lies on the floor yet, cm from the edge. */
export const PAPER_DEFAULT = { x: 60, z: 0 } as const

export const PARTS: readonly ItemId[] = ITEM_IDS

export const BALL_OF: Partial<Record<ItemId, BallId>> = { marble: 'marble', pingPong: 'pingpong' }

/** Parts the student can pick up from the bench again (a clamped rail is too long to grab; a placed ball has its own handle on the rail). */
export function benchDraggable(part: ItemId, s: Pick<ApparatusState, 'joints'>): boolean {
  if (part === 'rail') return !s.joints.rackClamp
  return true
}

/** The joint that comes apart when an attached part is lifted off (null: the part is just lying on the table). */
export function jointOfPart(part: ItemId, s: Pick<ApparatusState, 'joints'>): JointId | null {
  const j = s.joints
  switch (part) {
    case 'rail': return j.rackClamp ? 'rackClamp' : null
    case 'rackStand': return j.rackClamp ? 'rackClamp' : j.standBase ? 'standBase' : null
    case 'base': return j.standBase ? 'standBase' : null
    case 'twoLeg': return j.twoLegStand ? 'twoLegStand' : null
    default: return null
  }
}

/** Rail pose for the current stand heights and gap: where the supports and ends go once everything is attached (drawing numbers only). */
export function nominalPose(s: Pick<ApparatusState, 'rack_mm' | 'leg_mm' | 'foot_mm' | 'gap_mm' | 'joints' | 'world' | 'geometry'>): RailPose {
  if (s.geometry) return s.geometry.pose
  return railGeometry({
    rack_mm: s.rack_mm, leg_mm: s.leg_mm, foot_mm: s.foot_mm, gap_m: s.gap_mm / 1000, tableRoll_rad: s.world.tableRoll_rad, twoLegAttached: s.joints.twoLegStand,
  }).pose
}

const cm = (m: number): number => m * CM

/** The rail where the scene draws it: on its stands (nominal pose) or lying loose at its waiting spot. */
export function railPlace(s: Pick<ApparatusState, 'rack_mm' | 'leg_mm' | 'foot_mm' | 'gap_mm' | 'joints' | 'world' | 'geometry'>, mounted = s.joints.rackClamp): RailPlace {
  if (!mounted) return { highX_cm: STAGING.rail.x, highY_cm: RAIL.height, z_cm: STAGING.rail.z, cos: 1, tilt_rad: 0 }
  const p = nominalPose(s)
  const cosT = Math.abs(p.direction.x_m)
  return { highX_cm: cm(p.highEnd.x_m), highY_cm: cm(p.highEnd.y_m), z_cm: 0, cos: cosT, tilt_rad: Math.asin(Math.min(1, Math.abs(p.direction.y_m))) }
}

function railBand(place: RailPlace): Pick<Zone, 'kind' | 'cx' | 'cy' | 'cz' | 'hx' | 'hz' | 'tilt_rad'> & { rail: RailPlace } {
  const run = RAIL.length * place.cos
  const drop = RAIL.length * Math.sin(place.tilt_rad)
  return { kind: 'band', tilt_rad: place.tilt_rad, cx: place.highX_cm + run / 2, cy: place.highY_cm - drop / 2, cz: place.z_cm, hx: run / 2, hz: RAIL.halfW, rail: place }
}

/** The landing area on the floor where a sheet of paper can be laid: the default zone the camera views frame. */
export function floorZone(H_cm: number): Pick<Zone, 'kind' | 'cx' | 'cy' | 'cz' | 'hx' | 'hz'> {
  return { kind: 'band', cx: ZONE_MAX_cm / 2, cy: -H_cm, cz: 0, hx: ZONE_MAX_cm / 2, hz: ZONE_HALF_Z_cm + 4 }
}

/**
 * Every place the part can be dropped, given the apparatus state. The table is always there; the others are the joints and
 * placements the part belongs to. Wrong order is allowed: a zone whose call would be refused is still returned (ready false) and the
 * Apparatus refuses with the reason.
 */
export function zonesFor(part: ItemId, s: ApparatusState): Zone[] {
  const has = (i: ItemId): boolean => s.items[i] || i === part
  const J = s.joints
  const out: Zone[] = [{
    id: 'table', kind: 'area', action: { kind: 'table' }, cx: (TABLE.x0 + TABLE.x1) / 2, cy: 0, cz: 0, hx: (TABLE.x1 - TABLE.x0) / 2, hz: TABLE.halfD, snap_cm: 0, priority: 0, ready: true,
  }]
  const point = (id: ZoneId, action: DropAction, x: number, y: number, z: number, ready: boolean, prio = 2): Zone =>
    ({ id, kind: 'point', action, cx: x, cy: y, cz: z, hx: 0, hz: 0, snap_cm: SNAP_CM, priority: prio, ready })
  const pose = nominalPose(s)

  if (part === 'rackStand' || part === 'base') {
    const standX = s.geometry ? cm(s.geometry.pose.clamp.x_m) : STAND_HOME_x
    out.push(point('stand', { kind: 'attach', joint: 'standBase' }, standX, 0, 0, has('rackStand') && has('base') && !J.standBase))
  }
  if (part === 'rail' || part === 'rackStand') {
    // the rail's high end goes into the clamp of the rack stand (the rise to 20 cm stays the adjustment step)
    out.push(point('clamp', { kind: 'attach', joint: 'rackClamp' }, cm(pose.clamp.x_m), cm(pose.clamp.y_m), 0, has('rail') && has('rackStand') && has('screws') && J.standBase && !J.rackClamp))
  }
  if (part === 'twoLeg') {
    out.push(point('twoLeg', { kind: 'attach', joint: 'twoLegStand' }, cm(pose.twoLeg.x_m), 0, 0, has('rail') && has('twoLeg') && has('screws') && J.rackClamp && !J.twoLegStand))
  }
  if (part === 'level') {
    const b = railBand(railPlace(s))
    out.push({ id: 'railLevel', action: { kind: 'placeLevel', where: 'rail' }, ...b, snap_cm: RAIL_SNAP_CM, priority: 3, ready: s.items.rail })
    out.push(point('tableLevel', { kind: 'placeLevel', where: 'table' }, LEVEL_TABLE_DEFAULT.x, 0, LEVEL_TABLE_DEFAULT.z, true))
  }
  if (part === 'marble' || part === 'pingPong') {
    const b = railBand(railPlace(s, true))
    out.push({ id: 'railBall', action: { kind: 'placeBall' }, ...b, snap_cm: RAIL_SNAP_CM, priority: 2, ready: J.rackClamp })
  }
  if (part === 'bondPaper' || part === 'carbonPaper') {
    const f = floorZone(s.world.H_m * CM)
    out.push({ id: 'floor', action: { kind: 'placePaper' }, ...f, snap_cm: FLOOR_SNAP_CM, priority: 2, ready: part === 'bondPaper' ? s.items.bondPaper || has('bondPaper') : s.paper.bond !== null })
  }
  return out
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))

/** Distance along the rail (cm from the high end) under a point of a rail zone. */
function alongRail(zone: Zone, x_cm: number): number | null {
  const r = zone.rail
  return r ? clamp((x_cm - r.highX_cm) / r.cos, 0, RAIL.length) : null
}
/** Position from the low tip (m) of a distance along the rail from the high end (cm). */
export const sFromAlong_m = (along_cm: number): number => clamp(RAIL_LENGTH_m - along_cm / CM, 0, RAIL_LENGTH_m)

/**
 * The zone a drop point falls in (core `nearestZone`), with the position along the rail for rail zones and the pointer's floor point
 * for the paper zone. `probe` gives the point on the plane at each zone's height (a pointer ray crosses planes of different heights at
 * different x, z; the 3D adapter intersects band zones with their own tilted plane).
 */
export function resolveDrop(zones: readonly Zone[], probe: Probe): Target | null {
  const hit = nearestZone(zones, probe)
  if (!hit) return null
  const along = alongRail(hit.zone, hit.point.x_cm)
  return { kind: 'zone', zone: hit.zone, dist_cm: hit.dist_cm, along_cm: along, s_m: along === null ? null : sFromAlong_m(along), at: hit.point }
}

/** The pose a paper sheet is laid with: keep the orientation of a sheet that already lies on the floor. */
export function paperOrientation(s: Pick<ApparatusState, 'paper'>, part: 'bondPaper' | 'carbonPaper'): SheetPose['orientation'] {
  return (part === 'bondPaper' ? s.paper.bond : s.paper.carbon)?.orientation ?? 'alongX'
}

/** Where a sheet goes (floor x, z in cm) for a drop at `at`: inside the landing area. */
export function paperSpot_cm(zone: Pick<Zone, 'cx' | 'cz' | 'hx' | 'hz'>, at: { x_cm: number; z_cm: number | null }): { x: number; z: number } {
  return { x: clamp(at.x_cm, zone.cx - zone.hx, zone.cx + zone.hx), z: clamp(at.z_cm ?? 0, zone.cz - zone.hz, zone.cz + zone.hz) }
}

/**
 * The target for a zone chosen without a pointer (keyboard, zone buttons): a sensible default spot. The carbon goes over the bond
 * sheet when one lies on the floor; the ball goes on the first mark when there is one.
 */
export function defaultTarget(zone: Zone, s: Pick<ApparatusState, 'marks' | 'paper'>, part: ItemId): Target {
  const base = { kind: 'zone' as const, zone, dist_cm: 0, along_cm: null, s_m: null, at: null }
  switch (zone.action.kind) {
    case 'placeBall': {
      const first = [...s.marks].sort((a, b) => a.s_m - b.s_m)[0]
      const s_m = first ? first.s_m : 0.8
      return { ...base, along_cm: (RAIL_LENGTH_m - s_m) * CM, s_m }
    }
    case 'placeLevel':
      if (zone.action.where === 'rail') {
        const r = levelRailRange_cm(false)
        const along = (r.min + RAIL.length) / 2
        return { ...base, along_cm: along, s_m: sFromAlong_m(along) }
      }
      return { ...base, at: { x_cm: LEVEL_TABLE_DEFAULT.x, z_cm: LEVEL_TABLE_DEFAULT.z } }
    case 'placePaper': {
      const pose = part === 'carbonPaper' ? s.paper.bond : s.paper.bond ?? s.paper.carbon
      return { ...base, at: { x_cm: pose ? pose.x_m * CM : PAPER_DEFAULT.x, z_cm: pose ? pose.z_m * CM : PAPER_DEFAULT.z } }
    }
    default:
      return base
  }
}
