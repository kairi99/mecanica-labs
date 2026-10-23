// Procedural models of the bench (no external assets). 1 unit = 1 cm, y up.
// Rail frame: x along the rail from its high end, y normal to the top surface (y = 0 on the surface), z across (+z toward the viewer).
// Cart frame: origin at the front reference face on the rail surface, the cart extends to -x.
// Models are shaped after the real equipment in our own simplified way; no logos or brand text.
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { CART_FRONT_REFERENCE_OFFSET_m, CART_LENGTH_m, type CaliperVariant, type VernierGeometry } from '../../apparatus/index.ts'
import type { Materials } from './materials.ts'
import { RAIL, SUPPORT_FROM_END_cm, railLocalX_cm } from './units.ts'

export interface Kit {
  M: Materials
  textures: THREE.Texture[]
  anisotropy: number
}

const CART_L = CART_LENGTH_m * 100
export const CART = { length: CART_L, width: 3.0, bodyBottom: 1.0, bodyHeight: 2.6, wheelR: 0.7, wheelTrack: 0.55 }
export const ROD_Z = -3.4
export const BASE = { w: 16, d: 11, h: 0.7, cx: 1.5, cz: -1 }

// ---------------------------------------------------------------------------------------------------------------- helpers
export function box(w: number, h: number, d: number, mat: THREE.Material, x = 0, y = 0, z = 0, parent?: THREE.Object3D): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
  m.position.set(x, y, z)
  m.castShadow = true
  m.receiveShadow = true
  parent?.add(m)
  return m
}
export function cyl(rTop: number, rBot: number, h: number, mat: THREE.Material, parent?: THREE.Object3D, seg = 20): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat)
  m.castShadow = true
  m.receiveShadow = true
  parent?.add(m)
  return m
}
export function rbox(w: number, h: number, d: number, r: number, mat: THREE.Material, x = 0, y = 0, z = 0, parent?: THREE.Object3D): THREE.Mesh {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), mat)
  m.position.set(x, y, z)
  m.castShadow = true
  m.receiveShadow = true
  parent?.add(m)
  return m
}
/** Cylinder along the z axis (wheels, knobs). */
export function zcyl(r: number, len: number, mat: THREE.Material, parent?: THREE.Object3D, seg = 24): THREE.Mesh {
  const g = new THREE.CylinderGeometry(r, r, len, seg)
  g.rotateX(Math.PI / 2)
  const m = new THREE.Mesh(g, mat)
  m.castShadow = true
  m.receiveShadow = true
  parent?.add(m)
  return m
}

function canvasTexture(kit: Kit, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const g = c.getContext('2d')!
  draw(g)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = kit.anisotropy
  kit.textures.push(t)
  return t
}
function plane(w: number, h: number, mat: THREE.Material): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat)
  m.receiveShadow = true
  return m
}
const FONT = 'system-ui, sans-serif'

/** Mark a root as a pickable part and optionally a drag handle. */
export function tag(o: THREE.Object3D, partId: string, extra: Record<string, unknown> = {}): void {
  o.userData.partId = partId
  Object.assign(o.userData, extra)
}

