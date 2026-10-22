// Stopwatch panel: a handheld digital stopwatch driven by the student's own presses, plus the cart release.
// Every time-critical press uses event.timeStamp of the pointerdown / keydown (see press.ts).
import { TABLE_POSITIONS_cm } from '../apparatus/index.ts'
import type { MountView, View } from './view.ts'
import { button, card, el, nextId, watch } from './dom.ts'
import { formatNum, lcdText } from './numfmt.ts'
import { onPress } from './press.ts'
import { handleStopwatchKey, type StopwatchActions } from './stopwatchkeys.ts'
import { getMarkRow, onMarkRow, setMarkRow } from './uistate.ts'
import { strings } from './strings/stopwatch.ts'

export const mountStopwatch: MountView = (root, ctx): View => {
  const app = ctx.apparatus
  const S = () => strings[ctx.lang()]
  const w = watch(app)
  const c = card('stopwatch', S().title, 'card-stopwatch')
  root.append(c.root)

  const body = el('div', 'sw-body')
  const lcd = el('div', 'lcd', '00:00.00', { role: 'img' })
  const lcdTxt = el('span', 'lcd-digits')
  lcd.replaceChildren(lcdTxt)
  const btnRow = el('div', 'sw-buttons')
  const resetBtn = button('', 'sw-btn sw-reset')
  const startBtn = button('', 'sw-btn sw-start')
  btnRow.append(resetBtn, startBtn)
  body.append(lcd, btnRow)

  const keyHint = el('p', 'muted center')
  const last = el('p', 'readout-text', undefined, { 'aria-live': 'polite' })
  const selId = nextId('mt')
  const selLabel = el('label', 'field-label', undefined, { for: selId })
  const sel = el('select', 'select', undefined, { id: selId })
  for (let r = 1; r < TABLE_POSITIONS_cm.length; r++) sel.append(el('option', undefined, undefined, { value: String(r) }))
  sel.addEventListener('change', () => setMarkRow(Number(sel.value)))

  const releaseBtn = button('', 'btn btn-primary btn-wide')
  const releaseKey = el('span', 'kbd')
  const releaseWrap = el('div', 'release-row')
  releaseWrap.append(releaseBtn, releaseKey)
  const phase = el('p', 'muted')
  const linkId = nextId('lk')
  const linkRow = el('div', 'check-row')
  const linkBox = el('input', undefined, undefined, { type: 'checkbox', id: linkId })
  const linkLabel = el('label', undefined, undefined, { for: linkId })
  linkBox.addEventListener('change', () => { app.setLinkStartToRelease(linkBox.checked); ctx.changed() })
  linkRow.append(linkBox, linkLabel)
  const linkNote = el('p', 'muted')
  const reaction = el('p', 'note')
  const why = el('p', 'why')
  c.body.append(body, keyHint, last, selLabel, sel, releaseWrap, phase, linkRow, linkNote, reaction, why)

  const actions: StopwatchActions = {
    startStop(t) {
      const r = app.stopwatchStartStop(t, { markTarget: getMarkRow() })
      ctx.changed()
      if (r.ok && !r.running) w.touch()
    },
    reset() { app.stopwatchReset(); ctx.changed() },
    release(t) { app.releaseCart(t); ctx.changed() },
  }
  onPress(startBtn, (t) => actions.startStop(t))
  onPress(releaseBtn, (t) => actions.release(t))
  resetBtn.addEventListener('click', () => actions.reset())

  // Shortcut keys: the moment of the key press is event.timeStamp of the keydown.
  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.defaultPrevented) return // a focused stopwatch / release button already handled its own key
    handleStopwatchKey(e, actions)
  }
  const onKeyUp = (e: KeyboardEvent): void => {
    if (e.code === 'Space' && !e.defaultPrevented && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLSelectElement)) e.preventDefault()
  }
  document.addEventListener('keydown', onKeyDown)
  document.addEventListener('keyup', onKeyUp)
  const offMark = onMarkRow(() => { sel.value = String(getMarkRow()) })

  let shown = ''
  function labels(): void {
    const T = S()
    c.title.textContent = T.title
    lcd.setAttribute('aria-label', T.lcdAria)
    resetBtn.textContent = T.reset
    keyHint.textContent = T.keyHint
    selLabel.textContent = T.markTarget
    ;[...sel.options].forEach((o, i) => { o.textContent = T.markOption.replace('{n}', String(TABLE_POSITIONS_cm[i + 1])) })
    sel.value = String(getMarkRow())
    releaseBtn.textContent = T.release
    releaseKey.textContent = T.releaseKey
    linkLabel.textContent = T.link
    linkNote.textContent = T.linkNote
    reaction.textContent = T.reaction
  }
  function sync(): void {
    const T = S()
    const s = app.getState()
    const has = s.items.stopwatch
    startBtn.textContent = s.stopwatch.running ? T.stop : T.start
    startBtn.classList.toggle('running', s.stopwatch.running)
    for (const b of [startBtn, resetBtn]) b.disabled = !has
    releaseBtn.disabled = false
    linkBox.checked = s.stopwatch.linkStartToRelease
    why.textContent = has ? '' : T.needStopwatch
    const stops = app.stopLog()
    const lastStop = stops.at(-1)
    if (lastStop && !s.stopwatch.running) {
      const t = formatNum(lastStop.reading_s, 2, ctx.lang())
      last.textContent = lastStop.markTarget !== null
        ? T.lastReadingFor.replace('{t}', t).replace('{x}', String(TABLE_POSITIONS_cm[lastStop.markTarget] ?? ''))
        : T.lastReading.replace('{t}', t)
    } else last.textContent = ''
    sel.value = String(getMarkRow())
    phaseText()
  }
  function phaseText(): void {
    const T = S()
    const ph = app.cartState(ctx.now()).phase
    const txt = { unplaced: T.phaseUnplaced, atStart: T.phaseAtStart, rolling: T.phaseRolling, stopped: T.phaseStopped, stuck: T.phaseStuck }[ph]
    if (phase.textContent !== txt) phase.textContent = txt
  }

  labels()
  return {
    update() {
      if (w.dirty()) { w.clear(); sync() } else phaseText()
      const has = app.hasItem('stopwatch')
      const txt = has ? lcdText(app.stopwatchDisplay_s(ctx.now())) : '--:--.--'
      if (txt !== shown) { shown = txt; lcdTxt.textContent = txt; lcd.classList.toggle('off', !has) }
    },
    relabel() { labels(); w.touch() },
    destroy() {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('keyup', onKeyUp)
      offMark(); w.off(); c.root.remove()
    },
  }
}
