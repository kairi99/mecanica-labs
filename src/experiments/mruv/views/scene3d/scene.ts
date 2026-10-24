// The three.js scene of the table. This module (and three itself) is a lazy chunk: only index.ts imports it, via dynamic import().
// Rendering is on demand: a frame is drawn only when the apparatus changed, the camera moves, an animation runs, the cart rolls or
// the stopwatch counts. There is no private requestAnimationFrame: the shell calls update() once per frame.
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import {
  SCREWS_PER_JOINT, SCREWS_TOTAL, railPose, type Apparatus, type TapeTarget,
} from '../../apparatus/index.ts'
import type { ViewContext } from '../view.ts'
import { strings } from '../strings/scene3d.ts'
import { createMaterials, createOutlineMaterial } from './materials.ts'
import {
  CART, ROD_Z, buildBase, buildTapeMeasure, buildCart, buildLevel, buildRackStand, buildRail, buildReceiver, buildStopwatch, buildTapeRoll,
  buildTwoLeg, type TapeMode, box, rbox, tapeFlag, TAPE_FLAG, screwHead, screwPile, tag, type Kit,
} from './models.ts'
import {
  LATERAL_MM, LEVEL_ON_TABLE, MARK_HALF_cm, overviewPoints, RAIL, STAGING, SUPPORT_FROM_END_cm, TABLE, TRAY, VIEW_ANGLES, tapeLength_m,
  tapeRailX_cm, cartGhostFront_mm, clampHeight_cm, ghostsFor, markLocalX_cm, markerLabels, railLocalToWorld, railLocalX_cm, railSpanPoints,
  toScene, twoLegHeight_cm, type GhostId, type Slot,
} from './units.ts'
import { boxCorners, fitView, type Vec } from '../../../../core/scene3d/framing.ts'
import { PRESET_NAMES, type PresetName } from './presets.ts'
import { createInteraction, type Interaction } from './interaction.ts'
import type { CardInfo } from '../../../../core/scene3d/types.ts'

export { PRESET_NAMES }
export type { PresetName }
export type Tool = 'select' | 'markers' | 'level' | 'tape'

interface PresetDef {
  target: [number, number, number]
  /** Azimuth (deg) around y: 0 = camera in front (+z); positive swings it toward +x (the low end). */
  azimuth: number
  elevation: number
  halfW: number
  halfH: number
}
/** Close-ups of the two stand ends (fitted to a half width and half height around a target). */
const END_PRESETS: Record<'highEnd' | 'lowEnd', PresetDef> = {
  highEnd: { target: [4, 14, 0], azimuth: -32, elevation: 20, halfW: 24, halfH: 18 },
  lowEnd: { target: [112, 5, 0], azimuth: 38, elevation: 22, halfW: 22, halfH: 12 },
}
const FOV = 35
const TRANSITION_MS = 450

export interface SceneOptions {
  initialPreset: PresetName
  onCard(card: CardInfo | null): void
  onFail(reason: string): void
  onStatus(text: string): void
  onTapeTarget?(t: TapeTarget): void
  openPanel?(panel: string): void
}

export interface Scene3D {
  update(): void
  setVisible(v: boolean): void
  setPreset(name: PresetName): void
  /** Mark framed by the 'mark' view, in cm from A. */
  setMarkTarget(markFromA_cm: number): void
  currentPreset(): PresetName | null
  setTool(t: Tool): void
  getTool(): Tool
  setTapeTarget(t: TapeTarget | null): void
  getTapeTarget(): TapeTarget | null
  focus(targets: string[] | null): void
  relabel(): void
  destroy(): void
}

const easeOut = (t: number): number => 1 - Math.pow(1 - t, 3)

interface Placed { obj: THREE.Object3D; from: { p: THREE.Vector3; ry: number; rz: number } | null; to: { p: THREE.Vector3; ry: number; rz: number }; t0: number; init: boolean }

