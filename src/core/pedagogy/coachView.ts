// Coach toast: a dismissible status message at the bottom of the screen. Never traps focus, never blocks the lab.
import type { Strings, ViewContext } from '../views/view.ts'
import type { Lang } from '../i18n.ts'
import { button, el } from '../views/dom.ts'
import { CoachGate, trackCoach, type EventSource, type Nudge } from './coach.ts'
import { fmt } from './dom.ts'
import { localiseParams } from './checklistView.ts'

export const COACH_VISIBLE_MS = 14000

export interface CoachStrings<K extends string> {
  label: string
  dismiss: string
  nudges: Record<K, string>
}

/** What makes a coach specific to one experiment: its strings and the rule that maps an event to nudges. */
export interface CoachDef<A extends EventSource<E>, E, K extends string> {
  strings: Strings<CoachStrings<K>>
  /** Nudges (in priority order) that an event deserves; empty for events that are never coached. */
  candidates(app: A, e: E): readonly Nudge<K>[]
  /** Optional: turn language-free params (for example a ball id) into text before they are substituted. */
  localise?(params: Record<string, string | number>, lang: Lang): Record<string, string | number>
}

export function mountCoach<A extends EventSource<E>, E, K extends string>(ctx: ViewContext<A>, def: CoachDef<A, E, K>): { relabel(): void; destroy(): void } {
  const strings = def.strings
  const gate = new CoachGate<K>()
  const box = el('div', 'coach', undefined, { role: 'status', 'aria-live': 'polite' })
  box.hidden = true
  const tag = el('span', 'coach-tag')
  const text = el('p', 'coach-text')
  const close = button('×', 'coach-close', () => hide(true))
  box.append(tag, text, close)
  document.body.append(box)
  let current: Nudge<K> | null = null
  let timer = 0
  const label = (): void => {
    const T = strings[ctx.lang()]
    tag.textContent = T.label
    close.setAttribute('aria-label', T.dismiss)
    if (current) text.textContent = fmt(T.nudges[current.key], localiseParams(def.localise ? def.localise(current.params, ctx.lang()) : current.params, ctx.lang()))
  }
  function hide(dismissed: boolean): void {
    if (dismissed && current) gate.dismiss(current.key, ctx.now())
    box.hidden = true
    current = null
    window.clearTimeout(timer)
  }
  const off = trackCoach(ctx.apparatus, (e: E) => def.candidates(ctx.apparatus, e), gate, ctx.now, (n) => {
    current = n
    label()
    box.hidden = false
    window.clearTimeout(timer)
    timer = window.setTimeout(() => hide(false), COACH_VISIBLE_MS)
  })
  label()
  return { relabel: label, destroy() { off(); hide(false); box.remove() } }
}
