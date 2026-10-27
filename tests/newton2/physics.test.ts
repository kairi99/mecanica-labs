import { describe, expect, it } from 'vitest'
import {
  DEFAULT_DIGICART_BODY, DEFAULT_PULLEY, DEFAULT_VARIABILITY, G_QUITO_mps2, NOMINAL_PARTS, NO_VARIABILITY, RHO_AIR_QUITO_kgpm3,
  balanceReading_kg, balanceTypeB_kg, buildTrajectory, closedFormCrossing_s, constantAcceleration_mps2, crossingTime_s, deg2rad,
  drawPartMasses, effectiveMass_kg, floorTravel_m, hangAtRelease_m, idealAcceleration_mps2, linearFit, loading, mulberry32, railTilt_rad,
  sampleRun, stringHeight_m, totalMass_kg, trajectoryAt, stringWeight_N, acceleration_mps2, rk4Step, type Newton2Params, type RunGeometry,
} from '../../src/experiments/newton2/physics/index.ts'

const FAR: RunGeometry = { sFloor_m: 10, sReceiver_m: 10 }
const mk = (mHang_kg: number, over: Partial<Newton2Params> = {}): Newton2Params => ({
  g_mps2: G_QUITO_mps2, rho_air_kgpm3: RHO_AIR_QUITO_kgpm3, cart: DEFAULT_DIGICART_BODY, mCartLoad_kg: 0.005, mHang_kg, mString_kg: 0.0002, stringLinDensity_kgpm: 0, hang0_m: 0.02,
  pulley: DEFAULT_PULLEY, tilt_rad: 0, ...over,
})
const ideal = (m: number): Newton2Params => mk(m, {
  rho_air_kgpm3: 0, mString_kg: 0, pulley: { inertiaMass_kg: 0, F_friction_N: 0 },
  cart: { ...DEFAULT_DIGICART_BODY, c_rr: 0, F_bearing_N: 0, F_breakaway_N: 0, wheelMass_kg: 0 },
})

describe('Newton second law for the pulled cart', () => {
  it('ideal limit (no friction, no rotational inertia, level): a = m g / Mt and t = sqrt(2 d / a)', () => {
    const p = ideal(0.0495)
    const a = (0.0495 * G_QUITO_mps2) / totalMass_kg(p)
    expect(constantAcceleration_mps2(p)).toBeCloseTo(a, 12)
    expect(idealAcceleration_mps2(p)).toBeCloseTo(a, 12)
    expect(crossingTime_s(0.9, p, FAR)!).toBeCloseTo(Math.sqrt((2 * 0.9) / a), 9)
  })
  it('rotational inertia and friction lower the acceleration below the ideal value', () => {
    const p = mk(0.0495)
    expect(constantAcceleration_mps2(p)).toBeLessThan(idealAcceleration_mps2(p))
    expect(effectiveMass_kg(p)).toBeGreaterThan(totalMass_kg(p))
  })
  it('closed form agrees with the RK4 path when air drag is negligible (1e-6 s)', () => {
    const p = mk(0.0395, { rho_air_kgpm3: 0 })
    const closed = closedFormCrossing_s(0.9, constantAcceleration_mps2(p))!
    expect(crossingTime_s(0.9, p, FAR)).toBeCloseTo(closed, 9) // takes the closed-form branch
    const rk = crossingTime_s(0.9, { ...p, rho_air_kgpm3: 1e-12 }, FAR)! // forces the RK4 + Brent branch
    expect(Math.abs(rk - closed)).toBeLessThan(1e-6)
  })
  it('air drag makes the run slightly slower', () => {
    const p = mk(0.0495)
    expect(crossingTime_s(0.9, p, FAR)!).toBeGreaterThan(crossingTime_s(0.9, { ...p, rho_air_kgpm3: 0 }, FAR)!)
  })
  it('F(a) over the four trials is a line with slope >= Mt and a positive intercept (friction), and an exact one without resistance', () => {
    const fits = (make: (m: number, load: number) => Newton2Params): { slope: number; intercept: number; Mt: number } => {
      const as: number[] = [], Fs: number[] = []
      for (const n of [4, 3, 2, 1]) {
        const p = make(0.0095 + 0.01 * n, 0.005 + 0.01 * (4 - n)) // masses moved to the cart: Mt constant
        as.push((2 * 0.9) / crossingTime_s(0.9, p, FAR)! ** 2)
        Fs.push(p.mHang_kg * G_QUITO_mps2)
      }
      const f = linearFit(as, Fs)
      return { slope: f.slope, intercept: f.intercept, Mt: totalMass_kg(make(0.0495, 0.005)) }
    }
    const real = fits((m, load) => mk(m, { mCartLoad_kg: load }))
    expect(real.slope).toBeGreaterThanOrEqual(real.Mt)
    expect(real.slope).toBeLessThan(real.Mt * 1.1)
    expect(real.intercept).toBeGreaterThan(0)
    const none = fits((m, load) => ({ ...ideal(m), mCartLoad_kg: load }))
    expect(none.slope).toBeCloseTo(none.Mt, 3) // constant total mass: exactly Mt
    expect(Math.abs(none.intercept)).toBeLessThan(1e-9)
  })
  it('tilt toward the pulley adds M g sin(tilt) to the pull, tilt away subtracts it', () => {
    const t = deg2rad(0.1)
    const a0 = constantAcceleration_mps2(mk(0.0495))
    expect(constantAcceleration_mps2(mk(0.0495, { tilt_rad: t }))).toBeGreaterThan(a0)
    expect(constantAcceleration_mps2(mk(0.0495, { tilt_rad: -t }))).toBeLessThan(a0)
    const p = mk(0.0495, { tilt_rad: t })
    const dF = 0.255 * G_QUITO_mps2 * Math.sin(t) // cart side mass 0.255 kg
    expect(constantAcceleration_mps2(p) - a0).toBeCloseTo(dF / effectiveMass_kg(p), 5)
  })
  it('a canister too light for static friction does not start the cart', () => {
    const p = mk(0.0004)
    expect(constantAcceleration_mps2(p)).toBe(0)
    expect(crossingTime_s(0.9, p, FAR)).toBeNull()
    expect(buildTrajectory(p, FAR, { s_m: 0, v_mps: 0 }).tRest_s).toBe(0)
  })
})

