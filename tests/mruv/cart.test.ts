import { describe, expect, it } from 'vitest'
import {
  DEFAULT_CART, DEFAULT_VARIABILITY, G_QUITO_mps2, NO_VARIABILITY, RHO_AIR_QUITO_kgpm3, brent, closedFormCrossing_s, closedFormState,
  constantAcceleration_mps2, crossingTime_s, deg2rad, effectiveMass_kg, heightDifferenceForAngle_m, idealAcceleration_mps2,
  inclineAngle_rad, inertiaRatio, mulberry32, rad2deg, sampleCrossingTime_s, sampleRun, stateAt, standHeightForAngle_m,
  gravity_mps2, breakawayAngle_rad, type CartParams,
} from '../../src/experiments/mruv/physics/index.ts'

const frictionless: CartParams = { ...DEFAULT_CART, c_rr: 0, F_bearing_N: 0, rho_air_kgpm3: 0 }
const noDrag: CartParams = { ...DEFAULT_CART, rho_air_kgpm3: 0 }

describe('site constants', () => {
  it('g in Quito is about 9.77 m/s^2 (international formula + free-air correction)', () => {
    expect(G_QUITO_mps2).toBeGreaterThan(9.770)
    expect(G_QUITO_mps2).toBeLessThan(9.774)
  })
  it('gravity decreases with altitude by the free-air gradient 3.086e-6 per metre', () => {
    expect(gravity_mps2(0, 0) - gravity_mps2(0, 1000)).toBeCloseTo(3.086e-3, 9)
  })
  it('gravity at the pole exceeds the equator (1980 International Gravity Formula series)', () => {
    expect(gravity_mps2(90, 0)).toBeGreaterThan(gravity_mps2(0, 0))
  })
  it('air density at Quito altitude is about 0.9 kg/m^3, well below sea level 1.2', () => {
    expect(RHO_AIR_QUITO_kgpm3).toBeGreaterThan(0.84)
    expect(RHO_AIR_QUITO_kgpm3).toBeLessThan(0.95)
  })
})

describe('incline geometry', () => {
  it('sin(theta) = delta h / d', () => {
    const d = 1.2
    const dh = d * Math.sin(deg2rad(1.3))
    expect(rad2deg(inclineAngle_rad(0.1 + dh, 0.1, d))).toBeCloseTo(1.3, 10)
  })
  it('table tilt adds to the rail angle', () => {
    expect(inclineAngle_rad(0.2, 0.1, 1, deg2rad(0.2)) - inclineAngle_rad(0.2, 0.1, 1)).toBeCloseTo(deg2rad(0.2), 12)
  })
  it('stand height for a target angle round-trips', () => {
    const th = deg2rad(1.3)
    const h = standHeightForAngle_m(th, 1.1, 0.05, deg2rad(0.1))
    expect(inclineAngle_rad(h, 0.05, 1.1, deg2rad(0.1))).toBeCloseTo(th, 12)
    expect(heightDifferenceForAngle_m(th, 1.1)).toBeCloseTo(1.1 * Math.sin(th), 12)
  })
  it('rejects impossible geometry', () => {
    expect(() => inclineAngle_rad(2, 0, 1)).toThrow()
    expect(() => inclineAngle_rad(1, 0, 0)).toThrow()
  })
})

