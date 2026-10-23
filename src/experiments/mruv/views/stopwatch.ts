// Timing notes (step 3): where the DigiCart is, the last stopwatch reading, the "switch to the Mark view" option, the practice
// mode and the reaction-time note. The stopwatch itself (LCD, start/stop, release, copy) is the timing bar (timingbar.ts).
import { TABLE_POSITIONS_cm } from '../apparatus/index.ts'
import type { MountView, View } from './view.ts'
import { card, el, nextId, watch } from '../../../core/views/dom.ts'
import { formatNum } from '../../../core/views/numfmt.ts'
import { strings } from './strings/stopwatch.ts'

export interface StopwatchOptions {
  autoMark: { get: () => boolean; set: (on: boolean) => void }
}

export function mountStopwatch(opts: StopwatchOptions): MountView {
  return (root, ctx): View => {
    const app = ctx.apparatus
    const S = () => strings[ctx.lang()]
    const w = watch(app)
    const c = card('stopwatch', S().title, 'card-stopwatch')
    root.append(c.root)

    const steps = el('p', 'muted')
    const phase = el('p', 'readout-text', undefined, { 'aria-live': 'polite' })
    const last = el('p', 'readout-text', undefined, { 'aria-live': 'polite' })

    const autoId = nextId('am')
    const autoRow = el('div', 'check-row')
    const autoBox = el('input', undefined, undefined, { type: 'checkbox', id: autoId })
    const autoLabel = el('label', undefined, undefined, { for: autoId })
    autoBox.checked = opts.autoMark.get()
    autoBox.addEventListener('change', () => opts.autoMark.set(autoBox.checked))
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

    c.body.append(steps, phase, last, autoRow, practice, reaction)

    function labels(): void {
      const T = S()
      c.title.textContent = T.title
      steps.textContent = T.steps
      autoLabel.textContent = T.autoMark
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
      autoBox.checked = opts.autoMark.get()
      const lastStop = app.stopLog().at(-1)
      if (lastStop && !s.stopwatch.running) {
        const t = formatNum(lastStop.reading_s, 2, ctx.lang())
        last.textContent = lastStop.markTarget !== null
          ? T.lastReadingFor.replace('{t}', t).replace('{x}', String(TABLE_POSITIONS_cm[lastStop.markTarget] ?? ''))
          : T.lastReading.replace('{t}', t)
      } else last.textContent = ''
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
      update() { if (w.dirty()) { w.clear(); sync() } else phaseText() },
      relabel() { labels(); w.touch() },
      destroy() { w.off(); c.root.remove() },
    }
  }
}
