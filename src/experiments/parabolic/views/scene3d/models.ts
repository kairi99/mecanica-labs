// Models only the projectile bench has: the two balls, the paper sheets and their dots, the rail mark flags, the table with its
// edge, the floor and the plumb cross. The rail, stands, level, stopwatch and tape measure come from core/scene3d/models.ts.
// 1 unit = 1 cm, y up. The table top is y = 0.
import * as THREE from 'three'
import { box, canvasTexture, cyl, FONT, tag, type Kit } from '../../../../core/scene3d/models.ts'
import { PAPER_THICKNESS_m, type BallId } from '../../apparatus/index.ts'
import type { Materials } from './materials.ts'
import { CROSS_ARM_cm, FLOOR, MARK_HIT_cm, TABLE } from './units.ts'

export type PKit = Kit<Materials>

export { box, cyl, tag, FONT }

// ---- balls -------------------------------------------------------------------------------------------------------------
export interface BallModel {
  /** Placed at the ball centre. */
  root: THREE.Group
  /** Turns with the rolling (rotation about z). */
  spin: THREE.Group
  radius_cm: number
}
const BALL_R_cm: Record<BallId, number> = { marble: 0.8, pingpong: 2.0 }

export function buildBall(kit: PKit, id: BallId): BallModel {
  const { M } = kit
  const R = BALL_R_cm[id]
  const root = new THREE.Group()
  const spin = new THREE.Group()
  root.add(spin)
  if (id === 'marble') {
    // glass marble: translucent bluish-green shell around a coloured twist, so its spin can be seen
    const shell = new THREE.Mesh(new THREE.SphereGeometry(R, 32, 20), M.marbleGlass)
    shell.castShadow = true
    shell.renderOrder = 2
    const tex = canvasTexture(kit, 256, 128, (c) => {
      c.fillStyle = '#2a8fa6'; c.fillRect(0, 0, 256, 128)
      c.fillStyle = '#f4f1e6'
      for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(i * 64, 0); c.bezierCurveTo(i * 64 + 40, 40, i * 64 - 10, 90, i * 64 + 30, 128); c.lineTo(i * 64 + 48, 128); c.bezierCurveTo(i * 64 + 10, 90, i * 64 + 60, 40, i * 64 + 16, 0); c.fill() }
      c.fillStyle = '#e8a33a'
      for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(i * 64 + 32, 64, 9, 0, Math.PI * 2); c.fill() }
    })
    const core = new THREE.Mesh(new THREE.SphereGeometry(R * 0.7, 24, 16), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.35, metalness: 0 }))
    spin.add(core, shell)
    tag(root, 'marble', { dragHandle: 'ball' })
  } else {
    // ping-pong ball: matte white with a printed ring and dots (no brand), thin seam
    const tex = canvasTexture(kit, 256, 128, (c) => {
      c.fillStyle = '#fbfaf6'; c.fillRect(0, 0, 256, 128)
      c.strokeStyle = '#34383f'; c.lineWidth = 5
      c.beginPath(); c.arc(64, 64, 22, 0, Math.PI * 2); c.stroke()
      c.fillStyle = '#34383f'
      for (const [x, y] of [[64, 64], [192, 40], [200, 88], [150, 64]] as const) { c.beginPath(); c.arc(x, y, 5, 0, Math.PI * 2); c.fill() }
      c.fillStyle = '#d9d8d2'; c.fillRect(0, 62, 256, 3)
    })
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(R, 40, 24), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, metalness: 0 }))
    mesh.castShadow = true
    spin.add(mesh)
    tag(root, 'pingPong', { dragHandle: 'ball' })
  }
  return { root, spin, radius_cm: R }
}

// ---- paper -------------------------------------------------------------------------------------------------------------
export type SheetKind = 'bond' | 'carbon'
export const SHEET_THICK_cm = PAPER_THICKNESS_m * 100
/** A4 sheet lying flat: long side along x, centred on the origin, bottom face at y = 0. Rotate the group about y to turn it. */
export function buildSheet(kit: PKit, kind: SheetKind): THREE.Group {
  const { M } = kit
  const g = new THREE.Group()
  // the bond sheet is drawn 3 mm larger all round so its white edge shows under a carbon sheet of the same size
  const sheet = kind === 'bond' ? box(30.3, SHEET_THICK_cm, 21.6, M.paper, 0, SHEET_THICK_cm / 2, 0, g) : box(29.7, SHEET_THICK_cm, 21, M.carbon, 0, SHEET_THICK_cm / 2, 0, g)
  sheet.castShadow = false
  sheet.userData.dragHandle = 'sheet'
  tag(g, kind, { dragHandle: 'sheet' })
  return g
}

