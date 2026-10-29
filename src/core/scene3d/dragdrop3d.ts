// 3D helpers of the drag-and-drop assembly, free of any experiment: snap-zone markers on the table (rings, bands, outline, DOM labels),
// a translucent preview block that follows the pointer on the table plane, and the pointer-to-plane mapping (`probe`).
// Units are scene centimetres, y up, the table plane at y = 0. The experiment decides which zones exist (core/dragdrop/snap.ts),
// where the preview sits when snapped, and what the dragged part is (see experiments/mruv/views/scene3d/dragdrop3d.ts).
import * as THREE from 'three'
import type { Lang } from '../i18n.ts'
import type { CoreMaterials } from './materials.ts'
import type { Probe, Zone } from '../dragdrop/snap.ts'

export interface DragLayerDeps {
  scene: THREE.Scene
  /** Element the zone labels are positioned in (the canvas' positioned parent). */
  container: HTMLElement
  canvas: HTMLCanvasElement
  camera: THREE.PerspectiveCamera
  M: Pick<CoreMaterials, 'ghost' | 'tokens'>
  lang: () => Lang
  reducedMotion: () => boolean
  requestRender: () => void
  /** Text of the DOM label of a zone (area zones have none). */
  zoneLabel: (zone: Zone) => string
  /** Extra width of a band outline beyond the zone's half depth, cm (default 2.5). */
  bandMargin_cm?: number
}

export interface DragLayer {
  /** Per frame; true while it animates (keeps the render loop going). */
  tick(now: number): boolean
  /** Point the shared raycaster through a client point; false when it is outside the canvas. */
  setRay(clientX: number, clientY: number): boolean
  readonly ray: THREE.Raycaster
  probe(clientX: number, clientY: number): Probe | null
  showZones(zones: readonly Zone[], activeId: string | null): void
  /**
   * Preview block of size `dims` (w, h, d). `snapAt` is where the block's centre sits when snapped to a zone; null: it follows the
   * pointer on the table plane. `hidden` hides it (e.g. over the tray).
   */
  showPreview(dims: readonly [number, number, number], at: { x: number; y: number }, snapAt: THREE.Vector3 | null, hidden?: boolean): void
  hidePreview(): void
  relabel(): void
  destroy(): void
}

export function createDragLayer(d: DragLayerDeps): DragLayer {
  const { scene, container, canvas, camera, M } = d
  const margin = d.bandMargin_cm ?? 2.5
  const ray = new THREE.Raycaster()
  const ndc = new THREE.Vector2()
  const tmp = new THREE.Vector3()
  const group = new THREE.Group()
  group.visible = false
  scene.add(group)

  const mat = (opacity: number): THREE.MeshBasicMaterial =>
    new THREE.MeshBasicMaterial({ color: M.tokens.accent.clone(), transparent: true, opacity, depthTest: false, depthWrite: false, side: THREE.DoubleSide })
  const fillMat = mat(0.3), lineMat = mat(0.95), dimMat = mat(0.55)
  const mats = [fillMat, lineMat, dimMat, mat(0.6)]
  const labels = document.createElement('div')
  labels.className = 'dd-zone-labels'
  labels.setAttribute('aria-hidden', 'true')
  container.append(labels)

  const preview = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), M.ghost)
  preview.renderOrder = 7
  preview.visible = false
  preview.userData.overlay = true
  preview.raycast = () => {}
  scene.add(preview)
  let previewDims = ''

  interface Drawn { zone: Zone; node: THREE.Group; label: HTMLElement | null; pulse: boolean }
  let drawn: Drawn[] = []
  let key = ''
  let activeId: string | null = null

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

  const keyOf = (zones: readonly Zone[]): string =>
    zones.map((z) => `${z.id}${z.ready ? 1 : 0}${z.cx.toFixed(1)}${z.cy.toFixed(1)}${(z.tilt_rad ?? 0).toFixed(3)}`).join('|') + d.lang()

  const build = (zones: readonly Zone[]): void => {
    clear()
    for (const zone of zones) {
      const node = new THREE.Group()
      const line = zone.ready ? lineMat : dimMat
      if (zone.kind === 'area') {
        node.position.set(zone.cx, zone.cy + 0.3, zone.cz)
        for (const s of outline(zone.hx * 2 - 4, zone.hz * 2 - 4, 1.2, dimMat)) node.add(s)
      } else if (zone.kind === 'band') {
        // along a rail: a band that follows its slope
        node.position.set(zone.cx, zone.cy + 0.4, zone.cz)
        node.rotation.z = -(zone.tilt_rad ?? 0)
        const w = zone.hx * 2 + 2, h = (zone.hz + margin) * 2
        for (const s of outline(w, h, 0.9, line)) node.add(s)
        if (zone.ready) {
          const g = new THREE.PlaneGeometry(w, h); g.rotateX(-Math.PI / 2)
          const f = new THREE.Mesh(g, fillMat); f.renderOrder = 5; f.raycast = () => {}; node.add(f)
        }
      } else {
        node.position.set(zone.cx, zone.cy + 0.4, zone.cz)
        const ring = new THREE.Mesh(new THREE.RingGeometry(zone.snap_cm * 0.62, zone.snap_cm * 0.78, 40), line)
        ring.rotation.x = -Math.PI / 2; ring.renderOrder = 6; ring.raycast = () => {}; node.add(ring)
        if (zone.ready) {
          const disc = new THREE.Mesh(new THREE.CircleGeometry(zone.snap_cm * 0.6, 40), fillMat)
          disc.rotation.x = -Math.PI / 2; disc.renderOrder = 5; disc.raycast = () => {}; node.add(disc)
        }
      }
      group.add(node)
      let label: HTMLElement | null = null
      if (zone.kind !== 'area') {
        label = document.createElement('div')
        label.className = `dd-zone-label${zone.ready ? '' : ' dd-early'}`
        label.textContent = d.zoneLabel(zone)
        labels.append(label)
      }
      drawn.push({ zone, node, label, pulse: zone.ready })
    }
    group.visible = drawn.length > 0
    key = keyOf(zones)
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

  return {
    ray,
    setRay,
    probe(x, y) {
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
      if (keyOf(zones) !== key) build(zones)
      d.requestRender()
    },
    showPreview(dims, at, snapAt, hidden = false) {
      const k = dims.join(',')
      if (previewDims !== k) { previewDims = k; preview.scale.set(dims[0], dims[1], dims[2]) }
      let p: THREE.Vector3 | null = snapAt
      if (!p && setRay(at.x, at.y)) {
        const hit = ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), tmp)
        if (hit) p = new THREE.Vector3(hit.x, dims[1] / 2, hit.z)
      }
      preview.visible = p !== null && !hidden
      if (p) preview.position.copy(p)
      d.requestRender()
    },
    hidePreview() { preview.visible = false; previewDims = ''; d.requestRender() },
    tick(now) {
      if (drawn.length === 0) return false
      const reduced = d.reducedMotion()
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
      for (const z of drawn) if (z.label) z.label.textContent = d.zoneLabel(z.zone)
    },
    destroy() {
      clear()
      scene.remove(group, preview)
      preview.geometry.dispose()
      for (const m of mats) m.dispose()
      labels.remove()
    },
  }
}
