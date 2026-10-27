// Procedural models of the Práctica 3 bench. 1 unit = 1 cm, y up. The equipment other experiments share (rail, stands, base, level,
// stopwatch, DigiCart, receiver with pulley, spring scale) is built by core/scene3d; here only the parts this bench adds: the film
// canister with lid and masses, the loose 10 g masses, the balance, the post that holds the dynamometer, the string. No logos or text.
import * as THREE from 'three'
import { box, cyl, rbox, tag, zcyl, type Kit } from '../../../../core/scene3d/models.ts'
import { CANISTER_H_cm } from './units.ts'

export {
  buildBase, buildCart, buildLevel, buildRackStand, buildReceiver, buildStopwatch, buildTwoLeg, screwHead, screwPile, buildRail, DEFAULT_CART_DIMS,
  box, cyl, rbox, tag, zcyl,
  type CartModel, type Kit, type LevelModel, type RackStandModel, type RailModel, type StopwatchModel, type TwoLegModel,
} from '../../../../core/scene3d/models.ts'
export { buildSpringScale, type SpringScaleModel } from '../../../../core/scene3d/springScale.ts'

/** Height of the knot above the canister bottom, cm (also where the string leaves it). */
export const KNOT_H_cm = CANISTER_H_cm + 1.0
const MASS_R = 1.1
const MASS_H = 0.9

// ---------------------------------------------------------------------------------------------------------------- 10 g mass
export function buildMass(kit: Kit): THREE.Group {
  const g = new THREE.Group()
  const m = cyl(MASS_R, MASS_R, MASS_H, kit.M.steel, g, 24)
  m.position.y = MASS_H / 2
  const hole = cyl(0.35, 0.35, MASS_H + 0.02, kit.M.black, g, 12)
  hole.position.y = MASS_H / 2
  hole.castShadow = false
  return g
}
export { MASS_H, MASS_R }

// -------------------------------------------------------------------------------------------------------------- film canister
export interface CanisterModel {
  root: THREE.Group
  /** Number of 10 g masses drawn inside (0..4). */
  setMasses(n: number): void
  /** Where the string is knotted, in the canister frame. */
  knot: THREE.Vector3
}
/** Film canister: a clear body, a white lid with a small loop; origin at the bottom centre. The masses (silver discs) show through the body. */
export function buildCanister(kit: Kit): CanisterModel {
  const { M } = kit
  const root = new THREE.Group()
  tag(root, 'canister')
  const R = 1.6
  const body = cyl(R, R, CANISTER_H_cm, M.glass, root, 28)
  body.position.y = CANISTER_H_cm / 2
  body.castShadow = false
  const base = cyl(R, R, 0.15, M.white, root, 28)
  base.position.y = 0.075
  const lid = cyl(R + 0.15, R + 0.15, 0.5, M.white, root, 28)
  lid.position.y = CANISTER_H_cm + 0.25
  const loop = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.09, 8, 16), M.steel)
  loop.position.y = CANISTER_H_cm + 0.9
  root.add(loop)
  const stack: THREE.Group[] = []
  for (let i = 0; i < 4; i++) {
    const mass = buildMass(kit)
    mass.position.y = 0.2 + i * (MASS_H + 0.05)
    mass.visible = false
    root.add(mass)
    stack.push(mass)
  }
  return { root, setMasses(n) { stack.forEach((m, i) => { m.visible = i < n }) }, knot: new THREE.Vector3(0, KNOT_H_cm, 0) }
}

// ----------------------------------------------------------------------------------------------------------------------- balance
/** Digital balance: a slab with a display window and a round pan; origin on the bench under its centre. */
export function buildBalance(kit: Kit): THREE.Group {
  const { M } = kit
  const g = new THREE.Group()
  tag(g, 'balance')
  rbox(14, 2.4, 10, 0.5, M.white, 0, 1.2, 0, g)
  box(5, 0.05, 1.6, M.black, -3, 2.43, 3.2, g)
  const pan = cyl(4.6, 4.6, 0.3, M.steel, g, 36)
  pan.position.set(2.2, 2.6, -0.4)
  cyl(0.5, 0.5, 0.4, M.black, g).position.set(2.2, 2.4, -0.4)
  return g
}

// ------------------------------------------------------------------------------------------------------------------------- post
/** A post with an arm that holds the dynamometer; origin at the foot. The scale hangs from the arm end at (armLength, height). */
export function buildScalePost(kit: Kit, height: number, armLength: number): THREE.Group {
  const { M } = kit
  const g = new THREE.Group()
  tag(g, 'scalePost')
  rbox(10, 0.8, 8, 0.2, M.black, 0, 0.4, 0, g)
  cyl(0.5, 0.5, height, M.steel, g, 16).position.y = height / 2
  const arm = zcyl(0.35, armLength, M.steel, g)
  arm.rotation.y = Math.PI / 2
  arm.position.set(-armLength / 2, height, 0)
  return g
}

// ------------------------------------------------------------------------------------------------------------------ small parts
export function buildBrassScrew(): THREE.Group {
  const g = new THREE.Group()
  tag(g, 'brassScrew')
  const mat = new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness: 0.85, roughness: 0.35 })
  cyl(0.35, 0.35, 2.4, mat, g, 12).position.y = 1.2
  cyl(0.6, 0.6, 0.4, mat, g, 12).position.y = 2.6
  g.userData.ownMaterial = mat
  return g
}
/** A coil of string (torus), origin on the bench. */
export function buildStringCoil(): THREE.Group {
  const g = new THREE.Group()
  tag(g, 'string')
  const mat = new THREE.MeshStandardMaterial({ color: 0xd9d2c0, roughness: 0.9 })
  const t = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.35, 8, 24), mat)
  t.rotation.x = Math.PI / 2
  t.position.y = 0.35
  t.castShadow = true
  g.add(t)
  g.userData.ownMaterial = mat
  return g
}
export function buildPlasticScrewBag(): THREE.Group {
  const g = new THREE.Group()
  tag(g, 'plasticScrews')
  const mat = new THREE.MeshStandardMaterial({ color: 0xf3f1ea, roughness: 0.6 })
  for (let i = 0; i < 3; i++) { const s = cyl(0.3, 0.3, 1.8, mat, g, 10); s.rotation.z = Math.PI / 2; s.position.set(0, 0.35 + i * 0.1, -1 + i); const h = cyl(0.55, 0.55, 0.3, mat, g, 10); h.rotation.z = Math.PI / 2; h.position.set(0.95, 0.35 + i * 0.1, -1 + i) }
  g.userData.ownMaterial = mat
  return g
}
