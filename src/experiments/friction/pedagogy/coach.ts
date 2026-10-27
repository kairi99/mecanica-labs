// Friction coach rules: which nudges an apparatus event deserves. Pure and DOM-free; the rate limiter and the toast are in core/pedagogy.
// Every rule reads apparatus state or run results (no view state) and mirrors a caution of the guide or a typical slip: paper not fixed,
// scale not zeroed horizontally, 1 N scale at its stop, reading too late after the breakaway, jerky or too slow pulls (stick-slip), crank not
// stopped at the onset, tape reading while cranking, implausible values.
import { FACE_ORDER, MASS_STEPS, type ApparatusEvent, type FrictionApparatus } from '../apparatus/index.ts'
import { CoachGate, trackCoach as trackCoreCoach, type Nudge as CoreNudge } from '../../../core/pedagogy/coach.ts'
import { mountCoach as mountCoreCoach, type CoachDef } from '../../../core/pedagogy/coachView.ts'
import type { ViewContext } from '../views/view.ts'
import { strings } from './strings/coach.ts'

export const COACH_KEYS = [
  'paperLoose', 'zeroMissing', 'massMissing', 'overRange', 'lateRead', 'stickSlip', 'offPaper', 'wrongSetup',
  'crankLate', 'crankNotStopped', 'heightWhileRaising', 'startedEarly', 'startedLate', 'implausibleForce', 'implausibleHeight', 'implausibleTime',
] as const
export type CoachKey = (typeof COACH_KEYS)[number]
export type Nudge = CoreNudge<CoachKey>

/** Speed (m/s) below which a pull is "slow": the exp. 2 style, where the reading after the breakaway is a late one. */
export const SLOW_PULL_mps = 0.015
/** Delay after the breakaway (s) beyond which a press catches the dropped force. */
export const LATE_READ_s = 0.15
/** The crank counts as stopped late when it runs this long (s) after the bar began to slide. */
export const CRANK_LATE_s = 0.5
/** Press of the stopwatch start this far before (s) or after the slip counts as early / late. */
export const START_EARLY_s = 0.2
export const START_LATE_s = 0.6
/** Plausibility bounds of typed values. */
export const FORCE_MAX_PLAUSIBLE_N = 2.05
export const HEIGHT_MAX_PLAUSIBLE_m = 0.75
export const TIME_MIN_PLAUSIBLE_s = 0.4
export const TIME_MAX_PLAUSIBLE_s = 6

/** Nudges (in priority order) that an apparatus event deserves. Callers apply the rate limit. */
export function coachCandidates(app: FrictionApparatus, e: ApparatusEvent): Nudge[] {
  const out: Nudge[] = []
  const push = (key: CoachKey, params: Nudge['params'] = {}): void => { out.push({ key, params }) }
  const s = app.getState()
  switch (e.type) {
    case 'pullStarted': {
      if (s.paper !== 'fixed') push('paperLoose')
      if (s.scale !== null && !s.zeroed[s.scale]) push('zeroMissing')
      if (s.measuredBlock_kg === null) push('massMissing')
      break
    }
    case 'read': {
      const run = app.getPullRuns().find((r) => r.id === e.runId)
      if (e.overRange) push('overRange')
      if (run && !run.setup.scaleZeroed) push('zeroMissing')
      const ref = run ? app.referencePull(run.id) : null
      const tb = ref?.summary.breakaway_t_s ?? null
      const first = run?.commands[0]?.speed_mps ?? 1
      if (ref && tb !== null && ref.summary.F_breakaway_N !== null && first <= SLOW_PULL_mps) {
        const last = app.lastScaleReading()
        if (last && last.t_s - tb > LATE_READ_s && last.value_N < 0.9 * ref.summary.F_breakaway_N) push('lateRead', { s: Math.round((last.t_s - tb) * 10) / 10 })
      }
      break
    }
    case 'pullEnded': {
      const run = app.getPullRuns().find((r) => r.id === e.runId)
      const ref = run ? app.referencePull(run.id) : null
      if (ref && ref.summary.restickCount >= 2) push('stickSlip', { n: ref.summary.restickCount })
      break
    }
    case 'offPaper': push('offPaper'); break
    case 'recorded': {
      if (e.table !== '4.3') {
        const cells = e.table === '4.1' ? app.tableData().t41 : app.tableData().t42
        const cell = cells[e.row]?.[e.col]
        if (e.value > FORCE_MAX_PLAUSIBLE_N) push('implausibleForce', { f: e.value })
        else if (cell?.setup) {
          const face = FACE_ORDER[e.table === '4.1' ? Math.floor(e.row / MASS_STEPS) : e.row]
          const masses = e.table === '4.1' ? e.row % MASS_STEPS : 0
          if (cell.setup.face !== face || cell.setup.addedMasses !== masses) push('wrongSetup', { row: e.row + 1 })
        }
      } else if (e.col % 2 === 0) {
        if (e.value > HEIGHT_MAX_PLAUSIBLE_m) push('implausibleHeight', { h: e.value })
      } else if (e.value < TIME_MIN_PLAUSIBLE_s || e.value > TIME_MAX_PLAUSIBLE_s) push('implausibleTime', { t: e.value })
      break
    }
    case 'raiseRate': {
      if (e.rate_mps !== 0) break
      const tr = app.getTrials().find((t) => t.id === e.trialId)
      const onsetT = tr ? app.inclineOnset_s(tr.id) : null
      if (tr && onsetT !== null) {
        const stopAt = tr.segments[tr.segments.length - 1]!.t_s
        if (stopAt - onsetT > CRANK_LATE_s) push('crankLate', { s: Math.round((stopAt - onsetT) * 10) / 10 })
      }
      break
    }
    case 'barFinished': {
      const tr = app.getTrials().find((t) => t.id === e.trialId)
      if (tr && tr.segments[tr.segments.length - 1]!.rate_mps !== 0) push('crankNotStopped')
      break
    }
    case 'refused':
      if (e.action === 'measureHeight' && e.reason === 'stillRaising') push('heightWhileRaising')
      break
    case 'stopwatchStop': {
      const stop = app.stopLog().find((x) => x.id === e.stopId)
      if (stop && stop.startOffset_s !== null) {
        if (stop.startOffset_s < -START_EARLY_s) push('startedEarly', { s: Math.round(-stop.startOffset_s * 10) / 10 })
        else if (stop.startOffset_s > START_LATE_s) push('startedLate', { s: Math.round(stop.startOffset_s * 10) / 10 })
      }
      break
    }
    default:
      break
  }
  return out
}

export { CoachGate, DEFAULT_GATE, type GateConfig } from '../../../core/pedagogy/coach.ts'

/** Subscribe to the apparatus and call onNudge with the nudges that pass the gate. Returns the unsubscribe function. */
export function trackCoach(app: FrictionApparatus, gate: CoachGate<CoachKey>, now: () => number, onNudge: (n: Nudge) => void): () => void {
  return trackCoreCoach(app, (e: ApparatusEvent) => (e.type === 'loaded' || e.type === 'presetApplied' ? [] : coachCandidates(app, e)), gate, now, onNudge)
}

export const COACH_DEF: CoachDef<FrictionApparatus, ApparatusEvent, CoachKey> = { strings, candidates: coachCandidates }

export function mountCoach(ctx: ViewContext): { relabel(): void; clear(): void; destroy(): void } { return mountCoreCoach(ctx, COACH_DEF) }
