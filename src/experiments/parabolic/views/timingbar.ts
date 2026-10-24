// Timing bar: the instrument you use while launching. Docked under the stage (desktop and tablet) or fixed to the bottom of the
// screen (phone), so the stage and the stopwatch are visible together. One LCD, one set of keys.
// Every time-critical press uses event.timeStamp of the pointerdown / keydown (press.ts); the global shortcut handler is
// stopwatchkeys.ts, which never hijacks a focused button, link, checkbox or field.
import { TABLE_REPS, TABLE_TRIALS } from '../apparatus/index.ts'
import type { MountView, View } from './view.ts'
import { el, nextId, svg, watch } from '../../../core/views/dom.ts'
import { lcdText } from '../../../core/views/numfmt.ts'
import { onPress } from '../../../core/views/press.ts'
import { handleStopwatchKey, type StopwatchActions } from '../../../core/views/stopwatchkeys.ts'
import { copyTime } from './copyReading.ts'
import { blockText } from './reasons.ts'
import { getBall, getRep, getTrial, onUiState, setCell } from './uistate.ts'
import { strings } from './strings/timing.ts'

type IconPath = string
const ICON_RESET: IconPath = 'M4 12a8 8 0 1 0 2.6-5.9M4 4v5h5'
const ICON_COPY: IconPath = 'M9 9h10v11H9zM5 15V4h10'

function icon(d: IconPath): SVGElement {
  return svg('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', class: 'icon' }, svg('path', { d }))
}

