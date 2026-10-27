// The three.js scene of the friction bench. This module (and three itself) is a lazy chunk: only index.ts imports it, via import().
// Rendering is on demand (a state signature decides); there is no private requestAnimationFrame: the shell calls update() once per frame.
// The view only draws the apparatus state (pullStatus, inclineStatus, getState); it computes no physics. 1 unit = 1 cm, y up, +x to the right,
// +z toward the viewer. Table top at y = 0. Block, paper and spring scale on the front half (z > 0); the rail and its stand behind (z < 0).
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { SPRING_SCALES, type SpringScaleId } from '../../../../core/instruments/springScale.ts'
import { buildSpringScale, type SpringScaleModel } from '../../../../core/scene3d/springScale.ts'
import { createCoreMaterials, type CoreMaterials } from '../../../../core/scene3d/materials.ts'
import { boxCorners, fitView, type Vec } from '../../../../core/scene3d/framing.ts'
import { box, buildBase, buildRail, buildStopwatch, buildTapeMeasure, canvasTexture, cyl, type Kit, zcyl } from '../../../../core/scene3d/models.ts'
import { lcdText } from '../../../../core/views/numfmt.ts'
import { START_FRONT_m } from '../../apparatus/index.ts'
import { COURSE_m, RAIL_LENGTH_m, RAIL_SUPPORT_DIST_m, inclineAngle_rad } from '../../physics/index.ts'
import { strings, type PresetName } from '../strings/scene3d.ts'
import type { ViewContext } from '../view.ts'

export type Area = 'all' | 'exp12' | 'exp3'
export interface SceneOptions { initialPreset: PresetName; initialArea?: Area; onFail(reason: string): void }
export interface Scene3D {
  update(): void
  setVisible(v: boolean): void
  setPreset(name: PresetName): void
  /** Which half of the bench the current step uses: exps. 1 and 2 hide the rail, exp. 3 hides the block, 'all' shows everything. */
  setArea(area: Area): void
  focus(targets: string[] | null): void
  relabel(): void
  destroy(): void
}

const FOV = 36
const TRANSITION_MS = 450
const X_LOW = 85, RAIL_Z = -22, PAPER_Z = 28, PAPER_X0 = -40
const PAPER_L = 29.7, PAPER_W = 21
const BLOCK = { l: 6, h: 3, w: 4 }
const ROD_Z = -3.4
const easeOut = (t: number): number => 1 - Math.pow(1 - t, 3)

interface FrictionMaterials extends CoreMaterials { wood: THREE.MeshStandardMaterial; cloth: THREE.MeshStandardMaterial; sand: THREE.MeshStandardMaterial; paper: THREE.MeshStandardMaterial; mass: THREE.MeshStandardMaterial; mark: THREE.MeshBasicMaterial }

