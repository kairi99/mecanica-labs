// The three.js scene of the projectile bench. This module (and three itself) is a lazy chunk: only index.ts imports it, via dynamic
// import(). Rendering is on demand: a frame is drawn only when the apparatus changed, the camera moves, a ball moves or the
// stopwatch counts (a state signature decides). There is no private requestAnimationFrame: the shell calls update() once per frame.
// The view only draws the state: the ball positions come from ParabolicApparatus.ballStatus(now) and the stored flight samples.
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { LEG_BASE_HEIGHT_m, SCREWS_TOTAL, SHOE_KINK_rad, SHOE_LENGTH_m, paperStack, paperSurfaceAt_m, sheetToFloor, type BallId, type ParabolicApparatus, type TapeTarget } from '../../apparatus/index.ts'
import type { CardInfo } from '../../../../core/scene3d/types.ts'
import { boxCorners, fitView, type Vec } from '../../../../core/scene3d/framing.ts'
import {
  buildBase, buildLevel, buildRackStand, buildRail, buildStopwatch, buildTapeMeasure, buildTwoLeg, screwHead, screwPile, type TapeMode,
} from '../../../../core/scene3d/models.ts'
import type { Tool } from '../stage.ts'
import type { ViewContext } from '../view.ts'
import { strings } from '../strings/scene3d.ts'
import { createDragDrop3D } from './dragdrop3d.ts'
import type { StageAdapter } from '../dragdrop/controller.ts'
import { createInteraction, type Interaction, type Preview } from './interaction.ts'
import { createMaterials, createOutlineMaterial } from './materials.ts'
import { SHEET_THICK_cm, buildShoe, buildBall, buildMarkDot, buildPlumb, buildSheet, buildTable, railFlag, tag, type BallModel, type PKit, box } from './models.ts'
import { PRESET_NAMES, type PresetName } from './presets.ts'
import {
  CM, FOV_DEFAULT_deg, RAIL, STAGED_BOXES, STAGING, levelRailRange_cm, levelTableSpot, mountedBoxes, TABLE, VIEW_ANGLES, fovFor, defaultFrameInput, edgePoints, floorPoints, landMaxFor, markDiameter_cm, markLabel, overviewPoints,
  planTape, railFrame, railLocalToWorld, railLocalX_cm, releasePoints, rollAngle_rad, sheetRectCm, tapeAngles, tapePoints, toScene, ballToScene,
  type FrameInput, type RailFrame, type TapePlan, type V3,
} from './units.ts'

export { PRESET_NAMES }
export type { PresetName, Tool }

const FOV = FOV_DEFAULT_deg
const TRANSITION_MS = 450
const ROD_Z = -3.4

export interface SceneOptions {
  initialPreset: PresetName
  onCard(card: CardInfo | null): void
  onFail(reason: string): void
  onStatus(text: string): void
  onTapeTarget?(t: TapeTarget): void
  openPanel?(panel: string): void
  dd?: { busy(): boolean }
}

