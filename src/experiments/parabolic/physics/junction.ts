// Rail tip -> table transition and the roll to the table edge. Pure, deterministic.
//
// Tip (impulsive, inelastic contact, NO rebound: ASSUMED). The ball arrives with speed v along the slope (angle theta)
// and spin omega = v / r_eff from the channel. The velocity component normal to the table (v sin(theta), plus the fall
// from a rail-top step, if any) is destroyed; the component along the table v_h = v cos(theta) is kept. The channel
// spin no longer matches flat rolling (omega = v / R), so friction with the table brings the ball to rolling without
// slipping. Angular momentum about the contact point is conserved (friction acts at the contact point):
//   m R v_h + k m R^2 omega = m R v_roll + k m R^2 (v_roll / R)   ->   v_roll = (v_h + k R omega) / (1 + k).
// Kinetic energy lost = KE before (translation + spin, + the step fall) - KE after >= 0 (dissipation at the impact and the slip).
//
// Table roll over the gap d: rolling resistance force c_rr m g with rolling inertia (1 + k) m:
//   a = -c_rr g / (1 + k),   v_edge^2 = v_roll^2 - 2 c_rr g d / (1 + k)   (the ball stops if this is <= 0).

export interface JunctionInput {
  v_tip_mps: number
  theta_rad: number
  R_m: number
  m_kg: number
  k_body: number
  /** Effective rolling radius in the channel, m (effectiveRollingRadius_m). */
  rEff_m: number
  /** Drop from the rail top to the table, m (ASSUMED 0). */
  stepDrop_m: number
  g_mps2: number
}

export interface JunctionResult {
  /** Rolling speed on the flat just after the transition, m/s. */
  v_roll_mps: number
  /** Kinetic energy dissipated at the transition, J (>= 0). */
  energyLost_J: number
}

/** Slope-to-table transition (see header). `v_roll` is the expectation; scatter is applied by the caller. */
export function junctionTransition(inp: JunctionInput): JunctionResult {
  const { v_tip_mps: v, theta_rad: th, R_m: R, m_kg: m, k_body: k, rEff_m: rEff, g_mps2: g } = inp
  const omega = v / rEff
  const vh = v * Math.cos(th)
  const v_roll = (vh + k * R * omega) / (1 + k)
  const keBefore = 0.5 * m * v * v + 0.5 * k * m * R * R * omega * omega + m * g * inp.stepDrop_m
  const keAfter = 0.5 * m * v_roll * v_roll * (1 + k)
  return { v_roll_mps: v_roll, energyLost_J: Math.max(0, keBefore - keAfter) }
}

/** Table roll deceleration magnitude, m/s^2: c_rr g / (1 + k). */
export function tableRollDecel_mps2(c_rr: number, k_body: number, g_mps2: number): number {
  return (c_rr * g_mps2) / (1 + k_body)
}

export interface GapResult {
  /** Speed at the table edge, m/s (0 if stopped). */
  v_edge_mps: number
  /** Time to cross the gap, s (to the stop if stopped). */
  t_s: number
  /** True if the ball stops on the table before the edge. */
  stopped: boolean
}

/** Roll the gap distance with rolling resistance (constant deceleration), clamped at rest. */
export function rollGap(v_roll_mps: number, gap_m: number, decel_mps2: number): GapResult {
  if (gap_m <= 0) return { v_edge_mps: v_roll_mps, t_s: 0, stopped: false }
  const v2 = v_roll_mps * v_roll_mps - 2 * decel_mps2 * gap_m
  if (v2 <= 0) return { v_edge_mps: 0, t_s: decel_mps2 > 0 ? v_roll_mps / decel_mps2 : Infinity, stopped: true }
  const v = Math.sqrt(v2)
  return { v_edge_mps: v, t_s: decel_mps2 > 0 ? (v_roll_mps - v) / decel_mps2 : gap_m / v_roll_mps, stopped: false }
}

/**
 * True if the ball leaves the table horizontally: v^2 >= g R. Below that the ball cannot keep going straight past the
 * edge and rolls over it (circular motion about the edge, v^2 / R < g), so the horizontal-launch model does not apply.
 */
export const leavesHorizontally = (v_edge_mps: number, R_m: number, g_mps2: number): boolean => v_edge_mps * v_edge_mps >= g_mps2 * R_m
