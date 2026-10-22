// Time evolution of one cart run: stored trajectory, crossing times, DigiCart encoder samples. Pure.
import {
  crossingTime_s, quantize, rk4Step, constantAcceleration_mps2, type CartParams, type CartState,
} from '../physics/index.ts'
import { DIGICART_RESOLUTION_m, DIGICART_SAMPLE_RATE_Hz, TRAJECTORY_DT_s, TRAJECTORY_MAX_s } from './constants.ts'

export interface Trajectory {
  dt_s: number
  /** Position along the rail from the placed start, m (down-slope positive), sampled every dt_s from release. */
  s_m: Float64Array
  v_mps: Float64Array
  /** Time at which the front reaches the receiver stop, s, or null (never: flat, stuck or no receiver reached). */
  tStop_s: number | null
  sStop_m: number
  /** Duration covered by the arrays, s. */
  duration_s: number
}

/**
 * Integrate the physics model (RK4, same step as physics crossingTime_s) from the release until the front reaches the
 * receiver stop at sStop_m, the cart is held by static friction, or TRAJECTORY_MAX_s. A flat or uphill rail
 * (constant acceleration 0) is not simulated: the cart stays where it was released (documented simplification).
 */
export function buildTrajectory(params: CartParams, init: CartState, sStop_m: number): Trajectory {
  const dt = TRAJECTORY_DT_s
  const s: number[] = [init.s_m]
  const v: number[] = [init.v_mps]
  const moves = params.theta_rad > 0 && constantAcceleration_mps2(params) > 0
  let tStop: number | null = null
  if (moves) {
    tStop = crossingTime_s(sStop_m, params, init, { dt_s: dt, tMax_s: TRAJECTORY_MAX_s })
    const tEnd = tStop ?? TRAJECTORY_MAX_s
    let st = init
    const n = Math.ceil(tEnd / dt)
    for (let k = 1; k <= n; k++) {
      st = rk4Step(st, dt, params)
      s.push(st.s_m)
      v.push(st.v_mps)
    }
  }
  return { dt_s: dt, s_m: Float64Array.from(s), v_mps: Float64Array.from(v), tStop_s: tStop, sStop_m, duration_s: (s.length - 1) * dt }
}

/** State at t_s after release (linear interpolation of the stored steps; error ~1e-8 m). Holds at the stop. */
export function trajectoryAt(tr: Trajectory, t_s: number): { s_m: number; v_mps: number; stopped: boolean } {
  if (tr.tStop_s !== null && t_s >= tr.tStop_s) return { s_m: tr.sStop_m, v_mps: 0, stopped: true }
  const t = Math.max(0, t_s)
  const f = t / tr.dt_s
  const i = Math.min(Math.floor(f), tr.s_m.length - 1)
  const j = Math.min(i + 1, tr.s_m.length - 1)
  const w = f - i
  const s = tr.s_m[i]! * (1 - w) + tr.s_m[j]! * w
  const v = tr.v_mps[i]! * (1 - w) + tr.v_mps[j]! * w
  if (tr.tStop_s !== null) return { s_m: Math.min(s, tr.sStop_m), v_mps: v, stopped: false }
  return { s_m: s, v_mps: t >= tr.duration_s ? 0 : v, stopped: false }
}

/** DigiCart encoder samples: displacement from release quantised to 1 mm at 50 Hz, until just after the stop. */
export function digicartSamples(tr: Trajectory): { t_s: number[]; x_m: number[] } {
  const end = tr.tStop_s ?? Math.max(tr.duration_s, 1)
  const n = Math.ceil(end * DIGICART_SAMPLE_RATE_Hz)
  const t: number[] = []
  const x: number[] = []
  const s0 = tr.s_m[0]!
  for (let k = 0; k <= n; k++) {
    const tk = k / DIGICART_SAMPLE_RATE_Hz
    t.push(tk)
    x.push(Math.round(quantize(trajectoryAt(tr, tk).s_m - s0, DIGICART_RESOLUTION_m) * 1e6) / 1e6)
  }
  return { t_s: t, x_m: x }
}