describe('string weight and static friction', () => {
  it('the hanging string adds lambda g (hang0 + s) to the driving force in the full model, not in the constant-force reference', () => {
    const p = mk(0.0495, { rho_air_kgpm3: 0, stringLinDensity_kgpm: 0.0002, hang0_m: 0.02 })
    expect(stringWeight_N(p, 0.9)).toBeCloseTo(0.0002 * G_QUITO_mps2 * 0.92, 12)
    expect(constantAcceleration_mps2(p)).toBeCloseTo(constantAcceleration_mps2({ ...p, stringLinDensity_kgpm: 0 }), 12)
    const t0 = crossingTime_s(0.9, { ...p, stringLinDensity_kgpm: 0 }, FAR)!
    const t1 = crossingTime_s(0.9, p, FAR)!
    expect(t1).toBeLessThan(t0) // extra pull
    // mean extra force ~ lambda g (hang0 + d/2): the time shift matches the constant-force estimate to first order
    const extra = 0.0002 * G_QUITO_mps2 * (0.02 + 0.45)
    const aWith = constantAcceleration_mps2({ ...p, stringLinDensity_kgpm: 0 }) + extra / effectiveMass_kg(p)
    expect(Math.abs(t1 - Math.sqrt((2 * 0.9) / aWith))).toBeLessThan(0.003)
  })
  it('the breakaway force holds a cart at rest but not a moving one', () => {
    const p = mk(0.0005, { rho_air_kgpm3: 0 }) // drive 4.9 mN: above the kinetic resistances (2.5 mN), below kinetic + breakaway (7.5 mN)
    expect(acceleration_mps2(0, p)).toBe(0)
    expect(acceleration_mps2(1e-6, p)).toBeGreaterThan(0)
    expect(rk4Step({ s_m: 0, v_mps: 0 }, 0.01, p, 'driven').v_mps).toBe(0)
    expect(rk4Step({ s_m: 0, v_mps: 0.05 }, 0.01, p, 'driven').v_mps).toBeGreaterThan(0.05)
  })
})

