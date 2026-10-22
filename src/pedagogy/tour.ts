// First-visit tour: a spotlight and a card per region. Keyboard: Right/Enter next, Left back, Escape skips, Tab stays in the card.
// Steps whose target is missing or hidden are skipped (for example the analysis panel with ?analysis=0).
import type { ViewContext } from '../views/view.ts'
import { button, el } from '../views/dom.ts'
import { fmt, store } from './dom.ts'
import { strings } from './strings/tour.ts'

export const TOUR_KEY = 'digicart-mruv-tour-done'
export const TOUR_STEP_IDS = ['stage', 'inventory', 'adjust', 'caliper', 'stopwatch', 'table', 'tablet', 'analysis'] as const
export type TourStepId = (typeof TOUR_STEP_IDS)[number]
export const TOUR_SELECTORS: Record<TourStepId, string> = {
  stage: '[data-region="stage"]',
  inventory: '[data-panel="inventory"]',
  adjust: '[data-panel="adjust"]',
  caliper: '[data-panel="caliper"]',
  stopwatch: '[data-panel="stopwatch"]',
  table: '[data-panel="table"]',
  tablet: '[data-panel="tablet"]',
  analysis: '[data-region="analysis"]',
}

/** ?tour=0 never starts it on its own, ?tour=1 starts it on every load, otherwise only on the first visit. */
export type TourFlag = '0' | '1' | null

export interface Tour {
  start(): void
  shouldAutoStart(flag: TourFlag): boolean
  relabel(): void
  isOpen(): boolean
}

const PAD = 6

export function mountTour(ctx: ViewContext): Tour {
  let root: HTMLElement | null = null
  let idx = 0
  let steps: Array<{ id: TourStepId; target: HTMLElement }> = []
  let opener: HTMLElement | null = null
  let raf = 0
  let spot!: HTMLElement
  let card!: HTMLElement
  let title!: HTMLElement
  let body!: HTMLElement
  let count!: HTMLElement
  let backBtn!: HTMLButtonElement
  let nextBtn!: HTMLButtonElement
  let skipBtn!: HTMLButtonElement

  const place = (): void => {
    const step = steps[idx]
    if (!root || !step) return
    const r = step.target.getBoundingClientRect()
    const vw = window.innerWidth, vh = window.innerHeight
    const x0 = Math.max(0, r.left - PAD), y0 = Math.max(0, r.top - PAD)
    const x1 = Math.min(vw, r.right + PAD), y1 = Math.min(vh, r.bottom + PAD)
    Object.assign(spot.style, { left: `${x0}px`, top: `${y0}px`, width: `${Math.max(0, x1 - x0)}px`, height: `${Math.max(0, y1 - y0)}px` })
    card.dataset.pos = (y0 + y1) / 2 < vh / 2 ? 'bottom' : 'top'
  }
  const loop = (): void => { place(); raf = requestAnimationFrame(loop) }

  const show = (i: number): void => {
    idx = Math.min(Math.max(0, i), steps.length - 1)
    const T = strings[ctx.lang()]
    const step = steps[idx]!
    const txt = T.steps[step.id]
    title.textContent = txt.title
    body.textContent = txt.body
    count.textContent = fmt(T.stepOf, { n: idx + 1, total: steps.length })
    backBtn.textContent = T.back
    backBtn.hidden = idx === 0
    nextBtn.textContent = idx === steps.length - 1 ? T.finish : T.next
    skipBtn.textContent = T.skip
    step.target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: ctx.reducedMotion() ? 'auto' : 'smooth' })
    place()
    nextBtn.focus({ preventScroll: true })
  }
  const close = (): void => {
    if (!root) return
    cancelAnimationFrame(raf)
    root.remove()
    root = null
    store.set(TOUR_KEY, '1')
    document.removeEventListener('keydown', onKey, true)
    opener?.focus({ preventScroll: true })
  }
  const next = (): void => { if (idx >= steps.length - 1) close(); else show(idx + 1) }
  function onKey(e: KeyboardEvent): void {
    if (!root) return
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close() }
    else if (e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); next() }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); show(idx - 1) }
    else if (e.key === 'Tab') {
      const f = [backBtn, nextBtn, skipBtn].filter((b) => !b.hidden)
      const at = f.indexOf(document.activeElement as HTMLButtonElement)
      e.preventDefault()
      f[(at + (e.shiftKey ? -1 : 1) + f.length) % f.length]!.focus({ preventScroll: true })
    } else if (e.key === ' ') {
      // Space must not reach the stopwatch shortcut while the tour is open.
      e.stopPropagation()
    }
  }
  return {
    shouldAutoStart: (flag) => flag === '1' ? true : flag === '0' ? false : store.get(TOUR_KEY) === null,
    isOpen: () => root !== null,
    relabel() { if (root) show(idx) },
    start() {
      if (root) return
      steps = TOUR_STEP_IDS.map((id) => ({ id, target: document.querySelector<HTMLElement>(TOUR_SELECTORS[id]) }))
        .filter((s): s is { id: TourStepId; target: HTMLElement } => s.target !== null && s.target.getBoundingClientRect().width > 0)
      if (steps.length === 0) return
      opener = document.activeElement as HTMLElement | null
      root = el('div', 'tour')
      spot = el('div', 'tour-spot')
      card = el('div', 'tour-card', undefined, { role: 'dialog', 'aria-modal': 'true', 'aria-label': strings[ctx.lang()].label })
      count = el('p', 'tour-count')
      title = el('h2', 'tour-title')
      body = el('p', 'tour-body')
      const row = el('div', 'tour-actions')
      skipBtn = button('', 'tour-skip', close)
      backBtn = button('', 'tour-back', () => show(idx - 1))
      nextBtn = button('', 'tour-next', next)
      row.append(skipBtn, backBtn, nextBtn)
      card.append(count, title, body, row)
      root.append(spot, card)
      document.body.append(root)
      document.addEventListener('keydown', onKey, true)
      raf = requestAnimationFrame(loop)
      show(0)
    },
  }
}
