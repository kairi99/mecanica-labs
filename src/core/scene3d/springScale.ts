// Procedural 3D model of the analog spring scale (dynamometer), no logos or brand text. 1 unit = 1 cm, as in models.ts.
// Local frame: x along the axis from the pull ring (x < 0) through the barrel to the hook (x > 0), y up, z toward the viewer.
// The printed scale (white plate with ticks and numerals, drawn like the tape model's window) is on the front (+z) of the barrel; the
// needle is a red marker on the moving rod. `set` moves the rod by the spring extension, so the view only passes numbers from the
// pure model (core/instruments/springScale.ts) and never computes physics.
import * as THREE from 'three'
import type { SpringScaleSpec } from '../instruments/springScale.ts'
import { FONT, box, canvasTexture, cyl, tag, type Kit } from './models.ts'

/** Barrel length, cm. */
const BARREL_L = 13
/** x of the zero mark on the barrel, cm. */
const ZERO_X = 2
/** Barrel radius, cm. */
const BARREL_R = 1.05
/** Texture density, px per cm of plate. */
const PX_PER_CM = 100

export interface SpringScaleModel {
  root: THREE.Group
  /**
   * Move the rod by the spring extension (m, from the pure model: `ScaleReading.extension_m`). The rod is held at the stop beyond the
   * printed length, like the real needle.
   */
  set(extension_m: number): void
  /** Where the hook eye sits in the local frame now, cm (to attach a string or the block's hook in the scene). */
  hookPosition(): THREE.Vector3
  /** Where the pull ring centre sits, cm. */
  ringPosition(): THREE.Vector3
}

function xcyl(r: number, len: number, mat: THREE.Material, parent: THREE.Object3D, x: number): THREE.Mesh {
  const m = cyl(r, r, len, mat, parent, 24)
  m.rotation.z = -Math.PI / 2
  m.position.x = x
  return m
}

/**
 * Build a scale for a spec (range, division, printed length). Ticks every division (long every fifth, numerals every `labelStep_N`).
 * The plate is drawn in cm of the real printed length: spec.fullExtension_m * 100 cm for the full range.
 */