describe('string, floor and receiver', () => {
  it('the rail tilt follows sin(tilt) = dh / d plus the bench tilt, positive toward the receiver', () => {
    expect(railTilt_rad(0.061, 0.06, 1.1)).toBeCloseTo(Math.asin(0.001 / 1.1), 12)
    expect(railTilt_rad(0.06, 0.06, 1.1, 0.001)).toBeCloseTo(0.001, 12)
    expect(railTilt_rad(0.06, 0.061, 1.1)).toBeLessThan(0)
  })
  it('the canister falls as far as the cart travels: the floor is reached at s = h - hang - hang0', () => {
    const h = stringHeight_m(0.92, 0.06)
    expect(h).toBeCloseTo(1.01, 12)
    expect(floorTravel_m(h, 0.02)).toBeCloseTo(0.93, 12)
    expect(hangAtRelease_m(1.095, 1.06)).toBeCloseTo(0.02, 12)
    expect(hangAtRelease_m(1.0, 1.06)).toBeLessThan(0) // string too short
  })
  it('after the canister meets the floor the cart coasts and decelerates; the impact time is the closed form', () => {
    const p = mk(0.0495, { rho_air_kgpm3: 0 })
    const geo: RunGeometry = { sFloor_m: 0.5, sReceiver_m: 5 }
    const a = constantAcceleration_mps2(p)
    const tr = buildTrajectory(p, geo, { s_m: 0, v_mps: 0 })
    expect(tr.tFloor_s!).toBeCloseTo(Math.sqrt((2 * 0.5) / a), 4)
    expect(tr.vFloor_mps!).toBeCloseTo(a * tr.tFloor_s!, 3)
    const vAfter = trajectoryAt(tr, tr.tFloor_s! + 0.5).v_mps
    expect(vAfter).toBeLessThan(tr.vFloor_mps!)
    expect(vAfter).toBeGreaterThan(0)
    // slower than the pulled run to the same mark
    expect(crossingTime_s(0.9, p, geo)!).toBeGreaterThan(crossingTime_s(0.9, p, FAR)!)
  })
  it('a coasting cart that friction stops before the mark never reaches it', () => {
    const p = mk(0.0095, { cart: { ...DEFAULT_DIGICART_BODY, c_rr: 0.02 } })
    expect(crossingTime_s(0.9, p, { sFloor_m: 0.1, sReceiver_m: 1.06 })).toBeNull()
  })
  it('a mark beyond the receiver stop is never reached; the cart ends at the stop', () => {
    const p = mk(0.0495)
    expect(crossingTime_s(0.9, p, { sFloor_m: 10, sReceiver_m: 0.7 })).toBeNull()
    const tr = buildTrajectory(p, { sFloor_m: 10, sReceiver_m: 0.7 }, { s_m: 0, v_mps: 0 })
    expect(tr.tReceiver_s).not.toBeNull()
    expect(tr.s_m[tr.s_m.length - 1]).toBeCloseTo(0.7, 9)
  })
})

describe('masses, balance, variability', () => {
  it('hidden masses stay within the tolerance and are deterministic for a seed', () => {
    const a = drawPartMasses(mulberry32(7)), b = drawPartMasses(mulberry32(7)), c = drawPartMasses(mulberry32(8))
    expect(a).toEqual(b)
    expect(a).not.toEqual(c)
    for (const m of a.masses_kg) expect(Math.abs(m - 0.01)).toBeLessThanOrEqual(1e-4 + 1e-12)
  })
  it('a plastic screw goes with every mass moved to the cart: the total grows by one screw each', () => {
    const base = loading(NOMINAL_PARTS, ['canister', 'canister', 'canister', 'canister'], true)
    const moved = loading(NOMINAL_PARTS, ['canister', 'canister', 'canister', 'cart'], true)
    const sum = (l: ReturnType<typeof loading>): number => l.mHang_kg + l.mCartLoad_kg
    expect(sum(moved) - sum(base)).toBeCloseTo(NOMINAL_PARTS.plasticScrew_kg, 12)
    expect(moved.plasticUsed).toBe(1)
    const lost = loading(NOMINAL_PARTS, ['canister', 'canister', 'canister', 'bench'], true)
    expect(sum(base) - sum(lost)).toBeCloseTo(0.01, 12)
    expect(lost.mLeftOut_kg).toBeCloseTo(0.01, 12)
  })
  it('the balance rounds to 0.1 g with Type B u = 0.1 g / sqrt(12)', () => {
    expect(balanceReading_kg(0.30449)).toBeCloseTo(0.3045, 9)
    expect(balanceReading_kg(0.30441)).toBeCloseTo(0.3044, 9)
    expect(balanceTypeB_kg()).toBeCloseTo(0.0001 / Math.sqrt(12), 12)
  })
  it('run variability is deterministic for a seed, zero with NO_VARIABILITY, and never makes a held cart move', () => {
    const p = mk(0.0495)
    expect(sampleRun(p, mulberry32(3))).toEqual(sampleRun(p, mulberry32(3)))
    expect(sampleRun(p, mulberry32(3))).not.toEqual(sampleRun(p, mulberry32(4)))
    expect(sampleRun(p, mulberry32(3), NO_VARIABILITY)).toEqual({ init: { s_m: 0, v_mps: 0 }, params: p })
    expect(sampleRun(mk(0.0004), mulberry32(3), DEFAULT_VARIABILITY).init.v_mps).toBe(0)
    for (let s = 1; s < 50; s++) expect(sampleRun(p, mulberry32(s)).init.v_mps).toBeGreaterThanOrEqual(0)
  })
})