// ----------------------------------------------------------------------------------------------------------------- rail
export interface RailModel {
  root: THREE.Group
  /** Rail-frame group for tape, level and anything that sits on the rail. */
  tapes: THREE.Group
  update(scaleZeroAtHighEnd: boolean): void
}
export function buildRail(kit: Kit): RailModel {
  const { M } = kit
  const root = new THREE.Group()
  const hw = RAIL.halfW, h = RAIL.height, L = RAIL.length
  const s = new THREE.Shape()
  // profile in (z, y): top surface at y = 0 with two running grooves at z = +-0.55
  const pts: [number, number][] = [[-hw, -h], [hw, -h], [hw, 0], [0.8, 0], [0.8, -0.3], [0.3, -0.3], [0.3, 0], [-0.3, 0], [-0.3, -0.3], [-0.8, -0.3], [-0.8, 0], [-hw, 0]]
  pts.forEach(([x, y], i) => (i === 0 ? s.moveTo(x, y) : s.lineTo(x, y)))
  const g = new THREE.ExtrudeGeometry(s, { depth: L, bevelEnabled: false })
  g.rotateY(Math.PI / 2) // extrusion axis z -> +x
  const body = new THREE.Mesh(g, M.alu)
  body.castShadow = true; body.receiveShadow = true
  root.add(body)
  tag(body, 'rail')
  // dark under-groove lines on the front face and end caps
  box(L, 0.12, 0.05, M.aluDark, L / 2, -1.85, hw + 0.01, root)
  box(0.35, h, hw * 2 + 0.1, M.black, -0.175, -h / 2, 0, root)
  box(0.35, h, hw * 2 + 0.1, M.black, L + 0.175, -h / 2, 0, root)

  // printed mm scale with cm numbers: one texture per orientation (0 at E1; the numbers stay upright when the rail is turned)
  const W = 3600, H = 40
  const scaleTex = (reversed: boolean): THREE.CanvasTexture => canvasTexture(kit, W, H, (c) => {
    c.fillStyle = '#e9ecf0'; c.fillRect(0, 0, W, H)
    c.fillStyle = '#15171b'; c.strokeStyle = '#15171b'
    c.font = `600 15px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'top'
    for (let mm = 0; mm <= 1200; mm++) {
      const x = ((reversed ? 1200 - mm : mm) / 1200) * W
      const len = mm % 10 === 0 ? 17 : mm % 5 === 0 ? 12 : 7
      c.lineWidth = mm % 10 === 0 ? 2 : 1
      c.beginPath(); c.moveTo(x, 0); c.lineTo(x, len); c.stroke()
      if (mm % 10 === 0 && mm > 0 && mm < 1200) c.fillText(String(mm / 10), x, 19)
    }
  })
  const texNormal = scaleTex(false), texRev = scaleTex(true)
  const strip = plane(L, 1.0, new THREE.MeshStandardMaterial({ map: texNormal, roughness: 0.5, metalness: 0.1 }))
  strip.position.set(L / 2, -0.72, hw + 0.012)
  root.add(strip)
  // end labels E1 / E2 (printed next to the scale ends)
  const eTex = (txt: string): THREE.CanvasTexture => canvasTexture(kit, 128, 48, (c) => {
    c.fillStyle = '#e9ecf0'; c.fillRect(0, 0, 128, 48)
    c.fillStyle = '#15171b'; c.font = `700 36px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'
    c.fillText(txt, 64, 26)
  })
  const e1 = plane(2.6, 0.62, new THREE.MeshStandardMaterial({ map: eTex('E1'), roughness: 0.5 }))
  const e2 = plane(2.6, 0.62, new THREE.MeshStandardMaterial({ map: eTex('E2'), roughness: 0.5 }))
  e1.position.set(0, -1.58, hw + 0.012); e2.position.set(0, -1.58, hw + 0.012)
  root.add(e1, e2)
  const tapes = new THREE.Group()
  root.add(tapes)
  const mat = strip.material as THREE.MeshStandardMaterial
  return {
    root, tapes,
    update(zeroHigh) {
      mat.map = zeroHigh ? texNormal : texRev
      mat.needsUpdate = true
      e1.position.x = railLocalX_cm(30, zeroHigh)
      e2.position.x = railLocalX_cm(1170, zeroHigh)
    },
  }
}

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
  // front sensor window and the engraved front reference line on both sides
  const win = plane(1.9, 1.0, M.black)
  win.rotation.y = Math.PI / 2
  win.position.set(0.004, CART.bodyBottom + 1.4, 0)
  root.add(win)
  const refX = -CART_FRONT_REFERENCE_OFFSET_m * 100
  for (const sz of [1, -1]) box(0.06, CART.bodyHeight - 0.5, 0.02, M.black, refX, CART.bodyBottom + CART.bodyHeight / 2, sz * (CART.width / 2 + 0.005), root)
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

