// Restoring a saved snapshot on a new page load. Timestamps in a snapshot are on the clock of the page that saved it
// (performance.now()), which starts again at 0 on every load. Rebase them so everything saved lies in the past of the new clock:
// a run still in flight when the page closed counts as finished, the carbon marks of past runs are visible, and a stopwatch that was
// running is zeroed (it cannot keep counting across a reload). Pure: no DOM, no storage.
import type { ApparatusSnapshot } from './apparatus/index.ts'

export function rebaseSnapshotTime(s: ApparatusSnapshot): ApparatusSnapshot {
  const c = structuredClone(s)
  const offset = Math.max(0, c.clock_ms, ...c.runs.map((r) => r.releaseTime_ms + r.times.end_s * 1000))
  const shift = (t: number): number => t - offset
  c.clock_ms = shift(c.clock_ms)
  for (const r of c.runs) r.releaseTime_ms = shift(r.releaseTime_ms)
  for (const m of c.paper.marks) m.visibleFrom_ms = shift(m.visibleFrom_ms)
  for (const st of c.stops) { st.startTime_ms = shift(st.startTime_ms); st.stopTime_ms = shift(st.stopTime_ms) }
  for (const e of c.events) if (e.t_ms !== null) e.t_ms = shift(e.t_ms)
  const sw = c.stopwatch
  if (sw.running) c.stopwatch = { running: false, linkStartToRelease: sw.linkStartToRelease, accumulated_ms: 0, runningSince_ms: null, firstStart_ms: null, lastStopId: null }
  else c.stopwatch = { ...sw, runningSince_ms: null, firstStart_ms: sw.firstStart_ms === null ? null : shift(sw.firstStart_ms) }
  return c
}
