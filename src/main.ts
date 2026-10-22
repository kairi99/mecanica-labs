// App shell: header, 3D / 2D stage, panels, animation loop, persistence, URL options.
import './styles/tokens.css'
import './styles/app.css'
import './styles/panels.css'
import './styles/instruments.css'
import './styles/side2d.css'
import './styles/analysis.css'
import './styles/pedagogy.css'
import { Apparatus } from './apparatus/index.ts'
import { loadLang, saveLang, type Lang } from './i18n.ts'
import type { MountView, View, ViewContext } from './views/view.ts'
import { button, el, svg } from './views/dom.ts'
import { reasonText } from './views/reasons.ts'
import { strings as shellStrings } from './views/strings/shell.ts'
import { mountInventory } from './views/inventory.ts'
import { mountAdjust } from './views/adjust.ts'
import { mountStopwatch } from './views/stopwatch.ts'
import { mountCaliper } from './views/caliper.ts'
import { mountTable } from './views/table.ts'
import { mountTablet } from './views/tablet.ts'
import { mountAnalysis } from './views/analysis.ts'
import { mountChecklist, type ChecklistHooks } from './pedagogy/checklistView.ts'
import { mountCoach } from './pedagogy/coachView.ts'
import { mountTour, type TourFlag } from './pedagogy/tour.ts'
import { fillTableSimulated } from './pedagogy/simulatedReadings.ts'
import { mountSide2d } from './views/side2d.ts'
import type { PresetName, Scene3DView } from './views/scene3d/index.ts'
import {
  clearSnapshot, loadFolds, loadSnapshot, loadStageMode, loadTheme, saveFolds, saveSnapshot, saveStageMode, saveTheme,
  type StageMode, type Theme,
} from './persist.ts'

const params = new URLSearchParams(location.search)
const PRESETS = ['overview', 'highEnd', 'lowEnd', 'alongRail', 'caliper'] as const
const camParam = params.get('cam')
const cam: PresetName | undefined = (PRESETS as readonly string[]).includes(camParam ?? '') ? (camParam as PresetName) : undefined
const showAnalysis = params.get('analysis') !== '0'
/** ?teacher shows target values (checklist angle, the model's expected a in the analysis comparison). */
const teacher = params.has('teacher') && params.get('teacher') !== '0'
const tourParam = params.get('tour')
const tourFlag: TourFlag = tourParam === '0' || tourParam === '1' ? tourParam : null
/** Dev builds only: ?demo=table fills Table 1.1 with simulated human readings (screenshots, manual checks). Never persisted. */
const demoTable = import.meta.env.DEV && params.get('demo') === 'table'

