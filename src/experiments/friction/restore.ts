// Restoring a saved snapshot on a new page load. Timestamps in a snapshot are on the clock of the page that saved it
// (performance.now()), which restarts at 0 on every load. Rebase them so everything saved lies in the past of the new clock: a pull or a
// crank trial still in flight counts as ended, and a stopwatch that was running is zeroed. Pure: no DOM, no storage.
import type { ApparatusSnapshot } from './apparatus/index.ts'

export function rebaseSnapshotTime(s: ApparatusSnapshot): ApparatusSnapshot {
  const c = structuredClone(s)
  const lastPull = Math.max(0, ...c.pullRuns.map((r) => r.start_ms + 1000 * (r.commands[r.commands.length - 1]?.t_s ?? 0)))
  const offset = Math.max(0, c.clock_ms, lastPull, ...c.trials.map((t) => t.start_ms))
  const shift = (t: number): number => t - offset
  c.clock_ms = shift(c.clock_ms)
  for (const r of c.pullRuns) { r.start_ms = shift(r.start_ms); if (r.end_ms !== null) r.end_ms = shift(r.end_ms) }
  for (const t of c.trials) { t.start_ms = shift(t.start_ms); if (t.end_ms !== null) t.end_ms = shift(t.end_ms) }
  // a pull or a trial in flight when the page closed is over now
  if (c.activePull !== null) {
    const r = c.pullRuns.find((x) => x.id === c.activePull)
    if (r) r.end_ms = Math.max(r.start_ms, c.clock_ms)
    c.activePull = null
  }
  if (c.activeTrial !== null) {
    const t = c.trials.find((x) => x.id === c.activeTrial)
    if (t) t.end_ms = Math.max(t.start_ms, c.clock_ms)
    c.activeTrial = null
    c.rackH_m = 0
  }
  for (const st of c.stops) { st.startTime_ms = shift(st.startTime_ms); st.stopTime_ms = shift(st.stopTime_ms) }
  for (const e of c.events) if (e.t_ms !== null) e.t_ms = shift(e.t_ms)
  const sw = c.stopwatch
  if (sw.running) c.stopwatch = { running: false, linkStartToRelease: sw.linkStartToRelease, accumulated_ms: 0, runningSince_ms: null, firstStart_ms: null, lastStopId: null }
  else c.stopwatch = { ...sw, runningSince_ms: null, firstStart_ms: sw.firstStart_ms === null ? null : shift(sw.firstStart_ms) }
  return c
}
