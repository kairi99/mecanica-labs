// Parabolic coach (minimal, Phase 3b): three nudges for typical slips. Pure rules and DOM-free; the rate limiter and the toast are in
// core/pedagogy. Phase 4 replaces this.
import { MARK_UPPER_HALF_FROM_m, type ApparatusEvent, type ParabolicApparatus } from '../apparatus/index.ts'
import type { Nudge as CoreNudge } from '../../../core/pedagogy/coach.ts'
import { mountCoach as mountCoreCoach, type CoachDef } from '../../../core/pedagogy/coachView.ts'
import type { ViewContext } from '../views/view.ts'
import { strings } from './strings/coach.ts'

export const COACH_KEYS = ['marksLowerHalf', 'noCarbon', 'paperMoved'] as const
export type CoachKey = (typeof COACH_KEYS)[number]
export type Nudge = CoreNudge<CoachKey>

/** Nudges (in priority order) that an apparatus event deserves. Callers apply the rate limit. */
export function coachCandidates(app: ParabolicApparatus, e: ApparatusEvent): Nudge[] {
  const out: Nudge[] = []
  const push = (key: CoachKey): void => { out.push({ key, params: {} }) }
  switch (e.type) {
    case 'markPlaced': case 'markMoved':
      if (e.s_m < MARK_UPPER_HALF_FROM_m - 1e-9) push('marksLowerHalf')
      break
    case 'released':
      if (!app.procedure().carbonOverBond) push('noCarbon')
      break
    case 'bondPlaced':
      if (e.moved && app.procedure().paperMovedSinceMarks) push('paperMoved')
      break
    default:
      break
  }
  return out
}

export const COACH_DEF: CoachDef<ParabolicApparatus, ApparatusEvent, CoachKey> = { strings, candidates: coachCandidates }

export function mountCoach(ctx: ViewContext): { relabel(): void; destroy(): void } { return mountCoreCoach(ctx, COACH_DEF) }