describe('cart dynamics', () => {
  it('frictionless limit: a = g sin(theta) / (1 + k)', () => {
    const k = inertiaRatio(frictionless)
    expect(constantAcceleration_mps2(frictionless)).toBeCloseTo((frictionless.g_mps2 * Math.sin(frictionless.theta_rad)) / (1 + k), 12)
    expect(idealAcceleration_mps2(frictionless)).toBeCloseTo(constantAcceleration_mps2(frictionless), 12)
  })
  it('wheel inertia: m_eff = m + sum(I)/r^2', () => {
    const p = DEFAULT_CART
    expect(effectiveMass_kg(p)).toBeCloseTo(p.m_kg + p.wheelCount * 0.5 * p.wheelMass_kg, 12)
  })
  it('energy balance: m g sin(theta) s = 1/2 m_eff v^2 without dissipation (translation + rotation)', () => {
    const p = frictionless
    for (const s of [0.1, 0.5, 0.9]) {
      const t = crossingTime_s(s, p)!
      const v = stateAt(t, p).v_mps
      expect(0.5 * effectiveMass_kg(p) * v * v).toBeCloseTo(p.m_kg * p.g_mps2 * Math.sin(p.theta_rad) * s, 6)
    }
  })
  it('dissipation: with friction and drag the kinetic energy is below the potential energy lost', () => {
    const p = DEFAULT_CART
    const t = crossingTime_s(0.9, p)!
    const v = stateAt(t, p).v_mps
    expect(0.5 * effectiveMass_kg(p) * v * v).toBeLessThan(p.m_kg * p.g_mps2 * Math.sin(p.theta_rad) * 0.9)
  })
  it('friction lowers the acceleration and lengthens the times', () => {
    expect(constantAcceleration_mps2(noDrag)).toBeLessThan(constantAcceleration_mps2(frictionless))
    expect(crossingTime_s(0.9, noDrag)!).toBeGreaterThan(crossingTime_s(0.9, frictionless)!)
  })
  it('air drag lengthens the time slightly (<1 %) at these speeds', () => {
    const a = crossingTime_s(0.9, DEFAULT_CART)!
    const b = crossingTime_s(0.9, noDrag)!
    expect(a).toBeGreaterThan(b)
    expect((a - b) / b).toBeLessThan(0.01)
  })
  it('crossing times match the closed form without drag (exact quadratic)', () => {
    for (let i = 1; i <= 9; i++) {
      const s = i / 10
      expect(crossingTime_s(s, noDrag)!).toBeCloseTo(Math.sqrt((2 * s) / constantAcceleration_mps2(noDrag)), 10)
    }
  })
  it('RK4 matches the closed form x(t) for the constant-force part', () => {
    const a = constantAcceleration_mps2(noDrag)
    const init = { s_m: 0.002, v_mps: 0.01 }
    const rk = stateAt(2.5, noDrag, init)
    const cf = closedFormState(2.5, a, init)
    expect(rk.s_m).toBeCloseTo(cf.s_m, 9)
    expect(rk.v_mps).toBeCloseTo(cf.v_mps, 9)
  })
  it('RK4 with drag converges as the step shrinks, and the crossing root matches the RK4 stepped state', () => {
    const p = { ...DEFAULT_CART, Cd: 40 } // exaggerated drag to test the nonlinear term
    const coarse = stateAt(2, p, undefined, { dt_s: 0.01 })
    const fine = stateAt(2, p, undefined, { dt_s: 0.0005 })
    expect(coarse.s_m).toBeCloseTo(fine.s_m, 7)
    const t = crossingTime_s(0.5, p)!
    expect(stateAt(t, p).s_m).toBeCloseTo(0.5, 9)
  })
  it('model with assumed parameters gives a in 0.19-0.22 m/s^2 (t(0.1) ~ 1.0 s, t(0.9) ~ 2.9 s)', () => {
    expect(constantAcceleration_mps2(DEFAULT_CART)).toBeGreaterThan(0.19)
    expect(constantAcceleration_mps2(DEFAULT_CART)).toBeLessThan(0.22)
    expect(crossingTime_s(0.1, DEFAULT_CART)!).toBeGreaterThan(0.95)
    expect(crossingTime_s(0.1, DEFAULT_CART)!).toBeLessThan(1.05)
    expect(crossingTime_s(0.9, DEFAULT_CART)!).toBeGreaterThan(2.85)
    expect(crossingTime_s(0.9, DEFAULT_CART)!).toBeLessThan(3.05)
  })
  it('static friction: a cart on too gentle a slope does not move', () => {
    const p = { ...DEFAULT_CART, theta_rad: deg2rad(0.02) }
    expect(constantAcceleration_mps2(p)).toBe(0)
    expect(crossingTime_s(0.1, p)).toBeNull()
  })
  it('breakaway: at rest 0.1 deg stays put, 1.30 deg rolls; breakaway angle is ~0.15 deg', () => {
    const at = (deg: number) => ({ ...DEFAULT_CART, theta_rad: deg2rad(deg) })
    expect(constantAcceleration_mps2(at(0.1))).toBe(0)
    expect(crossingTime_s(0.1, at(0.1))).toBeNull()
    expect(crossingTime_s(0.1, { ...at(0.1), rho_air_kgpm3: 0 })).toBeNull()
    expect(crossingTime_s(0.1, at(1.3))).not.toBeNull()
    expect(rad2deg(breakawayAngle_rad(DEFAULT_CART))).toBeGreaterThan(0.14)
    expect(rad2deg(breakawayAngle_rad(DEFAULT_CART))).toBeLessThan(0.16)
    expect(constantAcceleration_mps2(at(0.16))).toBeGreaterThan(0)
    expect(constantAcceleration_mps2(at(0.145))).toBe(0)
  })
  it('breakaway acts only at rest: a moving cart on a slope between kinetic and breakaway thresholds keeps accelerating', () => {
    const p = { ...DEFAULT_CART, theta_rad: deg2rad(0.1), rho_air_kgpm3: 0 }
    expect(crossingTime_s(0.05, p, { s_m: 0, v_mps: 0.01 })).not.toBeNull()
  })
  it('starting beyond the mark takes zero time; closed-form crossing handles v0 and unreachable marks', () => {
    expect(crossingTime_s(0, DEFAULT_CART)).toBe(0)
    expect(closedFormCrossing_s(1, 0, { s_m: 0, v_mps: 0 })).toBeNull()
    expect(closedFormCrossing_s(1, -1, { s_m: 0, v_mps: 1 })).toBeNull()
    expect(closedFormCrossing_s(0.4, -1, { s_m: 0, v_mps: 1 })!).toBeCloseTo(1 - Math.sqrt(0.2), 12)
  })
})

