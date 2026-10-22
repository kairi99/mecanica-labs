// Coach toast: a dismissible status message at the bottom of the screen. Never traps focus, never blocks the lab.
import type { ViewContext } from '../views/view.ts'
import { button, el } from '../views/dom.ts'
import { CoachGate, trackCoach, type CoachKey, type Nudge } from './coach.ts'
import { strings } from './strings/coach.ts'
import { fmt } from './dom.ts'
import { localiseParams } from './checklistView.ts'

export const COACH_VISIBLE_MS = 14000

export function mountCoach(ctx: ViewContext): { relabel(): void; destroy(): void } {
  const gate = new CoachGate()
  const box = el('div', 'coach', undefined, { role: 'status', 'aria-live': 'polite' })
  box.hidden = true
  const tag = el('span', 'coach-tag')
  const text = el('p', 'coach-text')
  const close = button('×', 'coach-close', () => hide(true))
  box.append(tag, text, close)
  document.body.append(box)
  let current: Nudge | null = null
  let timer = 0
  const label = (): void => {
    const T = strings[ctx.lang()]
    tag.textContent = T.label
    close.setAttribute('aria-label', T.dismiss)
    if (current) text.textContent = fmt(T.nudges[current.key], localiseParams(current.params, ctx.lang()))
  }
  function hide(dismissed: boolean): void {
    if (dismissed && current) gate.dismiss(current.key as CoachKey, ctx.now())
    box.hidden = true
    current = null
    window.clearTimeout(timer)
  }
  const off = trackCoach(ctx.apparatus, gate, ctx.now, (n) => {
    current = n
    label()
    box.hidden = false
    window.clearTimeout(timer)
    timer = window.setTimeout(() => hide(false), COACH_VISIBLE_MS)
  })
  label()
  return { relabel: label, destroy() { off(); hide(false); box.remove() } }
}