// ---- language and theme --------------------------------------------------------------------------------------------
let lang: Lang = loadLang()
const S = () => shellStrings[lang]
const THEMES: Theme[] = ['auto', 'light', 'dark']
const themeParam = params.get('theme')
let theme: Theme = themeParam === 'light' || themeParam === 'dark' ? themeParam : loadTheme()
function applyTheme(): void {
  if (theme === 'auto') document.documentElement.removeAttribute('data-theme')
  else document.documentElement.dataset.theme = theme
}
const THEME_ICON: Record<Theme, Array<[string, Record<string, string>]>> = {
  auto: [['circle', { cx: '12', cy: '12', r: '8' }], ['path', { d: 'M12 4a8 8 0 0 0 0 16z', fill: 'currentColor' }]],
  light: [['circle', { cx: '12', cy: '12', r: '4' }], ['path', { d: 'M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4' }]],
  dark: [['path', { d: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z' }]],
}
function themeIcon(th: Theme): SVGElement {
  const s = svg('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', class: 'icon' })
  for (const [tag, attrs] of THEME_ICON[th]) s.append(svg(tag as 'path', attrs))
  return s
}

// ---- apparatus -----------------------------------------------------------------------------------------------------
function randomSeed(): number {
  try { return crypto.getRandomValues(new Uint32Array(1))[0]! } catch { return (Date.now() & 0x7fffffff) >>> 0 }
}
const seedParam = params.get('seed') !== null ? Number(params.get('seed')) : NaN
const presetParam = params.get('preset')
function createApp(): Apparatus {
  if (demoTable) {
    const a = new Apparatus({ seed: Number.isFinite(seedParam) ? seedParam : 7 })
    a.preset('assembled')
    fillTableSimulated(a, { seed: 11 })
    return a
  }
  const wantSeed = Number.isFinite(seedParam) ? seedParam : null
  if (presetParam === 'assembled' || presetParam === 'empty') {
    const a = new Apparatus({ seed: wantSeed ?? randomSeed() })
    a.preset(presetParam)
    return a
  }
  const saved = loadSnapshot()
  if (saved && (wantSeed === null || saved.seed === wantSeed)) {
    const a = new Apparatus({ seed: saved.seed })
    const r = a.load(saved)
    if (r.ok) {
      // Timestamps are relative to the page load: a run or a running stopwatch from a previous visit cannot continue.
      if (a.getState().cart.released) a.resetCart()
      if (a.getState().stopwatch.running) a.stopwatchReset()
      return a
    }
  }
  const a = new Apparatus({ seed: wantSeed ?? randomSeed() })
  a.preset('empty')
  return a
}
const app = createApp()

// ---- persistence -----------------------------------------------------------------------------------------------------
let saveTimer = 0
function schedulePersist(): void {
  if (saveTimer || demoTable) return
  saveTimer = window.setTimeout(() => { saveTimer = 0; saveSnapshot(app.snapshot()) }, 400)
}

// ---- context ---------------------------------------------------------------------------------------------------------
const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
const ctx: ViewContext = {
  get apparatus() { return app },
  lang: () => lang,
  reducedMotion: () => reducedQuery.matches,
  now: () => performance.now(),
  changed: () => schedulePersist(),
}

// ---- DOM skeleton ------------------------------------------------------------------------------------------------------
const rootEl = document.getElementById('app')!
const header = el('header', 'topbar')
const titleWrap = el('div', 'title-wrap')
const h1 = el('h1')
const sub = el('p', 'subtitle')
titleWrap.append(h1, sub)
const tools = el('div', 'tools')
const langBtn = button('', 'tool tool-lang')
const themeBtn = button('', 'tool')
const helpBtn = el('a', 'tool tool-help', '?', { target: '_blank', rel: 'noopener' })
tools.append(langBtn, themeBtn, helpBtn)
header.append(titleWrap, tools)

const main = el('main', 'layout')
const colMain = el('div', 'col col-main')
const colSide = el('div', 'col col-side')
main.append(colMain, colSide)

// stage
const stage = el('section', 'stage-card', undefined, { 'data-region': 'stage', 'data-panel': 'stage' })
const stageHead = el('div', 'stage-head')
const modeSeg = el('div', 'seg', undefined, { role: 'group' })
const btn3d = button('', 'seg-btn')
const btn2d = button('', 'seg-btn')
modeSeg.append(btn3d, btn2d)
const newBtn = button('', 'btn btn-quiet')
const stageNotice = el('p', 'stage-notice', undefined, { role: 'status' })
stageHead.append(modeSeg, stageNotice, newBtn)
const stageBody = el('div', 'stage-body')
const host3d = el('div', 'stage-3d')
const host2d = el('div', 'stage-2d')
stageBody.append(host3d, host2d)
const toast = el('p', 'toast', undefined, { role: 'status', 'aria-live': 'polite' })
toast.hidden = true
const newConfirm = el('div', 'confirm', undefined, { role: 'alertdialog' })
newConfirm.hidden = true
const newText = el('p')
const newYes = button('', 'btn btn-danger')
const newNo = button('', 'btn btn-quiet')
newConfirm.append(newText, newYes, newNo)
stage.append(stageHead, newConfirm, stageBody, toast)
colMain.append(stage)

// panels
const mounts: Array<{ mount: MountView; host: HTMLElement; id: string }> = []
const slot = (id: string, host: HTMLElement, mount: MountView): void => { mounts.push({ mount, host, id }) }
slot('stopwatch', colMain, mountStopwatch)
slot('table', colMain, mountTable)
slot('tablet', colMain, mountTablet)
slot('inventory', colSide, mountInventory)
slot('adjust', colSide, mountAdjust)
slot('caliper', colSide, mountCaliper)
const checklistHooks: ChecklistHooks = {
  teacher,
  onShow: (step) => showStep(step.panel, step.focus),
  onTour: () => tour.start(),
}
slot('procedure', colSide, mountChecklist(checklistHooks))
if (showAnalysis) slot('analysis', colSide, mountAnalysis({ teacher }))
else {
  // Teachers: the analysis region stays in the DOM (phase 4 fills it) but hidden.
  const hidden = el('div', undefined, undefined, { 'data-region': 'analysis' })
  hidden.hidden = true
  colSide.append(hidden)
}

const footer = el('footer', 'credits')
rootEl.append(header, main, footer)

// ---- views -------------------------------------------------------------------------------------------------------------
const panelViews: View[] = []
const folds = loadFolds()
function addFold(root: HTMLElement, id: string): void {
  const c = root.querySelector<HTMLElement>(':scope > .card')
  if (!c) return
  const head = c.querySelector<HTMLElement>('.card-head')!
  const bodyEl = c.querySelector<HTMLElement>('.card-body')!
  const title = c.querySelector<HTMLElement>('.card-title')!
  const b = button('', 'fold', () => set(!(bodyEl.hidden)))
  b.append(svg('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', class: 'icon fold-icon' }, svg('path', { d: 'M6 9l6 6 6-6' })))
  b.dataset.foldFor = id
  const label = (): void => {
    const t = S()
    const name = title.textContent ?? id
    b.setAttribute('aria-label', (bodyEl.hidden ? t.expand : t.collapse).replace('{x}', name))
    b.setAttribute('aria-expanded', String(!bodyEl.hidden))
  }
  function set(collapse: boolean): void {
    bodyEl.hidden = collapse
    c!.classList.toggle('collapsed', collapse)
    folds[id] = collapse
    saveFolds(folds)
    label()
  }
  head.append(b)
  bodyEl.hidden = folds[id] === true
  c.classList.toggle('collapsed', bodyEl.hidden)
  label()
  new MutationObserver(label).observe(title, { childList: true, characterData: true, subtree: true })
}
for (const m of mounts) {
  const tmp = el('div', 'slot', undefined, { 'data-slot': m.id })
  m.host.append(tmp)
  panelViews.push(m.mount(tmp, ctx))
  addFold(tmp, m.id)
}

let view2d: View | null = null
let scene3d: Scene3DView | null = null
let failed3d = false
let loading3d = false
let mode: StageMode = loadStageMode() ?? '3d'
let notice = ''

function openPanel(id: string, scroll = true): void {
  const c = document.querySelector<HTMLElement>(`[data-panel="${CSS.escape(id)}"]`)
  if (!c) return
  const fold = c.querySelector<HTMLButtonElement>('.fold')
  if (fold && c.classList.contains('collapsed')) fold.click()
  if (!scroll) return
  c.scrollIntoView({ behavior: reducedQuery.matches ? 'auto' : 'smooth', block: 'start' })
  const h = c.querySelector<HTMLElement>('.card-title')
  if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }) }
}

