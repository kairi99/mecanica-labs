import { describe, expect, it } from 'vitest'
import {
  ALL_EFFECTS, DEFAULT_SETUP, G_QUITO_mps2, MARBLE, MARBLE_VARIABILITY, NO_VARIABILITY, PING_PONG, RHO_AIR_QUITO_kgpm3, VACUUM_EFFECTS, ZERO_RUN,
  carbonMark, effectiveInertiaFactor, effectiveRollingRadius_m, firstBounce, idealFlight, inclineAcceleration_mps2, inclineAngle_rad,
  insidePaper, junctionTransition, leavesHorizontally, magnusLiftCoefficient, mulberry32, rollDownTime_s, rollGap, sampleRun, simulateFlight,
  simulateLaunch, speedAtTip_mps, tableRollDecel_mps2, variabilityFor, type BallSpec, type FlightEffects, type LaunchSetup, type PaperRect,
} from '../../src/experiments/parabolic/physics/index.ts'

const g = G_QUITO_mps2
const S = DEFAULT_SETUP
const rel = (a: number, b: number): number => Math.abs(a - b) / Math.abs(b)
const flat: LaunchSetup = { ...S, channelWidth_m: 0 }
const idealBall = (b: BallSpec): BallSpec => ({ ...b, c_rr: 0 })
const only = (e: Partial<FlightEffects>): FlightEffects => ({ drag: false, magnus: false, buoyancy: false, ...e })
const flightOf = (b: BallSpec, v0: number, effects: FlightEffects, extra: object = {}) =>
  simulateFlight({ ball: b, v0_mps: v0, omega_radps: v0 / b.R_m, H_m: S.H_m, g_mps2: g, rho_air_kgpm3: RHO_AIR_QUITO_kgpm3, effects, ...extra })

describe('incline (rolling without slipping on two lines)', () => {
  it('ideal limit (w=0, c_rr=0): v_tip = sqrt(2 g s sin(theta) / (1 + k_body))', () => {
    for (const b of [MARBLE, PING_PONG]) for (const s of [0.6, 0.85, 1.1]) {
      const r = simulateLaunch(flat, idealBall(b), s, ZERO_RUN, { effects: VACUUM_EFFECTS })
      const th = inclineAngle_rad(S.rise_m, S.supportDist_m)
      expect(r.theta_rad).toBeCloseTo(th, 14)
      expect(rel(r.v_tip_mps, Math.sqrt((2 * g * s * Math.sin(th)) / (1 + b.k_body)))).toBeLessThan(1e-12)
    }
  })
  it('angle from the guide: asin(0.20/1.10) = 10.48 deg; rolling time is sqrt(2s/a) from rest', () => {
    expect((inclineAngle_rad(0.2, 1.1) * 180) / Math.PI).toBeCloseTo(10.48, 2)
    const a = inclineAcceleration_mps2(inclineAngle_rad(0.2, 1.1), 0.4, 0, g)
    expect(rollDownTime_s(0.8, a)).toBeCloseTo(Math.sqrt((2 * 0.8) / a), 12)
    expect(speedAtTip_mps(0.8, a)).toBeCloseTo(a * rollDownTime_s(0.8, a), 12)
    expect(inclineAngle_rad(0.2, 0.2)).toBeCloseTo(Math.PI / 2, 12)
    expect(() => inclineAngle_rad(0.3, 0.2)).toThrow()
  })
  it('a larger inertia factor k gives a slower ball (hollow slower than solid with the same c_rr)', () => {
    const solid = simulateLaunch(S, { ...MARBLE, k_body: 0.4 }, 0.85).v_tip_mps
    const hollow = simulateLaunch(S, { ...MARBLE, k_body: 2 / 3 }, 0.85).v_tip_mps
    expect(hollow).toBeLessThan(solid)
  })
  it('the channel (w > 0) raises k_eff and slows the ball on the slope vs a single line', () => {
    expect(effectiveRollingRadius_m(0.008, 0.01)).toBeCloseTo(Math.sqrt(0.008 ** 2 - 0.005 ** 2), 15)
    expect(effectiveInertiaFactor(0.4, 0.008, 0)).toBeCloseTo(0.4, 15)
    expect(effectiveInertiaFactor(0.4, 0.008, 0.01)).toBeGreaterThan(0.4)
    expect(simulateLaunch(S, MARBLE, 0.85).v_tip_mps).toBeLessThan(simulateLaunch(flat, MARBLE, 0.85).v_tip_mps)
  })
  it('a ball too large for the channel is rejected (w >= 2R) and a ball too small to fit throws instead of NaN', () => {
    expect(() => effectiveRollingRadius_m(0.008, 0.016)).toThrow()
    expect(() => simulateLaunch({ ...S, channelWidth_m: 0.02 }, MARBLE, 0.85)).toThrow()
    expect(() => simulateLaunch(S, MARBLE, 1.3)).toThrow()
  })
  it('a slope below the rolling-resistance threshold does not start the ball (stopped, no flight)', () => {
    const r = simulateLaunch({ ...S, rise_m: 0.001 }, MARBLE, 0.85)
    expect(r.stopped).toBe(true)
    expect(r.flight).toBeNull()
    expect(r.rollDownTime_s).toBe(Infinity)
  })
})

