// Friction side of the pure snap logic of the drag-and-drop setup (no DOM, no three.js): which zones exist for each part and which
// Apparatus call each one stands for. The generic zone type and the nearest-zone resolution are core (core/dragdrop/snap.ts). The rules
// stay in the Apparatus: a zone only names the call (setFace, chooseScale, setAddedMasses, placePaper, placeBar) and the Apparatus decides.
// Frame: scene centimetres (see layout.ts).
import { MASS_STEPS, type ApparatusState, type BarId, type FaceId, type ItemId, type SpringScaleId } from '../../apparatus/index.ts'
import { type Zone as CoreZone } from '../../../../core/dragdrop/snap.ts'
import { BAR_ON_MARK, BLOCK_DIM, MASS_DIM, PAPER, blockSpot } from './layout.ts'

export type ZoneId = 'table' | 'paper' | 'faceCloth' | 'faceSand' | 'hook' | 'masses' | 'barStart'

/** Parts the student can drag (guide order). The rail, its stand and the instruments are not moved: they have no joint in the Apparatus. */
export const PART_IDS = ['paper', 'block', 'scale1N', 'scale2N', 'masses50', 'woodBar', 'alBar', 'ironBar'] as const
export type PartId = (typeof PART_IDS)[number]
export const isPart = (id: string): id is PartId => (PART_IDS as readonly string[]).includes(id)

/** Which half of the bench is in use (the lab step): exps. 1 and 2, exp. 3, or both (assembly, record, analysis). */
export type Area = 'all' | 'exp12' | 'exp3'

export const SCALE_OF_PART: Readonly<Record<'scale1N' | 'scale2N', SpringScaleId>> = { scale1N: '1N', scale2N: '2N' }
export const BAR_OF_PART: Readonly<Record<'woodBar' | 'alBar' | 'ironBar', BarId>> = { woodBar: 'wood', alBar: 'aluminium', ironBar: 'iron' }

/** What dropping in a zone asks of the Apparatus. */
export type DropAction =
  | { kind: 'table' }
  | { kind: 'paper' }
  | { kind: 'face'; face: FaceId }
  | { kind: 'hook' }
  | { kind: 'masses' }
  | { kind: 'bar' }

export interface Zone extends CoreZone { id: ZoneId; action: DropAction }

/** Snap radius of the point zones, cm (generous: touch pointers are imprecise). */
export const SNAP_CM = 8
/** Table top in the 3D scene (box 250 x 120 cm centred on x = 20). */
export const TABLE = { cx: 20, cz: 0, hx: 125, hz: 60 } as const
/** Where the two face choices lie on the paper. */
export const FACE_X = { cloth: -37, sandpaper: -12 } as const

const AREA_OF: Readonly<Record<PartId, Exclude<Area, 'all'>>> = {
  paper: 'exp12', block: 'exp12', scale1N: 'exp12', scale2N: 'exp12', masses50: 'exp12', woodBar: 'exp3', alBar: 'exp3', ironBar: 'exp3',
}

/** Parts lying on the table that can be lifted again (all of them while no pull or crank trial is running; the Apparatus refuses otherwise). */
export const benchDraggable = (part: ItemId): boolean => isPart(part)

/** True when the part is placed (joined to the setup), not just lying on the table. */
export function isPlaced(part: PartId, s: ApparatusState): boolean {
  switch (part) {
    case 'paper': return s.paper !== 'none'
    case 'block': return s.face !== null
    case 'scale1N': return s.scale === '1N'
    case 'scale2N': return s.scale === '2N'
    case 'masses50': return s.addedMasses > 0
    case 'woodBar': return s.bar === 'wood'
    case 'alBar': return s.bar === 'aluminium'
    case 'ironBar': return s.bar === 'iron'
  }
}

/**
 * Every place the part can be dropped, given the apparatus state, the current lab step (`area`) and the block's displacement (cm).
 * The table is always there. The others are offered only in the step that uses the part. Wrong order is allowed: a zone that the
 * Apparatus would refuse is still returned (ready false) and the Apparatus refuses with the reason.
 */
export function zonesFor(part: PartId, s: ApparatusState, area: Area = 'all', x_block_cm = 0): Zone[] {
  const out: Zone[] = [{
    id: 'table', kind: 'area', action: { kind: 'table' }, cx: TABLE.cx, cy: 0, cz: TABLE.cz, hx: TABLE.hx, hz: TABLE.hz, snap_cm: 0, priority: 0, ready: true,
  }]
  if (area !== 'all' && AREA_OF[part] !== area) return out
  const point = (id: ZoneId, action: DropAction, x: number, y: number, z: number, ready: boolean): Zone =>
    ({ id, kind: 'point', action, cx: x, cy: y, cz: z, hx: 0, hz: 0, snap_cm: SNAP_CM, priority: 2, ready })
  const blk = blockSpot(s, x_block_cm)
  switch (part) {
    case 'paper':
      out.push(point('paper', { kind: 'paper' }, PAPER.x0 + PAPER.l / 2, 0.1, PAPER.z, true))
      break
    case 'block':
      out.push(point('faceCloth', { kind: 'face', face: 'cloth' }, FACE_X.cloth, 0.2, PAPER.z, true))
      out.push(point('faceSand', { kind: 'face', face: 'sandpaper' }, FACE_X.sandpaper, 0.2, PAPER.z, true))
      break
    case 'scale1N':
    case 'scale2N':
      out.push(point('hook', { kind: 'hook' }, blk.x + BLOCK_DIM.l / 2 + 0.5, 1.4, blk.z, true))
      break
    case 'masses50':
      out.push(point('masses', { kind: 'masses' }, blk.x, BLOCK_DIM.h + s.addedMasses * (MASS_DIM.h + 0.05) + MASS_DIM.h / 2, blk.z, s.addedMasses < MASS_STEPS - 1))
      break
    case 'woodBar':
    case 'alBar':
    case 'ironBar':
      out.push(point('barStart', { kind: 'bar' }, BAR_ON_MARK.x, BAR_ON_MARK.y, BAR_ON_MARK.z, s.course_mark))
      break
  }
  return out
}
