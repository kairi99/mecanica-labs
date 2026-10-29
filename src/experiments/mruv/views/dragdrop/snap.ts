// Pure snap logic of the drag-and-drop assembly (no DOM, no three.js): which target zones exist for a part, which one a drop
// point falls in, and which Apparatus action that zone stands for. The rules of the assembly stay in the Apparatus: a zone only
// names the call (`attach`, `placeCart`, ...) and the Apparatus decides whether it is allowed (see drop.ts).
//
// Frame: scene centimetres, table frame (x down-slope from the rack stand, y up, z toward the viewer), as in scene3d/units.ts.
import {
  CART_LENGTH_m, RAIL_LENGTH_m, RACK_BASE_HEIGHT_m, TWO_LEG_BASE_HEIGHT_m, SUPPORT_SEPARATION_m, railPose, railPos_mm,
  type ApparatusState, type ItemId, type JointId, type RailEnd, type RailPose,
} from '../../apparatus/index.ts'
import { CM_PER_M, LEVEL_ON_TABLE, RAIL, TABLE, clampCartFront, ghostsFor, cartGhostFront_mm, type GhostId } from '../scene3d/units.ts'

export type ZoneId = 'table' | 'stand' | 'clampE1' | 'clampE2' | 'twoLeg' | 'receiver' | 'railCart' | 'railMark' | 'railLevel' | 'tableLevel'

/** What dropping in a zone asks of the Apparatus. */
export type DropAction =
  | { kind: 'table' }
  | { kind: 'attach'; joint: JointId; railEnd?: RailEnd }
  | { kind: 'placeCart' }
  | { kind: 'placeMarker' }
  | { kind: 'placeLevel'; where: 'rail' | 'table' }

/** A box on a horizontal plane at height `cy` (half sizes hx, hz; 0 for a point), widened by `snap_cm` on every side. */
export interface Zone {
  id: ZoneId
  action: DropAction
  cx: number
  cy: number
  cz: number
  hx: number
  hz: number
  snap_cm: number
  /** Lower number loses ties (the table is the fallback). */
  priority: number
  /** The Apparatus would accept the drop right now (as far as the ghosts know). Not-ready zones still accept a drop: the refusal teaches. */
  ready: boolean
  /** Zones along the rail: the drop point maps to a position on the printed scale. */
  rail?: { highX_cm: number; cos: number; zeroHigh: boolean; hasReceiver: boolean }
}

/** Where a pointer ray meets the horizontal plane at the zone's height (z null: the view has no depth, ignore it). */
export type Probe = (zone: Zone) => { x_cm: number; z_cm: number | null } | null

export type Target =
  | { kind: 'tray' }
  | { kind: 'zone'; zone: Zone; dist_cm: number; railPos_mm: number | null; along_cm: number | null }

/** Snap radius of the point zones, cm. Generous on purpose: touch pointers are imprecise. */
export const SNAP_CM = 12
/** Along-rail zones are narrow, so they take a wider margin across. */
export const RAIL_SNAP_CM = 9
/** Distance of the E1 / E2 choices from the clamp, cm. */
export const CLAMP_CHOICE_DX_cm = 14

const GHOST_OF: Partial<Record<ZoneId, GhostId>> = {
  stand: 'stand', clampE1: 'clamp', clampE2: 'clamp', twoLeg: 'twoLeg', receiver: 'receiver', railCart: 'cart',
}

/** Parts the student can pick up from the bench again (a clamped rail is too long to grab; the 3D cart has its own handle and is never offered to this picker). */
export function benchDraggable(part: ItemId, s: Pick<ApparatusState, 'joints'>): boolean {
  if (part === 'rail') return s.joints.rackClamp === null
  return true
}

/** The joint that comes apart when an attached part is lifted off (null: the part is just lying on the table). */
export function jointOfPart(part: ItemId, s: Pick<ApparatusState, 'joints'>): JointId | null {
  const j = s.joints
  switch (part) {
    case 'rail': return j.rackClamp !== null ? 'rackClamp' : null
    case 'rackStand': return j.rackClamp !== null ? 'rackClamp' : j.standBase ? 'standBase' : null
    case 'standBase': return j.standBase ? 'standBase' : null
    case 'twoLegStand': return j.twoLegStand ? 'twoLegStand' : null
    case 'receiver': return j.receiver ? 'receiver' : null
    default: return null
  }
}

/** Nominal pose of the assembled rail for the current stand heights: where the supports and ends go once everything is attached. */
export function nominalPose(s: Pick<ApparatusState, 'rack_mm' | 'foot_mm'>): RailPose {
  return railPose(RACK_BASE_HEIGHT_m + s.rack_mm / 1000, TWO_LEG_BASE_HEIGHT_m + s.foot_mm / 1000, SUPPORT_SEPARATION_m)
}

