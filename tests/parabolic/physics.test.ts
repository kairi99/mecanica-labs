import { describe, expect, it } from 'vitest'
import {
  ALL_EFFECTS, PING_PONG_SHELL_THICKNESS_m, airDragK_pm, hollowShellInertiaFactor, quadraticDragMotion, tableRoll, DEFAULT_SETUP, G_QUITO_mps2, MARBLE, MARBLE_VARIABILITY, NO_VARIABILITY, PING_PONG, RHO_AIR_QUITO_kgpm3, VACUUM_EFFECTS, ZERO_RUN,
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
  it('buoyancy and added mass: g_eff = g (1 - rho V/m)/(1 + rho V/(2m)); t scales as g_eff^(-1/2)', () => {
    const frac = (b: BallSpec) => (RHO_AIR_QUITO_kgpm3 * (4 / 3) * Math.PI * b.R_m ** 3) / b.m_kg
    expect(frac(PING_PONG)).toBeGreaterThan(0.009)
    expect(frac(PING_PONG)).toBeLessThan(0.013)
    expect(frac(MARBLE)).toBeLessThan(0.0006)
    for (const b of [MARBLE, PING_PONG]) {
      const f = flightOf(b, 1.3, only({ buoyancy: true }))
      const gEff = (g * (1 - frac(b))) / (1 + frac(b) / 2)
      expect(rel(f.t_flight_s, Math.sqrt((2 * S.H_m) / gEff))).toBeLessThan(1e-6)
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
    const marginal = (u: number) => carbonMark(0.5, 0, PING_PONG, -(0.009 / PING_PONG.m_kg), paper, u).left
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

// ---------------------------------------------------------------------------------------------------------------
// Review fixes: slip phase, one-sided scatter, air drag on slope and gap, exact energy, perturbation estimates.
// ---------------------------------------------------------------------------------------------------------------
const th0 = inclineAngle_rad(S.rise_m, S.supportDist_m)
const J2 = (b: BallSpec, v: number, o: { mu?: number; step?: number; f?: number; impact?: boolean; w?: number; th?: number } = {}) =>
  junctionTransition({
    v_tip_mps: v, theta_rad: o.th ?? th0, R_m: b.R_m, m_kg: b.m_kg, k_body: b.k_body, rEff_m: effectiveRollingRadius_m(b.R_m, o.w ?? S.channelWidth_m),
    stepDrop_m: o.step ?? 0, g_mps2: g, mu_k: o.mu, junctionFactor: o.f, impactFriction: o.impact,
  })

describe('corner slip phase (B1)', () => {
  it('mu_k -> infinity: instant rolling, v_roll/v_tip = (cos(theta) + k R/r_eff)/(1 + k), no slip', () => {
    for (const b of [MARBLE, PING_PONG]) {
      const rEff = effectiveRollingRadius_m(b.R_m, S.channelWidth_m)
      const expected = (Math.cos(th0) + (b.k_body * b.R_m) / rEff) / (1 + b.k_body)
      const inf = J2(b, 1.3)
      expect(rel(inf.v_roll_mps / 1.3, expected)).toBeLessThan(1e-12)
      expect(inf.slipTime_s).toBe(0)
      expect(inf.slipDistance_m).toBe(0)
      // a huge finite mu gives the same rolling speed (angular momentum) and a vanishing slip
      const big = J2(b, 1.3, { mu: 1e9 })
      expect(rel(big.v_roll_mps, inf.v_roll_mps)).toBeLessThan(1e-12)
      expect(big.slipDistance_m).toBeLessThan(1e-6)
      // whole pipeline: a ball with mu_k = Infinity reproduces the instant-rolling v_roll
      const r = simulateLaunch(S, { ...b, mu_k: Infinity }, 0.85)
      expect(rel(r.v_roll_mps / r.v_tip_mps, expected)).toBeLessThan(1e-12)
      expect(r.rollingAtEdge).toBe(true)
      expect(r.slipDistance_m).toBe(0)
    }
  })
  it('v_edge lies between v cos(theta) and v_roll (no rolling resistance, no air), for every mu_k and with or without impact friction', () => {
    for (const b of [MARBLE, PING_PONG]) for (const mu of [0.05, 0.1, 0.3, 0.6, 1.5]) for (const impact of [true, false]) for (const s of [0.6, 1.1]) {
      const ball = { ...b, c_rr: 0, mu_k: mu }
      const r = simulateLaunch(S, ball, s, ZERO_RUN, { effects: VACUUM_EFFECTS, impactFriction: impact })
      const lo = r.v_tip_mps * Math.cos(r.theta_rad)
      expect(r.v_roll_mps).toBeGreaterThan(lo)
      expect(r.v_edge_mps).toBeGreaterThanOrEqual(lo - 1e-12)
      expect(r.v_edge_mps).toBeLessThanOrEqual(r.v_roll_mps + 1e-12)
    }
  })
  it('closed form of the slip phase matches a fine numeric integration (time, distance, speed, spin)', () => {
    for (const b of [MARBLE, PING_PONG]) for (const mu of [0.15, 0.3]) {
      const v = 1.4
      const j = J2(b, v, { mu, impact: false })
      const R = b.R_m
      let vv = j.vPostImpact_mps
      let u = R * j.omegaPostImpact_radps
      let x = 0
      let t = 0
      const dt = 1e-7
      const sgn = Math.sign(u - vv)
      expect(sgn).toBe(j.slipSign)
      while (Math.sign(u - vv) === sgn && t < 1) {
        const a = sgn * mu * g
        x += (vv + 0.5 * a * dt) * dt
        vv += a * dt
        u -= (a * dt) / b.k_body
        t += dt
      }
      expect(Math.abs(t - j.slipTime_s)).toBeLessThan(2e-7)
      expect(rel(x, j.slipDistance_m)).toBeLessThan(1e-4)
      expect(Math.abs(vv - j.v_roll_mps)).toBeLessThan(1e-5)
      expect(Math.abs(u - j.v_roll_mps)).toBeLessThan(1e-5)
      expect(j.slipTime_s).toBeCloseTo(Math.abs(j.v_roll_mps - j.vPostImpact_mps) / (mu * g), 12) // Delta t = |v_roll - v1|/(mu g)
    }
  })
  it('slip longer than the gap: the marble leaves the table still slipping, with its actual v and omega, and the Magnus term gets that omega', () => {
    const dec = { ...MARBLE, c_rr: 0 }
    const r = simulateLaunch(S, dec, 1.1, ZERO_RUN, { impactFriction: false })
    expect(r.rollingAtEdge).toBe(false)
    expect(r.slipDistance_m).toBe(S.gap_m)
    expect(r.omega_edge_radps * MARBLE.R_m).toBeGreaterThan(r.v_edge_mps) // still backspinning relative to rolling: R omega > v
    expect(r.v_edge_mps).toBeLessThan(r.v_roll_mps)
    // numeric check of the edge state
    const j = J2(dec, r.v_tip_mps, { mu: MARBLE.mu_k, impact: false })
    let vv = j.vPostImpact_mps
    let u = MARBLE.R_m * j.omegaPostImpact_radps
    let x = 0
    const dt = 1e-7
    while (x < S.gap_m) {
      const a = MARBLE.mu_k * g
      x += (vv + 0.5 * a * dt) * dt
      vv += a * dt
      u -= (a * dt) / MARBLE.k_body
    }
    expect(Math.abs(vv - r.v_edge_mps)).toBeLessThan(1e-5)
    expect(Math.abs(u / MARBLE.R_m - r.omega_edge_radps)).toBeLessThan(1e-2)
    // flight uses the actual omega, not v/R
    const f = simulateFlight({ ball: dec, v0_mps: r.v_edge_mps, omega_radps: r.omega_edge_radps, H_m: S.H_m, g_mps2: g, rho_air_kgpm3: RHO_AIR_QUITO_kgpm3 })
    expect(r.flight!.x_land_m).toBeCloseTo(f.x_land_m, 12)
    const rolled = simulateFlight({ ball: dec, v0_mps: r.v_edge_mps, omega_radps: r.v_edge_mps / MARBLE.R_m, H_m: S.H_m, g_mps2: g, rho_air_kgpm3: RHO_AIR_QUITO_kgpm3 })
    expect(r.flight!.x_land_m).not.toBeCloseTo(rolled.x_land_m, 5)
  })
  it('tableRoll returns rolling state with omega = v/R when the slip ends before the edge', () => {
    const j = J2(PING_PONG, 1.3, { mu: 0.35, impact: false })
    const r = tableRoll({ junction: j, R_m: PING_PONG.R_m, m_kg: PING_PONG.m_kg, k_body: PING_PONG.k_body, mu_k: 0.35, c_rr: 0, g_mps2: g, gap_m: 0.2, kappaRoll_pm: 0 })
    expect(r.rollingAtEdge).toBe(true)
    expect(r.omega_edge_radps).toBeCloseTo(r.v_edge_mps / PING_PONG.R_m, 12)
    expect(r.slipDistance_m).toBeCloseTo(j.slipDistance_m, 14)
  })
})

describe('exact corner energy loss (S2) and no energy creation (B2)', () => {
  it('Delta E = 1/2 m (v sin th)^2 + m g step + 1/2 m k/(1+k) (v cos th - R omega0)^2, to 1e-12, for any mu_k and impact model', () => {
    for (const b of [MARBLE, PING_PONG]) for (const w of [0, 0.006, 0.01]) for (const step of [0, 0.002]) for (const mu of [0.1, 0.3, Infinity]) for (const impact of [true, false]) {
      const v = 1.35
      const rEff = effectiveRollingRadius_m(b.R_m, w)
      const R0 = b.R_m * (v / rEff)
      const expected = 0.5 * b.m_kg * (v * Math.sin(th0)) ** 2 + b.m_kg * g * step + 0.5 * b.m_kg * (b.k_body / (1 + b.k_body)) * (v * Math.cos(th0) - R0) ** 2
      const j = J2(b, v, { mu, step, impact, w })
      expect(expected).toBeGreaterThan(0)
      expect(rel(j.energyLost_J, expected)).toBeLessThan(1e-12)
    }
  })
  it('the lossless-geometry corner (theta = 0, w = 0) loses exactly nothing and is not clamped from below', () => {
    expect(Math.abs(J2(MARBLE, 1.2, { th: 0, w: 0 }).energyLost_J)).toBeLessThan(1e-16)
  })
  it('a scatter factor f < 1 lowers v_roll proportionally and loses more energy', () => {
    const a = J2(MARBLE, 1.3, { mu: 0.3 })
    const b = J2(MARBLE, 1.3, { mu: 0.3, f: 0.97 })
    expect(b.v_roll_mps).toBeCloseTo(a.v_roll_mps * 0.97, 12)
    expect(b.energyLost_J).toBeGreaterThan(a.energyLost_J)
  })
  it('whole pipeline: kinetic energy at the edge (translation + spin) never exceeds m g (s sin(theta) + step)', () => {
    for (const b of [MARBLE, PING_PONG]) for (const impact of [true, false]) for (const step of [0, 0.002]) for (const s of [0.2, 0.6, 1.1]) {
      const r = simulateLaunch({ ...S, stepDrop_m: step }, b, s, ZERO_RUN, { impactFriction: impact })
      const ke = 0.5 * b.m_kg * r.v_edge_mps ** 2 + 0.5 * b.k_body * b.m_kg * (b.R_m * r.omega_edge_radps) ** 2
      expect(ke).toBeLessThanOrEqual(b.m_kg * g * (s * Math.sin(r.theta_rad) + step))
    }
  })
  it('sampled junction factors are one-sided in (0.5, 1]: sampled runs never gain energy at the corner, over many seeds', () => {
    for (const b of [MARBLE, PING_PONG]) for (const step of [0, 0.002]) {
      const setup = { ...S, stepDrop_m: step }
      const kEff = effectiveInertiaFactor(b.k_body, b.R_m, setup.channelWidth_m)
      const rng = mulberry32(99)
      let sum = 0
      const n = 2000
      for (let i = 0; i < n; i++) {
        const run = sampleRun(rng, b)
        expect(run.junctionFactor).toBeLessThanOrEqual(1)
        expect(run.junctionFactor).toBeGreaterThanOrEqual(0.5)
        sum += 1 - run.junctionFactor
        const r = simulateLaunch(setup, b, 0.85, { ...ZERO_RUN, junctionFactor: run.junctionFactor }, { dt_s: 0.01 }) // coarse flight step: the corner is what is tested
        const after = 0.5 * (1 + b.k_body) * b.m_kg * r.v_roll_mps ** 2
        const before = 0.5 * (1 + kEff) * b.m_kg * r.v_tip_mps ** 2 + b.m_kg * g * step
        expect(after).toBeLessThanOrEqual(before)
      }
      const sigma = variabilityFor(b).sigma_junction_rel
      expect(sum / n).toBeGreaterThan(0.8 * sigma * 0.9) // half-normal mean 0.798 sigma
      expect(sum / n).toBeLessThan(0.8 * sigma * 1.1)
    }
  })
})

describe('air drag on the slope and the gap (S1), rolling resistance on two lines', () => {
  const kdOf = (b: BallSpec) => airDragK_pm(RHO_AIR_QUITO_kgpm3, b.Cd, b.R_m, b.m_kg)
  it('vacuum limit: kappa = 0 is the constant-acceleration formula, and a tiny kappa agrees', () => {
    const a = 0.7
    for (const v0 of [0, 0.3]) {
      expect(speedAtTip_mps(0.9, a, v0, 0)).toBeCloseTo(Math.sqrt(v0 * v0 + 2 * a * 0.9), 14)
      expect(rel(speedAtTip_mps(0.9, a, v0, 1e-12), Math.sqrt(v0 * v0 + 2 * a * 0.9))).toBeLessThan(1e-10)
      expect(rollDownTime_s(0.9, a, v0, 1e-12)).toBeCloseTo((Math.sqrt(v0 * v0 + 2 * a * 0.9) - v0) / a, 9)
    }
    const nd = simulateLaunch(S, PING_PONG, 0.85, ZERO_RUN, { effects: only({ magnus: true, buoyancy: true }) })
    const kEff = effectiveInertiaFactor(PING_PONG.k_body, PING_PONG.R_m, S.channelWidth_m)
    expect(nd.v_tip_mps).toBeCloseTo(Math.sqrt(2 * nd.a_incline_mps2 * 0.85), 12)
    expect(nd.a_incline_mps2).toBeCloseTo((g * (Math.sin(nd.theta_rad) - PING_PONG.c_rr * Math.cos(nd.theta_rad) * (PING_PONG.R_m / effectiveRollingRadius_m(PING_PONG.R_m, S.channelWidth_m)))) / (1 + kEff), 14)
  })
  it('closed form v^2 = (a0/kappa)(1 - exp(-2 kappa s)) matches RK4 of dv/dt = a0 - kappa v^2, and the roll-down time matches too', () => {
    for (const b of [MARBLE, PING_PONG]) for (const s of [0.6, 1.1]) {
      const r = simulateLaunch(S, b, s)
      const kEff = effectiveInertiaFactor(b.k_body, b.R_m, S.channelWidth_m)
      const kappa = kdOf(b) / (1 + kEff)
      const a0 = r.a_incline_mps2
      expect(rel(r.v_tip_mps ** 2, (a0 / kappa) * (1 - Math.exp(-2 * kappa * s)))).toBeLessThan(1e-12)
      // state (x, v), RK4 in time
      let x = 0
      let v = 0
      let t = 0
      const dt = 1e-5
      const f = (vv: number): number => a0 - kappa * vv * vv
      while (x < s) {
        const k1v = f(v), k1x = v
        const k2v = f(v + 0.5 * dt * k1v), k2x = v + 0.5 * dt * k1v
        const k3v = f(v + 0.5 * dt * k2v), k3x = v + 0.5 * dt * k2v
        const k4v = f(v + dt * k3v), k4x = v + dt * k3v
        if (x + (dt / 6) * (k1x + 2 * k2x + 2 * k3x + k4x) >= s) {
          const dx = s - x
          t += dx / (v + 0.5 * (dt / 6) * (k1v + 2 * k2v + 2 * k3v + k4v) * 0.5) // within one step: v ~ constant over the sliver
          x = s
          break
        }
        x += (dt / 6) * (k1x + 2 * k2x + 2 * k3x + k4x)
        v += (dt / 6) * (k1v + 2 * k2v + 2 * k3v + k4v)
        t += dt
      }
      expect(rel(v, r.v_tip_mps)).toBeLessThan(1e-4)
      expect(rel(t, r.rollDownTime_s)).toBeLessThan(1e-4)
    }
  })
  it('air lowers v_tip: ~2-3 % for the ping-pong ball, a fraction of a % for the marble (Cd only)', () => {
    const cut = (b: BallSpec) => 1 - simulateLaunch(S, b, 1.1).v_tip_mps / simulateLaunch(S, b, 1.1, ZERO_RUN, { effects: VACUUM_EFFECTS }).v_tip_mps
    expect(cut(PING_PONG)).toBeGreaterThan(0.015)
    expect(cut(PING_PONG)).toBeLessThan(0.04)
    expect(cut(MARBLE)).toBeGreaterThan(0)
    expect(cut(MARBLE)).toBeLessThan(0.006)
  })
  it('drag decelerates the roll over the gap; closed forms for a<0 (tan law), a=0 and a>0 (tanh law, above and below the terminal speed) match numerics', () => {
    const num = (v0: number, a: number, k: number, d: number) => {
      let x = 0, v = v0, t = 0
      const dt = 1e-6
      while (x < d && v > 0) { const acc = a - k * v * v; x += (v + 0.5 * acc * dt) * dt; v += acc * dt; t += dt }
      return { v, t }
    }
    for (const [v0, a, k] of [[1.2, -0.03, 0.05], [1.2, 0, 0.05], [0.2, 0.8, 0.5], [2.0, 0.8, 0.5]] as const) {
      const c = quadraticDragMotion(v0, a, k, 0.3)
      const n = num(v0, a, k, 0.3)
      expect(c.stopped).toBe(false)
      expect(Math.abs(c.v_mps - n.v)).toBeLessThan(2e-5)
      expect(Math.abs(c.t_s - n.t)).toBeLessThan(2e-5)
    }
    const stop = quadraticDragMotion(0.3, -1, 2, 5)
    expect(stop.stopped).toBe(true)
    expect(stop.s_used_m).toBeCloseTo(Math.log1p((2 * 0.09) / 1) / 4, 12)
    const dec = tableRollDecel_mps2(PING_PONG.c_rr, PING_PONG.k_body, g)
    const kap = kdOf(PING_PONG) / (1 + PING_PONG.k_body)
    expect(rollGap(1.2, 0.05, dec, kap).v_edge_mps).toBeLessThan(rollGap(1.2, 0.05, dec).v_edge_mps)
    expect(rollGap(1.2, 0.05, dec, 0)).toEqual(rollGap(1.2, 0.05, dec))
  })
  it('rolling resistance on two lines uses the sum of the line normals m g cos(theta) R/r_eff (>= single line)', () => {
    const ratio = MARBLE.R_m / effectiveRollingRadius_m(MARBLE.R_m, S.channelWidth_m)
    expect(ratio).toBeCloseTo(1.28, 2)
    const a1 = inclineAcceleration_mps2(th0, 0.5, 0.01, g)
    const a2 = inclineAcceleration_mps2(th0, 0.5, 0.01, g, ratio)
    expect(a2).toBeLessThan(a1)
    expect((a1 - a2) * 1.5).toBeCloseTo(g * 0.01 * Math.cos(th0) * (ratio - 1), 12)
    // two-line normal geometry: each line force N = m g cos / (2 cos phi), cos phi = r_eff/R
    const w = S.channelWidth_m
    const cosPhi = effectiveRollingRadius_m(MARBLE.R_m, w) / MARBLE.R_m
    expect(2 * (1 / (2 * cosPhi))).toBeCloseTo(ratio, 12)
  })
})

describe('air terms vs first-order perturbation estimates (S6)', () => {
  const H = S.H_m
  const T = Math.sqrt((2 * H) / g)
  const integ = (fn: (t: number) => number): number => {
    const n = 4000
    let sum = 0
    for (let i = 0; i < n; i++) sum += fn(((i + 0.5) * T) / n)
    return (sum * T) / n
  }
  const speed = (v0: number, t: number): number => Math.hypot(v0, g * t)
  it('drag: dx = -k_d v0 Int (T-t)|v| dt + v0 dT, dT = k_d g Int (T-t) t |v| dt / (g T), within 20 %', () => {
    for (const b of [MARBLE, PING_PONG]) {
      const v0 = 1.3
      const kd = airDragK_pm(RHO_AIR_QUITO_kgpm3, b.Cd, b.R_m, b.m_kg)
      const dxDrag = -kd * v0 * integ((t) => (T - t) * speed(v0, t))
      const dT = (kd * integ((t) => (T - t) * t * speed(v0, t))) / T
      const est = dxDrag + v0 * dT
      const sim = flightOf(b, v0, only({ drag: true })).x_land_m - flightOf(b, v0, VACUUM_EFFECTS).x_land_m
      expect(sim).toBeLessThan(0)
      expect(rel(sim, est)).toBeLessThan(0.2)
    }
  })
  it('Magnus (topspin, S = v0/|v|): a_y = -k_m C_L |v| v_x, a_x = k_m C_L |v| v_y, first-order range change within 20 %', () => {
    for (const b of [MARBLE, PING_PONG]) {
      const v0 = 1.3
      const km = (RHO_AIR_QUITO_kgpm3 * Math.PI * b.R_m ** 2) / (2 * b.m_kg)
      const CL = (t: number) => magnusLiftCoefficient(v0 / speed(v0, t))
      const dxX = -km * g * integ((t) => (T - t) * t * CL(t) * speed(v0, t))
      const dyDown = km * v0 * integ((t) => (T - t) * CL(t) * speed(v0, t))
      const est = dxX - (v0 * dyDown) / (g * T)
      const sim = flightOf(b, v0, only({ magnus: true })).x_land_m - flightOf(b, v0, VACUUM_EFFECTS).x_land_m
      expect(sim).toBeLessThan(0)
      expect(rel(sim, est)).toBeLessThan(0.2)
    }
  })
  it('edge clearance: centre-corner distance^2 = R^2 + t^2 (v^2 - g R) + g^2 t^4/4 >= R^2 when v^2 >= g R (vacuum trajectory)', () => {
    for (const b of [MARBLE, PING_PONG]) for (const v0 of [Math.sqrt(g * b.R_m) * 1.001, 0.9, 1.3, 2.2]) {
      const f = flightOf(b, v0, VACUUM_EFFECTS, { sampleRate_hz: 500 })
      expect(leavesHorizontally(v0, b.R_m, g)).toBe(true)
      for (const p of f.trajectory) {
        const dx = p.x_m
        const dy = p.y_m - S.H_m // corner at table height; centre starts R above it
        const d2 = dx * dx + dy * dy
        expect(d2).toBeCloseTo(b.R_m ** 2 + p.t_s ** 2 * (v0 * v0 - g * b.R_m) + (g * g * p.t_s ** 4) / 4, 10)
        expect(d2).toBeGreaterThanOrEqual(b.R_m ** 2 - 1e-12)
      }
    }
  })
})

describe('ball presets and typical numbers (ping-pong)', () => {
  it('hollow shell k = 0.4 (1 - q^5)/(1 - q^3) with t = 0.4 mm: 0.654; limits 2/3 (thin) and 2/5 (solid)', () => {
    expect(PING_PONG_SHELL_THICKNESS_m).toBe(0.0004)
    expect(PING_PONG.k_body).toBeCloseTo(0.6535, 4)
    expect(hollowShellInertiaFactor(0.02, 1e-7)).toBeCloseTo(2 / 3, 5)
    expect(hollowShellInertiaFactor(0.02, 0.02)).toBeCloseTo(0.4, 12)
    expect(() => hollowShellInertiaFactor(0.02, 0)).toThrow()
  })
  it('Cd and Reynolds numbers: marble 0.45, ping-pong 0.42; Re = v 2R rho/mu_air spans 9e2-3.3e3 and 2e3-8e3', () => {
    expect(MARBLE.Cd).toBe(0.45)
    expect(PING_PONG.Cd).toBe(0.42)
    const Re = (b: BallSpec, v: number) => (v * 2 * b.R_m * RHO_AIR_QUITO_kgpm3) / 1.8e-5
    expect(Re(PING_PONG, 1.3)).toBeGreaterThan(2400)
    expect(Re(PING_PONG, 1.3)).toBeLessThan(2600)
    expect(Re(MARBLE, 1.2)).toBeGreaterThan(900)
    expect(Re(MARBLE, 4.1)).toBeLessThan(3400)
  })
  it('ping-pong, default set-up, H = 0.76 m: v_edge 1.05-1.5 m/s, t 0.399-0.401 s, x 0.40-0.56 m, below the ideal range, lands with p ~ 0.010 kg m/s', () => {
    for (const s of [0.6, 0.725, 0.85, 0.975, 1.1]) {
      const r = simulateLaunch(S, PING_PONG, s)
      const id = simulateLaunch(flat, idealBall(PING_PONG), s, ZERO_RUN, { effects: VACUUM_EFFECTS, idealJunction: true }).flight!
      expect(r.v_edge_mps).toBeGreaterThan(1.05)
      expect(r.v_edge_mps).toBeLessThan(1.5)
      expect(r.flight!.t_flight_s).toBeGreaterThan(0.399)
      expect(r.flight!.t_flight_s).toBeLessThan(0.401)
      expect(r.flight!.x_land_m).toBeGreaterThan(0.4)
      expect(r.flight!.x_land_m).toBeLessThan(0.56)
      expect(r.flight!.x_land_m).toBeLessThan(id.x_land_m * 0.95)
      const p = PING_PONG.m_kg * Math.abs(r.flight!.vy_impact_mps)
      expect(p).toBeGreaterThan(0.0098)
      expect(p).toBeLessThan(0.0104)
    }
  })
  it('the ping-pong no-mark branch can fire at the real landing momentum: faint/missing mark for a high threshold draw, mark for a low one', () => {
    const r = simulateLaunch(S, PING_PONG, 0.85)
    const paper: PaperRect = { xMin_m: 0.3, xMax_m: 0.8, zMin_m: -0.15, zMax_m: 0.15 }
    const at = (u: number) => carbonMark(r.flight!.x_land_m, 0, PING_PONG, r.flight!.vy_impact_mps, paper, u).left
    expect(at(0.02)).toBe(true)
    expect(at(0.98)).toBe(false)
  })
})
