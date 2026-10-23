// App shell: header with the step tracker, 3D / 2D stage with the timing bar, one panel per lab step, animation loop,
// persistence, URL options (?lang ?theme ?preset ?seed ?cam ?view ?step ?tour ?teacher ?analysis).
import './styles/tokens.css'
import './styles/app.css'
import './styles/layout.css'
import './styles/panels.css'
import './styles/instruments.css'
import './styles/side2d.css'
import './styles/analysis.css'
import './styles/pedagogy.css'
import { Apparatus, TABLE_POSITIONS_cm } from './apparatus/index.ts'
import { loadLang, saveLang, type Lang } from './i18n.ts'
import type { MountView, View, ViewContext } from './views/view.ts'
import { button, el, svg } from './views/dom.ts'
import { mountMenu } from './views/menu.ts'
import { reasonText } from './views/reasons.ts'
import { strings as shellStrings } from './views/strings/shell.ts'
import { mountInventory } from './views/inventory.ts'
import { mountAdjust } from './views/adjust.ts'
import { mountStopwatch } from './views/stopwatch.ts'
import { mountTimingBar } from './views/timingbar.ts'
import { mountCaliper } from './views/caliper.ts'
import { mountTable } from './views/table.ts'
import { mountTablet } from './views/tablet.ts'
import { mountAnalysis } from './views/analysis.ts'
import { getMarkRow, onMarkRow } from './views/uistate.ts'
import { mountChecklist, type ChecklistHooks } from './pedagogy/checklistView.ts'
import type { ChecklistStep, StepId } from './pedagogy/checklist.ts'
import { strings as checklistStrings } from './pedagogy/strings/checklist.ts'
import { mountCoach } from './pedagogy/coachView.ts'
import { mountTour, type TourFlag, type TourStepId } from './pedagogy/tour.ts'
import { fillTableSimulated } from './pedagogy/simulatedReadings.ts'
import { mountSide2d } from './views/side2d.ts'
import type { PresetName as ScenePreset, Scene3DView } from './views/scene3d/index.ts'
import {
  clearSnapshot, loadAutoMark, loadSnapshot, loadStageMode, loadStep, loadTheme, saveAutoMark, saveSnapshot, saveStageMode, saveStep, saveTheme,
  type StageMode, type Theme,
} from './persist.ts'

const params = new URLSearchParams(location.search)

/** Camera presets agreed with the 3D scene: 'alongRail' is gone, 'lateral' and 'mark' are new. */
const PRESETS = ['overview', 'highEnd', 'lowEnd', 'lateral', 'mark', 'caliper'] as const
const camParam = params.get('cam')
type Cam = (typeof PRESETS)[number]
const cam: Cam | undefined = (PRESETS as readonly string[]).includes(camParam ?? '') ? (camParam as Cam) : undefined
const showAnalysis = params.get('analysis') !== '0'
/** ?teacher shows target values (checklist angle, the model's expected a in the analysis comparison). */
const teacher = params.has('teacher') && params.get('teacher') !== '0'
const tourParam = params.get('tour')
const tourFlag: TourFlag = tourParam === '0' || tourParam === '1' ? tourParam : null
/** Dev builds only: ?demo=table fills Table 1.1 with simulated human readings (screenshots, manual checks). Never persisted. */
const demoTable = import.meta.env.DEV && params.get('demo') === 'table'
const STEP_COUNT = showAnalysis ? 5 : 4

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
const phoneQuery = window.matchMedia('(max-width: 819px)')

// ---- DOM skeleton ------------------------------------------------------------------------------------------------------
const rootEl = document.getElementById('app')!

