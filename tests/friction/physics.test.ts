import { describe, expect, it } from 'vitest'
import {
  BAR_PAIRS, FACE_PAIRS, G_QUITO_mps2 as g, PullSimulator, STEADY_HAND, simulateIncline, simulatePull, meanForce_N, mulberry32,
  inclineAngle_rad, inclineHeight_m, onsetHeight_m, slideAcceleration_mps2, slideTime_s, muFromSlide, sampleTrialCoefficients, sampleHand,
  sampleBenchMasses, FACE_SCATTER, BAR_SCATTER, NO_SCATTER, RAIL_SUPPORT_DIST_m, COURSE_m, type PullParams, type RaiseProfile,
} from '../../src/experiments/friction/physics/index.ts'

const params = (over: Partial<PullParams> = {}): PullParams => ({
  k_Npm: 10, c_Nspm: 1.0, mass_kg: 0.1, mu_s: 0.72, mu_k: 0.55, g_mps2: g, paperTravel_m: Infinity, hand: STEADY_HAND, ...over,
})

describe('spring-block: static peak and kinetic plateau', () => {
  it('static peak is mu_s N (slow pull: damping term negligible)', () => {
    const p = params()
    const r = simulatePull(p, [{ t_s: 0, speed_mps: 0.005 }], 30)
    const N = p.mass_kg * g
    // dashpot adds c v to the force at breakaway: peak = mu_s N - c v
    expect(r.summary.F_breakaway_N!).toBeCloseTo(p.mu_s * N - p.c_Nspm * 0.005, 2)
    expect(r.summary.F_breakaway_N!).toBeGreaterThan(p.mu_k * N)
  })
  it('plateau at steady speed is mu_k N and below the static peak', () => {
    const p = params()
    const N = p.mass_kg * g
    const r = simulatePull(p, [{ t_s: 0, speed_mps: 0.05 }], 6)
    expect(meanForce_N(r.samples, 4, 6)).toBeCloseTo(p.mu_k * N, 2)
    expect(r.summary.F_max_N).toBeGreaterThan(meanForce_N(r.samples, 4, 6))
  })
  it('stick-slip appears for a very slow pull with a soft spring and not for a fast one with a stiff one', () => {
    const slow = simulatePull(params(), [{ t_s: 0, speed_mps: 0.01 }], 40)
    expect(slow.summary.restickCount).toBeGreaterThanOrEqual(2)
    const fast = simulatePull(params({ k_Npm: 20 }), [{ t_s: 0, speed_mps: 0.1 }], 4)
    expect(fast.summary.restickCount).toBe(0)
    const last = fast.samples.filter((s) => s.t_s > 3)
    expect(last.every((s) => s.sliding)).toBe(true)
  })
  it('force and energy balance: work of the spring on the block = friction work + kinetic energy + stored change (undamped limit)', () => {
    const p = params({ c_Nspm: 1e-9, mass_kg: 0.2 })
    const sim = new PullSimulator(p)
    sim.setSpeed(0, 0.05)
    sim.advanceTo(3)
    const s = sim.now()
    const N = p.mass_kg * g
    // spring energy supplied by the pull end: integral of F dx_pull = friction dissipated + KE + spring energy, with
    // friction work = mu_k N * distance (block slid after breakaway)
    const Wdone = sim.samples().reduce((acc, cur, i, a) => (i === 0 ? 0 : acc + 0.5 * (cur.F_N + a[i - 1]!.F_N) * (cur.x_pull_m - a[i - 1]!.x_pull_m)), 0)
    const KE = 0.5 * p.mass_kg * s.v_block_mps ** 2
    const Es = 0.5 * p.k_Npm * (s.x_pull_m - s.x_block_m) ** 2
    const fr = p.mu_k * N * s.x_block_m
    expect(Wdone).toBeCloseTo(fr + KE + Es, 2)
  })
  it('is deterministic', () => {
    const h = sampleHand(mulberry32(3))
    const a = simulatePull(params({ hand: h }), [{ t_s: 0, speed_mps: 0.04 }], 3)
    const b = simulatePull(params({ hand: h }), [{ t_s: 0, speed_mps: 0.04 }], 3)
    expect(a.samples).toEqual(b.samples)
  })
  it('result does not depend on where the run is split (incremental advance equals one advance)', () => {
    const p = params()
    const a = new PullSimulator(p); a.setSpeed(0, 0.03); a.advanceTo(2)
    const b = new PullSimulator(p); b.setSpeed(0, 0.03); for (let t = 0.1; t < 2.0001; t += 0.1) b.advanceTo(t)
    expect(b.now().F_N).toBeCloseTo(a.now().F_N, 6)
  })
  it('a late reading after the breakaway catches the dropped force', () => {
    const r = simulatePull(params(), [{ t_s: 0, speed_mps: 0.01 }], 15)
    const tb = r.summary.breakaway_t_s!
    const at = (t: number): number => r.samples.reduce((best, s) => (Math.abs(s.t_s - t) < Math.abs(best.t_s - t) ? s : best)).F_N
    expect(at(tb + 0.3)).toBeLessThan(r.summary.F_breakaway_N! - 0.05)
  })
  it('without a pull nothing moves; leaving the paper switches to the bare table coefficients', () => {
    const idle = simulatePull(params(), [], 2)
    expect(idle.summary.breakaway_t_s).toBeNull()
    const off = simulatePull(params({ paperTravel_m: 0.1, off: { mu_s: 0.3, mu_k: 0.2, muSRange: [0.2, 0.4] } }), [{ t_s: 0, speed_mps: 0.08 }], 8)
    expect(off.summary.leftPaper_t_s).not.toBeNull()
    expect(meanForce_N(off.samples, 7, 8)).toBeCloseTo(0.2 * 0.1 * g, 1)
  })
})

