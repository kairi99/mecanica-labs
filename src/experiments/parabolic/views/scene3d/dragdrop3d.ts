// Parabolic 3D side of the drag-and-drop assembly: preview sizes and placement of each part, bench-part picking, camera lock and the
// level memory. Zone markers, the preview mesh and the pointer-to-table mapping are core (core/scene3d/dragdrop3d.ts); the decisions
// (which zone, which Apparatus call) are in views/dragdrop (snap.ts, drop.ts). Part of the lazy scene chunk.
import * as THREE from 'three'
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { ItemId, ParabolicApparatus } from '../../apparatus/index.ts'
import type { Tool } from '../stage.ts'
import type { ViewContext } from '../view.ts'
import type { Probe } from '../../../../core/dragdrop/snap.ts'
import type { Materials } from './materials.ts'
import { RAIL, SHEET_LONG_CM, SHEET_SHORT_CM } from './units.ts'
import { BALL_OF, paperSpot_cm, type Target, type Zone, type ZoneId } from '../dragdrop/snap.ts'
import type { StageAdapter } from '../dragdrop/controller.ts'
import { createDragLayer } from '../../../../core/scene3d/dragdrop3d.ts'
import { strings } from '../strings/dragdrop.ts'

/** Size of the preview block of each part, cm (w, h, d). A stand-in shape, not the real model. */
const DIMS: Record<ItemId, [number, number, number]> = {
  rail: [RAIL.length, 2, 2.5], rackStand: [3, 40, 3], base: [16, 1, 11], twoLeg: [8, 14, 10], screws: [6, 2, 6], level: [22, 2.5, 3.5],
  marble: [1.8, 1.8, 1.8], pingPong: [4, 4, 4], tapeMeasure: [8, 3, 8], stopwatch: [9, 2.2, 7],
  bondPaper: [SHEET_LONG_CM, 0.6, SHEET_SHORT_CM], carbonPaper: [SHEET_LONG_CM, 0.6, SHEET_SHORT_CM],
}
/** Scene part ids that stand for an inventory item (absent: not a movable part). */
const ITEM_OF: Record<string, ItemId> = {
  rail: 'rail', rackStand: 'rackStand', rackKnob: 'rackStand', standBase: 'base', twoLegStand: 'twoLeg', foot: 'twoLeg', level: 'level',
  stopwatch: 'stopwatch', tapeMeasure: 'tapeMeasure', screws: 'screws', marble: 'marble', pingPong: 'pingPong', bond: 'bondPaper', carbon: 'carbonPaper',
}

export interface DragDrop3D extends StageAdapter {
  /** Per frame; true while it animates (keeps the render loop going). */
  tick(now: number): boolean
  relabel(): void
  destroy(): void
}

export interface DragDrop3DDeps {
  a: ParabolicApparatus
  ctx: ViewContext
  scene: THREE.Scene
  container: HTMLElement
  canvas: HTMLCanvasElement
  camera: THREE.PerspectiveCamera
  controls: OrbitControls
  M: Materials
  pickables(): THREE.Object3D[]
  rootOf(part: ItemId): THREE.Object3D | null
  getTool(): Tool
  requestRender(): void
  refreshSoon(): void
  setLevelX(x_cm: number): void
  setLevelTable(x_cm: number, z_cm: number): void
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
    /** Band zones along the rail are probed on their own tilted plane (the rail climbs 20 cm over its length, a horizontal plane would shift the point). */
    probe(x, y): Probe | null {
      if (!layer.setRay(x, y)) return null
      const ray = layer.ray.ray.clone()
      const tmp = new THREE.Vector3()
      return (zone) => {
        const z = zone as Zone
        const t = z.rail ? z.rail.tilt_rad : 0
        const n = new THREE.Vector3(Math.sin(t), Math.cos(t), 0)
        const hit = ray.intersectPlane(new THREE.Plane().setFromNormalAndCoplanarPoint(n, new THREE.Vector3(zone.cx, zone.cy, zone.cz)), tmp)
        return hit ? { x_cm: hit.x, z_cm: hit.z } : null
      }
    },
    showZones: layer.showZones,
    showPreview(part, at, target) {
      const dim = DIMS[part]
      let snapAt: THREE.Vector3 | null = null
      if (target?.kind === 'zone' && target.zone.id !== 'table') {
        const z = target.zone
        if (z.rail && target.along_cm !== null) {
          snapAt = new THREE.Vector3(z.rail.highX_cm + target.along_cm * z.rail.cos, z.rail.highY_cm - target.along_cm * Math.sin(z.rail.tilt_rad) + dim[1] / 2 + 1, z.rail.z_cm)
        } else if (z.id === 'floor' && target.at) {
          const p = paperSpot_cm(z, target.at)
          snapAt = new THREE.Vector3(p.x, z.cy + dim[1] / 2, p.z)
        } else if (z.id === 'tableLevel' && target.at) snapAt = new THREE.Vector3(target.at.x_cm, dim[1] / 2, target.at.z_cm ?? z.cz)
        else snapAt = new THREE.Vector3(z.cx, z.cy + dim[1] / 2 + (z.id === 'stand' || z.id === 'twoLeg' ? 0 : 0.5), z.cz)
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
      const st = a.getState()
      let part: string | null = null
      for (let o: THREE.Object3D | null = h0.object; o; o = o.parent) {
        const u = o.userData
        const h = u.dragHandle as string | undefined
        // handles that adjust a mounted part keep their own drag; on a loose part they are just part of it
        if (h === 'rack' && st.joints.standBase) return null
        if (h === 'foot' && st.joints.twoLegStand) return null
        if (h === 'rail' && st.joints.rackClamp) return null
        if (h === 'mark') return null
        if (h === 'sheet' && d.getTool() === 'paper') return null
        if (u.partId && !part) part = u.partId as string
      }
      const item = part !== null ? ITEM_OF[part] : undefined
      if (!item) return null
      // a ball sitting on the rail is dragged by its own handle (it snaps to the marks)
      const ball = BALL_OF[item]
      if (ball && st.ball.selected === ball && st.ball.placed) return null
      return item
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
      if (target.kind !== 'zone') return
      const act = target.zone.action
      if (act.kind === 'placeLevel' && act.where === 'rail' && target.along_cm !== null) d.setLevelX(target.along_cm)
      if (act.kind === 'placeLevel' && act.where === 'table' && target.at) d.setLevelTable(target.at.x_cm, target.at.z_cm ?? 0)
    },
    tick: layer.tick,
    relabel: layer.relabel,
    destroy() {
      layer.destroy()
      controls.enabled = true
    },
  }
}