// header: title · step tracker (or the step menu on phones) · tools
const header = el('header', 'topbar')
const h1 = el('h1', 'title')
const titleLong = el('span', 'title-long')
const titleShort = el('span', 'title-short')
h1.append(titleLong, titleShort)
const tracker = el('nav', 'tracker', undefined, { 'data-region': 'steps' })
const trackerList = el('ol', 'tracker-list')
tracker.append(trackerList)
const stepMenuBtn = button('', 'tool step-menu-btn', undefined)
stepMenuBtn.dataset.region = 'steps-menu'
const stepMenuItems: HTMLButtonElement[] = []
for (let i = 0; i < STEP_COUNT; i++) {
  const b = button('', 'menu-item', () => setStep(i + 1, { scroll: true }))
  b.setAttribute('role', 'menuitemradio')
  stepMenuItems.push(b)
}
const stepMenu = mountMenu(stepMenuBtn, stepMenuItems, { align: 'left' })
stepMenu.wrap.classList.add('step-menu')
const tools = el('div', 'tools')
const langBtn = button('', 'tool tool-lang')
const themeBtn = button('', 'tool tool-theme')
const helpBtn = el('a', 'tool tool-help', '?', { target: '_blank', rel: 'noopener' })
const moreBtn = button('', 'tool tool-more')
moreBtn.append(svg('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', class: 'icon' }, svg('circle', { cx: 5, cy: 12, r: 1.6 }), svg('circle', { cx: 12, cy: 12, r: 1.6 }), svg('circle', { cx: 19, cy: 12, r: 1.6 })))
const moreLang = button('', 'menu-item only-narrow', () => langBtn.click())
const moreTheme = button('', 'menu-item only-narrow', () => themeBtn.click())
const moreNew = button('', 'menu-item', () => { newDialog.showModal(); newYes.focus() })
const moreMenu = mountMenu(moreBtn, [moreLang, moreTheme, moreNew], { align: 'right' })
tools.append(langBtn, themeBtn, helpBtn, moreMenu.wrap)
header.append(h1, tracker, stepMenu.wrap, tools)

const main = el('main', 'layout')

// stage column: the card holds the canvas and, below it, the timing bar
const stageCol = el('div', 'stage-col')
const stage = el('section', 'stage-card', undefined, { 'data-region': 'stage', 'data-panel': 'stage' })
const stageBody = el('div', 'stage-body')
const host3d = el('div', 'stage-3d')
const host2d = el('div', 'stage-2d')
const modeSeg = el('div', 'seg stage-mode', undefined, { role: 'group' })
const btn3d = button('', 'seg-btn')
const btn2d = button('', 'seg-btn')
modeSeg.append(btn3d, btn2d)
const stageNotice = el('p', 'stage-notice', undefined, { role: 'status' })
const toast = el('p', 'toast', undefined, { role: 'status', 'aria-live': 'polite' })
toast.hidden = true
stageBody.append(host3d, host2d, modeSeg, stageNotice, toast)
const timingHost = el('div', 'timing-host')
stage.append(stageBody, timingHost)
stageCol.append(stage)

// start-over confirmation (modal dialog: focus trap and Escape for free)
const newDialog = el('dialog', 'confirm-dialog')
const newText = el('p')
const newActions = el('div', 'confirm-actions')
const newYes = button('', 'btn btn-danger', () => {
  newDialog.close()
  clearSnapshot()
  app.preset('empty')
  setStep(1, { scroll: true })
  relabelAll()
  schedulePersist()
})
const newNo = button('', 'btn btn-quiet', () => newDialog.close())
newActions.append(newYes, newNo)
newDialog.append(newText, newActions)

// panel column: procedure bar and drawer, the five step panes, previous / next, credits
const panelCol = el('div', 'panel-col', undefined, { role: 'region' })
const sheetHandle = button('', 'sheet-handle')
sheetHandle.append(el('span', 'sheet-grip'))
const procBar = el('div', 'proc-bar')
const procBtn = button('', 'proc-btn')
const procLabel = el('span', 'proc-label')
const procCount = el('span', 'proc-count')
const procNext = el('span', 'proc-next')
procBtn.append(procLabel, procCount, procNext, svg('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', class: 'icon proc-caret' }, svg('path', { d: 'M6 9l6 6 6-6' })))
procBar.append(procBtn)
const procDrawer = el('div', 'proc-drawer')
procDrawer.hidden = true
procBtn.setAttribute('aria-expanded', 'false')
procBtn.addEventListener('click', () => setProcOpen(procDrawer.hidden === true))
function setProcOpen(open: boolean): void {
  procDrawer.hidden = !open
  procBtn.setAttribute('aria-expanded', String(open))
  procBar.classList.toggle('open', open)
}
const panes: HTMLElement[] = []
for (let i = 1; i <= STEP_COUNT; i++) {
  const p = el('section', 'step-pane', undefined, { 'data-step': String(i) })
  panes.push(p)
}
const stepNav = el('div', 'step-nav')
const prevBtn = button('', 'btn btn-quiet', () => setStep(currentStep - 1, { scroll: true }))
const nextBtn = button('', 'btn btn-primary', () => setStep(currentStep + 1, { scroll: true }))
stepNav.append(prevBtn, nextBtn)
const footer = el('footer', 'credits')
panelCol.append(sheetHandle, procBar, procDrawer, ...panes, stepNav, footer)

main.append(stageCol, panelCol)
rootEl.append(header, main, newDialog)

