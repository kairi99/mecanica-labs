// Public entry of the 3D bench scene: mountScene3D(root, ctx, opts) returns a Scene3DView. It paints its (cheap) overlay immediately
// and lazy-loads scene.ts, which pulls in three.js as a separate chunk, so the first paint does not wait for it.
import '../../../../core/styles/scene3d.css'
import type { TapeTarget } from '../../apparatus/index.ts'
import type { CardInfo } from '../../../../core/scene3d/types.ts'
import { webgl2Available } from '../../../../core/scene3d/webgl.ts'
import { createMenu } from '../../../../core/scene3d/menu.ts'
import { TOOLS, type PresetName, type Scene3DOptions, type Scene3DView, type Tool } from '../stage.ts'
import type { ViewContext } from '../view.ts'
import { strings } from '../strings/scene3d.ts'
import type { Scene3D } from './scene.ts'
import { createDragDrop } from '../dragdrop/controller.ts'
import { PRESET_NAMES, parsePreset } from './presets.ts'

export { webgl2Available }
export type { PresetName, Scene3DOptions, Scene3DView, Tool as Scene3DTool }

export function mountScene3D(root: HTMLElement, ctx: ViewContext, opts: Scene3DOptions = {}): Scene3DView {
  const S = () => strings[ctx.lang()]
  const camParam = parsePreset(new URLSearchParams(location.search).get('cam'))
  // a portrait phone has no room for the whole bench: start on the side profile of the table edge (the timing view)
  const portraitPhone = matchMedia('(max-width: 819px) and (orientation: portrait)').matches
  const initial: PresetName = parsePreset(opts.preset) ?? camParam ?? (portraitPhone ? 'edge' : 'overview')

  const wrap = document.createElement('div')
  wrap.className = 'scene3d'
  const stage = document.createElement('div')
  stage.className = 'scene3d-stage'
  stage.setAttribute('role', 'group')

  const status = document.createElement('p')
  status.className = 'scene3d-status'
  status.setAttribute('role', 'status')

  // top-left: tools (a menu chip; a chip row on wide screens). Top-right: the view menu.
  const toolMenu = createMenu('scene3d-toolmenu', (id) => setTool(id as Tool))
  const toolRow = document.createElement('div')
  toolRow.className = 'scene3d-toolrow'
  toolRow.setAttribute('role', 'group')
  const toolBtns = TOOLS.map((t) => {
    const b = document.createElement('button')
    b.type = 'button'
    b.className = 'scene3d-chip'
    b.dataset.tool = t
    b.addEventListener('click', () => setTool(t))
    toolRow.append(b)
    return b
  })
  const topLeft = document.createElement('div')
  topLeft.className = 'scene3d-topleft'
  topLeft.append(toolMenu.root, toolRow)
  const viewMenu = createMenu('scene3d-viewmenu', (id) => choose(id as PresetName))
  const topRight = document.createElement('div')
  topRight.className = 'scene3d-topright'
  topRight.append(viewMenu.root)
  const stack = document.createElement('div')
  stack.className = 'scene3d-stack'
  const card = document.createElement('div')
  card.className = 'scene3d-card'
  card.hidden = true
  card.setAttribute('aria-live', 'polite')
  stack.append(status, card)
  stage.append(topLeft, topRight, stack)
  wrap.append(stage)
  wrap.classList.add('has-tray')
  root.append(wrap)
  // drag-and-drop assembly: the parts tray under the stage; the scene supplies the stage side once it has loaded
  const dd = createDragDrop({ ctx, stage, mount: wrap })

  let scene: Scene3D | null = null
  let destroyed = false
  let current: PresetName = initial
  let tool: Tool = 'select'
  let pendingFocus: string[] | null = null
  let pendingTarget: TapeTarget | null | undefined
  let cardInfo: CardInfo | null = null

  const showCard = (c: CardInfo | null): void => {
    cardInfo = c
    card.hidden = c === null
    card.replaceChildren()
    if (!c) return
    card.setAttribute('role', c.alert ? 'alert' : 'group')
    const text = document.createElement('p')
    if (c.title) {
      const strong = document.createElement('strong')
      strong.textContent = c.title
      text.append(strong, document.createElement('br'))
    }
    text.append(c.text)
    card.append(text)
    const row = document.createElement('div')
    row.className = 'scene3d-card-actions'
    for (const act of c.actions) {
      const b = document.createElement('button')
      b.type = 'button'
      b.textContent = act.label
      b.addEventListener('click', (e) => { act.run(e.timeStamp); showCard(null) })
      row.append(b)
    }
    if (c.panel && opts.openPanel) {
      const go = document.createElement('button')
      go.type = 'button'
      go.textContent = S().openPanel
      const panel = c.panel
      go.addEventListener('click', () => opts.openPanel?.(panel))
      row.append(go)
    }
    const close = document.createElement('button')
    close.type = 'button'
    close.textContent = S().close
    close.setAttribute('aria-label', S().close)
    close.addEventListener('click', () => showCard(null))
    row.append(close)
    card.append(row)
  }

  const syncPresets = (): void => {
    viewMenu.setValue(current)
    viewMenu.button.setAttribute('aria-label', `${S().viewMenu}: ${S().presets[current]}`)
  }
  const syncTools = (): void => {
    toolBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(TOOLS[i] === tool)))
    toolMenu.setValue(tool)
    toolMenu.button.setAttribute('aria-label', `${S().toolMenu}: ${S().tools[tool]}`)
    toolMenu.button.classList.toggle('scene3d-chip-on', tool !== 'select')
  }
  function choose(p: PresetName): void {
    current = parsePreset(p) ?? 'overview'
    syncPresets()
    scene?.setPreset(current)
  }
  function setTool(t: Tool): void {
    tool = t
    syncTools()
    scene?.setTool(t)
    if (!scene) status.textContent = S().toolHint[t]
  }

  const relabel = (): void => {
    const s = S()
    stage.setAttribute('aria-label', s.figure)
    if (!scene && !destroyed) status.textContent = s.loading
    viewMenu.root.setAttribute('aria-label', s.presetsLabel)
    viewMenu.setLabel(s.viewMenu)
    viewMenu.setItems(PRESET_NAMES.map((p) => ({ id: p, label: s.presets[p] })))
    toolMenu.setLabel(s.toolMenu)
    toolMenu.setItems(TOOLS.map((t) => ({ id: t, label: s.tools[t] })))
    toolRow.setAttribute('aria-label', s.toolsLabel)
    toolBtns.forEach((b, i) => { b.textContent = s.tools[TOOLS[i]!] })
    syncPresets()
    syncTools()
    scene?.relabel()
    dd.relabel()
    showCard(cardInfo)
  }
  relabel()

  // Building the scene (renderer, shaders, environment map) blocks the main thread for a while. Yield one task first so keys and
  // taps already queued (S, Space, Enter on the timing bar) are handled at their own time stamps before that stall begins.
  import('./scene.ts').then(async ({ createScene }) => {
    await new Promise<void>((r) => setTimeout(r, 0))
    if (destroyed) return
    try {
      scene = createScene(stage, ctx, {
        initialPreset: initial,
        onCard: showCard,
        onFail: (r) => opts.onFail?.(r),
        onStatus: (t) => { status.textContent = t },
        onTapeTarget: opts.onTapeTarget,
        openPanel: opts.openPanel,
        dd: { busy: dd.busy },
      })
      dd.setAdapter(scene.dragdrop)
      status.textContent = ''
      if (pendingFocus) scene.focus(pendingFocus)
      if (pendingTarget !== undefined) scene.setTapeTarget(pendingTarget)
      if (current !== initial) scene.setPreset(current)
      if (tool !== 'select') scene.setTool(tool)
    } catch (err) {
      opts.onFail?.(String(err))
    }
  }).catch((err) => { if (!destroyed) opts.onFail?.(String(err)) })

  stage.addEventListener('keydown', (e) => { if (e.key === 'Escape') showCard(null) })

  return {
    update() {
      dd.update()
      scene?.update()
    },
    relabel,
    focus(list) { pendingFocus = list; scene?.focus(list) },
    setVisible(v) { wrap.hidden = !v; scene?.setVisible(v) },
    setPreset: choose,
    setTool,
    setTapeTarget(t) { pendingTarget = t; scene?.setTapeTarget(t) },
    getTapeTarget: () => scene?.getTapeTarget() ?? (pendingTarget ?? null),
    destroy() {
      destroyed = true
      toolMenu.destroy(); viewMenu.destroy()
      dd.setAdapter(null)
      dd.destroy()
      scene?.destroy()
      scene = null
      wrap.remove()
    },
  }
}
