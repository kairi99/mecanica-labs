// Public entry of the 3D table scene (contract stub; the scene3d branch replaces the body).
import type { View, ViewContext } from '../view.ts'

export type PresetName = 'overview' | 'highEnd' | 'lowEnd' | 'alongRail' | 'caliper'

export interface Scene3DOptions {
  /** The scene cannot start (no WebGL2, lost context): the shell falls back to the 2D side view. */
  onFail?(reason: string): void
  preset?: PresetName
  /** A part card asks to open the matching 2D panel (e.g. 'stopwatch', 'caliper', 'inventory'). */
  openPanel?(panel: string): void
}

export type Scene3DView = View & { setVisible(visible: boolean): void; setPreset(name: PresetName): void }

export function webgl2Available(): boolean {
  try {
    const c = document.createElement('canvas')
    const gl = c.getContext('webgl2')
    if (!gl) return false
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return true
  } catch { return false }
}

export function mountScene3D(root: HTMLElement, _ctx: ViewContext, opts: Scene3DOptions = {}): Scene3DView {
  const el = document.createElement('div')
  el.className = 'scene3d-stub'
  root.append(el)
  queueMicrotask(() => opts.onFail?.('stub'))
  return { update() {}, relabel() {}, setVisible(v) { el.hidden = !v }, setPreset() {}, destroy() { el.remove() } }
}