// ---- steps ---------------------------------------------------------------------------------------------------------------
/** Which lab step holds each panel (data-panel). */
const PANEL_STEP: Record<string, number> = { inventory: 1, adjust: 2, caliper: 2, table: 3, stopwatch: 3, tablet: 4, analysis: 5, stage: 0, procedure: 0 }
const TOUR_STEP: Partial<Record<TourStepId, number>> = { inventory: 1, adjust: 2, caliper: 2, stopwatch: 3, table: 3, tablet: 4, analysis: 5 }

const trackerBtns: HTMLButtonElement[] = []
const trackerMarks: HTMLElement[] = []
const trackerLabels: HTMLElement[] = []
for (let i = 0; i < STEP_COUNT; i++) {
  const li = el('li', 'tracker-item')
  const b = button('', 'tracker-tab', () => setStep(i + 1, { scroll: true }))
  const mark = el('span', 'tracker-num', String(i + 1), { 'aria-hidden': 'true' })
  const label = el('span', 'tracker-label')
  b.append(mark, label)
  li.append(b)
  trackerList.append(li)
  trackerBtns.push(b); trackerMarks.push(mark); trackerLabels.push(label)
}
let stepDone: boolean[] = new Array<boolean>(STEP_COUNT).fill(false)

const urlStep = Number(params.get('step'))
let currentStep = Number.isInteger(urlStep) && urlStep >= 1 && urlStep <= STEP_COUNT ? urlStep : Math.min(loadStep() ?? 1, STEP_COUNT)

/** Show one step. Remembered, deep-linkable (?step=n). Entering step 3 on a phone switches the camera to the Mark view. */
function setStep(n: number, opts: { scroll?: boolean } = {}): void {
  const next = Math.max(1, Math.min(STEP_COUNT, Math.round(n)))
  const changed = next !== currentStep
  currentStep = next
  if (!demoTable) saveStep(next)
  panes.forEach((p, i) => { p.hidden = i + 1 !== next })
  main.dataset.step = String(next)
  document.body.dataset.step = String(next)
  paintSteps()
  if (opts.scroll && changed) {
    if (phoneQuery.matches) window.scrollTo({ top: 0, behavior: reducedQuery.matches ? 'auto' : 'smooth' })
    else panelCol.scrollTo({ top: 0 })
  }
  if (changed && next === 3 && phoneQuery.matches) setCamera('mark')
}
function paintSteps(): void {
  const t = S()
  trackerBtns.forEach((b, i) => {
    const active = i + 1 === currentStep
    b.classList.toggle('active', active)
    b.classList.toggle('done', stepDone[i] === true)
    if (active) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current')
    trackerMarks[i]!.textContent = stepDone[i] === true ? '✓' : String(i + 1)
    trackerLabels[i]!.textContent = t.stepNames[i]!
    b.setAttribute('aria-label', `${i + 1}. ${t.stepNames[i]}${stepDone[i] ? ` (${t.stepDone})` : ''}`)
  })
  stepMenuItems.forEach((b, i) => {
    b.textContent = `${stepDone[i] ? '✓' : String(i + 1)}  ${t.stepNames[i]}`
    b.setAttribute('aria-checked', String(i + 1 === currentStep))
    b.classList.toggle('active', i + 1 === currentStep)
  })
  stepMenuBtn.replaceChildren(document.createTextNode(`${currentStep}/${STEP_COUNT} ${t.stepShort[currentStep - 1]}`), svg('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', class: 'icon caret' }, svg('path', { d: 'M6 9l6 6 6-6' })))
  stepMenuBtn.setAttribute('aria-label', `${t.stepsMenu}: ${t.stepOf.replace('{n}', String(currentStep)).replace('{total}', String(STEP_COUNT)).replace('{name}', t.stepNames[currentStep - 1]!)}`)
  prevBtn.textContent = `‹ ${t.prevStep}`
  nextBtn.textContent = `${t.nextStep} ›`
  prevBtn.hidden = currentStep === 1
  nextBtn.hidden = currentStep === STEP_COUNT
  stepNav.hidden = prevBtn.hidden && nextBtn.hidden
}

// ---- panel slots ---------------------------------------------------------------------------------------------------------
const mounts: Array<{ mount: MountView; host: HTMLElement; id: string }> = []
const slot = (id: string, step: number, mount: MountView): void => { mounts.push({ mount, host: panes[step - 1]!, id }) }
slot('inventory', 1, mountInventory)
slot('adjust', 2, mountAdjust)
slot('caliper', 2, mountCaliper)
slot('table', 3, mountTable)
slot('stopwatch', 3, mountStopwatch({ autoMark: { get: () => autoMark, set: (on) => { autoMark = on; saveAutoMark(on) } } }))
slot('tablet', 4, mountTablet)
if (showAnalysis) slot('analysis', 5, mountAnalysis({ teacher }))

