// Slow-motion reference: what a 240 fps video of one run gives a student. Pure functions over the run record and its
// stored trajectory. The frame times are quantised: the launch frame is the first frame at or after the ball passes the
// edge, the landing frame the first at or after first contact, so a flight time counted in frames is off by up to one frame.
import { SLOWMO_FPS_hz, SLOWMO_POST_FRAMES, SLOWMO_PRE_FRAMES } from './constants.ts'
import { GRAVITY_mps2, ballSpec, type TrajectoryPoint } from './model.ts'
import type { EventRecord, RunRecord, StopRecord } from './types.ts'

export interface SlowmoFrame {
  /** 0-based index within the clip. */
  index: number
  /** Time relative to the instant the ball passes the table edge, s (negative before). */
  t_s: number
  /** Ball centre: x from the table edge, height above the floor and lateral offset, m (tracker sub-pixel, no extra noise: ASSUMED). */
  x_m: number
  y_m: number
  z_m: number
}

export interface SlowmoClip {
  runId: number
  fps_hz: number
  frames: SlowmoFrame[]
  /** First frame at or after the ball passes the edge, and first frame at or after the first contact. */
  launchFrameIndex: number
  landingFrameIndex: number
  /** Truth, hidden from the student until the slow-mo reference is opened. */
  flightTrue_s: number
  vEdgeTrue_mps: number
  /** What the student gets from the video: flight time from the frame count, v0 from the two frames at launch. */
  flightFromFrames_s: number
  v0FromFrames_mps: number
  /** +- this is the frame quantisation of the times, s. */
  frameQuantisation_s: number
}

/** Position of the ball at t_s after leaving the edge, linear interpolation of the stored flight samples (clamped at the ends). */
export function flightPointAt(traj: readonly TrajectoryPoint[], t_s: number): TrajectoryPoint {
  const first = traj[0]!
  const last = traj[traj.length - 1]!
  if (t_s <= first.t_s) return first
  if (t_s >= last.t_s) return last
  let lo = 0
  let hi = traj.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (traj[mid]!.t_s <= t_s) lo = mid
    else hi = mid
  }
  const a = traj[lo]!
  const b = traj[hi]!
  const w = (t_s - a.t_s) / (b.t_s - a.t_s)
  const mix = (p: number, q: number): number => p + (q - p) * w
  return {
    t_s, x_m: mix(a.x_m, b.x_m), y_m: mix(a.y_m, b.y_m), z_m: mix(a.z_m, b.z_m),
    vx_mps: mix(a.vx_mps, b.vx_mps), vy_mps: mix(a.vy_mps, b.vy_mps), vz_mps: mix(a.vz_mps, b.vz_mps),
  }
}

/**
 * The clip of a landed run: frames from SLOWMO_PRE_FRAMES before the launch frame (the instant the ball crosses the table edge) to SLOWMO_POST_FRAMES after the landing
 * frame. The ball follows the stored whole path (shoe ramp, arc, hops on the table, flight), so the video shows the real launch angle; after the first contact it follows the first bounce (vertical speed e |vy|, horizontal speed kept; the
 * clip ends long before the second contact). Returns null for a run that did not fly.
 */
export function slowmoClip(run: RunRecord, path: readonly TrajectoryPoint[]): SlowmoClip | null {
  const fl = run.flight
  if (!fl || path.length < 2 || !run.bounce) return null
  const dt = 1 / SLOWMO_FPS_hz
  const R = ballSpec(run.ball).R_m
  const g = GRAVITY_mps2
  const edgeOff = (run.times.edge_s ?? 0) - (run.times.tip_s ?? 0)
  const phase = run.videoPhase
  const kLand = Math.ceil(fl.t_flight_s / dt - phase)
  const frames: SlowmoFrame[] = []
  for (let k = -SLOWMO_PRE_FRAMES; k <= kLand + SLOWMO_POST_FRAMES; k++) {
    const t = (k + phase) * dt
    let x: number, y: number, z: number
    if (t <= fl.t_flight_s) {
      // the stored whole path (shoe, table hops, flight), t measured from the edge crossing; before the first sample the ball sits at the rail end
      const p = flightPointAt(path, t + edgeOff)
      x = p.x_m; y = p.y_m; z = p.z_m
    } else {
      const tau = t - fl.t_flight_s
      x = fl.x_land_m + fl.vx_impact_mps * tau
      z = fl.z_land_m + fl.vz_impact_mps * tau
      y = Math.max(R, R + run.bounce.vUp_mps * tau - 0.5 * g * tau * tau)
    }
    frames.push({ index: k + SLOWMO_PRE_FRAMES, t_s: t, x_m: x, y_m: y, z_m: z })
  }
  const launchIdx = SLOWMO_PRE_FRAMES
  const landIdx = kLand + SLOWMO_PRE_FRAMES
  const f0 = frames[launchIdx]!
  const f1 = frames[launchIdx + 1]!
  return {
    runId: run.id, fps_hz: SLOWMO_FPS_hz, frames, launchFrameIndex: launchIdx, landingFrameIndex: landIdx,
    flightTrue_s: fl.t_flight_s, vEdgeTrue_mps: run.v_edge_mps,
    flightFromFrames_s: (landIdx - launchIdx) * dt, v0FromFrames_mps: (f1.x_m - f0.x_m) / dt, frameQuantisation_s: dt,
  }
}

export interface StopComparison {
  runId: number
  /** What the student's stopwatch showed, s, and the true flight time, s. */
  reading_s: number
  flightTrue_s: number
  /** Start press minus the true edge-crossing time, s (positive: late). */
  startError_s: number
  /** Stop press minus the true landing time, s (positive: late). */
  stopError_s: number
  /** reading - true flight time, s. */
  error_s: number
}

/** Compare one stopwatch stop with the true event times of its run: the reaction errors behind the reading. Null if the stop has no run or the run did not fly. */
export function compareStopToRun(stop: Pick<StopRecord, 'reading_s' | 'startTime_ms' | 'stopTime_ms'>, run: RunRecord): StopComparison | null {
  if (run.times.edge_s === null || run.times.land_s === null || !run.flight) return null
  const edge_ms = run.releaseTime_ms + run.times.edge_s * 1000
  const land_ms = run.releaseTime_ms + run.times.land_s * 1000
  const startError_s = (stop.startTime_ms - edge_ms) / 1000
  const stopError_s = (stop.stopTime_ms - land_ms) / 1000
  return { runId: run.id, reading_s: stop.reading_s, flightTrue_s: run.flight.t_flight_s, startError_s, stopError_s, error_s: stop.reading_s - run.flight.t_flight_s }
}

/** True event times of a run as the stopwatch log stores them. */
export const eventRecords = (run: Pick<RunRecord, 'times'>): EventRecord[] => [
  { event: 'tip', trueTime_s: run.times.tip_s },
  { event: 'edge', trueTime_s: run.times.edge_s },
  { event: 'landing', trueTime_s: run.times.land_s },
]
