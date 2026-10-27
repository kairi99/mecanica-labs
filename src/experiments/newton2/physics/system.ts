// Dynamics of the DigiCart on a (nearly) level rail pulled by a hanging canister over a pulley. Pure, deterministic
// expectation: no randomness (see variability.ts). s_m runs along the rail from the release point toward the pulley.
//
// Driven phase (string taut), Newton for the cart and the canister, rolling without slipping:
//   m_hang g + M_cart g sin(tilt) - F_resist(v) = M_eff a
//   M_eff   = M_cart + m_hang + sum(I_w)/r_w^2 + I_p/r_p^2 + m_string
//   F_resist = c_rr M_cart g cos(tilt) + F_bearing + F_pulley + 1/2 rho Cd A v^2   (v > 0)
// tilt > 0: the rail slopes down toward the pulley (the stand end is higher). Ideal limit (no resistance, no rotational
// inertia, level): a = m_hang g / (M_cart + m_hang). The hanging string adds its weight lambda g (hang0 + s) to the driving force in
// the full (RK4) model; constantAcceleration_mps2 and the closed form leave it out (ideal / constant-force reference). After the
// canister meets the floor the string goes slack and the cart coasts: M_cart g sin(tilt) - F_resist(v) = (M_cart + sum(I_w)/r_w^2) a.
// The cart cannot roll back: v is clamped at 0 (a held cart stays held). That is exact for the levelling range of the bench (a centred
// bubble, |tilt| <= 0.025 deg); a coasting cart on a rail tilted away from the pulley by more than about 0.1 deg would in reality roll back.
import { brent } from '../../../core/physics/roots.ts'
import { wheelInertiaMass_kg, type DigiCartBody } from '../../../core/physics/digicart.ts'
import { closedFormCrossing_s, type KinematicState } from '../../../core/physics/kinematics.ts'
import {
  PULLEY_FRICTION_N, PULLEY_INERTIA_FACTOR, PULLEY_MASS_kg,
} from './constants.ts'

export interface PulleyParams {
  /** Moment of inertia over radius squared, kg (equivalent translational mass). */
  inertiaMass_kg: number
  /** Friction force of the axle, N (velocity independent, opposes the motion). */
  F_friction_N: number
}
export const DEFAULT_PULLEY: PulleyParams = { inertiaMass_kg: PULLEY_INERTIA_FACTOR * PULLEY_MASS_kg, F_friction_N: PULLEY_FRICTION_N }

export interface Newton2Params {
  g_mps2: number
  rho_air_kgpm3: number
  /** Bare DigiCart (wheels, resistance model). */
  cart: DigiCartBody
  /** Everything riding on the cart besides the bare body: brass screw, plastic screws, masses moved to the cart, kg. */
  mCartLoad_kg: number
  /** Canister with lid and the masses in it, kg. */
  mHang_kg: number
  /** Mass of the string that moves with the system (inertia), kg. */
  mString_kg: number
  /** Linear density of the string, kg/m, and the length hanging below the pulley at the release, m: the hanging part weighs lambda g (hang0 + s). */
  stringLinDensity_kgpm: number
  hang0_m: number
  pulley: PulleyParams
  /** Rail tilt, rad; positive when the rail slopes down toward the pulley. */
  tilt_rad: number
}

export type Phase = 'driven' | 'coast' | 'stopped'
export interface RunState extends KinematicState { phase: Phase }

