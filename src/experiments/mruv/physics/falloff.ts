// What happens to the DigiCart when it leaves the low rail end because nothing stops it (no receiver / end stop).
// Pure, deterministic expectation: a projectile from the rail end to the table top, then a hard landing and a
// rolling run-out; if the table edge comes first, a second projectile to the floor. Scatter of the landing lives in
// variability.ts (sampleLandingRetention). No DOM, no timers, no randomness.
//
// Frame: 2D plane of the rail. x_m horizontal, positive in the down-slope direction, origin at the point where the
// cart's centre leaves the rail end; y_m up, origin at the TABLE TOP (so the rail end starts at y = h_m, the floor is
// at y = -tableHeight_m). The motion is in the plane because the cart leaves along the rail axis.
//
// Physics: projectile motion (Halliday-Resnick, chapter on motion in two dimensions) with the rail end velocity
// v (cos theta, -sin theta); impact with restitution 0 (vertical speed lost, a fraction `retention` of the
// horizontal speed kept: ASSUMED); then the same rolling model as the rail (cart.ts) on a flat surface with an
// ASSUMED table rolling-resistance coefficient. Nothing here is a PHYWE specification.
import { DEFAULT_CART, effectiveMass_kg, type CartParams } from './cart.ts'

/** Fraction of the horizontal speed kept at the hard landing (restitution 0, the cart bangs onto its wheels). ASSUMED. */
export const LANDING_RETENTION = 0.5
/** Rolling-resistance coefficient of the cart wheels on the table top / floor (flat, hard, not the smooth rail). ASSUMED. */
export const C_RR_SURFACE = 0.01
/**
 * COSMETIC (view only, not physical): nose-down pitch the cart reaches at the end of the flight, rad, and the time it
 * takes to settle flat after landing, s. They only shape the drawn tilt; no position or time depends on them.
 */
export const TIP_PITCH_END_rad = 0.2
export const SETTLE_TIME_s = 0.1
/** Default sample step of the returned path, s (the view interpolates between samples). */
export const FALL_DT_s = 1 / 120
/** Longest rolling run-out simulated, s (a safety bound; with the defaults a cart stops in a few seconds). */
export const FALL_MAX_ROLL_s = 60

export type FallSurface = 'air' | 'table' | 'floor'
export type FallFinal = 'onTable' | 'onFloor'

export interface FallInput {
  /** Speed along the rail when the cart's centre passes the low rail end, m/s (>= 0). */
  v_mps: number
  /** Incline angle of the rail, rad. */
  theta_rad: number
  /** Height of the rail end above the table top, m. */
  h_m: number
  /** Horizontal distance from the rail end to the table edge in the travel direction, m (>= 0). */
  edgeDistance_m: number
  /** Table top height above the floor, m. */
  tableHeight_m: number
  /** Fraction of the horizontal speed kept at each landing. Default LANDING_RETENTION. */
  retention?: number
  /** Cart body (g, mass, wheel inertia, bearing drag). Default DEFAULT_CART. c_rr is replaced by c_rr_surface. */
  cart?: CartParams
  c_rr_surface?: number
  dt_s?: number
}

export interface FallSample {
  t_s: number
  /** Position of the cart centre: horizontal from the rail end, and height above the table top, m. */
  x_m: number
  y_m: number
  /** Nose-down pitch of the cart, rad (cosmetic, see TIP_PITCH_END_rad). */
  pitch_rad: number
  surface: FallSurface
}

export interface FallResult {
  samples: FallSample[]
  final: FallFinal
  /** Time the cart first touches the table top / reaches the table edge / touches the floor; null when it never does. */
  tTableLand_s: number | null
  tEdge_s: number | null
  tFloorLand_s: number | null
  /** Time the cart is at rest (end of the samples), s. */
  tRest_s: number
  restX_m: number
  /** Rest height above the table top, m: 0 on the table, -tableHeight_m on the floor. */
  restY_m: number
}

