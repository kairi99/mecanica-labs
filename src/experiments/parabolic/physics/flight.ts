// Projectile flight from the table edge to the paper. Pure, deterministic. Fixed-step RK4.
// Frame: x horizontal away from the edge, y up (floor reference y = 0, ball CENTRE height), z lateral.
// Start (legacy, horizontal launch): centre at x = 0, y = H + R (ball resting on the table top at the edge), velocity (v0, 0, vz0).
// General start (since the diagonal-launch model): any centre position (x0_m, y0_m, z0_m) and velocity (vx0, vy0, vz0). x0 < 0 is a ball
// still on the table side (airborne over the table); x0 > 0 a ball already beyond the edge (an overhanging rail tip). The spin axis stays the
// horizontal axis perpendicular to the INITIAL horizontal heading (vx0, vz0); omega is constant.
// Edge crossing: the guide's stopwatch starts when the ball reaches the table edge (centre x = 0). `t_flight_s` and `launch` are measured
// from that instant. If x0 < 0 it is found in the integration (Brent on the step). If x0 >= 0 the caller gives the crossing that happened
// BEFORE the start (`edgeCrossing`: how long ago and the state then, e.g. on the rail for an overhang); x0 = 0 without it means the start IS the crossing.
// Forces (ball mass m, volume V = 4/3 pi R^3, area A = pi R^2, air density rho):
//   weight less buoyancy   -(m - rho V) g y^
//   quadratic drag         -(1/2) rho Cd A |v| v           (Cd constant; Re ~ 1e3-1e4, PARAMETERS.md)
//   Magnus (topspin)       (1/2) rho A C_L(S) |v|^2 (omega^ x v^),  S = R omega / |v|
// Added mass: accelerating a sphere in air also accelerates ~ rho V / 2 of air, so the inertia is m + rho V / 2 and
//   a = [(m - rho V) g + F_air] / (m + rho V / 2).
// The `buoyancy` switch turns on both the displaced-air weight and the added mass (they are the same physics: the body
// displaces air), so the two stay consistent. Without it: a = g + F_air / m. The spin axis is horizontal and
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

/** State of the ball centre at the instant it crosses the table edge (x = 0): the launch state of the guide's flight. */
export interface EdgeLaunchState {
  /** Ball centre height above the floor reference, m. */
  y_m: number
  vx_mps: number
  vy_mps: number
  vz_mps: number
  speed_mps: number
  /** Launch angle above the horizontal, rad: atan2(vy, horizontal speed). Negative = launched downward (0 = horizontal). */
  angle_rad: number
}

