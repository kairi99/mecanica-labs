// Masses panel: where each of the four 10 g masses is (canister, DigiCart with a plastic screw, or left out) and the trial buttons that
// move one mass from the canister to the DigiCart (step 7 of the guide). Full in step 2, compact (trial buttons only) in step 3.
import { TRIAL_MASSES_IN_CANISTER } from '../apparatus/index.ts'
import { MASS_COUNT, type MassLocation } from '../physics/index.ts'
import type { MountView, View } from './view.ts'
import { button, card, el, watch } from '../../../core/views/dom.ts'
import { reasonText } from './reasons.ts'
import { strings } from './strings/adjust.ts'
import { setTrialRow } from './uistate.ts'

export interface MassesOptions { compact: boolean }

export function mountMasses(opts: MassesOptions): MountView {
  return (root, ctx): View => {
    const app = ctx.apparatus
    const S = () => strings[ctx.lang()]
    const w = watch(app)
    const panel = opts.compact ? 'trial' : 'masses'
    const c = card(panel, S().massesTitle, `card-masses${opts.compact ? ' compact' : ''}`)
    root.append(c.root)
    const fill = (tpl: string, vars: Record<string, string | number>): string => tpl.replace(/\{(\w+)\}/g, (_m, k: string) => String(vars[k] ?? ''))

    const intro = el('p', 'muted')
    const trialsLabel = el('p', 'field-label')
    const trials = el('div', 'seg seg-wrap', undefined, { role: 'group' })
    const trialBtns = TRIAL_MASSES_IN_CANISTER.map((n) => {
      const b = button('', 'seg-btn', () => {
        const r = app.setTrial(n)
        ctx.changed()
        if (r.ok) setTrialRow(4 - n)
        else why.textContent = reasonText(ctx.lang(), r.reason, r.item)
      })
      trials.append(b)
      return b
    })
    const now = el('p', 'readout-text', undefined, { 'aria-live': 'polite' })
    const hint = el('p', 'muted')
    const why = el('p', 'why')
    const list = el('div', 'mass-list')
    const massRows = Array.from({ length: MASS_COUNT }, (_v, i) => {
      const row = el('div', 'mass-row')
      const name = el('span', 'inv-name')
      const seg = el('div', 'seg', undefined, { role: 'group' })
      const btns = (['canister', 'cart', 'bench'] as const).map((loc) => {
        const b = button('', 'seg-btn', () => {
          const r = app.setMassLocation(i, loc)
          ctx.changed()
          why.textContent = r.ok ? '' : reasonText(ctx.lang(), r.reason, r.item)
        })
        seg.append(b)
        return { loc, b }
      })
      row.append(name, seg)
      list.append(row)
      return { name, seg, btns }
    })
    const summary = el('p', 'readout-text', undefined, { 'aria-live': 'polite' })
    const benchWarn = el('p', 'note')
    const screwNote = el('p', 'muted')
    if (opts.compact) c.body.append(trialsLabel, trials, now, hint, why)
    else c.body.append(intro, trialsLabel, trials, now, why, list, summary, benchWarn, screwNote)

    function labels(): void {
      const T = S()
      c.title.textContent = opts.compact ? T.trialsLabel : T.massesTitle
      intro.textContent = T.massesIntro
      trialsLabel.textContent = T.trialsLabel
      trials.setAttribute('aria-label', T.trialsLabel)
      trialBtns.forEach((b, k) => { const n = TRIAL_MASSES_IN_CANISTER[k]!; b.textContent = n === 0 ? T.trialBtnEmpty : fill(T.trialBtn, { n }) })
      hint.textContent = T.trialHint
      massRows.forEach((r, i) => {
        r.name.textContent = fill(T.massLabel, { n: i + 1 })
        r.seg.setAttribute('aria-label', fill(T.massLabel, { n: i + 1 }))
        r.btns.forEach(({ loc, b }) => { b.textContent = loc === 'canister' ? T.inCanister : loc === 'cart' ? T.onCart : T.onBench })
      })
      benchWarn.textContent = T.benchWarn
      screwNote.textContent = T.screwNote
    }
    function sync(): void {
      const T = S()
      const s = app.getState()
      const where = s.masses as MassLocation[]
      const cnt = (l: MassLocation): number => where.filter((x) => x === l).length
      const n = cnt('canister')
      trialBtns.forEach((b, k) => {
        const on = TRIAL_MASSES_IN_CANISTER[k] === n && cnt('bench') === 0
        b.setAttribute('aria-pressed', String(on)); b.classList.toggle('active', on)
      })
      now.textContent = fill(T.trialNow, { c: n, k: cnt('cart') })
      massRows.forEach((r, i) => r.btns.forEach(({ loc, b }) => { b.setAttribute('aria-pressed', String(where[i] === loc)); b.classList.toggle('active', where[i] === loc) }))
      summary.textContent = fill(T.summaryLine, { c: n, k: cnt('cart'), b: cnt('bench') })
      benchWarn.hidden = cnt('bench') === 0
      screwNote.hidden = cnt('cart') === 0
      if (!s.items.masses || !s.items.canister) why.textContent = why.textContent || T.needMasses
    }
    labels()
    return {
      update() { if (w.dirty()) { w.clear(); sync() } },
      relabel() { labels(); w.touch() },
      destroy() { w.off(); c.root.remove() },
    }
  }
}