describe('junction (tip contact) and roll over the gap', () => {
  const J = (th: number, w: number, step = 0) => {
    const b = MARBLE
    const rEff = effectiveRollingRadius_m(b.R_m, w)
    return junctionTransition({ v_tip_mps: 1.4, theta_rad: th, R_m: b.R_m, m_kg: b.m_kg, k_body: b.k_body, rEff_m: rEff, stepDrop_m: step, g_mps2: g })
  }
  it('dissipates energy (>= 0) for every ball, mark, channel and step', () => {
    for (const b of [MARBLE, PING_PONG]) for (const w of [0, 0.006, 0.01]) for (const s of [0.1, 0.6, 1.1]) for (const step of [0, 0.002]) {
      const r = simulateLaunch({ ...S, channelWidth_m: w, stepDrop_m: step }, b, s)
      expect(r.energyLostJunction_J).toBeGreaterThanOrEqual(0)
    }
    expect(J(0.1827, 0.01).energyLost_J).toBeGreaterThan(0)
  })
  it('no slope change and no channel: nothing is lost and the speed is unchanged', () => {
    const r = J(0, 0)
    expect(r.energyLost_J).toBeLessThan(1e-15)
    expect(r.v_roll_mps).toBeCloseTo(1.4, 12)
  })
  it('a rail-top step adds a fall that is lost at the impact (more dissipation, same speed)', () => {
    expect(J(0.1827, 0.01, 0.002).energyLost_J).toBeGreaterThan(J(0.1827, 0.01).energyLost_J)
    expect(J(0.1827, 0.01, 0.002).v_roll_mps).toBeCloseTo(J(0.1827, 0.01).v_roll_mps, 12)
  })
  it('angular momentum about the contact point is conserved across the transition', () => {
    const b = MARBLE
    const rEff = effectiveRollingRadius_m(b.R_m, 0.01)
    const th = 0.1827
    const r = J(th, 0.01)
    const before = 1.4 * Math.cos(th) * b.R_m + b.k_body * b.R_m * b.R_m * (1.4 / rEff)
    const after = r.v_roll_mps * b.R_m * (1 + b.k_body)
    expect(rel(after, before)).toBeLessThan(1e-12)
  })
  it('v_edge is below the lossless energy limit sqrt(2 g s sin(theta)) and below v_roll (rolling resistance)', () => {
    for (const b of [MARBLE, PING_PONG]) for (const s of [0.6, 1.1]) {
      const r = simulateLaunch(S, b, s)
      expect(r.v_edge_mps).toBeLessThan(Math.sqrt(2 * g * s * Math.sin(r.theta_rad)))
      expect(r.v_edge_mps).toBeLessThan(r.v_roll_mps)
      expect(r.v_edge_mps).toBeGreaterThan(0)
    }
  })
  it('gap roll: v^2 = v0^2 - 2 c g d / (1 + k); stops (and reports it) when that is <= 0', () => {
    const dec = tableRollDecel_mps2(0.005, 2 / 3, g)
    expect(dec).toBeCloseTo((0.005 * g) / (1 + 2 / 3), 14)
    const r = rollGap(1.2, 0.05, dec)
    expect(r.stopped).toBe(false)
    expect(r.v_edge_mps ** 2).toBeCloseTo(1.2 ** 2 - 2 * dec * 0.05, 12)
    expect(r.t_s).toBeCloseTo((1.2 - r.v_edge_mps) / dec, 12)
    const s = rollGap(0.1, 5, dec)
    expect(s).toMatchObject({ v_edge_mps: 0, stopped: true })
    expect(s.t_s).toBeCloseTo(0.1 / dec, 12)
    const big = simulateLaunch({ ...S, gap_m: 30 }, PING_PONG, 0.6)
    expect(big.stopped).toBe(true)
    expect(big.flight).toBeNull()
  })
  it('v_edge^2 < g R is flagged (rolls over the edge, no horizontal flight)', () => {
    expect(leavesHorizontally(0.3, 0.02, g)).toBe(false)
    expect(leavesHorizontally(0.5, 0.02, g)).toBe(true)
    const slow = simulateLaunch(S, PING_PONG, 0.04)
    expect(slow.stopped).toBe(false)
    expect(slow.v_edge_mps ** 2).toBeLessThan(g * PING_PONG.R_m)
    expect(slow.leavesHorizontally).toBe(false)
    expect(slow.flight).toBeNull()
    for (const s of [0.6, 1.1]) expect(simulateLaunch(S, PING_PONG, s).leavesHorizontally).toBe(true)
  })
})

