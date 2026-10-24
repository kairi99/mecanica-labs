// Diagonal launch model: ball-table impact, hops on the table, rail-tip departure, overhanging rail, generalised flight.
// Pure physics checks (closed forms, energy balance, limits); tolerances are stated where they are not rounding.
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SETUP, MARBLE, PING_PONG, TABLE_HOP_MIN_vUp_mps, VACUUM_EFFECTS, ZERO_RUN, impactSphere, junctionTransition, mulberry32, simulateFlight, simulateLaunch,
  simulateTablePhase, vacuumHeight_m, vacuumTimeToHeight_s, effectiveRollingRadius_m, type BallSpec, type LaunchSetup,
} from '../../src/experiments/parabolic/physics/index.ts'
import {
  GAP_OVERHANG_MAX_m, GAP_OVERHANG_MIN_m, GAP_MIN_m, LEG_MAX_mm, RAIL_HEIGHT_m, RACK_FROM_TIP_m, RACK_MAX_mm, RACK_MIN_mm, createApparatus, railGeometry, type RailInput,
} from '../../src/experiments/parabolic/apparatus/index.ts'

const g = DEFAULT_SETUP.g_mps2
const BALLS: BallSpec[] = [MARBLE, PING_PONG]
const geo = createApparatus('assembled').geometry()!
/** Assembled preset: 20 cm at the clamp, 2 cm thick rail on its end corner, gap 5 cm. */
const ASSEMBLED: LaunchSetup = { ...DEFAULT_SETUP, rise_m: geo.rise_m, stepDrop_m: geo.stepDrop_m }
const railOf = (over: Partial<RailInput>): ReturnType<typeof railGeometry> =>
  railGeometry({ rack_mm: 140, leg_mm: 0, foot_mm: 0, gap_m: 0.05, tableRoll_rad: 0, twoLegAttached: false, ...over })
const setupOf = (gap_m: number, over: Partial<RailInput> = {}): LaunchSetup => {
  const r = railOf({ gap_m, ...over })
  return { ...DEFAULT_SETUP, rise_m: r.rise_m, gap_m, stepDrop_m: r.stepDrop_m }
}

