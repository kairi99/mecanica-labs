// A DigiCart that leaves the rail end (no receiver) falls to the floor. Pure and deterministic: ballistic flight of the cart's centre of
// mass (no air drag, no rotation: a point mass), a few bounces with a constant restitution, then a slide to rest with Coulomb friction.
// Only the cart's translation is modelled. Parameters (restitution, floor friction, free-end sag) are ASSUMED, see PARAMETERS.md.
import { BOUNCE_MIN_mps, FLOOR_FRICTION_COEFF, FLOOR_RESTITUTION } from './constants.ts'

const MAX_BOUNCES = 6

/** One flight arc: starts at t0_s with vertical speed vy0 (up positive) from height y0, ends when it meets the floor. */
export interface FlightArc { t0_s: number; vy0_mps: number; y0_m: number; t1_s: number }

/** Plain data (JSON-safe): everything fallAt needs. */
export interface FallPlan {
  g_mps2: number
  /** Horizontal speed at the rail end (away from the rail), m/s. */
  vx_mps: number
  /** Height of the cart's centre of mass above the floor when it leaves the rail end, m. */
  h_m: number
  arcs: FlightArc[]
  /** Time of the first impact, speed at it (downward, positive), horizontal distance there, m. */
  tLand_s: number
  vImpact_mps: number
  xLand_m: number
  /** Time the last arc ends and the slide starts; time at rest; horizontal distance at rest, m. */
  tSlide_s: number
  tRest_s: number
  xRest_m: number
  mu: number
}

export interface FallInput {
  g_mps2: number
  /** Speed along the rail when the cart's centre reaches the rail end, m/s, and the rail slope there (positive: sloping down toward the free end), rad. */
  vExit_mps: number
  slope_rad: number
  h_m: number
}

/** Plan the fall of a cart that leaves the rail end with speed vExit along a rail sloping down by slope_rad, from height h_m. */
export function planFall(inp: FallInput, restitution = FLOOR_RESTITUTION, mu = FLOOR_FRICTION_COEFF): FallPlan {
  const g = inp.g_mps2
  const vx = inp.vExit_mps * Math.cos(inp.slope_rad)
  const vy0 = -inp.vExit_mps * Math.sin(inp.slope_rad)
  const h = Math.max(0, inp.h_m)
  const arcs: FlightArc[] = []
  const t1 = (vy0 + Math.sqrt(vy0 * vy0 + 2 * g * h)) / g
  arcs.push({ t0_s: 0, vy0_mps: vy0, y0_m: h, t1_s: t1 })
  const vImpact = -(vy0 - g * t1)
  let t = t1
  let vy = restitution * vImpact
  for (let k = 0; k < MAX_BOUNCES && vy >= BOUNCE_MIN_mps; k++) {
    const dur = (2 * vy) / g
    arcs.push({ t0_s: t, vy0_mps: vy, y0_m: 0, t1_s: t + dur })
    t += dur
    vy *= restitution
  }
  const slide = vx / (mu * g)
  return {
    g_mps2: g, vx_mps: vx, h_m: h, arcs, tLand_s: t1, vImpact_mps: vImpact, xLand_m: vx * t1,
    tSlide_s: t, tRest_s: t + slide, xRest_m: vx * t + (vx * vx) / (2 * mu * g), mu,
  }
}

export interface FallPose {
  /** Horizontal distance beyond the point where the cart's centre left the rail, m. */
  x_m: number
  /** Height of the centre of mass above the floor, m. */
  y_m: number
  /** Vertical drop since leaving the rail, m (>= 0). */
  drop_m: number
  /** In contact with the floor (after the first impact, between bounces too is false). */
  onFloor: boolean
  /** Speed of the centre of mass, m/s. */
  speed_mps: number
}

/** Pose t_s after the cart's centre left the rail end. Holds the rest pose after tRest_s. */
export function fallAt(p: FallPlan, t_s: number): FallPose {
  const t = Math.max(0, t_s)
  if (t >= p.tRest_s) return { x_m: p.xRest_m, y_m: 0, drop_m: p.h_m, onFloor: true, speed_mps: 0 }
  if (t >= p.tSlide_s) {
    const tau = t - p.tSlide_s
    const x = p.vx_mps * p.tSlide_s + p.vx_mps * tau - 0.5 * p.mu * p.g_mps2 * tau * tau
    return { x_m: x, y_m: 0, drop_m: p.h_m, onFloor: true, speed_mps: Math.max(0, p.vx_mps - p.mu * p.g_mps2 * tau) }
  }
  let arc = p.arcs[0]!
  for (const a of p.arcs) if (t >= a.t0_s) arc = a
  const tau = Math.min(t, arc.t1_s) - arc.t0_s
  const y = Math.max(0, arc.y0_m + arc.vy0_mps * tau - 0.5 * p.g_mps2 * tau * tau)
  const vy = arc.vy0_mps - p.g_mps2 * tau
  return { x_m: p.vx_mps * t, y_m: y, drop_m: p.h_m - y, onFloor: y <= 1e-9 && t > p.tLand_s - 1e-9, speed_mps: Math.hypot(p.vx_mps, vy) }
}