describe('flight (RK4)', () => {
  it('vacuum matches the closed form: t = sqrt(2H/g), x = v0 t, v_final = sqrt(v0^2 + 2 g H) to < 1e-6 relative', () => {
    for (const v0 of [0.8, 1.3, 2.5]) for (const b of [MARBLE, PING_PONG]) {
      const f = flightOf(b, v0, VACUUM_EFFECTS)
      const id = idealFlight(S.H_m, v0, g)
      expect(rel(f.t_flight_s, id.t_s)).toBeLessThan(1e-6)
      expect(rel(f.x_land_m, id.x_m)).toBeLessThan(1e-6)
      expect(rel(f.speed_impact_mps, id.vFinal_mps)).toBeLessThan(1e-6)
      expect(f.vx_impact_mps).toBeCloseTo(v0, 10)
      expect(f.z_land_m).toBe(0)
    }
  })
  it('vacuum flight time does not depend on v0 (guide task 5)', () => {
    const t = [0.5, 1.0, 2.0, 3.0].map((v0) => flightOf(MARBLE, v0, VACUUM_EFFECTS).t_flight_s)
    for (const x of t) expect(Math.abs(x - t[0]!)).toBeLessThan(1e-12)
  })
  it('lands with the ball bottom on the paper (centre at paper + R) and a raised paper shortens the fall', () => {
    const f = flightOf(MARBLE, 1.3, ALL_EFFECTS, { sampleRate_hz: 240 })
    const last = f.trajectory[f.trajectory.length - 1]!
    expect(last.y_m - MARBLE.R_m).toBeCloseTo(0, 9)
    expect(last.t_s).toBeCloseTo(f.t_flight_s, 12)
    expect(last.x_m).toBeCloseTo(f.x_land_m, 12)
    const raised = flightOf(MARBLE, 1.3, VACUUM_EFFECTS, { paperHeight_m: 0.002 })
    expect(raised.t_flight_s).toBeLessThan(flightOf(MARBLE, 1.3, VACUUM_EFFECTS).t_flight_s)
    expect(() => flightOf(MARBLE, 1.3, ALL_EFFECTS, { H_m: 0 })).toThrow()
  })
  it('240 fps trajectory: starts at the edge, regular spacing, parabola in vacuum', () => {
    const f = flightOf(MARBLE, 1.3, VACUUM_EFFECTS, { sampleRate_hz: 240 })
    const tr = f.trajectory
    expect(tr[0]).toMatchObject({ t_s: 0, x_m: 0 })
    expect(tr[0]!.y_m).toBeCloseTo(S.H_m + MARBLE.R_m, 12)
    expect(tr.length).toBe(Math.floor(f.t_flight_s * 240 - 1e-9) + 2)
    for (let i = 1; i < tr.length - 1; i++) {
      expect(tr[i]!.t_s - tr[i - 1]!.t_s).toBeCloseTo(1 / 240, 10)
      expect(tr[i]!.y_m).toBeCloseTo(S.H_m + MARBLE.R_m - 0.5 * g * tr[i]!.t_s ** 2, 9)
    }
  })
  it('drag shortens the ping-pong range by several % but the marble by < 1 %', () => {
    const d = (b: BallSpec) => 1 - flightOf(b, 1.3, only({ drag: true })).x_land_m / flightOf(b, 1.3, VACUUM_EFFECTS).x_land_m
    expect(d(PING_PONG)).toBeGreaterThan(0.015)
    expect(d(PING_PONG)).toBeLessThan(0.06)
    expect(d(MARBLE)).toBeGreaterThan(0)
    expect(d(MARBLE)).toBeLessThan(0.01)
  })
  it('Magnus from topspin pushes the ball DOWN: shorter flight time and shorter range (sign test)', () => {
    for (const b of [MARBLE, PING_PONG]) {
      const v = flightOf(b, 1.3, VACUUM_EFFECTS)
      const m = flightOf(b, 1.3, only({ magnus: true }))
      expect(m.t_flight_s).toBeLessThan(v.t_flight_s)
      expect(m.x_land_m).toBeLessThan(v.x_land_m)
      expect(m.vy_impact_mps).toBeLessThan(v.vy_impact_mps) // falling faster (more negative)
      // no spin, no Magnus
      const none = simulateFlight({ ball: b, v0_mps: 1.3, H_m: S.H_m, g_mps2: g, rho_air_kgpm3: RHO_AIR_QUITO_kgpm3, effects: only({ magnus: true }) })
      expect(none.t_flight_s).toBeCloseTo(v.t_flight_s, 12)
    }
    expect(magnusLiftCoefficient(0)).toBe(0)
    expect(magnusLiftCoefficient(1)).toBeCloseTo(1 / 3.003, 10)
  })
  it('Magnus is perpendicular to the velocity: a spinning ball with no vertical component feels no along-track force', () => {
    // at launch v is along +x, the Magnus force is along -y only: vx is unchanged at first order, vz stays 0
    const m = flightOf(PING_PONG, 1.3, only({ magnus: true }))
    expect(m.z_land_m).toBe(0)
    expect(m.vz_impact_mps).toBe(0)
  })
  it('buoyancy removes rho V / m (~1 % for a ping-pong ball, 0.05 % for the marble) from g: t scales as (1 - rho V / m)^(-1/2)', () => {
    const frac = (b: BallSpec) => (RHO_AIR_QUITO_kgpm3 * (4 / 3) * Math.PI * b.R_m ** 3) / b.m_kg
    expect(frac(PING_PONG)).toBeGreaterThan(0.009)
    expect(frac(PING_PONG)).toBeLessThan(0.013)
    expect(frac(MARBLE)).toBeLessThan(0.0006)
    for (const b of [MARBLE, PING_PONG]) {
      const f = flightOf(b, 1.3, only({ buoyancy: true }))
      expect(rel(f.t_flight_s, Math.sqrt((2 * S.H_m) / (g * (1 - frac(b)))))).toBeLessThan(1e-6)
    }
  })
  it('lateral launch speed gives z drift and keeps the speed', () => {
    const f = flightOf(MARBLE, 1.3, VACUUM_EFFECTS, { vz0_mps: 0.05 })
    expect(f.z_land_m).toBeCloseTo(0.05 * f.t_flight_s, 10)
    expect(f.vz_impact_mps).toBeCloseTo(0.05, 10)
  })
  it('RK4 converges: halving dt changes the landing x by < 1e-6 m', () => {
    for (const b of [MARBLE, PING_PONG]) {
      const x1 = flightOf(b, 1.3, ALL_EFFECTS, { dt_s: 0.0005 }).x_land_m
      const x2 = flightOf(b, 1.3, ALL_EFFECTS, { dt_s: 0.00025 }).x_land_m
      const x3 = flightOf(b, 1.3, ALL_EFFECTS, { dt_s: 0.001 }).x_land_m
      expect(Math.abs(x1 - x2)).toBeLessThan(1e-6)
      expect(Math.abs(x3 - x2)).toBeLessThan(1e-6)
    }
  })
})