/** Positive root of y0 + vy t - g t^2/2 = yTarget (time to fall to yTarget), or null if never reached. */
function timeToHeight_s(y0: number, vy: number, yTarget: number, g: number): number | null {
  const disc = vy * vy + 2 * g * (y0 - yTarget)
  if (disc < 0) return null
  const t = (vy + Math.sqrt(disc)) / g
  return t >= 0 ? t : null
}

/**
 * Deceleration of the rolling cart on a flat surface, m/s^2: (c_rr m g + F_bearing) / m_eff (the rail model of
 * cart.ts with sin(theta) = 0; air drag neglected at these speeds).
 */
export function surfaceDeceleration_mps2(cart: CartParams, c_rr: number): number {
  return (c_rr * cart.m_kg * cart.g_mps2 + cart.F_bearing_N) / effectiveMass_kg(cart)
}

/**
 * Full path after the cart leaves the rail end. Returns time-sampled positions and the final state:
 *   1. flight from the rail end: x = v cos(theta) t, y = h - v sin(theta) t - g t^2/2;
 *   2. if it reaches the table top (y = 0) before passing the edge: restitution 0, keeps `retention` of the horizontal
 *      speed and rolls with constant deceleration; stops on the table ('onTable') or, reaching the edge first, leaves it
 *      horizontally and falls to the floor;
 *   3. if the flight itself carries it past the edge, it falls straight to the floor;
 *   4. on the floor: same landing and run-out (the floor is taken as unbounded).
 * Falling time over height H from a horizontal start is sqrt(2H/g) (the limit tested).
 */
