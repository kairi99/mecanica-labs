// Parabolic coach rules: which nudges an apparatus event deserves. Pure and DOM-free; the rate limiter and the toast are in
// core/pedagogy. Every rule reads apparatus state or run results (no view state) and mirrors a caution of the guide
// (2.3.2 / 2.3.3) or a typical slip: rise, gap, marks, paper under the landing, edge projection, timing at the edge, range
// from the edge, paper not moved, launch height.
import {
  GAP_TARGET_m, GAP_TOLERANCE_m, MARK_UPPER_HALF_FROM_m, TABLE_REPS, type ApparatusEvent, type BallId, type ParabolicApparatus,
} from '../apparatus/index.ts'
import { CoachGate, trackCoach as trackCoreCoach, type Nudge as CoreNudge } from '../../../core/pedagogy/coach.ts'
import { mountCoach as mountCoreCoach, type CoachDef } from '../../../core/pedagogy/coachView.ts'
import type { ViewContext } from '../views/view.ts'
import { strings } from './strings/coach.ts'
import { FLIGHT_EXPECTED_s, READING_FAR_s, START_EARLY_s, START_LATE_s, stopTiming } from './timing.ts'

export const COACH_KEYS = [
  'marksLowerHalf', 'noCarbon', 'paperMoved', 'riseOff', 'gapSmall', 'gapLarge', 'noEdgeProjection', 'offPaper', 'tooFaint',
  'hopsAtEdge', 'railBeyondEdge', 'tipLiftedDrop', 'startedAtRelease', 'startedLate', 'timeFar', 'rangeFromTip', 'wrongBallTime', 'wrongMarkTime', 'wrongBallRange', 'wrongMarkRange', 'launchHeightMissing',
] as const
export type CoachKey = (typeof COACH_KEYS)[number]
export type Nudge = CoreNudge<CoachKey>

/** A mid-hop launch is worth a hint when it leaves more than this far off the horizontal, degrees. */
export const COACH_TILT_MIN_deg = 8

/** A gap below this (cm) is called "very short": the ball can reach the edge before it settles into rolling. */
export const GAP_SMALL_m = GAP_TARGET_m - GAP_TOLERANCE_m
/** A typed range counts as "from the rail tip" when it is within this of (true range + gap) and not of any true range, m. */
export const TIP_MATCH_m = 0.02

/**
 * Does a typed range look like it was measured from the rail tip instead of the edge projection? It compares the value with the
 * true landing distances of this ball's carbon marks: it matches (true + gap) but none of the true ones. Pure.
 */
export function rangeLooksFromTip(app: ParabolicApparatus, ball: BallId, typed_m: number): boolean {
  const gap = app.getState().gap_mm / 1000
  const trues = app.paperMarks().filter((m) => m.ball === ball).map((m) => app.markOnFloor(m.id)?.x_m).filter((x): x is number => x !== undefined)
  if (trues.length === 0 || gap < 0.01) return false
  const near = (a: number, b: number): boolean => Math.abs(a - b) <= TIP_MATCH_m
  return trues.some((x) => near(typed_m, x + gap)) && !trues.some((x) => near(typed_m, x))
}

