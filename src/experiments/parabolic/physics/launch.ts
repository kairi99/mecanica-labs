// Compose the whole launch. Deterministic given inputs. `run` carries the run-to-run offsets (variability.ts); ZERO_RUN is the expectation.
//
// DEFAULT MODEL ('projectile', since the diagonal-launch update):
//   incline (incline.ts, closed form) -> the ball LEAVES THE RAIL TIP as a projectile -> table phase (tablePhase.ts: ballistic arc,
//   impact with restitution and Coulomb friction, hops, then slip and roll) -> launch at the table edge -> flight (flight.ts) -> paper.
// Rail-tip departure. The ball leaves the end of the rail with the velocity it had on the slope, v_tip along the slope, THETA BELOW the
//   horizontal: (vx, vy) = v_tip (cos theta, -sin theta), and its channel spin omega = v_tip / r_eff (rolling about the contact lines).
//   Its centre is r_eff above the rail top surface, along the rail normal, at the tip: centre = tip + r_eff (sin theta, cos theta) in the
//   (x toward the edge, y up) plane, i.e. (x_tip + r_eff sin theta, tipHeight + r_eff cos theta) over the table top (the ball's bottom is
//   R - r_eff below the contact lines, inside the channel). PIVOT: a ball does not fly off the end but swings about it only if the
//   rail normal force would be negative before the end: v_tip^2 < g cos(theta) r_eff (centripetal condition about the end edge, centre at
//   r_eff from it). The tip speeds here (>= 0.25 m/s; marks of the procedure give ~1.4 m/s) are far above it, so pivoting is neglected; below
//   it the result carries `tipPivot: true` and the ball is STILL launched as a projectile (a slow ball would really drop over the end with
//   a smaller forward speed: not modelled).
//   Run scatter junctionFactor (<= 1: dust, joint, rail end) scales (vx, vy, omega) at the departure: the energy only falls.
// Edge launch. Airborne at the edge (a hop crossing it): diagonal launch with the (vx, vy) there. In contact (slipping or rolling) at the
//   edge: horizontal launch, kept only if v^2 >= g R (leavesHorizontally), otherwise the ball rolls over the edge (no projectile).
// Overhang (gap_m < 0): the tip is beyond the edge, there is no table under the ball; the edge crossing is ON THE RAIL (centre x = 0), the
//   state there (speed from the slope, angle -theta exactly, nothing lost) is the launch state and `tRailAfterEdge_s` the time from it to
//   the tip. `gapTime_s` (tip departure -> edge crossing) is then NEGATIVE, so times from the release add up as before:
//   t_edge = t_tip + gapTime_s, t_land = t_edge + flight.t_flight_s.
// Lateral angle psi (run.lateralAngle_rad) splits the horizontal speed: vx = vh cos psi, vz = vh sin psi; the table phase runs on vh along x
//   (error O(psi^2)) and z grows as z = (x - x_centre_at_tip) tan psi (z = 0 at the tip).
// The ORIGINAL model (perfectly inelastic corner impact, no rebound, junction.ts, horizontal launch always) stays available with
//   ModelOptions.tipModel = 'corner' (also implied by idealJunction) for the ideal-limit tests and comparisons.
import { type BallSpec, type LaunchSetup } from './constants.ts'
import { ALL_EFFECTS, simulateFlight, type FlightEffects, type FlightResult } from './flight.ts'
import { airDragK_pm, quadraticDragMotion, effectiveInertiaFactor, effectiveRollingRadius_m, inclineAcceleration_mps2, inclineAngle_rad, rollDownTime_s, speedAtTip_mps } from './incline.ts'
import { junctionTransition, leavesHorizontally, rollGap, tableRoll, tableRollDecel_mps2 } from './junction.ts'
import { simulateTablePhase, type TableImpact, type TableExit } from './tablePhase.ts'

