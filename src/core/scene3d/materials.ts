// Shared material palette of the 3D table. Physical objects have their own colours (aluminium, black steel, blue plastic);
// the table, the background and the highlight follow the design tokens and are re-read on theme change.
// An experiment adds its own materials on top (see experiments/mruv/views/scene3d/materials.ts).
import * as THREE from 'three'

export interface CoreMaterials {
  alu: THREE.MeshStandardMaterial
  aluDark: THREE.MeshStandardMaterial
  black: THREE.MeshStandardMaterial
  steel: THREE.MeshStandardMaterial
  blue: THREE.MeshStandardMaterial
  white: THREE.MeshStandardMaterial
  rubber: THREE.MeshStandardMaterial
  red: THREE.MeshStandardMaterial
  tape: THREE.MeshStandardMaterial
  brass: THREE.MeshStandardMaterial
  cord: THREE.MeshStandardMaterial
  levelBody: THREE.MeshStandardMaterial
  glass: THREE.MeshStandardMaterial
  bubble: THREE.MeshStandardMaterial
  table: THREE.MeshStandardMaterial
  /** Floor (darker than the table in light theme, so the two never read as one grey) and the side faces of a table or bench. */
  floor: THREE.MeshStandardMaterial
  tableSide: THREE.MeshStandardMaterial
  ghost: THREE.MeshStandardMaterial
  /** DigiCart skirt, receiver housing, and the red of a cart that cannot be put there. */
  skirt: THREE.MeshStandardMaterial
  slate: THREE.MeshStandardMaterial
  invalid: THREE.MeshStandardMaterial
  tokens: { bg: THREE.Color; accent: THREE.Color; surface: THREE.Color }
  refresh(): void
  dispose(): void
}

export function createCoreMaterials(probe: HTMLElement): CoreMaterials {
  const resolve = (v: string): string => {
    probe.style.color = `var(${v})`
    return getComputedStyle(probe).color
  }
  const col = (v: string): THREE.Color => {
    const n = resolve(v).match(/[\d.]+/g)?.map(Number) ?? [128, 128, 128]
    return new THREE.Color().setRGB((n[0] ?? 0) / 255, (n[1] ?? 0) / 255, (n[2] ?? 0) / 255, THREE.SRGBColorSpace)
  }
  const std = (color: number, metalness: number, roughness: number): THREE.MeshStandardMaterial =>
    new THREE.MeshStandardMaterial({ color, metalness, roughness })
  const m: CoreMaterials = {
    alu: std(0xc9ced6, 0.85, 0.34),
    aluDark: std(0x8e949c, 0.8, 0.45),
    black: std(0x1c1d21, 0.55, 0.45),
    steel: std(0xb7bdc5, 1, 0.28),
    blue: std(0x2563c9, 0.05, 0.45),
    white: std(0xf4f5f7, 0.05, 0.4),
    rubber: std(0x131316, 0, 0.85),
    red: std(0xd23b30, 0.05, 0.5),
    tape: std(0xf2b01e, 0, 0.7),
    brass: std(0xc9a227, 0.85, 0.35),
    cord: std(0xd9d2c0, 0, 0.9),
    levelBody: std(0xe0a526, 0.1, 0.5),
    glass: new THREE.MeshStandardMaterial({ color: 0xbfe8c8, transparent: true, opacity: 0.45, roughness: 0.1, metalness: 0, depthWrite: false }),
    bubble: std(0xf6fff4, 0, 0.2),
    table: std(0xdadce1, 0.02, 0.62),
    floor: new THREE.MeshStandardMaterial({ color: 0xb9bcc4, metalness: 0, roughness: 0.92 }),
    tableSide: new THREE.MeshStandardMaterial({ color: 0xa9adb5, metalness: 0.02, roughness: 0.7 }),
    ghost: new THREE.MeshStandardMaterial({ color: 0x0071e3, transparent: true, opacity: 0.38, roughness: 0.5, metalness: 0, depthWrite: false }),
    skirt: std(0x2b2e34, 0.1, 0.55),
    slate: std(0x4a6a8a, 0, 0.7),
    invalid: std(0xe5675e, 0.05, 0.5),
    tokens: { bg: new THREE.Color(), accent: new THREE.Color(), surface: new THREE.Color() },
    refresh() {
      const bg = col('--bg'), surface2 = col('--surface-2'), accent = col('--accent')
      m.tokens.bg.copy(bg); m.tokens.accent.copy(accent); m.tokens.surface.copy(surface2)
      // light grey laminate: the surface-2 token, a little darker so white parts stand out; dark theme stays dark grey
      const lum = surface2.r * 0.3 + surface2.g * 0.59 + surface2.b * 0.11
      m.table.color.copy(surface2).multiplyScalar(lum > 0.5 ? 0.62 : 1.4)
      m.floor.color.copy(surface2).multiplyScalar(lum > 0.5 ? 0.36 : 0.9)
      m.tableSide.color.copy(m.table.color).multiplyScalar(0.7)
      m.ghost.color.copy(accent)
    },
    dispose() {
      for (const x of [m.alu, m.aluDark, m.black, m.steel, m.blue, m.white, m.rubber, m.red, m.tape, m.brass, m.cord, m.levelBody, m.glass, m.bubble, m.table, m.floor, m.tableSide, m.ghost, m.skirt, m.slate, m.invalid]) x.dispose()
    },
  }
  m.refresh()
  return m
}

/** Constant-width outline: a back-face hull pushed out along the normals (world-ish width in scene cm). */
export function createOutlineMaterial(opacity: number, width_cm = 0.2): THREE.MeshBasicMaterial {
  const m = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.BackSide, transparent: true, opacity, depthWrite: false })
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n transformed += normalize(normal) * ${width_cm.toFixed(3)};`)
  }
  return m
}
