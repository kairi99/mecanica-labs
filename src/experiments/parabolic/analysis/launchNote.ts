// What the run records say about HOW the balls left the table edge. Pure; used for a neutral note in the analysis panel (the guide's
// expected time t = sqrt(2H/g) is for a horizontal launch; the note says when a launch was not, and never answers the guide's questions).
import type { RunRecord } from '../apparatus/index.ts'

/** A launch counts as not horizontal when the velocity at the edge is more than this angle off the horizontal, degrees. */
export const TILT_NOTE_MIN_deg = 1

export interface LaunchSummary {
  /** Runs that flew. */
  n: number
  /** Runs launched more than TILT_NOTE_MIN_deg off the horizontal. */
  nTilted: number
  /** Smallest and largest launch angle among those that flew, degrees (negative = downward). Null with no flight. */
  minAngle_deg: number | null
  maxAngle_deg: number | null
  /** Runs with at least one bounce between the rail end and the edge. */
  nBounced: number
  /** Runs whose ball crossed the edge while still on the rail or the shoe (rail end beyond the edge). */
  nOverRail: number
}

export function summariseLaunches(runs: readonly Pick<RunRecord, 'launch' | 'flight' | 'tableHops'>[]): LaunchSummary {
  const flown = runs.filter((r) => r.flight && r.launch)
  const angles = flown.map((r) => (r.launch!.angle_rad * 180) / Math.PI)
  return {
    n: flown.length,
    nTilted: angles.filter((a) => Math.abs(a) > TILT_NOTE_MIN_deg).length,
    minAngle_deg: angles.length ? Math.min(...angles) : null,
    maxAngle_deg: angles.length ? Math.max(...angles) : null,
    nBounced: flown.filter((r) => r.tableHops > 0).length,
    nOverRail: flown.filter((r) => r.launch!.onRail).length,
  }
}