export function createScene(container: HTMLElement, ctx: ViewContext, opts: SceneOptions): Scene3D {
  const app = ctx.apparatus
  const coarse = matchMedia('(pointer: coarse)').matches || innerWidth < 700
  const renderer = new THREE.WebGLRenderer({ antialias: !coarse, alpha: false, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.toneMapping = THREE.NeutralToneMapping
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  const canvas = renderer.domElement
  canvas.tabIndex = 0
  canvas.setAttribute('role', 'application')
  canvas.setAttribute('aria-label', strings[ctx.lang()].canvasLabel)
  container.append(canvas)
  const probe = document.createElement('span')
  probe.setAttribute('aria-hidden', 'true')
  probe.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;visibility:hidden'
  container.append(probe)

  const core = createCoreMaterials(probe)
  const fabric = (base: string, speck: string, n: number): THREE.CanvasTexture => canvasTexture({ M: core, textures: [], anisotropy: 4 } as Kit, 128, 128, (c) => {
    c.fillStyle = base; c.fillRect(0, 0, 128, 128)
    c.fillStyle = speck
    for (let i = 0; i < n; i++) c.fillRect((i * 37) % 128, (i * 59 + (i >> 3) * 13) % 128, 2, 2)
  })
  const M: FrictionMaterials = Object.assign(core, {
    wood: new THREE.MeshStandardMaterial({ color: 0xc89b62, roughness: 0.8, metalness: 0 }),
    cloth: new THREE.MeshStandardMaterial({ map: fabric('#6f87a8', '#556b8a', 700), roughness: 0.95, metalness: 0 }),
    sand: new THREE.MeshStandardMaterial({ map: fabric('#a77d4d', '#6b4a2a', 900), roughness: 1, metalness: 0 }),
    paper: new THREE.MeshStandardMaterial({ color: 0xfbfbf8, roughness: 0.92, metalness: 0, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
    mass: new THREE.MeshStandardMaterial({ color: 0xc9ced6, metalness: 0.9, roughness: 0.3 }),
    mark: new THREE.MeshBasicMaterial({ color: 0xd23b30 }),
  })
  const kit: Kit<FrictionMaterials> = { M, textures: [], anisotropy: renderer.capabilities.getMaxAnisotropy() }

  const scene = new THREE.Scene()
  scene.background = M.tokens.bg.clone()
  renderer.setClearColor(M.tokens.bg, 1)
  const pmrem = new THREE.PMREMGenerator(renderer)
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environment = envTex
  scene.environmentIntensity = 0.75
  const camera = new THREE.PerspectiveCamera(FOV, 1.6, 1, 1800)
  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = !ctx.reducedMotion()
  controls.dampingFactor = 0.1
  controls.minDistance = 8
  controls.maxDistance = 600
  controls.maxPolarAngle = (89 * Math.PI) / 180
  controls.screenSpacePanning = false
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8f99, 0.75))
  const sun = new THREE.DirectionalLight(0xffffff, 1.6)
  sun.position.set(-60, 200, 140)
  sun.target.position.set(20, 0, 0)
  sun.castShadow = true
  sun.shadow.mapSize.set(coarse ? 1024 : 2048, coarse ? 1024 : 2048)
  Object.assign(sun.shadow.camera, { left: -140, right: 140, top: 100, bottom: -100, near: 20, far: 500 })
  sun.shadow.bias = -0.0003
  sun.shadow.normalBias = 0.05
  scene.add(sun, sun.target)

  let needsRender = true
  let visible = true
  controls.addEventListener('change', () => { needsRender = true })

  // ---------- fixed models ----------
  const table = box(250, 3, 120, M.table, 20, -1.5, 0, scene)
  void table

  // ---------- exps. 1 and 2: paper, block, masses, spring scale ----------
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(PAPER_L, PAPER_W), M.paper)
  paper.rotation.x = -Math.PI / 2
  paper.position.set(PAPER_X0 + PAPER_L / 2, 0.02, PAPER_Z)
  paper.receiveShadow = true
  scene.add(paper)
  const tapes = new THREE.Group()
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const t = box(2.2, 0.06, 0.9, M.tape, PAPER_X0 + PAPER_L / 2 + sx * (PAPER_L / 2 - 0.6), 0.06, PAPER_Z + sz * (PAPER_W / 2 - 0.5), tapes)
    t.rotation.y = sx * sz * 0.5
  }
  scene.add(tapes)
  const blockG = new THREE.Group()
  scene.add(blockG)
  const bottom = box(BLOCK.l, 0.3, BLOCK.w, M.cloth, 0, 0.15, 0, blockG)
  box(BLOCK.l, BLOCK.h - 0.6, BLOCK.w, M.wood, 0, 0.3 + (BLOCK.h - 0.6) / 2, 0, blockG)
  const top = box(BLOCK.l, 0.3, BLOCK.w, M.sand, 0, BLOCK.h - 0.15, 0, blockG)
  box(0.5, 0.5, 0.5, M.steel, BLOCK.l / 2 + 0.25, 1.4, 0, blockG) // hook
  const massGs: THREE.Mesh[] = []
  for (let i = 0; i < 3; i++) {
    const m = cyl(1.6, 1.6, 0.9, M.mass, blockG, 28)
    m.position.set(0, BLOCK.h + 0.45 + i * 0.95, 0)
    massGs.push(m)
  }
  const scales = new Map<SpringScaleId, SpringScaleModel>()
  for (const id of ['1N', '2N'] as SpringScaleId[]) {
    const m = buildSpringScale(kit, SPRING_SCALES[id], { lang: ctx.lang() })
    m.root.rotation.y = Math.PI // hook toward the block (-x), ring toward the hand (+x)
    scene.add(m.root)
    scales.set(id, m)
  }
  const HOOK0 = 14.6 // local x of the hook at zero extension (core/scene3d/springScale.ts)

  // ---------- exp. 3: rail, stand, bar, marks, tape, stopwatch ----------
  const rail = buildRail(kit)
  rail.update(true)
  const railG = new THREE.Group()
  railG.add(rail.root)
  scene.add(railG)
  const standG = new THREE.Group()
  scene.add(standG)
  standG.add(buildBase(kit))
  const rod = cyl(0.6, 0.6, 80, M.steel, standG, 20)
  rod.position.set(0, 40, ROD_Z)
  const collar = new THREE.Group()
  standG.add(collar)
  box(3, 3.6, 2.4, M.black, 0, 0, ROD_Z, collar)
  box(3.4, 0.8, 4.4, M.black, 0, 0.4, ROD_Z / 2 - 0.2, collar)
  const knob = zcyl(1.15, 0.9, M.blue, collar, 28)
  knob.position.set(0, 0, ROD_Z + 1.7)
  const barMeshes: Record<string, THREE.Mesh> = {
    wood: box(10, 1.5, 2.5, M.wood, 0, 0, 0, railG), aluminium: box(10, 1.5, 2.5, M.alu, 0, 0, 0, railG), iron: box(10, 1.5, 2.5, M.steel, 0, 0, 0, railG),
  }
  const startMark = box(0.35, 0.1, 2.6, M.mark, 0, 0.06, 0, railG)
  const finishMark = box(0.35, 0.1, 2.6, M.mark, 0, 0.06, 0, railG)
  const tape = buildTapeMeasure(kit)
  scene.add(tape.root)
  const watch3 = buildStopwatch(kit)
  watch3.root.position.set(96, 0, 38)
  scene.add(watch3.root)

  // ---------- camera presets ----------
  const pts = (min: Vec, max: Vec): Vec[] => boxCorners(min, max)
  const PRESET: Record<PresetName, { points: Vec[]; az: number; el: number }> = {
    overview: { points: pts([-60, 0, -40], [105, 60, 48]), az: 8, el: 30 },
    scale: { points: pts([-36, 0, 27], [-6, 4, 31]), az: 0, el: 22 },
    rail: coarse ? { points: pts([-32, 0, -30], [62, 72, -12]), az: 20, el: 10 } : { points: pts([-45, 0, -30], [100, 82, -10]), az: 0, el: 6 },
    tape: { points: pts([-45, 0, -30], [-5, 62, -2]), az: 25, el: 14 },
  }
  let area: Area = opts.initialArea ?? 'all'
  let preset: PresetName = opts.initialPreset
  let trans: { t0: number; fromP: THREE.Vector3; fromT: THREE.Vector3; toP: THREE.Vector3; toT: THREE.Vector3 } | null = null
  const aspect = (): number => Math.max(0.2, camera.aspect)
  function frameFor(p: PresetName): { position: THREE.Vector3; target: THREE.Vector3 } {
    const d = PRESET[p]
    const f = fitView(d.points, d.az, d.el, FOV, aspect(), 0.12)
    return { position: new THREE.Vector3(...f.position), target: new THREE.Vector3(...f.target) }
  }
  function setPreset(p: PresetName, animate = true): void {
    preset = p
    const f = frameFor(p)
    if (!animate || ctx.reducedMotion()) { camera.position.copy(f.position); controls.target.copy(f.target); controls.update(); trans = null }
    else trans = { t0: performance.now(), fromP: camera.position.clone(), fromT: controls.target.clone(), toP: f.position, toT: f.target }
    needsRender = true
  }
  function resize(): void {
    const r = container.getBoundingClientRect()
    const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height))
    renderer.setSize(w, h, false)
    canvas.style.width = '100%'; canvas.style.height = '100%'
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    setPreset(preset, false)
  }
  const ro = new ResizeObserver(resize)
  ro.observe(container)
  resize()

  // ---------- highlight (the checklist's "show me") ----------
  let helpers: THREE.BoxHelper[] = []
  let helperTimer = 0
  function focus(targets: string[] | null): void {
    for (const h of helpers) { scene.remove(h); h.dispose() }
    helpers = []
    window.clearTimeout(helperTimer)
    if (!targets || !targets.length) { needsRender = true; return }
    const map: Record<string, THREE.Object3D> = { block: blockG, paper, rail: railG, rackStand: standG, scale: scales.get('1N')!.root, bar: railG, tape: tape.root, stopwatch: watch3.root }
    for (const t of targets) {
      const o = map[t]
      if (!o || !o.visible) continue
      const h = new THREE.BoxHelper(o, 0x0071e3)
      scene.add(h); helpers.push(h)
    }
    needsRender = true
    helperTimer = window.setTimeout(() => focus(null), 4000)
  }

  // ---------- sync models with the apparatus ----------
  let sig = ''
  function sync(): string {
    const s = app.getState()
    const st = app.pullStatus(ctx.now())
    const inc = app.inclineStatus(ctx.now())
    const lcd = lcdText(app.stopwatchDisplay_s(ctx.now()))
    const truth = app.hiddenTruth()
    // exps. 1 and 2
    const e_cm = (st.x_pull_m - st.x_block_m) * 100
    const xb = PAPER_X0 + 2.5 + st.x_block_m * 100
    const showBlock = s.items.block
    const show12 = area !== 'exp3', show3 = area !== 'exp12'
    blockG.visible = showBlock && show12
    paper.visible = s.items.paper && s.paper !== 'none' && show12
    tapes.visible = paper.visible && s.paper === 'fixed'
    blockG.position.set(xb, 0.06, PAPER_Z)
    const sand = s.face === 'sandpaper'
    bottom.material = sand ? M.sand : M.cloth
    top.material = sand ? M.cloth : M.sand
    massGs.forEach((m, i) => { m.visible = i < s.addedMasses })
    for (const [id, m] of scales) {
      const show = showBlock && s.scale === id && show12
      m.root.visible = show
      if (show) {
        const reading = st.scale
        const ext = Math.min(SPRING_SCALES[id].fullExtension_m, reading ? reading.extension_m : 0) * 100
        m.set(ext / 100)
        m.root.position.set(xb + BLOCK.l / 2 + 0.5 + HOOK0 + ext, 1.4, PAPER_Z)
      }
    }
    // exp. 3
    const hasRail = s.items.rail
    railG.visible = hasRail && show3
    const th = inclineAngle_rad(inc.h_m)
    const h_cm = inc.h_m * 100
    const hasStand = s.items.rackStand && s.items.standBase
    standG.visible = hasStand && hasRail && show3
    if (hasRail) {
      rail.root.position.set(0, 0, 0)
      railG.rotation.set(0, 0, -th)
      // local (120, -2) is the underside of the low end: it must sit on the table at X_LOW
      const lx = 120 * Math.cos(th) - 2 * Math.sin(th), ly = -120 * Math.sin(th) - 2 * Math.cos(th)
      railG.position.set(X_LOW - lx, -ly, RAIL_Z)
      const sClamp = RAIL_SUPPORT_DIST_m * 100
      standG.position.set(X_LOW - sClamp * Math.cos(th), 0, RAIL_Z)
      collar.position.set(0, h_cm, 0)
      knob.rotation.z = -h_cm * 0.6
      // marks and bar in the rail frame (x from the high end, +x toward the low end)
      const toLocal = (sLow_m: number): number => RAIL_LENGTH_m * 100 - sLow_m * 100
      const marked = s.course_mark
      startMark.visible = marked; finishMark.visible = marked
      startMark.position.x = toLocal(START_FRONT_m)
      finishMark.position.x = toLocal(START_FRONT_m - (truth.course_m ?? COURSE_m))
      for (const [k, m] of Object.entries(barMeshes)) {
        m.visible = s.bar === k && s.items[k === 'wood' ? 'woodBar' : k === 'aluminium' ? 'alBar' : 'ironBar']
        m.position.set(toLocal(START_FRONT_m - inc.s_m) - 5, 0.75 + 0.02, 0)
      }
      // tape beside the clamp: the blade runs from the table to the rail underside
      tape.root.visible = s.items.tape && show3
      if (s.items.tape) {
        tape.set('down', Math.max(2, h_cm))
        tape.root.position.set(standG.position.x + 6, h_cm, RAIL_Z + 9)
      }
    } else { tape.root.visible = false }
    watch3.root.visible = s.items.stopwatch
    if (s.items.stopwatch) watch3.setText(lcd)
    return [e_cm.toFixed(2), xb.toFixed(2), st.scale?.indicated_N.toFixed(3), s.face, s.addedMasses, s.scale, s.paper, s.bar, s.course_mark, inc.h_m.toFixed(4), inc.s_m.toFixed(3), lcd, hasRail, hasStand, Object.values(s.items).join(''), area].join('|')
  }

  setPreset(preset, false)
  function update(): void {
    if (!visible) return
    const s = sync()
    if (s !== sig) { sig = s; needsRender = true }
    if (trans) {
      const k = Math.min(1, (performance.now() - trans.t0) / TRANSITION_MS)
      const e = easeOut(k)
      camera.position.lerpVectors(trans.fromP, trans.toP, e)
      controls.target.lerpVectors(trans.fromT, trans.toT, e)
      if (k >= 1) trans = null
      needsRender = true
    }
    if (controls.update()) needsRender = true
    for (const h of helpers) h.update()
    if (needsRender) { renderer.render(scene, camera); needsRender = false }
  }
  void opts

  return {
    update,
    setVisible(v) { visible = v; if (v) { resize(); needsRender = true } },
    setPreset,
    setArea(a) { area = a; needsRender = true },
    focus,
    relabel() { canvas.setAttribute('aria-label', strings[ctx.lang()].canvasLabel); for (const m of scales.values()) m.setLang(ctx.lang()); needsRender = true },
    destroy() {
      ro.disconnect(); window.clearTimeout(helperTimer)
      controls.dispose()
      scene.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.geometry.dispose() })
      for (const t of kit.textures) t.dispose()
      M.dispose()
      envTex.dispose(); pmrem.dispose()
      renderer.dispose()
      canvas.remove(); probe.remove()
    },
  }
}
