// The three.js scene of the bench. This module (and three itself) is a lazy chunk: only index.ts imports it, via dynamic import().
// Rendering is on demand: a frame is drawn only when the apparatus changed, the camera moves, an animation runs, the cart rolls or the
// stopwatch counts. There is no private requestAnimationFrame: the shell calls update() once per frame. The scene only draws what the
// apparatus reports (cartState(t_ms), joints, masses); it computes no physics.
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { CART_LENGTH_m, RAIL_LENGTH_m, SUPPORT_SEPARATION_m, type Apparatus, type ItemId } from '../../apparatus/index.ts'
import { SPRING_SCALES, type SpringScaleId } from '../../../../core/instruments/springScale.ts'
import { createCoreMaterials, createOutlineMaterial, type CoreMaterials } from '../../../../core/scene3d/materials.ts'
import { boxCorners, fitView, type Vec } from '../../../../core/scene3d/framing.ts'
import { lcdText } from '../../../../core/views/numfmt.ts'
import type { ViewContext } from '../view.ts'
import { strings } from '../strings/scene3d.ts'
import {
  MASS_H, buildBalance, buildBase, buildBrassScrew, buildCanister, buildCart, buildLevel, buildMass, buildPlasticScrewBag, buildRackStand, buildRail,
  buildReceiver, buildScalePost, buildSpringScale, buildStopwatch, buildStringCoil, buildTwoLeg, screwHead, screwPile, box, cyl, rbox, tag,
  DEFAULT_CART_DIMS, KNOT_H_cm, type Kit,
} from './models.ts'
import {
  BENCH, BENCH_MASS_SLOT, FLOOR_Y_cm, PORTRAIT_OVERVIEW, PRESET_NAMES, PRESET_VIEWS, RAIL, SCALE_POST, STAGING, STRING_ABOVE_RAIL_cm, SUPPORT_FROM_END_cm,
  drawnRailTilt_rad, railLocalToWorld, railLocalX_cm, type PresetName, type Slot,
} from './units.ts'

export { PRESET_NAMES }
export type { PresetName }

const FOV = 35
const TRANSITION_MS = 450
const easeOut = (t: number): number => 1 - Math.pow(1 - t, 3)
const SCALE_ACTIVE_MS = 3500
/** Where a click on a part opens: part id to panel id. */
const PART_PANEL: Record<string, string> = {
  rail: 'inventory', rackStand: 'inventory', standBase: 'inventory', receiver: 'inventory', cart: 'adjust', string: 'adjust', brassScrew: 'inventory',
  plasticScrews: 'masses', screws: 'inventory', level: 'adjust', markers: 'adjust', canister: 'masses', masses: 'masses', balance: 'instruments',
  springScale: 'instruments', scalePost: 'instruments', stopwatch: 'stopwatch',
}

export interface SceneOptions {
  initialPreset: PresetName
  onFail(reason: string): void
  onStatus(text: string): void
  openPanel?(panel: string): void
}

export interface Scene3D {
  update(): void
  setVisible(v: boolean): void
  setPreset(name: PresetName): void
  currentPreset(): PresetName | null
  focus(targets: string[] | null): void
  relabel(): void
  destroy(): void
}

