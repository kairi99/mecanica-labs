// Procedural models of the bench (no external assets). 1 unit = 1 cm, y up.
// Rail frame: x along the rail from its high end, y normal to the top surface (y = 0 on the surface), z across (+z toward the viewer).
// Cart frame: origin at the front reference face on the rail surface, the cart extends to -x.
// Models are shaped after the real equipment in our own simplified way; no logos or brand text.
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { CART_LENGTH_m } from '../../apparatus/index.ts'
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

// ------------------------------------------------------------------------------------------------------------------ tape measure
/**
 * 'down': hook (zero) on the table, blade rising to the reading point at the origin (rail top edge), case above (rail heights).
 * 'right' / 'left': blade runs along +x / -x from the hook, case at the far end (support separation, cart length).
 * 'rest': case only, with the hook tab peeking out (lying on the tray).
 */
export type TapeMode = 'down' | 'right' | 'left' | 'rest'
export interface TapeModel {
  root: THREE.Group
  /** Rebuild for a mode and the blade length (cm) between the hook and the reading point. */
  set(mode: TapeMode, length_cm: number): void
}
const BLADE_W = 1.9
const WINDOW_cm = 4
const WINDOW_PX_PER_cm = 140
export function buildTapeMeasure(kit: Kit): TapeModel {
  const { M } = kit
  const root = new THREE.Group()
  tag(root, 'tapeMeasure')
  let content = new THREE.Group()
  root.add(content)
  let cacheKey = ''
  let windowTex: THREE.CanvasTexture | null = null

  /** Graduations of the last WINDOW_cm before the reading point at s = L: 1 mm ticks, numerals every cm. Drawn along the long axis. */
  const makeWindow = (L_cm: number, vertical: boolean, flip: boolean): THREE.CanvasTexture => {
    windowTex?.dispose()
    const long = WINDOW_cm * WINDOW_PX_PER_cm
    const short = BLADE_W * WINDOW_PX_PER_cm
    const s0 = L_cm - WINDOW_cm
    windowTex = canvasTexture(kit, vertical ? short : long, vertical ? long : short, (c) => {
      c.fillStyle = '#f2c230'; c.fillRect(0, 0, c.canvas.width, c.canvas.height)
      c.strokeStyle = '#1b1608'; c.fillStyle = '#1b1608'; c.font = `700 26px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'
      for (let mm = Math.ceil(s0 * 10); mm <= Math.floor(L_cm * 10); mm++) {
        if (mm < 0) continue
        const q = (mm / 10 - s0) * WINDOW_PX_PER_cm
        const p = flip ? long - q : q
        const len = mm % 10 === 0 ? 46 : mm % 5 === 0 ? 34 : 22
        c.lineWidth = mm % 10 === 0 ? 3 : 1.5
        c.beginPath()
        if (vertical) { c.moveTo(0, p); c.lineTo(len, p) } else { c.moveTo(p, 0); c.lineTo(p, len) }
        c.stroke()
        if (mm % 10 === 0) {
          if (vertical) c.fillText(String(mm / 10), 78, p)
          else c.fillText(String(mm / 10), p, 74)
        }
      }
    })
    return windowTex
  }

  /**
   * Round case (the common pocket tape: chrome rim, black rubber grip band, yellow side faces, lock button, belt clip).
   * Built in a canonical frame: the coil axis is x (the blade width), the blade leaves the mouth along -y in the plane
   * z = 0 with its face toward +z, and the case sits on the side `side` (+1: +z, -1: -z). The origin is the reading
   * point; the blade runs from there up into the coil. The caller places and rotates the returned group.
   */
  const R = 2.7 // case radius, cm (a 3 m pocket tape is about 5 to 6 cm across)
  const T = 2.6 // case thickness along the coil axis, cm
  const roundCase = (stripMat: THREE.Material, side: 1 | -1, stub_cm = 0): THREE.Group => {
    const g = new THREE.Group()
    const chrome = new THREE.MeshStandardMaterial({ color: 0xd9dde2, metalness: 1, roughness: 0.2 })
    const yellow = new THREE.MeshStandardMaterial({ color: 0xf2c230, metalness: 0.05, roughness: 0.5 })
    const cy = 1.7 + 0.65 * R // coil centre above the reading point; the mouth sits under it, on the blade
    const cz = side * R // the blade is tangent to the coil
    const disc = (r: number, h: number, mat: THREE.Material, x: number): void => {
      const m = cyl(r, r, h, mat, g, 48)
      m.rotation.z = Math.PI / 2
      m.position.set(x, cy, cz)
    }
    disc(R, T * 0.86, chrome, 0) // chrome shell
    disc(R + 0.1, T * 0.5, M.black, 0) // rubber grip band round the rim
    for (const sx of [-1, 1]) {
      disc(R * 0.86, 0.1, yellow, sx * T * 0.45) // side face
      disc(R * 0.34, 0.08, M.black, sx * T * 0.5) // hub
      disc(0.22, 0.06, chrome, sx * T * 0.53) // rivet
    }
    box(T * 0.7, 1.0, 0.9, M.black, 0, cy - 0.65 * R, side * 0.25, g) // mouth housing round the blade exit
    box(T * 0.3, 0.45, 0.9, yellow, 0, cy - 0.65 * R + 0.2, side * 1.1, g).rotation.x = side * 0.5 // lock button
    box(0.1, R * 0.9, 0.8, M.steel, T * 0.56, cy + R * 0.5, cz, g) // belt clip on one face, clear of the hub
    box(BLADE_W, cy + stub_cm, 0.05, stripMat, 0, (cy - stub_cm) / 2, 0, g) // blade from the mouth into the coil
    return g
  }

  return {
    root,
    set(mode, L_cm) {
      const key = `${mode}|${L_cm.toFixed(3)}`
      if (key === cacheKey) return
      cacheKey = key
      root.remove(content)
      content.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.geometry.dispose(); const mt = m.material as THREE.Material; if (!Object.values(M).includes(mt as never)) mt.dispose() } })
      content = new THREE.Group()
      root.add(content)
      if (mode === 'rest') {
        // case lying on the tray, hook tab peeking out of the mouth
        // standing on its rim on the tray, blade flat under the mouth and the hook tab just out of it
        const c = roundCase(M.tape, 1, 0.6)
        c.rotation.x = -Math.PI / 2 // canonical -y (blade out) becomes +z, the case side +z becomes up
        c.position.set(0, 0.13, 2.4) // coil centre about 1 cm behind the origin
        content.add(c)
        box(BLADE_W, 0.45, 0.1, M.steel, 0, 0.35, 3.0, content) // hook tab
        return
      }
      const L = Math.max(L_cm, 0.5)
      const vertical = mode === 'down'
      const dir = mode === 'left' ? -1 : 1
      const blade = new THREE.Group()
      content.add(blade)
      const stripMat = new THREE.MeshStandardMaterial({ color: 0xf2c230, roughness: 0.45, metalness: 0.35 })
      const winMat = new THREE.MeshStandardMaterial({ map: makeWindow(L, vertical, vertical || mode === 'left'), roughness: 0.45, metalness: 0.35 })
      const win = Math.min(WINDOW_cm, L)
      if (vertical) {
        // blade is a thin strip in the xy plane, face toward +z: the hook (zero) rests on the table at y = -L and the
        // blade rises to the reading point at the rail top edge (origin), then on into the case held above the rail
        box(BLADE_W, L, 0.05, stripMat, 0, -L / 2, 0, blade)
        const w = plane(BLADE_W, WINDOW_cm, winMat)
        w.position.set(0, -WINDOW_cm / 2, 0.03)
        blade.add(w)
        box(BLADE_W, 0.12, 0.9, M.steel, 0, -L + 0.06, 0.4, blade) // hook tab flat on the table
        box(BLADE_W, 0.7, 0.12, M.steel, 0, -L + 0.35, 0.0, blade)
        content.add(roundCase(stripMat, -1)) // held above the rail, behind the blade
      } else {
        box(L, BLADE_W, 0.05, stripMat, dir * L / 2, 0, 0, blade)
        const w = plane(WINDOW_cm, BLADE_W, winMat)
        w.position.set(dir * (L - WINDOW_cm / 2), 0, 0.03)
        blade.add(w)
        box(0.12, BLADE_W, 0.9, M.steel, 0, 0, -0.4, blade)
        box(0.12, 0.7, 0.12, M.steel, 0, 0, 0, blade).rotation.y = 0
        const c = roundCase(stripMat, 1) // in front of the rail face, or above the cart top
        c.rotation.z = -dir * Math.PI / 2 // canonical -y (toward the hook) becomes -dir·x
        c.position.set(dir * L, 0, 0)
        content.add(c)
      }
      void win
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