describe('ball-surface impact (impact.ts)', () => {
  it('never creates energy: random states, restitution in [0,1], friction 0..Infinity (energy lost >= 0, normal part (1-e^2) vy^2/2 at least)', () => {
    const rng = mulberry32(7)
    for (let i = 0; i < 20000; i++) {
      const b = BALLS[i % 2]!
      const e = rng()
      const mu = i % 5 === 0 ? Infinity : rng() * 1.5
      const r = impactSphere({ vx_mps: rng() * 3 - 0.5, vy_mps: -rng() * 3, omega_radps: (rng() * 3 - 0.5) / b.R_m, R_m: b.R_m, m_kg: b.m_kg, k_body: b.k_body, e_n: e, mu })
      expect(r.energyLost_J).toBeGreaterThanOrEqual(-1e-15)
      expect(r.energyBefore_J).toBeCloseTo(r.energyAfter_J + r.energyLost_J, 14)
      const normalOnly = 0.5 * b.m_kg * (1 - e * e) * (r.vy_mps / Math.max(e, 1e-300)) ** 2
      if (e > 0.01) expect(r.energyLost_J).toBeGreaterThanOrEqual(normalOnly - 1e-12)
      expect(r.vy_mps).toBeGreaterThanOrEqual(0)
    }
  })
  it('e = 1 and mu = 0 is perfectly elastic: only vy flips, vx and the spin are untouched, no energy lost', () => {
    const r = impactSphere({ vx_mps: 1.3, vy_mps: -0.7, omega_radps: 40, R_m: 0.02, m_kg: 0.0027, k_body: 0.65, e_n: 1, mu: 0 })
    expect(r.vy_mps).toBeCloseTo(0.7, 14)
    expect(r.vx_mps).toBe(1.3)
    expect(r.omega_radps).toBe(40)
    expect(r.energyLost_J).toBeCloseTo(0, 15)
  })
  it('friction impulse is capped where rolling is reached: a large mu gives v = (vx + k R omega)/(1 + k) = R omega (angular momentum about the contact line)', () => {
    for (const b of BALLS) {
      const vx = 1.1, om = 90 / (b.R_m / 0.008)
      const r = impactSphere({ vx_mps: vx, vy_mps: -0.5, omega_radps: om, R_m: b.R_m, m_kg: b.m_kg, k_body: b.k_body, e_n: 0.6, mu: 50 })
      const vRoll = (vx + b.k_body * b.R_m * om) / (1 + b.k_body)
      expect(r.sticking).toBe(true)
      expect(r.vx_mps).toBeCloseTo(vRoll, 12)
      expect(b.R_m * r.omega_radps).toBeCloseTo(vRoll, 12)
      // a smaller mu does not reach rolling and leaves the slip with the same sign
      const part = impactSphere({ vx_mps: vx, vy_mps: -0.5, omega_radps: om, R_m: b.R_m, m_kg: b.m_kg, k_body: b.k_body, e_n: 0.6, mu: 0.01 })
      expect(part.sticking).toBe(false)
      expect(Math.sign(b.R_m * part.omega_radps - part.vx_mps)).toBe(Math.sign(b.R_m * om - vx))
    }
  })
  it('e = 0 reproduces the corner impact of junction.ts (post-impact v and spin), including its Coulomb cap', () => {
    for (const b of BALLS) {
      const th = 0.18, v = 1.3, rEff = effectiveRollingRadius_m(b.R_m, 0.01)
      const j = junctionTransition({ v_tip_mps: v, theta_rad: th, R_m: b.R_m, m_kg: b.m_kg, k_body: b.k_body, rEff_m: rEff, stepDrop_m: 0, g_mps2: g, mu_k: b.mu_k })
      const r = impactSphere({ vx_mps: v * Math.cos(th), vy_mps: -v * Math.sin(th), omega_radps: v / rEff, R_m: b.R_m, m_kg: b.m_kg, k_body: b.k_body, e_n: 0, mu: b.mu_k })
      expect(r.vx_mps).toBeCloseTo(j.vPostImpact_mps, 12)
      expect(r.omega_radps).toBeCloseTo(j.omegaPostImpact_radps, 9)
    }
  })
  it('ITTF bounce rule: a ball dropped 30.5 cm rebounds 23 cm with the ping-pong e_table (e^2 h)', () => {
    const vIn = Math.sqrt(2 * g * 0.305)
    const r = impactSphere({ vx_mps: 0, vy_mps: -vIn, omega_radps: 0, R_m: PING_PONG.R_m, m_kg: PING_PONG.m_kg, k_body: PING_PONG.k_body, e_n: PING_PONG.e_table, mu: 0.35 })
    expect(r.vy_mps ** 2 / (2 * g)).toBeCloseTo(0.23, 12)
  })
})

describe('generalised flight (flight.ts)', () => {
  const base = { ball: MARBLE, g_mps2: g, rho_air_kgpm3: DEFAULT_SETUP.rho_air_kgpm3, effects: VACUUM_EFFECTS, dt_s: 0.002 }
  it('vacuum flight with vy0 != 0 (up, down, zero) matches y = y0 + vy0 t - g t^2/2: landing time, range, velocity (RK4 is exact for a parabola)', () => {
    for (const vy0 of [-1.5, -0.2, 0, 0.9, 2.4]) {
      const y0 = 0.9, vx0 = 1.4
      const r = simulateFlight({ ...base, vx0_mps: vx0, vy0_mps: vy0, y0_m: y0 })
      const tL = vacuumTimeToHeight_s(y0, vy0, MARBLE.R_m, g)
      expect(r.t_flight_s).toBeCloseTo(tL, 9)
      expect(r.x_land_m).toBeCloseTo(vx0 * tL, 9)
      expect(r.vy_impact_mps).toBeCloseTo(vy0 - g * tL, 9)
      expect(vacuumHeight_m(y0, vy0, g, r.t_flight_s)).toBeCloseTo(MARBLE.R_m, 9)
      expect(r.launch.angle_rad).toBeCloseTo(Math.atan2(vy0, vx0), 12)
    }
  })
  it('horizontal launch reproduces t = sqrt(2H/g) and x = v0 t (the guide)', () => {
    const H = 0.76
    const r = simulateFlight({ ...base, v0_mps: 1.2, H_m: H })
    expect(r.t_flight_s).toBeCloseTo(Math.sqrt((2 * H) / g), 9)
    expect(r.x_land_m).toBeCloseTo(1.2 * Math.sqrt((2 * H) / g), 9)
    expect(r.launch.angle_rad).toBe(0)
  })
  it('a start before the edge: the time is measured from the edge crossing and the launch state is the state there', () => {
    const x0 = -0.12, vx0 = 1.1, vy0 = 0.5, y0 = 0.85
    const r = simulateFlight({ ...base, x0_m: x0, vx0_mps: vx0, vy0_mps: vy0, y0_m: y0 })
    const tc = -x0 / vx0
    expect(r.t_total_s - r.t_flight_s).toBeCloseTo(tc, 9)
    expect(r.launch.y_m).toBeCloseTo(vacuumHeight_m(y0, vy0, g, tc), 9)
    expect(r.launch.vy_mps).toBeCloseTo(vy0 - g * tc, 9)
    expect(r.launch.angle_rad).toBeCloseTo(Math.atan2(vy0 - g * tc, vx0), 9)
    expect(r.x_land_m).toBeCloseTo(x0 + vx0 * r.t_total_s, 9)
  })
  it('a start beyond the edge needs the crossing that happened earlier, and adds its time to the flight time', () => {
    expect(() => simulateFlight({ ...base, x0_m: 0.02, vx0_mps: 1, y0_m: 0.9 })).toThrow()
    const r = simulateFlight({ ...base, x0_m: 0.02, vx0_mps: 1, vy0_mps: -0.3, y0_m: 0.9, edgeCrossing: { tBeforeStart_s: 0.015, y_m: 0.91, vx_mps: 0.99, vy_mps: -0.28 } })
    expect(r.t_flight_s).toBeCloseTo(r.t_total_s + 0.015, 12)
    expect(r.launch.y_m).toBe(0.91)
  })
})

