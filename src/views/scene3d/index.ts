// Public entry of the 3D table scene: mountScene3D(root, ctx, opts) returns a View. It paints its (cheap) overlay immediately
// and lazy-loads scene.ts, which pulls in three.js as a separate chunk, so the first paint does not wait for it.
import '../../styles/scene3d.css'
import type { TapeTarget } from '../../apparatus/index.ts'
import type { View, ViewContext } from '../view.ts'
import { strings } from '../strings/scene3d.ts'
import type { Scene3D, Tool } from './scene.ts'
import type { CardInfo } from './types.ts'
import { createMenu } from './menu.ts'
import { PRESET_NAMES, parsePreset, type PresetName } from './presets.ts'

export type { PresetName }
const PRESET_ORDER: readonly PresetName[] = PRESET_NAMES
const TOOL_ORDER: readonly Tool[] = ['select', 'markers', 'level', 'tape']

export interface Scene3DOptions {
  /** The scene cannot start (no WebGL2, lost context): the shell falls back to the 2D side view. */
  onFail?(reason: string): void
  preset?: PresetName
  /** A part card asks to open the matching 2D panel (e.g. 'stopwatch', 'tape', 'inventory'). */
  openPanel?(panel: string): void
  /** The student chose a tape measure target in the scene (click on a support or a rail position). */
  onTapeTarget?(target: TapeTarget): void
}

export type Scene3DView = View & {
  setVisible(visible: boolean): void
  setPreset(name: PresetName): void
  /** Scene tool: 'select' (default), 'markers' (click the rail to stick a mark), 'level', 'tape' (choose what to measure). */
  setTool?(tool: Tool): void
  /** Tape measure target shown in the scene (null: the tape measure rests on the tray). */
  setTapeTarget?(target: TapeTarget | null): void
  getTapeTarget?(): TapeTarget | null
  /** The 'mark' view frames +-12 cm around this mark (cm from A, perpendicular to the rail) and follows changes. */
  setMarkTarget(markFromA_cm: number): void
}
export type { Tool as Scene3DTool }

/** True when a WebGL2 context can be created. Releases the probe context right away. */
export function webgl2Available(): boolean {
  try {
    const c = document.createElement('canvas')
    const gl = c.getContext('webgl2')
    if (!gl) return false
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return true
  } catch { return false }
}

export function mountScene3D(root: HTMLElement, ctx: ViewContext, opts: Scene3DOptions = {}): Scene3DView {
  const S = () => strings[ctx.lang()]
  const camParam = parsePreset(new URLSearchParams(location.search).get('cam')) // 'alongRail' is an alias of 'lateral'
  // a portrait phone shows the 1.2 m bench only as a thin strip: start at the stand end where the cart waits
  const portraitPhone = matchMedia('(max-width: 819px) and (orientation: portrait)').matches
  const initial: PresetName = parsePreset(opts.preset) ?? camParam ?? (portraitPhone ? 'highEnd' : 'overview')

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
  const toolBtns = TOOL_ORDER.map((t) => {
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
  root.append(wrap)

  let scene: Scene3D | null = null
  let destroyed = false
  let current: PresetName = initial
  let tool: Tool = 'select'
  let pendingFocus: string[] | null = null
  let pendingTarget: TapeTarget | null | undefined
  let cardInfo: CardInfo | null = null
  let pendingMark: number | null = null

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
    toolBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(TOOL_ORDER[i] === tool)))
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
    viewMenu.setItems(PRESET_ORDER.map((p) => ({ id: p, label: s.presets[p] })))
    toolMenu.setLabel(s.toolMenu)
    toolMenu.setItems(TOOL_ORDER.map((t) => ({ id: t, label: s.tools[t] })))
    toolRow.setAttribute('aria-label', s.toolsLabel)
    toolBtns.forEach((b, i) => { b.textContent = s.tools[TOOL_ORDER[i]!] })
    syncPresets()
    syncTools()
    scene?.relabel()
    showCard(cardInfo)
  }
  relabel()
  syncPresets()
  syncTools()

  import('./scene.ts').then(({ createScene }) => {
    if (destroyed) return
    try {
      scene = createScene(stage, ctx, {
        initialPreset: initial,
        onCard: showCard,
        onFail: (r) => opts.onFail?.(r),
        onStatus: (t) => { status.textContent = t },
        onTapeTarget: opts.onTapeTarget,
        openPanel: opts.openPanel,
      })
      status.textContent = ''
      if (pendingMark !== null) scene.setMarkTarget(pendingMark)
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
      scene?.update()
    },
    relabel,
    focus(list) { pendingFocus = list; scene?.focus(list) },
    setVisible(v) { wrap.hidden = !v; scene?.setVisible(v) },
    setPreset: choose,
    setMarkTarget(m) { pendingMark = m; scene?.setMarkTarget(m) },
    setTool,
    setTapeTarget(t) { pendingTarget = t; scene?.setTapeTarget(t) },
    getTapeTarget: () => scene?.getTapeTarget() ?? (pendingTarget ?? null),
    destroy() {
      destroyed = true
      toolMenu.destroy(); viewMenu.destroy()
      scene?.destroy()
      scene = null
      wrap.remove()
    },
  }
}
