// Practica 3 side of the pure snap logic of the drag-and-drop assembly (no DOM, no three.js): which target zones exist for a part and which
// Apparatus call each stands for. The generic zone type and the nearest-zone resolution are in core/dragdrop/snap.ts. The rules stay in
// the Apparatus: a zone only names the call (`attach`, `placeCart`, `setMassLocation`, ...) and the Apparatus decides (see drop.ts).
//
// Frame: scene centimetres, table frame (x from the stand clamp toward the receiver, y up from the bench top, z toward the viewer),
// as in scene3d/units.ts.
import {
  CART_LENGTH_m, RAIL_SCALE_MAX_mm, RECEIVER_STOP_FROM_END_m,
  type ApparatusState, type ItemId, type JointId, type RailEnd,
} from '../../apparatus/index.ts'
import { nearestZone, distanceToZone, type Probe, type Zone as CoreZone } from '../../../../core/dragdrop/snap.ts'
import {
  BENCH, CART_LENGTH_cm, CM_PER_M, RAIL, RAIL_ROOT_X_cm, STAGING, CANISTER_H_cm, clampHeight_cm, drawnTilt_rad, fallenCartOrigin, railLocalX_cm, railPoint,
} from '../scene3d/units.ts'

/** A movable part: an inventory item, or one of the four 10 g masses (the inventory has them as one item). */
export type MassPart = 'mass0' | 'mass1' | 'mass2' | 'mass3'
export type PartId = Exclude<ItemId, 'masses'> | MassPart
export const MASS_PARTS: readonly MassPart[] = ['mass0', 'mass1', 'mass2', 'mass3']
export const isMassPart = (p: PartId): p is MassPart => (MASS_PARTS as readonly string[]).includes(p)
export const massIndex = (p: MassPart): number => Number(p.slice(4))

export type ZoneId =
  | 'table' | 'stand' | 'clampE1' | 'clampE2' | 'receiver' | 'railCart' | 'railLevel' | 'tableLevel'
  | 'screwOnCart' | 'pulleyThread' | 'canisterHook' | 'canisterMass' | 'cartMass'

/** What dropping in a zone asks of the Apparatus. */
export type DropAction =
  | { kind: 'table' }
  | { kind: 'attach'; joint: JointId; railEnd?: RailEnd }
  | { kind: 'placeCart' }
  | { kind: 'placeLevel'; where: 'rail' | 'table' }
  | { kind: 'mass'; to: 'canister' | 'cart' }

/** A core zone plus the Apparatus call it stands for. */
export interface Zone extends CoreZone {
  id: ZoneId
  action: DropAction
  /** Zones along the rail: the drop point maps to a position on the printed scale. */
  rail?: { cos: number; zeroAtStand: boolean; hasReceiver: boolean }
}
export { distanceToZone }
export type { Probe }

export type Target =
  | { kind: 'tray' }
  | { kind: 'zone'; zone: Zone; dist_cm: number; railPos_mm: number | null; along_cm: number | null }

/** Snap radius of the point zones, cm. Generous on purpose: touch pointers are imprecise. */
export const SNAP_CM = 12
/** Along-rail zones are narrow, so they take a wider margin across. */
export const RAIL_SNAP_CM = 9
/** Distance of the E1 / E2 choices from the clamp, cm. */
export const CLAMP_CHOICE_DX_cm = 10
/** Where the level rests on the table (matches scene.ts). */
export const LEVEL_ON_TABLE = { x: 60, z: -14 }
/** Along the rail, where the level sits (matches scene.ts), cm. */
export const LEVEL_ON_RAIL_cm = 60

type Pt = readonly [number, number, number]
/** Where the movable things are now: the cart, the canister, the pulley (loose on the bench, on the rail, hanging, or fallen on the floor). */
export interface Spots { cart: Pt; canister: Pt; pulley: Pt }

/** What the cart is doing, as far as the zones care (from `Apparatus.cartState`). */
export interface CartNow { frontRailPos_mm: number | null; fall: { x_m: number; drop_m: number } | null }