describe('table phase: impacts, hops, edge (tablePhase.ts)', () => {
  const longTable = (b: BallSpec, over: Partial<Parameters<typeof simulateTablePhase>[0]> = {}) =>
    simulateTablePhase({ ball: b, g_mps2: g, x0_m: -1e6, h0_m: 0.03, vx0_mps: 1.2, vy0_mps: -0.3, omega0_radps: 1.2 / b.R_m, kappaRoll_pm: 0, ...over })
  it('the hop sequence terminates: rebounds fall geometrically by e_n (frictionless: mu = 0) and stop below the threshold, then the ball is in contact', () => {
    const b: BallSpec = { ...PING_PONG, mu_k: 0 }
    const r = longTable(b)
    expect(r.settled).toBe(true)
    expect(r.impacts.length).toBeGreaterThan(5)
    expect(r.impacts.length).toBeLessThan(200)
    const first = r.impacts[0]!
    for (let i = 1; i < r.impacts.length; i++) {
      if (r.impacts[i - 1]!.hops) expect(r.impacts[i]!.vy_before_mps / r.impacts[i - 1]!.vy_before_mps).toBeCloseTo(b.e_table, 6)
    }
    const nExpected = Math.ceil(Math.log(TABLE_HOP_MIN_vUp_mps / (b.e_table * -first.vy_before_mps)) / Math.log(b.e_table)) // hops after the first rebound
    expect(r.hops).toBeGreaterThanOrEqual(nExpected)
    expect(r.hops).toBeLessThanOrEqual(nExpected + 2)
    expect(r.impacts[r.impacts.length - 1]!.hops).toBe(false)
  })
  it('energy bookkeeping across the table phase closes exactly: start = end + impacts + rebound discarded + slip (+ roll)', () => {
    for (const b of BALLS) {
      for (const x0 of [-0.5, -3, -1e4]) {
        const r = longTable(b, { x0_m: x0, vy0_mps: -0.4, h0_m: 0.04 })
        const e = r.energy
        expect(e.start_J).toBeCloseTo(e.end_J + e.impacts_J + e.reboundDiscarded_J + e.slip_J + e.roll_J, 13)
        for (const imp of r.impacts) expect(imp.energyLost_J).toBeGreaterThanOrEqual(-1e-15)
        expect(e.impacts_J + e.reboundDiscarded_J + e.slip_J).toBeGreaterThanOrEqual(0)
      }
    }
    // with no rolling resistance and no air the roll term is exactly zero: a table 30 m long, the ball settles and rolls out
    const r = longTable({ ...MARBLE, c_rr: 0 }, { x0_m: -30 })
    expect(r.exit).toBe('rollingEdge')
    expect(r.energy.roll_J).toBeCloseTo(0, 14)
    expect(r.energy.slip_J).toBeGreaterThan(0)
  })
  it('crossing the edge in the air launches there with (vx, vy) as they are: a diagonal launch from that height', () => {
    // ball dropped 1 cm in front of the edge with no spin: leaves on the first arc
    const r = simulateTablePhase({ ball: MARBLE, g_mps2: g, x0_m: -0.02, h0_m: 0.03, vx0_mps: 1, vy0_mps: 0.2, omega0_radps: 0, kappaRoll_pm: 0 })
    expect(r.exit).toBe('airborneEdge')
    expect(r.impacts.length).toBe(0)
    expect(r.vx_exit_mps).toBe(1)
    expect(r.vy_exit_mps).toBeCloseTo(0.2 - g * 0.02, 12)
    expect(r.h_exit_m).toBeCloseTo(vacuumHeight_m(0.03, 0.2, g, 0.02), 12)
  })
  it('a ball that is rolling at the table end launches horizontally; e_table = 0 on a long table is the ideal limit sqrt(2H/g) in vacuum', () => {
    const ideal: BallSpec = { ...MARBLE, e_table: 0, c_rr: 0, mu_k: 0.3 }
    const H = DEFAULT_SETUP.H_m
    const r = simulateLaunch({ ...ASSEMBLED, gap_m: 3 }, ideal, 1, ZERO_RUN, { effects: VACUUM_EFFECTS })
    expect(r.table!.exit).toBe('rollingEdge')
    expect(r.table!.hops).toBe(0)
    expect(r.leavesHorizontally).toBe(true)
    expect(r.edgeLaunch!.kind).toBe('horizontal')
    expect(r.edgeLaunch!.angle_rad).toBe(0)
    expect(r.flight!.t_flight_s).toBeCloseTo(Math.sqrt((2 * H) / g), 9)
  })
})

