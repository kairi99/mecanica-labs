// Public entry of the 3D bench scene: mountScene3D(root, ctx, opts) returns a View. It paints its (cheap) overlay immediately and
// lazy-loads scene.ts, which pulls in three.js as a separate chunk, so the first paint does not wait for it.
import '../../../../core/styles/scene3d.css'
import type { View, ViewContext } from '../view.ts'
import { strings } from '../strings/scene3d.ts'
import type { Scene3D } from './scene.ts'
import { webgl2Available } from '../../../../core/scene3d/webgl.ts'
import { createMenu } from '../../../../core/scene3d/menu.ts'
import { PRESET_NAMES, parsePreset, type PresetName } from './units.ts'
import { createDragDrop } from '../dragdrop/controller.ts'

export type { PresetName }
export { PRESET_NAMES, parsePreset }

export interface Scene3DOptions {
  /** The scene cannot start (no WebGL2, lost context): the shell falls back to the 2D side view. */
  onFail?(reason: string): void
  preset?: PresetName
  /** A click on a part asks to open the matching 2D panel. */
  openPanel?(panel: string): void
}

export type Scene3DView = View & {
  setVisible(visible: boolean): void
  setPreset(name: PresetName): void
}

export { webgl2Available }

export function mountScene3D(root: HTMLElement, ctx: ViewContext, opts: Scene3DOptions = {}): Scene3DView {
  const S = () => strings[ctx.lang()]
  const camParam = parsePreset(new URLSearchParams(location.search).get('cam'))
  const initial: PresetName = parsePreset(opts.preset) ?? camParam ?? 'overview'

  const wrap = document.createElement('div')
  wrap.className = 'scene3d'
  const stage = document.createElement('div')
  stage.className = 'scene3d-stage'
  stage.setAttribute('role', 'group')
  const status = document.createElement('p')
  status.className = 'scene3d-status'
  status.setAttribute('role', 'status')
  const viewMenu = createMenu('scene3d-viewmenu', (id) => choose(id as PresetName))
  const topRight = document.createElement('div')
  topRight.className = 'scene3d-topright'
  topRight.append(viewMenu.root)
  const stack = document.createElement('div')
  stack.className = 'scene3d-stack'
  stack.append(status)
  stage.append(topRight, stack)
  wrap.append(stage)
  wrap.classList.add('has-tray')
  root.append(wrap)
  // drag-and-drop assembly: the parts tray under the stage; the scene supplies the stage side once it has loaded
  const dd = createDragDrop({ ctx, stage, mount: wrap })

  let scene: Scene3D | null = null
  let destroyed = false
  let current: PresetName = initial
  let pendingFocus: string[] | null = null

  const syncPresets = (): void => {
    viewMenu.setValue(current)
    viewMenu.button.setAttribute('aria-label', `${S().viewMenu}: ${S().presets[current]}`)
  }
  function choose(p: PresetName): void {
    current = parsePreset(p) ?? 'overview'
    syncPresets()
    scene?.setPreset(current)
  }
  const relabel = (): void => {
    const s = S()
    stage.setAttribute('aria-label', s.figure)
    if (!scene && !destroyed) status.textContent = s.loading
    viewMenu.root.setAttribute('aria-label', s.presetsLabel)
    viewMenu.setLabel(s.viewMenu)
    viewMenu.setItems(PRESET_NAMES.map((p) => ({ id: p, label: s.presets[p] })))
    syncPresets()
    scene?.relabel()
    dd.relabel()
  }
  relabel()

  import('./scene.ts').then(({ createScene }) => {
    if (destroyed) return
    try {
      scene = createScene(stage, ctx, {
        initialPreset: initial,
        onFail: (r) => opts.onFail?.(r),
        onStatus: (t) => { status.textContent = t },
        openPanel: opts.openPanel,
        dd: { busy: dd.busy, overTray: dd.overTray, removeFromTray: dd.removeFromTray },
      })
      dd.setAdapter(scene.dragdrop)
      status.textContent = ''
      if (pendingFocus) scene.focus(pendingFocus)
      if (current !== initial) scene.setPreset(current)
    } catch (err) {
      opts.onFail?.(String(err))
    }
  }).catch((err) => { if (!destroyed) opts.onFail?.(String(err)) })

  return {
    update() { dd.update(); scene?.update() },
    relabel,
    focus(list) { pendingFocus = list; scene?.focus(list) },
    setVisible(v) { wrap.hidden = !v; scene?.setVisible(v) },
    setPreset: choose,
    destroy() {
      destroyed = true
      viewMenu.destroy()
      dd.setAdapter(null)
      dd.destroy()
      scene?.destroy()
      scene = null
      wrap.remove()
    },
  }
}
