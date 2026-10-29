// MRUV 3D side of the drag-and-drop assembly: preview sizes and placement of each part, bench-part picking, camera lock and the
// level memory. Zone markers, the preview mesh and the pointer-to-table mapping are core (core/scene3d/dragdrop3d.ts); the decisions
// (which zone, which Apparatus call) are in views/dragdrop (snap.ts, drop.ts). Part of the lazy scene chunk.
import * as THREE from 'three'
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { Apparatus, ItemId } from '../../apparatus/index.ts'
import type { ViewContext } from '../view.ts'
import type { CardInfo } from '../../../../core/scene3d/types.ts'
import type { Materials } from './materials.ts'
import { CART } from './models.ts'
import { RAIL } from './units.ts'
import type { Target, ZoneId } from '../dragdrop/snap.ts'
import type { StageAdapter } from '../dragdrop/controller.ts'
import { createDragLayer } from '../../../../core/scene3d/dragdrop3d.ts'
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
  const layer = createDragLayer({
    scene, container, canvas, camera, M, lang: ctx.lang, reducedMotion: ctx.reducedMotion, requestRender: d.requestRender,
    zoneLabel: (zone) => strings[ctx.lang()].zones[zone.id as ZoneId],
    bandMargin_cm: 2.5,
  })
  let lifted: ItemId | null = null

  return {
    probe: layer.probe,
    showZones: layer.showZones,
    showPreview(part, at, target) {
      const dim = DIMS[part]
      let snapAt: THREE.Vector3 | null = null
      if (target?.kind === 'zone' && target.zone.id !== 'table') {
        const z = target.zone
        if (z.rail && target.along_cm !== null) {
          snapAt = new THREE.Vector3(z.rail.highX_cm + target.along_cm * z.rail.cos, z.cy + dim[1] / 2 + 1, z.cz)
        } else snapAt = new THREE.Vector3(z.cx, z.cy + dim[1] / 2 + (z.id === 'stand' || z.id === 'twoLeg' ? 0 : 0.5), z.cz)
      }
      layer.showPreview(dim, at, snapAt, target?.kind === 'tray')
    },
    hidePreview: layer.hidePreview,
    pickBenchPart(x, y) {
      if (!layer.setRay(x, y)) return null
      const hits = layer.ray.intersectObjects(d.pickables(), true).filter((h) => {
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
    tick: layer.tick,
    relabel: layer.relabel,
    destroy() {
      layer.destroy()
      controls.enabled = true
    },
  }
}