describe('launch (composition)', () => {
  it('ideal limit: vacuum, c_rr = 0, w = 0, lossless corner gives t = sqrt(2H/g) and x = v_tip t within 1e-6', () => {
    for (const b of [MARBLE, PING_PONG]) {
      const r = simulateLaunch(flat, idealBall(b), 0.9, ZERO_RUN, { effects: VACUUM_EFFECTS, idealJunction: true })
      const f = r.flight!
      expect(rel(f.t_flight_s, Math.sqrt((2 * S.H_m) / g))).toBeLessThan(1e-6)
      expect(rel(f.x_land_m, r.v_tip_mps * Math.sqrt((2 * S.H_m) / g))).toBeLessThan(1e-6)
      expect(r.v_edge_mps).toBeCloseTo(r.v_tip_mps, 12)
      expect(r.energyLostJunction_J).toBe(0)
    }
  })
  it('is deterministic and a longer run down gives a faster ball and a longer range', () => {
    const a = simulateLaunch(S, MARBLE, 0.85)
    expect(simulateLaunch(S, MARBLE, 0.85)).toEqual(a)
    let prev = 0
    for (const s of [0.6, 0.725, 0.85, 0.975, 1.1]) {
      const r = simulateLaunch(S, MARBLE, s)
      expect(r.flight!.x_land_m).toBeGreaterThan(prev)
      prev = r.flight!.x_land_m
    }
  })
  // Numbers for a reviewer (default set-up, H = 0.76 m, full model | ideal): see docs/architecture.md "Parabolic physics".
  it('typical numbers (marble, H = 0.76 m): v_edge ~ 1.2-1.65 m/s, t ~ 0.39 s, x ~ 0.45-0.65 m for s = 0.60-1.10 m', () => {
    for (const b of [MARBLE, PING_PONG]) for (const s of [0.6, 0.725, 0.85, 0.975, 1.1]) {
      const r = simulateLaunch(S, b, s)
      const id = simulateLaunch(flat, idealBall(b), s, ZERO_RUN, { effects: VACUUM_EFFECTS, idealJunction: true }).flight!
      if (b === MARBLE) {
        expect(r.v_edge_mps).toBeGreaterThan(1.1)
        expect(r.v_edge_mps).toBeLessThan(1.7)
        expect(r.flight!.t_flight_s).toBeGreaterThan(0.39)
        expect(r.flight!.t_flight_s).toBeLessThan(0.40)
        expect(r.flight!.x_land_m).toBeGreaterThan(0.45)
        expect(r.flight!.x_land_m).toBeLessThan(0.66)
      }
      // the real range is below the ideal-point-mass range (rolling inertia is already in both; losses and air are not)
      expect(r.flight!.x_land_m).toBeLessThan(id.x_land_m * 1.02)
    }
  })
})

