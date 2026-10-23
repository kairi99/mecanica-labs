// Rail tip -> table transition, the slip phase and the roll to the table edge. Pure, deterministic.
//
// 1) Corner impact (impulsive, perfectly inelastic, NO rebound: ASSUMED). The ball arrives with speed v along the slope
//    (angle theta) and spin omega0 = v / r_eff from the channel. The normal velocity component is destroyed:
//    v_n^2 = (v sin(theta))^2 + 2 g stepDrop (the fall from a rail-top step adds to it). Along the table it keeps
//    v_h = v cos(theta). During the impact Coulomb friction acts for the whole contact time, so a tangential impulse
//    per unit mass dv = min(mu_k v_n, sticking value) acts at the contact point (ASSUMED: the impact is short and the ball
//    slides throughout). Direction s = sgn(R omega0 - v_h): the contact point slides backwards when R omega > v, so
//    friction pushes the centre forward (+) and slows the spin. The sticking value (rolling reached inside the impact) is
//    |R omega0 - v_h| k/(1 + k). The impulse changes v and u = R omega as  v -> v + s dv,  u -> u - s dv / k, so
//    v + k u (angular momentum about the contact point, per m R) is unchanged.
//    Run scatter (RunOffsets.junctionFactor <= 1, an extra loss: dust, joint, tip) scales the post-impact state (v, u) by f,
//    so the kinetic energy only falls (f^2) and v_roll scales with f.
//
// 2) Slip phase on the table (closed form). Slip speed d = R omega - v; friction mu_k m g opposes it:
//      dv/dt = + s mu_k g,   d(R omega)/dt = - s mu_k g / k,   s = sgn(d)
//    so |d| falls linearly, d'(t) = - s mu_k g (1 + 1/k), and rolling starts at
//      t* = |d1| k / (mu_k g (1 + k)),  v(t) = v1 + s mu_k g t,  centre travel x(t) = v1 t + s mu_k g t^2 / 2.
//    Rolling begins at v = R omega = v_roll = (v_h + k R omega0)/(1 + k) (angular momentum about the contact line
//    conserved; f times that with scatter), after Delta t = |v_roll - v1| / (mu_k g). If the edge is reached first the ball
//    leaves while slipping with the actual v_e = v1 + s mu_k g t_e and omega_e. Rolling resistance and air drag are
//    neglected during the slip (mu_k g >> c_rr g, and the slip lasts ~0.1 s).
//    mu_k = Infinity (the default) is instant rolling: the old model.
//
// 3) Energy: up to the start of rolling the loss is exactly
//      Delta E = (1/2) m (v sin(theta))^2 + m g stepDrop + (1/2) m k/(1 + k) (v cos(theta) - R omega0)^2     (f = 1),
//    the destroyed normal motion plus the slip work, independent of mu_k (angular momentum is conserved, so the end state is
//    fixed). Not clamped: it is >= 0 by construction and the test checks it to 1e-12.
//
// 4) Rolling over the rest of the gap (flat table, single contact at radius R, omega = v / R, inertia (1 + k_body) m):
//      dv/dt = -b - kappa v^2,  b = c_rr g / (1 + k_body),  kappa = k_d / (1 + k_body)  (closed form: quadraticDragMotion).
//    The table normal force is m g (flat, one contact), so F_rr = c_rr m g.

import { quadraticDragMotion } from './incline.ts'

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
  /** Kinetic friction coefficient ball-table. Default Infinity = instant rolling (old model). */
  mu_k?: number
  /** Include the Coulomb friction impulse during the corner impact (default true). false: the whole slip happens on the table afterwards (longer slip). */
  impactFriction?: boolean
  /** Run scatter factor on the post-impact state, <= 1 (extra loss). Default 1. */
  junctionFactor?: number
}

export interface JunctionResult {
  /** Rolling speed at the start of rolling (angular-momentum value, times the scatter factor), m/s. Reached only if the slip ends before the edge. */
  v_roll_mps: number
  /** Kinetic energy dissipated from the arrival at the tip to the start of rolling (impact + slip), J (>= 0, not clamped). */
  energyLost_J: number
  /** Kinetic energy plus the step fall energy just before the corner impact, J. */
  energyBefore_J: number
  /** Centre speed just after the impact (and scatter factor), m/s: start of the slip phase. */
  vPostImpact_mps: number
  /** Spin just after the impact, rad/s. */
  omegaPostImpact_radps: number
  /** Duration of the full slip phase (until rolling), s. 0 if rolling at once. */
  slipTime_s: number
  /** Centre travel during the full slip phase, m. */
  slipDistance_m: number
  /** Slip direction s = sgn(R omega - v) (+1: friction speeds the centre up). */
  slipSign: number
}

