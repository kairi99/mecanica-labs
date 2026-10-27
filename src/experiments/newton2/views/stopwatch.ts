// Timing notes (step 3): what the DigiCart is doing, the result of the last release, the last stopwatch reading, the "switch to the
// pulley view" option, the practice mode and the reaction-time note. The stopwatch itself (LCD, start/stop, release, copy) is the timing bar.
import type { MountView, View } from './view.ts'
import { card, el, nextId, watch } from '../../../core/views/dom.ts'
import { formatNum } from '../../../core/views/numfmt.ts'
import { strings } from './strings/measure.ts'
import { strings as reasonStrings } from './strings/reasons.ts'

export interface StopwatchOptions {
  autoCam: { get: () => boolean; set: (on: boolean) => void }
}

export function mountStopwatch(opts: StopwatchOptions): MountView {
  return (root, ctx): View => {
    const app = ctx.apparatus
    const S = () => strings[ctx.lang()]
    const w = watch(app)
    const c = card('stopwatch', S().runTitle, 'card-stopwatch')
    root.append(c.root)

    const steps = el('p', 'muted')
    const phase = el('p', 'readout-text', undefined, { 'aria-live': 'polite' })
    const outcome = el('p', 'readout-text', undefined, { 'aria-live': 'polite' })
    const last = el('p', 'readout-text', undefined, { 'aria-live': 'polite' })

    const autoId = nextId('ac')
    const autoRow = el('div', 'check-row')
    const autoBox = el('input', undefined, undefined, { type: 'checkbox', id: autoId })
    const autoLabel = el('label', undefined, undefined, { for: autoId })
    autoBox.checked = opts.autoCam.get()
    autoBox.addEventListener('change', () => opts.autoCam.set(autoBox.checked))
    autoRow.append(autoBox, autoLabel)

    const practice = el('details', 'disclosure')
    const practiceSum = el('summary')
    const linkId = nextId('lk')
    const linkRow = el('div', 'check-row')
    const linkBox = el('input', undefined, undefined, { type: 'checkbox', id: linkId })
    const linkLabel = el('label', undefined, undefined, { for: linkId })
    linkBox.addEventListener('change', () => { app.setLinkStartToRelease(linkBox.checked); ctx.changed() })
    linkRow.append(linkBox, linkLabel)
    const linkNote = el('p', 'muted')
    practice.append(practiceSum, linkRow, linkNote)

    const reaction = el('details', 'disclosure')
    const reactionSum = el('summary')
    const reactionText = el('p', 'muted')
    reaction.append(reactionSum, reactionText)

    c.body.append(steps, phase, outcome, last, autoRow, practice, reaction)

    function labels(): void {
      const T = S()
      c.title.textContent = T.runTitle
      steps.textContent = T.steps
      autoLabel.textContent = T.autoCam
      practiceSum.textContent = T.practice
      linkLabel.textContent = T.link
      linkNote.textContent = T.linkNote
      reactionSum.textContent = T.reactionTitle
      reactionText.textContent = T.reaction
    }
    function sync(): void {
      const T = S()
      const s = app.getState()
      linkBox.checked = s.stopwatch.linkStartToRelease
      autoBox.checked = opts.autoCam.get()
      const lastStop = app.stopLog().at(-1)
      last.textContent = lastStop && !s.stopwatch.running ? T.lastReading.replace('{t}', formatNum(lastStop.reading_s, 2, ctx.lang())) : ''
      const run = app.getRuns().at(-1)
      outcome.textContent = run ? T.runOutcome.replace('{x}', reasonStrings[ctx.lang()].outcomes[run.outcome]) : T.runNone
      outcome.classList.toggle('warn', run !== undefined && run.outcome !== 'ok')
      phaseText()
    }
    function phaseText(): void {
      const txt = S().phase[app.cartState(ctx.now()).phase]
      if (phase.textContent !== txt) phase.textContent = txt
    }
    labels()
    return {
      update() { if (w.dirty()) { w.clear(); sync() } else phaseText() },
      relabel() { labels(); w.touch() },
      destroy() { w.off(); c.root.remove() },
    }
  }
}
