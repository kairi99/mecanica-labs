// The ball on the TABLE after the rail tip: ballistic arcs, impacts, hops, then slip and roll to the edge. Pure, deterministic.
//
// Frame (table frame): x_m of the ball CENTRE measured from the table edge (the table is x < 0; the ball is on it while x < 0), h_m the
// centre height above the table top (a ball resting on the table has h = R). Planar motion along the heading (the lateral drift is added by
// the caller). Spin omega_radps: + is forward rolling (omega = vx / R is rolling without slipping).
//
// 1) Airborne arcs: gravity only, y(t) = h + vy t - g t^2 / 2, x(t) = x + vx t (closed form; the first arc and the hops last tens of
//    milliseconds and, for hops of millimetres, microseconds, so air drag, buoyancy and Magnus are NEGLECTED here: the largest term is the
//    ping-pong ball's drag on the first arc, k_d v^2 ~ 0.2 m/s^2 against g, about 2 % of g, and it is not applied; the flight from the
//    edge does include the air).
// 2) Impact when the centre height falls to R: impactSphere (impact.ts) with the ball's e_table and mu_k. Energy lost is recorded.
// 3) The ball hops again while the rebound speed is at least `hopMin_vUp_mps` (TABLE_HOP_MIN_vUp_mps, ASSUMED); the sequence is
//    geometric (the rebound falls by about e_n each time) and ends there, or at TABLE_MAX_IMPACTS as a safety cap. Rebound energy below the
//    threshold is discarded and booked as `reboundDiscarded_J` (the ball lies on the table).
// 4) In contact: slip then roll with the existing closed forms (junction.ts, slipFromState and tableRollFrom), from the post-impact (v, omega)
//    and the remaining distance to the edge.
// 5) EDGE. If the centre crosses x = 0 while AIRBORNE, the ball leaves the table right there with its (vx, vy) and height (a diagonal
//    launch; vy may be up or down). A hop that would land beyond the edge simply continues as flight (the table ends). If the ball
//    reaches the edge in contact (slipping or rolling) the launch is horizontal. Impacts on the corner of the edge (a ball whose bottom
//    passes just over the corner) are NEGLECTED.
//
// Energy ledger (exact, tested): energyStart_J = energyEnd_J + impacts + reboundDiscarded + slip + roll, with E = (1/2) m (vx^2 + vy^2) +
// (1/2) k m R^2 omega^2 + m g h. `roll_J` is rolling resistance and drag on the rolling part (0 when c_rr = 0 and kappa = 0).
import type { BallSpec } from './constants.ts'
import { TABLE_HOP_MIN_vUp_mps, TABLE_MAX_IMPACTS } from './constants.ts'
import { impactSphere } from './impact.ts'
import { quadraticDragMotion } from './incline.ts'
import { slipFromState, tableRollDecel_mps2, tableRollFrom } from './junction.ts'

export interface TablePhaseInput {
  ball: BallSpec
  g_mps2: number
  /** Start state: centre x (< 0 on the table), centre height above the table top (raised to R if lower: a ball cannot start inside the table), velocity, spin. */
  x0_m: number
  h0_m: number
  vx0_mps: number
  vy0_mps: number
  omega0_radps: number
  /** Drag constant on the flat, k_d / (1 + k_body), 1/m, for the rolling part (0 = none). */
  kappaRoll_pm: number
  /** Time of the start (default 0): all times in the result are absolute from there. */
  t0_s?: number
  hopMin_vUp_mps?: number
  maxImpacts?: number
  /** > 0: also return samples at this rate, Hz. */
  sampleRate_hz?: number
}

export interface TableImpact {
  t_s: number
  /** Centre x of the impact, m. */
  x_m: number
  vx_before_mps: number
  vy_before_mps: number
  omega_before_radps: number
  vx_after_mps: number
  vy_after_mps: number
  omega_after_radps: number
  energyLost_J: number
  /** The ball hops again (rebound at or above the threshold). */
  hops: boolean
  /** The friction cap was reached in the impact (no slip after it). */
  sticking: boolean
}

export interface TableSample {
  t_s: number
  x_m: number
  /** Centre height above the table top, m. */
  h_m: number
  vx_mps: number
  vy_mps: number
  phase: 'air' | 'impact' | 'slip' | 'roll'
}

export type TableExit =
  /** The centre crossed the edge in the air: diagonal launch. */
  | 'airborneEdge'
  /** In contact and rolling at the edge: horizontal launch (if v^2 >= g R). */
  | 'rollingEdge'
  /** In contact and still slipping at the edge: horizontal launch. */
  | 'slippingEdge'
  /** Came to rest on the table (or never moved forward). */
  | 'stopped'