export interface Scene3D {
  /** Stage side of the drag-and-drop assembly (zones, preview, picking). */
  dragdrop: StageAdapter
  update(): void
  setVisible(v: boolean): void
  setPreset(name: PresetName): void
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
const BALL_ITEM: Record<BallId, 'marble' | 'pingPong'> = { marble: 'marble', pingpong: 'pingPong' }
/** Trail: about this many dots for a whole flight; fades over this long after the next release, ms. */
const TRAIL_DOTS = 90, TRAIL_FADE_MS = 700

export function createScene(container: HTMLElement, ctx: ViewContext, opts: SceneOptions): Scene3D {
  const a: ParabolicApparatus = ctx.apparatus
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
  const kit: PKit = { M, textures: [], anisotropy: renderer.capabilities.getMaxAnisotropy() }

  // ---------- scene, camera, lights ----------
  const scene = new THREE.Scene()
  scene.background = M.tokens.bg.clone()
  renderer.setClearColor(M.tokens.bg, 1)
  scene.fog = new THREE.Fog(M.tokens.bg.clone(), 600, 1400) // the far floor fades into the background colour
  const pmrem = new THREE.PMREMGenerator(renderer)
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environment = envTex
  scene.environmentIntensity = 0.75
  const camera = new THREE.PerspectiveCamera(FOV, 1.6, 1, 1800)
  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = !ctx.reducedMotion()
  controls.dampingFactor = 0.1
  controls.minDistance = 8
  controls.maxDistance = 900
  controls.maxPolarAngle = (89 * Math.PI) / 180
  controls.screenSpacePanning = false
  const hemi = new THREE.HemisphereLight(0xffffff, 0x8a8f99, 0.75)
  scene.add(hemi)
  const sun = new THREE.DirectionalLight(0xffffff, 1.7)
  sun.position.set(-40, 220, 150)
  sun.target.position.set(40, -40, 0)
  sun.castShadow = true
  const sm = coarse ? 2048 : 4096
  sun.shadow.mapSize.set(sm, sm)
  Object.assign(sun.shadow.camera, { left: -230, right: 190, top: 120, bottom: -130, near: 20, far: 520 })
  sun.shadow.bias = -0.0003
  sun.shadow.normalBias = 0.05
  sun.shadow.radius = 2.5
  scene.add(sun, sun.target)

  // ---------- render state ----------
  let needsRender = true
  let visible = true
  const requestRender = (): void => { needsRender = true }

  // ---------- models ----------
  const table = buildTable(kit)
  scene.add(table.root)
  const rail = buildRail(kit)
  // this bench has no printed scale: the student measures with the tape (hide the scale strip and the end labels of the shared model)
  rail.root.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && m.geometry.type === 'PlaneGeometry') m.visible = false })
  rail.root.children[0]!.userData.dragHandle = 'rail'
  // the rail's black low end cap gives way to the shoe (sloped end piece) drawn by syncShoe
  rail.root.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && m.material === M.black && Math.abs(m.position.x - (RAIL.length + 0.175)) < 0.01) m.visible = false })
  let shoeMesh: THREE.Mesh | null = null
  let shoeKey = ''
  const syncShoe = (geo: { shoe: { length_m: number; kink_rad: number } } | null): void => {
    const len = geo ? geo.shoe.length_m * CM : SHOE_LENGTH_m * CM
    const kink = geo ? geo.shoe.kink_rad : SHOE_KINK_rad
    const key = `${len.toFixed(3)}|${kink.toFixed(5)}`
    if (key === shoeKey) return
    shoeKey = key
    if (shoeMesh) { rail.root.remove(shoeMesh); shoeMesh.geometry.dispose() }
    shoeMesh = len > 0.05 ? buildShoe(kit, RAIL.length, RAIL.halfW, RAIL.height, len, kink) : null
    if (shoeMesh) rail.root.add(shoeMesh)
  }
  scene.add(rail.root)
  const base = buildBase(kit)
  const rack = buildRackStand(kit)
  const twoLeg = buildTwoLeg(kit)
  const level = buildLevel(kit)
  const stopwatch = buildStopwatch(kit)
  const tapeMeasure = buildTapeMeasure(kit)
  scene.add(base, rack.root, twoLeg.root, level.root, stopwatch.root, tapeMeasure.root)
  const pile = new THREE.Group()
  scene.add(pile)
  tag(pile, 'screws')
  let pileCount = -1
  const clampScrews = new THREE.Group(), twoLegScrews = new THREE.Group()
  for (const dx of [-1.6, 1.6]) { const s = screwHead(kit); s.position.set(10 + dx, -1.3, RAIL.halfW + 0.4); clampScrews.add(s) }
  for (const dx of [-0.55, 0.55]) { const s = screwHead(kit); s.position.set(RAIL.length - 10 + dx, -1.0, RAIL.halfW); twoLegScrews.add(s) }
  rail.root.add(clampScrews, twoLegScrews)
  for (const g of [clampScrews, twoLegScrews]) tag(g, 'screws')

  const balls: Record<BallId, BallModel> = { marble: buildBall(kit, 'marble'), pingpong: buildBall(kit, 'pingpong') }
  scene.add(balls.marble.root, balls.pingpong.root)
  const bond = buildSheet(kit, 'bond'), carbon = buildSheet(kit, 'carbon')
  scene.add(bond, carbon)
  const marksGroup = new THREE.Group()
  scene.add(marksGroup)
  const plumb = buildPlumb(kit)
  scene.add(plumb.root)

  // trail of the last flight: dots on a dotted parabola
  const trailGeo = new THREE.BufferGeometry()
  const trailPos = new Float32Array(TRAIL_DOTS * 3 + 3)
  trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3))
  trailGeo.setDrawRange(0, 0)
  const trail = new THREE.Points(trailGeo, M.trail)
  trail.frustumCulled = false
  trail.renderOrder = 6
  scene.add(trail)

  // ---------- state shared with the interaction layer ----------
  const preview: Preview = { ball: null, marks: new Map(), sheet: null }
  const labelCache = new Map<string, THREE.Material>()
  let levelX = 60
  let levelTable = { x: -22, z: -20 }
  let tapeTarget: TapeTarget | null = null
  let tapePlan: TapePlan | null = null
  let tapeMode: TapeMode = 'rest'
  let focusIds: string[] | null = null
  let dirty = true
  let trailWanted = false
  let H_cm = 76
  let frame: RailFrame | null = null
  let lastMarkCount = -1

  // ---------- camera presets ----------
  const frameInput = (): FrameInput => {
    const st = a.getState()
    const f = defaultFrameInput(st.world.H_m * CM)
    const geo = st.geometry
    if (geo) {
      f.tipX_cm = geo.pose.tip.x_m * CM
      f.highEnd = toScene(geo.pose.highEnd)
      f.clamp = toScene(geo.pose.clamp)
      f.frame = railFrame(geo)
    }
    if (st.paper.bond) f.sheets.push(sheetRectCm(st.paper.bond))
    if (st.paper.carbon) f.sheets.push(sheetRectCm(st.paper.carbon))
    if (st.paper.bond) for (const m of a.paperMarks(ctx.now())) { const p = sheetToFloor(st.paper.bond, m.a_m, m.b_m); f.floorPoints.push([p.x_m * CM, p.z_m * CM]) }
    { const r = a.ballRest(); if (r) f.floorPoints.push([r.x_m * CM, r.z_m * CM]) }
    if (st.edgeProjection) { const e = a.hiddenTruth().edgeProjection; if (e) f.floorPoints.push([e.x_m * CM, e.z_m * CM]) }
    f.landMax_cm = landMaxFor(f.sheets, f.floorPoints)
    return f
  }
  type Pose = { target: THREE.Vector3; pos: THREE.Vector3; key: string; fov: number }
  const poseFor = (name: PresetName): Pose => {
    const aspect = camera.aspect
    const fromFit = (pts: readonly Vec[], az: number, el: number, margin: number): Pose => {
      const fov = fovFor(name)
      const fit = fitView(pts, az, el, fov, aspect, margin)
      let key = ''
      for (const p of pts) key += `${Math.round(p[0] / 8)},${Math.round(p[1] / 8)},${Math.round(p[2] / 8)};`
      return { target: new THREE.Vector3(...fit.target), pos: new THREE.Vector3(...fit.position), key, fov }
    }
    if (name === 'tape') {
      let box: { min: V3; max: V3 } | null = null
      if (!tapePlan) {
        tapeMeasure.root.updateWorldMatrix(true, true)
        const bb = new THREE.Box3().setFromObject(tapeMeasure.root)
        box = { min: [bb.min.x, bb.min.y, bb.min.z], max: [bb.max.x, bb.max.y, bb.max.z] }
      }
      const ang = tapeAngles(tapePlan)
      return fromFit(tapePoints(tapePlan, box), ang.azimuth, ang.elevation, 0.06)
    }
    const f = frameInput()
    switch (name) {
      case 'overview': {
        // a narrow (phone) stage: raise the view so the depth of the bench fills the height, and keep the whole table in frame
        const narrow = aspect < 1.2
        const pts = narrow ? [...overviewPoints(f), ...boxCorners([TABLE.x0, -TABLE.thickness, -TABLE.halfD], [0, 0, TABLE.halfD])] : overviewPoints(f)
        return fromFit(pts, VIEW_ANGLES.overview.azimuth, narrow ? VIEW_ANGLES.overview.elevation + 14 : VIEW_ANGLES.overview.elevation, 0.04)
      }
      case 'release': return fromFit(releasePoints(f), VIEW_ANGLES.release.azimuth, VIEW_ANGLES.release.elevation, 0.05)
      case 'edge': return fromFit(edgePoints(f), VIEW_ANGLES.edge.azimuth, VIEW_ANGLES.edge.elevation, 0.05)
      case 'floor': return fromFit(floorPoints(f), VIEW_ANGLES.floor.azimuth, VIEW_ANGLES.floor.elevation, 0.06)
    }
  }
  let preset: PresetName | null = null
  const setFov = (fov: number): void => {
    if (Math.abs(camera.fov - fov) < 1e-6) return
    camera.fov = fov
    camera.updateProjectionMatrix()
  }
  /** In the side-on edge view the legs nearer to the camera than the edge plane fade so they do not hide the arc. */
  const fadeNearLegs = (on: boolean): void => { table.setNearLegsOpacity(on ? 0.25 : 1); requestRender() }
  let followKey = ''
  let anim: { t0: number; fromT: THREE.Vector3; toT: THREE.Vector3; fromP: THREE.Vector3; toP: THREE.Vector3; fromFov: number; toFov: number } | null = null
  const applyPose = (pose: { target: THREE.Vector3; pos: THREE.Vector3; fov: number }): void => {
    setFov(pose.fov)
    controls.target.copy(pose.target)
    camera.position.copy(pose.pos)
    camera.lookAt(pose.target)
    controls.update()
    requestRender()
  }
  const setPreset = (name: PresetName): void => {
    preset = name
    trailWanted = name === 'edge'
    fadeNearLegs(name === 'edge')
    const pose = poseFor(name)
    followKey = pose.key
    if (ctx.reducedMotion()) { anim = null; applyPose(pose); return }
    anim = { t0: performance.now(), fromT: controls.target.clone(), toT: pose.target, fromP: camera.position.clone(), toP: pose.pos, fromFov: camera.fov, toFov: pose.fov }
    requestRender()
  }
  // after the student orbits by hand the trail stays if the view started as 'edge'
  const userTookOver = (): void => { anim = null; preset = null; fadeNearLegs(false) }
  controls.addEventListener('start', userTookOver)
  controls.addEventListener('change', requestRender)

  // ---------- state -> scene ----------
  const stand = { x: -125 }
  const slot = (o: THREE.Object3D, p: { x: number; z: number }, y = 0, ry = 0): void => { o.position.set(p.x, y, p.z); o.rotation.set(0, ry, 0) }

  const syncMarks = (): void => {
    for (const c of [...rail.tapes.children]) rail.tapes.remove(c)
    for (const m of a.getState().marks) {
      const s = preview.marks.get(m.id) ?? m.s_m
      const g = new THREE.Group()
      const strip = box(0.9, 0.1, RAIL.halfW * 2 + 0.1, M.tape, 0, 0.05, 0, g)
      strip.castShadow = false
      tag(strip, 'mark', { markId: m.id, dragHandle: 'mark' })
      const lab = railFlag(kit, markLabel(s), labelCache)
      lab.position.set(0, -1.0, RAIL.halfW + 0.04)
      tag(lab, 'mark', { markId: m.id, dragHandle: 'mark' })
      g.add(lab)
      g.position.x = railLocalX_cm(s)
      rail.tapes.add(g)
    }
  }

  const syncPaperMarks = (): void => {
    for (const c of [...marksGroup.children]) {
      marksGroup.remove(c)
      c.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.geometry.dispose(); const mt = m.material as THREE.Material; if (mt !== M.markRing) mt.dispose() } })
    }
    const st = a.getState()
    const marks = a.paperMarks(ctx.now())
    lastMarkCount = marks.length
    if (!st.paper.bond) return
    for (const m of marks) {
      const p = sheetToFloor(st.paper.bond, m.a_m, m.b_m)
      const dot = buildMarkDot(kit, markDiameter_cm(m.diameter_m), m.darkness, m.id)
      dot.position.set(p.x_m * CM, -H_cm + paperSurfaceAt_m(p.x_m, p.z_m, st.paper.bond, st.paper.carbon) * CM + 0.03, p.z_m * CM)
      marksGroup.add(dot)
    }
  }

  const stopwatchText = (): string => {
    const s = a.stopwatchDisplay_s(ctx.now())
    return s < 100 ? s.toFixed(2).padStart(5, '0') : s.toFixed(1)
  }

  const apply = (): void => {
    const st = a.getState()
    const geo = st.geometry
    const it = st.items
    H_cm = st.world.H_m * CM
    table.setHeight(H_cm)
    frame = geo ? railFrame(geo) : null

    // rail: on the stand clamp and the table, or lying on the table until it is fastened
    rail.root.visible = it.rail
    syncShoe(geo)
    if (frame) { rail.root.position.set(...frame.origin); rail.root.rotation.set(0, 0, frame.tilt_rad) }
    else { slot(rail.root, STAGING.rail, RAIL.height); }
    clampScrews.visible = st.joints.rackClamp
    twoLegScrews.visible = st.joints.twoLegStand
    syncMarks()

    // rack stand and base
    const standOn = st.joints.standBase
    stand.x = geo ? geo.pose.clamp.x_m * CM : -125
    base.visible = it.base
    rack.root.visible = it.rackStand
    if (standOn) {
      base.position.set(stand.x, 0, 0); base.rotation.set(0, 0, 0)
      rack.root.position.set(stand.x, 0, 0); rack.root.rotation.set(0, 0, 0)
    } else {
      slot(base, STAGING.base)
      rack.root.position.set(STAGING.rackStand.x, 0.65, STAGING.rackStand.z - ROD_Z); rack.root.rotation.set(0, 0, -Math.PI / 2)
    }
    const clampH = geo ? geo.clampHeight_m * CM : (0.06 + st.rack_mm / 1000) * CM
    rack.update(clampH, geo && st.joints.rackClamp ? frame!.tilt_rad : 0)

    // two-leg stand
    twoLeg.root.visible = it.twoLeg
    if (geo && st.joints.twoLegStand) {
      // the stand model takes the rail top height at the stand: support height + the rail profile (the bridge top is the rail underside)
      const h = geo.legHeight_m * CM + RAIL.height
      twoLeg.root.position.set(geo.pose.twoLeg.x_m * CM, 0, 0); twoLeg.root.rotation.set(0, 0, 0)
      twoLeg.update(h, geo.contacts.twoLeg ? frame!.tilt_rad : 0)
    } else {
      slot(twoLeg.root, STAGING.twoLeg)
      twoLeg.update((LEG_BASE_HEIGHT_m * 1000 + st.leg_mm) / 10 + RAIL.height, 0)
    }

    // level: across the rail (to show its sideways roll) or on the table
    level.root.visible = it.level
    level.setBubble(a.levelReading().bubble_mm)
    if (it.level) {
      if (st.level.placement === 'rail' && it.rail) {
        if (level.root.parent !== rail.root) { level.root.removeFromParent(); rail.root.add(level.root) }
        const lr = levelRailRange_cm(st.joints.twoLegStand); levelX = Math.min(lr.max, Math.max(lr.min, levelX))
        level.root.position.set(levelX, 0, 0); level.root.rotation.set(0, Math.PI / 2, 0)
      } else {
        if (level.root.parent !== scene) { level.root.removeFromParent(); scene.add(level.root) }
        if (st.level.placement === 'table') slot(level.root, levelTableSpot(levelTable.x, levelTable.z, [...STAGED_BOXES, ...(geo ? mountedBoxes(geo, st.joints.standBase, st.joints.twoLegStand) : [])]), 0, 0)
        else slot(level.root, STAGING.level, 0, STAGING.level.rotY)
      }
    }

    // stopwatch and screws
    stopwatch.root.visible = it.stopwatch
    slot(stopwatch.root, STAGING.stopwatch, 0, STAGING.stopwatch.rotY)
    stopwatch.setText(stopwatchText())
    const free = it.screws ? SCREWS_TOTAL - st.screwsUsed : 0
    if (free !== pileCount) {
      pileCount = free
      for (const c of [...pile.children]) { pile.remove(c); c.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.geometry.dispose() }) }
      if (free > 0) pile.add(screwPile(kit, free))
    }
    pile.visible = free > 0
    slot(pile, STAGING.screws)

    // paper: on the floor at its pose, or waiting on the table
    const seat = (g: THREE.Group, p: { x_m: number; z_m: number; orientation: 'alongX' | 'alongZ' }, y: number): void => {
      g.position.set(p.x_m * CM, y, p.z_m * CM); g.rotation.set(0, p.orientation === 'alongZ' ? Math.PI / 2 : 0, 0)
    }
    const pb = preview.sheet?.kind === 'bond' ? { ...(st.paper.bond ?? { orientation: 'alongX' as const }), x_m: preview.sheet.x_m, z_m: preview.sheet.z_m } : st.paper.bond
    const pc = preview.sheet?.kind === 'carbon' ? { ...(st.paper.carbon ?? { orientation: 'alongX' as const }), x_m: preview.sheet.x_m, z_m: preview.sheet.z_m } : st.paper.carbon
    bond.visible = it.bondPaper && (pb !== null || st.paper.sheetsAvailable > 0)
    carbon.visible = it.carbonPaper
    if (pb) seat(bond, pb, -H_cm); else slot(bond, STAGING.bond, 0.02)
    if (pc) seat(carbon, pc, -H_cm + paperStack(pb, pc).carbonBase_m * CM + 0.01); else slot(carbon, STAGING.carbon, 0.02 + SHEET_THICK_cm)
    syncPaperMarks()
    plumb.root.visible = st.edgeProjection
    if (st.edgeProjection) {
      const p = a.hiddenTruth().edgeProjection
      if (p) { plumb.root.position.set(p.x_m * CM, -H_cm + paperSurfaceAt_m(p.x_m, p.z_m, st.paper.bond, st.paper.carbon) * CM, p.z_m * CM); plumb.setHeight(H_cm) } else plumb.root.visible = false
    }

    // tape measure: against the chosen target when it can be drawn, else resting on the table
    tapeMeasure.root.visible = it.tapeMeasure
    tapePlan = null
    if (it.tapeMeasure) {
      if (tapeTarget) {
        const truth = a.hiddenTruth()
        tapePlan = planTape(tapeTarget, {
          H_m: st.world.H_m, geo, markS_m: (id) => truth.markTrueS_m[id] ?? null, markOnFloor: (id) => a.markOnFloor(id), edgeProjection: truth.edgeProjection,
        })
      }
      const p = tapePlan
      if (p) {
        tapeMode = p.mode
        tapeMeasure.set(p.mode, p.length_cm)
        const parent = p.frame === 'rail' ? rail.root : scene
        if (tapeMeasure.root.parent !== parent) { tapeMeasure.root.removeFromParent(); parent.add(tapeMeasure.root) }
        tapeMeasure.root.rotation.order = 'YXZ'
        tapeMeasure.root.rotation.set(p.flat ? -Math.PI / 2 : 0, p.yaw_rad, 0)
        tapeMeasure.root.position.set(...p.position)
      } else {
        tapeMode = 'rest'
        tapeMeasure.set('rest', 6)
        if (tapeMeasure.root.parent !== scene) { tapeMeasure.root.removeFromParent(); scene.add(tapeMeasure.root) }
        tapeMeasure.root.rotation.set(0, 0, 0)
        tapeMeasure.root.position.set(STAGING.tape.x, 0, STAGING.tape.z)
      }
    }
    setOutlines(highlightRoots())
    requestRender()
  }

  // ---------- balls ----------
  interface Spin { angle: number; lastX: number | null; lastT: number; rate: number; mode: 'roll' | 'fly' }
  const spin: Record<BallId, Spin> = { marble: { angle: 0, lastX: null, lastT: 0, rate: 0, mode: 'roll' }, pingpong: { angle: 0, lastX: null, lastT: 0, rate: 0, mode: 'roll' } }
  let sig = ''

  // trail bookkeeping
  let trailRun = -1
  let trailTimes: number[] = []
  let trailEdge_s = 0
  let trailFadeStart = -1
  const loadTrail = (runId: number): void => {
    const traj = a.runPath(runId) // the whole path: shoe, arc, hops on the table, flight
    const run = a.getRun(runId)
    if (traj.length === 0 || !run || run.times.edge_s === null || run.times.tip_s === null) return
    trailRun = runId
    trailEdge_s = run.times.tip_s // run clock of the first path sample (the departure from the beam end)
    const step = Math.max(1, Math.ceil(traj.length / TRAIL_DOTS))
    trailTimes = []
    let n = 0
    for (let i = 0; i < traj.length && n < TRAIL_DOTS; i += step) {
      const p = traj[i]!
      const sc = ballToScene({ x_m: p.x_m, y_m: p.y_m, z_m: p.z_m }, a.getState().world.H_m)
      trailPos[n * 3] = sc[0]; trailPos[n * 3 + 1] = sc[1]; trailPos[n * 3 + 2] = sc[2]
      trailTimes.push(p.t_s)
      n++
    }
    ;(trailGeo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true
    trailFadeStart = -1
    M.trail.opacity = 0.6
  }

  const syncBalls = (nowPerf: number): boolean => {
    const st = a.getState()
    const status = a.ballStatus(ctx.now())
    const parts: string[] = []
    for (const id of ['marble', 'pingpong'] as const) {
      const ball = balls[id]
      const item = st.items[BALL_ITEM[id]]
      ball.root.visible = item
      if (!item) continue
      const R = ball.radius_cm
      const sp = spin[id]
      const pv = preview.ball?.id === id ? preview.ball : null
      const active = status.ball === id && status.pos !== null
      let pos: V3
      if (pv?.world) pos = pv.world
      else if (active) pos = ballToScene(status.pos!, st.world.H_m)
      else pos = [id === 'marble' ? STAGING.marble.x : STAGING.pingPong.x, R, id === 'marble' ? STAGING.marble.z : STAGING.pingPong.z]
      ball.root.position.set(pos[0], pos[1], pos[2])
      // spin: rolling turns with the path, flying keeps the rate it left the table with
      const moving = active && !pv && (status.phase === 'rolling' || status.phase === 'flying' || status.phase === 'landed' || status.phase === 'rolledOver')
      if (!moving) { sp.angle = 0; sp.lastX = null; sp.rate = 0 }
      else {
        const dt = (nowPerf - sp.lastT) / 1000
        const fly = status.phase === 'flying' || status.phase === 'rolledOver'
        if (sp.lastX !== null && dt > 0 && dt < 0.25) {
          const dx = pos[0] - sp.lastX
          if (fly) sp.angle += sp.rate * dt
          else { const da = rollAngle_rad(dx, R); sp.angle += da; sp.rate = da / dt }
        }
        sp.lastX = pos[0]
      }
      sp.lastT = nowPerf
      ball.spin.rotation.z = sp.angle
      parts.push(`${id}:${pos[0].toFixed(2)},${pos[1].toFixed(2)},${pos[2].toFixed(2)},${sp.angle.toFixed(2)},${ball.root.visible}`)
    }

    // trail: adopt the new run's flight as soon as it flies; fade the old one while the next ball is still on the rail
    if (status.runId !== null && status.runId !== trailRun) {
      if (status.phase === 'flying' || status.phase === 'landed') loadTrail(status.runId)
      else if (trailRun >= 0 && trailFadeStart < 0) trailFadeStart = nowPerf
    }
    if (trailFadeStart >= 0) {
      const k = Math.min(1, (nowPerf - trailFadeStart) / TRAIL_FADE_MS)
      M.trail.opacity = 0.6 * (1 - k)
    }
    let count = 0
    if (trailRun >= 0) {
      const inFlight = status.runId === trailRun && status.phase === 'flying'
      const tNow = inFlight ? status.t_s - trailEdge_s : Infinity
      count = trailTimes.filter((t) => t <= tNow).length
    }
    const show = trailWanted && count > 0 && M.trail.opacity > 0.01
    trail.visible = show
    trailGeo.setDrawRange(0, count)
    parts.push(`t${count}:${M.trail.opacity.toFixed(2)}:${show}`)

    // marks appear when the ball lands
    const n = st.paper.bond ? a.paperMarks(ctx.now()).length : 0
    if (n !== lastMarkCount) { syncPaperMarks(); parts.push('m') }
    if (st.stopwatch.running && st.items.stopwatch) { stopwatch.setText(stopwatchText()); parts.push(stopwatchText()) }
    const key = parts.join('|')
    const changed = key !== sig
    sig = key
    return changed
  }

  // ---------- outlines (inverted-hull rims) for hover and the shell's focus requests ----------
  const outlineMat = createOutlineMaterial(0.85, 0.22)
  const hoverMat = createOutlineMaterial(0.7, 0.16)
  const refreshOutlineColor = (): void => { outlineMat.color.copy(M.tokens.accent); hoverMat.color.copy(M.tokens.accent) }
  refreshOutlineColor()
  let outlineRoots: THREE.Object3D[] = []
  let focusOv: THREE.Mesh[] = []
  const makeOverlays = (root: THREE.Object3D, mat: THREE.Material): THREE.Mesh[] => {
    const out: THREE.Mesh[] = []
    root.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh || m.userData.overlay || m.material === M.glass || m.material === M.marbleGlass || !m.visible) return
      if (m.geometry.type === 'PlaneGeometry' || m.geometry.type === 'CircleGeometry' || m.geometry.type === 'RingGeometry') return
      const ov = new THREE.Mesh(m.geometry, mat)
      ov.userData.overlay = true
      ov.raycast = () => {}
      ov.renderOrder = 3
      m.add(ov)
      out.push(ov)
    })
    return out
  }
  const setOutlines = (roots: THREE.Object3D[]): void => {
    if (roots.length === outlineRoots.length && roots.every((r, i) => r === outlineRoots[i])) return
    for (const o of focusOv) o.parent?.remove(o)
    focusOv = []
    outlineRoots = roots
    for (const r of roots) focusOv.push(...makeOverlays(r, outlineMat))
  }
  const partRoot = (id: string): THREE.Object3D | null => {
    switch (id) {
      case 'rail': return rail.root
      case 'rackStand': case 'rackKnob': return rack.root
      case 'standBase': case 'base': return base
      case 'twoLegStand': case 'twoLeg': case 'foot': return twoLeg.root
      case 'level': return level.root
      case 'stopwatch': return stopwatch.root
      case 'tapeMeasure': return tapeMeasure.root
      case 'marble': return balls.marble.root
      case 'pingPong': case 'pingpong': return balls.pingpong.root
      case 'bondPaper': case 'bond': return bond
      case 'carbonPaper': case 'carbon': return carbon
      case 'screws': return pile
      case 'marks': return rail.tapes
      default: return null
    }
  }
  const highlightRoots = (): THREE.Object3D[] => {
    const out: THREE.Object3D[] = []
    for (const id of focusIds ?? []) { const r = partRoot(id); if (r && r.visible && !out.includes(r)) out.push(r) }
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

  // ---------- tools and tape target ----------
  let tool: Tool = 'select'
  const setTapeTarget = (t: TapeTarget | null, notify = false): void => {
    tapeTarget = t
    dirty = true
    if (t && notify && opts.onTapeTarget) opts.onTapeTarget(t)
  }
  const unsub = a.on((e) => {
    dirty = true
    if (e.type === 'presetApplied' || e.type === 'loaded') { preview.marks.clear(); tapeTarget = null }
  })

  // ---------- interaction ----------
  const pickables = (): THREE.Object3D[] => {
    const l: THREE.Object3D[] = [table.top, table.floor, rail.root, base, rack.root, twoLeg.root, level.root, stopwatch.root, tapeMeasure.root, pile,
      balls.marble.root, balls.pingpong.root, bond, carbon, plumb.root]
    if (tool !== 'paper') l.push(marksGroup)
    return l
  }
  const partOf = (p: string): THREE.Object3D | null => partRoot(p === 'base' ? 'standBase' : p === 'twoLeg' ? 'twoLegStand' : p)
  const dd3d = createDragDrop3D({
    a, ctx, scene, container, canvas, camera, controls, M, pickables, rootOf: (p) => partOf(p), getTool: () => tool,
    requestRender, refreshSoon: () => { dirty = true },
    setLevelX: (x) => { const r = levelRailRange_cm(a.getState().joints.twoLegStand); levelX = Math.min(r.max, Math.max(r.min, x)) },
    setLevelTable: (x, z) => { levelTable = { x, z } },
  })
  const interaction: Interaction = createInteraction({
    a, ctx, container, canvas, camera, controls, pickables, requestRender, S,
    railRoot: rail.root,
    railFrame: () => frame,
    rackKnob: rack.knob,
    floorY: () => H_cm,
    ballRadius_cm: (id) => balls[id].radius_cm,
    preview,
    setLevelX: (x) => { const r = levelRailRange_cm(a.getState().joints.twoLegStand); levelX = Math.min(r.max, Math.max(r.min, x)) },
    setLevelTable: (x, z) => { levelTable = { x, z } },
    getTool: () => tool,
    setTapeTarget: (t) => setTapeTarget(t, true),
    onCard: opts.onCard,
    onStatus: opts.onStatus,
    outline: { hover: hoverMat },
    changed: () => { dirty = true; ctx.changed() },
    refreshSoon: () => { dirty = true },
    onUserCamera: userTookOver,
    openPanel: opts.openPanel,
  })

  // ---------- theme, visibility, context loss ----------
  const onTheme = (): void => {
    M.refresh(); refreshOutlineColor()
    ;(scene.background as THREE.Color).copy(M.tokens.bg)
    ;(scene.fog as THREE.Fog).color.copy(M.tokens.bg)
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
  // a trail of the last flight survives a reload: adopt the newest run that flew
  for (const r of a.getRuns().reverse()) if (r.flight) { loadTrail(r.id); break }
  setPreset(opts.initialPreset)
  anim = null
  applyPose(poseFor(opts.initialPreset))
  onTheme()
  // Compile the shaders without blocking: the first render() otherwise stalls the main thread for seconds on slow GPUs, and keys
  // pressed meanwhile (S, Space, Enter) would only be handled after it. Frames wait for the programs, then draw.
  let compiled = false
  void renderer.compileAsync(scene, camera).catch(() => undefined).then(() => { compiled = true; needsRender = true })

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
        if (k === 'ball') return toClient(balls[(arg as BallId) ?? 'marble'].root.getWorldPosition(new THREE.Vector3()))
        if (k === 'rail' && frame) { const p = railLocalToWorld(frame, [Number(arg), 0, 0]); return toClient(new THREE.Vector3(...p)) }
        if (k === 'mark') { const g = rail.tapes.children[Number(arg)]; return g ? toClient(g.getWorldPosition(new THREE.Vector3())) : null }
        if (k === 'floor') { const [x, z] = (arg ?? '0_0').split(/[,_]/).map(Number); return toClient(new THREE.Vector3(x, -H_cm, z)) }
        if (k === 'table') { const [x, z] = (arg ?? '0_0').split(/[,_]/).map(Number); return toClient(new THREE.Vector3(x, 0, z)) }
        if (k === 'bond') return toClient(bond.getWorldPosition(new THREE.Vector3()))
        if (k === 'carbon') return toClient(carbon.getWorldPosition(new THREE.Vector3()))
        return null
      },
    }
  }

  return {
    dragdrop: dd3d,
    update() {
      if (document.hidden || !visible) return
      const now = performance.now()
      a.tick(ctx.now())
      if (dirty) {
        dirty = false; apply()
        // the framing follows the set-up (rail, paper, marks, tape target) once it moves by a few cm, never during a drag
        if (preset && !anim && !interaction.busy()) {
          const pz = poseFor(preset)
          const key = preset === 'tape' ? `${tapeMode}|${JSON.stringify(tapeTarget)}|${pz.key}` : pz.key
          if (key !== followKey) { followKey = key; setPreset(preset) }
        }
      }
      if (syncBalls(now)) requestRender()
      if (dd3d.tick(now)) needsRender = true
      if (anim) {
        const k = Math.min(1, (now - anim.t0) / TRANSITION_MS)
        const e = easeOut(k)
        controls.target.lerpVectors(anim.fromT, anim.toT, e)
        camera.position.lerpVectors(anim.fromP, anim.toP, e)
        setFov(anim.fromFov + (anim.toFov - anim.fromFov) * e)
        camera.lookAt(controls.target)
        if (k >= 1) anim = null
        needsRender = true
      }
      if (controls.update()) needsRender = true
      if (needsRender && compiled) {
        needsRender = false
        renderer.render(scene, camera)
      }
    },
    setVisible(v) { visible = v; if (v) { resize(); dirty = true; requestRender() } },
    setPreset: (n) => {
      setPreset(n)
    },
    currentPreset: () => preset,
    setTool(t) { tool = t; interaction.setTool(t) },
    getTool: () => tool,
    setTapeTarget: (t) => setTapeTarget(t, false),
    getTapeTarget: () => tapeTarget,
    focus(list) { focusIds = list && list.length ? list : null; dirty = true },
    relabel() {
      canvas.setAttribute('aria-label', S().canvasLabel)
      interaction.relabel()
      requestRender()
    },
    destroy() {
      unsub()
      dd3d.destroy()
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
      table.dispose()
      outlineMat.dispose(); hoverMat.dispose()
      M.dispose()
      trailGeo.dispose()
      envTex.dispose(); pmrem.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      delete (window as unknown as { __scene3d?: unknown }).__scene3d
      canvas.remove(); probe.remove()
    },
  }
}