// --------------------------------------------------------------------------------------------------- rack-and-pinion stand
export interface RackStandModel {
  root: THREE.Group
  /** Collar and knob follow the rail-top height `h_cm` at the clamp; `tilt_rad` rotates it with the rail. */
  update(h_cm: number, tilt_rad: number): void
  knob: THREE.Object3D
}
export function buildRackStand(kit: Kit): RackStandModel {
  const { M } = kit
  const root = new THREE.Group()
  tag(root, 'rackStand')
  const ROD_H = 38
  const rod = cyl(0.6, 0.6, ROD_H - BASE.h, M.steel, root, 20)
  rod.position.set(0, BASE.h + (ROD_H - BASE.h) / 2, ROD_Z)
  const cap = cyl(0.62, 0.62, 0.5, M.black, root)
  cap.position.set(0, ROD_H + 0.25, ROD_Z)
  const flange = cyl(1.5, 1.7, 0.6, M.steel, root, 24)
  flange.position.set(0, BASE.h + 0.3, ROD_Z)
  // mm scale on the front of the rod: reading r mm at y = 5.0 + r/10 cm (the top edge of the collar is the index)
  const SC_H = 28, PX = 8 // 280 mm at 8 px/mm, covering readings -20 .. 260
  const scaleTex = canvasTexture(kit, 64, SC_H * 10 * PX, (c) => {
    c.fillStyle = '#d9dde3'; c.fillRect(0, 0, 64, SC_H * 10 * PX)
    c.fillStyle = '#101216'; c.strokeStyle = '#101216'
    c.font = `700 17px ${FONT}`; c.textAlign = 'left'; c.textBaseline = 'middle'
    for (let r = -20; r <= 260; r++) {
      const y = (260 - r) * PX
      const len = r % 10 === 0 ? 28 : r % 5 === 0 ? 20 : 11
      c.lineWidth = r % 10 === 0 ? 2 : 1
      c.beginPath(); c.moveTo(0, y); c.lineTo(len, y); c.stroke()
      if (r % 10 === 0 && r >= 0) c.fillText(String(r), 31, y)
    }
  })
  const scale = plane(1.0, SC_H, new THREE.MeshStandardMaterial({ map: scaleTex, roughness: 0.5, metalness: 0.3 }))
  scale.position.set(0, 5.0 + (130 - 100) / 10 - 0, ROD_Z + 0.61) // centre of -20..260 is reading 120 -> y = 5 + 12
  scale.position.y = 5.0 + 12
  root.add(scale)
  // rack teeth on the down-slope side of the rod
  const teethTex = canvasTexture(kit, 8, 16, (c) => {
    c.fillStyle = '#7d838b'; c.fillRect(0, 0, 8, 16)
    c.fillStyle = '#23262b'; c.fillRect(0, 8, 8, 8)
  })
  teethTex.wrapS = teethTex.wrapT = THREE.RepeatWrapping
  teethTex.repeat.set(1, SC_H * 5) // 2 mm pitch
  const teeth = plane(0.9, SC_H, new THREE.MeshStandardMaterial({ map: teethTex, roughness: 0.5, metalness: 0.6 }))
  teeth.rotation.y = Math.PI / 2
  teeth.position.set(0.62, 5 + 12, ROD_Z)
  root.add(teeth)

  // collar + clamp + knob: origin = the rail top surface at the clamp
  const clamp = new THREE.Group()
  root.add(clamp)
  box(3.0, 3.6, 2.4, M.black, 0, -2.8, ROD_Z, clamp) // collar around the rod; its top edge (y = -1.0) is the scale index
  box(4.8, 0.8, 4.0, M.black, 0, -2.4, -0.2, clamp) // plate under the rail (top at y = -2.0)
  for (const sz of [1, -1]) box(4.8, 1.5, 0.4, M.black, 0, -1.3, sz * (RAIL.halfW + 0.2), clamp) // cheeks hugging the rail
  const knob = new THREE.Group()
  knob.position.set(0, -2.4, 2.0)
  const grip = zcyl(1.15, 0.9, M.blue, knob, 28)
  grip.position.z = 0.45
  const shaft = zcyl(0.35, 0.8, M.steel, knob)
  shaft.position.z = -0.1
  for (let i = 0; i < 8; i++) { // grip ribs
    const rib = box(0.18, 0.5, 0.9, M.blue, 0, 0, 0.45, knob)
    rib.position.set(Math.cos((i / 8) * Math.PI * 2) * 1.15, Math.sin((i / 8) * Math.PI * 2) * 1.15, 0.45)
    rib.rotation.z = (i / 8) * Math.PI * 2
  }
  clamp.add(knob)
  tag(knob, 'rackKnob', { dragHandle: 'rack' })
  const collarHit = clamp.children[0]!
  collarHit.userData.dragHandle = 'rack'
  collarHit.userData.partId = 'rackKnob'
  // rod: zero index mark (red) at the collar top edge
  box(3.0, 0.12, 0.06, M.red, 0, -1.0, ROD_Z + 1.21, clamp)
  return {
    root, knob,
    update(h, tilt) { clamp.position.set(0, h, 0); clamp.rotation.z = tilt },
  }
}

