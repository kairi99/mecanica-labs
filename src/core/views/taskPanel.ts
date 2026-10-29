// Checklist of the guide's analysis tasks plus the theory card, shared by the four analysis panels. It renders the completion that the
// experiment's pure function returns (core/theory.ts `taskCompletion`) and flips the unlock flag; it computes no physics.
import type { Lang } from '../i18n.ts'
import { fmt } from '../pedagogy/dom.ts'
import { helpHref, theoryOverride, type Completion, type TaskTracker } from '../theory.ts'
import { el } from './dom.ts'
import { strings } from './taskPanelStrings.ts'

export interface TaskPanelOptions {
  tracker: TaskTracker
  /** Task ids in display order. */
  ids: readonly string[]
  /** Task texts by id in the current language (from the experiment's strings). */
  labels: (lang: Lang) => Readonly<Record<string, string>>
  lang: () => Lang
  /** Help link to the theory section, by language (relative to the experiment page, with its #anchor). */
  helpTheory: Readonly<Record<Lang, string>>
}

export interface TaskPanel {
  root: HTMLElement
  /** Show a new completion (call whenever the ticks or the data change). */
  update(c: Completion): void
  relabel(): void
  destroy(): void
}

export function mountTaskPanel(o: TaskPanelOptions): TaskPanel {
  const S = () => strings[o.lang()]
  const override = theoryOverride()
  const root = el('section', 'an-sec task-panel')
  const h = el('h3', 'sub-title')
  const hint = el('p', 'muted')
  const progress = el('p', 'readout-text')
  const list = el('ul', 'task-list')
  const rows = new Map<string, { li: HTMLElement; name: HTMLElement; input: HTMLInputElement; lab: HTMLElement; warn: HTMLElement }>()
  for (const id of o.ids) {
    const li = el('li', 'task-row')
    const name = el('span', 'task-name')
    const lab = el('label', 'task-done')
    const input = el('input', undefined, undefined, { type: 'checkbox' })
    const labText = el('span')
    lab.append(input, labText)
    const warn = el('span', 'task-warn muted')
    warn.hidden = true
    input.addEventListener('change', () => o.tracker.set(id, input.checked))
    li.append(name, lab, warn)
    list.append(li)
    rows.set(id, { li, name, input, lab: labText, warn })
  }
  const card = el('div', 'note theory-card')
  const cardTitle = el('strong')
  const cardBody = el('p')
  const link = el('a', 'btn btn-quiet theory-link', undefined, { target: '_blank', rel: 'noopener' })
  card.append(cardTitle, cardBody, link)
  // Polite live region, written only once when the theory unlocks in this session.
  const live = el('p', 'visually-hidden', undefined, { role: 'status', 'aria-live': 'polite' })
  root.append(h, hint, progress, list, card, live)

  let last: Completion | null = null
  let announced = o.tracker.unlocked()

  function paint(): void {
    const T = S(), labels = o.labels(o.lang())
    h.textContent = T.title
    hint.textContent = T.hint
    rows.forEach((r, id) => {
      const text = labels[id] ?? id
      r.name.textContent = text
      r.lab.textContent = T.done
      r.input.setAttribute('aria-label', fmt(T.doneAria, { task: text }))
      r.input.checked = o.tracker.has(id)
      const st = last?.tasks.find((t) => t.id === id)
      r.warn.textContent = T.needData
      r.warn.hidden = !st?.dataMissing
      r.li.classList.toggle('is-done', !!st?.done)
    })
    const open = override || o.tracker.unlocked()
    progress.textContent = fmt(T.progress, { k: last?.done ?? 0, n: o.ids.length })
    cardTitle.textContent = open ? T.unlockedTitle : T.lockedTitle
    cardBody.textContent = override && !o.tracker.unlocked() ? T.teacherOpen : open ? T.unlockedBody : T.lockedBody
    link.hidden = !open
    link.textContent = T.openTheory
    link.setAttribute('href', helpHref(o.helpTheory[o.lang()], override))
    link.setAttribute('hreflang', o.lang())
    card.classList.toggle('is-open', open)
  }

  const off = o.tracker.onChange(() => { if (!o.tracker.unlocked()) announced = false; paint() })
  return {
    root,
    update(c) {
      last = c
      if (c.complete && !o.tracker.unlocked()) {
        o.tracker.setUnlocked(true) // repaints through onChange
        if (!announced) { announced = true; live.textContent = S().announce }
      }
      paint()
    },
    relabel() { paint() },
    destroy() { off(); root.remove() },
  }
}