/** Offsets of one run, all zero for the expectation. */
export interface RunOffsets {
  /** Release position offset along the rail (positive up the slope), m. */
  releaseOffset_m: number
  /** Speed given at release (finger push), m/s, >= 0 down the slope. */
  pushSpeed_mps: number
  /** Extra-loss factor on the post-impact state at the corner, in (0, 1]: 1 = expectation (no extra loss); never above 1 (no energy created). */
  junctionFactor: number
  /** Lateral launch angle off the x axis, rad (gives z drift). */
  lateralAngle_rad: number
  /** Uniform [0,1) draw used by the carbon-mark model (0.5 = median threshold). */
  u_mark: number
}
export const ZERO_RUN: RunOffsets = { releaseOffset_m: 0, pushSpeed_mps: 0, junctionFactor: 1, lateralAngle_rad: 0, u_mark: 0.5 }

/** Switches for isolating one non-ideal effect (default: the full model). */
export interface ModelOptions {
  /** Air terms of the flight. */
  effects?: FlightEffects
  /** 'projectile' (default): the ball leaves the tip as a projectile and bounces on the table. 'corner': the original inelastic-corner model, always a horizontal launch. */
  tipModel?: 'projectile' | 'corner'
  /** Skip the junction (implies tipModel 'corner'): v_roll = v_tip, rolling at once, omega = v/R (lossless corner; energy conserved, an unphysical upper bound). */
  idealJunction?: boolean
  /** Corner model only: Coulomb friction impulse during the corner impact (default true); false puts the whole slip on the table. */
  impactFriction?: boolean
  /** RK4 step, s. */
  dt_s?: number
  /** Trajectory sampling rate, Hz (0 = none). */
  sampleRate_hz?: number
}

/** One point of the whole path of the ball (tip departure -> table -> flight), launch frame: x from the table edge, y CENTRE height above the floor. */
export interface PathPoint {
  /** Time since the departure from the rail tip, s. */
  t_s: number
  x_m: number
  y_m: number
  z_m: number
  vx_mps: number
  vy_mps: number
  vz_mps: number
  phase: 'air' | 'impact' | 'slip' | 'roll' | 'flight'
}

/** What happened on the table between the rail tip and the edge (null for the corner model and for an overhanging tip, where there is no table phase). */
export interface TableRecord {
  exit: TableExit
  /** Impacts on the table in order (time since the tip departure, position, velocities before and after). */
  impacts: TableImpact[]
  /** Rebounds that continued the motion (hops). */
  hops: number
  /** The ball settled into contact (slip/roll) before the edge. */
  settled: boolean
  /** Energy ledger of the table phase, J (E = translation + rotation + m g h over the table top): start = end + the four losses. */
  energy: { start_J: number; end_J: number; impacts_J: number; reboundDiscarded_J: number; slip_J: number; roll_J: number }
}

/** The launch at the table edge (the instant the stopwatch of the guide starts). */
export interface EdgeLaunch {
  /** 'horizontal': in contact at the edge (also the corner model). 'diagonal': airborne at the edge (a hop) or on the rail past the edge (overhang). */
  kind: 'horizontal' | 'diagonal'
  /** Leaves in the air mid-hop (true) or in contact (false). Overhang: false (the ball is still on the rail). */
  midHop: boolean
  /** Angle of the velocity above the horizontal, rad; negative = launched downward. */
  angle_rad: number
  speed_mps: number
  vx_mps: number
  vy_mps: number
  /** Centre height above the floor reference at the crossing, m. */
  y_m: number
}