export function buildBase(kit: Kit): THREE.Group {
  const { M } = kit
  const root = new THREE.Group()
  const b = rbox(BASE.w, BASE.h, BASE.d, 0.25, M.black, BASE.cx, BASE.h / 2, BASE.cz, root)
  b.receiveShadow = true
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) cyl(0.5, 0.5, 0.15, M.rubber, root).position.set(BASE.cx + sx * 6.5, 0.0, BASE.cz + sz * 4.2)
  tag(root, 'standBase')
  return root
}

// ------------------------------------------------------------------------------------------------------------ two-leg stand
export interface TwoLegModel {
  root: THREE.Group
  /** `h_cm` = height of the rail top surface at the stand (table frame). */
  update(h_cm: number, tilt_rad: number): void
  foot: THREE.Object3D
}
export function buildTwoLeg(kit: Kit): TwoLegModel {
  const { M } = kit
  const root = new THREE.Group()
  tag(root, 'twoLegStand')
  const bridge = new THREE.Group()
  root.add(bridge)
  box(2.4, 0.8, 9.0, M.black, 0, -0.4, 0, bridge) // top of the bridge at the origin (touches the rail underside)
  // fixed leg (black tube on a black pad) and adjustable leg (silver threaded rod, knurled nut, black pad screw foot)
  const legL = cyl(0.75, 0.75, 1, M.black, root), pad = cyl(1.4, 1.5, 0.5, M.rubber, root)
  pad.position.set(0, 0.25, -3.4)
  legL.position.z = -3.4
  const threadTex = canvasTexture(kit, 16, 16, (c) => {
    c.fillStyle = '#c9ced6'; c.fillRect(0, 0, 16, 16)
    c.fillStyle = '#6d737c'; c.fillRect(0, 9, 16, 4)
  })
  threadTex.wrapS = threadTex.wrapT = THREE.RepeatWrapping
  const thread = cyl(0.45, 0.45, 1, new THREE.MeshStandardMaterial({ map: threadTex, metalness: 0.8, roughness: 0.35 }), root)
  thread.position.z = 3.4
  const foot = new THREE.Group()
  root.add(foot)
  const nut = cyl(1.0, 1.0, 1.1, M.black, foot, 24)
  for (let i = 0; i < 12; i++) { // knurling
    const a = (i / 12) * Math.PI * 2
    const k = box(0.16, 1.1, 0.3, M.rubber, Math.cos(a) * 1.0, 0, Math.sin(a) * 1.0, foot)
    k.rotation.y = -a
  }
  void nut
  const disc = cyl(1.7, 1.8, 0.5, M.black, root, 24)
  disc.position.set(0, 0.25, 3.4)
  tag(foot, 'foot', { dragHandle: 'foot' })
  thread.userData.dragHandle = 'foot'; thread.userData.partId = 'foot'
  disc.userData.dragHandle = 'foot'; disc.userData.partId = 'foot'
  return {
    root, foot,
    update(h, tilt) {
      const top = h - RAIL.height // rail underside = top of the bridge
      bridge.position.set(0, top, 0)
      bridge.rotation.z = tilt
      const lenL = Math.max(0.1, top - 0.8 - 0.5)
      legL.scale.y = lenL; legL.position.y = 0.5 + lenL / 2
      const lenT = Math.max(0.1, top - 0.8 - 0.5)
      thread.scale.y = lenT; thread.position.y = 0.5 + lenT / 2
      threadTex.repeat.set(1, Math.max(1, lenT * 1.2))
      foot.position.set(0, top - 0.8 - 0.55, 3.4)
    },
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

// ----------------------------------------------------------------------------------------------------------------- screws
export function screwHead(kit: Kit): THREE.Group {
  const g = new THREE.Group()
  const head = cyl(0.5, 0.5, 0.45, kit.M.steel, g, 14)
  head.rotation.x = Math.PI / 2
  head.position.z = 0.22
  const slot = box(0.7, 0.1, 0.06, kit.M.black, 0, 0, 0.46, g)
  slot.castShadow = false
  return g
}
export function screwPile(kit: Kit, n: number): THREE.Group {
  const g = new THREE.Group()
  tag(g, 'screws')
  const pos: [number, number, number][] = [[0, 0, 0], [1.6, 0, 0.5], [-1.6, 0, 0.3], [0.7, 0, 1.6], [-0.7, 0, -1.5], [2.0, 0, -1.4]]
  for (let i = 0; i < n; i++) {
    const s = cyl(0.35, 0.35, 2.6, kit.M.steel, g, 10)
    s.rotation.z = Math.PI / 2
    s.rotation.y = (i * 0.9)
    s.position.set(pos[i]![0], 0.35, pos[i]![2])
    const h = cyl(0.6, 0.6, 0.45, kit.M.steel, g, 12)
    h.rotation.z = Math.PI / 2
    h.rotation.y = s.rotation.y
    h.position.set(pos[i]![0] - Math.cos(s.rotation.y) * 1.4, 0.4, pos[i]![2] + Math.sin(s.rotation.y) * 1.4)
  }
  return g
}

// ------------------------------------------------------------------------------------------------------------------ level
export interface LevelModel { root: THREE.Group; setBubble(offset_mm: number | null): void }
export function buildLevel(kit: Kit): LevelModel {
  const { M } = kit
  const root = new THREE.Group()
  tag(root, 'level')
  rbox(12, 1.4, 2.2, 0.25, M.levelBody, 0, 0.7, 0, root)
  const vialBody = cyl(0.55, 0.55, 3.6, M.glass, root, 16)
  vialBody.rotation.z = Math.PI / 2
  vialBody.position.set(0, 1.55, 0)
  vialBody.castShadow = false
  const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 10), M.bubble)
  bubble.scale.set(1.9, 0.8, 0.8)
  bubble.position.set(0, 1.55, 0)
  root.add(bubble)
  // centre marks (+-0.5 cm)
  for (const sx of [-0.5, 0.5]) box(0.05, 0.05, 1.3, M.black, sx, 2.12, 0, root).castShadow = false
  // 6 mm saturation limits are the ends of the vial
  return {
    root,
    setBubble(o) {
      bubble.visible = o !== null
      if (o !== null) bubble.position.x = -o / 10 // positive offset = toward the high end = -x in the rail frame
    },
  }
}