export interface TablePhaseResult {
  exit: TableExit
  /** Absolute time of the exit (edge crossing, or the stop), s. */
  t_exit_s: number
  /** Number of rebounds that continued the motion (hops after the first impact). */
  hops: number
  impacts: TableImpact[]
  /** The ball settled into contact before the exit (false: it left in the air, or never touched). */
  settled: boolean
  /** Time and centre x at which it settled (contact begins), if settled. */
  settleT_s: number | null
  settleX_m: number | null
  /** State at the exit (x_m is 0 for the edge exits; the rest point for 'stopped'). */
  x_exit_m: number
  h_exit_m: number
  vx_exit_mps: number
  vy_exit_mps: number
  omega_exit_radps: number
  /** Rolling speed at the start of rolling (angular-momentum value), m/s; 0 if the ball never settled. */
  vRoll_mps: number
  /** Centre travel while slipping on the table (full slip distance, or up to the edge), m. */
  slipDistance_m: number
  energy: {
    start_J: number
    end_J: number
    impacts_J: number
    reboundDiscarded_J: number
    slip_J: number
    roll_J: number
  }
  samples: TableSample[]
}

/** Run the table phase; see the file header. */
export function simulateTablePhase(inp: TablePhaseInput): TablePhaseResult {
  const { ball: b, g_mps2: g } = inp
  const R = b.R_m, k = b.k_body, m = b.m_kg
  const hopMin = inp.hopMin_vUp_mps ?? TABLE_HOP_MIN_vUp_mps
  const maxImpacts = inp.maxImpacts ?? TABLE_MAX_IMPACTS
  const rate = inp.sampleRate_hz ?? 0
  let t = inp.t0_s ?? 0
  let x = inp.x0_m, h = Math.max(inp.h0_m, R), vx = inp.vx0_mps, vy = inp.vy0_mps, om = inp.omega0_radps
  const energy = (hh: number, a: number, c: number, w: number): number => 0.5 * m * (a * a + c * c) + 0.5 * k * m * R * R * w * w + m * g * hh
  const E0 = energy(h, vx, vy, om)
  const led = { impacts_J: 0, reboundDiscarded_J: 0, slip_J: 0, roll_J: 0 }
  const samples: TableSample[] = []
  const impacts: TableImpact[] = []
  const push = (tt: number, xx: number, hh: number, a: number, c: number, phase: TableSample['phase']): void => { if (rate > 0) samples.push({ t_s: tt, x_m: xx, h_m: hh, vx_mps: a, vy_mps: c, phase }) }
  let nextK = rate > 0 ? Math.floor(t * rate + 1e-9) + 1 : 0
  /** Samples on the global grid strictly inside (tA, tA + dur). */
  const grid = (tA: number, dur: number, at: (tau: number) => [number, number, number, number], phase: TableSample['phase']): void => {
    if (rate <= 0) return
    while (nextK / rate < tA + dur - 1e-12) {
      const tt = nextK / rate
      const [xx, hh, a, c] = at(tt - tA)
      push(tt, xx, hh, a, c, phase)
      nextK++
    }
  }
  const result = (p: Pick<TablePhaseResult, 'exit' | 'x_exit_m' | 'h_exit_m' | 'vx_exit_mps' | 'vy_exit_mps' | 'omega_exit_radps'> & Partial<TablePhaseResult>): TablePhaseResult => ({
    t_exit_s: t, hops: impacts.filter((i) => i.hops).length, impacts, settled: false, settleT_s: null, settleX_m: null, vRoll_mps: 0, slipDistance_m: 0,
    energy: { start_J: E0, end_J: energy(p.h_exit_m, p.vx_exit_mps, p.vy_exit_mps, p.omega_exit_radps), ...led }, samples, ...p,
  })

  push(t, x, h, vx, vy, 'air')
  if (!(vx > 0)) return result({ exit: 'stopped', x_exit_m: x, h_exit_m: h, vx_exit_mps: 0, vy_exit_mps: 0, omega_exit_radps: om })

  for (let n = 0; n < maxImpacts; n++) {
    const disc = Math.max(0, vy * vy + 2 * g * (h - R))
    const tHit = Math.max(0, (vy + Math.sqrt(disc)) / g)
    const tEdge = -x / vx
    const arcAt = (x0: number, h0: number, vy0: number, vx0: number) => (tau: number): [number, number, number, number] =>
      [x0 + vx0 * tau, h0 + vy0 * tau - 0.5 * g * tau * tau, vx0, vy0 - g * tau]
    if (tEdge < tHit) {
      grid(t, tEdge, arcAt(x, h, vy, vx), 'air')
      const hE = h + vy * tEdge - 0.5 * g * tEdge * tEdge
      const vyE = vy - g * tEdge
      t += tEdge
      push(t, 0, hE, vx, vyE, 'air')
      return result({ exit: 'airborneEdge', x_exit_m: 0, h_exit_m: hE, vx_exit_mps: vx, vy_exit_mps: vyE, omega_exit_radps: om })
    }
    grid(t, tHit, arcAt(x, h, vy, vx), 'air')
    x += vx * tHit
    t += tHit
    const vyIn = Math.min(0, vy - g * tHit)
    h = R
    const imp = impactSphere({ vx_mps: vx, vy_mps: vyIn, omega_radps: om, R_m: R, m_kg: m, k_body: k, e_n: b.e_table, mu: b.mu_k })
    const hops = imp.vy_mps >= hopMin && n + 1 < maxImpacts
    impacts.push({
      t_s: t, x_m: x, vx_before_mps: vx, vy_before_mps: vyIn, omega_before_radps: om,
      vx_after_mps: imp.vx_mps, vy_after_mps: hops ? imp.vy_mps : 0, omega_after_radps: imp.omega_radps, energyLost_J: imp.energyLost_J, hops, sticking: imp.sticking,
    })
    led.impacts_J += imp.energyLost_J
    push(t, x, h, imp.vx_mps, hops ? imp.vy_mps : 0, 'impact')
    vx = imp.vx_mps
    om = imp.omega_radps
    if (hops) { vy = imp.vy_mps; continue }
    led.reboundDiscarded_J += 0.5 * m * imp.vy_mps * imp.vy_mps
    vy = 0
    break
  }

  // ---- contact: slip then roll over the rest of the table ----
  const settleT = t, settleX = x
  if (!(vx > 1e-12)) return result({ exit: 'stopped', x_exit_m: x, h_exit_m: R, vx_exit_mps: 0, vy_exit_mps: 0, omega_exit_radps: om, settled: true, settleT_s: settleT, settleX_m: settleX })
  const remaining = -x
  const slip = slipFromState(vx, om, R, k, b.mu_k, g)
  const roll = tableRollFrom({ v_mps: vx, omega_radps: om, remaining_m: remaining, R_m: R, m_kg: m, k_body: k, mu_k: b.mu_k, c_rr: b.c_rr, g_mps2: g, kappaRoll_pm: inp.kappaRoll_pm })
  led.slip_J = roll.slipEnergyLost_J
  led.roll_J = roll.rollEnergyLost_J
  // sampling of the slip (exact parabola) and the roll (constant-deceleration interpolation between the exact end states)
  const tSlip = roll.slipTime_s
  const aSlip = slip.slipSign * b.mu_k * g
  const xSlipEnd = x + (roll.rollingAtEdge ? slip.slipDistance_m : remaining)
  if (Number.isFinite(aSlip) && tSlip > 0) grid(t, tSlip, (tau) => [x + vx * tau + 0.5 * aSlip * tau * tau, R, vx + aSlip * tau, 0], 'slip')
  if (roll.rollingAtEdge) {
    const tRoll = roll.t_s - tSlip
    const vStart = slip.vRoll_mps
    const stopDist = roll.stopped ? quadraticDragMotion(vStart, -tableRollDecel_mps2(b.c_rr, k, g), inp.kappaRoll_pm, remaining - slip.slipDistance_m).s_used_m : remaining - slip.slipDistance_m
    const vEnd = roll.v_edge_mps
    const dec = tRoll > 0 ? (vStart - vEnd) / tRoll : 0
    if (tRoll > 0) grid(t + tSlip, tRoll, (tau) => [xSlipEnd + vStart * tau - 0.5 * dec * tau * tau, R, vStart - dec * tau, 0], 'roll')
    if (roll.stopped) {
      t += roll.t_s
      const xs = xSlipEnd + stopDist
      push(t, xs, R, 0, 0, 'roll')
      return result({ exit: 'stopped', x_exit_m: xs, h_exit_m: R, vx_exit_mps: 0, vy_exit_mps: 0, omega_exit_radps: 0, settled: true, settleT_s: settleT, settleX_m: settleX, vRoll_mps: slip.vRoll_mps, slipDistance_m: slip.slipDistance_m })
    }
  }
  t += roll.t_s
  push(t, 0, R, roll.v_edge_mps, 0, roll.rollingAtEdge ? 'roll' : 'slip')
  return result({
    exit: roll.rollingAtEdge ? 'rollingEdge' : 'slippingEdge', x_exit_m: 0, h_exit_m: R, vx_exit_mps: roll.v_edge_mps, vy_exit_mps: 0, omega_exit_radps: roll.omega_edge_radps,
    settled: true, settleT_s: settleT, settleX_m: settleX, vRoll_mps: slip.vRoll_mps, slipDistance_m: roll.slipDistance_m,
  })
}