export interface LaunchResult {
  theta_rad: number
  /** Release position actually used, m along the rail from the low tip (after offset). */
  releaseS_m: number
  /** Acceleration along the incline at v = 0, m/s^2 (air drag then reduces it as v grows). */
  a_incline_mps2: number
  /** Speed along the slope at the tip (before the run's extra-loss factor), m/s. */
  v_tip_mps: number
  /** Rolling speed at the start of rolling, m/s (angular-momentum value; 0 if the ball never settled into contact on the table). */
  v_roll_mps: number
  /** Horizontal speed at the table-edge crossing, m/s (before the lateral split). Overhang: the on-rail horizontal speed there. */
  v_edge_mps: number
  /** Spin at the table edge, rad/s: v_edge/R if rolling, the actual slipping value otherwise, the hop's value if airborne (goes to the Magnus term). */
  omega_edge_radps: number
  /** Centre travel while slipping on the table, m (the remaining gap if the ball leaves while slipping). */
  slipDistance_m: number
  /** True if the ball is in contact and rolling at the edge. False: it left in the air or still slipping. */
  rollingAtEdge: boolean
  /** Energy lost on the table before the edge (corner/impacts, rebound discarded, slip), J (rolling resistance and drag not included). */
  energyLostJunction_J: number
  /** True if the ball does not start, or stops on the table before the edge. */
  stopped: boolean
  /** True if the ball is in contact at the edge with v_edge^2 >= g R (horizontal launch). False for a diagonal launch and for a roll-over. */
  leavesHorizontally: boolean
  /** Flight from the edge; null if stopped or rolled over the edge. */
  flight: FlightResult | null
  rollDownTime_s: number
  /** Time from the tip departure to the edge crossing, s (negative for an overhanging tip: the crossing is on the rail). */
  gapTime_s: number
  /** 'projectile' or 'corner' (the model actually used). */
  tipModel: 'projectile' | 'corner'
  /** Effective rolling radius of the ball in the channel, m. */
  rEff_m: number
  /** v_tip^2 < g cos(theta) r_eff: the ball would pivot over the rail end instead of leaving as a projectile (still modelled as a projectile). */
  tipPivot: boolean
  /** Rail tip beyond the table edge (gap_m < 0). */
  overhang: boolean
  /** Overhang only: time on the rail from the edge crossing to the tip departure, s (0 otherwise). */
  tRailAfterEdge_s: number
  /** Table phase record (see TableRecord); null for the corner model, an overhang, or a ball that did not start. */
  table: TableRecord | null
  /** Launch at the edge crossing; null if the ball stopped or rolled over. */
  edgeLaunch: EdgeLaunch | null
  /** Whole path from the tip departure to the contact with the paper, when sampleRate_hz > 0 (otherwise empty). */
  path: PathPoint[]
}

