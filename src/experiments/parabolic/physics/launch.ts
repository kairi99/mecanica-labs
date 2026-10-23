// Compose the whole launch: incline -> tip junction -> roll over the gap -> projectile flight. Deterministic given inputs.
// `run` carries the run-to-run offsets (variability.ts); ZERO_RUN is the expectation.
import { type BallSpec, type LaunchSetup } from './constants.ts'
import { ALL_EFFECTS, simulateFlight, type FlightEffects, type FlightResult } from './flight.ts'
import { effectiveInertiaFactor, effectiveRollingRadius_m, inclineAcceleration_mps2, inclineAngle_rad, rollDownTime_s, speedAtTip_mps } from './incline.ts'
import { junctionTransition, leavesHorizontally, rollGap, tableRollDecel_mps2 } from './junction.ts'

/** Offsets of one run, all zero for the expectation. */
export interface RunOffsets {
  /** Release position offset along the rail (positive up the slope), m. */
  releaseOffset_m: number
  /** Speed given at release (finger push), m/s, >= 0 down the slope. */
  pushSpeed_mps: number
  /** Multiplicative factor on v_roll (junction loss scatter), 1 = expectation. */
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
  /** Skip the junction: v_roll = v_tip (lossless corner; energy conserved, an unphysical upper bound). */
  idealJunction?: boolean
  /** RK4 step, s. */
  dt_s?: number
  /** Trajectory sampling rate, Hz (0 = none). */
  sampleRate_hz?: number
}

export interface LaunchResult {
  theta_rad: number
  /** Release position actually used, m along the rail from the low tip (after offset). */
  releaseS_m: number
  /** Acceleration along the incline, m/s^2. */
  a_incline_mps2: number
  v_tip_mps: number
  v_roll_mps: number
  v_edge_mps: number
  energyLostJunction_J: number
  /** True if the ball does not start, or stops on the table before the edge. */
  stopped: boolean
  /** True if v_edge^2 >= g R (otherwise the ball rolls over the edge and the projectile model does not apply). */
  leavesHorizontally: boolean
  /** Flight from the edge; null if stopped or not leaving horizontally. */
  flight: FlightResult | null
  rollDownTime_s: number
  gapTime_s: number
}

/** Release a ball from rest (plus the run's push) at releaseS_m along the rail from the low tip; see the file header. */
export function simulateLaunch(setup: LaunchSetup, ball: BallSpec, releaseS_m: number, run: RunOffsets = ZERO_RUN, opts: ModelOptions = {}): LaunchResult {
  if (releaseS_m < 0 || releaseS_m > setup.L_rail_m) throw new RangeError('simulateLaunch: release mark is off the rail')
  const s = Math.min(setup.L_rail_m, Math.max(0, releaseS_m + run.releaseOffset_m))
  const g = setup.g_mps2
  const theta = inclineAngle_rad(setup.rise_m, setup.supportDist_m)
  const rEff = effectiveRollingRadius_m(ball.R_m, setup.channelWidth_m)
  const kEff = effectiveInertiaFactor(ball.k_body, ball.R_m, setup.channelWidth_m)
  const a = inclineAcceleration_mps2(theta, kEff, ball.c_rr, g)
  const v0 = Math.max(0, run.pushSpeed_mps)
  const v_tip = speedAtTip_mps(s, a, v0)
  const dead = (stopped: boolean): LaunchResult => ({
    theta_rad: theta, releaseS_m: s, a_incline_mps2: a, v_tip_mps: v_tip, v_roll_mps: 0, v_edge_mps: 0, energyLostJunction_J: 0, stopped,
    leavesHorizontally: false, flight: null, rollDownTime_s: rollDownTime_s(s, a, v0), gapTime_s: 0,
  })
  if (v_tip === 0) return dead(true)

  const j = opts.idealJunction
    ? { v_roll_mps: v_tip, energyLost_J: 0 }
    : junctionTransition({ v_tip_mps: v_tip, theta_rad: theta, R_m: ball.R_m, m_kg: ball.m_kg, k_body: ball.k_body, rEff_m: rEff, stepDrop_m: setup.stepDrop_m, g_mps2: g })
  const v_roll = j.v_roll_mps * run.junctionFactor
  const gap = rollGap(v_roll, setup.gap_m, tableRollDecel_mps2(ball.c_rr, ball.k_body, g))
  const out = { ...dead(gap.stopped), v_roll_mps: v_roll, v_edge_mps: gap.v_edge_mps, energyLostJunction_J: j.energyLost_J, gapTime_s: gap.t_s }
  if (gap.stopped) return out
  const leaves = leavesHorizontally(gap.v_edge_mps, ball.R_m, g)
  if (!leaves) return { ...out, leavesHorizontally: false }
  const flight = simulateFlight({
    ball, v0_mps: gap.v_edge_mps * Math.cos(run.lateralAngle_rad), vz0_mps: gap.v_edge_mps * Math.sin(run.lateralAngle_rad),
    omega_radps: gap.v_edge_mps / ball.R_m, H_m: setup.H_m, paperHeight_m: setup.paperHeight_m, g_mps2: g, rho_air_kgpm3: setup.rho_air_kgpm3,
    effects: opts.effects ?? ALL_EFFECTS, dt_s: opts.dt_s, sampleRate_hz: opts.sampleRate_hz,
  })
  return { ...out, leavesHorizontally: true, flight }
}