/** Nudges (in priority order) that an apparatus event deserves. Callers apply the rate limit. */
export function coachCandidates(app: ParabolicApparatus, e: ApparatusEvent): Nudge[] {
  const out: Nudge[] = []
  const push = (key: CoachKey, params: Nudge['params'] = {}): void => { out.push({ key, params }) }
  switch (e.type) {
    case 'markPlaced': case 'markMoved':
      if (e.s_m < MARK_UPPER_HALF_FROM_m - 1e-9) push('marksLowerHalf')
      break
    case 'released': {
      const p = app.procedure()
      const gap_m = app.getState().gap_mm / 1000
      if (!p.carbonOverBond) push('noCarbon')
      if (app.getState().geometry && !p.riseOk) push('riseOff')
      if (p.gapOk === false && app.getState().items.rail) {
        if (gap_m > GAP_TARGET_m) push('gapLarge', { cm: Math.round(gap_m * 100) })
        else if (gap_m >= 0) push('gapSmall', { cm: Math.round(gap_m * 100) })
      }
      // how the ball is going to leave the table: three set-ups that make the launch diagonal (the run is already computed at release)
      if (app.getState().items.rail) {
        const run = e.type === 'released' ? app.getRun(e.runId) : null
        if (gap_m < 0) push('railBeyondEdge', { cm: Math.round(-gap_m * 100) })
        else if (p.tipLifted) push('tipLiftedDrop')
        else if (!out.some((n) => n.key === 'gapSmall' || n.key === 'gapLarge') && run?.launch && run.launch.midHop && Math.abs(run.launch.angle_rad) > (COACH_TILT_MIN_deg * Math.PI) / 180) push('hopsAtEdge', { deg: Math.round(Math.abs(run.launch.angle_rad) * 180 / Math.PI) })
      }
      if (!p.edgeProjectionPlaced) push('noEdgeProjection')
      break
    }
    case 'bondPlaced':
      if (e.moved && app.procedure().paperMovedSinceMarks) push('paperMoved')
      break
    case 'ballLanded':
      if (e.mark === 'offPaper' || e.mark === 'noCarbon' || e.mark === 'noBond') push('offPaper')
      else if (e.mark === 'tooFaint') push('tooFaint')
      break
    case 'refused':
      if (e.action === 'tapeMeasure' && e.reason === 'noEdgeProjection') push('noEdgeProjection')
      break
    case 'stopwatchStop': {
      const stop = app.stopLog().find((s) => s.id === e.stopId)
      if (!stop || stop.runId === null) break
      const t = stopTiming(stop)
      if (t.startError_s !== null) {
        if (t.startError_s < -START_EARLY_s) push('startedAtRelease', { s: Math.round(-t.startError_s * 10) / 10 })
        else if (t.startError_s > START_LATE_s) push('startedLate', { s: Math.round(t.startError_s * 10) / 10 })
      }
      break
    }
    case 'recorded': {
      if (e.column === 'time' && Math.abs(e.value - FLIGHT_EXPECTED_s) > READING_FAR_s) push('timeFar', { t: Math.round(e.value * 100) / 100 })
      if (e.column === 'range' && e.source === 'typed' && rangeLooksFromTip(app, e.ball, e.value)) push('rangeFromTip', { cm: Math.round((app.getState().gap_mm / 10)) })
      if (e.source === 'copied' && e.runId !== null) {
        // Copying stays permissive (the student places the ball by hand), but a value from another ball or mark is worth a word.
        const run = app.getRun(e.runId)
        const cell = e.column === 'time' ? 'Time' : 'Range'
        if (run && run.ball !== e.ball) push(`wrongBall${cell}`, { ball: run.ball })
        else if (run && run.markId !== null) {
          const rank = [...app.getMarks()].sort((a, b) => a.s_m - b.s_m).findIndex((m) => m.id === run.markId)
          if (rank >= 0 && rank !== e.trial) push(`wrongMark${cell}`, { m: rank + 1, n: e.trial + 1 })
        }
      }
      const p = app.procedure()
      if (!p.measured.launchHeight && p.tableFilled.marble + p.tableFilled.pingpong >= 2 * TABLE_REPS) push('launchHeightMissing')
      break
    }
    default:
      break
  }
  return out
}

export { CoachGate, DEFAULT_GATE, type GateConfig } from '../../../core/pedagogy/coach.ts'

/** Subscribe to the apparatus and call onNudge with the nudges that pass the gate. Returns the unsubscribe function. */
export function trackCoach(app: ParabolicApparatus, gate: CoachGate<CoachKey>, now: () => number, onNudge: (n: Nudge) => void): () => void {
  return trackCoreCoach(app, (e: ApparatusEvent) => (e.type === 'loaded' || e.type === 'presetApplied' ? [] : coachCandidates(app, e)), gate, now, onNudge)
}

export const COACH_DEF: CoachDef<ParabolicApparatus, ApparatusEvent, CoachKey> = {
  strings, candidates: coachCandidates,
  // The ball id in a nudge becomes the localised ball name.
  localise: (params, lang) => (typeof params.ball === 'string' ? { ...params, ball: strings[lang].balls[params.ball as BallId] } : params),
}

export function mountCoach(ctx: ViewContext): { relabel(): void; destroy(): void } { return mountCoreCoach(ctx, COACH_DEF) }