export function spotsFor(s: ApparatusState, cart: CartNow): Spots {
  const zeroAtStand = (s.joints.rackClamp ?? 'E1') === 'E1'
  let cartSpot: Pt = [STAGING.cart.x, 3, STAGING.cart.z]
  if (s.cart.placed && cart.fall) {
    const o = fallenCartOrigin(s, cart.fall)
    cartSpot = [o[0] - CART_LENGTH_cm / 2, o[1] + 3, o[2]]
  } else if (s.cart.placed && cart.frontRailPos_mm !== null) {
    const front = railLocalX_cm(cart.frontRailPos_mm, zeroAtStand)
    cartSpot = railPoint(s, front - CART_LENGTH_cm / 2, 3)
  }
  const hangX = railPoint(s, RAIL.length, 0)[0] + 0.9 + 2.4
  const onPulley = s.joints.receiver && s.joints.stringPulley && s.joints.stringCanister
  const canisterSpot: Pt = onPulley ? [hangX, 0, 0] : [STAGING.canister.x, CANISTER_H_cm / 2, STAGING.canister.z]
  const pulleySpot: Pt = s.joints.receiver ? railPoint(s, RAIL.length + 0.9, 3.6) : [STAGING.receiver.x + 0.9, 3.6 + 2, STAGING.receiver.z]
  return { cart: cartSpot, canister: canisterSpot, pulley: pulleySpot }
}

/** Parts the student can pick up from the bench again (a clamped rail is too long to grab). */
export function benchDraggable(part: PartId, s: Pick<ApparatusState, 'joints'>): boolean {
  if (part === 'rail') return s.joints.rackClamp === null
  return true
}

/** The joints that come apart when an attached part is lifted off, in the order to undo them (empty: the part just lies on the table). */
export function jointsOfPart(part: PartId, s: Pick<ApparatusState, 'joints'>): JointId[] {
  const j = s.joints
  switch (part) {
    case 'rail': return j.rackClamp !== null ? ['rackClamp'] : []
    case 'rackStand': return j.rackClamp !== null ? ['rackClamp'] : j.standBase ? ['standBase'] : []
    case 'standBase': return j.standBase ? ['standBase'] : []
    case 'receiver': return j.receiver ? ['receiver'] : []
    case 'brassScrew': return j.stringCart ? ['stringCart'] : []
    case 'canister': return j.stringCanister ? ['stringCanister'] : []
    case 'string': return (['stringCart', 'stringCanister', 'stringPulley'] as const).filter((k) => j[k])
    default: return []
  }
}

const cm = (m: number): number => m * CM_PER_M

function railBand(s: ApparatusState): Pick<Zone, 'kind' | 'cx' | 'cy' | 'cz' | 'hx' | 'hz' | 'tilt_rad'> & { rail: NonNullable<Zone['rail']> } {
  const tilt = drawnTilt_rad(s)
  const mid = railPoint(s, RAIL.length / 2)
  return {
    kind: 'band', tilt_rad: -tilt, cx: mid[0], cy: mid[1], cz: 0, hx: (RAIL.length * Math.cos(tilt)) / 2, hz: RAIL.halfW,
    rail: { cos: Math.cos(tilt), zeroAtStand: (s.joints.rackClamp ?? 'E1') === 'E1', hasReceiver: s.joints.receiver },
  }
}

/**
 * Every place the part can be dropped, given the apparatus state. The table is always there; the others are the joints and spots the
 * part belongs to. Wrong order is allowed: a zone whose joint cannot be made yet is still returned (ready false) and the Apparatus
 * refuses with the reason.
 */