/** Mass of the cart with everything on it, kg. */
export const cartMass_kg = (p: Newton2Params): number => p.cart.m_kg + p.mCartLoad_kg
/** Mt: cart (with load) + canister (with masses), kg. What the guide asks to weigh (plus the plastic screws). */
export const totalMass_kg = (p: Newton2Params): number => cartMass_kg(p) + p.mHang_kg
/** Effective inertia of the driven system, kg. */
export function effectiveMass_kg(p: Newton2Params): number {
  return totalMass_kg(p) + wheelInertiaMass_kg(p.cart) + p.pulley.inertiaMass_kg + p.mString_kg
}
/** Effective inertia of the coasting cart (string slack, canister on the floor), kg. */
export const coastMass_kg = (p: Newton2Params): number => cartMass_kg(p) + wheelInertiaMass_kg(p.cart)
/** Ideal acceleration m_hang g / Mt, m/s^2 (level rail, no friction, no rotational inertia). */
export const idealAcceleration_mps2 = (p: Newton2Params): number => (p.mHang_kg * p.g_mps2) / totalMass_kg(p)
/** Net force that the weight of the canister plus the tilt component put on the system (string weight excluded), N. */
export const drivingForce_N = (p: Newton2Params): number => p.mHang_kg * p.g_mps2 + cartMass_kg(p) * p.g_mps2 * Math.sin(p.tilt_rad)
/** Weight of the hanging string after the cart has travelled s_m, N (driven phase only). */
export const stringWeight_N = (p: Newton2Params, s_m: number): number => p.stringLinDensity_kgpm * p.g_mps2 * Math.max(0, p.hang0_m + s_m)
/** Speed-independent resistance while driven (rolling, bearings, pulley axle), N. */
export const resistiveForce_N = (p: Newton2Params): number =>
  p.cart.c_rr * cartMass_kg(p) * p.g_mps2 * Math.cos(p.tilt_rad) + p.cart.F_bearing_N + p.pulley.F_friction_N
const coastDrive_N = (p: Newton2Params): number => cartMass_kg(p) * p.g_mps2 * Math.sin(p.tilt_rad)
const coastResistive_N = (p: Newton2Params): number =>
  p.cart.c_rr * cartMass_kg(p) * p.g_mps2 * Math.cos(p.tilt_rad) + p.cart.F_bearing_N
const airDrag_N = (v: number, p: Newton2Params): number => 0.5 * p.rho_air_kgpm3 * p.cart.Cd * p.cart.A_m2 * v * Math.abs(v)

/**
 * Constant acceleration of the driven phase without air drag and without the string weight (the ideal / constant-force reference), m/s^2;
 * 0 when static friction (kinetic + breakaway) holds the cart.
 */
export function constantAcceleration_mps2(p: Newton2Params): number {
  const net = drivingForce_N(p) - resistiveForce_N(p)
  return net > p.cart.F_breakaway_N ? net / effectiveMass_kg(p) : 0
}

/**
 * Acceleration, m/s^2, at position s_m (travel) and velocity v in a phase. The static-breakaway force acts only at v = 0 (a cart at
 * rest); once moving only the kinetic resistances act. The hanging string's weight is part of the driven force.
 */
export function acceleration_mps2(v_mps: number, p: Newton2Params, phase: Phase = 'driven', s_m = 0): number {
  if (phase === 'stopped') return 0
  const drive = phase === 'driven' ? drivingForce_N(p) + stringWeight_N(p, s_m) : coastDrive_N(p)
  const R = phase === 'driven' ? resistiveForce_N(p) : coastResistive_N(p)
  const m = phase === 'driven' ? effectiveMass_kg(p) : coastMass_kg(p)
  if (v_mps <= 0) {
    if (Math.abs(drive) <= R + (v_mps === 0 ? p.cart.F_breakaway_N : 0)) return 0
    return (drive - Math.sign(drive) * R) / m
  }
  return (drive - R - airDrag_N(v_mps, p)) / m
}

/**
 * One RK4 step of (s, v) in a fixed phase. The cart cannot roll back: a cart that would reverse stops (v clamped at 0). A cart AT REST
 * (v0 = 0) starts only above kinetic + breakaway; a moving cart that slows to zero stays stopped when the drive cannot beat the kinetic resistance alone.
 */
export function rk4Step(st: KinematicState, h_s: number, p: Newton2Params, phase: Phase): KinematicState {
  const f = (s: number, v: number): number => acceleration_mps2(v, p, phase, s)
  const k1s = st.v_mps, k1v = f(st.s_m, st.v_mps)
  const s2 = st.s_m + 0.5 * h_s * k1s, v2 = st.v_mps + 0.5 * h_s * k1v
  const k2s = v2, k2v = f(s2, v2)
  const s3 = st.s_m + 0.5 * h_s * k2s, v3 = st.v_mps + 0.5 * h_s * k2v
  const k3s = v3, k3v = f(s3, v3)
  const s4 = st.s_m + h_s * k3s, v4 = st.v_mps + h_s * k3v
  const k4s = v4, k4v = f(s4, v4)
  const s = st.s_m + (h_s / 6) * (k1s + 2 * k2s + 2 * k3s + k4s)
  let v = st.v_mps + (h_s / 6) * (k1v + 2 * k2v + 2 * k3v + k4v)
  if (v <= 0) {
    const drive = phase === 'driven' ? drivingForce_N(p) + stringWeight_N(p, st.s_m) : coastDrive_N(p)
    const R = phase === 'driven' ? resistiveForce_N(p) : coastResistive_N(p)
    if (Math.abs(drive) <= R + (st.v_mps === 0 ? p.cart.F_breakaway_N : 0)) return { s_m: Math.max(s, st.s_m), v_mps: 0 }
    v = 0
  }
  return { s_m: s, v_mps: v }
}

