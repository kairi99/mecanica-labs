// The ball after the end of the rail beam: over the sloped SHOE (optional), ballistic arcs, impacts, hops, then slip and roll on the TABLE
// to the edge. Pure, deterministic.
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
// SHOE (the sloped end piece of the rail, `ramp`). The rail beam ends at the kink; from there a straight ramp (slope alpha below the
// horizontal, steeper than the rail by the kink angle) descends to a low lip. The shoe is a solid wedge: the ball centre can never be below
// the ramp centre line  h_r(x) = hLip + tan(alpha) (xLip - x)  (the top surface offset by r_eff along its normal), for x <= xLip. The ball
// arrives at the kink with the rail velocity and, since the surface turns down by the kink angle (a CONVEX corner), it simply flies on as a
// projectile unless the parabola meets the ramp line: then
//   - it IMPACTS the ramp (impactSphere in the ramp frame with R -> r_eff, k -> k_eff because the friction acts at the contact lines r_eff
//     below the centre; restitution e_table and mu_k of the ball are reused for the shoe surface: ASSUMED),
//   - hops again while the normal rebound is >= the threshold, else it ROLLS down the rest of the ramp: the slip left after the impact is
//     closed at once conserving the angular momentum about the contact line (energy lost booked as slip_J; the slip distance on the ramp is
//     neglected), then constant acceleration a = g (sin alpha - c_rr cos alpha R/r_eff)/(1 + k_eff) (plus quadratic drag) as on the rail,
//   - leaves the lip along the ramp (alpha below the horizontal) with spin v / r_eff, and the table logic takes over.
// The edge crossing can happen while the ball is on the rail, over/on the ramp (the shoe overhangs the edge) or on the table; once it has
// happened the table is no longer there, and the phase ends when the ball passes the lip (or at the crossing if there is no ramp ahead);
// the caller continues with simulateFlight from `x_exit_m` (> 0 then) and `edge` (the crossing state).
//
// Energy ledger (exact, tested): energyStart_J = energyEnd_J + impacts + reboundDiscarded + slip + roll, with E = (1/2) m (vx^2 + vy^2) +
// (1/2) k m R^2 omega^2 + m g h. `roll_J` is rolling resistance and drag on the rolling parts (0 when c_rr = 0 and kappa = 0).
import type { BallSpec } from './constants.ts'
import { TABLE_HOP_MIN_vUp_mps, TABLE_MAX_IMPACTS } from './constants.ts'
import { impactSphere } from './impact.ts'
import { inclineAcceleration_mps2, quadraticDragMotion } from './incline.ts'
import { slipFromState, tableRollDecel_mps2, tableRollFrom } from './junction.ts'

/** The sloped end piece, in the table frame (centre line of the ball: the top surface offset by r_eff along its normal). */
export interface RampSpec {
  /** Ball-centre x at the lip, m. */
  xLip_m: number
  /** Ball-centre height over the table top at the lip, m. */
  hLip_m: number
  /** Slope below the horizontal, rad (> 0). */
  slope_rad: number
  /** Effective rolling radius in the channel, m, and effective inertia factor k_body (R / r_eff)^2. */
  rEff_m: number
  kEff: number
  /** Drag constant on the slope, k_d / (1 + k_eff), 1/m (0 = none). */
  kappaSlope_pm: number
}

export interface TablePhaseInput {
  ball: BallSpec
  g_mps2: number
  /** Start state: centre x, centre height above the table top (raised to R if lower only when there is no ramp), velocity, spin. */
  x0_m: number
  h0_m: number
  vx0_mps: number
  vy0_mps: number
  omega0_radps: number
  /** Drag constant on the flat, k_d / (1 + k_body), 1/m, for the rolling part (0 = none). */
  kappaRoll_pm: number
  /** The shoe, if any. */
  ramp?: RampSpec
  /** The edge crossing already happened before the start (x0_m >= 0): its time (relative to t0, negative) and state. */
  edgeBefore?: { t_s: number; h_m: number; vx_mps: number; vy_mps: number }
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
  /** Which surface: the shoe ramp or the table. */
  surface: 'ramp' | 'table'
  /** Velocities in the horizontal/vertical axes before and after (the ramp impact is solved in the ramp frame and rotated back). */
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
  phase: 'air' | 'impact' | 'ramp' | 'slip' | 'roll'
}

