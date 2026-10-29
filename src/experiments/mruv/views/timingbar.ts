// Timing bar: the instrument you use while measuring. Docked under the stage (desktop and tablet) or fixed to the bottom of the
// screen (phone), so the stage and the stopwatch are visible together. One LCD, one set of keys.
// Every time-critical press uses event.timeStamp of the pointerdown / keydown (press.ts); the global shortcut handler is
// stopwatchkeys.ts, which never hijacks a focused button, link, checkbox or field (design review B5).
import { TABLE_POSITIONS_cm } from '../apparatus/index.ts'
import type { MountView, View } from './view.ts'
import { el, nextId, svg, watch } from '../../../core/views/dom.ts'
import { lcdText } from '../../../core/views/numfmt.ts'
import { onPress } from '../../../core/views/press.ts'
import { copyReading } from './copyReading.ts'
import { handleStopwatchKey, type StopwatchActions } from '../../../core/views/stopwatchkeys.ts'
import { getMarkRow, onMarkRow, setMarkRow } from './uistate.ts'
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

  const markWrap = el('div', 'tb-mark')
  const selId = nextId('tbm')
  const markLabel = el('label', 'tb-label', undefined, { for: selId })
  const sel = el('select', 'tb-select', undefined, { id: selId })
  for (let r = 1; r < TABLE_POSITIONS_cm.length; r++) sel.append(el('option', undefined, undefined, { value: String(r) }))
  sel.addEventListener('change', () => setMarkRow(Number(sel.value)))
  markWrap.append(markLabel, sel)

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

  row1.append(markWrap, lcd, reset.b, copy.b)
  row2.append(release.b, start.b)

  const caption = el('p', 'tb-caption')
  const keys = el('span', 'tb-keys')
  const msg = el('span', 'tb-msg', undefined, { role: 'status', 'aria-live': 'polite' })
  caption.append(keys, msg)
  bar.append(row1, row2, caption)
  root.append(bar)

  let msgTimer = 0
  const say = (text: string): void => {
    msg.textContent = text
    window.clearTimeout(msgTimer)
  }

  const phaseNow = () => app.cartState(ctx.now()).phase
  const actions: StopwatchActions = {
    startStop(t) {
      const r = app.stopwatchStartStop(t, { markTarget: getMarkRow() })
      ctx.changed()
      if (r.ok && !r.running) w.touch()
    },
    reset() { app.stopwatchReset(); say(''); ctx.changed() },
    release(t) {
      const ph = phaseNow()
      if (ph === 'stopped' || ph === 'stuck' || ph === 'fallen') app.resetCart(); else app.releaseCart(t)
      ctx.changed()
    },
    copy(t) { say(copyReading(ctx, t).message) },
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
  const offMark = onMarkRow(() => { sel.value = String(getMarkRow()) })

  // A phone shows only the chip "40 cm"; wider screens say "Mark: 40 cm".
  const phone = window.matchMedia('(max-width: 819px)')
  phone.addEventListener('change', () => labels())
  let shown = ''
  let releaseKey = ''
  function labels(): void {
    const T = S()
    bar.setAttribute('aria-label', T.aria)
    markLabel.textContent = T.markLabel
    sel.setAttribute('aria-label', T.markLabel)
    ;[...sel.options].forEach((o, i) => { o.textContent = (phone.matches ? '{n} cm' : T.markOption).replace('{n}', String(TABLE_POSITIONS_cm[i + 1])) })
    sel.value = String(getMarkRow())
    lcd.setAttribute('aria-label', T.lcdAria)
    reset.text.textContent = T.reset; reset.b.setAttribute('aria-label', T.reset); reset.b.title = T.reset
    copy.text.textContent = T.copy; copy.b.title = T.copy
    copy.kbd.textContent = 'Enter'
    start.kbd.textContent = '␣'
    release.kbd.textContent = 'S'
    keys.textContent = T.keys
    keys.title = T.keysFull
    caption.setAttribute('aria-label', T.keysFull)
    releaseKey = ''
  }
  function sync(): void {
    const T = S()
    const s = app.getState()
    const has = s.items.stopwatch
    const running = s.stopwatch.running
    start.text.textContent = running ? T.stop : T.start
    start.b.classList.toggle('running', running)
    for (const x of [start.b, reset.b, copy.b]) x.setAttribute('aria-disabled', String(!has)); if (has) for (const x of [start.b, reset.b, copy.b]) x.removeAttribute('aria-disabled')
    if (!has) say(T.needStopwatch)
    releaseKey = ''
    phaseSync()
  }
  /** The release button follows the cart: quiet and aria-disabled until it rests on the rail (S6), then "back to start". */
  function phaseSync(): void {
    const T = S()
    const ph = phaseNow()
    const runnable = ph === 'atStart' && app.canRun().ok
    const back = ph === 'stopped' || ph === 'stuck' || ph === 'fallen'
    const key = `${ph}|${runnable}|${ctx.lang()}`
    if (key === releaseKey) return
    releaseKey = key
    release.text.textContent = back ? T.returnStart : T.release
    release.kbd.hidden = false
    const blocked = !runnable && !back
    release.b.classList.toggle('ready', runnable)
    if (blocked) release.b.setAttribute('aria-disabled', 'true'); else release.b.removeAttribute('aria-disabled')
    release.b.title = back ? T.returnStart : runnable ? T.readyHint : ph === 'rolling' ? T.whyRolling : ph === 'unplaced' ? T.whyUnplaced : T.whyNoRun
  }

  labels()
  return {
    update() {
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
      offMark(); w.off(); bar.remove()
    },
  }
}
