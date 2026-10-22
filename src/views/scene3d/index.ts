// Public entry of the 3D table scene: mountScene3D(root, ctx, opts) returns a View. It paints its (cheap) overlay immediately
// and lazy-loads scene.ts, which pulls in three.js as a separate chunk, so the first paint does not wait for it.
import '../../styles/scene3d.css'
import type { CaliperTarget } from '../../apparatus/index.ts'
import type { View, ViewContext } from '../view.ts'
import { strings } from '../strings/scene3d.ts'
import type { Scene3D, Tool } from './scene.ts'
import type { CardInfo } from './types.ts'

export type PresetName = 'overview' | 'highEnd' | 'lowEnd' | 'alongRail' | 'caliper'
const PRESET_ORDER: readonly PresetName[] = ['overview', 'highEnd', 'lowEnd', 'alongRail', 'caliper']
const TOOL_ORDER: readonly Tool[] = ['select', 'markers', 'level', 'caliper']

export interface Scene3DOptions {
  /** The scene cannot start (no WebGL2, lost context): the shell falls back to the 2D side view. */
  onFail?(reason: string): void
  preset?: PresetName
  /** A part card asks to open the matching 2D panel (e.g. 'stopwatch', 'caliper', 'inventory'). */
  openPanel?(panel: string): void
  /** The student chose a caliper target in the scene (click on a support or a rail position). */
  onCaliperTarget?(target: CaliperTarget): void
}

export type Scene3DView = View & {
  setVisible(visible: boolean): void
  setPreset(name: PresetName): void
  /** Scene tool: 'select' (default), 'markers' (click the rail to stick a mark), 'level', 'caliper' (choose what to measure). */
  setTool?(tool: Tool): void
  /** Caliper target shown in the scene (null: the caliper rests on the table). */
  setCaliperTarget?(target: CaliperTarget | null): void
  getCaliperTarget?(): CaliperTarget | null
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
  const camParam = new URLSearchParams(location.search).get('cam') as PresetName | null
  // a portrait phone shows the 1.2 m bench only as a thin strip: start at the stand end where the cart waits
  const portraitPhone = matchMedia('(max-width: 819px) and (orientation: portrait)').matches
  const initial: PresetName = opts.preset ?? (camParam && PRESET_ORDER.includes(camParam) ? camParam : portraitPhone ? 'highEnd' : 'overview')

  const wrap = document.createElement('div')
  wrap.className = 'scene3d'
  const stage = document.createElement('div')
  stage.className = 'scene3d-stage'
  stage.setAttribute('role', 'group')

  const status = document.createElement('p')
  status.className = 'scene3d-status'
  status.setAttribute('role', 'status')
  stage.append(status)

  const presets = document.createElement('div')
  presets.className = 'scene3d-presets'
  presets.setAttribute('role', 'group')
  const presetBtns = PRESET_ORDER.map((p) => {
    const b = document.createElement('button')
    b.type = 'button'
    b.dataset.preset = p
    b.addEventListener('click', () => choose(p))
    presets.append(b)
    return b
  })
  const tools = document.createElement('div')
  tools.className = 'scene3d-tools'
  tools.setAttribute('role', 'group')
  const toolBtns = TOOL_ORDER.map((t) => {
    const b = document.createElement('button')
    b.type = 'button'
    b.dataset.tool = t
    b.addEventListener('click', () => setTool(t))
    tools.append(b)
    return b
  })
  const release = document.createElement('button')
  release.type = 'button'
  release.className = 'scene3d-release'
  release.hidden = true
  release.addEventListener('click', (e) => {
    const r = ctx.apparatus.releaseCart(e.timeStamp)
    if (r.ok) ctx.changed(); else showCard(refusal(r.reason))
  })
  const card = document.createElement('div')
  card.className = 'scene3d-card'
  card.hidden = true
  card.setAttribute('aria-live', 'polite')
  stage.append(tools, presets, release, card)
  wrap.append(stage)
  root.append(wrap)

  let scene: Scene3D | null = null
  let destroyed = false
  let current: PresetName = initial
  let tool: Tool = 'select'
  let pendingFocus: string[] | null = null
  let pendingTarget: CaliperTarget | null | undefined
  let cardInfo: CardInfo | null = null

  const refusal = (reason: string): CardInfo => ({
    title: '', text: (S().refused as Record<string, string>)[reason] ?? `${S().refusedGeneric} (${reason}).`, actions: [], panel: null, alert: true,
  })
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

  const syncPresets = (): void => presetBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(PRESET_ORDER[i] === current)))
  const syncTools = (): void => toolBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(TOOL_ORDER[i] === tool)))
  function choose(p: PresetName): void {
    current = p
    syncPresets()
    scene?.setPreset(p)
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
    presets.setAttribute('aria-label', s.presetsLabel)
    tools.setAttribute('aria-label', s.toolsLabel)
    presetBtns.forEach((b, i) => { b.textContent = s.presets[PRESET_ORDER[i]!] })
    toolBtns.forEach((b, i) => { b.textContent = s.tools[TOOL_ORDER[i]!] })
    release.textContent = s.release
    release.title = s.releaseHint
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
        onCaliperTarget: opts.onCaliperTarget,
        openPanel: opts.openPanel,
      })
      status.textContent = ''
      if (pendingFocus) scene.focus(pendingFocus)
      if (pendingTarget !== undefined) scene.setCaliperTarget(pendingTarget)
      if (current !== initial) scene.setPreset(current)
      if (tool !== 'select') scene.setTool(tool)
    } catch (err) {
      opts.onFail?.(String(err))
    }
  }).catch((err) => { if (!destroyed) opts.onFail?.(String(err)) })

  stage.addEventListener('keydown', (e) => { if (e.key === 'Escape') showCard(null) })

  return {
    update() {
      // the release handle: shown while the cart waits at its start on a complete track
      const a = ctx.apparatus
      const show = scene !== null && a.canRun().ok && a.cartState(ctx.now()).phase === 'atStart'
      if (release.hidden === show) release.hidden = !show
      scene?.update()
    },
    relabel,
    focus(list) { pendingFocus = list; scene?.focus(list) },
    setVisible(v) { wrap.hidden = !v; scene?.setVisible(v) },
    setPreset: choose,
    setTool,
    setCaliperTarget(t) { pendingTarget = t; scene?.setCaliperTarget(t) },
    getCaliperTarget: () => scene?.getCaliperTarget() ?? (pendingTarget ?? null),
    destroy() {
      destroyed = true
      scene?.destroy()
      scene = null
      wrap.remove()
    },
  }
}