/** Where the run ends: the canister meets the floor after sFloor_m of cart travel, the cart front hits the receiver after sReceiver_m. */
export interface RunGeometry {
  /** Cart travel when the canister meets the floor, m; use a very negative finite value (JSON-safe) for "string not pulling". */
  sFloor_m: number
  sReceiver_m: number
}

/** Events met while advancing a step (times from the start of the step). */
export interface StepEvents { floor?: number; receiver?: number }

/**
 * Advance a run state by h_s through the phase changes: driven -> coast when the canister meets the floor (it stops, the
 * string goes slack, the cart keeps its speed), any phase -> stopped at the receiver stop (inelastic) or when the coasting
 * cart comes to rest. Events inside the step are located by Brent root finding.
 */
export function advance(st: RunState, h_s: number, p: Newton2Params, geo: RunGeometry, ev?: StepEvents): RunState {
  let cur = st
  let left = h_s
  let guard = 0
  while (left > 0 && cur.phase !== 'stopped' && guard++ < 4) {
    const limit = cur.phase === 'driven' ? Math.min(geo.sFloor_m, geo.sReceiver_m) : geo.sReceiver_m
    const nxt = rk4Step(cur, left, p, cur.phase)
    if (nxt.s_m >= limit && cur.v_mps >= 0) {
      const tau = cur.s_m >= limit ? 0 : brent((h) => rk4Step(cur, h, p, cur.phase).s_m - limit, 0, left, 1e-13)
      const at = rk4Step(cur, tau, p, cur.phase)
      const used = h_s - left + tau
      if (limit === geo.sReceiver_m) {
        if (ev && ev.receiver === undefined) ev.receiver = used
        return { s_m: geo.sReceiver_m, v_mps: 0, phase: 'stopped' }
      }
      if (ev && ev.floor === undefined) ev.floor = used
      cur = { s_m: Math.max(limit, cur.s_m, at.s_m), v_mps: at.v_mps, phase: 'coast' }
      left -= tau
      continue
    }
    if (nxt.v_mps === 0) return { s_m: nxt.s_m, v_mps: 0, phase: 'stopped' }
    return { s_m: nxt.s_m, v_mps: nxt.v_mps, phase: cur.phase }
  }
  return cur
}

export interface CrossingOptions {
  /** RK4 step, s. Default 1 ms. */
  dt_s?: number
  /** Give up after this time, s. Default 60. */
  tMax_s?: number
}

/**
 * Time after release, s, at which the cart front has travelled s_m (the first crossing), or null if it never does
 * (held by static friction, stopped by the receiver or by friction first). Exact quadratic when there is no air drag, no string weight
 * and the canister never reaches the floor before s_m; otherwise RK4 steps and Brent on the bracketing step.
 */
export function crossingTime_s(
  s_m: number, p: Newton2Params, geo: RunGeometry, init: KinematicState = { s_m: 0, v_mps: 0 }, opts: CrossingOptions = {},
): number | null {
  if (init.s_m >= s_m) return 0
  if (s_m > geo.sReceiver_m) return null
  const dt = opts.dt_s ?? 0.001
  const tMax = opts.tMax_s ?? 60
  if (p.rho_air_kgpm3 * p.cart.Cd * p.cart.A_m2 === 0 && p.stringLinDensity_kgpm === 0 && init.v_mps >= 0 && s_m <= geo.sFloor_m) {
    return closedFormCrossing_s(s_m, constantAcceleration_mps2(p), init)
  }
  let st: RunState = { ...init, phase: 'driven' }
  let t = 0
  while (t < tMax) {
    const start = st
    const next = advance(start, dt, p, geo)
    if (next.s_m >= s_m) {
      const tau = brent((h) => advance(start, h, p, geo).s_m - s_m, 0, dt, 1e-13)
      return t + tau
    }
    if (next.phase === 'stopped') return null
    st = next
    t += dt
  }
  return null
}