describe('root finder', () => {
  it('Brent finds sqrt(2) and rejects an unbracketed interval', () => {
    expect(brent((x) => x * x - 2, 0, 2)).toBeCloseTo(Math.SQRT2, 10)
    expect(() => brent((x) => x * x + 1, 0, 2)).toThrow()
  })
})

describe('run variability (separate from the expectation)', () => {
  const mark = 0.5
  it('zero variability returns exactly the expectation', () => {
    const rng = mulberry32(1)
    expect(sampleCrossingTime_s(mark, DEFAULT_CART, rng, NO_VARIABILITY)).toBe(crossingTime_s(mark, DEFAULT_CART))
  })
  it('is deterministic for a seed, scatters at the few-ms level and runs EARLY by E|v0|/a (half-normal finger lift)', () => {
    const run = (seed: number) => {
      const rng = mulberry32(seed)
      return Array.from({ length: 400 }, () => sampleCrossingTime_s(mark, DEFAULT_CART, rng)!)
    }
    const a = run(7)
    expect(run(7)).toEqual(a)
    const m = a.reduce((x, y) => x + y, 0) / a.length
    const sd = Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / (a.length - 1))
    // v0 >= 0 shifts t by about -v0/a: mean shift = -sigma_v0 sqrt(2/pi) / a (release offset has zero mean)
    const shift = (DEFAULT_VARIABILITY.sigma_v0_mps * Math.sqrt(2 / Math.PI)) / constantAcceleration_mps2(DEFAULT_CART)
    expect(m - crossingTime_s(mark, DEFAULT_CART)!).toBeLessThan(0)
    expect(Math.abs(m - crossingTime_s(mark, DEFAULT_CART)! + shift)).toBeLessThan(4 * sd / Math.sqrt(a.length) + 5e-4)
    expect(sd).toBeGreaterThan(0.001)
    expect(sd).toBeLessThan(0.03)
  })
  it('initial velocity is never negative (half-normal): a finger lift cannot push the cart uphill', () => {
    const rng = mulberry32(21)
    for (let i = 0; i < 500; i++) expect(sampleRun(DEFAULT_CART, rng).init.v_mps).toBeGreaterThanOrEqual(0)
  })
  it('c_rr never goes negative and the sampled run keeps the other parameters', () => {
    const r = sampleRun({ ...DEFAULT_CART, c_rr: 1e-6 }, mulberry32(3), { sigma_release_m: 0, sigma_v0_mps: 0, sigma_crr_rel: 50 })
    expect(r.params.c_rr).toBeGreaterThanOrEqual(0)
    expect(r.params.m_kg).toBe(DEFAULT_CART.m_kg)
  })
})
