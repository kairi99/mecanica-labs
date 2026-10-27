// Time evolution of one run: stored trajectory with the events (canister meets the floor, cart hits the receiver, cart
// at rest). Pure. Same RK4 step as crossingTime_s.
import type { KinematicState } from '../../../core/physics/kinematics.ts'
import { advance, type Newton2Params, type RunGeometry, type RunState, type StepEvents } from './system.ts'

export const TRAJECTORY_DT_s = 0.001
export const TRAJECTORY_MAX_s = 40

export interface RunTrajectory {
  dt_s: number
  /** Cart travel from the release point, m, sampled every dt_s. */
  s_m: Float64Array
  v_mps: Float64Array
  /** Time the canister meets the floor and the cart speed then; null if it does not. */
  tFloor_s: number | null
  vFloor_mps: number | null
  /** Time the cart front hits the receiver stop, or null. */
  tReceiver_s: number | null
  /** Time the cart is at rest (receiver, or friction while coasting, or never started), or null while still moving at the end. */
  tRest_s: number | null
  duration_s: number
}

/** Integrate the run until the cart is at rest or TRAJECTORY_MAX_s. A cart held by static friction at the start has one sample. */
export function buildTrajectory(p: Newton2Params, geo: RunGeometry, init: KinematicState): RunTrajectory {
  const dt = TRAJECTORY_DT_s
  const s: number[] = [init.s_m]
  const v: number[] = [init.v_mps]
  let st: RunState = { ...init, phase: 'driven' }
  let tFloor: number | null = null, vFloor: number | null = null, tRecv: number | null = null, tRest: number | null = null
  const n = Math.ceil(TRAJECTORY_MAX_s / dt)
  for (let k = 0; k < n; k++) {
    const ev: StepEvents = {}
    const prevPhase = st.phase
    const next = advance(st, dt, p, geo, ev)
    const t = k * dt
    if (ev.floor !== undefined && tFloor === null) {
      tFloor = t + ev.floor
    }
    if (ev.receiver !== undefined && tRecv === null) tRecv = t + ev.receiver
    if (prevPhase === 'driven' && next.phase === 'stopped' && st.v_mps === 0 && next.s_m === st.s_m) { tRest = 0; break }
    s.push(next.s_m)
    v.push(next.v_mps)
    st = next
    if (st.phase === 'stopped') { tRest = (s.length - 1) * dt; break }
  }
  const out: RunTrajectory = {
    dt_s: dt, s_m: Float64Array.from(s), v_mps: Float64Array.from(v), tFloor_s: tFloor, vFloor_mps: vFloor,
    tReceiver_s: tRecv, tRest_s: tRest, duration_s: (s.length - 1) * dt,
  }
  if (tFloor !== null) out.vFloor_mps = trajectoryAt(out, tFloor).v_mps
  return out
}

/** State at t_s after release (linear interpolation of the stored steps; holds the last state after the end). */
export function trajectoryAt(tr: RunTrajectory, t_s: number): KinematicState {
  const last = tr.s_m.length - 1
  const f = Math.max(0, t_s) / tr.dt_s
  const i = Math.min(Math.floor(f), last)
  const j = Math.min(i + 1, last)
  const w = f - i
  return { s_m: tr.s_m[i]! * (1 - w) + tr.s_m[j]! * w, v_mps: i >= last ? 0 : tr.v_mps[i]! * (1 - w) + tr.v_mps[j]! * w }
}
