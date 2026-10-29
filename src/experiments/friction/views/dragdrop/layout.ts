// Table layout of the friction bench in scene centimetres (x right, y up, z toward the viewer, table top at y = 0), shared by the 3D scene
// (where each part is drawn) and the drag-and-drop zones (where each part can be dropped). Pure: no DOM, no three.js.
import { START_FRONT_m, type ApparatusState, type BarId } from '../../apparatus/index.ts'
import { RAIL_LENGTH_m } from '../../physics/index.ts'

/** Sheet of paper (A4 landscape) fixed to the table for exps. 1 and 2. */
export const PAPER = { x0: -40, z: 28, l: 29.7, w: 21 } as const
export const BLOCK_DIM = { l: 6, h: 3, w: 4 } as const
/** Block rest position on the paper (front of the sheet, hook toward +x). */
export const BLOCK_X0_cm = PAPER.x0 + 2.5
/** Mass cylinders: radius, height, cm. */
export const MASS_DIM = { r: 1.6, h: 0.9 } as const
/** The rail's high end sits at x = X_LOW - 120 when flat (see scene.ts); the rail lies behind the front row. */
export const X_LOW = 85
export const RAIL_Z = -22

/** Where each part lies while it is not placed (the "loose" start). Centres, cm. */
export const LOOSE = {
  paper: { x: -45, z: 44 },
  block: { x: -8, z: 40 },
  scale1N: { x: -22, z: 57 },
  scale2N: { x: 14, z: 57 },
  masses: { x0: 14, z: 40, dx: 5 },
  bars: { wood: { x: 10, z: -8 }, aluminium: { x: 25, z: -8 }, iron: { x: 40, z: -8 } } as Record<BarId, { x: number; z: number }>,
} as const

/** Block centre (x, z): on the paper once a face is chosen, lying loose before. `xPull_cm` is the displacement while pulling. */
export function blockSpot(s: Pick<ApparatusState, 'face'>, x_block_cm = 0): { x: number; z: number } {
  return s.face === null ? { x: LOOSE.block.x, z: LOOSE.block.z } : { x: BLOCK_X0_cm + x_block_cm, z: PAPER.z }
}

/** Centre of the bar on the start mark with the rail flat: the high end is at X_LOW - 120, the bar centre 5 cm behind its front edge. */
export const BAR_ON_MARK = { x: X_LOW - RAIL_LENGTH_m * 100 + (RAIL_LENGTH_m - START_FRONT_m) * 100 - 5, y: 2.8, z: RAIL_Z } as const