/** Corner impact + full slip phase (see header). `v_roll` is the expectation; scatter is applied through `junctionFactor`. */
export function junctionTransition(inp: JunctionInput): JunctionResult {
  const { v_tip_mps: v, theta_rad: th, R_m: R, m_kg: m, k_body: k, rEff_m: rEff, g_mps2: g } = inp
  const mu = inp.mu_k ?? Infinity
  const f = inp.junctionFactor ?? 1
  const omega0 = v / rEff
  const u0 = R * omega0
  const vh = v * Math.cos(th)
  const vn = Math.sqrt((v * Math.sin(th)) ** 2 + 2 * g * inp.stepDrop_m)
  const d0 = u0 - vh
  const sign = d0 > 0 ? 1 : d0 < 0 ? -1 : 0
  // friction impulse during the impact: Coulomb, capped at the value that reaches rolling
  const dv = inp.impactFriction === false ? 0 : Math.min(mu * vn, (Math.abs(d0) * k) / (1 + k))
  const v1 = f * (vh + sign * dv)
  const u1 = f * (u0 - (sign * dv) / k)
  const vRoll = (f * (vh + k * u0)) / (1 + k)
  const d1 = u1 - v1
  const s1 = d1 > 0 ? 1 : d1 < 0 ? -1 : 0
  let slipTime = 0
  let slipDistance = 0
  if (s1 !== 0 && Number.isFinite(mu) && Math.abs(d1) > 1e-14 * (Math.abs(v1) + Math.abs(u1))) {
    slipTime = (Math.abs(d1) * k) / (mu * g * (1 + k))
    slipDistance = v1 * slipTime + 0.5 * s1 * mu * g * slipTime * slipTime
  }
  const energyBefore = 0.5 * m * v * v + 0.5 * k * m * u0 * u0 + m * g * inp.stepDrop_m
  const energyAfter = 0.5 * m * (1 + k) * vRoll * vRoll
  return {
    v_roll_mps: vRoll, energyLost_J: energyBefore - energyAfter, energyBefore_J: energyBefore,
    vPostImpact_mps: v1, omegaPostImpact_radps: u1 / R, slipTime_s: slipTime, slipDistance_m: slipDistance, slipSign: s1,
  }
}

/** Table roll deceleration magnitude from rolling resistance, m/s^2: c_rr g / (1 + k). */
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

/** Roll the gap distance with rolling resistance (constant deceleration) and optional quadratic drag (kappa_pm = k_d/(1 + k)), clamped at rest. */
export function rollGap(v_roll_mps: number, gap_m: number, decel_mps2: number, kappa_pm = 0): GapResult {
  if (gap_m <= 0) return { v_edge_mps: v_roll_mps, t_s: 0, stopped: false }
  const r = quadraticDragMotion(v_roll_mps, -decel_mps2, kappa_pm, gap_m)
  if (r.stopped) return { v_edge_mps: 0, t_s: decel_mps2 > 0 || kappa_pm > 0 ? r.t_s : Infinity, stopped: true }
  return { v_edge_mps: r.v_mps, t_s: r.t_s, stopped: false }
}

export interface TableRollInput {
  junction: JunctionResult
  R_m: number
  m_kg: number
  k_body: number
  mu_k?: number
  c_rr: number
  g_mps2: number
  gap_m: number
  /** Drag constant on the flat, k_d / (1 + k_body), 1/m (0 = no air). */
  kappaRoll_pm: number
}

export interface TableRollResult {
  v_edge_mps: number
  /** Spin at the edge, rad/s (v_edge / R if rolling). */
  omega_edge_radps: number
  /** Time from the corner to the edge (or to the stop), s. */
  t_s: number
  stopped: boolean
  /** True if the slip ended before the edge (the ball leaves rolling). */
  rollingAtEdge: boolean
  /** Centre travel while slipping on the table: the full slip distance, or the gap if the edge came first, m. */
  slipDistance_m: number
  /** Energy lost from arrival at the tip to the edge, excluding rolling resistance and drag on the rolling part, J. */
  energyLostJunction_J: number
}

/** From the post-impact state over the gap: slip (closed form) then rolling, or the edge while still slipping. */
export function tableRoll(inp: TableRollInput): TableRollResult {
  const j = inp.junction
  const { R_m: R, k_body: k, g_mps2: g, gap_m: gap } = inp
  const mu = inp.mu_k ?? Infinity
  if (j.slipTime_s > 0 && j.slipDistance_m >= gap) {
    // edge reached while slipping
    const s = j.slipSign
    const a = s * mu * g
    const v1 = j.vPostImpact_mps
    const t = gap > 0 ? (2 * gap) / (v1 + Math.sqrt(Math.max(0, v1 * v1 + 2 * a * gap))) : 0
    const v = v1 + a * t
    const u = R * j.omegaPostImpact_radps - (a * t) / k
    const keEdge = 0.5 * inp.m_kg * (v * v + k * u * u)
    return { v_edge_mps: v, omega_edge_radps: u / R, t_s: t, stopped: false, rollingAtEdge: false, slipDistance_m: gap, energyLostJunction_J: j.energyBefore_J - keEdge }
  }
  const gapRoll = rollGap(j.v_roll_mps, gap - j.slipDistance_m, tableRollDecel_mps2(inp.c_rr, k, g), inp.kappaRoll_pm)
  return {
    v_edge_mps: gapRoll.v_edge_mps, omega_edge_radps: gapRoll.v_edge_mps / R, t_s: j.slipTime_s + gapRoll.t_s, stopped: gapRoll.stopped, rollingAtEdge: true,
    slipDistance_m: j.slipDistance_m, energyLostJunction_J: j.energyLost_J,
  }
}

/**
 * True if the ball leaves the table horizontally: v^2 >= g R. Below that the ball cannot keep going straight past the
 * edge and rolls over it (circular motion about the edge, v^2 / R < g), so the horizontal-launch model does not apply.
 */
export const leavesHorizontally = (v_edge_mps: number, R_m: number, g_mps2: number): boolean => v_edge_mps * v_edge_mps >= g_mps2 * R_m
