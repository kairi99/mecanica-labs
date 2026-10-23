// Virtual stopwatch driven by the student's own presses. Pure and timer-free: every call receives the timestamp of the
// press (ms, same clock as event.timeStamp). The display is the elapsed time floored to the instrument resolution.
import { STOPWATCH_RESOLUTION_s } from '../physics/instruments.ts'

/** Plain state of the watch; saved as is in an apparatus snapshot. */
export interface StopwatchSnapshot {
  running: boolean
  linkStartToRelease: boolean
  accumulated_ms: number
  runningSince_ms: number | null
  firstStart_ms: number | null
  lastStopId: number | null
}

/** One stop press. `C` is the experiment's record of what a perfect timer would have shown (for example mark crossings). */
export interface StopRecord<C = unknown> {
  id: number
  /** Run current at the stop (last released), or null. */
  runId: number | null
  /** Table row (0..9) the student was timing, if said. */
  markTarget: number | null
  /** Display at the stop, s (floor to the resolution). */
  reading_s: number
  startTime_ms: number
  stopTime_ms: number
  /** Stopwatch first start minus release, s (positive: late). null without a run. */
  startOffset_s: number | null
  stopOffset_s: number | null
  /** True event times of the run (what a perfect timer would show). */
  crossings: C[]
}

/** The run that is current at a stop press: its id, release time and the true event records to attach. */
export interface StopRun<C> {
  runId: number
  releaseTime_ms: number
  crossings: readonly C[]
}

const fresh = (link = false): StopwatchSnapshot => ({
  running: false, linkStartToRelease: link, accumulated_ms: 0, runningSince_ms: null, firstStart_ms: null, lastStopId: null,
})

export class Stopwatch<C extends object = object> {
  private s: StopwatchSnapshot = fresh()
  private log: StopRecord<C>[] = []
  private readonly resolution_s: number
  constructor(resolution_s: number = STOPWATCH_RESOLUTION_s) { this.resolution_s = resolution_s }

  get running(): boolean { return this.s.running }
  get linkStartToRelease(): boolean { return this.s.linkStartToRelease }
  setLinkStartToRelease(on: boolean): void { this.s.linkStartToRelease = on }

  /** Elapsed time shown by the watch, ms (frozen while stopped). */
  elapsed_ms(t_ms: number): number {
    const s = this.s
    return s.accumulated_ms + (s.running && s.runningSince_ms !== null ? Math.max(0, t_ms - s.runningSince_ms) : 0)
  }
  /** Display in s: elapsed floored to the resolution (a real stopwatch truncates). */
  display_s(t_ms: number): number {
    const cs = Math.floor(this.elapsed_ms(t_ms) / (this.resolution_s * 1000) + 1e-9)
    return Math.round(cs * this.resolution_s * 1e6) / 1e6
  }

  /** Start at t_ms. The first start since the last reset is remembered (it is what the student's reaction is judged on). */
  start(t_ms: number): void {
    this.s.running = true
    this.s.runningSince_ms = t_ms
    if (this.s.firstStart_ms === null) this.s.firstStart_ms = t_ms
  }
  /** Stop at t_ms and log the press. `run`: the run current at the stop (null: none), `markTarget`: table row being timed. */
  stop(t_ms: number, run: StopRun<C> | null, markTarget: number | null = null): StopRecord<C> {
    const total = this.elapsed_ms(t_ms)
    const first = this.s.firstStart_ms!
    this.s.accumulated_ms = total
    this.s.running = false
    this.s.runningSince_ms = null
    const stop: StopRecord<C> = {
      id: this.log.length + 1, runId: run ? run.runId : null, markTarget,
      reading_s: this.display_s(t_ms), startTime_ms: first, stopTime_ms: t_ms,
      startOffset_s: run ? (first - run.releaseTime_ms) / 1000 : null,
      stopOffset_s: run ? (t_ms - run.releaseTime_ms) / 1000 : null,
      crossings: run ? run.crossings.map((m) => ({ ...m })) : [],
    }
    this.log.push(stop)
    this.s.lastStopId = stop.id
    return stop
  }
  /** Zero the display and forget the first start; the stop log and the link setting stay. */
  reset(): void { this.s = fresh(this.s.linkStartToRelease) }

  stops(): readonly StopRecord<C>[] { return this.log }
  /** The stop that the display currently shows (undefined before the first stop or after a reset). */
  lastStop(): StopRecord<C> | undefined { return this.log.find((x) => x.id === this.s.lastStopId) }

  /** Back to a pristine watch: zeroed, unlinked, empty log. */
  clear(): void { this.s = fresh(); this.log = [] }
  /** The watch state and the stop log, for a snapshot (the caller clones). */
  snapshot(): { state: StopwatchSnapshot; stops: StopRecord<C>[] } { return { state: this.s, stops: this.log } }
  load(state: StopwatchSnapshot, stops: StopRecord<C>[]): void { this.s = state; this.log = stops }
}
