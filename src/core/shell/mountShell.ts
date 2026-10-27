// Experiment shell: header with the step tracker, 3D / 2D stage with the timing bar, one panel per lab step, procedure drawer,
// theme and language, debounced persistence, tour and coach, the animation loop. The experiment passes a ShellConfig; the shell
// knows nothing about its physics. URL options: see readShellParams() (the experiment adds its own).
// The experiment's page imports the style sheets (core/styles/*.css plus its own) in the order it needs.
import { loadLang, saveLang, type Lang } from '../i18n.ts'
import { loadTheme, saveLast, saveTheme, type StageMode, type Theme } from '../persist.ts'
import type { EventSource } from '../pedagogy/coach.ts'
import type { View, ViewContext } from '../views/view.ts'
import { button, el, svg } from '../views/dom.ts'
import { mountMenu } from '../views/menu.ts'
import { mountSkipLink } from '../views/skip.ts'
import { applyTheme, nextTheme, themeIcon } from '../views/theme.ts'
import { readShellParams } from './params.ts'
import { strings as coreStrings } from './strings.ts'
import type { ProcedureProgress, Shell, ShellApi, ShellConfig, Stage3DView, TourController } from './types.ts'

export function mountShell<A extends EventSource<E>, E>(config: ShellConfig<A, E>): Shell<A> {
  const params = config.params ?? readShellParams()
  const STEP_COUNT = config.stepCount
  const persistEnabled = config.persist !== false
  const app = config.apparatus
  const store = config.store
  saveLast(store.id)

  // ---- language and theme --------------------------------------------------------------------------------------------
  let lang: Lang = loadLang()
  const S = () => config.strings[lang]
  const C = () => coreStrings[lang]
  let theme: Theme = params.theme ?? loadTheme()

  // ---- persistence -----------------------------------------------------------------------------------------------------
  let saveTimer = 0
  function schedulePersist(): void {
    if (saveTimer || !persistEnabled) return
    saveTimer = window.setTimeout(() => { saveTimer = 0; config.save() }, 400)
  }

  // ---- context ---------------------------------------------------------------------------------------------------------
  const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  const ctx: ViewContext<A> = {
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
  const moreExperiments = button('', 'menu-item', () => { window.location.assign(config.landingUrl) })
  const moreNew = button('', 'menu-item', () => { newDialog.showModal(); newYes.focus() })
  const moreMenu = mountMenu(moreBtn, [moreLang, moreTheme, moreExperiments, moreNew], { align: 'right' })
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
  // Refusals stay until dismissed or replaced (no time limit, WCAG 2.2.1). The live region is the text, so the button is not announced.
  const toast = el('div', 'toast')
  const toastText = el('p', 'toast-text', undefined, { role: 'status', 'aria-live': 'polite' })
  const toastClose = button('×', 'toast-close', () => { toast.hidden = true })
  toast.append(toastText, toastClose)
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
    config.reset()
    setStep(1, { scroll: true })
    relabelAll()
    schedulePersist()
  })
  const newNo = button('', 'btn btn-quiet', () => newDialog.close())
  newActions.append(newYes, newNo)
  newDialog.append(newText, newActions)
  // The dialog was opened from a menu item that is hidden by now: focus goes back to the menu button, not to the page top.
  newDialog.addEventListener('close', () => moreBtn.focus())

  // panel column: procedure bar and drawer, the step panes, previous / next, credits
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
  const skip = mountSkipLink(main)
  rootEl.append(skip.link, header, main, newDialog)

  // ---- steps ---------------------------------------------------------------------------------------------------------------
  const trackerBtns: HTMLButtonElement[] = []
  const trackerMarks: HTMLElement[] = []
  const trackerLabels: HTMLElement[] = []
  const trackerDone: HTMLElement[] = []
  for (let i = 0; i < STEP_COUNT; i++) {
    const li = el('li', 'tracker-item')
    const b = button('', 'tracker-tab', () => setStep(i + 1, { scroll: true }))
    // The name is the visible text (number, label) plus a hidden "(done)": WCAG 2.5.3 label in name.
    const mark = el('span', 'tracker-num', String(i + 1))
    const label = el('span', 'tracker-label')
    const doneText = el('span', 'visually-hidden')
    b.append(mark, label, doneText)
    li.append(b)
    trackerList.append(li)
    trackerBtns.push(b); trackerMarks.push(mark); trackerLabels.push(label); trackerDone.push(doneText)
  }
  let stepDone: boolean[] = new Array<boolean>(STEP_COUNT).fill(false)

  const urlStep = params.step ?? NaN
  let currentStep = Number.isInteger(urlStep) && urlStep >= 1 && urlStep <= STEP_COUNT ? urlStep : Math.min(store.loadStep() ?? 1, STEP_COUNT)

  /** Show one step. Remembered, deep-linkable (?step=n). */
  function setStep(n: number, opts: { scroll?: boolean } = {}): void {
    const next = Math.max(1, Math.min(STEP_COUNT, Math.round(n)))
    const changed = next !== currentStep
    currentStep = next
    if (persistEnabled) store.saveStep(next)
    panes.forEach((p, i) => { p.hidden = i + 1 !== next })
    main.dataset.step = String(next)
    document.body.dataset.step = String(next)
    paintSteps()
    if (opts.scroll && changed) {
      if (phoneQuery.matches) window.scrollTo({ top: 0, behavior: reducedQuery.matches ? 'auto' : 'smooth' })
      else panelCol.scrollTo({ top: 0 })
    }
    if (changed) config.onStepChanged?.(next)
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
      trackerDone[i]!.textContent = stepDone[i] === true ? ` (${t.stepDone})` : ''
    })
    stepMenuItems.forEach((b, i) => {
      b.textContent = `${stepDone[i] ? '✓' : String(i + 1)}  ${t.stepNames[i]}`
      b.setAttribute('aria-checked', String(i + 1 === currentStep))
      b.classList.toggle('active', i + 1 === currentStep)
    })
    stepMenuBtn.replaceChildren(document.createTextNode(`${currentStep}/${STEP_COUNT} ${t.stepShort[currentStep - 1]}`), svg('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', class: 'icon caret' }, svg('path', { d: 'M6 9l6 6 6-6' })))
    // The accessible name starts with the visible text (WCAG 2.5.3 label in name).
    stepMenuBtn.setAttribute('aria-label', `${currentStep}/${STEP_COUNT} ${t.stepShort[currentStep - 1]}, ${t.stepsMenu}`)
    prevBtn.textContent = `‹ ${t.prevStep}`
    nextBtn.textContent = `${t.nextStep} ›`
    prevBtn.hidden = currentStep === 1
    nextBtn.hidden = currentStep === STEP_COUNT
    stepNav.hidden = prevBtn.hidden && nextBtn.hidden
  }

  // ---- panel slots ---------------------------------------------------------------------------------------------------------
  /** Done checks of the tracker and the "next step" line, from the experiment's live checklist. */
  let lastProgress: ProcedureProgress | null = null
  function setProgress(p: ProcedureProgress): void {
    lastProgress = p
    stepDone = p.stepDone.slice(0, STEP_COUNT)
    paintSteps()
    const t = S()
    procLabel.textContent = t.procedure
    procCount.textContent = t.procedureProgress.replace('{n}', String(p.done)).replace('{total}', String(p.total))
    procNext.textContent = p.nextLabel ? t.procedureNext.replace('{x}', p.nextLabel(lang)) : t.procedureDone
  }

  function openPanel(id: string, scroll = true): void {
    const n = config.panelStep[id]
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

  // tour and coach are created at the end; the api reaches them through these
  let tour: TourController
  let coach: { relabel(): void; destroy(): void }
  const api: Shell<A> = {
    ctx,
    lang: () => lang,
    currentStep: () => currentStep,
    setStep,
    effectiveMode: () => effectiveMode(),
    openPanel,
    showStep,
    startTour: () => tour.start(),
    setProgress,
    schedulePersist,
    relabelAll: () => relabelAll(),
  }

  const panelViews: View[] = []
  const mountInto = (host: HTMLElement, id: string, mount: (root: HTMLElement, ctx: ViewContext<A>) => View): void => {
    const tmp = el('div', 'slot', undefined, { 'data-slot': id })
    host.append(tmp)
    panelViews.push(mount(tmp, ctx))
  }
  for (const s of config.slots) mountInto(panes[s.step - 1]!, s.id, s.mount)
  mountInto(procDrawer, 'procedure', config.procedure(api))
  if (config.timingBar) panelViews.push(config.timingBar(timingHost, ctx))

  // ---- stage: 3D / 2D ------------------------------------------------------------------------------------------------------------
  let view2d: View | null = null
  let scene3d: Stage3DView | null = null
  let failed3d = false
  let loading3d = false
  let mode: StageMode = params.view ?? store.loadStageMode() ?? '3d'
  let notice = ''

  function ensure2d(): void {
    if (!view2d) view2d = config.stage.mount2d(host2d, ctx)
  }
  async function ensure3d(): Promise<void> {
    if (scene3d || failed3d || loading3d) return
    loading3d = true
    stageNotice.textContent = S().loading3d
    try {
      const mod = await config.stage.load3d()
      if (!mod.webgl2Available()) { fail3d(S().noticeNoWebgl); return }
      scene3d = mod.mount(host3d, ctx, { openPanel, onFail: () => fail3d(S().notice3d) })
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
    if (persist) store.saveStageMode(m)
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
  app.on((e) => {
    const text = config.refusalText(e, lang)
    if (text !== null) {
      toastText.textContent = text
      toast.hidden = false
    } else schedulePersist()
  })

  // ---- header, language, theme, help ----------------------------------------------------------------------------------------
  function labelShell(): void {
    const t = S()
    document.documentElement.lang = lang
    document.title = t.title
    skip.setLabel(C().skipToMain)
    toastClose.setAttribute('aria-label', C().dismiss)
    titleLong.textContent = t.title
    titleShort.textContent = t.titleShort
    main.setAttribute('aria-label', t.regionMain)
    stage.setAttribute('aria-label', t.regionStage)
    panelCol.setAttribute('aria-label', t.panelRegion)
    tracker.setAttribute('aria-label', t.stepsNav)
    langBtn.textContent = lang === 'es' ? 'EN' : 'ES'
    langBtn.setAttribute('aria-label', `${langBtn.textContent}: ${t.langSwitch}`)
    themeBtn.replaceChildren(themeIcon(theme))
    themeBtn.setAttribute('aria-label', `${t.theme}: ${t.themes[theme]}`)
    themeBtn.title = `${t.theme}: ${t.themes[theme]}`
    moreLang.textContent = t.langSwitch
    moreTheme.textContent = `${t.theme}: ${t.themes[theme]}`
    moreExperiments.textContent = C().experiments
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
    helpBtn.setAttribute('href', config.help[lang])
    helpBtn.setAttribute('hreflang', lang)
    if (failed3d) notice = S().notice3d
    stageNotice.textContent = failed3d ? notice : ''
    paintSteps()
    if (lastProgress) setProgress(lastProgress)
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
    theme = nextTheme(theme)
    saveTheme(theme); applyTheme(theme); labelShell()
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
  coach = config.coach(ctx)
  // The tour walks through every lab step; afterwards the student goes back to the step they were on (step 1 on a first visit).
  let stepBeforeTour = currentStep
  tour = config.tour.mount(ctx, {
    begin() { stepBeforeTour = currentStep },
    end() { setStep(stepBeforeTour, { scroll: true }) },
    reveal(id) {
      const n = config.tour.stepOf[id]
      if (n && n <= STEP_COUNT && n !== currentStep) setStep(n)
    },
  })
  applyTheme(theme)
  labelShell()
  setStep(currentStep)
  setMode(mode, false)
  if (tour.shouldAutoStart(params.tour)) window.setTimeout(() => tour.start(), 900)
  schedulePersist()

  function frame(): void {
    for (const v of panelViews) v.update()
    if (effectiveMode() === '2d') view2d?.update()
    else scene3d?.update()
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
  window.addEventListener('pagehide', () => { if (persistEnabled) config.save() })
  return api
}

export type { ShellApi }
