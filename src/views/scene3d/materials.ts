// Material palette of the 3D table. Physical objects have their own colours (aluminium, black steel, blue plastic);
// the table, the background and the highlight follow the design tokens and are re-read on theme change.
import * as THREE from 'three'

export interface Materials {
  alu: THREE.MeshStandardMaterial
  aluDark: THREE.MeshStandardMaterial
  black: THREE.MeshStandardMaterial
  steel: THREE.MeshStandardMaterial
  blue: THREE.MeshStandardMaterial
  white: THREE.MeshStandardMaterial
  rubber: THREE.MeshStandardMaterial
  red: THREE.MeshStandardMaterial
  tape: THREE.MeshStandardMaterial
  levelBody: THREE.MeshStandardMaterial
  glass: THREE.MeshStandardMaterial
  bubble: THREE.MeshStandardMaterial
  invalid: THREE.MeshStandardMaterial
  table: THREE.MeshStandardMaterial
  ghost: THREE.MeshStandardMaterial
  tokens: { bg: THREE.Color; accent: THREE.Color; surface: THREE.Color }
  refresh(): void
  dispose(): void
}

export function createMaterials(probe: HTMLElement): Materials {
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
  const m: Materials = {
    alu: std(0xc9ced6, 0.85, 0.34),
    aluDark: std(0x8e949c, 0.8, 0.45),
    black: std(0x1c1d21, 0.55, 0.45),
    steel: std(0xb7bdc5, 1, 0.28),
    blue: std(0x2563c9, 0.05, 0.45),
    white: std(0xf4f5f7, 0.05, 0.4),
    rubber: std(0x131316, 0, 0.85),
    red: std(0xd23b30, 0.05, 0.5),
    tape: std(0xf2b01e, 0, 0.7),
    levelBody: std(0xe0a526, 0.1, 0.5),
    glass: new THREE.MeshStandardMaterial({ color: 0xbfe8c8, transparent: true, opacity: 0.45, roughness: 0.1, metalness: 0, depthWrite: false }),
    bubble: std(0xf6fff4, 0, 0.2),
    invalid: std(0xe5675e, 0.05, 0.5),
    table: std(0xdadce1, 0.02, 0.62),
    ghost: new THREE.MeshStandardMaterial({ color: 0x0071e3, transparent: true, opacity: 0.38, roughness: 0.5, metalness: 0, depthWrite: false }),
    tokens: { bg: new THREE.Color(), accent: new THREE.Color(), surface: new THREE.Color() },
    refresh() {
      const bg = col('--bg'), surface2 = col('--surface-2'), accent = col('--accent')
      m.tokens.bg.copy(bg); m.tokens.accent.copy(accent); m.tokens.surface.copy(surface2)
      // light grey laminate: the surface-2 token, a little darker so white parts stand out; dark theme stays dark grey
      const lum = surface2.r * 0.3 + surface2.g * 0.59 + surface2.b * 0.11
      m.table.color.copy(surface2).multiplyScalar(lum > 0.5 ? 0.62 : 1.4)
      m.ghost.color.copy(accent)
    },
    dispose() {
      for (const x of [m.alu, m.aluDark, m.black, m.steel, m.blue, m.white, m.rubber, m.red, m.tape, m.levelBody, m.glass, m.bubble, m.invalid, m.table, m.ghost]) x.dispose()
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
