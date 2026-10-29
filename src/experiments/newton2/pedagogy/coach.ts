// Practica 3 coach rules: which nudges an apparatus event deserves. Pure and DOM-free; the rate limiter and the toast are in
// core/pedagogy. Every rule reads apparatus state or run results (no view state) and mirrors a caution of the guide (3.3.2 / 3.3.3) or
// a typical slip: rail not level, string too long or too short, string not attached, a mass taken out of the system instead of moved to
// the cart, the force not read again after moving a mass, the cart off the track, implausible times.
import type { ApparatusEvent, Apparatus } from '../apparatus/index.ts'
import { CoachGate, trackCoach as trackCoreCoach, type Nudge as CoreNudge } from '../../../core/pedagogy/coach.ts'
import { mountCoach as mountCoreCoach, type CoachDef } from '../../../core/pedagogy/coachView.ts'
import type { ViewContext } from '../views/view.ts'
import { strings } from './strings/coach.ts'

export const COACH_KEYS = [
  'notLevel', 'stringTooLong', 'stringTooShort', 'stringNotAttached', 'receiverBlocks', 'neverStarts', 'cartFell', 'massTaken', 'forceStale', 'forceMissing',
  'cartOffTrack', 'timeImplausible', 'distanceOff', 'noMt',
] as const
export type CoachKey = (typeof COACH_KEYS)[number]
export type Nudge = CoreNudge<CoachKey>

/** Teaching thresholds (not physics): a recorded run time outside this window looks like a slip (a lost press, a wrong unit, another distance). ASSUMED. */
export const TIME_PLAUSIBLE_MIN_s = 0.6
export const TIME_PLAUSIBLE_MAX_s = 4.5

/** Nudges (in priority order) that an apparatus event deserves. Callers apply the rate limit. */
export function coachCandidates(app: Apparatus, e: ApparatusEvent): Nudge[] {
  const out: Nudge[] = []
  const push = (key: CoachKey, params: Nudge['params'] = {}): void => { out.push({ key, params }) }
  switch (e.type) {
    case 'released': {
      const p = app.procedure()
      if (e.outcome === 'fell') { push('cartFell'); break }
      if (e.outcome === 'stringNotAttached') push('stringNotAttached')
      else if (e.outcome === 'stringTooShort') push('stringTooShort')
      else if (e.outcome === 'canisterHitsFloor' || e.outcome === 'canisterHitsFloorCartStops') push('stringTooLong')
      else if (e.outcome === 'receiverBlocks') push('receiverBlocks')
      else if (e.outcome === 'neverStarts') push('neverStarts')
      if (p.tilt_rad !== null && !p.levelled) push('notLevel')
      if (p.massesIn.bench > 0) push('massTaken', { n: p.massesIn.bench })
      const f = app.lastForceReading()
      if (f === null) push('forceMissing')
      else if (f.massesInCanister !== app.massesInCanister()) push('forceStale', { n: app.massesInCanister() })
      if (p.mtRecorded_kg === null && p.runsCount >= 3) push('noMt')
      break
    }
    case 'massMoved':
      if (e.to === 'bench') push('massTaken', { n: app.procedure().massesIn.bench })
      break
    case 'refused':
      if (e.action === 'placeCart' && e.reason === 'cartOffRail') push('cartOffTrack')
      break
    case 'markPlaced': {
      const p = app.procedure()
      if (p.marksPlaced && !p.distanceOk) push('distanceOff', { cm: Math.round((p.distance_m ?? 0) * 1000) / 10 })
      break
    }
    case 'recorded':
      if (e.value_s < TIME_PLAUSIBLE_MIN_s || e.value_s > TIME_PLAUSIBLE_MAX_s) push('timeImplausible', { t: Math.round(e.value_s * 100) / 100 })
      break
    default:
      break
  }
  return out
}

export { CoachGate, DEFAULT_GATE, type GateConfig } from '../../../core/pedagogy/coach.ts'

/** Subscribe to the apparatus and call onNudge with the nudges that pass the gate. Returns the unsubscribe function. */
export function trackCoach(app: Apparatus, gate: CoachGate<CoachKey>, now: () => number, onNudge: (n: Nudge) => void): () => void {
  return trackCoreCoach(app, (e: ApparatusEvent) => (e.type === 'loaded' || e.type === 'presetApplied' ? [] : coachCandidates(app, e)), gate, now, onNudge)
}

export const COACH_DEF: CoachDef<Apparatus, ApparatusEvent, CoachKey> = { strings, candidates: coachCandidates }

export function mountCoach(ctx: ViewContext): { relabel(): void; clear(): void; destroy(): void } { return mountCoreCoach(ctx, COACH_DEF) }