describe('launch from the rail tip (launch.ts, default projectile model)', () => {
  it('leaves the tip along the slope: speed v_tip, angle theta below the horizontal, centre r_eff above the rail top, spin v/r_eff', () => {
    const r = simulateLaunch(ASSEMBLED, MARBLE, 0.6, ZERO_RUN, { effects: VACUUM_EFFECTS, sampleRate_hz: 5000 })
    const p0 = r.path[0]!
    expect(p0.t_s).toBe(r.rollDownTime_s * 0) // the path starts at the departure
    expect(Math.hypot(p0.vx_mps, p0.vy_mps)).toBeCloseTo(r.v_tip_mps, 12)
    expect(Math.atan2(-p0.vy_mps, p0.vx_mps)).toBeCloseTo(r.theta_rad, 12)
    const rEff = r.rEff_m
    expect(p0.x_m).toBeCloseTo(-ASSEMBLED.gap_m + rEff * Math.sin(r.theta_rad), 12)
    expect(p0.y_m).toBeCloseTo(ASSEMBLED.H_m + ASSEMBLED.stepDrop_m + rEff * Math.cos(r.theta_rad), 12)
    expect(r.tipPivot).toBe(false)
  })
  it('the path is continuous in time and space from the tip through the table phase to the paper and ends at the landing point', () => {
    for (const b of BALLS) {
      for (const s of [0.6, 1]) {
        const r = simulateLaunch(ASSEMBLED, b, s, ZERO_RUN, { sampleRate_hz: 2000 })
        const pts = r.path
        expect(pts.length).toBeGreaterThan(100)
        for (let i = 1; i < pts.length; i++) {
          expect(pts[i]!.t_s).toBeGreaterThanOrEqual(pts[i - 1]!.t_s)
          // no teleporting: a step of dt moves the ball at most speed * dt (+ the exact impact points)
          const dt = pts[i]!.t_s - pts[i - 1]!.t_s
          expect(Math.hypot(pts[i]!.x_m - pts[i - 1]!.x_m, pts[i]!.y_m - pts[i - 1]!.y_m)).toBeLessThanOrEqual(6 * dt + 1e-9)
        }
        const last = pts[pts.length - 1]!
        expect(last.x_m).toBeCloseTo(r.flight!.x_land_m, 9)
        expect(last.y_m).toBeCloseTo(b.R_m, 6)
        // the ball never goes below the table top while over the table (x < 0)
        for (const p of pts) if (p.x_m < 0) expect(p.y_m).toBeGreaterThanOrEqual(ASSEMBLED.H_m + b.R_m - 1e-9)
      }
    }
  })
  it('edge launch record is consistent with the flight (position, velocity, angle) and with the timing from the tip', () => {
    for (const b of BALLS) {
      const r = simulateLaunch(ASSEMBLED, b, 0.8, ZERO_RUN)
      const e = r.edgeLaunch!
      const l = r.flight!.launch
      expect(l.y_m).toBeCloseTo(e.y_m, 9)
      expect(l.vx_mps).toBeCloseTo(e.vx_mps, 9)
      expect(l.vy_mps).toBeCloseTo(e.vy_mps, 9)
      expect(l.angle_rad).toBeCloseTo(e.angle_rad, 9)
      expect(r.gapTime_s).toBeGreaterThan(0)
      expect(r.leavesHorizontally).toBe(e.kind === 'horizontal')
    }
  })
  it('the table energy ledger of a real launch closes (no rolling resistance, no air): tip energy = edge energy + losses', () => {
    for (const b of BALLS) {
      for (const gap of [0.05, 0.3, 1.5]) {
        const r = simulateLaunch({ ...ASSEMBLED, gap_m: gap }, { ...b, c_rr: 0 }, 0.9, ZERO_RUN, { effects: VACUUM_EFFECTS })
        const e = r.table!.energy
        expect(e.start_J).toBeCloseTo(e.end_J + e.impacts_J + e.reboundDiscarded_J + e.slip_J + e.roll_J, 13)
        expect(e.roll_J).toBeCloseTo(0, 13)
      }
    }
  })
  it('the run scatter factor only removes energy at the departure (speed scales with f, spin too)', () => {
    const a = simulateLaunch(ASSEMBLED, MARBLE, 0.8, ZERO_RUN, { sampleRate_hz: 1000 })
    const b = simulateLaunch(ASSEMBLED, MARBLE, 0.8, { ...ZERO_RUN, junctionFactor: 0.9 }, { sampleRate_hz: 1000 })
    expect(Math.hypot(b.path[0]!.vx_mps, b.path[0]!.vy_mps)).toBeCloseTo(0.9 * Math.hypot(a.path[0]!.vx_mps, a.path[0]!.vy_mps), 12)
    // (the range is NOT monotonic in f: a slower ball can hit the table on a different hop and leave on another arc; that is the amplification of the scatter)
    expect(Math.abs(b.flight!.x_land_m - a.flight!.x_land_m)).toBeGreaterThan(0)
  })
  it('the original corner model is still available and launches horizontally', () => {
    const r = simulateLaunch(ASSEMBLED, MARBLE, 0.8, ZERO_RUN, { tipModel: 'corner' })
    expect(r.tipModel).toBe('corner')
    expect(r.edgeLaunch!.angle_rad).toBe(0)
    expect(r.table).toBeNull()
  })
})