export interface FlightInput {
  ball: BallSpec
  /** Horizontal launch speed along the table, m/s (legacy name; = vx0_mps when vx0_mps is not given). */
  v0_mps?: number
  /** Initial horizontal velocity x component, m/s (default v0_mps). */
  vx0_mps?: number
  /** Initial vertical velocity, m/s (+ up, default 0). */
  vy0_mps?: number
  /** Initial centre position x (from the table edge), m (default 0). */
  x0_m?: number
  /** Initial centre height above the floor reference, m (default H_m + R). */
  y0_m?: number
  /** Initial lateral position, m (default 0). */
  z0_m?: number
  /** For x0_m >= 0 only: the edge crossing that happened before the start (see the header). */
  edgeCrossing?: { tBeforeStart_s: number } & Pick<EdgeLaunchState, 'y_m' | 'vx_mps' | 'vy_mps'>
  /** Lateral launch speed component, m/s (z direction). */
  vz0_mps?: number
  /** Topspin angular speed, rad/s (about the horizontal axis perpendicular to the heading). */
  omega_radps?: number
  /** Table height H, m: fall of the ball centre from edge to contact (needed when y0_m is not given). */
  H_m?: number
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
  /** Time from the EDGE CROSSING (the guide's stopwatch start) to the ball touching the paper, s. */
  t_flight_s: number
  /** Time from the start of the integration to the contact, s (= t_flight_s for a launch from the edge). */
  t_total_s: number
  /** Launch state at the edge crossing (position x = 0, y, vx, vy, angle). */
  launch: EdgeLaunchState
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

/** Vacuum projectile height after t: y = y0 + vy0 t - g t^2 / 2 (closed form for tests and checks). */
export const vacuumHeight_m = (y0_m: number, vy0_mps: number, g_mps2: number, t_s: number): number => y0_m + vy0_mps * t_s - 0.5 * g_mps2 * t_s * t_s

/** Vacuum time at which the height first falls to yTarget_m (descending branch): t = [vy0 + sqrt(vy0^2 + 2 g (y0 - yTarget))] / g. */
export const vacuumTimeToHeight_s = (y0_m: number, vy0_mps: number, yTarget_m: number, g_mps2: number): number =>
  (vy0_mps + Math.sqrt(vy0_mps * vy0_mps + 2 * g_mps2 * (y0_m - yTarget_m))) / g_mps2

/** Integrate the flight to the paper (RK4 + Brent on the last step). Throws if the start is not above the landing height. */
export function simulateFlight(inp: FlightInput): FlightResult {
  const { ball, g_mps2: g, rho_air_kgpm3: rho } = inp
  const fx = inp.effects ?? ALL_EFFECTS
  const dt = inp.dt_s ?? DEFAULT_DT_s
  const paper = inp.paperHeight_m ?? 0
  const R = ball.R_m
  const m = ball.m_kg
  const A = Math.PI * R * R
  const V = (4 / 3) * Math.PI * R ** 3
  const vz0 = inp.vz0_mps ?? 0
  const omega = inp.omega_radps ?? 0
  const vx0 = inp.vx0_mps ?? inp.v0_mps
  if (vx0 === undefined) throw new RangeError('simulateFlight: give v0_mps or vx0_mps')
  const vy0 = inp.vy0_mps ?? 0
  const x0 = inp.x0_m ?? 0
  const y0 = inp.y0_m ?? (inp.H_m !== undefined ? inp.H_m + R : NaN)
  if (!Number.isFinite(y0)) throw new RangeError('simulateFlight: give y0_m or H_m')

  const mInertia = fx.buoyancy ? m + (rho * V) / 2 : m
  const gEff = fx.buoyancy ? (g * (m - rho * V)) / mInertia : g
  const kDrag = fx.drag ? (rho * ball.Cd * A) / (2 * mInertia) : 0
  const kMag = fx.magnus ? (rho * A) / (2 * mInertia) : 0
  // Spin axis unit vector: y^ x heading^, heading = (v0, vz0) horizontal.
  const hn = Math.hypot(vx0, vz0) || 1
  const ax = vz0 / hn
  const az = -vx0 / hn

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
  if (!(y0 > yLand)) throw new RangeError('simulateFlight: table height must exceed the paper height')
  let s: State = [x0, y0, inp.z0_m ?? 0, vx0, vy0, vz0]
  let t = 0
  const mkLaunch = (y: number, vx: number, vy: number, vz: number): EdgeLaunchState => ({
    y_m: y, vx_mps: vx, vy_mps: vy, vz_mps: vz, speed_mps: Math.hypot(vx, vy, vz), angle_rad: Math.atan2(vy, Math.hypot(vx, vz)),
  })
  // edge crossing: time from the start (negative: it happened before) and the state there
  let tCross: number | null = null
  let launch: EdgeLaunchState | null = null
  if (x0 > 0) {
    if (!inp.edgeCrossing) throw new RangeError('simulateFlight: a start beyond the edge needs edgeCrossing')
    tCross = -inp.edgeCrossing.tBeforeStart_s
    launch = mkLaunch(inp.edgeCrossing.y_m, inp.edgeCrossing.vx_mps, inp.edgeCrossing.vy_mps, vz0)
  } else if (x0 === 0) {
    tCross = 0
    launch = mkLaunch(y0, vx0, vy0, vz0)
  }
  const trajectory: TrajectoryPoint[] = []
  const rate = inp.sampleRate_hz ?? 0
  let nextSample = 0
  if (rate > 0) { trajectory.push(point(0, s)); nextSample = 1 / rate }
  for (let n = 0; n < 1e6; n++) {
    const next = step(s, dt)
    if (tCross === null && next[0] >= 0) {
      const h = brent((u) => step(s, u)[0], 0, dt, 1e-15)
      const c = step(s, h)
      tCross = t + h
      launch = mkLaunch(c[1], c[3], c[4], c[5])
    }
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
      if (tCross === null || launch === null) throw new RangeError('simulateFlight: the ball touched down before reaching the table edge')
      return {
        t_flight_s: tEnd - tCross, t_total_s: tEnd, launch, x_land_m: end[0], z_land_m: end[2],
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