export function fallOffPath(input: FallInput): FallResult {
  const cart = input.cart ?? DEFAULT_CART
  const g = cart.g_mps2
  const dt = input.dt_s ?? FALL_DT_s
  const keep = input.retention ?? LANDING_RETENTION
  const aRoll = surfaceDeceleration_mps2(cart, input.c_rr_surface ?? C_RR_SURFACE)
  const v = Math.max(0, input.v_mps)
  const vx0 = v * Math.cos(input.theta_rad)
  const vy0 = -v * Math.sin(input.theta_rad)
  const H = input.tableHeight_m
  const samples: FallSample[] = []
  const push = (t_s: number, x_m: number, y_m: number, pitch_rad: number, surface: FallSurface): void => {
    samples.push({ t_s, x_m, y_m, pitch_rad, surface })
  }
  const pitchAt = (u: number, p0: number): number => p0 + (TIP_PITCH_END_rad - p0) * Math.min(1, Math.max(0, u))

  // Flight along a parabola from (x0, y0, t0) with velocity (vx, vy) down to height yEnd; returns the end time.
  const flight = (t0: number, x0: number, y0: number, vx: number, vy: number, yEnd: number, p0: number, surface: FallSurface): number | null => {
    const T = timeToHeight_s(y0, vy, yEnd, g)
    if (T === null) return null
    const n = Math.max(1, Math.ceil(T / dt))
    for (let i = 0; i < n; i++) {
      const tau = (i / n) * T
      push(t0 + tau, x0 + vx * tau, y0 + vy * tau - 0.5 * g * tau * tau, pitchAt(tau / T, p0), surface)
    }
    return T
  }
  // Landing on a surface at height yS, then rolling at most `maxRoll_m` before an optional edge. Returns the stop info.
  const landAndRoll = (
    tL: number, xL: number, yS: number, vxL: number, surface: FallSurface, edgeX_m: number | null,
  ): { tEnd: number; xEnd: number; reachedEdge: boolean; vEdge: number } => {
    const u0 = Math.max(0, keep * vxL)
    const tStopRoll = Math.min(FALL_MAX_ROLL_s, u0 / aRoll)
    const dStop = u0 * tStopRoll - 0.5 * aRoll * tStopRoll * tStopRoll
    let tRoll = tStopRoll
    let reachedEdge = false
    if (edgeX_m !== null && xL + dStop > edgeX_m) {
      reachedEdge = true
      const d = Math.max(0, edgeX_m - xL)
      // d = u0 t - a t^2 / 2, first root
      const disc = Math.max(0, u0 * u0 - 2 * aRoll * d)
      tRoll = (u0 - Math.sqrt(disc)) / aRoll
    }
    const n = Math.max(1, Math.ceil(tRoll / dt))
    for (let i = 0; i < n; i++) {
      const tau = (i / n) * tRoll
      push(tL + tau, xL + u0 * tau - 0.5 * aRoll * tau * tau, yS, pitchAt(1 - tau / SETTLE_TIME_s, 0) * Math.max(0, 1 - tau / SETTLE_TIME_s), surface)
    }
    const xEnd = xL + u0 * tRoll - 0.5 * aRoll * tRoll * tRoll
    return { tEnd: tL + tRoll, xEnd, reachedEdge, vEdge: Math.max(0, u0 - aRoll * tRoll) }
  }

  let tTableLand: number | null = null
  let tEdge: number | null = null
  let tFloorLand: number | null = null
  let t = 0
  let x = 0
  let vxNow = vx0
  let yNow = input.h_m
  let vyNow = vy0
  let p0: number = input.theta_rad
  let onTable = false

  // 1. flight from the rail end, to the table top
  const Ttable = timeToHeight_s(yNow, vyNow, 0, g)
  const xLandTable = Ttable === null ? Infinity : vxNow * Ttable
  if (Ttable !== null && xLandTable <= input.edgeDistance_m) {
    flight(t, x, yNow, vxNow, vyNow, 0, p0, 'air')
    t += Ttable; x = xLandTable
    tTableLand = t
    onTable = true
    // 2. land and roll on the table, maybe off the edge
    const r = landAndRoll(t, x, 0, vxNow, 'table', input.edgeDistance_m)
    t = r.tEnd; x = r.xEnd
    if (r.reachedEdge) {
      tEdge = t
      vxNow = r.vEdge; yNow = 0; vyNow = 0; p0 = 0
      onTable = false
    }
  }
  if (!onTable) {
    // 3. flight to the floor (from the rail end if it cleared the edge in the air, or from the table edge)
    const yFloor = -H
    const T = flight(t, x, yNow, vxNow, vyNow, yFloor, p0, 'air')
    if (T === null) throw new Error('fallOffPath: cannot reach the floor (non-positive gravity?)')
    const xF = x + vxNow * T
    t += T
    tFloorLand = t
    if (tEdge === null && input.edgeDistance_m < xLandTable) tEdge = tFloorLand - T + (vxNow > 0 ? (input.edgeDistance_m - x) / vxNow : 0)
    // 4. land and roll on the floor
    const r = landAndRoll(t, xF, yFloor, vxNow, 'floor', null)
    t = r.tEnd; x = r.xEnd
    yNow = yFloor
  }
  const final: FallFinal = onTable ? 'onTable' : 'onFloor'
  const restY = onTable ? 0 : -H
  push(t, x, restY, 0, onTable ? 'table' : 'floor')
  return { samples, final, tTableLand_s: tTableLand, tEdge_s: tEdge, tFloorLand_s: tFloorLand, tRest_s: t, restX_m: x, restY_m: restY }
}

/** Pose at time t_s: linear interpolation of the samples (before 0 the first, after the rest the last). */
export function fallSampleAt(res: FallResult, t_s: number): FallSample {
  const s = res.samples
  if (t_s <= 0) return s[0]!
  const last = s[s.length - 1]!
  if (t_s >= last.t_s) return last
  let lo = 0
  let hi = s.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (s[mid]!.t_s <= t_s) lo = mid; else hi = mid
  }
  const a = s[lo]!
  const b = s[hi]!
  const w = b.t_s > a.t_s ? (t_s - a.t_s) / (b.t_s - a.t_s) : 0
  return {
    t_s, x_m: a.x_m + (b.x_m - a.x_m) * w, y_m: a.y_m + (b.y_m - a.y_m) * w,
    pitch_rad: a.pitch_rad + (b.pitch_rad - a.pitch_rad) * w, surface: w < 1 ? a.surface : b.surface,
  }
}