export function createScene(container: HTMLElement, ctx: ViewContext, opts: SceneOptions): Scene3D {
  const a: Apparatus = ctx.apparatus
  const S = (): typeof strings.es => strings[ctx.lang()]
  const coarse = matchMedia('(pointer: coarse)').matches || innerWidth < 700

  // ---------- renderer ----------
  const renderer = new THREE.WebGLRenderer({ antialias: !coarse, alpha: false, powerPreference: 'high-performance' })
  renderer.setClearColor(0xdadce1, 1)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.toneMapping = THREE.NeutralToneMapping
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  const canvas = renderer.domElement
  canvas.tabIndex = 0
  canvas.setAttribute('role', 'application')
  canvas.setAttribute('aria-label', S().canvasLabel)
  container.append(canvas)
  const probe = document.createElement('span')
  probe.setAttribute('aria-hidden', 'true')
  probe.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;visibility:hidden'
  container.append(probe)
  const M: CoreMaterials = createCoreMaterials(probe)
  const kit: Kit = { M, textures: [], anisotropy: renderer.capabilities.getMaxAnisotropy() }

  // ---------- scene, camera, lights ----------
  const scene = new THREE.Scene()
  scene.background = M.tokens.bg.clone()
  renderer.setClearColor(M.tokens.bg, 1)
  const pmrem = new THREE.PMREMGenerator(renderer)
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environment = envTex
  scene.environmentIntensity = 0.75
  const camera = new THREE.PerspectiveCamera(FOV, 1.6, 1, 1200)
  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true
  controls.dampingFactor = 0.1
  controls.minDistance = 6
  controls.maxDistance = 420
  controls.maxPolarAngle = (89 * Math.PI) / 180
  controls.screenSpacePanning = false
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8f99, 0.7))
  const sun = new THREE.DirectionalLight(0xffffff, 1.8)
  sun.position.set(40, 160, 110)
  sun.target.position.set(80, -20, 0)
  sun.castShadow = true
  const sm = coarse ? 1024 : 2048
  sun.shadow.mapSize.set(sm, sm)
  Object.assign(sun.shadow.camera, { left: -130, right: 150, top: 110, bottom: -120, near: 20, far: 460 })
  sun.shadow.bias = -0.0004
  sun.shadow.normalBias = 0.06
  scene.add(sun, sun.target)

  // ---------- bench, legs, floor ----------
  const bench = new THREE.Mesh(new THREE.BoxGeometry(BENCH.width, BENCH.thickness, BENCH.depth), [M.tableSide, M.tableSide, M.table, M.tableSide, M.tableSide, M.tableSide])
  bench.position.set(BENCH.x, -BENCH.thickness / 2, BENCH.z)
  bench.receiveShadow = true
  tag(bench, 'bench')
  scene.add(bench)
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
    box(4, -FLOOR_Y_cm - BENCH.thickness, 4, M.aluDark, BENCH.x + sx * (BENCH.width / 2 - 4), (FLOOR_Y_cm - BENCH.thickness) / 2, BENCH.z + sz * (BENCH.depth / 2 - 4), scene)
  }
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(600, 400), M.floor)
  floor.rotation.x = -Math.PI / 2
  floor.position.set(BENCH.x + 40, FLOOR_Y_cm, 0)
  floor.receiveShadow = true
  tag(floor, 'floor')
  scene.add(floor)

  // ---------- render state ----------
  let needsRender = true
  let visible = true
  let dirty = true
  const requestRender = (): void => { needsRender = true }

  // ---------- models ----------
  const rail = buildRail(kit)
  scene.add(rail.root)
  const cart = buildCart(kit, DEFAULT_CART_DIMS)
  const base = buildBase(kit)
  const rack = buildRackStand(kit)
  const receiver = buildReceiver(kit)
  const level = buildLevel(kit)
  const stopwatch = buildStopwatch(kit)
  const canister = buildCanister(kit)
  const balance = buildBalance(kit)
  const post = buildScalePost(kit, SCALE_POST.height, SCALE_POST.armLength)
  const twoLeg = buildTwoLeg(kit)
  const coil = buildStringCoil(kit)
  const brass = buildBrassScrew(kit)
  const plastics = buildPlasticScrewBag(kit)
  const tapeRoll = new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.6, 12, 32), M.tape)
  tapeRoll.rotation.x = Math.PI / 2
  tapeRoll.position.y = 0.6
  tapeRoll.castShadow = true
  const tapeGroup = new THREE.Group(); tapeGroup.add(tapeRoll); tag(tapeGroup, 'markers')
  const marble = new THREE.Mesh(new THREE.SphereGeometry(0.8, 18, 14), M.steel); marble.castShadow = true; tag(marble, 'marble')
  const mass50 = new THREE.Group(); { const m = cyl(2.0, 2.0, 2.2, M.steel, mass50, 28); m.position.y = 1.1; tag(mass50, 'mass50') }
  const scales: Record<SpringScaleId, ReturnType<typeof buildSpringScale>> = { '1N': buildSpringScale(kit, SPRING_SCALES['1N']), '2N': buildSpringScale(kit, SPRING_SCALES['2N']) }
  for (const id of ['1N', '2N'] as const) tag(scales[id].root, 'springScale')
  const looseMasses = Array.from({ length: 4 }, () => buildMass(kit))
  looseMasses.forEach((m) => tag(m, 'masses'))
  const cartMasses = Array.from({ length: 4 }, () => { const g = new THREE.Group(); const m = buildMass(kit); g.add(m); const s = screwHead(kit); s.rotation.x = -Math.PI / 2; s.position.set(0, MASS_H + 0.2, 0); g.add(s); return g })
  const flags = (['start', 'end'] as const).map(() => { const f = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.06, RAIL.halfW * 2 + 0.2), M.tape); f.castShadow = false; return f })
  const flagPoles = (['start', 'end'] as const).map(() => { const f = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.04), M.tape); return f })
  const supportBlock = box(6, 1, 4, M.aluDark, 0, 0, 0, scene)
  const stringMat = new THREE.LineBasicMaterial({ color: 0x20242b })
  const stringGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()])
  const stringLine = new THREE.Line(stringGeo, stringMat)
  stringLine.frustumCulled = false
  const pile = new THREE.Group(); tag(pile, 'screws'); let pileCount = -1
  const clampScrews = new THREE.Group(), recvScrews = new THREE.Group()
  for (const dx of [-1.6, 1.6]) { const s = screwHead(kit); s.position.set(SUPPORT_FROM_END_cm + dx, -1.3, RAIL.halfW + 0.4); clampScrews.add(s) }
  for (const x of [-2.8, -0.6]) { const s = screwHead(kit); s.position.set(x, 0.2, 2.2); recvScrews.add(s) }
  rail.root.add(clampScrews)
  receiver.add(recvScrews)
  for (const g of [clampScrews, recvScrews]) tag(g, 'screws')
  rail.root.add(...flags, ...flagPoles)
  scene.add(base, rack.root, receiver, level.root, stopwatch.root, canister.root, balance, post, twoLeg.root, coil, brass, plastics, tapeGroup, marble, mass50, pile, stringLine, ...looseMasses, scales['1N'].root, scales['2N'].root)
  rail.root.add(cart.root)
  for (const m of cartMasses) cart.root.add(m)

  // ---------- placement ----------
  const place = (o: THREE.Object3D, s: Slot, y = 0): void => { o.position.set(s.x, y, s.z); o.rotation.set(0, s.rotY, 0) }
  const itemOn = (id: ItemId): boolean => a.hasItem(id)
  let weighingUntil = 0
  let lastScale: SpringScaleId = '1N'
  const offEv = a.on((e) => {
    dirty = true
    if (e.type === 'forceRead') { weighingUntil = performance.now() + SCALE_ACTIVE_MS; lastScale = e.scaleId }
  })
  const _v = new THREE.Vector3()

  /** Static layout from the apparatus state (joints, items, level, marks). */
  function apply(): void {
    const s = a.getState()
    const geo = s.geometry
    const zeroAtStand = (s.joints.rackClamp ?? 'E1') === 'E1'
    const clampH = geo ? geo.standHeight_m * 100 : (0.06 + s.rack_mm / 1000) * 100
    const tilt = geo ? drawnRailTilt_rad(geo.standHeight_m, geo.receiverHeight_m, SUPPORT_SEPARATION_m) : 0
    // rail
    rail.root.visible = itemOn('rail')
    if (s.joints.rackClamp !== null) {
      rail.root.position.set(-SUPPORT_FROM_END_cm, clampH, 0)
      rail.root.rotation.set(0, 0, tilt)
    } else {
      rail.root.position.set(10, 2, 28); rail.root.rotation.set(0, 0, 0)
    }
    rail.update(zeroAtStand)
    // stand and base
    base.visible = itemOn('standBase'); rack.root.visible = itemOn('rackStand')
    if (s.joints.standBase) { base.position.set(0, 0, 0); rack.root.position.set(0, 0, 0); rack.root.rotation.set(0, 0, 0) } else { place(base, STAGING.standBase); place(rack.root, STAGING.rackStand) }
    rack.update(s.joints.rackClamp !== null ? clampH : 6, s.joints.rackClamp !== null ? tilt : 0)
    clampScrews.visible = s.joints.rackClamp !== null
    // receiver and its support
    receiver.visible = itemOn('receiver')
    if (s.joints.receiver) {
      rail.root.add(receiver)
      receiver.position.set(RAIL.length, 0, 0); receiver.rotation.set(0, 0, 0)
      const w = railLocalToWorld([rail.root.position.x, rail.root.position.y, 0], tilt, [RAIL.length - 4, -RAIL.height, 0])
      supportBlock.visible = true
      const h = Math.max(0.5, w[1])
      supportBlock.scale.set(1, h, 1)
      supportBlock.position.set(w[0], h / 2, 0)
    } else {
      scene.add(receiver); place(receiver, STAGING.receiver); supportBlock.visible = false
    }
    recvScrews.visible = s.joints.receiver
    // small things
    const free = itemOn('screws') ? s.screwsAvailable : 0
    if (free !== pileCount) { pile.clear(); pile.add(screwPile(kit, free)); pileCount = free }
    pile.visible = itemOn('screws'); place(pile, STAGING.screws)
    level.root.visible = itemOn('level')
    if (s.level.placement === 'rail' && itemOn('rail')) { rail.root.add(level.root); level.root.position.set(60, 0, 0); level.root.rotation.set(0, 0, 0) }
    else { scene.add(level.root); if (s.level.placement === 'table') { level.root.position.set(60, 0, -14); level.root.rotation.set(0, 0, 0) } else place(level.root, STAGING.level) }
    level.setBubble(a.levelReading().bubble_mm)
    stopwatch.root.visible = itemOn('stopwatch'); place(stopwatch.root, STAGING.stopwatch)
    tapeGroup.visible = itemOn('markers'); place(tapeGroup, STAGING.markers)
    balance.visible = itemOn('balance'); place(balance, STAGING.balance)
    post.visible = itemOn('dynamometer') || itemOn('dynamometer2N'); place(post, SCALE_POST as unknown as Slot)
    twoLeg.root.visible = itemOn('twoLegStand'); place(twoLeg.root, STAGING.twoLegStand)
    marble.visible = itemOn('marble'); place(marble, STAGING.marble, 0.8)
    mass50.visible = itemOn('mass50'); place(mass50, STAGING.mass50)
    plastics.visible = itemOn('plasticScrews') && s.plasticScrewsUsed === 0; place(plastics, STAGING.plasticScrews)
    // marks
    ;(['start', 'end'] as const).forEach((k, i) => {
      const pos = k === 'start' ? s.marks.start_mm : s.marks.end_mm
      const on = pos !== null && itemOn('rail')
      flags[i]!.visible = on; flagPoles[i]!.visible = on
      if (pos !== null) {
        const x = railLocalX_cm(pos, zeroAtStand)
        flags[i]!.position.set(x, 0.03, 0)
        flagPoles[i]!.position.set(x, -0.9, RAIL.halfW + 0.03)
        flagPoles[i]!.scale.set(1, 4, 1)
      }
    })
    // masses
    const hasMasses = itemOn('masses')
    const cartCount = { n: 0 }
    const nCan = itemOn('canister') ? s.masses.filter((m) => m === 'canister').length : 0
    canister.setMasses(hasMasses ? nCan : 0)
    let benchIdx = 0
    s.masses.forEach((loc, i) => {
      const loose = looseMasses[i]!, onCart = cartMasses[i]!
      onCart.visible = hasMasses && loc === 'cart'
      if (onCart.visible) { onCart.position.set(-2.4 - cartCount.n * 2.4, 3.6, 0); cartCount.n++ }
      const inCan = loc === 'canister' && itemOn('canister')
      loose.visible = hasMasses && !inCan && loc !== 'cart'
      if (loose.visible) {
        const slot = loc === 'bench' ? BENCH_MASS_SLOT : STAGING.masses
        loose.position.set(slot.x + (loc === 'bench' ? benchIdx++ * 3 : i * 3), 0, slot.z); loose.rotation.set(0, 0, 0)
      }
    })
    // DigiCart and brass screw
    cart.root.visible = itemOn('cart')
    if (s.cart.placed) { rail.root.add(cart.root) } else { scene.add(cart.root); place(cart.root, STAGING.cart, 0) }
    brass.visible = itemOn('brassScrew')
    if (s.joints.stringCart && itemOn('cart')) { cart.root.add(brass); brass.position.set(0.1, DEFAULT_CART_DIMS.bodyBottom + DEFAULT_CART_DIMS.bodyHeight - 0.3, 0); brass.rotation.set(0, 0, -Math.PI / 2); brass.scale.setScalar(0.7) }
    else { scene.add(brass); brass.scale.setScalar(1); place(brass, STAGING.brassScrew) }
    coil.visible = itemOn('string') && !(s.joints.stringCart && s.joints.stringCanister && s.joints.stringPulley); place(coil, STAGING.string)
    for (const id of ['1N', '2N'] as const) { const it = id === '1N' ? 'dynamometer' : 'dynamometer2N'; scales[id].root.visible = itemOn(it) }
    syncCart()
    applyHighlight()
  }

  /** Per-frame: the cart along the rail, the canister and the string, the scale. Returns true while something moves. */
  function syncCart(): boolean {
    const s = a.getState()
    const st = a.cartState(ctx.now())
    const zeroAtStand = (s.joints.rackClamp ?? 'E1') === 'E1'
    let moving = false
    let cartFrontX = 0
    if (s.cart.placed && st.frontRailPos_mm !== null) {
      cartFrontX = railLocalX_cm(st.frontRailPos_mm, zeroAtStand)
      cart.root.position.set(cartFrontX, 0, 0); cart.root.rotation.set(0, 0, 0)
      cart.roll(cartFrontX)
      moving = st.phase === 'rolling' || st.phase === 'coasting'
    }
    const connected = s.joints.stringCart && s.joints.stringCanister && s.joints.stringPulley && s.joints.receiver && itemOn('string') && s.cart.placed
    // the canister: hanging from the string, on the dynamometer, or on the bench
    const weighing = performance.now() < weighingUntil && (itemOn('dynamometer') || itemOn('dynamometer2N')) && itemOn('canister')
    canister.root.visible = itemOn('canister')
    stringLine.visible = false
    scene.add(canister.root)
    const pulleyLocal = new THREE.Vector3(0.9, 3.6, 0)
    if (weighing) {
      const sc = scales[a.defaultScale() === '2N' && !itemOn('dynamometer') ? '2N' : lastScale]
      const last = a.lastForceReading()
      sc.set(last ? last.extension_m : 0)
      const hookY = SCALE_POST.height - 2.2 - sc.hookPosition().x
      canister.root.position.set(SCALE_POST.x - SCALE_POST.armLength, hookY - KNOT_H_cm, SCALE_POST.z); canister.root.rotation.set(0, 0, 0)
      moving = true
    } else if (connected) {
      const pw = receiver.localToWorld(pulleyLocal.clone())
      const recvTop = railLocalToWorld([rail.root.position.x, rail.root.position.y, 0], rail.root.rotation.z, [RAIL.length, 0, 0])
      const hang = (a.hangBelowPulley_m() ?? 0.05) * 100 + st.canisterDrop_m * 100
      // the canister hangs past the bench edge; its height follows the apparatus drop, and it rests on the floor when the apparatus says so
      const knotY = st.canisterOnFloor ? FLOOR_Y_cm + KNOT_H_cm : Math.max(recvTop[1] + STRING_ABOVE_RAIL_cm - hang, FLOOR_Y_cm + KNOT_H_cm)
      const cx = pw.x + 2.4
      canister.root.position.set(cx, knotY - KNOT_H_cm, pw.z); canister.root.rotation.set(0, 0, 0)
      const front = cart.root.localToWorld(new THREE.Vector3(0.2, DEFAULT_CART_DIMS.bodyBottom + DEFAULT_CART_DIMS.bodyHeight - 0.3, 0))
      const pts = [front, pw, new THREE.Vector3(cx, pw.y - 1.2, pw.z), new THREE.Vector3(cx, knotY, pw.z)]
      stringGeo.setFromPoints(pts)
      stringGeo.attributes.position!.needsUpdate = true
      stringLine.visible = true
    } else {
      place(canister.root, STAGING.canister)
    }
    // scales hang from the post
    for (const id of ['1N', '2N'] as const) {
      const sc = scales[id]
      const it = id === '1N' ? 'dynamometer' : 'dynamometer2N'
      sc.root.rotation.set(0, 0, -Math.PI / 2)
      sc.root.position.set(SCALE_POST.x - SCALE_POST.armLength + (id === '2N' && itemOn('dynamometer') ? 4 : 0), SCALE_POST.height - 2.2, SCALE_POST.z)
      if (!(weighing && id === (a.defaultScale() === '2N' && !itemOn('dynamometer') ? '2N' : lastScale))) sc.set(0)
      sc.root.visible = itemOn(it)
    }
    if (moving || lastMoving) requestRender()
    lastMoving = moving
    return moving
  }
  let lastMoving = false

  // ---------- highlight (the checklist's "show me") ----------
  const outlineMat = createOutlineMaterial(0.9, 0.35)
  const outlineMeshes: THREE.Mesh[] = []
  let focusIds: string[] | null = null
  const partRoot = (id: string): THREE.Object3D | null => {
    switch (id) {
      case 'rail': return rail.root
      case 'rackStand': return rack.root
      case 'standBase': return base
      case 'receiver': return receiver
      case 'cart': return cart.root
      case 'level': return level.root
      case 'stopwatch': return stopwatch.root
      case 'markers': return tapeGroup
      case 'screws': return pile
      case 'canister': return canister.root
      case 'masses': return looseMasses[0]!
      case 'balance': return balance
      case 'dynamometer': return scales['1N'].root
      case 'string': return coil
      case 'brassScrew': return brass
      case 'plasticScrews': return plastics
      default: return null
    }
  }
  function applyHighlight(): void {
    for (const m of outlineMeshes) m.parent?.remove(m)
    outlineMeshes.length = 0
    for (const id of focusIds ?? []) {
      const r = partRoot(id)
      if (!r || !r.visible) continue
      r.traverse((o) => {
        const m = o as THREE.Mesh
        if (!m.isMesh || m.userData.outline || m.material === M.glass) return
        const h = new THREE.Mesh(m.geometry, outlineMat)
        h.userData.outline = true
        m.add(h)
        outlineMeshes.push(h)
      })
    }
    requestRender()
  }
  let focusTimer = 0

  // ---------- camera presets ----------
  const poseFor = (name: PresetName): { target: THREE.Vector3; pos: THREE.Vector3 } => {
    const v = name === 'overview' && camera.aspect < 1 ? PORTRAIT_OVERVIEW : PRESET_VIEWS[name]
    const f = fitView(boxCorners(v.min, v.max) as Vec[], v.azimuth, v.elevation, FOV, camera.aspect, name === 'overview' ? 0.04 : 0.1)
    return { target: new THREE.Vector3(...f.target), pos: new THREE.Vector3(...f.position) }
  }
  let preset: PresetName | null = null
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
  controls.addEventListener('start', () => { anim = null; preset = null })
  controls.addEventListener('change', requestRender)

  // ---------- click on a part: open its panel ----------
  const ray = new THREE.Raycaster()
  let down: { x: number; y: number } | null = null
  const onDown = (e: PointerEvent): void => { down = { x: e.clientX, y: e.clientY } }
  const onUp = (e: PointerEvent): void => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) { down = null; return }
    down = null
    const r = canvas.getBoundingClientRect()
    ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera)
    for (const hit of ray.intersectObjects(scene.children, true)) {
      let o: THREE.Object3D | null = hit.object
      while (o) {
        const id = o.userData.partId as string | undefined
        if (id && PART_PANEL[id]) { opts.openPanel?.(PART_PANEL[id]!); return }
        o = o.parent
      }
    }
  }
  canvas.addEventListener('pointerdown', onDown)
  canvas.addEventListener('pointerup', onUp)

  // ---------- size, theme, visibility ----------
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
  const onTheme = (): void => {
    M.refresh()
    ;(scene.background as THREE.Color).copy(M.tokens.bg)
    outlineMat.color.copy(M.tokens.accent)
    // the string reads on both the light and the dark stage
    const bg = M.tokens.bg
    stringMat.color.set(bg.r * 0.3 + bg.g * 0.59 + bg.b * 0.11 > 0.5 ? 0x20242b : 0xe6e8ee)
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
  setPreset(opts.initialPreset)
  anim = null
  applyPose(poseFor(opts.initialPreset))
  onTheme()
  void RAIL_LENGTH_m; void CART_LENGTH_m; void rbox; void _v

  return {
    update() {
      if (document.hidden || !visible) return
      const now = performance.now()
      if (dirty) { dirty = false; apply() } else syncCart()
      if (a.getState().stopwatch.running && a.hasItem('stopwatch')) { stopwatch.setText(lcdText(a.stopwatchDisplay_s(ctx.now()))); requestRender() }
      if (anim) {
        const k = Math.min(1, (now - anim.t0) / TRANSITION_MS)
        const e = easeOut(k)
        controls.target.lerpVectors(anim.fromT, anim.toT, e)
        camera.position.lerpVectors(anim.fromP, anim.toP, e)
        camera.lookAt(controls.target)
        if (k >= 1) anim = null
        needsRender = true
      }
      if (weighingUntil > 0 && now > weighingUntil) { weighingUntil = 0; dirty = true }
      if (controls.update()) needsRender = true
      if (needsRender) {
        needsRender = false
        renderer.render(scene, camera)
      }
    },
    setVisible(v) { visible = v; if (v) { resize(); dirty = true; requestRender() } },
    setPreset,
    currentPreset: () => preset,
    focus(list) {
      focusIds = list && list.length ? list : null
      window.clearTimeout(focusTimer)
      applyHighlight()
      if (focusIds) focusTimer = window.setTimeout(() => { focusIds = null; applyHighlight() }, 4000)
    },
    relabel() { canvas.setAttribute('aria-label', S().canvasLabel); requestRender() },
    destroy() {
      window.clearTimeout(focusTimer)
      offEv()
      controls.dispose()
      ro.disconnect(); mo.disconnect()
      scheme.removeEventListener('change', onTheme)
      document.removeEventListener('visibilitychange', onVis)
      canvas.removeEventListener('webglcontextlost', onLost)
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointerup', onUp)
      const seen = new Set<THREE.Material>()
      scene.traverse((o) => {
        const m = o as THREE.Mesh
        if (m.geometry) m.geometry.dispose()
        const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : []
        for (const x of mats) if (!seen.has(x)) { seen.add(x); x.dispose() }
      })
      for (const t of kit.textures) t.dispose()
      outlineMat.dispose(); stringMat.dispose()
      M.dispose()
      envTex.dispose(); pmrem.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      canvas.remove(); probe.remove()
    },
  }
}
