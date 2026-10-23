// Coach mechanism: gentle, rate-limited nudges that react to apparatus events. Pure and DOM-free (coachView.ts shows them).
// The experiment decides which nudges an event deserves (experiments/<id>/pedagogy/coach.ts); this file only limits their rate.

export interface Nudge<K extends string = string> { key: K; params: Record<string, string | number> }

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
export class CoachGate<K extends string = string> {
  private lastAny = -Infinity
  private lastKey = new Map<K, number>()
  private muted = new Map<K, number>()
  private readonly cfg: GateConfig
  constructor(cfg: GateConfig = DEFAULT_GATE) { this.cfg = cfg }
  /** The first candidate that may be shown now (and mark it shown), or null. */
  offer(cands: readonly Nudge<K>[], now_ms: number): Nudge<K> | null {
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
  dismiss(key: K, now_ms: number): void { this.muted.set(key, now_ms) }
  reset(): void { this.lastAny = -Infinity; this.lastKey.clear(); this.muted.clear() }
}

/** Anything that announces events to listeners (the apparatus). */
export interface EventSource<E> { on(listener: (e: E) => void): () => void }

/**
 * Subscribe to the source and call onNudge with the nudges that pass the gate. `candidates` maps an event to the
 * nudges it deserves (in priority order), or to nothing for events that are never coached. Returns the unsubscribe function.
 */
export function trackCoach<E, K extends string>(
  source: EventSource<E>, candidates: (e: E) => readonly Nudge<K>[], gate: CoachGate<K>, now: () => number, onNudge: (n: Nudge<K>) => void,
): () => void {
  return source.on((e) => {
    const n = gate.offer(candidates(e), now())
    if (n) onNudge(n)
  })
}
