// 3D side of the drag-and-drop assembly: snap-zone markers on the table, a translucent preview of the carried part, the pointer to table
// mapping and the bench-part picking. The decisions (which zone, which Apparatus call) are in views/dragdrop (snap.ts, drop.ts).
// Part of the lazy scene chunk.
import * as THREE from 'three'
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { Apparatus, ItemId } from '../../apparatus/index.ts'
import type { ViewContext } from '../view.ts'
import type { CardInfo } from '../../../../core/scene3d/types.ts'
import type { Materials } from './materials.ts'
import { CART } from './models.ts'
import { RAIL, TABLE } from './units.ts'
import { SNAP_CM, type Probe, type Target, type Zone, type ZoneId } from '../dragdrop/snap.ts'
import type { StageAdapter } from '../dragdrop/controller.ts'
import { strings } from '../strings/dragdrop.ts'

/** Size of the preview block of each part, cm (w, h, d). A stand-in shape, not the real model. */
const DIMS: Record<ItemId, [number, number, number]> = {
  rail: [RAIL.length, 2, 2.5], cart: [CART.length, 3.6, CART.width], rackStand: [3, 40, 3], standBase: [16, 1, 11], twoLegStand: [8, 22, 10],
  receiver: [9, 8, 6], screws: [6, 2, 6], level: [22, 2.5, 3.5], stopwatch: [9, 2.2, 7], tape: [8, 3, 8], markers: [6, 3, 6],
}
/** Scene part ids that stand for an inventory item (null: not a movable part). */
const ITEM_OF: Record<string, ItemId> = {
  rail: 'rail', rackStand: 'rackStand', standBase: 'standBase', twoLegStand: 'twoLegStand', receiver: 'receiver', pulley: 'receiver',
  rackKnob: 'rackStand', foot: 'twoLegStand', level: 'level', stopwatch: 'stopwatch', tapeMeasure: 'tape', markers: 'markers', screws: 'screws',
}

export interface DragDrop3D extends StageAdapter {
  /** Per frame; true while it animates (keeps the render loop going). */
  tick(now: number): boolean
  relabel(): void
  destroy(): void
}

export interface DragDrop3DDeps {
  a: Apparatus
  ctx: ViewContext
  scene: THREE.Scene
  container: HTMLElement
  canvas: HTMLCanvasElement
  camera: THREE.PerspectiveCamera
  controls: OrbitControls
  M: Materials
  pickables(): THREE.Object3D[]
  rootOf(part: ItemId): THREE.Object3D | null
  requestRender(): void
  refreshSoon(): void
  onCard(card: CardInfo | null): void
  setLevelX(x_cm: number): void
}

