// Projectile flight from the table edge to the paper. Pure, deterministic. Fixed-step RK4.
// Frame: x horizontal away from the edge, y up (floor reference y = 0, ball CENTRE height), z lateral.
// Start: centre at x = 0, y = H + R (ball resting on the table top at the edge), velocity (v0, 0, vz0).
// Forces (per ball mass m, volume V = 4/3 pi R^3, area A = pi R^2):
//   gravity reduced by buoyancy   -(1 - rho V / m) g y^
//   quadratic drag                -(rho Cd A / (2 m)) |v| v         (Cd ~ 0.5 smooth sphere, Re ~ 10^3-10^4)
//   Magnus (topspin)              (rho A C_L(S) / (2 m)) |v|^2 (omega^ x v^),  S = R omega / |v|
// Added mass (~ rho V / 2 extra inertia, ~0.5 % of a ping-pong ball's mass) is NEGLECTED. The spin axis is horizontal and
// perpendicular to the launch heading: omega_vec = omega (y^ x heading^); for a ball moving along +x this is -z^, so
// omega^ x v^ = -y^ (the force points DOWN for topspin). Spin decay over ~0.4 s is neglected (omega constant).
import { brent } from '../../../core/physics/roots.ts'
import { DEFAULT_DT_s, magnusLiftCoefficient, type BallSpec } from './constants.ts'

export interface FlightEffects {
  drag: boolean
  magnus: boolean
  buoyancy: boolean
}
export const ALL_EFFECTS: FlightEffects = { drag: true, magnus: true, buoyancy: true }
/** All air terms off: the pure projectile of the guide. */
export const VACUUM_EFFECTS: FlightEffects = { drag: false, magnus: false, buoyancy: false }

export interface FlightInput {
  ball: BallSpec
  /** Launch speed along the table, m/s. */
  v0_mps: number
  /** Lateral launch speed component, m/s (z direction). */
  vz0_mps?: number
  /** Topspin angular speed, rad/s (about the horizontal axis perpendicular to the heading). */
  omega_radps?: number
  /** Table height H, m: fall of the ball centre from edge to contact. */
  H_m: number
  /** Top of the paper above the floor reference, m. */
  paperHeight_m?: number
  g_mps2: number
  rho_air_kgpm3: number
  effects?: FlightEffects
  /** RK4 step, s (default 0.5 ms). */
  dt_s?: number
  /** If > 0, also return the trajectory sampled at this rate, Hz (0 = start, plus the landing instant). */
  sampleRate_hz?: number
}

export interface TrajectoryPoint {
  t_s: number
  x_m: number
  /** Ball CENTRE height, m. */
  y_m: number
  z_m: number
  vx_mps: number
  vy_mps: number
  vz_mps: number
}

export interface FlightResult {
  /** Time from leaving the edge to the ball touching the paper, s. */
  t_flight_s: number
  /** Horizontal distance edge -> contact point (= centre x at contact, the ball touches at its lowest point), m. */
  x_land_m: number
  z_land_m: number
  vx_impact_mps: number
  vy_impact_mps: number
  vz_impact_mps: number
  speed_impact_mps: number
  /** Sampled trajectory (empty unless sampleRate_hz > 0). */
  trajectory: TrajectoryPoint[]
}

type State = [number, number, number, number, number, number]

/** Ideal projectile (no air): t = sqrt(2H/g), x = v0 t, v_final = sqrt(v0^2 + 2 g H). The guide's tasks 5 and 7. */
export function idealFlight(H_m: number, v0_mps: number, g_mps2: number): { t_s: number; x_m: number; vFinal_mps: number } {
  return { t_s: Math.sqrt((2 * H_m) / g_mps2), x_m: v0_mps * Math.sqrt((2 * H_m) / g_mps2), vFinal_mps: Math.sqrt(v0_mps * v0_mps + 2 * g_mps2 * H_m) }
}