/** Release a ball from rest (plus the run's push) at releaseS_m along the rail from the low tip; see the file header. */
export function simulateLaunch(setup: LaunchSetup, ball: BallSpec, releaseS_m: number, run: RunOffsets = ZERO_RUN, opts: ModelOptions = {}): LaunchResult {
  if (releaseS_m < 0 || releaseS_m > setup.L_rail_m) throw new RangeError('simulateLaunch: release mark is off the rail')
  const s = Math.min(setup.L_rail_m, Math.max(0, releaseS_m + run.releaseOffset_m))
  const g = setup.g_mps2
  const theta = inclineAngle_rad(setup.rise_m, setup.supportDist_m)
  const rEff = effectiveRollingRadius_m(ball.R_m, setup.channelWidth_m)
  const kEff = effectiveInertiaFactor(ball.k_body, ball.R_m, setup.channelWidth_m)
  const fx = opts.effects ?? ALL_EFFECTS
  const kd = fx.drag ? airDragK_pm(setup.rho_air_kgpm3, ball.Cd, ball.R_m, ball.m_kg) : 0
  const a = inclineAcceleration_mps2(theta, kEff, ball.c_rr, g, ball.R_m / rEff)
  const kappaSlope = kd / (1 + kEff)
  const v0 = Math.max(0, run.pushSpeed_mps)
  const v_tip = speedAtTip_mps(s, a, v0, kappaSlope)
  const corner = opts.idealJunction === true || opts.tipModel === 'corner'
  const dead = (stopped: boolean): LaunchResult => ({
    theta_rad: theta, releaseS_m: s, a_incline_mps2: a, v_tip_mps: v_tip, v_roll_mps: 0, v_edge_mps: 0, omega_edge_radps: 0, slipDistance_m: 0, rollingAtEdge: false,
    energyLostJunction_J: 0, stopped, leavesHorizontally: false, flight: null, rollDownTime_s: rollDownTime_s(s, a, v0, kappaSlope), gapTime_s: 0,
    tipModel: corner ? 'corner' : 'projectile', rEff_m: rEff, tipPivot: false, overhang: setup.gap_m < 0, tRailAfterEdge_s: 0, table: null, edgeLaunch: null, path: [],
  })
  if (v_tip === 0) return dead(true)
  const kappaRoll = kd / (1 + ball.k_body)
  const base = dead(false)

  if (corner) {
    // ---- original model: perfectly inelastic corner impact, slip, roll over the gap, horizontal launch ----
    if (setup.gap_m < 0) throw new RangeError("simulateLaunch: an overhanging tip needs the 'projectile' model")
    const decel = tableRollDecel_mps2(ball.c_rr, ball.k_body, g)
    let v_roll: number, gap: { v_edge_mps: number; omega_edge_radps: number; t_s: number; stopped: boolean; rollingAtEdge: boolean; slipDistance_m: number; energyLostJunction_J: number }
    if (opts.idealJunction) {
      v_roll = v_tip
      const r = rollGap(v_roll, setup.gap_m, decel, kappaRoll)
      gap = { v_edge_mps: r.v_edge_mps, omega_edge_radps: r.v_edge_mps / ball.R_m, t_s: r.t_s, stopped: r.stopped, rollingAtEdge: true, slipDistance_m: 0, energyLostJunction_J: 0 }
    } else {
      const j = junctionTransition({
        v_tip_mps: v_tip, theta_rad: theta, R_m: ball.R_m, m_kg: ball.m_kg, k_body: ball.k_body, rEff_m: rEff, stepDrop_m: setup.stepDrop_m, g_mps2: g,
        mu_k: ball.mu_k, junctionFactor: run.junctionFactor, impactFriction: opts.impactFriction,
      })
      v_roll = j.v_roll_mps
      gap = tableRoll({ junction: j, R_m: ball.R_m, m_kg: ball.m_kg, k_body: ball.k_body, mu_k: ball.mu_k, c_rr: ball.c_rr, g_mps2: g, gap_m: setup.gap_m, kappaRoll_pm: kappaRoll })
    }
    const out: LaunchResult = {
      ...base, stopped: gap.stopped, v_roll_mps: v_roll, v_edge_mps: gap.v_edge_mps, omega_edge_radps: gap.omega_edge_radps, slipDistance_m: gap.slipDistance_m,
      rollingAtEdge: gap.rollingAtEdge, energyLostJunction_J: gap.energyLostJunction_J, gapTime_s: gap.t_s,
    }
    if (gap.stopped) return out
    if (!leavesHorizontally(gap.v_edge_mps, ball.R_m, g)) return out
    const flight = simulateFlight({
      ball, v0_mps: gap.v_edge_mps * Math.cos(run.lateralAngle_rad), vz0_mps: gap.v_edge_mps * Math.sin(run.lateralAngle_rad),
      omega_radps: gap.omega_edge_radps, H_m: setup.H_m, paperHeight_m: setup.paperHeight_m, g_mps2: g, rho_air_kgpm3: setup.rho_air_kgpm3,
      effects: fx, dt_s: opts.dt_s, sampleRate_hz: opts.sampleRate_hz,
    })
    return {
      ...out, leavesHorizontally: true, flight,
      edgeLaunch: { kind: 'horizontal', midHop: false, angle_rad: 0, speed_mps: gap.v_edge_mps, vx_mps: gap.v_edge_mps, vy_mps: 0, y_m: setup.H_m + ball.R_m },
    }
  }

  // ---- projectile model: departure from the tip ----
  const psi = run.lateralAngle_rad
  const tanPsi = Math.tan(psi)
  const f = run.junctionFactor
  const cos = Math.cos(theta), sin = Math.sin(theta)
  const xC0 = -setup.gap_m + rEff * sin // centre x at the departure (table frame, edge at 0)
  const h0 = setup.stepDrop_m + rEff * cos // centre height over the table top
  const vh0 = f * v_tip * cos
  const vy0 = -f * v_tip * sin
  const om0 = (f * v_tip) / rEff
  const tipPivot = v_tip * v_tip < g * cos * rEff
  const common = { ...base, tipPivot, v_roll_mps: 0 }
  const flightArgs = { ball, paperHeight_m: setup.paperHeight_m, g_mps2: g, rho_air_kgpm3: setup.rho_air_kgpm3, effects: fx, dt_s: opts.dt_s, sampleRate_hz: opts.sampleRate_hz }
  const rate = opts.sampleRate_hz ?? 0
  const toPath = (t: number, x: number, h: number, vx: number, vy: number, phase: PathPoint['phase']): PathPoint =>
    ({ t_s: t, x_m: x, y_m: setup.H_m + h, z_m: (x - xC0) * tanPsi, vx_mps: vx * Math.cos(psi), vy_mps: vy, vz_mps: vx * Math.sin(psi), phase })

  if (xC0 >= 0) {
    // overhang: the ball is already past the edge at the tip; the edge crossing is on the rail, sRail before the tip
    const sRail = xC0 / cos
    const k2 = 2 * kappaSlope * sRail
    const vE2 = kappaSlope > 0 ? a / kappaSlope + (v_tip * v_tip - a / kappaSlope) * Math.exp(k2) : v_tip * v_tip - 2 * a * sRail
    const vE = Math.sqrt(Math.max(0, vE2))
    const tRail = vE > 0 ? quadraticDragMotion(vE, a, kappaSlope, sRail).t_s : 0
    const hEdge = h0 + sRail * sin
    const vxE = vE * cos, vyE = -vE * sin
    const flight = simulateFlight({
      ...flightArgs, x0_m: xC0, y0_m: setup.H_m + h0, z0_m: 0, vx0_mps: vh0 * Math.cos(psi), vz0_mps: vh0 * Math.sin(psi), vy0_mps: vy0, omega_radps: om0,
      edgeCrossing: { tBeforeStart_s: tRail, y_m: setup.H_m + hEdge, vx_mps: vxE * Math.cos(psi), vy_mps: vyE },
    })
    const path: PathPoint[] = flight.trajectory.map((p) => ({ ...p, phase: 'flight' as const }))
    return {
      ...common, v_edge_mps: vxE, omega_edge_radps: vE / rEff, gapTime_s: -tRail, tRailAfterEdge_s: tRail, flight, path,
      edgeLaunch: { kind: 'diagonal', midHop: false, angle_rad: Math.atan2(vyE, vxE), speed_mps: vE, vx_mps: vxE, vy_mps: vyE, y_m: setup.H_m + hEdge },
    }
  }

  const tp = simulateTablePhase({
    ball, g_mps2: g, x0_m: xC0, h0_m: h0, vx0_mps: vh0, vy0_mps: vy0, omega0_radps: om0, kappaRoll_pm: kappaRoll, sampleRate_hz: rate,
  })
  const table: TableRecord = { exit: tp.exit, impacts: tp.impacts, hops: tp.hops, settled: tp.settled, energy: tp.energy }
  const lost = tp.energy.impacts_J + tp.energy.reboundDiscarded_J + tp.energy.slip_J
  const tablePath = tp.samples.map((p) => toPath(p.t_s, p.x_m, p.h_m, p.vx_mps, p.vy_mps, p.phase))
  const withTable: LaunchResult = {
    ...common, table, v_roll_mps: tp.vRoll_mps, slipDistance_m: tp.slipDistance_m, energyLostJunction_J: lost, gapTime_s: tp.t_exit_s,
    v_edge_mps: tp.vx_exit_mps, omega_edge_radps: tp.omega_exit_radps, rollingAtEdge: tp.exit === 'rollingEdge', path: tablePath,
  }
  if (tp.exit === 'stopped') return { ...withTable, stopped: true, v_edge_mps: 0 }
  const midHop = tp.exit === 'airborneEdge'
  if (!midHop && !leavesHorizontally(tp.vx_exit_mps, ball.R_m, g)) return withTable
  const vh = tp.vx_exit_mps
  const flight = simulateFlight({
    ...flightArgs, x0_m: 0, y0_m: setup.H_m + tp.h_exit_m, z0_m: -xC0 * tanPsi, vx0_mps: vh * Math.cos(psi), vz0_mps: vh * Math.sin(psi), vy0_mps: tp.vy_exit_mps,
    omega_radps: tp.omega_exit_radps,
  })
  const tStart = tp.t_exit_s
  const path = [...tablePath, ...flight.trajectory.slice(rate > 0 ? 1 : 0).map((p) => ({ ...p, t_s: p.t_s + tStart, phase: 'flight' as const }))]
  return {
    ...withTable, leavesHorizontally: !midHop, flight, path,
    edgeLaunch: {
      kind: midHop ? 'diagonal' : 'horizontal', midHop, angle_rad: Math.atan2(tp.vy_exit_mps, vh), speed_mps: Math.hypot(vh, tp.vy_exit_mps), vx_mps: vh, vy_mps: tp.vy_exit_mps,
      y_m: setup.H_m + tp.h_exit_m,
    },
  }
}