export function buildSpringScale(kit: Kit, spec: SpringScaleSpec): SpringScaleModel {
  const { M } = kit
  const root = new THREE.Group()
  tag(root, 'springScale')
  const len_cm = spec.fullExtension_m * 100
  const cmPerN = len_cm / spec.range_N

  // barrel (clear-ish body would hide the plate: use a white barrel with a flat plate on the front)
  xcyl(BARREL_R, BARREL_L, M.white, root, BARREL_L / 2)
  // end caps
  xcyl(BARREL_R + 0.12, 0.7, M.black, root, 0.35)
  xcyl(BARREL_R + 0.12, 0.7, M.black, root, BARREL_L - 0.35)
  // pull ring (torus in the xy plane) on a short stem
  box(1.2, 0.5, 0.5, M.steel, -0.6, 0, 0, root)
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.22, 12, 32), M.steel)
  ring.position.set(-2.2, 0, 0)
  ring.castShadow = true
  root.add(ring)

  // printed plate with divisions and numerals
  const plateW = len_cm + 1.6, plateH = 1.7
  const px = Math.round(plateW * PX_PER_CM), py = Math.round(plateH * PX_PER_CM)
  // mirror = true draws the back plate: the plate is turned half a turn about y, so its u axis runs toward -x and the marks are drawn at
  // the mirrored positions (numerals stay upright) to keep every numeral under the needle that belongs to it.
  const makeTex = (mirror: boolean): THREE.CanvasTexture => {
    const t = canvasTexture(kit, px, py, (c) => {
      c.fillStyle = '#f6f7f4'; c.fillRect(0, 0, px, py)
      c.strokeStyle = '#16181c'; c.fillStyle = '#16181c'; c.textAlign = 'center'; c.textBaseline = 'middle'
      const nDiv = Math.round(spec.range_N / spec.division_N)
      const x0 = 0.8 * PX_PER_CM
      for (let i = 0; i <= nDiv; i++) {
        const F = i * spec.division_N
        const xf = x0 + F * cmPerN * PX_PER_CM
        const x = mirror ? px - xf : xf
        const isLabel = Math.abs(F / spec.labelStep_N - Math.round(F / spec.labelStep_N)) < 1e-6
        const isFifth = i % 5 === 0
        c.lineWidth = isLabel ? 4 : isFifth ? 3 : 2
        c.beginPath()
        c.moveTo(x, 0)
        c.lineTo(x, (isLabel ? 0.6 : isFifth ? 0.42 : 0.28) * PX_PER_CM)
        c.stroke()
        if (isLabel) {
          c.font = `800 ${0.66 * PX_PER_CM}px ${FONT}`
          c.fillText(F === 0 ? '0' : Number.isInteger(F) ? String(F) : F.toFixed(1), x, 1.2 * PX_PER_CM)
        }
      }
      c.font = `700 ${0.4 * PX_PER_CM}px ${FONT}`
      c.fillText('N', mirror ? 0.45 * PX_PER_CM : px - 0.45 * PX_PER_CM, 1.5 * PX_PER_CM)
    })
    t.generateMipmaps = true
    t.minFilter = THREE.LinearMipmapLinearFilter
    return t
  }
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(plateW, plateH), new THREE.MeshStandardMaterial({ map: makeTex(false), roughness: 0.6, metalness: 0 }))
  // flat plate on the front of the barrel; its left edge is 0.8 cm before the zero mark
  plate.position.set(ZERO_X - 0.8 + plateW / 2, 0, BARREL_R + 0.02)
  plate.receiveShadow = true
  root.add(plate)
  // the same plate on the back (-z), readable from behind: a scale hooked to something on its -x side is seen from the other side
  const plateBack = new THREE.Mesh(new THREE.PlaneGeometry(plateW, plateH), new THREE.MeshStandardMaterial({ map: makeTex(true), roughness: 0.6, metalness: 0 }))
  plateBack.rotation.y = Math.PI
  plateBack.position.x = plate.position.x
  plateBack.position.z = -(BARREL_R + 0.02)
  root.add(plateBack)
  // slot guides above and below the numerals
  box(plateW, 0.12, 0.05, M.aluDark, ZERO_X - 0.8 + plateW / 2, plateH / 2, BARREL_R + 0.03, root)
  box(plateW, 0.12, 0.05, M.aluDark, ZERO_X - 0.8 + plateW / 2, -plateH / 2, BARREL_R + 0.03, root)

  // moving rod: inside the barrel from the needle head to the hook outside; the needle marker rides on the plate
  const moving = new THREE.Group()
  root.add(moving)
  xcyl(0.22, 12, M.steel, moving, ZERO_X + 6)
  box(0.22, plateH, 0.14, M.red, ZERO_X, 0, BARREL_R + 0.1, moving) // needle (red bar across the plate height)
  box(0.22, plateH, 0.14, M.red, ZERO_X, 0, -(BARREL_R + 0.1), moving)
  const hookStart = BARREL_L + 1.2
  box(1.0, 0.5, 0.5, M.steel, BARREL_L + 0.5, 0, 0, moving)
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.2, 12, 28, Math.PI * 1.45), M.steel)
  hook.position.set(hookStart + 0.4, 0, 0)
  hook.rotation.z = Math.PI * 0.78
  hook.castShadow = true
  moving.add(hook)

  return {
    root,
    set(extension_m: number): void {
      const e = Math.min(spec.fullExtension_m, Math.max(0, extension_m)) * 100
      moving.position.x = e
    },
    hookPosition: () => new THREE.Vector3(hookStart + 0.4 + moving.position.x, 0, 0),
    ringPosition: () => new THREE.Vector3(-2.2, 0, 0),
  }
}
