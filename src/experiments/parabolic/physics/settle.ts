// Where the ball comes to rest on the floor after it lands (animation and the view only; the measured range is the first
// contact, see marks.ts). Deterministic hop sequence of a ball on a hard floor, then a short roll-out:
//   each impact:  vertical speed times the restitution e (rigid-body impact), horizontal speed times FLOOR_TANGENT_KEEP (friction
//                 at the contact removes part of the tangential momentum);
//   a hop whose take-off speed is below HOP_MIN_vUp_mps (apex of a few millimetres) ends the hopping;
//   then the ball rolls out with a constant deceleration FLOOR_ROLL_DECEL_mps2 until it stops.
// FLOOR_TANGENT_KEEP, HOP_MIN_vUp_mps, FLOOR_ROLL_DECEL_mps2 and MAX_HOPS are ASSUMED (PARAMETERS.md).
import type { BallSpec } from './constants.ts'

/** Fraction of the horizontal speed that survives each impact. ASSUMED. */
export const FLOOR_TANGENT_KEEP = 0.5
/** A hop with a take-off speed below this ends the hopping, m/s. ASSUMED. */
export const HOP_MIN_vUp_mps = 0.3
/** Deceleration of the final roll-out on the floor, m/s^2. ASSUMED (rough lab floor, a ball that tumbles more than it rolls). */
export const FLOOR_ROLL_DECEL_mps2 = 3
/** At most this many hops after the first contact. ASSUMED. */
export const MAX_HOPS = 6

export interface LandingImpact {
  x_m: number
  z_m: number
  vx_mps: number
  vy_mps: number
  vz_mps: number
}
/** Ball centre displacement from the resting position: lift_m above the resting height (R above the surface), plus where it is on the floor. */
export interface SettlePoint { x_m: number; z_m: number; lift_m: number }
export interface SettlePath {
  /** Time from the first contact until the ball is at rest, s. */
  duration_s: number
  /** Rest point on the floor (centre projection), m. */
  rest: { x_m: number; z_m: number }
  /** Position at tau_s after the first contact (clamped to the rest point). */
  at(tau_s: number): SettlePoint
}

interface Seg { t0: number; dur: number; x0: number; z0: number; vx: number; vz: number; vUp: number }

/**
 * Hop sequence then roll-out after the first contact. Each hop is a parabola (vUp, g); the horizontal motion is uniform while
 * airborne. Rigid-body restitution result for the vertical component; the tangential loss and the roll-out are ASSUMED.
 */
export function settlePath(imp: LandingImpact, ball: BallSpec, g_mps2: number): SettlePath {
  const segs: Seg[] = []
  let t = 0
  let x = imp.x_m, z = imp.z_m, vx = imp.vx_mps, vz = imp.vz_mps
  let vUp = ball.restitution * Math.abs(imp.vy_mps)
  for (let k = 0; k < MAX_HOPS && vUp >= HOP_MIN_vUp_mps; k++) {
    const dur = (2 * vUp) / g_mps2
    segs.push({ t0: t, dur, x0: x, z0: z, vx, vz, vUp })
    x += vx * dur; z += vz * dur; t += dur
    vx *= FLOOR_TANGENT_KEEP; vz *= FLOOR_TANGENT_KEEP
    vUp *= ball.restitution
  }
  // roll-out along the horizontal velocity direction
  const v = Math.hypot(vx, vz)
  const rollDur = v / FLOOR_ROLL_DECEL_mps2
  const rollDist = (v * v) / (2 * FLOOR_ROLL_DECEL_mps2)
  const ux = v > 0 ? vx / v : 0, uz = v > 0 ? vz / v : 0
  const rest = { x_m: x + ux * rollDist, z_m: z + uz * rollDist }
  const rollStart = t
  const duration_s = t + rollDur
  return {
    duration_s, rest,
    at(tau) {
      if (tau >= duration_s) return { x_m: rest.x_m, z_m: rest.z_m, lift_m: 0 }
      const tt = Math.max(0, tau)
      if (tt >= rollStart) {
        const s = tt - rollStart
        const d = v * s - 0.5 * FLOOR_ROLL_DECEL_mps2 * s * s
        return { x_m: x + ux * d, z_m: z + uz * d, lift_m: 0 }
      }
      const sg = segs.find((q) => tt < q.t0 + q.dur) ?? segs[segs.length - 1]!
      const s = tt - sg.t0
      return { x_m: sg.x0 + sg.vx * s, z_m: sg.z0 + sg.vz * s, lift_m: Math.max(0, sg.vUp * s - 0.5 * g_mps2 * s * s) }
    },
  }
}
