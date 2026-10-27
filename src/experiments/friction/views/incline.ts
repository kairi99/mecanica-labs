// Exp. 3 panel: the course on the rail, the bar, the rack crank, the tape reading of h and the stopwatch. Time-critical presses (stop the
// crank, start/stop the stopwatch) use the timestamp of the pointerdown / keydown (core/views/press.ts).
import { BAR_ORDER, COURSE_MAX_m, COURSE_MIN_m, type BarId } from '../apparatus/index.ts'
import { getCrank, onUiState, setCrank } from './uistate.ts'
import type { MountView, View } from './view.ts'
import { button, card, el, nextId, watch } from '../../../core/views/dom.ts'
import { fmt } from '../../../core/pedagogy/dom.ts'
import { formatNum, lcdText } from '../../../core/views/numfmt.ts'
import { onPress } from '../../../core/views/press.ts'
import { strings } from './strings/incline.ts'

export const mountIncline: MountView = (root, ctx): View => {
  const app = ctx.apparatus
  const S = () => strings[ctx.lang()]
  const w = watch(app)
  const c = card('incline', S().title, 'card-incline')
  const intro = el('p', 'muted')
  const geometry = el('p', 'why')
  // course
  const courseId = nextId('crs')
  const courseRow = el('div', 'incline-course')
  const courseLabel = el('label', 'readout-label', undefined, { for: courseId })
  const courseInput = el('input', 'cell course-input', undefined, { type: 'text', inputmode: 'decimal', id: courseId, autocomplete: 'off' })
  courseInput.value = '100'
  const courseUnit = el('span', 'muted')
  const mark = button('', 'btn btn-sm', () => {
    const cm = Number(courseInput.value.trim().replace(',', '.'))
    app.markCourse(Number.isFinite(cm) ? cm / 100 : NaN)
    ctx.changed()
  })
  mark.dataset.k = 'mark'
  courseRow.append(courseLabel, courseInput, courseUnit, mark)
  const courseNote = el('p', 'readout-text', undefined, { role: 'status' })
  // bar
  const barGroup = el('div', 'seg-group', undefined, { role: 'group' })
  const barLabel = el('span', 'seg-label')
  const barRow = el('div', 'seg-row')
  barGroup.append(barLabel, barRow)
  // crank
  const crankId = nextId('crk')
  const crankRow = el('div', 'pull-speed')
  const crankLabel = el('label', 'readout-label', undefined, { for: crankId })
  const crankSlider = el('input', 'range', undefined, { type: 'range', id: crankId, min: '1', max: '60', step: '1' })
  crankSlider.value = String(getCrank())
  const crankOut = el('output', 'readout-num', undefined, { for: crankId })
  crankRow.append(crankLabel, crankSlider, crankOut)
  // one toggle: starts the crank, and is the timed press that stops it
  const crankBtn = el('button', 'btn btn-primary pull-read', undefined, { type: 'button' })
  crankBtn.dataset.k = 'crank'
  onPress(crankBtn, (t) => {
    if (app.inclineStatus(t).cranking) app.raiseStop(t)
    else app.raiseStart(t, getCrank() / 1000)
    ctx.changed()
  })
  const lower = button('', 'btn btn-sm', () => { if (app.inclineStatus(ctx.now()).cranking) return; app.lowerRail(ctx.now()); ctx.changed() })
  lower.dataset.k = 'lower'
  const actions = el('div', 'pull-actions')
  actions.append(crankBtn, lower)
  const phase = el('p', 'readout-text', undefined, { role: 'status' })
  // tape
  const tapeHead = el('h3', 'sub-title')
  const tapeBtn = button('', 'btn btn-sm', () => { app.measureHeight(ctx.now()); ctx.changed() })
  tapeBtn.dataset.k = 'tape'
  const tapeOut = el('p', 'readout-text', undefined, { role: 'status', 'aria-live': 'polite' })
  // stopwatch
  const watchHead = el('h3', 'sub-title')
  const lcd = el('div', 'lcd', undefined, { role: 'img' })
  const lcdTxt = el('span', 'lcd-digits')
  lcd.append(lcdTxt)
  const swRow = el('div', 'pull-actions')
  const swBtn = el('button', 'btn btn-primary pull-read', undefined, { type: 'button' })
  swBtn.dataset.k = 'sw'
  onPress(swBtn, (t) => { app.stopwatchStartStop(t); ctx.changed() })
  const swReset = button('', 'btn', () => { app.stopwatchReset(); ctx.changed() })
  swReset.dataset.k = 'swreset'
  swRow.append(swBtn, swReset)
  const keys = el('p', 'muted')
  c.body.append(intro, geometry, courseRow, courseNote, barGroup, crankRow, actions, phase, tapeHead, tapeBtn, tapeOut, watchHead, lcd, swRow, keys)
  root.append(c.root)

  crankSlider.addEventListener('input', () => {
    setCrank(Number(crankSlider.value))
    if (app.getState().raising) app.raiseStart(ctx.now(), getCrank() / 1000)
    ctx.changed()
  })

  function label(): void {
    const T = S()
    const s = app.getState()
    c.title.textContent = T.title
    intro.textContent = T.intro
    geometry.textContent = T.geometry
    courseLabel.textContent = T.course
    courseUnit.textContent = T.courseUnit
    courseInput.setAttribute('aria-label', `${T.course} (${T.courseUnit}, ${Math.round(COURSE_MIN_m * 100)}–${Math.round(COURSE_MAX_m * 100)})`)
    mark.textContent = T.mark
    courseNote.textContent = s.course_mark ? fmt(T.marked, { cm: courseInput.value }) : T.notMarked
    barLabel.textContent = T.bar
    barGroup.setAttribute('aria-label', T.bar)
    barRow.replaceChildren()
    for (const bar of BAR_ORDER as readonly BarId[]) {
      const b = button(T.bars[bar], `seg-btn${s.bar === bar ? ' on' : ''}`, () => { app.placeBar(bar); ctx.changed() })
      b.setAttribute('aria-pressed', String(s.bar === bar))
      b.dataset.k = `bar-${bar}`
      barRow.append(b)
    }
    crankLabel.textContent = T.crank
    crankOut.textContent = fmt(T.crankValue, { v: formatNum(getCrank(), 0, ctx.lang()) })
    lower.textContent = T.lower
    tapeHead.textContent = T.tape; tapeBtn.textContent = T.tapeBtn
    watchHead.textContent = T.watch
    lcd.setAttribute('aria-label', T.watchAria)
    swBtn.textContent = s.stopwatch.running ? T.watchStop : T.watchStart
    swReset.textContent = T.watchReset
    keys.textContent = T.keys
  }
  label()
  const offUi = onUiState(() => { crankSlider.value = String(getCrank()); w.touch() })

  let lastHeight = ''
  let measuredH: number | null = null
  for (const e of app.eventLog()) if (e.type === 'heightMeasured') measuredH = e.h_m
  const offEv = app.on((e) => { if (e.type === 'heightMeasured') measuredH = e.h_m; else if (e.type === 'presetApplied' || e.type === 'tableCleared') measuredH = e.type === 'presetApplied' ? null : measuredH })
  function frame(): void {
    const T = S()
    const st = app.inclineStatus(ctx.now())
    const p = T.phase[st.phase]
    const ct = st.cranking ? T.stopCrank : T.raise
    if (crankBtn.textContent !== ct) crankBtn.textContent = ct
    lower.setAttribute('aria-disabled', String(st.cranking))
    if (phase.textContent !== p) phase.textContent = p
    const t = lcdText(app.stopwatchDisplay_s(ctx.now()))
    if (lcdTxt.textContent !== t) lcdTxt.textContent = t
    const ht = measuredH !== null ? fmt(T.tapeReading, { h: formatNum(measuredH, 3, ctx.lang()) }) : T.noTape
    if (ht !== lastHeight) { lastHeight = ht; tapeOut.textContent = ht }
  }
  return {
    update() { if (w.dirty()) { w.clear(); label() } frame() },
    relabel() { w.touch() },
    focus(targets) { c.root.classList.toggle('focus', !!targets && targets.length > 0) },
    destroy() { w.off(); offUi(); offEv(); c.root.remove() },
  }
}
