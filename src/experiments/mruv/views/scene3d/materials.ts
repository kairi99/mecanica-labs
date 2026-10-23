// Material palette of the MRUV bench: the shared palette (core/scene3d/materials.ts) plus the parts only this bench has.
import * as THREE from 'three'
import { createCoreMaterials, type CoreMaterials } from '../../../../core/scene3d/materials.ts'

export { createOutlineMaterial } from '../../../../core/scene3d/materials.ts'

export interface Materials extends CoreMaterials {
  tapeRoll: THREE.MeshStandardMaterial
  slate: THREE.MeshStandardMaterial
  skirt: THREE.MeshStandardMaterial
  tray: THREE.MeshStandardMaterial
  invalid: THREE.MeshStandardMaterial
}

export function createMaterials(probe: HTMLElement): Materials {
  const std = (color: number, metalness: number, roughness: number): THREE.MeshStandardMaterial =>
    new THREE.MeshStandardMaterial({ color, metalness, roughness })
  const core = createCoreMaterials(probe)
  const m: Materials = Object.assign(core, {
    tapeRoll: std(0xcdb878, 0, 0.8),
    slate: std(0x4a6a8a, 0, 0.7),
    skirt: std(0x2b2e34, 0.1, 0.55),
    tray: std(0x9aa0aa, 0.05, 0.7),
    invalid: std(0xe5675e, 0.05, 0.5),
  })
  const refreshCore = core.refresh
  const disposeCore = core.dispose
  const trayShade = (): void => {
    const surface2 = m.tokens.surface
    const lum = surface2.r * 0.3 + surface2.g * 0.59 + surface2.b * 0.11
    m.tray.color.copy(m.table.color).multiplyScalar(lum > 0.5 ? 0.82 : 0.75)
  }
  m.refresh = () => { refreshCore(); trayShade() }
  m.dispose = () => { disposeCore(); for (const x of [m.tapeRoll, m.slate, m.skirt, m.tray, m.invalid]) x.dispose() }
  trayShade()
  return m
}
