// Public entry of the 3D bench scene: mountScene3D(root, ctx, opts) returns a handle with camera presets. It paints its (cheap) overlay at
// once and lazy-loads scene.ts, which pulls in three.js as a separate chunk, so the first paint does not wait for it.
import '../../../../core/styles/scene3d.css'
import { webgl2Available } from '../../../../core/scene3d/webgl.ts'
import { createMenu } from '../../../../core/scene3d/menu.ts'
import type { Stage3DView } from '../../../../core/shell/types.ts'
import { PRESETS, strings, type PresetName } from '../strings/scene3d.ts'
import type { ViewContext } from '../view.ts'
import type { Scene3D } from './scene.ts'
import type { Area } from '../dragdrop/snap.ts'
import { createDragDrop } from '../dragdrop/controller.ts'

export { webgl2Available, PRESETS }
export type { PresetName }

export interface Scene3DOptions { preset?: PresetName; area?: Area; openPanel?: (panel: string) => void; onFail?: (reason: string) => void }
export interface Scene3DView extends Stage3DView { setPreset(name: PresetName): void; setArea(area: Area): void }

export const parsePreset = (s: string | null | undefined): PresetName | null => (s && (PRESETS as readonly string[]).includes(s) ? (s as PresetName) : null)

export function mountScene3D(root: HTMLElement, ctx: ViewContext, opts: Scene3DOptions = {}): Scene3DView {
  const S = () => strings[ctx.lang()]
  const initial: PresetName = opts.preset ?? 'overview'
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
  // drag-and-drop setup: the parts tray under the stage; the scene supplies the stage side once it has loaded
  const dd = createDragDrop({ ctx, stage, mount: wrap })

  let scene: Scene3D | null = null
  let destroyed = false
  let current: PresetName = initial
  let pendingFocus: string[] | null = null
  let area: Area = opts.area ?? 'all'

  const sync = (): void => {
    viewMenu.setValue(current)
    viewMenu.button.setAttribute('aria-label', `${S().viewMenu}: ${S().presets[current]}`)
  }
  function choose(p: PresetName): void {
    current = p
    sync()
    scene?.setPreset(p)
  }
  const relabel = (): void => {
    const s = S()
    stage.setAttribute('aria-label', s.figure)
    if (!scene && !destroyed) status.textContent = s.loading
    viewMenu.root.setAttribute('aria-label', s.presetsLabel)
    viewMenu.setLabel(s.viewMenu)
    viewMenu.setItems(PRESETS.map((p) => ({ id: p, label: s.presets[p] })))
    sync()
    scene?.relabel()
    dd.relabel()
  }
  relabel()

  // Building the scene blocks the main thread for a while: yield one task first so presses already queued keep their own time stamps.
  import('./scene.ts').then(async ({ createScene }) => {
    await new Promise<void>((r) => setTimeout(r, 0))
    if (destroyed) return
    try {
      scene = createScene(stage, ctx, { initialPreset: initial, initialArea: area, onFail: (r) => opts.onFail?.(r) })
      dd.setAdapter(scene.dragdrop)
      status.textContent = ''
      if (pendingFocus) scene.focus(pendingFocus)
      if (current !== initial) scene.setPreset(current)
      scene.setArea(area)
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
    setArea(a) { area = a; scene?.setArea(a) },
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
