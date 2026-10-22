// Procedure checklist placeholder (phase 4 expands it). Reads Apparatus.procedure(); blocks nothing.
import type { MountView, View } from './view.ts'
import { card, el, watch } from './dom.ts'
import { strings } from './strings/procedure.ts'

type Status = 'ok' | 'pending' | 'na'

export const mountProcedure: MountView = (root, ctx): View => {
  const app = ctx.apparatus
  const S = () => strings[ctx.lang()]
  const w = watch(app)
  const c = card('procedure', S().title, 'card-procedure')
  c.root.dataset.region = 'procedure'
  root.append(c.root)
  const intro = el('p', 'muted')
  const list = el('ul', 'check-list')
  c.body.append(intro, list)

  function render(): void {
    const T = S()
    c.title.textContent = T.title
    intro.textContent = T.intro
    const p = app.procedure()
    const has = p.setupComplete
    const rows: Array<[string, Status, string?]> = [
      [T.items.setup, p.setupComplete ? 'ok' : 'pending'],
      [T.items.scale, p.scaleZeroAtHighEnd === null ? 'na' : p.scaleOk ? 'ok' : 'pending'],
      [T.items.levelled, p.levelledBeforeRaise ? 'ok' : 'pending'],
      [T.items.angle, p.theta_rad === null || !has ? 'na' : p.angleOk ? 'ok' : 'pending', p.theta_rad === null || !has ? T.detail.angleUnknown : undefined],
      [T.items.heights, p.heightsMeasured.clamp && p.heightsMeasured.twoLeg ? 'ok' : 'pending'],
      [T.items.marks, p.marksOk ? 'ok' : 'pending', T.detail.marksCount.replace('{n}', String(p.marks.count))],
      [T.items.cartZero, p.cart.onRail && p.cart.atZero ? 'ok' : 'pending'],
      [T.items.records, p.tableComplete ? 'ok' : p.tableFilled > 0 ? 'pending' : 'pending',
        T.detail.recordsLine.replace('{n}', String(p.recordsPerPosition.filter((n) => n > 0).length)).replace('{t}', String(p.tableFilled)) +
        ` · ${T.detail.runs.replace('{n}', String(p.runsCount)).replace('{s}', String(p.stopsCount))}`],
    ]
    list.replaceChildren()
    for (const [label, st, detail] of rows) {
      const li = el('li', `check ${st}`)
      const mark = el('span', 'check-mark', st === 'ok' ? '✓' : st === 'pending' ? '○' : '–', { 'aria-hidden': 'true' })
      const text = el('span', 'check-text')
      text.append(el('span', undefined, label))
      if (detail) text.append(el('span', 'muted', detail))
      const status = el('span', 'check-status', st === 'ok' ? T.statusOk : st === 'pending' ? T.statusPending : T.statusNa)
      li.append(mark, text, status)
      list.append(li)
    }
  }

  return {
    update() { if (w.dirty()) { w.clear(); render() } },
    relabel() { w.touch() },
    destroy() { w.off(); c.root.remove() },
  }
}

/** Placeholder for the phase-4 analysis tasks. Hidden by the shell when ?analysis=0. */
export const mountAnalysisPlaceholder: MountView = (root, ctx): View => {
  const c = card('analysis', strings[ctx.lang()].analysisTitle, 'card-analysis')
  c.root.dataset.region = 'analysis'
  const p = el('p', 'muted')
  c.body.append(p)
  root.append(c.root)
  const labels = (): void => { c.title.textContent = strings[ctx.lang()].analysisTitle; p.textContent = strings[ctx.lang()].analysisSoon }
  labels()
  return { update() {}, relabel: labels, destroy() { c.root.remove() } }
}
