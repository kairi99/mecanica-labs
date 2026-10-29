// Friction 3D side of the drag-and-drop setup: preview sizes and snap placement of each part, bench-part picking and the camera lock.
// Zone markers, the preview mesh and the pointer-to-table mapping are core (core/scene3d/dragdrop3d.ts); the decisions (which zone, which
// Apparatus call) are in views/dragdrop (snap.ts, drop.ts). Part of the lazy scene chunk.
import * as THREE from 'three'
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { ViewContext } from '../view.ts'
import type { CoreMaterials } from '../../../../core/scene3d/materials.ts'
import { createDragLayer } from '../../../../core/scene3d/dragdrop3d.ts'
import { PAPER } from '../dragdrop/layout.ts'
import { isPart, type PartId, type ZoneId } from '../dragdrop/snap.ts'
import type { StageAdapter } from '../dragdrop/controller.ts'
import { strings } from '../strings/dragdrop.ts'

/** Size of the preview block of each part, cm (w, h, d). A stand-in shape, not the real model. */
const DIMS: Record<PartId, [number, number, number]> = {
  paper: [PAPER.l, 0.3, PAPER.w], block: [6, 3, 4], scale1N: [19, 2.2, 2.2], scale2N: [19, 2.2, 2.2], masses50: [3.2, 0.9, 3.2],
  woodBar: [10, 1.5, 2.5], alBar: [10, 1.5, 2.5], ironBar: [10, 1.5, 2.5],
}

export interface DragDrop3D extends StageAdapter {
  /** Per frame; true while it animates (keeps the render loop going). */
  tick(now: number): boolean
  relabel(): void
  destroy(): void
}

export interface DragDrop3DDeps {
  ctx: ViewContext
  scene: THREE.Scene
  container: HTMLElement
  canvas: HTMLCanvasElement
  camera: THREE.PerspectiveCamera
  controls: OrbitControls
  M: Pick<CoreMaterials, 'ghost' | 'tokens'>
  /** Meshes and groups that can be picked; each carries `userData.partId` (a PartId) on itself or an ancestor. */
  pickables(): THREE.Object3D[]
  /** Hide this object while its part is carried (null: show it again). */
  setLifted(o: THREE.Object3D | null): void
  requestRender(): void
}

export function createDragDrop3D(d: DragDrop3DDeps): DragDrop3D {
  const { ctx, scene, container, canvas, camera, controls, M } = d
  const layer = createDragLayer({
    scene, container, canvas, camera, M, lang: ctx.lang, reducedMotion: ctx.reducedMotion, requestRender: d.requestRender,
    zoneLabel: (zone) => strings[ctx.lang()].zones[zone.id as ZoneId],
  })
  let pickedObj: THREE.Object3D | null = null

  /** The part under a client point and the object that stands for it, or null. */
  function pickAt(x: number, y: number): { part: PartId; obj: THREE.Object3D } | null {
    if (!layer.setRay(x, y)) return null
    const hits = layer.ray.intersectObjects(d.pickables(), true).filter((h) => {
      if (!(h.object as THREE.Mesh).isMesh || h.object.userData.overlay) return false
      for (let o: THREE.Object3D | null = h.object; o; o = o.parent) if (!o.visible) return false
      return true
    })
    const h0 = hits[0]
    if (!h0) return null
    for (let o: THREE.Object3D | null = h0.object; o; o = o.parent) {
      const id = o.userData.partId as string | undefined
      if (id && isPart(id)) return { part: id, obj: o }
    }
    return null
  }

  // A mouse press on a part starts a drag, not an orbit: keep the camera still from the first pixel (a touch swipe still orbits).
  const onDown = (e: PointerEvent): void => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return
    if (pickAt(e.clientX, e.clientY)) controls.enabled = false
  }
  const onUp = (): void => { controls.enabled = true }
  canvas.addEventListener('pointerdown', onDown, true)
  window.addEventListener('pointerup', onUp, true)
  window.addEventListener('pointercancel', onUp, true)

  return {
    probe: layer.probe,
    showZones: layer.showZones,
    showPreview(part, at, target) {
      if (!isPart(part)) return
      const dim = DIMS[part]
      let snapAt: THREE.Vector3 | null = null
      if (target?.kind === 'zone' && target.zone.id !== 'table') {
        const z = target.zone
        // a scale hooks by its hook end: its body extends from the block's hook toward +x
        const dx = part === 'scale1N' || part === 'scale2N' ? dim[0] / 2 : 0
        snapAt = new THREE.Vector3(z.cx + dx, z.cy + dim[1] / 2, z.cz)
      }
      layer.showPreview(dim, at, snapAt, target?.kind === 'tray')
    },
    hidePreview: layer.hidePreview,
    pickBenchPart(x, y) {
      const p = pickAt(x, y)
      pickedObj = p ? p.obj : null
      return p ? p.part : null
    },
    lift(part) {
      d.setLifted(part && pickedObj ? pickedObj : null)
      d.requestRender()
    },
    lockCamera(on) { controls.enabled = !on },
    refuse() { /* the shell toast shows the reason (a second card would show it twice) */ },
    placed() { /* nothing to remember */ },
    tick: layer.tick,
    relabel: layer.relabel,
    destroy() {
      canvas.removeEventListener('pointerdown', onDown, true)
      window.removeEventListener('pointerup', onUp, true)
      window.removeEventListener('pointercancel', onUp, true)
      layer.destroy()
      controls.enabled = true
    },
  }
}

