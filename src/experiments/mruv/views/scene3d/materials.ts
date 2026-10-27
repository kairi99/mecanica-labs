// Material palette of the MRUV bench: the shared palette (core/scene3d/materials.ts) plus the parts only this bench has.
import * as THREE from 'three'
import { createCoreMaterials, type CoreMaterials } from '../../../../core/scene3d/materials.ts'

export { createOutlineMaterial } from '../../../../core/scene3d/materials.ts'

export interface Materials extends CoreMaterials {
  tapeRoll: THREE.MeshStandardMaterial
  tray: THREE.MeshStandardMaterial
}

export function createMaterials(probe: HTMLElement): Materials {
  const std = (color: number, metalness: number, roughness: number): THREE.MeshStandardMaterial =>
    new THREE.MeshStandardMaterial({ color, metalness, roughness })
  const core = createCoreMaterials(probe)
  const m: Materials = Object.assign(core, {
    tapeRoll: std(0xcdb878, 0, 0.8),
    tray: std(0x9aa0aa, 0.05, 0.7),
  })
  const refreshCore = core.refresh
  const disposeCore = core.dispose
  const trayShade = (): void => {
    const surface2 = m.tokens.surface
    const lum = surface2.r * 0.3 + surface2.g * 0.59 + surface2.b * 0.11
    m.tray.color.copy(m.table.color).multiplyScalar(lum > 0.5 ? 0.82 : 0.75)
  }
  m.refresh = () => { refreshCore(); trayShade() }
  m.dispose = () => { disposeCore(); for (const x of [m.tapeRoll, m.tray]) x.dispose() }
  trayShade()
  return m
}