export function zonesFor(part: PartId, s: ApparatusState, spots: Spots): Zone[] {
  const with_ = (...ids: ItemId[]): boolean => ids.every((i) => s.items[i] || i === part)
  const j = s.joints
  const clampH = clampHeight_cm(s)
  const out: Zone[] = [{
    id: 'table', kind: 'area', action: { kind: 'table' }, cx: BENCH.x, cy: 0, cz: BENCH.z, hx: BENCH.width / 2, hz: BENCH.depth / 2, snap_cm: 0, priority: 0, ready: true,
  }]
  const point = (id: ZoneId, action: DropAction, at: Pt, ready: boolean, prio = 2, snap = SNAP_CM): Zone =>
    ({ id, kind: 'point', action, cx: at[0], cy: at[1], cz: at[2], hx: 0, hz: 0, snap_cm: snap, priority: prio, ready })
  const screwsFree = s.items.screws ? s.screwsAvailable : 0

  if (part === 'rackStand' || part === 'standBase') {
    out.push(point('stand', { kind: 'attach', joint: 'standBase' }, [0, 0, 0], with_('rackStand', 'standBase') && !j.standBase))
  }
  if (part === 'rail') {
    const ok = with_('rail', 'rackStand') && j.standBase && j.rackClamp === null && screwsFree >= 2
    out.push(point('clampE1', { kind: 'attach', joint: 'rackClamp', railEnd: 'E1' }, [-CLAMP_CHOICE_DX_cm, clampH, 0], ok))
    out.push(point('clampE2', { kind: 'attach', joint: 'rackClamp', railEnd: 'E2' }, [CLAMP_CHOICE_DX_cm, clampH, 0], ok))
  }
  if (part === 'receiver') {
    out.push(point('receiver', { kind: 'attach', joint: 'receiver' }, railPoint(s, RAIL.length, 0), s.items.rail && j.rackClamp !== null && !j.receiver && screwsFree >= 2, 2, SNAP_CM + 2))
  }
  if (part === 'cart') {
    const b = railBand(s)
    out.push({ id: 'railCart', action: { kind: 'placeCart' }, ...b, snap_cm: RAIL_SNAP_CM, priority: 2, ready: j.rackClamp !== null })
  }
  if (part === 'brassScrew') out.push(point('screwOnCart', { kind: 'attach', joint: 'stringCart' }, spots.cart, with_('string', 'cart', 'brassScrew') && !j.stringCart))
  if (part === 'string') out.push(point('pulleyThread', { kind: 'attach', joint: 'stringPulley' }, spots.pulley, with_('string', 'receiver') && j.receiver && !j.stringPulley))
  if (part === 'canister') out.push(point('canisterHook', { kind: 'attach', joint: 'stringCanister' }, [railPoint(s, RAIL.length, 0)[0] + 0.9 + 2.4, 0, 0], with_('string', 'canister') && !j.stringCanister, 2, SNAP_CM + 4))
  if (isMassPart(part)) {
    out.push(point('canisterMass', { kind: 'mass', to: 'canister' }, spots.canister, s.items.canister, 3, SNAP_CM))
    out.push(point('cartMass', { kind: 'mass', to: 'cart' }, spots.cart, s.items.cart && s.items.plasticScrews && s.plasticScrewsUsed < 5, 3, SNAP_CM))
  }
  if (part === 'level') {
    const b = railBand(s)
    out.push({ id: 'railLevel', action: { kind: 'placeLevel', where: 'rail' }, ...b, snap_cm: RAIL_SNAP_CM, priority: 3, ready: s.items.rail })
    out.push(point('tableLevel', { kind: 'placeLevel', where: 'table' }, [LEVEL_ON_TABLE.x, 0, LEVEL_ON_TABLE.z], true))
  }
  return out
}

/** Printed-scale position of the cart FRONT for a pointer at x_cm (the pointer holds the middle of the cart), kept on the rail and in front of the receiver stop. */
function onRail(zone: Zone, x_cm: number): { railPos_mm: number; along_cm: number } | null {
  const r = zone.rail
  if (!r) return null
  const along = Math.min(RAIL.length, Math.max(0, (x_cm - RAIL_ROOT_X_cm) / r.cos))
  const maxFront = r.hasReceiver ? RAIL.length - cm(RECEIVER_STOP_FROM_END_m) : RAIL.length
  const front = Math.min(maxFront, Math.max(cm(CART_LENGTH_m), along + cm(CART_LENGTH_m) / 2))
  const pos = r.zeroAtStand ? front * 10 : RAIL_SCALE_MAX_mm - front * 10
  return { railPos_mm: Math.round(pos * 2) / 2, along_cm: front - cm(CART_LENGTH_m) / 2 }
}

/**
 * The zone a drop point falls in (core `nearestZone`), with the printed-scale position for the cart zone.
 * `probe` gives the point on the plane at each zone's height (a pointer ray crosses planes of different heights at different x, z).
 */
export function resolveDrop(zones: readonly Zone[], probe: Probe): Target | null {
  const hit = nearestZone(zones, probe)
  if (!hit) return null
  const placed = hit.zone.action.kind === 'placeCart' ? onRail(hit.zone, hit.point.x_cm) : null
  return { kind: 'zone', zone: hit.zone, dist_cm: hit.dist_cm, railPos_mm: placed?.railPos_mm ?? null, along_cm: placed?.along_cm ?? null }
}

/** The target for a zone chosen without a pointer (keyboard, zone buttons): the cart goes to the start mark (else 10 cm from the stand end). */
export function defaultTarget(zone: Zone, s: Pick<ApparatusState, 'marks'>): Target {
  if (zone.action.kind !== 'placeCart' || !zone.rail) return { kind: 'zone', zone, dist_cm: 0, railPos_mm: null, along_cm: null }
  const fromStand = zone.rail.zeroAtStand ? 100 : RAIL_SCALE_MAX_mm - 100
  const railPos = s.marks.start_mm ?? fromStand
  const front = (zone.rail.zeroAtStand ? railPos : RAIL_SCALE_MAX_mm - railPos) / 10
  return { kind: 'zone', zone, dist_cm: 0, railPos_mm: railPos, along_cm: front - cm(CART_LENGTH_m) / 2 }
}
