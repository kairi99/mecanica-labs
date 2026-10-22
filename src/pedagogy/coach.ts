// Coach: gentle, rate-limited nudges that react to apparatus events. Pure and DOM-free (coachView.ts shows them).
// The rules mirror the guide's cautions (cart off the track, levelling before raising, 0 cm at A, timing procedure) and typical slips.
import type { Apparatus, ApparatusEvent } from '../apparatus/index.ts'
import { TABLE_POSITIONS_cm } from '../apparatus/index.ts'

export const COACH_KEYS = [
  'cartOffRail', 'noReceiver', 'scaleReversed', 'raisedBeforeLevel', 'angleOff', 'cartNotAtZero', 'noMarks',
  'startLate', 'startEarly', 'wrongMark', 'implausible', 'emptyCopy',
] as const
export type CoachKey = (typeof COACH_KEYS)[number]

/** Start press later than this after the release, s: the early part of the fall is missed. */
export const START_LATE_s = 0.5
/** Start press earlier than this before the release, s (negative offset): the wait is included in the reading. */
export const START_EARLY_s = 0.3
/** A stop press counts as "for a mark" from this much before to this much after its crossing, s (reaction window). */
export const MARK_WINDOW_BEFORE_s = 0.1
export const MARK_WINDOW_AFTER_s = 0.6

export interface Nudge { key: CoachKey; params: Record<string, string | number> }

function implausibleCell(app: Apparatus, row: number, col: number): boolean {
  if (row < 1) return false
  const vals = app.tableData().values_s
  const v = vals[row]?.[col]
  if (v === null || v === undefined) return false
  const others = (vals[row] ?? []).filter((x, j): x is number => x !== null && j !== col)
  if (others.length >= 3) {
    const m = others.reduce((a, b) => a + b, 0) / others.length
    const sd = Math.sqrt(others.reduce((a, b) => a + (b - m) ** 2, 0) / (others.length - 1))
    if (Math.abs(v - m) > Math.max(4 * sd, 0.4)) return true
  }
  // A further mark cannot be reached before a nearer one: compare with the means of the neighbouring rows.
  const mean = (r: number): number | null => {
    const xs = (vals[r] ?? []).filter((x): x is number => x !== null)
    return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null
  }
  const prev = row > 1 ? mean(row - 1) : null
  const next = row < vals.length - 1 ? mean(row + 1) : null
  if (prev !== null && v < prev - 0.2) return true
  if (next !== null && v > next + 0.2) return true
  return false
}

/** Nudges (in priority order) that an apparatus event deserves. Callers apply the rate limit. */
export function coachCandidates(app: Apparatus, e: ApparatusEvent): Nudge[] {
  const out: Nudge[] = []
  const push = (key: CoachKey, params: Nudge['params'] = {}): void => { out.push({ key, params }) }
  switch (e.type) {
    case 'refused':
      if (e.reason === 'cartOffRail') push('cartOffRail')
      if (e.action === 'releaseCart' && app.canRun().reasons.includes('noReceiver')) push('noReceiver')
      if (e.action === 'tableCopyDisplay' && e.reason === 'noStopwatchReading') push('emptyCopy')
      break
    case 'attached':
      if (e.joint === 'rackClamp' && app.procedure().scaleZeroAtHighEnd === false) push('scaleReversed')
      break
    case 'heightSet':
      if (e.which === 'rack' && e.value_mm > 0 && !app.procedure().levelledBeforeRaise) push('raisedBeforeLevel')
      break
    case 'released': {
      const p = app.procedure()
      if (p.scaleZeroAtHighEnd === false) push('scaleReversed')
      if (p.theta_rad !== null && !p.angleOk) push('angleOff')
      if (p.marks.count === 0) push('noMarks')
      else if (!p.cart.atZero) push('cartNotAtZero')
      break
    }
    case 'stopwatchStop': {
      const stop = app.stopLog().find((s) => s.id === e.stopId)
      if (!stop || stop.runId === null) break
      if (stop.startOffset_s !== null) {
        if (stop.startOffset_s > START_LATE_s) push('startLate', { s: Math.round(stop.startOffset_s * 10) / 10 })
        else if (stop.startOffset_s < -START_EARLY_s) push('startEarly', { s: Math.round(-stop.startOffset_s * 10) / 10 })
      }
      const r = stop.markTarget
      if (r !== null && stop.stopOffset_s !== null) {
        const t = stop.stopOffset_s
        const inWindow = (k: number): boolean => {
          const tk = stop.crossings[k]?.trueTime_s
          return tk !== null && tk !== undefined && t >= tk - MARK_WINDOW_BEFORE_s && t <= tk + MARK_WINDOW_AFTER_s
        }
        if (!inWindow(r)) {
          const k = stop.crossings.findIndex((_, i) => i >= 1 && i !== r && inWindow(i))
          if (k > 0) push('wrongMark', { target: TABLE_POSITIONS_cm[r] ?? r * 10, other: TABLE_POSITIONS_cm[k] ?? k * 10 })
        }
      }
      break
    }
    case 'recorded':
      if (implausibleCell(app, e.row, e.col)) push('implausible', { x: TABLE_POSITIONS_cm[e.row] ?? e.row * 10, t: e.value_s })
      if (e.source === 'copied' && e.value_s === 0) push('emptyCopy')
      break
    default:
      break
  }
  return out
}

export interface GateConfig {
  /** Minimum time between any two nudges, ms. */
  gap_ms: number
  /** Minimum time before the same nudge may repeat, ms. */
  repeat_ms: number
  /** How long a dismissed nudge stays silent, ms. */
  dismissed_ms: number
}
export const DEFAULT_GATE: GateConfig = { gap_ms: 4000, repeat_ms: 45000, dismissed_ms: 300000 }

/** Rate limiter with an injected clock. */
export class CoachGate {
  private lastAny = -Infinity
  private lastKey = new Map<CoachKey, number>()
  private muted = new Map<CoachKey, number>()
  private readonly cfg: GateConfig
  constructor(cfg: GateConfig = DEFAULT_GATE) { this.cfg = cfg }
  /** The first candidate that may be shown now (and mark it shown), or null. */
  offer(cands: readonly Nudge[], now_ms: number): Nudge | null {
    if (now_ms - this.lastAny < this.cfg.gap_ms) return null
    for (const n of cands) {
      if (now_ms - (this.lastKey.get(n.key) ?? -Infinity) < this.cfg.repeat_ms) continue
      if (now_ms - (this.muted.get(n.key) ?? -Infinity) < this.cfg.dismissed_ms) continue
      this.lastAny = now_ms
      this.lastKey.set(n.key, now_ms)
      return n
    }
    return null
  }
  dismiss(key: CoachKey, now_ms: number): void { this.muted.set(key, now_ms) }
  reset(): void { this.lastAny = -Infinity; this.lastKey.clear(); this.muted.clear() }
}

/** Subscribe to the apparatus and call onNudge with the nudges that pass the gate. Returns the unsubscribe function. */
export function trackCoach(app: Apparatus, gate: CoachGate, now: () => number, onNudge: (n: Nudge) => void): () => void {
  return app.on((e) => {
    if (e.type === 'loaded' || e.type === 'presetApplied') return
    const n = gate.offer(coachCandidates(app, e), now())
    if (n) onNudge(n)
  })
}