export type TableExit =
  /** The ball is airborne at/after the edge crossing: diagonal launch (x_exit_m is 0, or > 0 when the shoe overhangs the edge). */
  | 'airborneEdge'
  /** In contact on the table and rolling at the edge: horizontal launch (if v^2 >= g R). */
  | 'rollingEdge'
  /** In contact on the table and still slipping at the edge: horizontal launch. */
  | 'slippingEdge'
  /** Came to rest (on the table or the ramp), or never moved forward. */
  | 'stopped'

export interface EdgeState {
  t_s: number
  h_m: number
  vx_mps: number
  vy_mps: number
  /** The crossing happened over the rail or the shoe (the rail end overhangs the edge), not over the table. */
  onRail: boolean
}

export interface TablePhaseResult {
  exit: TableExit
  /** Absolute time of the exit (edge crossing, or the stop, or passing the lip beyond the edge), s. */
  t_exit_s: number
  /** Number of rebounds that continued the motion (hops after an impact), on the ramp and on the table. */
  hops: number
  impacts: TableImpact[]
  /** The ball settled into contact on the TABLE (slip/roll) before the exit (false: it left in the air, or never touched). */
  settled: boolean
  /** Time and centre x at which it settled on the table (contact begins), if settled. */
  settleT_s: number | null
  settleX_m: number | null
  /** The ball rolled down the ramp in contact (after the ramp impacts). */
  rolledOnRamp: boolean
  /** State at the exit (x_m is 0 for the edge exits over the table; the rest point for 'stopped'; xLip for an exit beyond the edge). */
  x_exit_m: number
  h_exit_m: number
  vx_exit_mps: number
  vy_exit_mps: number
  omega_exit_radps: number
  /** State at the edge crossing x = 0 (null if the ball stopped first). For exits over the table it equals the exit state. */
  edge: EdgeState | null
  /** Rolling speed at the start of rolling on the table (angular-momentum value), m/s; 0 if the ball never settled. */
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

/** Run the phase; see the file header. */
export function simulateTablePhase(inp: TablePhaseInput): TablePhaseResult {
  const { ball: b, g_mps2: g } = inp
  const R = b.R_m, k = b.k_body, m = b.m_kg
  const hopMin = inp.hopMin_vUp_mps ?? TABLE_HOP_MIN_vUp_mps
  const maxImpacts = inp.maxImpacts ?? TABLE_MAX_IMPACTS
  const rate = inp.sampleRate_hz ?? 0
  let ramp = inp.ramp
  let t = inp.t0_s ?? 0
  let x = inp.x0_m, vx = inp.vx0_mps, vy = inp.vy0_mps, om = inp.omega0_radps
  let h = ramp ? inp.h0_m : Math.max(inp.h0_m, R)
  if (ramp && x < ramp.xLip_m) h = Math.max(h, ramp.hLip_m + Math.tan(ramp.slope_rad) * (ramp.xLip_m - x)) // a ball cannot start inside the ramp: rest it on the ramp line
  let crossed: EdgeState | null = inp.edgeBefore ? { ...inp.edgeBefore, t_s: (inp.t0_s ?? 0) + inp.edgeBefore.t_s, onRail: true } : null
  const energy = (hh: number, a: number, c: number, w: number): number => 0.5 * m * (a * a + c * c) + 0.5 * k * m * R * R * w * w + m * g * hh
  const E0 = energy(h, vx, vy, om)
  const led = { impacts_J: 0, reboundDiscarded_J: 0, slip_J: 0, roll_J: 0 }
  const samples: TableSample[] = []
  const impacts: TableImpact[] = []
  let rolledOnRamp = false
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
  type Base = Pick<TablePhaseResult, 'exit' | 'x_exit_m' | 'h_exit_m' | 'vx_exit_mps' | 'vy_exit_mps' | 'omega_exit_radps'> & Partial<TablePhaseResult>
  const result = (p: Base): TablePhaseResult => ({
    t_exit_s: t, hops: impacts.filter((i) => i.hops).length, impacts, settled: false, settleT_s: null, settleX_m: null, rolledOnRamp, vRoll_mps: 0, slipDistance_m: 0,
    edge: crossed,
    energy: { start_J: E0, end_J: energy(p.h_exit_m, p.vx_exit_mps, p.vy_exit_mps, p.omega_exit_radps), ...led }, samples, ...p,
  })
  const hr = (xx: number): number => (ramp ? ramp.hLip_m + Math.tan(ramp.slope_rad) * (ramp.xLip_m - xx) : -Infinity)
  const arcAt = (x0: number, h0: number, vy0: number, vx0: number) => (tau: number): [number, number, number, number] =>
    [x0 + vx0 * tau, h0 + vy0 * tau - 0.5 * g * tau * tau, vx0, vy0 - g * tau]

  push(t, x, h, vx, vy, 'air')
  if (!(vx > 0)) return result({ exit: 'stopped', x_exit_m: x, h_exit_m: h, vx_exit_mps: 0, vy_exit_mps: 0, omega_exit_radps: om, edge: null })
  if (ramp && x >= ramp.xLip_m) ramp = undefined
  if (!crossed && x >= 0) crossed = { t_s: t, h_m: h, vx_mps: vx, vy_mps: vy, onRail: true }

  for (let n = 0; n < maxImpacts; n++) {
    if (crossed && !ramp) return result({ exit: 'airborneEdge', x_exit_m: x, h_exit_m: h, vx_exit_mps: vx, vy_exit_mps: vy, omega_exit_radps: om })
    // ---- next event of the airborne arc ----
    const tanA = ramp ? Math.tan(ramp.slope_rad) : 0
    let tRamp = Infinity
    if (ramp) {
      const c = Math.max(0, h - hr(x))
      const B = vy + vx * tanA
      const tr = (B + Math.sqrt(Math.max(0, B * B + 2 * g * c))) / g
      if (x + vx * tr <= ramp.xLip_m + 1e-12) tRamp = Math.max(0, tr)
    }
    const tLip = ramp ? Math.max(0, (ramp.xLip_m - x) / vx) : Infinity
    const tEdge = !crossed ? Math.max(0, -x / vx) : Infinity
    const disc = Math.max(0, vy * vy + 2 * g * (h - R))
    const tTab0 = Math.max(0, (vy + Math.sqrt(disc)) / g)
    const tTable = !crossed && x + vx * tTab0 < 0 ? tTab0 : Infinity
    const tNext = Math.min(tRamp, tLip, tEdge, tTable)
    if (!Number.isFinite(tNext)) return result({ exit: 'airborneEdge', x_exit_m: x, h_exit_m: h, vx_exit_mps: vx, vy_exit_mps: vy, omega_exit_radps: om })
    grid(t, tNext, arcAt(x, h, vy, vx), 'air')
    const hN = h + vy * tNext - 0.5 * g * tNext * tNext
    const vyN = vy - g * tNext
    const xN = x + vx * tNext
    t += tNext

    const ev = tNext === tRamp ? 'ramp' : tNext === tTable ? 'table' : tNext === tEdge ? 'edge' : 'lip'
    if (ev === 'edge') {
      // the centre crosses x = 0 in the air; with no ramp ahead the loop ends at the top of the next pass
      x = 0; h = hN; vy = vyN
      push(t, x, h, vx, vy, 'air')
      crossed = { t_s: t, h_m: h, vx_mps: vx, vy_mps: vy, onRail: ramp !== undefined }
      continue
    }
    if (ev === 'lip') {
      // passes the lip in the air: the ramp is behind
      x = xN; h = hN; vy = vyN
      push(t, x, h, vx, vy, 'air')
      ramp = undefined
      continue
    }
    if (ev === 'ramp') {
      // impact on the ramp, solved in the ramp frame (tangent downhill t^ = (cos a, -sin a), normal n^ = (sin a, cos a))
      const a = ramp!.slope_rad
      const ca = Math.cos(a), sa = Math.sin(a)
      x = xN; h = hr(xN); vy = vyN
      const vt = vx * ca - vy * sa
      const vn = Math.min(0, vx * sa + vy * ca)
      const imp = impactSphere({ vx_mps: vt, vy_mps: vn, omega_radps: om, R_m: ramp!.rEff_m, m_kg: m, k_body: ramp!.kEff, e_n: b.e_table, mu: b.mu_k })
      const vxA = imp.vx_mps * ca + imp.vy_mps * sa
      const vyA = -imp.vx_mps * sa + imp.vy_mps * ca
      const hops = imp.vy_mps >= hopMin
      impacts.push({
        t_s: t, x_m: x, surface: 'ramp', vx_before_mps: vx, vy_before_mps: vy, omega_before_radps: om, vx_after_mps: hops ? vxA : imp.vx_mps * ca,
        vy_after_mps: hops ? vyA : -imp.vx_mps * sa, omega_after_radps: imp.omega_radps, energyLost_J: imp.energyLost_J, hops, sticking: imp.sticking,
      })
      led.impacts_J += imp.energyLost_J
      push(t, x, h, vxA, vyA, 'impact')
      if (hops) { vx = vxA; vy = vyA; om = imp.omega_radps; continue }
      // contact on the ramp: discard the small rebound, close the slip (angular momentum about the contact line), roll down to the lip
      led.reboundDiscarded_J += 0.5 * m * imp.vy_mps * imp.vy_mps
      const kE = ramp!.kEff, rE = ramp!.rEff_m
      const u = rE * imp.omega_radps
      const vRoll = (imp.vx_mps + kE * u) / (1 + kE)
      led.slip_J += 0.5 * m * (imp.vx_mps ** 2 + kE * u * u) - 0.5 * m * (1 + kE) * vRoll * vRoll
      rolledOnRamp = true
      const aR = inclineAcceleration_mps2(a, kE, b.c_rr, g, R / rE)
      const dTot = Math.max(0, (ramp!.xLip_m - x) / ca)
      const dEdge = crossed ? Infinity : Math.max(0, -x / ca)
      const eBefore = energy(h, vRoll * ca, -vRoll * sa, vRoll / rE)
      const leg = (v0: number, dist: number) => quadraticDragMotion(v0, aR, ramp!.kappaSlope_pm, dist)
      const x0r = x, h0r = h
      const posAt = (s: number): [number, number] => [x0r + s * ca, h0r - s * sa]
      if (dEdge < dTot) {
        const r1 = leg(vRoll, dEdge)
        if (r1.stopped) {
          t += r1.t_s
          const [xs, hs] = posAt(r1.s_used_m)
          push(t, xs, hs, 0, 0, 'ramp')
          led.roll_J += eBefore - energy(hs, 0, 0, 0)
          return result({ exit: 'stopped', x_exit_m: xs, h_exit_m: hs, vx_exit_mps: 0, vy_exit_mps: 0, omega_exit_radps: 0, edge: null })
        }
        grid(t, r1.t_s, (tau) => { const s = vRoll * tau + 0.5 * aR * tau * tau; const [px, py] = posAt(s); const v = vRoll + aR * tau; return [px, py, v * ca, -v * sa] }, 'ramp')
        t += r1.t_s
        const [xe, he] = posAt(dEdge)
        push(t, xe, he, r1.v_mps * ca, -r1.v_mps * sa, 'ramp')
        crossed = { t_s: t, h_m: he, vx_mps: r1.v_mps * ca, vy_mps: -r1.v_mps * sa, onRail: true }
        const r2 = leg(r1.v_mps, dTot - dEdge)
        if (r2.stopped) {
          t += r2.t_s
          const [xs, hs] = posAt(dEdge + r2.s_used_m)
          push(t, xs, hs, 0, 0, 'ramp')
          led.roll_J += eBefore - energy(hs, 0, 0, 0)
          return result({ exit: 'stopped', x_exit_m: xs, h_exit_m: hs, vx_exit_mps: 0, vy_exit_mps: 0, omega_exit_radps: 0 })
        }
        grid(t, r2.t_s, (tau) => { const s = r1.v_mps * tau + 0.5 * aR * tau * tau; const [px, py] = posAt(dEdge + s); const v = r1.v_mps + aR * tau; return [px, py, v * ca, -v * sa] }, 'ramp')
        t += r2.t_s
        vx = r2.v_mps * ca; vy = -r2.v_mps * sa; om = r2.v_mps / rE
        x = ramp!.xLip_m; h = ramp!.hLip_m
        push(t, x, h, vx, vy, 'ramp')
        led.roll_J += eBefore - energy(h, vx, vy, om)
        ramp = undefined
        continue
      }
      const r = leg(vRoll, dTot)
      if (r.stopped) {
        t += r.t_s
        const [xs, hs] = posAt(r.s_used_m)
        push(t, xs, hs, 0, 0, 'ramp')
        led.roll_J += eBefore - energy(hs, 0, 0, 0)
        return result({ exit: 'stopped', x_exit_m: xs, h_exit_m: hs, vx_exit_mps: 0, vy_exit_mps: 0, omega_exit_radps: 0, edge: null })
      }
      grid(t, r.t_s, (tau) => { const s = vRoll * tau + 0.5 * aR * tau * tau; const [px, py] = posAt(s); const v = vRoll + aR * tau; return [px, py, v * ca, -v * sa] }, 'ramp')
      t += r.t_s
      vx = r.v_mps * ca; vy = -r.v_mps * sa; om = r.v_mps / rE
      x = ramp!.xLip_m; h = ramp!.hLip_m
      push(t, x, h, vx, vy, 'ramp')
      led.roll_J += eBefore - energy(h, vx, vy, om)
      ramp = undefined
      continue
    }
    // ---- impact on the table ----
    x = xN; h = R
    const vyIn = Math.min(0, vyN)
    const imp = impactSphere({ vx_mps: vx, vy_mps: vyIn, omega_radps: om, R_m: R, m_kg: m, k_body: k, e_n: b.e_table, mu: b.mu_k })
    const hops = imp.vy_mps >= hopMin && n + 1 < maxImpacts
    impacts.push({
      t_s: t, x_m: x, surface: 'table', vx_before_mps: vx, vy_before_mps: vyIn, omega_before_radps: om,
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

  // ---- contact on the table: slip then roll over the rest of the table ----
  const settleT = t, settleX = x
  if (!(vx > 1e-12)) return result({ exit: 'stopped', x_exit_m: x, h_exit_m: R, vx_exit_mps: 0, vy_exit_mps: 0, omega_exit_radps: om, settled: true, settleT_s: settleT, settleX_m: settleX, edge: null })
  const remaining = -x
  const slip = slipFromState(vx, om, R, k, b.mu_k, g)
  const roll = tableRollFrom({ v_mps: vx, omega_radps: om, remaining_m: remaining, R_m: R, m_kg: m, k_body: k, mu_k: b.mu_k, c_rr: b.c_rr, g_mps2: g, kappaRoll_pm: inp.kappaRoll_pm })
  led.slip_J += roll.slipEnergyLost_J
  led.roll_J += roll.rollEnergyLost_J
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
      return result({ exit: 'stopped', x_exit_m: xs, h_exit_m: R, vx_exit_mps: 0, vy_exit_mps: 0, omega_exit_radps: 0, settled: true, settleT_s: settleT, settleX_m: settleX, vRoll_mps: slip.vRoll_mps, slipDistance_m: slip.slipDistance_m, edge: null })
    }
  }
  t += roll.t_s
  push(t, 0, R, roll.v_edge_mps, 0, roll.rollingAtEdge ? 'roll' : 'slip')
  crossed = { t_s: t, h_m: R, vx_mps: roll.v_edge_mps, vy_mps: 0, onRail: false }
  return result({
    exit: roll.rollingAtEdge ? 'rollingEdge' : 'slippingEdge', x_exit_m: 0, h_exit_m: R, vx_exit_mps: roll.v_edge_mps, vy_exit_mps: 0, omega_exit_radps: roll.omega_edge_radps,
    settled: true, settleT_s: settleT, settleX_m: settleX, vRoll_mps: slip.vRoll_mps, slipDistance_m: roll.slipDistance_m,
  })
}
