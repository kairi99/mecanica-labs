// Procedural models of the MRUV bench. 1 unit = 1 cm, y up. The equipment other experiments share (rail, stands, base, level,
// stopwatch, tape measure) is built by core/scene3d/models.ts; here it is bound to this bench's dimensions.
// Cart frame: origin at the front reference face on the rail surface, the cart extends to -x.
import * as THREE from 'three'
import { CART_LENGTH_m } from '../../apparatus/index.ts'
import {
  buildBase as coreBuildBase, buildRackStand as coreBuildRackStand, buildRail as coreBuildRail, buildTwoLeg as coreBuildTwoLeg,
  box, canvasTexture, plane, rbox, tag, zcyl, FONT, type BaseDims, type Kit as CoreKit,
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

// ------------------------------------------------------------------------------------------------------------------ cart
export interface CartModel {
  root: THREE.Group
  /** Roll the wheels for a front travelled `D_cm` along the rail. */
  roll(D_cm: number): void
  setInvalid(bad: boolean): void
}
export function buildCart(kit: Kit): CartModel {
  const { M } = kit
  const root = new THREE.Group()
  // rounded white shell above a dark lower skirt band (the wheels sit inset below it)
  const skirtH = 0.9
  rbox(CART.length - 0.12, skirtH, CART.width - 0.12, 0.3, M.skirt, -CART.length / 2, CART.bodyBottom + skirtH / 2, 0, root)
  const body = rbox(CART.length, CART.bodyHeight - skirtH + 0.2, CART.width, 0.55, M.white, -CART.length / 2, CART.bodyBottom + skirtH + (CART.bodyHeight - skirtH + 0.2) / 2 - 0.2, 0, root)
  tag(root, 'cart')
  // generic label decal on top (a few grey bars and a dot; no brand, no text)
  const lab = plane(5.0, 1.6, new THREE.MeshStandardMaterial({
    map: canvasTexture(kit, 250, 80, (c) => {
      c.fillStyle = '#e3e6ec'; c.fillRect(0, 0, 250, 80)
      c.fillStyle = '#5a6272'; c.fillRect(14, 18, 120, 10); c.fillRect(14, 36, 150, 8); c.fillRect(14, 52, 90, 8)
      c.beginPath(); c.arc(206, 40, 18, 0, Math.PI * 2); c.fill()
      c.fillStyle = '#e3e6ec'; c.beginPath(); c.arc(206, 40, 8, 0, Math.PI * 2); c.fill()
    }), roughness: 0.5,
  }))
  lab.rotation.x = -Math.PI / 2
  lab.position.set(-CART.length / 2, CART.bodyBottom + CART.bodyHeight + 0.003, 0)
  root.add(lab)
  // front sensor window
  const win = plane(1.9, 1.0, M.black)
  win.rotation.y = Math.PI / 2
  win.position.set(0.004, CART.bodyBottom + 1.4, 0)
  root.add(win)
  // wheels in the two rail grooves
  const wheels: THREE.Group[] = []
  for (const wx of [-2.0, -CART.length + 2.0]) for (const sz of [1, -1]) {
    const piv = new THREE.Group()
    piv.position.set(wx, 0.4, sz * CART.wheelTrack)
    const wh = zcyl(CART.wheelR, 0.42, M.black, piv)
    const cap = zcyl(0.28, 0.46, M.steel, piv)
    cap.castShadow = false
    box(0.14, 0.5, 0.45, M.white, 0, CART.wheelR - 0.28, 0, piv).castShadow = false // spot that shows the rotation
    void wh
    root.add(piv)
    wheels.push(piv)
  }
  return {
    root,
    roll(D) { for (const w of wheels) w.rotation.z = -D / CART.wheelR },
    setInvalid(bad) { body.material = bad ? M.invalid : M.white },
  }
}

// ---------------------------------------------------------------------------------------------------------------- receiver
/**
 * Receiver: a slate blue-grey bevelled wedge end block with a red stop insert and a black spoked pulley of about 0.6 of the block
 * height on the rail end (no arm). The origin is the low rail end (rail frame: stop face at x = -4).
 */
export function buildReceiver(kit: Kit): THREE.Group {
  const { M } = kit
  const root = new THREE.Group()
  tag(root, 'receiver')
  // side profile (x along the rail, y up): taller at the rail end, sloping down toward the cart
  const prof = new THREE.Shape()
  const pts: [number, number][] = [[-4, -2.7], [0.8, -2.7], [0.8, 4.6], [-0.6, 4.6], [-4, 3.3]]
  pts.forEach(([x, y], i) => (i === 0 ? prof.moveTo(x, y) : prof.lineTo(x, y)))
  const bev = 0.22
  const g = new THREE.ExtrudeGeometry(prof, { depth: 4.4 - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelOffset: -bev, bevelSegments: 2 })
  g.translate(0, 0, -(4.4 - 2 * bev) / 2)
  const block = new THREE.Mesh(g, M.slate)
  block.castShadow = true; block.receiveShadow = true
  root.add(block)
  const stopFace = plane(2.8, 2.6, M.red)
  stopFace.rotation.y = -Math.PI / 2
  stopFace.position.set(-4.004, 1.7, 0)
  root.add(stopFace)
  const wheel = new THREE.Group()
  wheel.position.set(0.9, 1.4, 0)
  root.add(wheel)
  tag(wheel, 'pulley')
  const R = 2.2
  const rim = new THREE.Mesh(new THREE.TorusGeometry(R - 0.3, 0.3, 10, 36), M.black)
  rim.castShadow = true
  wheel.add(rim)
  zcyl(0.55, 0.9, M.black, wheel)
  zcyl(0.2, 1.4, M.steel, wheel)
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.2
    const sp = box(R - 0.5, 0.22, 0.28, M.black, Math.cos(a) * (R / 2 + 0.1), Math.sin(a) * (R / 2 + 0.1), 0, wheel)
    sp.rotation.z = a
  }
  return root
}

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
