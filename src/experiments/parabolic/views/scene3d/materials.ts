// Material palette of the projectile bench: the shared palette (core/scene3d/materials.ts) plus what only this bench has
// (laminate edge, floor, paper, carbon, the two balls). UI-ish materials (floor, edge highlight, trail) follow the tokens.
import * as THREE from 'three'
import { createCoreMaterials, type CoreMaterials } from '../../../../core/scene3d/materials.ts'

export { createOutlineMaterial } from '../../../../core/scene3d/materials.ts'

export interface Materials extends CoreMaterials {
  floor: THREE.MeshStandardMaterial
  tableSide: THREE.MeshStandardMaterial
  legs: THREE.MeshStandardMaterial
  edge: THREE.MeshBasicMaterial
  paper: THREE.MeshStandardMaterial
  carbon: THREE.MeshStandardMaterial
  markDot: THREE.MeshBasicMaterial
  markRing: THREE.MeshBasicMaterial
  marbleGlass: THREE.MeshPhysicalMaterial
  pingPong: THREE.MeshStandardMaterial
  plumb: THREE.MeshBasicMaterial
  trail: THREE.PointsMaterial
}

export function createMaterials(probe: HTMLElement): Materials {
  const core = createCoreMaterials(probe)
  const m: Materials = Object.assign(core, {
    floor: new THREE.MeshStandardMaterial({ color: 0xb9bcc4, metalness: 0, roughness: 0.92 }),
    tableSide: new THREE.MeshStandardMaterial({ color: 0xa9adb5, metalness: 0.02, roughness: 0.7 }),
    legs: new THREE.MeshStandardMaterial({ color: 0x2a2d33, metalness: 0.5, roughness: 0.5 }),
    edge: new THREE.MeshBasicMaterial({ color: 0x0071e3, transparent: true, opacity: 0.9 }),
    paper: new THREE.MeshStandardMaterial({ color: 0xfbfbf8, metalness: 0, roughness: 0.92, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
    carbon: new THREE.MeshStandardMaterial({ color: 0x1b2230, metalness: 0.1, roughness: 0.75, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    markDot: new THREE.MeshBasicMaterial({ color: 0x05070b, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }),
    markRing: new THREE.MeshBasicMaterial({ color: 0xcfd6e4, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }),
    marbleGlass: new THREE.MeshPhysicalMaterial({ color: 0x7ec4d2, metalness: 0, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.03, transparent: true, opacity: 0.72, envMapIntensity: 1.6 }),
    pingPong: new THREE.MeshStandardMaterial({ color: 0xfafaf7, metalness: 0, roughness: 0.55 }),
    plumb: new THREE.MeshBasicMaterial({ color: 0x20242b, transparent: true, opacity: 0.75 }),
    trail: new THREE.PointsMaterial({ color: 0x0071e3, size: 3.2, sizeAttenuation: false, transparent: true, opacity: 0.6, depthWrite: false }),
  })
  const refreshCore = core.refresh
  const disposeCore = core.dispose
  const shade = (): void => {
    const s = m.tokens.surface
    const lum = s.r * 0.3 + s.g * 0.59 + s.b * 0.11
    // light laminate table on a darker, cooler floor, in both themes (the stage never reads as one flat grey)
    m.table.color.set(lum > 0.5 ? 0xe2dccd : 0x6f6a60)
    m.floor.color.copy(s).multiplyScalar(lum > 0.5 ? 0.36 : 0.9)
    m.tableSide.color.copy(m.table.color).multiplyScalar(0.7)
    m.edge.color.copy(m.tokens.accent)
    m.trail.color.copy(m.tokens.accent)
    m.plumb.color.set(lum > 0.5 ? 0x20242b : 0xe6e8ee)
  }
  m.refresh = () => { refreshCore(); shade() }
  m.dispose = () => {
    disposeCore()
    for (const x of [m.floor, m.tableSide, m.legs, m.edge, m.paper, m.carbon, m.markDot, m.markRing, m.marbleGlass, m.pingPong, m.plumb, m.trail]) x.dispose()
  }
  shade()
  return m
}