export function createScene(container: HTMLElement, ctx: ViewContext, opts: SceneOptions): Scene3D {
  const a: Apparatus = ctx.apparatus
  const S = (): typeof strings.es => strings[ctx.lang()]
  const coarse = matchMedia('(pointer: coarse)').matches || innerWidth < 700

  // ---------- renderer ----------
  const renderer = new THREE.WebGLRenderer({ antialias: !coarse, alpha: false, powerPreference: 'high-performance' })
  renderer.setClearColor(0xdadce1, 1) // replaced by the --bg token below; never black at the corners
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.toneMapping = THREE.NeutralToneMapping
  renderer.toneMappingExposure = 1.0
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  const canvas = renderer.domElement
  canvas.tabIndex = 0
  canvas.setAttribute('role', 'application')
  canvas.setAttribute('aria-label', S().canvasLabel)
  container.append(canvas)

  const probe = document.createElement('span')
  probe.setAttribute('aria-hidden', 'true')
  probe.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;visibility:hidden'
  container.append(probe)
  const M = createMaterials(probe)
  const kit: Kit = { M, textures: [], anisotropy: renderer.capabilities.getMaxAnisotropy() }

  // ---------- scene, camera, lights ----------
  const scene = new THREE.Scene()
  scene.background = M.tokens.bg.clone()
  renderer.setClearColor(M.tokens.bg, 1)
  const pmrem = new THREE.PMREMGenerator(renderer)
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environment = envTex
  scene.environmentIntensity = 0.75
  const camera = new THREE.PerspectiveCamera(FOV, 1.6, 1, 900)
  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true
  controls.dampingFactor = 0.1
  controls.minDistance = 6
  controls.maxDistance = 330
  controls.maxPolarAngle = (88 * Math.PI) / 180
  controls.screenSpacePanning = false
  const hemi = new THREE.HemisphereLight(0xffffff, 0x8a8f99, 0.7)
  scene.add(hemi)
  const sun = new THREE.DirectionalLight(0xffffff, 1.8)
  sun.position.set(30, 130, 90)
  sun.target.position.set(60, 0, 0)
  sun.castShadow = true
  const sm = coarse ? 1024 : 2048
  sun.shadow.mapSize.set(sm, sm)
  Object.assign(sun.shadow.camera, { left: -110, right: 110, top: 60, bottom: -60, near: 20, far: 320 })
  sun.shadow.bias = -0.0004
  sun.shadow.normalBias = 0.06
  sun.shadow.radius = 3
  scene.add(sun, sun.target)

  // ---------- table (top face at y = 0) with a faint grid ----------
  const gridTex = (() => {
    const c = document.createElement('canvas')
    c.width = 2000; c.height = 900 // 10 px per cm
    const g = c.getContext('2d')!
    g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height)
    for (let x = 0; x <= 200; x++) { g.strokeStyle = `rgba(0,0,0,${x % 10 === 0 ? 0.13 : 0.045})`; g.lineWidth = x % 10 === 0 ? 2 : 1; g.beginPath(); g.moveTo(x * 10, 0); g.lineTo(x * 10, 900); g.stroke() }
    for (let y = 0; y <= 90; y++) { g.strokeStyle = `rgba(0,0,0,${y % 10 === 0 ? 0.13 : 0.045})`; g.lineWidth = y % 10 === 0 ? 2 : 1; g.beginPath(); g.moveTo(0, y * 10); g.lineTo(2000, y * 10); g.stroke() }
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = kit.anisotropy
    return t
  })()
  M.table.map = gridTex
  M.table.needsUpdate = true
  const table = new THREE.Mesh(new THREE.BoxGeometry(TABLE.width, TABLE.thickness, TABLE.depth), M.table)
  table.position.set(TABLE.x, -TABLE.thickness / 2, TABLE.z)
  table.receiveShadow = true
  tag(table, 'table')
  scene.add(table)
  // one parts tray near the low end holds the small props (stopwatch, tape measure, masking tape roll, level, screws)
  const tray = rbox(TRAY.width, TRAY.height, TRAY.depth, 0.2, M.tray, TRAY.x, TRAY.height / 2 - 0.02, TRAY.z)
  tray.castShadow = false
  scene.add(tray)

  // ---------- render state ----------
  let needsRender = true
  let visible = true
  const requestRender = (): void => { needsRender = true }

  // ---------- camera presets ----------
  let tapeTarget: TapeTarget | null = null
  let tapeMode: TapeMode = 'rest'
  let tapeFocusKey = ''
  let tapeReadingLocal: [number, number, number] = [0, 0, 0]
  let markFromA_cm = 0
  const railGeoNow = (): { zeroHigh: boolean; high: [number, number, number]; tilt: number } => {
    const pose = a.railPoseNow()
    return { zeroHigh: a.geometry()?.scaleZeroAtHighEnd ?? true, high: toScene(pose.highEnd), tilt: -pose.railAngle_rad }
  }
  const markX = (): number => markLocalX_cm(a.evaluateMarks().aRailPos_mm, markFromA_cm, railGeoNow().zeroHigh)
  const worldPts = (local: Vec[]): Vec[] => { const g = railGeoNow(); return local.map((p) => railLocalToWorld(g.high, g.tilt, p)) }
  const poseFor = (name: PresetName): { target: THREE.Vector3; pos: THREE.Vector3 } => {
    const aspect = camera.aspect
    const fromFit = (pts: readonly Vec[], az: number, el: number, margin = 0.08): { target: THREE.Vector3; pos: THREE.Vector3 } => {
      const f = fitView(pts, az, el, FOV, aspect, margin)
      return { target: new THREE.Vector3(...f.target), pos: new THREE.Vector3(...f.position) }
    }
    if (name === 'overview') return fromFit(overviewPoints(), VIEW_ANGLES.overview.azimuth, VIEW_ANGLES.overview.elevation)
    if (name === 'lateral') {
      const zh = railGeoNow().zeroHigh
      const x0 = railLocalX_cm(LATERAL_MM.from, zh), x1 = railLocalX_cm(LATERAL_MM.to, zh)
      return fromFit(worldPts(railSpanPoints(Math.min(x0, x1), Math.max(x0, x1))), VIEW_ANGLES.lateral.azimuth, VIEW_ANGLES.lateral.elevation, 0.03)
    }
    if (name === 'mark') {
      const x = markX()
      return fromFit(worldPts(railSpanPoints(x - MARK_HALF_cm, x + MARK_HALF_cm)), VIEW_ANGLES.mark.azimuth, VIEW_ANGLES.mark.elevation, 0.04)
    }
    if (name === 'tape') {
      if (tapeMode === 'rest') {
        // the tape measure lying on the tray
        tapeMeasure.root.updateWorldMatrix(true, true)
        const bb = new THREE.Box3().setFromObject(tapeMeasure.root)
        return fromFit(boxCorners([bb.min.x - 2, bb.min.y, bb.min.z - 2], [bb.max.x + 2, bb.max.y, bb.max.z + 2]), 25, 35, 0.15)
      }
      // close-up of the reading point: where the blade meets the rail top edge (heights), the far end of the blade (d) or the cart rear
      tapeMeasure.root.updateWorldMatrix(true, true)
      const at = tapeMeasure.root.localToWorld(new THREE.Vector3(...tapeReadingLocal))
      const pts = tapeMode === 'down'
        ? boxCorners([at.x - 4.5, at.y - 6, at.z - 3], [at.x + 4.5, at.y + 2, at.z + 3])
        : boxCorners([at.x - 5.5, at.y - 1.5, at.z - 3], [at.x + 5.5, at.y + 6, at.z + 3])
      return fromFit(pts, tapeMode === 'down' ? 8 : 0, tapeMode === 'down' ? 8 : tapeMode === 'left' ? 45 : 14, 0.04)
    }
    const p = END_PRESETS[name]
    const tan = Math.tan((FOV * Math.PI) / 360)
    const el = (p.elevation * Math.PI) / 180, az = (p.azimuth * Math.PI) / 180
    const dist = 1.08 * Math.max(p.halfW / (tan * aspect), p.halfH / tan)
    const target = new THREE.Vector3(...p.target)
    const pos = target.clone().add(new THREE.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)).multiplyScalar(dist))
    return { target, pos }
  }
  let preset: PresetName | null = null
  let followKey = ''
  let anim: { t0: number; fromT: THREE.Vector3; toT: THREE.Vector3; fromP: THREE.Vector3; toP: THREE.Vector3 } | null = null
  const applyPose = (pose: { target: THREE.Vector3; pos: THREE.Vector3 }): void => {
    controls.target.copy(pose.target)
    camera.position.copy(pose.pos)
    camera.lookAt(pose.target)
    controls.update()
    requestRender()
  }
  const setPreset = (name: PresetName): void => {
    preset = name
    const pose = poseFor(name)
    if (ctx.reducedMotion()) { anim = null; applyPose(pose); return }
    anim = { t0: performance.now(), fromT: controls.target.clone(), toT: pose.target, fromP: camera.position.clone(), toP: pose.pos }
    requestRender()
  }
  const userTookOver = (): void => { anim = null; preset = null }
  controls.addEventListener('start', userTookOver)
  controls.addEventListener('change', requestRender)

  // ---------- models ----------
  const rail = buildRail(kit)
  scene.add(rail.root)
  const cart = buildCart(kit)
  cart.root.userData.dragHandle = 'cart'
  scene.add(cart.root)
  const base = buildBase(kit)
  const rack = buildRackStand(kit)
  const twoLeg = buildTwoLeg(kit)
  const receiver = buildReceiver(kit)
  const level = buildLevel(kit)
  const stopwatch = buildStopwatch(kit)
  const tapeMeasure = buildTapeMeasure(kit)
  const tapeRoll = buildTapeRoll(kit)
  scene.add(base, rack.root, twoLeg.root, receiver, level.root, stopwatch.root, tapeRoll, tapeMeasure.root)
  const pile = new THREE.Group()
  scene.add(pile)
  tag(pile, 'screws')
  let pileCount = -1
  // screw heads of fixed joints
  const clampScrews = new THREE.Group(), twoLegScrews = new THREE.Group(), receiverScrews = new THREE.Group()
  for (const dx of [-1.6, 1.6]) { const s = screwHead(kit); s.position.set(SUPPORT_FROM_END_cm + dx, -1.3, RAIL.halfW + 0.4); clampScrews.add(s) }
  for (const dx of [-0.55, 0.55]) { const s = screwHead(kit); s.position.set(RAIL.length - SUPPORT_FROM_END_cm + dx, -1.0, RAIL.halfW); twoLegScrews.add(s) }
  for (const x of [-2.8, -0.6]) { const s = screwHead(kit); s.position.set(x, 0.2, 2.2); receiverScrews.add(s) }
  rail.root.add(clampScrews, twoLegScrews)
  receiver.add(receiverScrews)
  for (const g of [clampScrews, twoLegScrews, receiverScrews]) tag(g, 'screws')

  // ---------- ghosts (translucent targets of the next attachments) ----------
  const ghostify = (g: THREE.Object3D, id: GhostId): void => {
    g.userData.ghostId = id
    g.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh) { m.material = M.ghost; m.castShadow = false; m.receiveShadow = false }
      delete o.userData.dragHandle
    })
    g.visible = false
    scene.add(g)
  }
  const gStandRack = buildRackStand(kit), gStandBase = buildBase(kit)
  const gStand = new THREE.Group(); gStand.add(gStandRack.root, gStandBase)
  const gClamp = new THREE.Group(); box(RAIL.length, RAIL.height, RAIL.halfW * 2, M.ghost, RAIL.length / 2, -RAIL.height / 2, 0, gClamp)
  const gTwoLeg = buildTwoLeg(kit)
  const gReceiver = buildReceiver(kit)
  const gCartM = buildCart(kit)
  ghostify(gStand, 'stand'); ghostify(gClamp, 'clamp'); ghostify(gTwoLeg.root, 'twoLeg'); ghostify(gReceiver, 'receiver')
  ghostify(gCartM.root, 'cart')
  scene.remove(gCartM.root)
  rail.root.add(gCartM.root) // the cart ghost lives in the rail frame
  gCartM.root.visible = false
  // the cart ghost shares one wheel texture-less ghost material; its sub-meshes are pickable through ghostId

  // ---------- placement with short snap animations ----------
  const placed = new Map<THREE.Object3D, Placed>()
  const SNAP_MS = 380
  const place = (obj: THREE.Object3D, p: [number, number, number], ry = 0, rz = 0): void => {
    const to = { p: new THREE.Vector3(...p), ry, rz }
    let st = placed.get(obj)
    if (!st) { st = { obj, from: null, to, t0: 0, init: false }; placed.set(obj, st) }
    const far = st.init && (st.to.p.distanceTo(to.p) > 1.5 || Math.abs(st.to.rz - to.rz) > 0.2 || Math.abs(st.to.ry - to.ry) > 0.2)
    if (!st.init || ctx.reducedMotion() || !far) {
      st.init = true; st.from = null; st.to = to
      obj.position.copy(to.p); obj.rotation.y = ry; obj.rotation.z = rz
      return
    }
    st.from = { p: obj.position.clone(), ry: obj.rotation.y, rz: obj.rotation.z }
    st.to = to; st.t0 = performance.now()
  }
  const tickPlaced = (now: number): boolean => {
    let busy = false
    for (const st of placed.values()) {
      if (!st.from) continue
      const k = Math.min(1, (now - st.t0) / SNAP_MS), e = easeOut(k)
      st.obj.position.lerpVectors(st.from.p, st.to.p, e)
      st.obj.rotation.y = st.from.ry + (st.to.ry - st.from.ry) * e
      st.obj.rotation.z = st.from.rz + (st.to.rz - st.from.rz) * e
      if (k >= 1) st.from = null; else busy = true
    }
    return busy
  }
  const slotPos = (s: Slot, y = 0): [number, number, number] => [s.x, y, s.z]

  // ---------- state -> scene ----------
  const labelCache = new Map<string, THREE.Material>()
  const markerPreview = new Map<string, number>()
  const cartPreview: { active: boolean; front_mm: number | null; world: THREE.Vector3 | null; invalid: boolean } = { active: false, front_mm: null, world: null, invalid: false }
  let levelX = 60
  let outlineRoots: THREE.Object3D[] = []
  let focusIds: string[] | null = null
  let dirty = true

  const syncTapes = (zeroHigh: boolean): void => {
    for (const c of [...rail.tapes.children]) rail.tapes.remove(c)
    const markers = a.getMarkers()
    const labels = markerLabels(markers, a.evaluateMarks())
    for (const m of markers) {
      const pos = markerPreview.get(m.id) ?? m.railPos_mm
      const x = railLocalX_cm(pos, zeroHigh)
      const g = new THREE.Group()
      const tape = box(0.9, 0.1, RAIL.halfW * 2 + 0.1, M.tape, 0, 0.05, 0, g)
      tape.castShadow = false
      tag(tape, 'tape', { markId: m.id, dragHandle: 'marker' })
      // the label is a yellow tape flag on the front face of the rail, at rail height (no floating tag)
      const lab = tapeFlag(kit, labels.get(m.id) ?? '', labelCache)
      lab.position.set(0, -1.0, RAIL.halfW + 0.04)
      tag(lab, 'tape', { markId: m.id, dragHandle: 'marker' })
      void TAPE_FLAG
      g.add(lab)
      g.position.x = x
      rail.tapes.add(g)
    }
  }

  const apply = (): void => {
    const st = a.getState()
    const geo = st.geometry
    const it = st.items
    const pose = a.railPoseNow()
    const tilt = -pose.railAngle_rad
    const zeroHigh = geo?.scaleZeroAtHighEnd ?? true
    const mounted = geo !== null

    // rail
    rail.root.visible = it.rail
    place(rail.root, toScene(pose.highEnd), 0, tilt)
    rail.update(zeroHigh)
    syncTapes(zeroHigh)
    clampScrews.visible = st.joints.rackClamp !== null
    twoLegScrews.visible = st.joints.twoLegStand
    receiverScrews.visible = st.joints.receiver

    // rack stand and base
    base.visible = it.standBase
    rack.root.visible = it.rackStand
    const standOn = st.joints.standBase
    place(base, standOn ? [0, 0, 0] : slotPos(STAGING.standBase).map((v, i) => v - (i === 0 ? 1.5 : i === 2 ? -1 : 0)) as [number, number, number], 0, 0)
    const h = clampHeight_cm(st.rack_mm)
    if (standOn) { place(rack.root, [0, 0, 0], 0, 0); rack.update(h, st.joints.rackClamp !== null ? tilt : 0) }
    else { place(rack.root, [STAGING.rackStand.x, 0.65, STAGING.rackStand.z - ROD_Z], 0, -Math.PI / 2); rack.update(h, 0) }

    // two-leg stand
    twoLeg.root.visible = it.twoLegStand
    if (mounted && st.joints.twoLegStand) { place(twoLeg.root, [pose.twoLeg.x_m * 100, 0, 0], 0, 0); twoLeg.update(pose.twoLeg.y_m * 100, tilt) }
    else { place(twoLeg.root, slotPos(STAGING.twoLegStand), 0, 0); twoLeg.update(twoLegHeight_cm(st.foot_mm), 0) }

    // receiver
    receiver.visible = it.receiver
    if (mounted && st.joints.receiver) place(receiver, toScene(pose.lowEnd), 0, tilt)
    else place(receiver, slotPos(STAGING.receiver, 2.7), 0, 0)

    // level
    level.root.visible = it.level
    const lr = a.levelReading()
    level.setBubble(lr.bubble_mm)
    if (it.level) {
      if (st.level.placement === 'rail' && it.rail) {
        if (level.root.parent !== rail.root) { level.root.removeFromParent(); rail.root.add(level.root); level.root.position.set(levelX, 0, 0); level.root.rotation.set(0, 0, 0) }
        level.root.position.set(levelX, 0, 0)
      } else {
        if (level.root.parent !== scene) { level.root.removeFromParent(); scene.add(level.root) }
        const slot = st.level.placement === 'table' ? LEVEL_ON_TABLE : STAGING.level
        place(level.root, slotPos(slot, st.level.placement === 'table' ? 0 : TRAY.height), slot.rotY, 0)
      }
    }

    // stopwatch, tape roll, screws
    stopwatch.root.visible = it.stopwatch
    place(stopwatch.root, slotPos(STAGING.stopwatch, TRAY.height), STAGING.stopwatch.rotY, 0)
    stopwatch.setText(st.stopwatch.running ? stopwatchText() : '00.00')
    tapeRoll.visible = it.markers
    place(tapeRoll, slotPos(STAGING.markers, TRAY.height), 0, 0)
    const free = it.screws ? SCREWS_TOTAL - st.screwsUsed : 0
    if (free !== pileCount) {
      pileCount = free
      for (const c of [...pile.children]) { pile.remove(c); c.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.geometry.dispose() }) }
      if (free > 0) pile.add(screwPile(kit, free))
    }
    pile.visible = free > 0
    place(pile, slotPos(STAGING.screws, TRAY.height), 0, 0)
    void SCREWS_PER_JOINT

    // tape measure: against the chosen target when it can be drawn, else resting on the tray
    tapeMeasure.root.visible = it.tape
    if (it.tape) {
      const L = tapeTarget ? tapeLength_m(tapeTarget, geo) : null
      const drawable = tapeTarget !== null && L !== null && (tapeTarget.kind === 'cartLength' ? it.cart : it.rail)
      if (drawable && tapeTarget && L !== null) {
        const L_cm = L * 100
        if (tapeTarget.kind === 'railHeight') {
          // hook on the table under the measured point, blade up to the rail top edge: the reading point
          tapeMode = 'down'; tapeMeasure.set('down', L_cm)
          if (tapeMeasure.root.parent !== scene) { tapeMeasure.root.removeFromParent(); scene.add(tapeMeasure.root) }
          const top = railLocalToWorld(toScene(pose.highEnd), tilt, [tapeRailX_cm(tapeTarget, geo), 0, RAIL.halfW + 0.2])
          tapeMeasure.root.position.set(top[0], top[1], top[2])
          tapeMeasure.root.rotation.set(0, 0, 0)
          tapeReadingLocal = [0, 0, 0]
        } else if (tapeTarget.kind === 'supportSeparation') {
          // blade laid along the front face of the rail from the clamp support to the two-leg support
          tapeMode = 'right'; tapeMeasure.set('right', L_cm)
          if (tapeMeasure.root.parent !== rail.root) { tapeMeasure.root.removeFromParent(); rail.root.add(tapeMeasure.root) }
          tapeMeasure.root.position.set(SUPPORT_FROM_END_cm, -RAIL.height / 2, RAIL.halfW + 0.2)
          tapeMeasure.root.rotation.set(0, 0, 0)
          tapeReadingLocal = [L_cm, 0, 0]
        } else {
          // blade laid along the cart top from the front face to the rear
          tapeMode = 'left'; tapeMeasure.set('left', L_cm)
          if (tapeMeasure.root.parent !== cart.root) { tapeMeasure.root.removeFromParent(); cart.root.add(tapeMeasure.root) }
          tapeMeasure.root.position.set(0, CART.bodyBottom + CART.bodyHeight + 0.1, 0)
          tapeMeasure.root.rotation.set(-Math.PI / 2, 0, 0)
          tapeReadingLocal = [-L_cm, 0, 0]
        }
        placed.delete(tapeMeasure.root)
      } else {
        tapeMode = 'rest'; tapeMeasure.set('rest', 6)
        if (tapeMeasure.root.parent !== scene) { tapeMeasure.root.removeFromParent(); scene.add(tapeMeasure.root) }
        placed.delete(tapeMeasure.root)
        tapeMeasure.root.rotation.set(0, 0, 0)
        tapeMeasure.root.position.set(STAGING.tape.x, TRAY.height, STAGING.tape.z)
        tapeReadingLocal = [0, 1.6, 4]
      }
    }

    // ghosts
    const gids = new Set(ghostsFor(st))
    gStand.visible = gids.has('stand')
    gStandRack.update(h, 0)
    gStand.position.set(0, 0, 0)
    gClamp.visible = gids.has('clamp')
    if (gClamp.visible) { const p0 = railPose(h / 100, h / 100); gClamp.position.set(...toScene(p0.highEnd)) }
    gTwoLeg.root.visible = gids.has('twoLeg')
    if (gTwoLeg.root.visible && mounted) { gTwoLeg.root.position.set(pose.twoLeg.x_m * 100, 0, 0); gTwoLeg.update(pose.twoLeg.y_m * 100, tilt) }
    gReceiver.visible = gids.has('receiver')
    if (gReceiver.visible && mounted) { gReceiver.position.set(...toScene(pose.lowEnd)); gReceiver.rotation.z = tilt }
    gCartM.root.visible = gids.has('cart')
    if (gids.has('cart') && geo) gCartM.root.position.set(railLocalX_cm(cartGhostFront_mm(a.evaluateMarks().aRailPos_mm, zeroHigh), zeroHigh), 0, 0)

    // highlight the staging copy of every attachable item (and any focus request)
    setOutlines(highlightRoots(gids))
    requestRender()
  }

  const stopwatchText = (): string => {
    const s = a.stopwatchDisplay_s(ctx.now())
    return s < 100 ? s.toFixed(2).padStart(5, '0') : s.toFixed(1)
  }

  // ---------- cart motion ----------
  let lastCartKey = ''
  let wasPreview = false
  const syncCart = (): boolean => {
    const st = a.getState()
    const geo = st.geometry
    cart.root.visible = st.items.cart
    if (!st.items.cart) return false
    const now = ctx.now()
    const poseNow = a.cartPose(now)
    const cs = a.cartState(now)
    let rolling = cs.phase === 'rolling'
    if (cartPreview.active) {
      rolling = false
      wasPreview = true
      if (cartPreview.world) { cart.root.position.copy(cartPreview.world); cart.root.rotation.set(0, 0, 0) }
      else if (cartPreview.front_mm !== null && geo) {
        const zh = geo.scaleZeroAtHighEnd!
        const x = railLocalX_cm(cartPreview.front_mm, zh)
        const p = rail.root.localToWorld(new THREE.Vector3(x, 0, 0))
        cart.root.position.copy(p); cart.root.rotation.set(0, 0, -geo.pose.railAngle_rad)
        cart.roll(x)
      }
      cart.setInvalid(cartPreview.invalid)
      requestRender()
      return false
    }
    cart.setInvalid(false)
    if (wasPreview) { wasPreview = false; lastCartKey = '' }
    if (poseNow && geo) {
      const key = `${poseNow.front.x_m.toFixed(5)}|${poseNow.front.y_m.toFixed(5)}|${geo.pose.railAngle_rad.toFixed(5)}`
      if (rolling || key !== lastCartKey || cart.root.parent !== scene) {
        lastCartKey = key
        const D = (cs.frontDownSlope_m ?? 0) * 100
        // snap animation only when the cart is not rolling (placing it on the rail)
        if (rolling) { cart.root.position.set(...toScene(poseNow.front)); cart.root.rotation.set(0, 0, -geo.pose.railAngle_rad); placed.delete(cart.root) }
        else place(cart.root, toScene(poseNow.front), 0, -geo.pose.railAngle_rad)
        cart.roll(D)
        requestRender()
      }
    } else {
      const slot = STAGING.cart
      if (lastCartKey !== 'staged') { lastCartKey = 'staged'; place(cart.root, [slot.x + CART.length / 2, 0.3, slot.z], slot.rotY, 0); cart.roll(0); requestRender() }
    }
    return rolling
  }

  // ---------- outlines (inverted-hull rims) for hover and highlight ----------
  const outlineMat = createOutlineMaterial(0.85, 0.22)
  const hoverMat = createOutlineMaterial(0.7, 0.16)
  const refreshOutlineColor = (): void => { outlineMat.color.copy(M.tokens.accent); hoverMat.color.copy(M.tokens.accent) }
  refreshOutlineColor()
  const makeOverlays = (root: THREE.Object3D, mat: THREE.Material): THREE.Mesh[] => {
    const out: THREE.Mesh[] = []
    root.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh || m.userData.overlay || m.material === M.ghost || m.material === M.glass) return
      const ov = new THREE.Mesh(m.geometry, mat)
      ov.userData.overlay = true
      ov.raycast = () => {}
      ov.renderOrder = 3
      m.add(ov)
      out.push(ov)
    })
    return out
  }
  const dropOverlays = (list: THREE.Mesh[]): void => { for (const o of list) o.parent?.remove(o); list.length = 0 }
  let focusOv: THREE.Mesh[] = []
  const setOutlines = (roots: THREE.Object3D[]): void => {
    if (roots.length === outlineRoots.length && roots.every((r, i) => r === outlineRoots[i])) return
    dropOverlays(focusOv)
    outlineRoots = roots
    for (const r of roots) focusOv.push(...makeOverlays(r, outlineMat))
  }
  /** Parts the shell asked to highlight, plus the staging copies of everything that can be attached now. */
  const partRoot = (id: string): THREE.Object3D | null => {
    switch (id) {
      case 'rail': return rail.root
      case 'cart': return cart.root
      case 'rackStand': case 'rackKnob': return rack.root
      case 'standBase': return base
      case 'twoLegStand': case 'foot': return twoLeg.root
      case 'receiver': return receiver
      case 'level': return level.root
      case 'stopwatch': return stopwatch.root
      case 'tapeMeasure': return tapeMeasure.root
      case 'markers': return tapeRoll
      case 'screws': return pile
      default: return null
    }
  }
  const highlightRoots = (gids: Set<GhostId>): THREE.Object3D[] => {
    const ids = new Set<string>(focusIds ?? [])
    const st = a.getState()
    if (gids.has('stand')) { ids.add('rackStand'); ids.add('standBase') }
    if (gids.has('clamp')) ids.add('rail')
    if (gids.has('twoLeg')) ids.add('twoLegStand')
    if (gids.has('receiver')) ids.add('receiver')
    if (gids.has('cart')) ids.add('cart')
    const out: THREE.Object3D[] = []
    for (const id of ids) {
      const r = partRoot(id)
      // attached parts do not need the "attach me" outline; explicit focus requests do
      const explicit = focusIds?.includes(id) ?? false
      const staged = id === 'rackStand' ? !st.joints.standBase : id === 'standBase' ? !st.joints.standBase : id === 'rail' ? st.joints.rackClamp === null
        : id === 'twoLegStand' ? !st.joints.twoLegStand : id === 'receiver' ? !st.joints.receiver : id === 'cart' ? !st.cart.placed : true
      if (r && r.visible && (explicit || staged) && !out.includes(r)) out.push(r)
    }
    return out
  }

  // ---------- size ----------
  const resize = (): void => {
    const w = Math.max(1, container.clientWidth), h = Math.max(1, container.clientHeight)
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    if (preset && !anim) applyPose(poseFor(preset))
    requestRender()
  }
  const ro = new ResizeObserver(resize)
  ro.observe(container)

  // ---------- interaction ----------
  const pickables = (): THREE.Object3D[] => [
    table, rail.root, cart.root, base, rack.root, twoLeg.root, receiver, level.root, stopwatch.root, tapeMeasure.root, tapeRoll, pile,
    gStand, gClamp, gTwoLeg.root, gReceiver, gCartM.root,
  ]
  const interaction: Interaction = createInteraction({
    a, ctx, container, canvas, camera, controls, pickables, requestRender, S,
    rail: { root: rail.root, localX: (v) => rail.root.worldToLocal(v.clone()) },
    cart: { root: cart.root, preview: cartPreview },
    rackKnob: rack.knob,
    markerPreview, setLevelX: (x) => { levelX = Math.min(RAIL.length - 8, Math.max(8, x)) },
    getTool: () => tool,
    setTapeTarget: (t) => setTapeTarget(t),
    onCard: opts.onCard,
    onStatus: opts.onStatus,
    outline: { hover: hoverMat },
    changed: () => { dirty = true; ctx.changed() },
    refreshSoon: () => { dirty = true },
    onUserCamera: userTookOver,
    openPanel: opts.openPanel,
  })

  // ---------- tools and tape target ----------
  let tool: Tool = 'select'
  const setTapeTarget = (t: TapeTarget | null): void => {
    tapeTarget = t
    dirty = true
    if (t && opts.onTapeTarget) opts.onTapeTarget(t)
  }
  const unsub = a.on((e) => {
    dirty = true
    if (e.type === 'measuredHeight') { tapeTarget = e.target }
    if (e.type === 'presetApplied' || e.type === 'loaded') { markerPreview.clear() }
  })

  // ---------- theme, visibility, context loss ----------
  const onTheme = (): void => {
    M.refresh(); refreshOutlineColor()
    ;(scene.background as THREE.Color).copy(M.tokens.bg)
    requestRender()
  }
  const mo = new MutationObserver(onTheme)
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  const scheme = matchMedia('(prefers-color-scheme: dark)')
  scheme.addEventListener('change', onTheme)
  const onVis = (): void => { if (!document.hidden) requestRender() }
  document.addEventListener('visibilitychange', onVis)
  const onLost = (e: Event): void => { e.preventDefault(); opts.onFail('context lost') }
  canvas.addEventListener('webglcontextlost', onLost)

  resize()
  apply()
  syncCart()
  setPreset(opts.initialPreset)
  anim = null
  applyPose(poseFor(opts.initialPreset))
  onTheme()

  // debug hook (?debug3d=1): client coordinates of handles, for scripted pointer tests in the dev harness
  if (new URLSearchParams(location.search).get('debug3d') === '1') {
    const toClient = (v: THREE.Vector3): { x: number; y: number } => {
      camera.updateMatrixWorld()
      const p = v.clone().project(camera)
      const r = canvas.getBoundingClientRect()
      return { x: r.left + ((p.x + 1) / 2) * r.width, y: r.top + ((1 - p.y) / 2) * r.height }
    }
    ;(window as unknown as { __scene3d?: unknown }).__scene3d = {
      screen(name: string): { x: number; y: number } | null {
        const [k, arg] = name.split('@')
        if (k === 'rackKnob') return toClient(rack.knob.getWorldPosition(new THREE.Vector3()))
        if (k === 'foot') return toClient(twoLeg.foot.getWorldPosition(new THREE.Vector3()))
        if (k === 'cart') return toClient(cart.root.localToWorld(new THREE.Vector3(-3, 3, 0)))
        if (k === 'ghost') { const o = [gStand, gClamp, gTwoLeg.root, gReceiver, gCartM.root].find((g) => g.userData.ghostId === arg); const b = o ? new THREE.Box3().setFromObject(o) : null; return b ? toClient(b.getCenter(new THREE.Vector3())) : null }
        if (k === 'rail') { const zh = a.geometry()?.scaleZeroAtHighEnd ?? true; return toClient(rail.root.localToWorld(new THREE.Vector3(railLocalX_cm(Number(arg), zh), 0, 0))) }
        if (k === 'tape') { const g = rail.tapes.children[Number(arg)]; return g ? toClient(g.getWorldPosition(new THREE.Vector3())) : null }
        if (k === 'table') return toClient(new THREE.Vector3(Number(arg), 0, -14))
        return null
      },
    }
  }

  let lastRolling = false
  return {
    update() {
      if (document.hidden || !visible) return
      const now = performance.now()
      if (dirty) {
        dirty = false; apply()
        if (preset === 'tape') {
          const key = `${tapeMode}|${JSON.stringify(tapeTarget)}`
          if (key !== tapeFocusKey) { tapeFocusKey = key; setPreset('tape') }
        } else if (preset === 'mark' || preset === 'lateral') {
          // the framing follows the rail (rack height, which end is up) and the marks
          const pz = poseFor(preset)
          const key = `${pz.target.x.toFixed(1)}|${pz.target.y.toFixed(1)}|${pz.pos.x.toFixed(1)}|${pz.pos.y.toFixed(1)}|${pz.pos.z.toFixed(1)}`
          if (key !== followKey) { followKey = key; setPreset(preset) }
        }
      }
      const rolling = syncCart()
      if (rolling || lastRolling) requestRender()
      lastRolling = rolling
      if (a.getState().stopwatch.running && a.hasItem('stopwatch')) { stopwatch.setText(stopwatchText()); requestRender() }
      if (anim) {
        const k = Math.min(1, (now - anim.t0) / TRANSITION_MS)
        const e = easeOut(k)
        controls.target.lerpVectors(anim.fromT, anim.toT, e)
        camera.position.lerpVectors(anim.fromP, anim.toP, e)
        camera.lookAt(controls.target)
        if (k >= 1) anim = null
        needsRender = true
      }
      if (tickPlaced(now)) needsRender = true
      if (interaction.tick()) needsRender = true
      if (controls.update()) needsRender = true
      if (needsRender) {
        needsRender = false
        renderer.render(scene, camera)
      }
    },
    setVisible(v) { visible = v; if (v) { resize(); dirty = true; requestRender() } },
    setPreset: (n) => {
      if (n === 'tape') tapeFocusKey = `${tapeMode}|${JSON.stringify(tapeTarget)}`
      followKey = ''
      setPreset(n)
    },
    setMarkTarget(m) {
      if (!Number.isFinite(m)) return
      markFromA_cm = m
      if (preset === 'mark') setPreset('mark')
    },
    currentPreset: () => preset,
    setTool(t) { tool = t; interaction.setTool(t) },
    getTool: () => tool,
    setTapeTarget,
    getTapeTarget: () => tapeTarget,
    focus(list) { focusIds = list && list.length ? list : null; dirty = true },
    relabel() {
      canvas.setAttribute('aria-label', S().canvasLabel)
      interaction.relabel()
      requestRender()
    },
    destroy() {
      unsub()
      interaction.destroy()
      controls.dispose()
      ro.disconnect(); mo.disconnect()
      scheme.removeEventListener('change', onTheme)
      document.removeEventListener('visibilitychange', onVis)
      canvas.removeEventListener('webglcontextlost', onLost)
      const seen = new Set<THREE.Material>()
      scene.traverse((o) => {
        const m = o as THREE.Mesh
        if (m.geometry) m.geometry.dispose()
        const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : []
        for (const x of mats) if (!seen.has(x)) { seen.add(x); x.dispose() }
      })
      for (const m of labelCache.values()) m.dispose()
      for (const t of kit.textures) t.dispose()
      gridTex.dispose(); outlineMat.dispose(); hoverMat.dispose()
      M.dispose()
      envTex.dispose(); pmrem.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      delete (window as unknown as { __scene3d?: unknown }).__scene3d
      canvas.remove(); probe.remove()
    },
  }
}