/** Checklist "show me": open the panel, highlight the 3D parts for a few seconds. On narrow screens the stage is the thing to see. */
let focusTimer = 0
const narrowQuery = window.matchMedia('(max-width: 1079px)')
function showStep(panel: string, focus: string[]): void {
  const withStage = focus.length > 0 && effectiveMode() === '3d'
  if (withStage) {
    scene3d?.focus?.(focus)
    window.clearTimeout(focusTimer)
    focusTimer = window.setTimeout(() => scene3d?.focus?.(null), 8000)
  }
  if (withStage && narrowQuery.matches) {
    openPanel(panel, false)
    stage.scrollIntoView({ behavior: reducedQuery.matches ? 'auto' : 'smooth', block: 'start' })
  } else openPanel(panel)
}

function ensure2d(): void {
  if (!view2d) view2d = mountSide2d(host2d, ctx)
}
async function ensure3d(): Promise<void> {
  if (scene3d || failed3d || loading3d) return
  loading3d = true
  stageNotice.textContent = S().loading3d
  try {
    const mod = await import('./views/scene3d/index.ts')
    if (!mod.webgl2Available()) { fail3d(S().noticeNoWebgl); return }
    scene3d = mod.mountScene3D(host3d, ctx, {
      preset: cam,
      openPanel,
      onFail: () => fail3d(S().notice3d),
    })
  } catch {
    fail3d(S().notice3d)
  } finally {
    loading3d = false
    if (!failed3d) stageNotice.textContent = notice
  }
}
function fail3d(msg: string): void {
  failed3d = true
  notice = msg
  scene3d?.destroy()
  scene3d = null
  setMode('2d', false)
}

