import { describe, expect, it } from 'vitest'
import {
  gaussian, linearFit, mulberry32, quadraticFitEffectiveVariance, quadraticPosition_m, quadraticVelocity,
  weightedLinearFit, weightedQuadraticFit,
} from '../src/physics/index.ts'

const a_true = 0.21, v0_true = 0.01, x0_true = 0.002
const ts = [0, 0.5, 1, 1.4, 1.8, 2.2, 2.5, 2.8, 3.1, 3.4]
const xTrue = (t: number) => x0_true + v0_true * t + 0.5 * a_true * t * t

describe('linear fit', () => {
  it('recovers an exact line; weighted fit with equal sigmas agrees', () => {
    const xs = [0, 1, 2, 3], ys = xs.map((x) => 2 * x + 1)
    const f = linearFit(xs, ys)
    expect(f.slope).toBeCloseTo(2, 12)
    expect(f.intercept).toBeCloseTo(1, 12)
    const w = weightedLinearFit(xs, [1.1, 2.9, 5.2, 6.8], [1, 1, 1, 1])
    const l = linearFit(xs, [1.1, 2.9, 5.2, 6.8])
    expect(w.slope).toBeCloseTo(l.slope, 12)
    expect(w.intercept).toBeCloseTo(l.intercept, 12)
  })
})

describe('weighted quadratic fit', () => {
  it('recovers exact coefficients and a = 2 c2 from noiseless data', () => {
    const f = weightedQuadraticFit(ts, ts.map(xTrue), 0.001)
    expect(f.c0).toBeCloseTo(x0_true, 10)
    expect(f.c1).toBeCloseTo(v0_true, 10)
    expect(f.a_mps2).toBeCloseTo(a_true, 10)
    expect(f.chi2).toBeCloseTo(0, 12)
    expect(f.sigma_a_mps2).toBeCloseTo(2 * f.sigma_c2, 15)
  })
  it('coverage: |a_fit - a_true| < sigma_a for about 68 % of noisy data sets (given sigma_x)', () => {
    const rng = mulberry32(2026)
    const sx = 0.002
    let hit = 0
    const N = 600
    for (let r = 0; r < N; r++) {
      const f = weightedQuadraticFit(ts, ts.map((t) => xTrue(t) + sx * gaussian(rng)), sx)
      if (Math.abs(f.a_mps2 - a_true) < f.sigma_a_mps2) hit++
    }
    expect(hit / N).toBeGreaterThan(0.62) // binomial sd ~ 0.019: +-3 sd around 0.683
    expect(hit / N).toBeLessThan(0.75)
  })
  it('without sigma_x the covariance is rescaled by the residual variance and coverage still holds', () => {
    const rng = mulberry32(99)
    let hit = 0
    const N = 600
    for (let r = 0; r < N; r++) {
      const f = weightedQuadraticFit(ts, ts.map((t) => xTrue(t) + 0.003 * gaussian(rng)))
      expect(f.rescaled).toBe(true)
      if (Math.abs(f.a_mps2 - a_true) < f.sigma_a_mps2) hit++
    }
    expect(hit / N).toBeGreaterThan(0.6)
    expect(hit / N).toBeLessThan(0.77)
  })
  it('velocity from the fit: v(t) = c1 + 2 c2 t with covariance-propagated sigma', () => {
    const f = weightedQuadraticFit(ts, ts.map(xTrue), 0.001)
    const { v_mps, sigma_v_mps } = quadraticVelocity(f, 3)
    expect(v_mps).toBeCloseTo(v0_true + a_true * 3, 9)
    expect(sigma_v_mps).toBeGreaterThan(0)
    expect(quadraticPosition_m(f, 2)).toBeCloseTo(xTrue(2), 10)
  })
  it('rejects bad input', () => {
    expect(() => weightedQuadraticFit([0, 1], [0, 1])).toThrow()
    expect(() => weightedQuadraticFit(ts, ts.map(xTrue), 0)).toThrow()
  })
})

describe('effective-variance fit (noisy times)', () => {
  const sx = 0.001, st = 0.04
  it('reduces to the plain weighted fit when sigma_t = 0', () => {
    const x = ts.map(xTrue)
    const ev = quadraticFitEffectiveVariance(ts, x, sx, 0)
    expect(ev.fit.a_mps2).toBeCloseTo(weightedQuadraticFit(ts, x, sx).a_mps2, 12)
  })
  it('inflates the error bars with the local slope and gives honest coverage for noisy times', () => {
    const rng = mulberry32(5)
    let hit = 0, naiveHit = 0
    const N = 500
    for (let r = 0; r < N; r++) {
      // physical: the cart is at xTrue(tTrue); the stopwatch reports tTrue + noise (the tabulated quantity)
      const tMeas = ts.map((t) => t + st * gaussian(rng))
      const x = ts.map(xTrue)
      const ev = quadraticFitEffectiveVariance(tMeas, x, sx, st)
      if (Math.abs(ev.fit.a_mps2 - a_true) < ev.fit.sigma_a_mps2) hit++
      const naive = weightedQuadraticFit(tMeas, x, sx)
      if (Math.abs(naive.a_mps2 - a_true) < naive.sigma_a_mps2) naiveHit++
    }
    expect(hit / N).toBeGreaterThan(0.55)
    expect(hit / N).toBeLessThan(0.82)
    expect(hit / N).toBeGreaterThan(naiveHit / N) // ignoring sigma_t under-covers
  })
  it('sigma_eff grows with the velocity', () => {
    const ev = quadraticFitEffectiveVariance(ts, ts.map(xTrue), sx, st)
    expect(ev.sigmaEff_m[9]!).toBeGreaterThan(ev.sigmaEff_m[1]!)
    expect(ev.sigmaEff_m[0]!).toBeGreaterThanOrEqual(sx)
  })
})