/** Integrate the flight to the paper (RK4 + Brent on the last step). Throws if H_m <= paperHeight_m. */
export function simulateFlight(inp: FlightInput): FlightResult {
  const { ball, g_mps2: g, rho_air_kgpm3: rho } = inp
  const fx = inp.effects ?? ALL_EFFECTS
  const dt = inp.dt_s ?? DEFAULT_DT_s
  const paper = inp.paperHeight_m ?? 0
  if (!(inp.H_m > paper)) throw new RangeError('simulateFlight: table height must exceed the paper height')
  const R = ball.R_m
  const m = ball.m_kg
  const A = Math.PI * R * R
  const V = (4 / 3) * Math.PI * R ** 3
  const vz0 = inp.vz0_mps ?? 0
  const omega = inp.omega_radps ?? 0

  const gEff = fx.buoyancy ? g * (1 - (rho * V) / m) : g
  const kDrag = fx.drag ? (rho * ball.Cd * A) / (2 * m) : 0
  const kMag = fx.magnus ? (rho * A) / (2 * m) : 0
  // Spin axis unit vector: y^ x heading^, heading = (v0, vz0) horizontal.
  const hn = Math.hypot(inp.v0_mps, vz0) || 1
  const ax = vz0 / hn
  const az = -inp.v0_mps / hn

  const deriv = (s: State): State => {
    const [, , , vx, vy, vz] = s
    const sp = Math.hypot(vx, vy, vz)
    let ax_ = -kDrag * sp * vx
    let ay_ = -gEff - kDrag * sp * vy
    let az_ = -kDrag * sp * vz
    if (kMag > 0 && sp > 0 && omega > 0) {
      const CL = magnusLiftCoefficient((R * omega) / sp)
      // omega^ x v with omega^ = (ax, 0, az)
      const cx = -az * vy
      const cy = az * vx - ax * vz
      const cz = ax * vy
      // |v|^2 (omega^ x v^) = |v| (omega^ x v)
      const f = kMag * CL * sp
      ax_ += f * cx
      ay_ += f * cy
      az_ += f * cz
    }
    return [vx, vy, vz, ax_, ay_, az_]
  }
  const step = (s: State, h: number): State => {
    const add = (a: State, b: State, c: number): State => [a[0] + c * b[0], a[1] + c * b[1], a[2] + c * b[2], a[3] + c * b[3], a[4] + c * b[4], a[5] + c * b[5]]
    const k1 = deriv(s)
    const k2 = deriv(add(s, k1, h / 2))
    const k3 = deriv(add(s, k2, h / 2))
    const k4 = deriv(add(s, k3, h))
    return [0, 1, 2, 3, 4, 5].map((i) => s[i]! + (h / 6) * (k1[i]! + 2 * k2[i]! + 2 * k3[i]! + k4[i]!)) as State
  }
  const point = (t: number, s: State): TrajectoryPoint => ({ t_s: t, x_m: s[0], y_m: s[1], z_m: s[2], vx_mps: s[3], vy_mps: s[4], vz_mps: s[5] })

  const yLand = paper + R
  let s: State = [0, inp.H_m + R, 0, inp.v0_mps, 0, vz0]
  let t = 0
  const trajectory: TrajectoryPoint[] = []
  const rate = inp.sampleRate_hz ?? 0
  let nextSample = 0
  if (rate > 0) { trajectory.push(point(0, s)); nextSample = 1 / rate }
  for (let n = 0; n < 1e6; n++) {
    const next = step(s, dt)
    if (next[1] <= yLand) {
      const h = brent((u) => step(s, u)[1] - yLand, 0, dt, 1e-15)
      const end = step(s, h)
      const tEnd = t + h
      if (rate > 0) {
        while (nextSample < tEnd - 1e-12) {
          trajectory.push(point(nextSample, step(s, nextSample - t)))
          nextSample += 1 / rate
        }
        trajectory.push(point(tEnd, end))
      }
      return {
        t_flight_s: tEnd, x_land_m: end[0], z_land_m: end[2],
        vx_impact_mps: end[3], vy_impact_mps: end[4], vz_impact_mps: end[5], speed_impact_mps: Math.hypot(end[3], end[4], end[5]),
        trajectory,
      }
    }
    if (rate > 0) {
      while (nextSample <= t + dt + 1e-12) {
        trajectory.push(point(nextSample, step(s, nextSample - t)))
        nextSample += 1 / rate
      }
    }
    s = next
    t += dt
  }
  throw new Error('simulateFlight: did not land')
}
