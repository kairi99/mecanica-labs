// Practica 3 3D side of the drag-and-drop assembly: preview sizes and placement of each part, bench-part picking and the camera lock.
// Zone markers, the preview mesh and the pointer-to-table mapping are core (core/scene3d/dragdrop3d.ts); the decisions (which zone, which
// Apparatus call) are in views/dragdrop (snap.ts, drop.ts). Part of the lazy scene chunk.
import * as THREE from 'three'
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { Apparatus } from '../../apparatus/index.ts'
import type { ViewContext } from '../view.ts'
import type { CoreMaterials } from '../../../../core/scene3d/materials.ts'
import type { Target, ZoneId, PartId } from '../dragdrop/snap.ts'
import { MASS_PARTS } from '../dragdrop/snap.ts'
import type { StageAdapter } from '../dragdrop/controller.ts'
import { createDragLayer } from '../../../../core/scene3d/dragdrop3d.ts'
import { strings } from '../strings/dragdrop.ts'
import { railPoint } from './units.ts'

/** Size of the preview block of each part, cm (w, h, d). A stand-in shape, not the real model. */
const DIMS: Record<PartId, [number, number, number]> = {
  rail: [120, 2, 2.5], cart: [9.84, 3.6, 4.4], rackStand: [3, 40, 3], standBase: [16, 1, 11], twoLegStand: [8, 22, 10], receiver: [9, 8, 6],
  screws: [6, 2, 6], level: [22, 2.5, 3.5], stopwatch: [9, 2.2, 7], markers: [4, 1.2, 4], string: [5, 1, 5], canister: [3.8, 5, 3.8],
  brassScrew: [3, 2.6, 1.2], plasticScrews: [3, 1, 3], mass0: [2.4, 0.9, 2.4], mass1: [2.4, 0.9, 2.4], mass2: [2.4, 0.9, 2.4], mass3: [2.4, 0.9, 2.4],
  balance: [14, 2.4, 10], dynamometer: [3, 10, 3], dynamometer2N: [3, 10, 3], mass50: [4, 2.2, 4], marble: [1.6, 1.6, 1.6],
}
/** Scene part ids (userData.partId) that stand for a movable part. 'masses' needs userData.massIndex, 'springScale' needs userData.itemId. */
const PART_OF: Record<string, PartId | undefined> = {
  rail: 'rail', rackStand: 'rackStand', rackKnob: 'rackStand', standBase: 'standBase', twoLegStand: 'twoLegStand', foot: 'twoLegStand',
  receiver: 'receiver', pulley: 'receiver', level: 'level', stopwatch: 'stopwatch', markers: 'markers', screws: 'screws', cart: 'cart',
  canister: 'canister', balance: 'balance', brassScrew: 'brassScrew', string: 'string', plasticScrews: 'plasticScrews', marble: 'marble', mass50: 'mass50',
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
  M: CoreMaterials
  pickables(): THREE.Object3D[]
  /** Hide (true) or show (false) the bench copy of a part while it is carried. */
  setLifted(part: PartId, lifted: boolean): void
  requestRender(): void
  refreshSoon(): void
}

export function createDragDrop3D(d: DragDrop3DDeps): DragDrop3D {
  const { a, ctx, scene, container, canvas, camera, controls, M } = d
  const layer = createDragLayer({
    scene, container, canvas, camera, M, lang: ctx.lang, reducedMotion: ctx.reducedMotion, requestRender: d.requestRender,
    zoneLabel: (zone) => strings[ctx.lang()].zones[zone.id as ZoneId],
    bandMargin_cm: 2.5,
  })
  let lifted: PartId | null = null

  return {
    probe: layer.probe,
    showZones: layer.showZones,
    showPreview(part, at, target) {
      const dim = DIMS[part]
      let snapAt: THREE.Vector3 | null = null
      if (target?.kind === 'zone' && target.zone.id !== 'table') {
        const z = target.zone
        if (z.rail && target.along_cm !== null) {
          const p = railPoint(a.getState(), target.along_cm, dim[1] / 2 + 0.5)
          snapAt = new THREE.Vector3(p[0], p[1], p[2])
        } else snapAt = new THREE.Vector3(z.cx, z.cy + dim[1] / 2 + (z.id === 'stand' ? 0 : 0.5), z.cz)
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
      for (let o: THREE.Object3D | null = h0.object; o; o = o.parent) {
        const u = o.userData
        const id = u.partId as string | undefined
        if (!id) continue
        if (id === 'masses') return typeof u.massIndex === 'number' ? MASS_PARTS[u.massIndex as number] ?? null : null
        if (id === 'springScale') return (u.itemId as PartId | undefined) ?? null
        return PART_OF[id] ?? null
      }
      return null
    },
    lift(part) {
      if (lifted) { d.setLifted(lifted, false); d.refreshSoon() }
      lifted = part
      if (part) d.setLifted(part, true)
      d.requestRender()
    },
    lockCamera(on) { controls.enabled = !on },
    refuse() { /* the shell toast shows the reason (a second card would show it twice) */ },
    placed(_t: Target) { d.refreshSoon() },
    tick: layer.tick,
    relabel: layer.relabel,
    destroy() {
      layer.destroy()
      controls.enabled = true
    },
  }
}