/** Dot of a carbon mark: dark disc with a light ring so it reads on the dark carbon; plus an invisible hit disc for taps. */
export function buildMarkDot(kit: PKit, d_cm: number, darkness: number, carbonId: string): THREE.Group {
  const { M } = kit
  const g = new THREE.Group()
  const r = d_cm / 2
  const dotMat = M.markDot.clone()
  dotMat.opacity = 0.35 + 0.65 * Math.min(1, Math.max(0, darkness))
  const dot = new THREE.Mesh(new THREE.CircleGeometry(r, 20), dotMat)
  dot.rotation.x = -Math.PI / 2
  dot.renderOrder = 5
  const ring = new THREE.Mesh(new THREE.RingGeometry(r * 1.05, r * 1.55, 24), M.markRing)
  ring.rotation.x = -Math.PI / 2
  ring.renderOrder = 4
  const hit = new THREE.Mesh(new THREE.CircleGeometry(MARK_HIT_cm, 12), new THREE.MeshBasicMaterial({ visible: false }))
  hit.rotation.x = -Math.PI / 2
  hit.position.y = 0.02
  g.add(ring, dot, hit)
  tag(g, 'carbonMark', { carbonId })
  return g
}

/** Plumb cross on the floor at the origin of the group with a thin plumb line up to the table edge (y = height_cm). */
export function buildPlumb(kit: PKit): { root: THREE.Group; setHeight(h_cm: number): void } {
  const { M } = kit
  const root = new THREE.Group()
  tag(root, 'edgeProjection')
  const a = box(CROSS_ARM_cm * 2, 0.06, 0.16, M.plumb, 0, 0.05, 0, root)
  const b = box(0.16, 0.06, CROSS_ARM_cm * 2, M.plumb, 0, 0.05, 0, root)
  a.castShadow = false; b.castShadow = false
  const line = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1, 6), M.plumb)
  root.add(line)
  const bob = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.8, 8), M.plumb)
  bob.rotation.x = Math.PI
  root.add(bob)
  return {
    root,
    setHeight(h) {
      line.scale.y = h
      line.position.y = h / 2
      bob.position.y = 0.4
    },
  }
}

// ---- rail marks --------------------------------------------------------------------------------------------------------
export const FLAG = { w: 4.0, h: 2.0 } as const
/** Small tape flag with the distance from the low tip in cm, stuck on the front face of the rail. */
export function railFlag(kit: PKit, text: string, cache: Map<string, THREE.Material>): THREE.Mesh {
  let mat = cache.get(text)
  if (!mat) {
    const tex = canvasTexture(kit, 256, 128, (c) => {
      c.fillStyle = '#f2b01e'; c.fillRect(0, 0, 256, 128)
      c.fillStyle = '#1b1608'
      c.fillRect(124, 0, 8, 14); c.fillRect(124, 114, 8, 14) // tick: the exact position of the mark
      let size = 100
      c.font = `800 ${size}px ${FONT}`
      while (c.measureText(text).width > 232 && size > 40) { size -= 6; c.font = `800 ${size}px ${FONT}` }
      c.textAlign = 'center'; c.textBaseline = 'middle'
      c.fillText(text, 128, 70)
    })
    mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })
    cache.set(text, mat)
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(FLAG.w, FLAG.h), mat)
  m.receiveShadow = true
  return m
}