// The procedure checklist lives in a drawer opened from the bar at the top of the panel; "show me" jumps to the right step.
const checklistHooks: ChecklistHooks = {
  teacher,
  onShow: (step) => showStep(step.panel, step.focus),
  onTour: () => tour.start(),
  onProgress: (steps, next) => paintProgress(steps, next),
}
mounts.push({ mount: mountChecklist(checklistHooks), host: procDrawer, id: 'procedure' })

let autoMark = loadAutoMark()
const panelViews: View[] = []
for (const m of mounts) {
  const tmp = el('div', 'slot', undefined, { 'data-slot': m.id })
  m.host.append(tmp)
  panelViews.push(m.mount(tmp, ctx))
}
const timingBar = mountTimingBar(timingHost, ctx)
panelViews.push(timingBar)

/** Done checks of the tracker and the "next step" line, from the live checklist. */
let lastSteps: ChecklistStep[] = []
let lastNext: ChecklistStep | null = null
function paintProgress(steps: ChecklistStep[], next: ChecklistStep | null): void {
  lastSteps = steps; lastNext = next
  const ok = (ids: StepId[]): boolean => ids.every((id) => steps.find((s) => s.id === id)?.status === 'ok')
  const measured = ok(['measure'])
  stepDone = [
    ok(['materials', 'standBase', 'railClamped', 'scale', 'lowEnd', 'screws']),
    ok(['levelled', 'angle', 'marks', 'cartZero']),
    measured,
    app.getRuns().length > 0,
    measured,
  ].slice(0, STEP_COUNT)
  paintSteps()
  const t = S()
  const done = steps.filter((s) => s.status === 'ok').length
  procLabel.textContent = t.procedure
  procCount.textContent = t.procedureProgress.replace('{n}', String(done)).replace('{total}', String(steps.length))
  procNext.textContent = next ? t.procedureNext.replace('{x}', checklistStrings[lang].steps[next.id].label) : t.procedureDone
}

// ---- stage: 3D / 2D ------------------------------------------------------------------------------------------------------------
let view2d: View | null = null
let scene3d: Scene3DView | null = null
let failed3d = false
let loading3d = false
const viewParam = params.get('view')
let mode: StageMode = viewParam === '2d' || viewParam === '3d' ? viewParam : (loadStageMode() ?? '3d')
let notice = ''

/** Camera preset by name. */
function setCamera(name: Cam): void {
  if (!scene3d || effectiveMode() !== '3d') return
  scene3d.setPreset(name as ScenePreset)
}
function sendMarkTarget(): void {
  scene3d?.setMarkTarget(TABLE_POSITIONS_cm[getMarkRow()]!)
}
onMarkRow(sendMarkTarget)
app.on((e) => {
  if (e.type === 'released' && autoMark && currentStep === 3) setCamera('mark')
})

function openPanel(id: string, scroll = true): void {
  const n = PANEL_STEP[id]
  if (n && n !== currentStep) setStep(n)
  const c = document.querySelector<HTMLElement>(`[data-panel="${CSS.escape(id)}"]`)
  if (!c) return
  if (!scroll) return
  c.scrollIntoView({ behavior: reducedQuery.matches ? 'auto' : 'smooth', block: 'start' })
  const h = c.querySelector<HTMLElement>('.card-title')
  if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }) }
}

/** Checklist "show me": jump to the step, scroll to the panel and highlight the 3D parts for a few seconds. */
let focusTimer = 0
function showStep(panel: string, focus: string[]): void {
  if (focus.length > 0 && effectiveMode() === '3d') {
    scene3d?.focus?.(focus)
    window.clearTimeout(focusTimer)
    focusTimer = window.setTimeout(() => scene3d?.focus?.(null), 8000)
  }
  setProcOpen(false)
  openPanel(panel)
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
      preset: cam === 'mark' || cam === 'lateral' ? undefined : (cam as ScenePreset | undefined),
      openPanel,
      onFail: () => fail3d(S().notice3d),
    })
    sendMarkTarget()
    if (cam === 'mark' || cam === 'lateral') setCamera(cam)
    else if (!cam && currentStep === 3 && phoneQuery.matches) setCamera('mark')
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

// ---- toast for refusals ---------------------------------------------------------------------------------------------------
let toastTimer = 0
app.on((e) => {
  if (e.type === 'refused') {
    toast.textContent = reasonText(lang, e.reason)
    toast.hidden = false
    window.clearTimeout(toastTimer)
    toastTimer = window.setTimeout(() => { toast.hidden = true }, 7000)
  } else schedulePersist()
})

