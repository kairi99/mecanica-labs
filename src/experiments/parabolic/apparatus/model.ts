// Physics adapter: the ONLY file of the apparatus layer that imports ../physics. It maps the bench (hidden truth plus the
// student's set-up) onto the physics API and flattens the result into plain JSON-safe data. If the physics API changes,
// change this file only.
import {
  BALLS, DEFAULT_SETUP, firstBounce, carbonMark, effectiveRollingRadius_m, sampleRun, simulateLaunch, tableRollDecel_mps2,
  ZERO_RUN, settlePath, type SettlePath, type BallSpec, type CarbonMark, type LaunchSetup, type PaperRect, type RunOffsets, type TrajectoryPoint,
} from '../physics/index.ts'
import { TRAJECTORY_RATE_hz } from './constants.ts'

export type BallId = BallSpec['id']
export const BALL_IDS: readonly BallId[] = ['marble', 'pingpong']
export type { PaperRect, RunOffsets, TrajectoryPoint, SettlePath }
export { insidePaper } from '../physics/index.ts'

export const ballSpec = (id: BallId): BallSpec => BALLS[id]
export const GRAVITY_mps2 = DEFAULT_SETUP.g_mps2

/** The bench as the physics sees it. rise_m is the height of the high support above the rail tip. */
export interface BenchSetup {
  rise_m: number
  gap_m: number
  H_m: number
  /** Drop from the rail tip to the table, m (0 when the tip rests on the table). */
  stepDrop_m: number
}

export type LaunchOutcome = 'landed' | 'stopped' | 'rolledOver'

export interface FlightSummary {
  t_flight_s: number
  x_land_m: number
  z_land_m: number
  vx_impact_mps: number
  vy_impact_mps: number
  vz_impact_mps: number
}

/** Plain, JSON-safe result of one launch (no Infinity, no NaN). Times are from the release instant. */
export interface LaunchSummary {
  outcome: LaunchOutcome
  theta_rad: number
  a_incline_mps2: number
  /** Release position after the run's offset, m along the rail from the low tip. */
  releaseS_m: number
  v_tip_mps: number
  v_roll_mps: number
  v_edge_mps: number
  /** Deceleration on the table over the gap, m/s^2. */
  tableDecel_mps2: number
  /** Time to roll from release to the tip, s; null if the ball never gets there. */
  tTip_s: number | null
  /** Time on the table from the tip to the edge (or to the stop), s. */
  gapTime_s: number
  flight: FlightSummary | null
  /** First bounce after landing (animation / slow-mo only). */
  bounce: { vUp_mps: number; tNext_s: number } | null
}

export interface LaunchRun {
  summary: LaunchSummary
  /** Flight samples from the edge (t = 0) to the landing instant; empty unless sampled. */
  trajectory: TrajectoryPoint[]
}

const toSetup = (b: BenchSetup): LaunchSetup => ({ ...DEFAULT_SETUP, rise_m: b.rise_m, gap_m: b.gap_m, H_m: b.H_m, stepDrop_m: b.stepDrop_m })

/** Draw the offsets of one run (physics variability) from an injected RNG. */
export const drawRunOffsets = (rng: () => number, ball: BallId): RunOffsets => sampleRun(rng, ballSpec(ball))

/** The expectation: all offsets zero. */
export const EXPECTED_OFFSETS: RunOffsets = ZERO_RUN

/**
 * Launch a ball placed at releaseS_m (m from the low tip) on the bench. Needs a rising rail (rise_m > 0); the caller must
 * not call this for a flat or downhill rail (the ball does not move).
 */
export function runLaunch(bench: BenchSetup, ball: BallId, releaseS_m: number, offsets: RunOffsets, sampleRate_hz = 0): LaunchRun {
  const setup = toSetup(bench)
  const spec = ballSpec(ball)
  const r = simulateLaunch(setup, spec, releaseS_m, offsets, { sampleRate_hz })
  const decel = tableRollDecel_mps2(spec.c_rr, spec.k_body, setup.g_mps2)
  const f = r.flight
  const outcome: LaunchOutcome = r.stopped ? 'stopped' : r.leavesHorizontally && f ? 'landed' : 'rolledOver'
  const flight: FlightSummary | null = f && outcome === 'landed'
    ? { t_flight_s: f.t_flight_s, x_land_m: f.x_land_m, z_land_m: f.z_land_m, vx_impact_mps: f.vx_impact_mps, vy_impact_mps: f.vy_impact_mps, vz_impact_mps: f.vz_impact_mps }
    : null
  const bounce = flight ? firstBounce(flight.x_land_m, flight.vx_impact_mps, flight.vy_impact_mps, spec, setup.g_mps2) : null
  return {
    summary: {
      outcome, theta_rad: r.theta_rad, a_incline_mps2: r.a_incline_mps2, releaseS_m: r.releaseS_m,
      v_tip_mps: r.v_tip_mps, v_roll_mps: r.v_roll_mps, v_edge_mps: r.v_edge_mps, tableDecel_mps2: decel,
      tTip_s: Number.isFinite(r.rollDownTime_s) ? r.rollDownTime_s : null, gapTime_s: Number.isFinite(r.gapTime_s) ? r.gapTime_s : 0,
      flight, bounce: bounce ? { vUp_mps: bounce.vUp_mps, tNext_s: bounce.tNext_s } : null,
    },
    trajectory: f && outcome === 'landed' ? f.trajectory : [],
  }
}

/** Flight samples at TRAJECTORY_RATE_hz for a run (used for the animation and the slow-motion clip). */
export const runTrajectory = (bench: BenchSetup, ball: BallId, releaseS_m: number, offsets: RunOffsets): TrajectoryPoint[] =>
  runLaunch(bench, ball, releaseS_m, offsets, TRAJECTORY_RATE_hz).trajectory

/** Carbon mark of the first contact on the marking area (the part of the carbon sheet that lies on the bond paper). */
export const markOnPaper = (x_m: number, z_m: number, ball: BallId, vyImpact_mps: number, area: PaperRect, u_mark: number): CarbonMark =>
  carbonMark(x_m, z_m, ballSpec(ball), vyImpact_mps, area, u_mark)

/** Effective rolling radius in the channel, m (used by the view to draw the ball on the rail). */
export const rollingRadius_m = (ball: BallId): number => effectiveRollingRadius_m(ballSpec(ball).R_m, DEFAULT_SETUP.channelWidth_m)

/** Hops and roll-out of a landed ball (see physics/settle.ts); `at(tau)` is the centre displacement tau_s after the first contact. */
export const settleAfterLanding = (flight: FlightSummary, ball: BallId): SettlePath =>
  settlePath({ x_m: flight.x_land_m, z_m: flight.z_land_m, vx_mps: flight.vx_impact_mps, vy_mps: flight.vy_impact_mps, vz_mps: flight.vz_impact_mps }, ballSpec(ball), GRAVITY_mps2)