// -------------------------------------------------------------------------------------------------------------- stopwatch
export interface StopwatchModel { root: THREE.Group; setText(text: string): void }
export function buildStopwatch(kit: Kit): StopwatchModel {
  const { M } = kit
  const root = new THREE.Group()
  tag(root, 'stopwatch')
  rbox(6.4, 2.0, 9.4, 0.5, M.white, 0, 1.0, 0, root)
  const cv = document.createElement('canvas')
  cv.width = 192; cv.height = 96
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  kit.textures.push(tex)
  let last = ''
  const draw = (text: string): void => {
    const c = cv.getContext('2d')!
    c.fillStyle = '#b9c8b4'; c.fillRect(0, 0, 192, 96)
    c.fillStyle = '#1b231b'; c.font = `600 52px ui-monospace, monospace`; c.textAlign = 'center'; c.textBaseline = 'middle'
    c.fillText(text, 96, 50)
    tex.needsUpdate = true
  }
  draw('00.00')
  const scr = plane(4.8, 2.4, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.3 }))
  scr.rotation.x = -Math.PI / 2
  scr.position.set(0, 2.003, -2.1)
  root.add(scr)
  box(5.0, 0.06, 2.9, M.black, 0, 2.0, -2.1, root).castShadow = false // bezel behind the screen
  scr.position.y = 2.04
  const b1 = cyl(0.55, 0.55, 0.3, M.red, root), b2 = cyl(0.65, 0.65, 0.3, M.blue, root), b3 = cyl(0.55, 0.55, 0.3, M.aluDark, root)
  b1.position.set(-1.9, 2.1, 2.6); b2.position.set(0, 2.1, 2.6); b3.position.set(1.9, 2.1, 2.6)
  return { root, setText(t) { if (t !== last) { last = t; draw(t) } } }
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