const cm = (m: number): number => m * CM_PER_M

function railBand(pose: RailPose, zeroHigh: boolean, hasReceiver: boolean): Pick<Zone, 'cx' | 'cy' | 'cz' | 'hx' | 'hz'> & { rail: NonNullable<Zone['rail']> } {
  const x0 = cm(pose.highEnd.x_m), x1 = cm(pose.lowEnd.x_m)
  return {
    cx: (x0 + x1) / 2, cy: cm((pose.highEnd.y_m + pose.lowEnd.y_m) / 2), cz: cm(pose.highEnd.z_m), hx: Math.abs(x1 - x0) / 2, hz: RAIL.halfW,
    rail: { highX_cm: x0, cos: pose.direction.x_m, zeroHigh, hasReceiver },
  }
}

/**
 * Every place the part can be dropped, given the apparatus state and where the rail lies now (`pose`, from `Apparatus.railPoseNow()`).
 * The table is always there; the others are the joints the part belongs to. Wrong order is allowed: a zone whose joint cannot be
 * made yet is still returned (ready false) and the Apparatus refuses with the reason.
 */
export function zonesFor(part: ItemId, s: ApparatusState, pose: RailPose): Zone[] {
  const ready = new Set(ghostsFor({ ...s, items: { ...s.items, [part]: true } }))
  const isReady = (id: ZoneId): boolean => { const g = GHOST_OF[id]; return g === undefined ? true : ready.has(g) }
  const zeroHigh = s.geometry?.scaleZeroAtHighEnd ?? true
  const nominal = nominalPose(s)
  const clampH = cm(nominal.clamp.y_m)
  const out: Zone[] = [{
    id: 'table', action: { kind: 'table' }, cx: TABLE.x, cy: 0, cz: TABLE.z, hx: TABLE.width / 2, hz: TABLE.depth / 2, snap_cm: 0, priority: 0, ready: true,
  }]
  const point = (id: ZoneId, action: DropAction, x: number, y: number, z: number, prio = 2): Zone =>
    ({ id, action, cx: x, cy: y, cz: z, hx: 0, hz: 0, snap_cm: SNAP_CM, priority: prio, ready: isReady(id) })

  if (part === 'rackStand' || part === 'standBase') out.push(point('stand', { kind: 'attach', joint: 'standBase' }, 0, 0, 0))
  if (part === 'rackStand') {
    // the stand goes onto a rail end: the two ends of the rail where it lies now (E1 is the 0 mm end)
    const e1AtHigh = s.geometry ? zeroHigh : true
    const inward = (end: 'high' | 'low'): [number, number, number] => {
      const d = end === 'high' ? 0.05 : RAIL_LENGTH_m - 0.05
      return [cm(pose.highEnd.x_m + pose.direction.x_m * d), cm(pose.highEnd.y_m + pose.direction.y_m * d), cm(pose.highEnd.z_m)]
    }
    const [e1x, e1y, e1z] = inward(e1AtHigh ? 'high' : 'low')
    const [e2x, e2y, e2z] = inward(e1AtHigh ? 'low' : 'high')
    out.push(point('clampE1', { kind: 'attach', joint: 'rackClamp', railEnd: 'E1' }, e1x, e1y, e1z))
    out.push(point('clampE2', { kind: 'attach', joint: 'rackClamp', railEnd: 'E2' }, e2x, e2y, e2z))
  }
  if (part === 'rail') {
    // the rail goes into the clamp of the rack stand, by one end or the other
    out.push(point('clampE1', { kind: 'attach', joint: 'rackClamp', railEnd: 'E1' }, CLAMP_CHOICE_DX_cm, clampH, 0))
    out.push(point('clampE2', { kind: 'attach', joint: 'rackClamp', railEnd: 'E2' }, -CLAMP_CHOICE_DX_cm, clampH, 0))
  }
  if (part === 'twoLegStand') out.push(point('twoLeg', { kind: 'attach', joint: 'twoLegStand' }, cm(nominal.twoLeg.x_m), 0, 0))
  if (part === 'receiver') out.push(point('receiver', { kind: 'attach', joint: 'receiver' }, cm(nominal.lowEnd.x_m), cm(nominal.lowEnd.y_m), 0))
  if (part === 'cart') {
    const b = railBand(pose, zeroHigh, s.items.receiver && s.joints.receiver)
    out.push({ id: 'railCart', action: { kind: 'placeCart' }, ...b, snap_cm: RAIL_SNAP_CM, priority: 2, ready: isReady('railCart') })
  }
  if (part === 'markers') {
    const b = railBand(pose, zeroHigh, false)
    out.push({ id: 'railMark', action: { kind: 'placeMarker' }, ...b, snap_cm: RAIL_SNAP_CM, priority: 2, ready: s.geometry !== null })
  }
  if (part === 'level') {
    const b = railBand(pose, zeroHigh, false)
    out.push({ id: 'railLevel', action: { kind: 'placeLevel', where: 'rail' }, ...b, snap_cm: RAIL_SNAP_CM, priority: 3, ready: s.items.rail })
    out.push(point('tableLevel', { kind: 'placeLevel', where: 'table' }, LEVEL_ON_TABLE.x, 0, LEVEL_ON_TABLE.z, 2))
  }
  return out
}