describe('incline (exp. 3)', () => {
  const profile = (rate: number, stopAt?: number): RaiseProfile => ({ h0_m: 0, segments: stopAt === undefined ? [{ t_s: 0, rate_mps: rate }] : [{ t_s: 0, rate_mps: rate }, { t_s: stopAt, rate_mps: 0 }] })
  it('geometry: sin(theta) = h / L and the inverse', () => {
    expect(inclineAngle_rad(inclineHeight_m(0.4))).toBeCloseTo(0.4, 12)
    expect(inclineHeight_m(Math.PI / 6)).toBeCloseTo(RAIL_SUPPORT_DIST_m / 2, 12)
  })
  it('onset at tan(theta) = mu_s', () => {
    const mu_s = 0.5
    const run = simulateIncline(profile(0.005), mu_s, 0.4, g)
    expect(Math.tan(inclineAngle_rad(run.onset_h_m!))).toBeCloseTo(mu_s, 6)
    expect(run.onset_h_m!).toBeCloseTo(onsetHeight_m(mu_s), 6)
    expect(run.onset_t_s!).toBeCloseTo(onsetHeight_m(mu_s) / 0.005, 3)
  })
  it('does not slip if the rack range ends before the onset', () => {
    expect(simulateIncline(profile(0.01), 2.5, 2, g).onset_t_s).toBeNull()
  })
  it('a = g (sin theta - mu_k cos theta); with theta frozen the slide time is sqrt(2d/a) (closed form vs RK4)', () => {
    const mu_s = 0.5, mu_k = 0.4
    const hOn = onsetHeight_m(mu_s)
    const stopT = hOn / 0.005 + 0.2 // 1 mm/s... the student keeps cranking 0.2 s past the onset then stops
    const run = simulateIncline(profile(0.005, stopT), mu_s, mu_k, g)
    const hStop = 0.005 * stopT
    const th = inclineAngle_rad(hStop)
    const a = slideAcceleration_mps2(th, mu_k, g)
    // the first 0.2 s have slightly smaller theta; compare with the frozen-angle closed form after correcting by the exact sample at the stop
    const tStop = 0.2
    const sNow = run.slide.find((s) => Math.abs(s.t_s - tStop) < 5e-4)!
    const rest = COURSE_m - sNow.s_m
    const tClosed = tStop + (-sNow.v_mps + Math.sqrt(sNow.v_mps ** 2 + 2 * a * rest)) / a
    expect(run.slideTime_s!).toBeCloseTo(tClosed, 2)
  })
  it('constant angle: pure MRUV from rest, t = sqrt(2 d / a) to within the RK4 step', () => {
    const mu_s = 0.5, mu_k = 0.4
    // raise instantly (huge rate) to a fixed angle above the onset
    const hFix = onsetHeight_m(mu_s) + 0.05
    const run = simulateIncline({ h0_m: hFix, segments: [] }, mu_s, mu_k, g)
    const a = slideAcceleration_mps2(inclineAngle_rad(hFix), mu_k, g)
    expect(run.onset_t_s).toBe(0)
    expect(run.slideTime_s!).toBeCloseTo(slideTime_s(COURSE_m, a), 3)
  })
  it('creep: just above threshold with mu_k close to mu_s it still slides (mu_k < mu_s) but slowly', () => {
    const mu_s = 0.5
    const fast = simulateIncline({ h0_m: onsetHeight_m(mu_s) + 1e-4, segments: [] }, mu_s, 0.3, g).slideTime_s!
    const slow = simulateIncline({ h0_m: onsetHeight_m(mu_s) + 1e-4, segments: [] }, mu_s, 0.499, g).slideTime_s
    expect(slow === null || slow > 5 * fast).toBe(true)
    expect(muFromSlide(inclineAngle_rad(onsetHeight_m(mu_s)), slideAcceleration_mps2(inclineAngle_rad(onsetHeight_m(mu_s)), 0.3, g), g)).toBeCloseTo(0.3, 10)
  })
  it('lowering the rail stops the bar (kinetic friction wins) and it re-sticks', () => {
    const mu_s = 0.5, mu_k = 0.4
    const hOn = onsetHeight_m(mu_s)
    const run = simulateIncline({ h0_m: hOn + 1e-4, segments: [{ t_s: 0.05, rate_mps: -0.2 }] }, mu_s, mu_k, g)
    expect(run.slideTime_s).toBeNull()
    expect(run.stopped).toBe(true)
  })
})