describe('rail overhanging the table edge (negative gap)', () => {
  it('the rail rests on the edge corner: its underside passes through the corner, the tip hangs lower than with the tip on the table, and the geometry is continuous in the gap', () => {
    const on = railOf({ gap_m: 0.05 })
    const over = railOf({ gap_m: -0.03 })
    expect(over.overhang).toBe(true)
    expect(over.edgeContact).toBe(true)
    // underside line n . tip = t  (the edge corner E = (0, 0) lies on it)
    const th = over.theta_rad
    expect(Math.sin(th) * over.pose.tip.x_m + Math.cos(th) * over.pose.tip.y_m).toBeCloseTo(RAIL_HEIGHT_m, 12)
    expect(over.tipHeight_m).toBeLessThan(on.tipHeight_m)
    expect(over.theta_rad).toBeGreaterThan(on.theta_rad - 1e-12)
    expect(over.lowest_m).toBeCloseTo(0, 9)
    // continuity of theta and of the tip height across the regime change (end corner reaching the edge), steps of 0.1 mm
    let prev = railOf({ gap_m: 0.01 })
    for (let gap = 0.0099; gap >= -0.05; gap -= 0.0001) {
      const cur = railOf({ gap_m: gap })
      expect(Math.abs(cur.theta_rad - prev.theta_rad)).toBeLessThan(2e-4)
      expect(Math.abs(cur.tipHeight_m - prev.tipHeight_m)).toBeLessThan(2e-4)
      prev = cur
    }
  })
  it('the rail is never below the table top for any setting incl. overhang and the refused band (rack, stand, foot, gap); the tip may be below the top', () => {
    let n = 0, anyNegativeTip = false
    for (let rack = RACK_MIN_mm; rack <= RACK_MAX_mm; rack += 25) {
      for (let leg = 0; leg <= LEG_MAX_mm; leg += 15) {
        for (const gap_m of [GAP_MIN_m, 0.02, 0, -0.002, -0.005, -GAP_OVERHANG_MIN_m, -0.02, -0.03, -0.06, -GAP_OVERHANG_MAX_m, -0.1]) {
          for (const twoLegAttached of [true, false]) {
            const gm = railOf({ rack_mm: rack, leg_mm: leg, gap_m, twoLegAttached })
            expect(gm.lowest_m).toBeGreaterThanOrEqual(-1e-9)
            expect(gm.theta_rad).toBeLessThan(0.5)
            if (gm.tipHeight_m < 0) anyNegativeTip = true
            n++
          }
        }
      }
    }
    expect(n).toBeGreaterThan(1000)
    expect(anyNegativeTip).toBe(true)
  })
  it('a high two-leg stand still lifts an overhanging tip (larger step, steeper bounce) and the rail rests on the stand, not the edge', () => {
    const free = railOf({ gap_m: -0.03, twoLegAttached: false })
    const lifted = railOf({ gap_m: -0.03, twoLegAttached: true, leg_mm: 60 })
    expect(free.contacts.twoLeg).toBe(false)
    expect(lifted.contacts.twoLeg).toBe(true)
    expect(lifted.tipLifted).toBe(true)
    expect(lifted.tipHeight_m).toBeGreaterThan(free.tipHeight_m)
    expect(lifted.lowest_m).toBeGreaterThanOrEqual(-1e-9)
  })
  it('the ball leaves the tip beyond the edge: launch angle equals the rail angle (downward) and the times and range are measured from the edge', () => {
    for (const b of BALLS) {
      const gap = -0.03
      const rail = railOf({ gap_m: gap })
      const setup = setupOf(gap)
      const r = simulateLaunch(setup, b, 0.9, ZERO_RUN, { effects: VACUUM_EFFECTS, sampleRate_hz: 2000 })
      expect(r.overhang).toBe(true)
      expect(r.table).toBeNull()
      expect(r.edgeLaunch!.kind).toBe('diagonal')
      expect(r.edgeLaunch!.angle_rad).toBeCloseTo(-rail.theta_rad, 12) // on the rail the velocity is along the slope
      expect(r.flight!.launch.angle_rad).toBeCloseTo(-rail.theta_rad, 12)
      expect(r.tRailAfterEdge_s).toBeGreaterThan(0)
      expect(r.gapTime_s).toBe(-r.tRailAfterEdge_s)
      // vacuum closed form from the tip state: flight from the edge = time on the rail after the edge + free flight from the tip
      const th = r.theta_rad
      const xC = 0.03 + r.rEff_m * Math.sin(th)
      const yC = setup.H_m + setup.stepDrop_m + r.rEff_m * Math.cos(th)
      const tFree = vacuumTimeToHeight_s(yC, -r.v_tip_mps * Math.sin(th), b.R_m, g)
      expect(r.flight!.t_flight_s).toBeCloseTo(r.tRailAfterEdge_s + tFree, 9)
      expect(r.flight!.x_land_m).toBeCloseTo(xC + r.v_tip_mps * Math.cos(th) * tFree, 9) // range from the edge plumb point
      // the time on the rail after the edge is bracketed by the distance over the tip and edge horizontal speeds
      const vxTip = r.v_tip_mps * Math.cos(th)
      expect(r.tRailAfterEdge_s).toBeGreaterThanOrEqual(xC / vxTip - 1e-12)
      expect(r.tRailAfterEdge_s).toBeLessThanOrEqual(xC / r.edgeLaunch!.vx_mps + 1e-12)
      // the path of the sampled trajectory ends at the landing point
      const last = r.path[r.path.length - 1]!
      expect(last.x_m).toBeCloseTo(r.flight!.x_land_m, 9)
    }
  })
  it('a downward launch lands SOONER than a horizontal one from the same height: t < sqrt(2 (y0 - R)/g) after the tip', () => {
    const setup = setupOf(-0.03)
    const r = simulateLaunch(setup, MARBLE, 0.9, ZERO_RUN, { effects: VACUUM_EFFECTS })
    const yC = setup.H_m + setup.stepDrop_m + r.rEff_m * Math.cos(r.theta_rad)
    expect(r.flight!.t_total_s).toBeLessThan(Math.sqrt((2 * (yC - MARBLE.R_m)) / g))
  })
  it('the settable band: the apparatus refuses the band around the edge corner and accepts the overhang range', () => {
    expect(GAP_OVERHANG_MIN_m).toBeGreaterThan(RAIL_HEIGHT_m * Math.sin(Math.asin(0.31 / RACK_FROM_TIP_m)) ) // end corner reaches past the edge at the steepest rail
  })
})
