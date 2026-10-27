// Dynamics of the DigiCart on the inclined rail. Pure, deterministic expectation: no randomness (see variability.ts).
// Coordinate s_m runs along the rail, positive down the slope, origin at the 0 cm mark. Unit in the name.
//
// Model (Newton along the rail, rolling without slipping, translational + rotational kinetic energy):
//   m_eff dv/dt = m g sin(theta) - c_rr m g cos(theta) - F_bearing - 1/2 rho Cd A v|v|
//   m_eff = m + sum(I_w) / r^2,  I_w = wheelInertiaFactor * m_w * r^2  (solid disc: 1/2)
// Standard rigid-body result (e.g. Halliday-Resnick, rolling down an incline). Every empirical parameter is in
// DEFAULT_CART and PARAMETERS.md. Rolling friction and bearing drag are opposite to v; at rest the cart stays put
// unless the driving force exceeds them plus the ASSUMED breakaway force F_breakaway_N (static friction).
import { G_QUITO_mps2, RHO_AIR_QUITO_kgpm3 } from '../../../core/physics/constants.ts'
import { THETA_GUIDE_rad } from './incline.ts'
import { brent } from '../../../core/physics/roots.ts'
import {
  DEFAULT_DIGICART_BODY, wheelInertiaMass_kg, type DigiCartBody,
} from '../../../core/physics/digicart.ts'
import { closedFormCrossing_s, type KinematicState } from '../../../core/physics/kinematics.ts'

/** DigiCart body (core/physics/digicart.ts: mass, wheels, c_rr, bearing drag, breakaway, drag) on the incline. */
export interface CartParams extends DigiCartBody {
  /** Local gravity, m/s^2. */
  g_mps2: number
  /** Incline angle of the rail, rad. */
  theta_rad: number
  /** Air density, kg/m^3. */
  rho_air_kgpm3: number
}

/**
 * Defaults. g, rho and theta are derived (constants.ts, incline.ts); everything else is ASSUMED, see PARAMETERS.md.
 * Not PHYWE specifications.
 */
export const DEFAULT_CART: CartParams = {
  ...DEFAULT_DIGICART_BODY,
  g_mps2: G_QUITO_mps2,
  theta_rad: THETA_GUIDE_rad,
  rho_air_kgpm3: RHO_AIR_QUITO_kgpm3,
}

/** s_m: position of the cart front along the rail from the 0 cm mark, m (down-slope positive); v_mps: velocity along the rail. */
export type CartState = KinematicState

/** Rotational-inertia ratio k = sum(I_w) / (m r^2) (dimensionless); m_eff = m (1 + k). */
export function inertiaRatio(p: CartParams): number {
  return wheelInertiaMass_kg(p) / p.m_kg
}

/** Effective mass m + sum(I_w)/r^2, kg. */
export function effectiveMass_kg(p: CartParams): number {
  return p.m_kg * (1 + inertiaRatio(p))
}

/** Ideal (frictionless, no drag) acceleration g sin(theta) / (1 + k), m/s^2. */
export function idealAcceleration_mps2(p: CartParams): number {
  return (p.g_mps2 * Math.sin(p.theta_rad)) / (1 + inertiaRatio(p))
}

function drivingForce_N(p: CartParams): number {
  return p.m_kg * p.g_mps2 * Math.sin(p.theta_rad)
}
function resistiveForce_N(p: CartParams): number {
  return p.c_rr * p.m_kg * p.g_mps2 * Math.cos(p.theta_rad) + p.F_bearing_N
}

/**
 * Constant acceleration of the force part (no air drag), m/s^2, for a cart moving down-slope:
 * (m g sin(theta) - c_rr m g cos(theta) - F_bearing) / m_eff for a cart released from rest, or 0 when static
 * friction holds it (m g sin(theta) <= kinetic resistances + F_breakaway). Breakaway is not subtracted once moving.
 */
export function constantAcceleration_mps2(p: CartParams): number {
  const net = drivingForce_N(p) - resistiveForce_N(p)
  return net > p.F_breakaway_N ? net / effectiveMass_kg(p) : 0
}

/** Smallest incline angle, rad, at which a cart at rest starts: sin(theta) = (c_rr m g cos + F_bearing + F_breakaway)/(m g), solved by fixed point. */
export function breakawayAngle_rad(p: CartParams): number {
  let th = 0
  for (let i = 0; i < 50; i++) {
    th = Math.asin((p.c_rr * p.m_kg * p.g_mps2 * Math.cos(th) + p.F_bearing_N + p.F_breakaway_N) / (p.m_kg * p.g_mps2))
  }
  return th
}