function effectiveMode(): StageMode { return mode === '3d' && !failed3d ? '3d' : '2d' }
function setMode(m: StageMode, persist = true): void {
  mode = m
  if (persist) saveStageMode(m)
  if (effectiveMode() === '2d') ensure2d()
  else void ensure3d()
  host3d.hidden = effectiveMode() !== '3d'
  host2d.hidden = effectiveMode() !== '2d'
  scene3d?.setVisible(effectiveMode() === '3d')
  stageNotice.textContent = failed3d ? notice : ''
  const eff = effectiveMode()
  btn3d.classList.toggle('active', eff === '3d'); btn2d.classList.toggle('active', eff === '2d')
  btn3d.setAttribute('aria-pressed', String(eff === '3d')); btn2d.setAttribute('aria-pressed', String(eff === '2d'))
  btn3d.setAttribute('aria-disabled', String(failed3d)); if (!failed3d) btn3d.removeAttribute('aria-disabled')
  btn3d.title = failed3d ? notice : ''
}
btn3d.addEventListener('click', () => { if (!failed3d) setMode('3d') })
btn2d.addEventListener('click', () => setMode('2d'))

// start over
newBtn.addEventListener('click', () => { newConfirm.hidden = false; newYes.focus() })
newNo.addEventListener('click', () => { newConfirm.hidden = true; newBtn.focus() })
newYes.addEventListener('click', () => {
  newConfirm.hidden = true
  clearSnapshot()
  app.preset('empty')
  relabelAll()
  schedulePersist()
})

// ---- toast for refusals ---------------------------------------------------------------------------------------------------
let toastTimer = 0
function hookEvents(): void {
  app.on((e) => {
    if (e.type === 'refused') {
      toast.textContent = reasonText(lang, e.reason)
      toast.hidden = false
      window.clearTimeout(toastTimer)
      toastTimer = window.setTimeout(() => { toast.hidden = true }, 7000)
    } else schedulePersist()
  })
}
hookEvents()

// ---- header, language, theme, help ----------------------------------------------------------------------------------------
function labelShell(): void {
  const t = S()
  document.documentElement.lang = lang
  document.title = t.title
  h1.textContent = t.title
  sub.textContent = t.subtitle
  main.setAttribute('aria-label', t.regionMain)
  stage.setAttribute('aria-label', t.regionStage)
  langBtn.textContent = lang === 'es' ? 'EN' : 'ES'
  langBtn.setAttribute('aria-label', t.langSwitch)
  themeBtn.replaceChildren(themeIcon(theme))
  themeBtn.setAttribute('aria-label', `${t.theme}: ${t.themes[theme]}`)
  themeBtn.title = `${t.theme}: ${t.themes[theme]}`
  helpBtn.setAttribute('aria-label', t.help)
  modeSeg.setAttribute('aria-label', t.viewMode)
  btn3d.textContent = t.view3d
  btn2d.textContent = t.view2d
  newBtn.textContent = t.new
  newText.textContent = t.newConfirm
  newYes.textContent = t.newYes
  newNo.textContent = t.newNo
  footer.textContent = t.credits
  helpBtn.setAttribute('href', lang === 'es' ? 'help/index.html' : 'help/en.html')
  helpBtn.setAttribute('hreflang', lang)
  if (failed3d) notice = S().notice3d
  stageNotice.textContent = failed3d ? notice : ''
}
function relabelAll(): void {
  labelShell()
  for (const v of panelViews) v.relabel()
  view2d?.relabel()
  scene3d?.relabel()
  coach.relabel()
  tour.relabel()
}
langBtn.addEventListener('click', () => { lang = lang === 'es' ? 'en' : 'es'; saveLang(lang); relabelAll() })
themeBtn.addEventListener('click', () => {
  theme = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length]!
  saveTheme(theme); applyTheme(); labelShell()
})

// ---- go -------------------------------------------------------------------------------------------------------------------
const coach = mountCoach(ctx)
const tour = mountTour(ctx)
applyTheme()
labelShell()
setMode(mode, false)
if (tour.shouldAutoStart(tourFlag)) window.setTimeout(() => tour.start(), 900)
schedulePersist()

function frame(): void {
  for (const v of panelViews) v.update()
  if (effectiveMode() === '2d') view2d?.update()
  else scene3d?.update()
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)
window.addEventListener('pagehide', () => saveSnapshot(app.snapshot()))
