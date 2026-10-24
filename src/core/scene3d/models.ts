// Procedural models of the lab equipment that more than one experiment uses (no external assets). 1 unit = 1 cm, y up.
// Rail frame: x along the rail from its high end, y normal to the top surface (y = 0 on the surface), z across (+z toward the viewer).
// Models are shaped after the real equipment in our own simplified way; no logos or brand text.
// Dimensions of the bench come in through option objects whose defaults are the values of the MRUV bench, so an
// experiment that does not pass them gets the same rail, stand and base.
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import type { CoreMaterials } from './materials.ts'

/** What every builder needs: the materials, the textures to dispose with the scene and the anisotropy of the GPU. */
export interface Kit<M extends CoreMaterials = CoreMaterials> {
  M: M
  textures: THREE.Texture[]
  anisotropy: number
}

/** Visual rail, cm: half width, height of the profile, length. Default: the 1.2 m aluminium rail. */
export interface RailDims { halfW: number; height: number; length: number }
export const DEFAULT_RAIL: RailDims = { halfW: 1.25, height: 2.0, length: 120 }
/** Rod of the rack-and-pinion stand: z offset behind the rail axis, cm. */
export const DEFAULT_ROD_Z = -3.4
/** Stand base plate, cm: width, depth, height and the centre of the plate relative to the rod. */
export interface BaseDims { w: number; d: number; h: number; cx: number; cz: number }
export const DEFAULT_BASE: BaseDims = { w: 16, d: 11, h: 0.7, cx: 1.5, cz: -1 }

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

export function canvasTexture(kit: Kit, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
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
export function plane(w: number, h: number, mat: THREE.Material): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat)
  m.receiveShadow = true
  return m
}
export const FONT = 'system-ui, sans-serif'

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
export interface RailOptions extends Partial<RailDims> {
  /** Local x (cm from the high end) of the E1 and E2 end labels for a scale orientation. Default: 3 cm and 117 cm from the printed ends. */
  endLabelX_cm?: (scaleZeroAtHighEnd: boolean) => [number, number]
}
export function buildRail(kit: Kit, opts: RailOptions = {}): RailModel {
  const { M } = kit
  const root = new THREE.Group()
  const dims = { ...DEFAULT_RAIL, ...opts }
  const hw = dims.halfW, h = dims.height, L = dims.length
  const endX = opts.endLabelX_cm ?? ((zeroHigh: boolean): [number, number] => (zeroHigh ? [3, 117] : [117, 3]))
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
      const [x1, x2] = endX(zeroHigh)
      e1.position.x = x1
      e2.position.x = x2
    },
  }
}