describe('variability', () => {
  it('mu_s stays above mu_k and scatter has the configured relative size', () => {
    const rng = mulberry32(5)
    const xs = Array.from({ length: 2000 }, () => sampleTrialCoefficients(rng, FACE_PAIRS.sandpaper, FACE_SCATTER))
    expect(xs.every((x) => x.mu_s > x.mu_k)).toBe(true)
    const m = xs.reduce((a, x) => a + x.mu_s, 0) / xs.length
    const sd = Math.sqrt(xs.reduce((a, x) => a + (x.mu_s - m) ** 2, 0) / (xs.length - 1))
    expect(m).toBeCloseTo(FACE_PAIRS.sandpaper.mu_s, 1)
    expect(sd / m).toBeGreaterThan(0.035)
    expect(sd / m).toBeLessThan(0.065)
  })
  it('no scatter returns the expectation; pairs obey mu_s > mu_k', () => {
    expect(sampleTrialCoefficients(mulberry32(1), BAR_PAIRS.wood, NO_SCATTER)).toEqual({ mu_s: 0.4, mu_k: 0.3 })
    for (const p of [...Object.values(FACE_PAIRS), ...Object.values(BAR_PAIRS)]) expect(p.mu_s).toBeGreaterThan(p.mu_k)
    void BAR_SCATTER
  })
  it('bench masses are seeded and near nominal', () => {
    const a = sampleBenchMasses(mulberry32(9)), b = sampleBenchMasses(mulberry32(9))
    expect(a).toEqual(b)
    expect(Math.abs(a.block_kg - 0.1)).toBeLessThanOrEqual(0.006)
    expect(a.masses_kg).toHaveLength(3)
  })
})
