// What a stopwatch stop says about how the student timed the flight. Pure and DOM-free; used by the checklist and the coach.
// The true edge and landing instants come from the stop record (the model's event times); the student never sees them.
import type { StopRecord } from '../apparatus/index.ts'

/** Expected flight time for a table of 0.74 to 0.78 m, s (sqrt(2H/g), 0.388 to 0.399): the rough yardstick of the coach. */
export const FLIGHT_EXPECTED_s = 0.39
/** A start press this much before the ball passes the edge counts as "started at the release" (the roll is included), s. */
export const START_EARLY_s = 0.3
/** A start press this much after the edge misses a good part of the flight, s. */
export const START_LATE_s = 0.45
/** A reading farther than this from the expected flight time is implausible for a stopwatch used at the edge, s. */
export const READING_FAR_s = 0.3

export interface StopTiming {
  /** Start press minus the true edge crossing, s (negative: before the ball reached the edge). Null without a flying run. */
  startError_s: number | null
  /** Stop press minus the true landing, s. */
  stopError_s: number | null
}

export function stopTiming(stop: StopRecord): StopTiming {
  const edge = stop.crossings.find((c) => c.event === 'edge')?.trueTime_s ?? null
  const land = stop.crossings.find((c) => c.event === 'landing')?.trueTime_s ?? null
  return {
    startError_s: edge !== null && stop.startOffset_s !== null ? stop.startOffset_s - edge : null,
    stopError_s: land !== null && stop.stopOffset_s !== null ? stop.stopOffset_s - land : null,
  }
}

/** The student timed from (near) the edge to (near) the landing. */
export function timedEdgeToFloor(stop: StopRecord): boolean {
  const t = stopTiming(stop)
  return t.startError_s !== null && t.stopError_s !== null && Math.abs(t.startError_s) <= START_EARLY_s && Math.abs(t.stopError_s) <= 0.6
}