// ---- table and floor -----------------------------------------------------------------------------------------------------
export interface TableModel {
  root: THREE.Group
  /** Slab with the pickable top. */
  top: THREE.Mesh
  /** Floor plane (pickable). */
  floor: THREE.Mesh
  /** Legs and floor follow the hidden table height (cm). */
  setHeight(H_cm: number): void
  /** Opacity of the two legs on the camera side of the edge plane (z > 0); the far legs stay solid. */
  setNearLegsOpacity(o: number): void
  dispose(): void
}
export function buildTable(kit: PKit): TableModel {
  const { M } = kit
  const root = new THREE.Group()
  const W = TABLE.x1 - TABLE.x0, D = TABLE.halfD * 2
  // faint 10 cm grid on the laminate (10 px per cm)
  const gridTex = canvasTexture(kit, Math.round(W * 10), Math.round(D * 10), (g) => {
    const w = g.canvas.width, h = g.canvas.height
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h)
    for (let x = 0; x <= W; x += 1) { g.strokeStyle = `rgba(0,0,0,${x % 10 === 0 ? 0.11 : 0.035})`; g.lineWidth = x % 10 === 0 ? 2 : 1; g.beginPath(); g.moveTo(w - x * 10, 0); g.lineTo(w - x * 10, h); g.stroke() }
    for (let z = 0; z <= D; z += 1) { g.strokeStyle = `rgba(0,0,0,${z % 10 === 0 ? 0.11 : 0.035})`; g.lineWidth = z % 10 === 0 ? 2 : 1; g.beginPath(); g.moveTo(0, z * 10); g.lineTo(w, z * 10); g.stroke() }
  })
  M.table.map = gridTex
  M.table.needsUpdate = true
  const top = new THREE.Mesh(new THREE.BoxGeometry(W, TABLE.thickness, D), [M.tableSide, M.tableSide, M.table, M.tableSide, M.tableSide, M.tableSide])
  top.position.set((TABLE.x0 + TABLE.x1) / 2, -TABLE.thickness / 2, 0)
  top.castShadow = true; top.receiveShadow = true
  tag(top, 'table')
  root.add(top)
  // the edge: a thin accent strip along the top face at x = 0 (the reference of every range)
  const strip = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, D), M.edge)
  strip.position.set(-0.25, 0.04, 0)
  tag(strip, 'edge')
  root.add(strip)
  // legs
  const legs: THREE.Mesh[] = []
  const nearLegMat = M.legs.clone()
  nearLegMat.transparent = true
  for (const x of [TABLE.x1 - TABLE.legInset, TABLE.x0 + TABLE.legInset]) for (const z of [-TABLE.halfD + TABLE.legInset, TABLE.halfD - TABLE.legInset]) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(TABLE.legSize, 1, TABLE.legSize), z > 0 ? nearLegMat : M.legs)
    l.position.set(x, 0, z)
    l.castShadow = true; l.receiveShadow = true
    root.add(l); legs.push(l)
  }
  // floor with a subtle 10 cm grid
  const tile = canvasTexture(kit, 512, 512, (g) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, 512, 512)
    for (let i = 0; i <= 10; i++) {
      g.strokeStyle = `rgba(0,0,0,${i === 0 || i === 10 ? 0.16 : 0.07})`; g.lineWidth = i === 0 || i === 10 ? 3 : 1.5
      g.beginPath(); g.moveTo(i * 51.2, 0); g.lineTo(i * 51.2, 512); g.stroke()
      g.beginPath(); g.moveTo(0, i * 51.2); g.lineTo(512, i * 51.2); g.stroke()
    }
  })
  tile.wrapS = tile.wrapT = THREE.RepeatWrapping
  const fw = FLOOR.x1 - FLOOR.x0, fd = FLOOR.halfZ * 2
  tile.repeat.set(fw / 100, fd / 100)
  tile.offset.set(0, 0)
  M.floor.map = tile
  M.floor.needsUpdate = true
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(fw, fd), M.floor)
  floor.rotation.x = -Math.PI / 2
  floor.position.x = (FLOOR.x0 + FLOOR.x1) / 2
  floor.receiveShadow = true
  tag(floor, 'floor')
  root.add(floor)
  return {
    root, top, floor,
    setHeight(H) {
      floor.position.y = -H
      for (const l of legs) { const h = Math.max(1, H - TABLE.thickness); l.scale.y = h; l.position.y = -TABLE.thickness - h / 2 }
    },
    setNearLegsOpacity(o) { nearLegMat.opacity = o; nearLegMat.depthWrite = o >= 1 },
    dispose() { nearLegMat.dispose(); M.table.map = null; M.floor.map = null },
  }
}