export const mountTimingBar: MountView = (root, ctx): View => {
  const app = ctx.apparatus
  const S = () => strings[ctx.lang()]
  const w = watch(app)

  const bar = el('div', 'timing', undefined, { role: 'group', 'data-timing-bar': '' })
  const row1 = el('div', 'tb-row tb-row1')
  const row2 = el('div', 'tb-row tb-row2')

  // Target cell: mark number (trial) and repetition. Changing the mark number moves the ball to that mark when it is at rest.
  const target = el('div', 'tb-mark tb-target')
  const trialId = nextId('tbt'), repId = nextId('tbr')
  const trialLabel = el('label', 'tb-label', undefined, { for: trialId })
  const repLabel = el('label', 'tb-label', undefined, { for: repId })
  const trialSel = el('select', 'tb-select', undefined, { id: trialId })
  const repSel = el('select', 'tb-select', undefined, { id: repId })
  for (let i = 0; i < TABLE_TRIALS; i++) trialSel.append(el('option', undefined, undefined, { value: String(i) }))
  for (let i = 0; i < TABLE_REPS; i++) repSel.append(el('option', undefined, undefined, { value: String(i) }))
  target.append(trialLabel, trialSel, repLabel, repSel)

  const lcd = el('div', 'lcd tb-lcd', undefined, { role: 'img' })
  const lcdTxt = el('span', 'lcd-digits')
  lcd.append(lcdTxt)

  const mk = (cls: string, withIcon?: IconPath): { b: HTMLButtonElement; text: HTMLElement; kbd: HTMLElement } => {
    const b = el('button', `tb-btn ${cls}`, undefined, { type: 'button' })
    if (withIcon) b.append(icon(withIcon))
    const text = el('span', 'tb-text')
    const kbd = el('kbd', 'tb-kbd')
    b.append(text, kbd)
    return { b, text, kbd }
  }
  const reset = mk('tb-reset', ICON_RESET)
  const copy = mk('tb-copy', ICON_COPY)
  const release = mk('tb-release')
  const start = mk('tb-start')

  row1.append(target, lcd, reset.b, copy.b)
  row2.append(release.b, start.b)

  const caption = el('p', 'tb-caption')
  const cell = el('span', 'tb-cell')
  const keys = el('span', 'tb-keys')
  const msg = el('span', 'tb-msg', undefined, { role: 'status', 'aria-live': 'polite' })
  caption.append(cell, keys, msg)
  bar.append(row1, row2, caption)
  root.append(bar)

  let msgTimer = 0
  const say = (text: string): void => {
    msg.textContent = text
    window.clearTimeout(msgTimer)
    if (text) msgTimer = window.setTimeout(() => { msg.textContent = '' }, 6000)
  }

  /** The ball has run and is no longer moving: the release button brings it back to its mark. */
  const ballDone = (): boolean => {
    const ph = app.ballStatus(ctx.now()).phase
    return app.getState().ball.released && ph !== 'rolling' && ph !== 'flying'
  }
  /** Put the ball on the mark of the chosen trial (marks sorted from the low end) when it is at rest. */
  function moveBallToTrial(): void {
    const s = app.getState()
    const m = [...app.getMarks()].sort((a, b) => a.s_m - b.s_m)[getTrial()]
    if (!m || s.ball.selected === null || !s.joints.rackClamp || m.id === s.ball.markId) return
    const ph = app.ballStatus(ctx.now()).phase
    if (ph === 'rolling' || ph === 'flying') return
    if (app.placeBall({ markId: m.id }).ok) say(S().ballMovedToMark.replace('{n}', String(getTrial() + 1)))
    ctx.changed()
  }
  trialSel.addEventListener('change', () => { setCell(Number(trialSel.value), getRep()); moveBallToTrial() })
  repSel.addEventListener('change', () => setCell(getTrial(), Number(repSel.value)))

  const actions: StopwatchActions = {
    startStop(t) {
      const r = app.stopwatchStartStop(t, { trial: getTrial() })
      ctx.changed()
      if (r.ok && !r.running) w.touch()
    },
    reset() { app.stopwatchReset(); say(''); ctx.changed() },
    release(t) {
      if (ballDone()) app.resetBall(); else app.release(t)
      ctx.changed()
    },
    copy(t) { say(copyTime(ctx, t).message) },
  }
  onPress(start.b, (t) => actions.startStop(t))
  onPress(release.b, (t) => actions.release(t))
  onPress(reset.b, () => actions.reset())
  onPress(copy.b, (t) => actions.copy?.(t))

  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.defaultPrevented) return // a focused bar button already handled its own key
    handleStopwatchKey(e, actions)
  }
  // Space on the page would scroll it and click a focused control on release; the keydown handler already took the key.
  const onKeyUp = (e: KeyboardEvent): void => {
    if (e.code === 'Space' && !e.defaultPrevented && !(e.target instanceof Element && (e.target.closest('input, select, textarea, button, a, summary, [role=button]')))) e.preventDefault()
  }
  document.addEventListener('keydown', onKeyDown)
  document.addEventListener('keyup', onKeyUp)
  const offUi = onUiState(() => { trialSel.value = String(getTrial()); repSel.value = String(getRep()); cellText() })

  // A phone shows only the numbers; wider screens say "No. 2" / "Rep. 3".
  const phone = window.matchMedia('(max-width: 819px)')
  phone.addEventListener('change', () => labels())
  let shown = ''
  let releaseKey = ''
  function cellText(): void {
    const T = S()
    cell.textContent = T.cell.replace('{ball}', T.balls[getBall()]).replace('{t}', String(getTrial() + 1)).replace('{r}', String(getRep() + 1))
  }
  function labels(): void {
    const T = S()
    bar.setAttribute('aria-label', T.aria)
    trialLabel.textContent = T.trialLabel; repLabel.textContent = T.repLabel
    trialSel.setAttribute('aria-label', T.trialLabel); repSel.setAttribute('aria-label', T.repLabel)
    ;[...trialSel.options].forEach((o, i) => { o.textContent = (phone.matches ? '{n}' : T.trialOption).replace('{n}', String(i + 1)) })
    ;[...repSel.options].forEach((o, i) => { o.textContent = (phone.matches ? '{n}' : T.repOption).replace('{n}', String(i + 1)) })
    trialSel.value = String(getTrial()); repSel.value = String(getRep())
    lcd.setAttribute('aria-label', T.lcdAria)
    reset.text.textContent = T.reset; reset.b.setAttribute('aria-label', T.reset); reset.b.title = T.reset
    copy.text.textContent = T.copy; copy.b.setAttribute('aria-label', T.copy); copy.b.title = T.copy
    copy.kbd.textContent = 'Enter'
    start.kbd.textContent = '␣'
    release.kbd.textContent = 'S'
    keys.textContent = T.keys
    keys.title = T.keysFull
    caption.setAttribute('aria-label', T.keysFull)
    cellText()
    releaseKey = ''
  }
  function sync(): void {
    const T = S()
    const s = app.getState()
    const has = s.items.stopwatch
    const running = s.stopwatch.running
    start.text.textContent = running ? T.stop : T.start
    start.b.classList.toggle('running', running)
    for (const x of [start.b, reset.b, copy.b]) { if (has) x.removeAttribute('aria-disabled'); else x.setAttribute('aria-disabled', 'true') }
    if (!has) say(T.needStopwatch)
    releaseKey = ''
    phaseSync()
  }
  /** The release button follows the ball: quiet and aria-disabled until a run is possible, then "bring it back". */
  function phaseSync(): void {
    const T = S()
    const s = app.getState()
    const can = app.canRelease(ctx.now())
    const back = ballDone()
    // only the next action is accent-filled: start/stop while the ball runs or the watch counts, otherwise the release (or the return)
    const ph = app.ballStatus(ctx.now()).phase
    const startNext = s.stopwatch.running || (s.ball.released && (ph === 'rolling' || ph === 'flying'))
    const key = `${can.ok}|${can.reasons.join()}|${back}|${startNext}|${s.ball.selected}|${ctx.lang()}`
    if (key === releaseKey) return
    releaseKey = key
    const name = s.ball.selected ? T.releaseBall[s.ball.selected] : T.release
    release.text.textContent = back ? T.returnStart : name
    release.kbd.hidden = false
    const blocked = !can.ok && !back
    release.b.classList.toggle('ready', (can.ok || back) && !startNext)
    start.b.classList.toggle('secondary', !startNext)
    if (blocked) release.b.setAttribute('aria-disabled', 'true'); else release.b.removeAttribute('aria-disabled')
    release.b.title = back ? T.returnStart : can.ok ? T.readyHint : can.reasons.map((r) => blockText(ctx.lang(), r)).join(' ')
  }

  labels()
  return {
    update() {
      app.tick(ctx.now()) // announces the landing (and keeps the apparatus clock moving) even when the stage is not drawing
      if (w.dirty()) { w.clear(); sync() } else phaseSync()
      const has = app.hasItem('stopwatch')
      const txt = has ? lcdText(app.stopwatchDisplay_s(ctx.now())) : '--:--.--'
      if (txt !== shown) { shown = txt; lcdTxt.textContent = txt; lcd.classList.toggle('off', !has) }
    },
    relabel() { labels(); w.touch() },
    destroy() {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('keyup', onKeyUp)
      window.clearTimeout(msgTimer)
      offUi(); w.off(); bar.remove()
    },
  }
}