/** Distance (cm) from a point to the zone's box, 0 inside. z null: only x counts (side view). */
export function distanceToZone(zone: Zone, p: { x_cm: number; z_cm: number | null }): number {
  const dx = Math.max(0, Math.abs(p.x_cm - zone.cx) - zone.hx)
  const dz = p.z_cm === null ? 0 : Math.max(0, Math.abs(p.z_cm - zone.cz) - zone.hz)
  return Math.hypot(dx, dz)
}

/** Printed-scale position and distance along the rail (cm from the high end) under a point of a rail zone. */
function onRail(zone: Zone, x_cm: number, kind: DropAction['kind']): { railPos_mm: number; along_cm: number } | null {
  const r = zone.rail
  if (!r) return null
  const along = Math.min(RAIL.length, Math.max(0, (x_cm - r.highX_cm) / r.cos))
  if (kind === 'placeCart') {
    // the pointer holds the middle of the cart; the apparatus works with its front (the down-slope end)
    const front = railPos_mm((along + (cm(CART_LENGTH_m)) / 2) / CM_PER_M, r.zeroHigh)
    return { railPos_mm: Math.round(clampCartFront(front, r.zeroHigh, r.hasReceiver) * 2) / 2, along_cm: along }
  }
  return { railPos_mm: Math.round(railPos_mm(along / CM_PER_M, r.zeroHigh) * 2) / 2, along_cm: along }
}

/**
 * The zone a drop point falls in: the nearest specific zone within its snap distance, else the table if the point is on it, else null.
 * `probe` gives the point on the plane at each zone's height (a pointer ray crosses planes of different heights at different x, z).
 */
export function resolveDrop(zones: readonly Zone[], probe: Probe): Target | null {
  let best: { zone: Zone; dist: number; p: { x_cm: number; z_cm: number | null } } | null = null
  let table: { zone: Zone; dist: number; p: { x_cm: number; z_cm: number | null } } | null = null
  for (const zone of zones) {
    const p = probe(zone)
    if (!p || !Number.isFinite(p.x_cm)) continue
    const dist = distanceToZone(zone, p)
    if (dist > zone.snap_cm + 1e-9) continue
    if (zone.id === 'table') { table = { zone, dist, p }; continue }
    if (!best || dist < best.dist - 1e-9 || (Math.abs(dist - best.dist) <= 1e-9 && zone.priority > best.zone.priority)) best = { zone, dist, p }
  }
  const hit = best ?? table
  if (!hit) return null
  const placed = onRail(hit.zone, hit.p.x_cm, hit.zone.action.kind)
  return { kind: 'zone', zone: hit.zone, dist_cm: hit.dist, railPos_mm: placed?.railPos_mm ?? null, along_cm: placed?.along_cm ?? null }
}

/** The target for a zone chosen without a pointer (keyboard, zone buttons): a sensible default spot along the rail. */
export function defaultTarget(zone: Zone, s: Pick<ApparatusState, 'markers'>, aRailPos_mm: number | null): Target {
  if (!zone.rail) return { kind: 'zone', zone, dist_cm: 0, railPos_mm: null, along_cm: null }
  const zh = zone.rail.zeroHigh
  let railPos: number
  let along: number
  if (zone.action.kind === 'placeCart') {
    railPos = cartGhostFront_mm(aRailPos_mm, zh)
    along = Math.max(0, (zh ? railPos : 1200 - railPos) / 10 - cm(CART_LENGTH_m) / 2)
  } else if (zone.action.kind === 'placeMarker') {
    along = Math.min(RAIL.length, 10 * (s.markers.length + 1) + 10)
    railPos = Math.round(railPos_mm(along / CM_PER_M, zh) * 2) / 2
  } else {
    along = RAIL.length / 2
    railPos = Math.round(railPos_mm(along / CM_PER_M, zh) * 2) / 2
  }
  return { kind: 'zone', zone, dist_cm: 0, railPos_mm: railPos, along_cm: along }
}