// ------------------------------------------------------------------------------------------------------------------ caliper
export type CaliperMode = 'depth' | 'jaws' | 'rest'
export interface CaliperModel {
  root: THREE.Group
  /** Rebuild for a variant, mode, opening (cm) and the digital display text. */
  set(variant: CaliperVariant, mode: CaliperMode, opening_cm: number, display: string, vernier: VernierGeometry | null): void
}
export function buildCaliper(kit: Kit): CaliperModel {
  const { M } = kit
  const root = new THREE.Group()
  tag(root, 'caliper')
  let content = new THREE.Group()
  root.add(content)
  let cacheKey = ''
  const BEAM = 22
  let mainTex: THREE.CanvasTexture | null = null
  let vernTex: THREE.CanvasTexture | null = null
  const getMain = (): THREE.CanvasTexture => mainTex ??= canvasTexture(kit, 2200, 64, (c) => {
    // main scale along the beam: 10 px per mm, drawn rotated later by the plane (u along the beam)
    c.fillStyle = '#e4e7ec'; c.fillRect(0, 0, 2200, 64)
    c.fillStyle = '#111'; c.strokeStyle = '#111'; c.font = `700 20px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'top'
    for (let mm = 0; mm <= 220; mm++) {
      const x = mm * 10
      const len = mm % 10 === 0 ? 30 : mm % 5 === 0 ? 22 : 14
      c.lineWidth = mm % 10 === 0 ? 2 : 1
      c.beginPath(); c.moveTo(x, 64); c.lineTo(x, 64 - len); c.stroke()
      if (mm % 10 === 0 && mm > 0) c.fillText(String(mm / 10), x, 2)
    }
  })
  const getVern = (): THREE.CanvasTexture => vernTex ??= canvasTexture(kit, 200, 64, (c) => {
    c.clearRect(0, 0, 200, 64)
    c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(0, 0, 200, 64)
    c.strokeStyle = '#a00'; c.fillStyle = '#a00'; c.font = `700 18px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'top'
    for (let i = 0; i <= 20; i++) {
      const x = i * 9.5 + 2 // 0.95 mm per division at 10 px/mm
      c.lineWidth = i % 5 === 0 ? 2 : 1
      c.beginPath(); c.moveTo(x, 64); c.lineTo(x, 64 - (i % 5 === 0 ? 30 : 18)); c.stroke()
      if (i % 5 === 0) c.fillText(String(i / 2), x, 2)
    }
  })
  const lcdCanvas = document.createElement('canvas')
  lcdCanvas.width = 192; lcdCanvas.height = 64
  const lcdTex = new THREE.CanvasTexture(lcdCanvas)
  lcdTex.colorSpace = THREE.SRGBColorSpace
  kit.textures.push(lcdTex)
  const drawLcd = (text: string): void => {
    const c = lcdCanvas.getContext('2d')!
    c.fillStyle = '#c7d3c1'; c.fillRect(0, 0, 192, 64)
    c.fillStyle = '#1b231b'; c.font = `600 40px ui-monospace, monospace`; c.textAlign = 'right'; c.textBaseline = 'middle'
    c.fillText(text, 170, 34)
    c.font = `600 16px ${FONT}`; c.fillText('mm', 188, 52)
    lcdTex.needsUpdate = true
  }
  const mainMat = (): THREE.MeshStandardMaterial => new THREE.MeshStandardMaterial({ map: getMain(), roughness: 0.4, metalness: 0.2 })

  return {
    root,
    set(variant, mode, L, display, vernier) {
      const key = `${variant}|${mode}|${L.toFixed(4)}|${display}|${vernier?.coincidentDivision ?? ''}`
      if (key === cacheKey) return
      cacheKey = key
      root.remove(content)
      content.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.geometry.dispose(); const mt = m.material as THREE.Material; if (mt !== M.alu && mt !== M.aluDark && mt !== M.black && mt !== M.steel) mt.dispose() } })
      content = new THREE.Group()
      root.add(content)
      // beam along +y; the scale face looks toward +z; scale zero at y = 0
      box(2.6, BEAM, 0.35, M.alu, 0, BEAM / 2, 0, content)
      const scale = plane(BEAM, 1.2, mainMat())
      scale.rotation.z = Math.PI / 2
      scale.rotation.y = 0
      // plane u (x) runs along the beam: after rotation.z = +90 deg, +x -> +y; texture orientation: ticks hang from the bottom of the strip toward -x
      scale.position.set(-0.55, BEAM / 2, 0.19)
      scale.scale.set(1, 1, 1)
      content.add(scale)
      // sliding head at y >= L (its lower edge is the index)
      const headH = variant === 'digital' ? 6.4 : 5.0
      const y0 = L + (variant === 'vernier' ? 2.0 : 0)
      const headLen = headH - (variant === 'vernier' ? 2.0 : 0)
      rbox(3.1, headLen, 1.0, 0.2, M.aluDark, 0, y0 + headLen / 2, 0.15, content)
      if (variant === 'vernier') {
        // transparent bevel carrying the 20-division vernier, in front of the main scale
        const v = plane(2.0, 1.2, new THREE.MeshBasicMaterial({ map: getVern(), transparent: true, depthWrite: false }))
        v.rotation.z = Math.PI / 2
        v.position.set(-0.55, L + 1.0 + 0.01, 0.22)
        v.scale.set(1, 1, 1)
        content.add(v)
        box(0.05, 2.0, 0.01, M.red, 0.15, L + 1.0, 0.215, content)
      } else {
        drawLcd(display)
        const lcd = plane(2.7, 0.9, new THREE.MeshStandardMaterial({ map: lcdTex, roughness: 0.3 }))
        lcd.position.set(0, L + 4.7, 0.66)
        content.add(lcd)
        cyl(0.5, 0.5, 0.35, M.black, content).position.set(0.9, L + 1.6, 0.7)
      }
      if (mode === 'depth') {
        // depth rod from the head down to the table, beside the beam; the beam foot rests on the rail
        box(0.3, L + 5, 0.3, M.steel, 0.85, L / 2 + 0.2, 1.1, content)
        box(0.3, 0.3, 1.3, M.steel, 0.85, L + 0.3, 0.55, content)
        box(0.6, 0.1, 0.6, M.steel, 0.85, -0.05, 1.1, content)
        // the rod hangs to y = -L
        const rod = box(0.3, L, 0.3, M.steel, 0.85, -L / 2, 1.1, content)
        void rod
        box(2.8, 0.3, 1.2, M.alu, 0, 0.0, 0.1, content)
      } else if (mode === 'jaws') {
        // jaws point down (+x of the beam after the root is turned): fixed jaw at 0, sliding jaw at L
        box(3.4, 0.4, 0.8, M.alu, 2.0, -0.2, 0.1, content)
        box(3.4, 0.4, 0.8, M.alu, 2.0, L + 0.2, 0.1, content)
      }
    },
  }
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
