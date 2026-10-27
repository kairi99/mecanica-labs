// Procedural models of the MRUV bench. 1 unit = 1 cm, y up. The equipment other experiments share (rail, stands, base, level,
// stopwatch, tape measure) is built by core/scene3d/models.ts; here it is bound to this bench's dimensions.
// Cart frame: origin at the front reference face on the rail surface, the cart extends to -x.
import * as THREE from 'three'
import { CART_LENGTH_m } from '../../apparatus/index.ts'
import {
  buildBase as coreBuildBase, buildRackStand as coreBuildRackStand, buildRail as coreBuildRail, buildTwoLeg as coreBuildTwoLeg,
  canvasTexture, tag, FONT, buildCart as coreBuildCart, buildReceiver as coreBuildReceiver, type BaseDims, type Kit as CoreKit,
} from '../../../../core/scene3d/models.ts'
import type { Materials } from './materials.ts'
import { RAIL, SUPPORT_FROM_END_cm, railLocalX_cm } from './units.ts'

export {
  box, cyl, rbox, zcyl, tag, buildLevel, buildStopwatch, buildTapeMeasure, screwHead, screwPile,
  type LevelModel, type RackStandModel, type RailModel, type StopwatchModel, type TapeMode, type TapeModel, type TwoLegModel,
} from '../../../../core/scene3d/models.ts'

export type Kit = CoreKit<Materials>

const CART_L = CART_LENGTH_m * 100
export const CART = { length: CART_L, width: 3.0, bodyBottom: 1.0, bodyHeight: 2.6, wheelR: 0.7, wheelTrack: 0.55 }
export const ROD_Z = -3.4
export const BASE: BaseDims = { w: 16, d: 11, h: 0.7, cx: 1.5, cz: -1 }

// ----------------------------------------------------------------------------------------- shared models at the MRUV dimensions
export const buildRail = (kit: Kit) => coreBuildRail(kit, {
  halfW: RAIL.halfW, height: RAIL.height, length: RAIL.length,
  endLabelX_cm: (zeroHigh) => [railLocalX_cm(30, zeroHigh), railLocalX_cm(1170, zeroHigh)],
})
export const buildRackStand = (kit: Kit) => coreBuildRackStand(kit, { rodZ: ROD_Z, base: BASE, railHalfW: RAIL.halfW })
export const buildBase = (kit: Kit) => coreBuildBase(kit, BASE)
export const buildTwoLeg = (kit: Kit) => coreBuildTwoLeg(kit, { railHeight: RAIL.height })

// ------------------------------------------------------------------------------------------------------------------ cart, receiver
// The DigiCart and the receiver with pulley are shared with Practica 3: the builders live in core/scene3d/models.ts, bound here to
// this bench's cart dimensions.
export type { CartModel } from '../../../../core/scene3d/models.ts'
export const buildCart = (kit: Kit) => coreBuildCart(kit, CART)
export const buildReceiver = (kit: Kit) => coreBuildReceiver(kit)

// ------------------------------------------------------------------------------------------------------------- tape roll
export function buildTapeRoll(kit: Kit): THREE.Group {
  const g = new THREE.Group()
  tag(g, 'markers')
  const t = new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.6, 12, 32), kit.M.tapeRoll)
  t.rotation.x = Math.PI / 2
  t.position.y = 0.6
  t.castShadow = true
  g.add(t)
  return g
}

/** Yellow tape flag on the front face of the rail with the distance from A in cm (readable in the lateral and mark views). */
export function tapeFlag(kit: Kit, text: string, cache: Map<string, THREE.Material>): THREE.Mesh {
  let mat = cache.get(text)
  if (!mat) {
    const tex = canvasTexture(kit, 256, 128, (c) => {
      c.fillStyle = '#f2b01e'; c.fillRect(0, 0, 256, 128)
      c.fillStyle = '#1b1608'
      c.fillRect(124, 0, 8, 14); c.fillRect(124, 114, 8, 14) // tick: the exact position of the mark
      let size = 104
      c.font = `800 ${size}px ${FONT}`
      while (c.measureText(text).width > 232 && size > 40) { size -= 6; c.font = `800 ${size}px ${FONT}` }
      c.textAlign = 'center'; c.textBaseline = 'middle'
      c.fillText(text, 128, 70)
    })
    mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })
    cache.set(text, mat)
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(TAPE_FLAG.w, TAPE_FLAG.h), mat)
  m.receiveShadow = true
  return m
}
export const TAPE_FLAG = { w: 4.0, h: 2.0 }

export { SUPPORT_FROM_END_cm }