// --------------------------------------------------------------------------------------------------- rack-and-pinion stand
export interface RackStandModel {
  root: THREE.Group
  /** Collar and knob follow the rail-top height `h_cm` at the clamp; `tilt_rad` rotates it with the rail. */
  update(h_cm: number, tilt_rad: number): void
  knob: THREE.Object3D
}
export interface RackStandOptions {
  /** Rod z offset, cm. */
  rodZ?: number
  /** Base plate (the rod stands on it). */
  base?: BaseDims
  /** Half width of the rail the cheeks of the clamp hug, cm. */
  railHalfW?: number
}
export function buildRackStand(kit: Kit, opts: RackStandOptions = {}): RackStandModel {
  const { M } = kit
  const ROD_Z = opts.rodZ ?? DEFAULT_ROD_Z
  const BASE = opts.base ?? DEFAULT_BASE
  const railHalfW = opts.railHalfW ?? DEFAULT_RAIL.halfW
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
  for (const sz of [1, -1]) box(4.8, 1.5, 0.4, M.black, 0, -1.3, sz * (railHalfW + 0.2), clamp) // cheeks hugging the rail
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

export function buildBase(kit: Kit, base: BaseDims = DEFAULT_BASE): THREE.Group {
  const { M } = kit
  const BASE = base
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
export function buildTwoLeg(kit: Kit, opts: { railHeight?: number } = {}): TwoLegModel {
  const { M } = kit
  const railHeight = opts.railHeight ?? DEFAULT_RAIL.height
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
      const top = h - railHeight // rail underside = top of the bridge
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
/** Blade width, cm: a real 25 mm pocket tape (the old 1.9 cm blade was narrower than any common tape). */
const BLADE_W = 2.5
/** Graduated length of the blade drawn before the reading point, cm. */
const WINDOW_cm = 6
/** Texture density, canvas px per cm of blade: 1 mm = 20 px, so a mm tick stays a crisp 3 px line at close-up zoom. */
const WINDOW_PX_PER_cm = 200
/** Hard cap of the longest canvas side (phone GPUs, memory): the density falls back if a long window ever needs more. */
const MAX_TEX_SIDE = 4096
export function buildTapeMeasure(kit: Kit): TapeModel {
  const { M } = kit
  const root = new THREE.Group()
  tag(root, 'tapeMeasure')
  let content = new THREE.Group()
  root.add(content)
  let cacheKey = ''
  let windowTex: THREE.CanvasTexture | null = null

  /**
   * Graduations of the last WINDOW_cm before the reading point at s = L, drawn along the long axis like a printed 25 mm tape:
   * 1 mm ticks (finest, still visible), 5 mm, 1 cm, 5 cm and 10 cm ticks of growing length from one edge, and big bold condensed
   * numerals every cm in the free part of the blade width. Only what a real tape prints (1 mm resolution, no extra precision).
   */
  const makeWindow = (L_cm: number, vertical: boolean, flip: boolean): THREE.CanvasTexture => {
    windowTex?.dispose()
    const S = Math.min(WINDOW_PX_PER_cm, MAX_TEX_SIDE / WINDOW_cm) // px per cm
    const long = Math.round(WINDOW_cm * S)
    const short = Math.round(BLADE_W * S)
    const s0 = L_cm - WINDOW_cm
    // tick lengths from the edge (cm of blade) by kind
    const tick = (mm: number): { len: number; w: number } =>
      mm % 100 === 0 ? { len: 1.15 * S, w: 0.035 * S } : mm % 50 === 0 ? { len: 0.95 * S, w: 0.03 * S }
        : mm % 10 === 0 ? { len: 0.75 * S, w: 0.024 * S } : mm % 5 === 0 ? { len: 0.5 * S, w: 0.017 * S } : { len: 0.32 * S, w: 0.012 * S }
    windowTex = canvasTexture(kit, vertical ? short : long, vertical ? long : short, (c) => {
      c.fillStyle = '#f2c230'; c.fillRect(0, 0, c.canvas.width, c.canvas.height)
      c.strokeStyle = '#1b1608'; c.fillStyle = '#1b1608'; c.textAlign = 'center'; c.textBaseline = 'middle'
      const digits = String(Math.floor(L_cm)).length
      const FONT_PX = 0.95 * S // cap height about 0.7 cm
      // free blade width for the numeral: beside the ticks (vertical blade) or under them (horizontal blade, one cm of length)
      const room = vertical ? short - 0.95 * S : 0.9 * S
      const sx = Math.min(0.78, room / (0.64 * digits * FONT_PX))
      const labelAt = vertical ? 0.95 * S + (short - 0.95 * S) / 2 : 0.95 * S + (short - 0.95 * S) / 2
      c.font = `800 ${FONT_PX}px ${FONT}`
      for (let mm = Math.ceil(s0 * 10); mm <= Math.floor(L_cm * 10); mm++) {
        if (mm < 0) continue
        const q = (mm / 10 - s0) * S
        const p = flip ? long - q : q
        const t = tick(mm)
        c.lineWidth = t.w
        c.beginPath()
        if (vertical) { c.moveTo(0, p); c.lineTo(t.len, p) } else { c.moveTo(p, 0); c.lineTo(p, t.len) }
        c.stroke()
        if (mm % 10 === 0) {
          c.save()
          if (vertical) c.translate(labelAt, p)
          else c.translate(p, labelAt)
          c.scale(sx, 1)
          c.fillText(String(mm / 10), 0, 0)
          c.restore()
        }
      }
    })
    windowTex.generateMipmaps = true
    windowTex.minFilter = THREE.LinearMipmapLinearFilter
    windowTex.magFilter = THREE.LinearFilter
    return windowTex
  }

  /**
   * Round case (the common pocket tape: chrome rim, black rubber grip band, yellow side faces, lock button, belt clip).
   * Built in a canonical frame: the coil axis is x (the blade width), the blade leaves the mouth along -y in the plane
   * z = 0 with its face toward +z, and the case sits on the side `side` (+1: +z, -1: -z). The origin is the reading
   * point; the blade runs from there up into the coil. The caller places and rotates the returned group.
   */
  const R = 2.9 // case radius, cm (a 3 to 5 m pocket tape is about 6 to 7 cm across)
  const T = 3.1 // case thickness along the coil axis, cm
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