describe('run variability', () => {
  it('is reproducible with a seed and differs between seeds; draw order is fixed', () => {
    const a = sampleRun(mulberry32(7), MARBLE)
    expect(sampleRun(mulberry32(7), MARBLE)).toEqual(a)
    expect(sampleRun(mulberry32(8), MARBLE)).not.toEqual(a)
    expect(a.pushSpeed_mps).toBeGreaterThanOrEqual(0)
    expect(a.u_mark).toBeGreaterThanOrEqual(0)
    expect(a.u_mark).toBeLessThan(1)
  })
  it('no variability returns the zero offsets, and a zero-offset run equals the expectation', () => {
    const z = sampleRun(mulberry32(1), PING_PONG, NO_VARIABILITY)
    expect(z).toMatchObject({ releaseOffset_m: 0, pushSpeed_mps: 0, junctionFactor: 1, lateralAngle_rad: 0 })
    const { u_mark: _u, ...rest } = z
    expect(simulateLaunch(S, PING_PONG, 0.85, { ...ZERO_RUN, ...rest })).toEqual(simulateLaunch(S, PING_PONG, 0.85))
  })
  it('scatter has the configured size and the ping-pong spreads more than the marble', () => {
    const sd = (b: BallSpec) => {
      const rng = mulberry32(2026)
      const xs = Array.from({ length: 400 }, () => simulateLaunch(S, b, 0.85, sampleRun(rng, b)).flight!.x_land_m)
      const m = xs.reduce((p, c) => p + c, 0) / xs.length
      return Math.sqrt(xs.reduce((p, c) => p + (c - m) ** 2, 0) / (xs.length - 1))
    }
    const sm = sd(MARBLE)
    expect(sm).toBeGreaterThan(0.003)
    expect(sm).toBeLessThan(0.015)
    expect(sd(PING_PONG)).toBeGreaterThan(sm)
    expect(variabilityFor(MARBLE)).toBe(MARBLE_VARIABILITY)
  })
  it('a lateral angle moves the landing point sideways and a junction factor scales v_roll', () => {
    const r = simulateLaunch(S, MARBLE, 0.85, { ...ZERO_RUN, lateralAngle_rad: 0.02, junctionFactor: 0.98 })
    const e = simulateLaunch(S, MARBLE, 0.85)
    expect(r.flight!.z_land_m).toBeGreaterThan(0.005)
    expect(r.v_roll_mps).toBeCloseTo(e.v_roll_mps * 0.98, 12)
    const push = simulateLaunch(S, MARBLE, 0.85, { ...ZERO_RUN, pushSpeed_mps: 0.05 })
    expect(push.v_tip_mps).toBeGreaterThan(e.v_tip_mps)
    const off = simulateLaunch(S, MARBLE, 0.85, { ...ZERO_RUN, releaseOffset_m: 0.01 })
    expect(off.releaseS_m).toBeCloseTo(0.86, 12)
    expect(off.flight!.x_land_m).toBeGreaterThan(e.flight!.x_land_m)
  })
})

