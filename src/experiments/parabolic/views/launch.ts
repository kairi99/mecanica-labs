// Launch notes (step 3): where the ball is, why it cannot be released yet, the last stopwatch reading and copy message, the camera
// option and the reaction-time note. The stopwatch itself (LCD, start/stop, release, copy) is the timing bar (timingbar.ts).
import type { MountView, View } from './view.ts'
import { card, el, nextId, watch } from '../../../core/views/dom.ts'
import { blockText, markResultText } from './reasons.ts'
import { formatTime } from './format.ts'
import { getNote, onUiState } from './uistate.ts'
import { strings } from './strings/launch.ts'

export interface LaunchOptions {
  autoEdge: { get: () => boolean; set: (on: boolean) => void }
}

export function mountLaunch(opts: LaunchOptions): MountView {
  return (root, ctx): View => {
    const app = ctx.apparatus
    const S = () => strings[ctx.lang()]
    const w = watch(app)
    const c = card('launch', S().title, 'card-launch')
    root.append(c.root)

    const steps = el('p', 'muted')
    const phase = el('p', 'readout-text', undefined, { 'aria-live': 'polite' })
    const blocked = el('p', 'why')
    const last = el('p', 'readout-text', undefined, { 'aria-live': 'polite' })
    const markRes = el('p', 'readout-text', undefined, { 'aria-live': 'polite' })
    const note = el('p', 'readout-text', undefined, { 'aria-live': 'polite' })

    const autoId = nextId('ae')
    const autoRow = el('div', 'check-row')
    const autoBox = el('input', undefined, undefined, { type: 'checkbox', id: autoId })
    const autoLabel = el('label', undefined, undefined, { for: autoId })
    autoBox.checked = opts.autoEdge.get()
    autoBox.addEventListener('change', () => opts.autoEdge.set(autoBox.checked))
    autoRow.append(autoBox, autoLabel)

    const reaction = el('details', 'disclosure')
    const reactionSum = el('summary')
    const reactionText = el('p', 'muted')
    reaction.append(reactionSum, reactionText)

    c.body.append(steps, phase, blocked, last, markRes, note, autoRow, reaction)
    const offUi = onUiState(() => { note.textContent = getNote() })

    function labels(): void {
      const T = S()
      c.title.textContent = T.title
      steps.textContent = T.steps
      autoLabel.textContent = T.autoEdge
      reactionSum.textContent = T.reactionTitle
      reactionText.textContent = T.reaction
    }
    function sync(): void {
      const T = S()
      const s = app.getState()
      autoBox.checked = opts.autoEdge.get()
      const lastStop = app.stopLog().at(-1)
      last.textContent = lastStop && !s.stopwatch.running ? T.lastReading.replace('{t}', formatTime(lastStop.reading_s, ctx.lang())) : ''
      const can = app.canRelease(ctx.now())
      const done = s.ball.released && !['rolling', 'flying'].includes(app.ballStatus(ctx.now()).phase)
      blocked.textContent = can.ok || done ? '' : T.blocked.replace('{x}', can.reasons.map((r) => blockText(ctx.lang(), r)).join(' '))
      const run = s.ball.runId !== null ? app.getRun(s.ball.runId) : null
      markRes.textContent = run && done ? markResultText(ctx.lang(), run.mark.result) : ''
      note.textContent = getNote()
      phaseText()
    }
    function phaseText(): void {
      const T = S()
      const s = app.getState()
      const ph = app.ballStatus(ctx.now()).phase
      let key: keyof typeof T.phase
      if (s.ball.selected === null) key = 'none'
      else if (ph === 'rolling' || ph === 'flying') key = 'moving'
      else if (ph === 'stopped') key = 'stopped'
      else if (ph === 'rolledOver') key = 'rolledOver'
      else if (s.ball.released) key = 'done'
      else key = s.ball.placed ? 'placed' : 'chosen'
      const txt = T.phase[key]
      if (phase.textContent !== txt) phase.textContent = txt
    }

    labels()
    return {
      update() { if (w.dirty()) { w.clear(); sync() } else phaseText() },
      relabel() { labels(); w.touch() },
      destroy() { offUi(); w.off(); c.root.remove() },
    }
  }
}
