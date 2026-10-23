// Procedure checklist panel: renders the experiment's live checklist. Each step has a short "why" and a "show me" that focuses
// the 3D part and opens the matching panel. Built once, updated in place (keeps focus and the open "why" disclosures).
import type { MountView, Strings, View } from '../views/view.ts'
import { button, card, el, watch, type Subscribable } from '../views/dom.ts'
import { fmt } from './dom.ts'
import type { Lang } from '../i18n.ts'

export type StepStatus = 'ok' | 'pending' | 'na'

/** What the panel needs of a step; experiments add their own fields. */
export interface ChecklistStepBase<Id extends string = string> {
  id: Id
  status: StepStatus
  /** Key in the strings `detail` table and its {placeholders}. */
  detail: { key: string; params: Record<string, string | number> } | null
  /** 3D part ids to highlight (scene focus). */
  focus: string[]
  /** Which UI panel (data-panel id) a "show me" opens. */
  panel: string
  /** Measurement step only: readings per row, for the progress chips. */
  progress?: number[]
}

export interface ChecklistStrings<Id extends string> {
  title: string
  intro: string
  progress: string
  allDone: string
  statusOk: string
  statusPending: string
  statusNa: string
  why: string
  show: string
  showAria: string
  next: string
  tour: string
  steps: Record<Id, { label: string; why: string }>
  detail: Record<string, string>
  rowChip: string
}

/** What makes a checklist specific to one experiment. */
export interface ChecklistDef<A, Id extends string, S extends ChecklistStepBase<Id>> {
  ids: readonly Id[]
  strings: Strings<ChecklistStrings<Id>>
  build(app: A, opts: { teacher: boolean }): S[]
  next(steps: S[]): S | null
}

export interface ChecklistHooks<S> {
  teacher: boolean
  onShow: (step: S) => void
  onTour: () => void
  /** Called after every render with the live steps (the shell draws the step tracker and the "next step" line from them). */
  onProgress?: (steps: S[], next: S | null) => void
}

/** Numbers with the language's decimal mark, for the {placeholders} of the detail strings. */
export function localiseParams(params: Record<string, string | number>, lang: Lang): Record<string, string | number> {
  const out: Record<string, string | number> = {}
  for (const [k, v] of Object.entries(params)) out[k] = typeof v === 'number' && lang === 'es' ? String(v).replace('.', ',') : v
  return out
}

export function mountChecklist<A extends Subscribable, Id extends string, S extends ChecklistStepBase<Id>>(
  def: ChecklistDef<A, Id, S>, hooks: ChecklistHooks<S>,
): MountView<A> {
  return (root, ctx): View => {
    const app = ctx.apparatus
    const strings = def.strings
    const Str = () => strings[ctx.lang()]
    const w = watch(app)
    const c = card('procedure', Str().title, 'card-procedure')
    c.root.dataset.region = 'procedure'
    root.append(c.root)
    const intro = el('p', 'muted')
    const progress = el('p', 'readout-text', undefined, { 'aria-live': 'polite' })
    const list = el('ol', 'step-list')
    const tourBtn = button('', 'btn btn-quiet', () => hooks.onTour())
    c.body.append(intro, progress, list, tourBtn)

    interface Row { li: HTMLElement; mark: HTMLElement; label: HTMLElement; detail: HTMLElement; chips: HTMLElement; status: HTMLElement; whyBox: HTMLDetailsElement; whySum: HTMLElement; whyText: HTMLElement; show: HTMLButtonElement }
    const rows = new Map<Id, Row>()
    let steps: S[] = []
    for (const id of def.ids) {
      const li = el('li', 'step', undefined, { 'data-step': id })
      const mark = el('span', 'step-mark', undefined, { 'aria-hidden': 'true' })
      const text = el('div', 'step-text')
      const label = el('span', 'step-label')
      const detail = el('span', 'muted step-detail')
      const chips = el('div', 'step-chips')
      const whyBox = el('details', 'step-why')
      const whySum = el('summary')
      const whyText = el('p', 'why')
      whyBox.append(whySum, whyText)
      const show = button('', 'btn btn-quiet step-show', () => { const s = steps.find((x) => x.id === id); if (s) hooks.onShow(s) })
      text.append(label, detail, chips, whyBox, show)
      const status = el('span', 'check-status')
      li.append(mark, text, status)
      list.append(li)
      rows.set(id, { li, mark, label, detail, chips, status, whyBox, whySum, whyText, show })
    }

    function render(): void {
      const T = Str()
      const lang = ctx.lang()
      c.title.textContent = T.title
      intro.textContent = T.intro
      tourBtn.textContent = T.tour
      steps = def.build(app, { teacher: hooks.teacher })
      const done = steps.filter((s) => s.status === 'ok').length
      const nxt = def.next(steps)
      hooks.onProgress?.(steps, nxt)
      progress.textContent = nxt ? fmt(T.progress, { n: done, total: steps.length }) : T.allDone
      for (const s of steps) {
        const r = rows.get(s.id)!
        const txt = T.steps[s.id]
        r.li.className = `step ${s.status}${nxt?.id === s.id ? ' current' : ''}`
        if (nxt?.id === s.id) r.li.setAttribute('aria-current', 'step'); else r.li.removeAttribute('aria-current')
        r.mark.textContent = s.status === 'ok' ? '✓' : s.status === 'pending' ? '○' : '–'
        r.label.textContent = txt.label
        const d = s.detail ? T.detail[s.detail.key] : undefined
        r.detail.textContent = d && s.detail ? fmt(d, localiseParams(s.detail.params, lang)) : ''
        r.detail.hidden = r.detail.textContent === ''
        r.chips.replaceChildren()
        if (s.progress) {
          s.progress.forEach((n, i) => {
            const x = (i + 1) * 10
            r.chips.append(el('span', `chip${n >= 10 ? ' chip-on' : ''}`, `${x}·${n}`, { title: fmt(T.rowChip, { x, n, total: 10 }), 'aria-label': fmt(T.rowChip, { x, n, total: 10 }) }))
          })
        }
        r.chips.hidden = !s.progress
        r.status.textContent = s.status === 'ok' ? T.statusOk : s.status === 'pending' ? T.statusPending : T.statusNa
        r.whySum.textContent = T.why
        r.whyText.textContent = txt.why
        r.show.textContent = T.show
        r.show.setAttribute('aria-label', fmt(T.showAria, { step: txt.label }))
      }
    }
    return {
      update() { if (w.dirty()) { w.clear(); render() } },
      relabel() { w.touch() },
      destroy() { w.off(); c.root.remove() },
    }
  }
}