/** Acceleration, m/s^2, of the full model at velocity v. */
export function acceleration_mps2(v_mps: number, p: CartParams): number {
  const drive = drivingForce_N(p)
  const R = resistiveForce_N(p)
  const meff = effectiveMass_kg(p)
  if (v_mps === 0) {
    if (Math.abs(drive) <= R + p.F_breakaway_N) return 0 // static: kinetic resistances + breakaway
    return (drive - Math.sign(drive) * R) / meff
  }
  const drag = 0.5 * p.rho_air_kgpm3 * p.Cd * p.A_m2 * v_mps * Math.abs(v_mps)
  return (drive - Math.sign(v_mps) * R - drag) / meff
}

/** One classical RK4 step of the full model for the state (s, v) over h_s. If the velocity changes sign while static friction would hold, the cart stops. */
export function rk4Step(st: CartState, h_s: number, p: CartParams): CartState {
  const f = (v: number): number => acceleration_mps2(v, p)
  const k1s = st.v_mps, k1v = f(st.v_mps)
  const k2s = st.v_mps + 0.5 * h_s * k1v, k2v = f(k2s)
  const k3s = st.v_mps + 0.5 * h_s * k2v, k3v = f(k3s)
  const k4s = st.v_mps + h_s * k3v, k4v = f(k4s)
  const s = st.s_m + (h_s / 6) * (k1s + 2 * k2s + 2 * k3s + k4s)
  let v = st.v_mps + (h_s / 6) * (k1v + 2 * k2v + 2 * k3v + k4v)
  if (st.v_mps !== 0 && v * st.v_mps < 0 && Math.abs(drivingForce_N(p)) <= resistiveForce_N(p)) v = 0
  return { s_m: s, v_mps: v }
}

export interface IntegrationOptions {
  /** RK4 step, s. Default 1 ms. */
  dt_s?: number
}

/** State of the full model at time t after release (RK4). */
export function stateAt(t_s: number, p: CartParams, init: CartState = { s_m: 0, v_mps: 0 }, opts: IntegrationOptions = {}): CartState {
  const dt = opts.dt_s ?? 0.001
  let st = init
  let t = 0
  while (t + dt <= t_s) {
    st = rk4Step(st, dt, p)
    t += dt
  }
  const rest = t_s - t
  return rest > 0 ? rk4Step(st, rest, p) : st
}

export interface CrossingOptions extends IntegrationOptions {
  /** Give up after this time, s. Default 60. */
  tMax_s?: number
}

/**
 * Time after release, s, at which the cart front reaches position s_m (the first crossing), or null if it never does
 * (stuck by static friction, or beyond tMax_s). Uses the exact quadratic when there is no air drag; otherwise
 * steps RK4 until the step that brackets the crossing, then Brent root-finding on a single RK4 step.
 * Returns 0 if the cart already starts at or beyond s_m.
 */
export function crossingTime_s(
  s_m: number, p: CartParams, init: CartState = { s_m: 0, v_mps: 0 }, opts: CrossingOptions = {},
): number | null {
  if (init.s_m >= s_m) return 0
  const dt = opts.dt_s ?? 0.001
  const tMax = opts.tMax_s ?? 60
  if (p.rho_air_kgpm3 * p.Cd * p.A_m2 === 0 && init.v_mps >= 0) {
    const net = drivingForce_N(p) - resistiveForce_N(p)
    if (init.v_mps === 0) return closedFormCrossing_s(s_m, constantAcceleration_mps2(p), init) // null if held by static friction
    if (net >= 0) return closedFormCrossing_s(s_m, net / effectiveMass_kg(p), init)
    // a moving cart that decelerates (net < 0): fall through to the RK4 loop, which also handles the stop
  }
  let st = init
  let t = 0
  while (t < tMax) {
    const next = rk4Step(st, dt, p)
    if (next.s_m >= s_m) {
      const start = st
      const tau = brent((h) => rk4Step(start, h, p).s_m - s_m, 0, dt, 1e-13)
      return t + tau
    }
    if (next.v_mps === 0 && next.s_m === st.s_m) return null // stuck
    st = next
    t += dt
  }
  return null
}