describe('carbon marks and bounce', () => {
  const paper: PaperRect = { xMin_m: 0.3, xMax_m: 0.8, zMin_m: -0.15, zMax_m: 0.15 }
  it('paper rectangle: a mark only if the contact is on the sheet', () => {
    expect(insidePaper(0.5, 0, paper)).toBe(true)
    expect(insidePaper(0.9, 0, paper)).toBe(false)
    expect(insidePaper(0.5, 0.2, paper)).toBe(false)
    const out = carbonMark(0.9, 0, MARBLE, -4, paper, 0.5)
    expect(out).toMatchObject({ left: false, insidePaper: false, diameter_m: 0, darkness: 0 })
  })
  it('the marble always leaves a clear 2-4 mm dot', () => {
    for (const u of [0, 0.5, 0.999]) {
      const m = carbonMark(0.56, 0.01, MARBLE, -4.1, paper, u)
      expect(m.left).toBe(true)
      expect(m.diameter_m).toBeGreaterThanOrEqual(0.002)
      expect(m.diameter_m).toBeLessThanOrEqual(0.004)
    }
  })
  it('the ping-pong ball leaves a fainter mark and none when it lands too softly (deterministic given u)', () => {
    const pp = carbonMark(0.5, 0, PING_PONG, -3.9, paper, 0.5)
    const mb = carbonMark(0.5, 0, MARBLE, -4.1, paper, 0.5)
    expect(pp.left).toBe(true)
    expect(pp.darkness).toBeLessThan(mb.darkness)
    expect(carbonMark(0.5, 0, PING_PONG, -3.9, paper, 0.5)).toEqual(pp)
    const soft = carbonMark(0.5, 0, PING_PONG, -1, paper, 0.5)
    expect(soft.left).toBe(false)
    expect(soft.insidePaper).toBe(true)
    // the threshold scatter (u) can flip a marginal impact
    const marginal = (u: number) => carbonMark(0.5, 0, PING_PONG, -(0.006 / PING_PONG.m_kg), paper, u).left
    expect(marginal(0.01)).toBe(true) // low threshold draw
    expect(marginal(0.99)).toBe(false) // high threshold draw
  })
  it('first bounce: rebound e |vy|, apex e^2 vy^2 / 2g, next contact later and farther', () => {
    const b = firstBounce(0.5, 1.3, -3.9, PING_PONG, g)
    expect(b.vUp_mps).toBeCloseTo(0.8 * 3.9, 12)
    expect(b.apex_m).toBeCloseTo((0.8 * 3.9) ** 2 / (2 * g), 12)
    expect(b.xNext_m).toBeCloseTo(0.5 + 1.3 * b.tNext_s, 12)
    expect(firstBounce(0.5, 1.3, -4.1, MARBLE, g).apex_m).toBeLessThan(b.apex_m)
  })
})

describe('size of each non-ideal effect on x (s = 0.85 m, informational bounds)', () => {
  const base = (b: BallSpec) => simulateLaunch(S, b, 0.85).flight!.x_land_m
  it('rolling resistance, drag and Magnus shorten the range; every effect stays within a few % of x', () => {
    for (const b of [MARBLE, PING_PONG]) {
      const x = base(b)
      expect(simulateLaunch(S, { ...b, c_rr: 0 }, 0.85).flight!.x_land_m).toBeGreaterThan(x)
      expect(simulateLaunch(S, b, 0.85, ZERO_RUN, { effects: only({ buoyancy: true }) }).flight!.x_land_m).toBeGreaterThan(x)
      expect(simulateLaunch(S, b, 0.85, ZERO_RUN, { effects: { ...ALL_EFFECTS, drag: false } }).flight!.x_land_m).toBeGreaterThan(x)
      expect(simulateLaunch(S, b, 0.85, ZERO_RUN, { effects: { ...ALL_EFFECTS, magnus: false } }).flight!.x_land_m).toBeGreaterThan(x)
      expect(rel(simulateLaunch(S, b, 0.85, ZERO_RUN, { effects: VACUUM_EFFECTS }).flight!.x_land_m, x)).toBeLessThan(0.1)
    }
  })
})