export function createDragDrop3D(d: DragDrop3DDeps): DragDrop3D {
  const { a, ctx, scene, container, canvas, camera, controls, M } = d
  const ray = new THREE.Raycaster()
  const ndc = new THREE.Vector2()
  const tmp = new THREE.Vector3()
  const group = new THREE.Group()
  group.visible = false
  scene.add(group)

  const mat = (opacity: number): THREE.MeshBasicMaterial =>
    new THREE.MeshBasicMaterial({ color: M.tokens.accent.clone(), transparent: true, opacity, depthTest: false, depthWrite: false, side: THREE.DoubleSide })
  const fillMat = mat(0.3), lineMat = mat(0.95), dimMat = mat(0.55), activeMat = mat(0.6)
  const mats = [fillMat, lineMat, dimMat, activeMat]
  const labels = document.createElement('div')
  labels.className = 'dd-zone-labels'
  labels.setAttribute('aria-hidden', 'true')
  container.append(labels)

  // preview: a translucent block per part, resized when the part changes
  const preview = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), M.ghost)
  preview.renderOrder = 7
  preview.visible = false
  preview.userData.overlay = true
  preview.raycast = () => {}
  scene.add(preview)
  let previewPart: ItemId | null = null

  interface Drawn { zone: Zone; node: THREE.Group; label: HTMLElement | null; fills: THREE.Mesh[]; pulse: boolean }
  let drawn: Drawn[] = []
  let key = ''
  let activeId: ZoneId | null = null
  let lifted: ItemId | null = null

  const clear = (): void => {
    for (const z of drawn) {
      group.remove(z.node)
      z.node.traverse((o) => { const m = o as THREE.Mesh; if (m.geometry) m.geometry.dispose() })
      z.label?.remove()
    }
    drawn = []
    key = ''
    group.visible = false
  }

  /** Four thin strips forming a rectangle outline of w x h cm in the xz plane. */
  const outline = (w: number, h: number, t: number, m: THREE.Material): THREE.Mesh[] => {
    const mk = (sx: number, sz: number, x: number, z: number): THREE.Mesh => {
      const g = new THREE.PlaneGeometry(sx, sz)
      g.rotateX(-Math.PI / 2)
      const mesh = new THREE.Mesh(g, m)
      mesh.position.set(x, 0, z)
      mesh.renderOrder = 6
      mesh.raycast = () => {}
      return mesh
    }
    return [mk(w, t, 0, -h / 2), mk(w, t, 0, h / 2), mk(t, h, -w / 2, 0), mk(t, h, w / 2, 0)]
  }

  const build = (zones: readonly Zone[]): void => {
    clear()
    const ang = a.railPoseNow().railAngle_rad
    for (const zone of zones) {
      const node = new THREE.Group()
      const fills: THREE.Mesh[] = []
      const line = zone.ready ? lineMat : dimMat
      if (zone.id === 'table') {
        node.position.set(zone.cx, 0.3, zone.cz)
        for (const s of outline(TABLE.width - 4, TABLE.depth - 4, 1.2, dimMat)) node.add(s)
      } else if (zone.hx > 0) {
        // along the rail: a band that follows its slope
        node.position.set(zone.cx, zone.cy + 0.4, zone.cz)
        node.rotation.z = -ang
        const w = zone.hx * 2 + 2, h = (RAIL.halfW + 2.5) * 2
        for (const s of outline(w, h, 0.9, line)) node.add(s)
        if (zone.ready) {
          const g = new THREE.PlaneGeometry(w, h); g.rotateX(-Math.PI / 2)
          const f = new THREE.Mesh(g, fillMat); f.renderOrder = 5; f.raycast = () => {}; node.add(f); fills.push(f)
        }
      } else {
        node.position.set(zone.cx, zone.cy + 0.4, zone.cz)
        const ring = new THREE.Mesh(new THREE.RingGeometry(SNAP_CM * 0.62, SNAP_CM * 0.78, 40), line)
        ring.rotation.x = -Math.PI / 2; ring.renderOrder = 6; ring.raycast = () => {}; node.add(ring)
        if (zone.ready) {
          const disc = new THREE.Mesh(new THREE.CircleGeometry(SNAP_CM * 0.6, 40), fillMat)
          disc.rotation.x = -Math.PI / 2; disc.renderOrder = 5; disc.raycast = () => {}; node.add(disc); fills.push(disc)
        }
      }
      group.add(node)
      let label: HTMLElement | null = null
      if (zone.id !== 'table') {
        label = document.createElement('div')
        label.className = `dd-zone-label${zone.ready ? '' : ' dd-early'}`
        label.textContent = strings[ctx.lang()].zones[zone.id]
        labels.append(label)
      }
      drawn.push({ zone, node, label, fills, pulse: zone.ready })
    }
    group.visible = drawn.length > 0
    key = zones.map((z) => `${z.id}${z.ready ? 1 : 0}${z.cx.toFixed(1)}${z.cy.toFixed(1)}`).join('|') + ctx.lang()
  }

  const toClient = (v: THREE.Vector3): { x: number; y: number; ok: boolean } => {
    const p = v.clone().project(camera)
    const r = canvas.getBoundingClientRect()
    const cr = container.getBoundingClientRect()
    return { x: r.left - cr.left + ((p.x + 1) / 2) * r.width, y: r.top - cr.top + ((1 - p.y) / 2) * r.height, ok: p.z < 1 }
  }
  const setRay = (cx: number, cy: number): boolean => {
    const r = canvas.getBoundingClientRect()
    if (r.width === 0 || r.height === 0 || cx < r.left || cx > r.right || cy < r.top || cy > r.bottom) return false
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1)
    ray.setFromCamera(ndc, camera)
    return true
  }
  const hasZones = (): boolean => drawn.length > 0

  const adapter: DragDrop3D = {
    probe(x, y): Probe | null {
      if (!setRay(x, y)) return null
      const origin = ray.ray.clone()
      return (zone) => {
        const hit = origin.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -zone.cy), tmp)
        return hit ? { x_cm: hit.x, z_cm: hit.z } : null
      }
    },
    showZones(zones, active) {
      activeId = active
      if (zones.length === 0) { clear(); d.requestRender(); return }
      const k = zones.map((z) => `${z.id}${z.ready ? 1 : 0}${z.cx.toFixed(1)}${z.cy.toFixed(1)}`).join('|') + ctx.lang()
      if (k !== key) build(zones)
      d.requestRender()
    },
    showPreview(part, at, target) {
      if (previewPart !== part) {
        previewPart = part
        const [w, h, dep] = DIMS[part]
        preview.scale.set(w, h, dep)
      }
      const dim = DIMS[part]
      let p: THREE.Vector3 | null = null
      if (target?.kind === 'zone' && target.zone.id !== 'table') {
        const z = target.zone
        if (z.rail && target.along_cm !== null) {
          p = new THREE.Vector3(z.rail.highX_cm + target.along_cm * z.rail.cos, z.cy + dim[1] / 2 + 1, z.cz)
        } else p = new THREE.Vector3(z.cx, z.cy + dim[1] / 2 + (z.id === 'stand' || z.id === 'twoLeg' ? 0 : 0.5), z.cz)
      } else if (setRay(at.x, at.y)) {
        const hit = ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), tmp)
        if (hit) p = new THREE.Vector3(hit.x, dim[1] / 2, hit.z)
      }
      preview.visible = p !== null && target?.kind !== 'tray'
      if (p) preview.position.copy(p)
      d.requestRender()
    },
    hidePreview() { preview.visible = false; previewPart = null; d.requestRender() },
    pickBenchPart(x, y) {
      if (!setRay(x, y)) return null
      const hits = ray.intersectObjects(d.pickables(), true).filter((h) => {
        if (!(h.object as THREE.Mesh).isMesh || h.object.userData.overlay) return false
        for (let o: THREE.Object3D | null = h.object; o; o = o.parent) if (!o.visible) return false
        return true
      })
      const h0 = hits[0]
      if (!h0) return null
      let part: string | null = null
      for (let o: THREE.Object3D | null = h0.object; o; o = o.parent) {
        const u = o.userData
        // the rack knob and the foot only adjust a mounted stand; on a loose one the knob is just part of the stand
        const st = a.getState()
        const looseHandle = (u.dragHandle === 'rack' && !st.joints.standBase) || (u.dragHandle === 'foot' && !st.joints.twoLegStand)
        if ((u.dragHandle && !looseHandle) || u.ghostId) return null
        if (u.partId && !part) part = u.partId as string
      }
      return part !== null && ITEM_OF[part] ? ITEM_OF[part]! : null
    },
    lift(part) {
      if (lifted) d.refreshSoon()
      lifted = part
      if (part) { const r = d.rootOf(part); if (r) r.visible = false }
      d.requestRender()
    },
    lockCamera(on) { controls.enabled = !on },
    refuse() { /* the shell toast shows the reason (a second card would show it twice) */ },
    placed(target: Target) {
      if (target.kind === 'zone' && target.zone.action.kind === 'placeLevel' && target.zone.action.where === 'rail' && target.along_cm !== null) d.setLevelX(target.along_cm)
    },
    tick(now) {
      if (!hasZones()) return false
      const reduced = ctx.reducedMotion()
      const k = reduced ? 1 : 1 + 0.07 * Math.sin(now / 240)
      for (const m of mats) m.color.copy(M.tokens.accent)
      camera.updateMatrixWorld()
      for (const z of drawn) {
        const on = z.zone.id === activeId
        z.node.scale.set(on ? 1.18 : z.pulse ? k : 1, 1, on ? 1.18 : z.pulse ? k : 1)
        if (z.label) {
          const c = toClient(tmp.set(z.zone.cx, z.zone.cy + 7, z.zone.cz))
          z.label.style.transform = `translate(${Math.round(c.x)}px, ${Math.round(c.y)}px) translate(-50%, -100%)`
          z.label.hidden = !c.ok
          z.label.classList.toggle('dd-active', on)
        }
      }
      return !reduced
    },
    relabel() {
      for (const z of drawn) if (z.label) z.label.textContent = strings[ctx.lang()].zones[z.zone.id]
    },
    destroy() {
      clear()
      scene.remove(group, preview)
      preview.geometry.dispose()
      for (const m of mats) m.dispose()
      labels.remove()
      controls.enabled = true
    },
  }
  return adapter
}