// ---- header, language, theme, help ----------------------------------------------------------------------------------------
function labelShell(): void {
  const t = S()
  document.documentElement.lang = lang
  document.title = t.title
  titleLong.textContent = t.title
  titleShort.textContent = t.titleShort
  main.setAttribute('aria-label', t.regionMain)
  stage.setAttribute('aria-label', t.regionStage)
  panelCol.setAttribute('aria-label', t.panelRegion)
  tracker.setAttribute('aria-label', t.stepsNav)
  langBtn.textContent = lang === 'es' ? 'EN' : 'ES'
  langBtn.setAttribute('aria-label', t.langSwitch)
  themeBtn.replaceChildren(themeIcon(theme))
  themeBtn.setAttribute('aria-label', `${t.theme}: ${t.themes[theme]}`)
  themeBtn.title = `${t.theme}: ${t.themes[theme]}`
  moreLang.textContent = t.langSwitch
  moreTheme.textContent = `${t.theme}: ${t.themes[theme]}`
  moreNew.textContent = t.new
  moreBtn.setAttribute('aria-label', t.more)
  helpBtn.setAttribute('aria-label', t.help)
  modeSeg.setAttribute('aria-label', t.viewMode)
  btn3d.textContent = t.view3d
  btn2d.textContent = t.view2d
  newText.textContent = t.newConfirm
  newYes.textContent = t.newYes
  newNo.textContent = t.newNo
  footer.textContent = t.credits
  sheetHandle.setAttribute('aria-label', t.sheetToggle)
  helpBtn.setAttribute('href', lang === 'es' ? 'help/index.html' : 'help/en.html')
  helpBtn.setAttribute('hreflang', lang)
  if (failed3d) notice = S().notice3d
  stageNotice.textContent = failed3d ? notice : ''
  paintSteps()
  if (lastSteps.length) paintProgress(lastSteps, lastNext)
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

// ---- tablet bottom sheet: closed 30 % of the viewport, open 60 %; the handle toggles it, a drag resizes it ---------------------
let sheetOpen = false
function setSheet(open: boolean): void {
  sheetOpen = open
  main.dataset.sheet = open ? 'open' : 'closed'
  main.style.removeProperty('--sheet-h')
  sheetHandle.setAttribute('aria-expanded', String(open))
}
sheetHandle.addEventListener('click', () => { if (!dragged) setSheet(!sheetOpen) })
let dragged = false
sheetHandle.addEventListener('pointerdown', (e) => {
  const startY = e.clientY
  const startH = panelCol.getBoundingClientRect().height
  dragged = false
  sheetHandle.setPointerCapture(e.pointerId)
  const move = (m: PointerEvent): void => {
    const dy = startY - m.clientY
    if (Math.abs(dy) > 6) dragged = true
    if (!dragged) return
    const h = Math.max(window.innerHeight * 0.2, Math.min(window.innerHeight * 0.8, startH + dy))
    main.style.setProperty('--sheet-h', `${h}px`)
  }
  const up = (): void => {
    sheetHandle.removeEventListener('pointermove', move)
    sheetHandle.removeEventListener('pointerup', up)
    sheetHandle.removeEventListener('pointercancel', up)
    if (dragged) {
      const h = panelCol.getBoundingClientRect().height
      setSheet(h > window.innerHeight * 0.45)
      window.setTimeout(() => { dragged = false }, 0)
    }
  }
  sheetHandle.addEventListener('pointermove', move)
  sheetHandle.addEventListener('pointerup', up)
  sheetHandle.addEventListener('pointercancel', up)
})
setSheet(false)

// The timing bar's height: the coach toast and the page bottom make room for it on phones.
new ResizeObserver(() => document.documentElement.style.setProperty('--tb-h', `${timingHost.getBoundingClientRect().height}px`)).observe(timingHost)

// ---- go -------------------------------------------------------------------------------------------------------------------
const coach = mountCoach(ctx)
// The tour walks through every lab step; afterwards the student goes back to the step they were on (step 1 on a first visit).
let stepBeforeTour = currentStep
const tour = mountTour(ctx, {
  begin() { stepBeforeTour = currentStep },
  end() { setStep(stepBeforeTour, { scroll: true }) },
  reveal(id) {
    const n = TOUR_STEP[id]
    if (n && n <= STEP_COUNT && n !== currentStep) setStep(n)
    if (id === 'stage' || id === 'steps') return
  },
})
applyTheme()
labelShell()
setStep(currentStep)
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
