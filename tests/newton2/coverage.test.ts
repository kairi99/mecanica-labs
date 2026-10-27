import { describe, expect, it } from 'vitest'
import { createApparatus } from '../../src/experiments/newton2/apparatus/index.ts'
import { analysisFromApparatus } from '../../src/experiments/newton2/analysis/fromApparatus.ts'
import { DISTANCE_m } from '../../src/experiments/newton2/analysis/compute.ts'
import { fillTableSimulated } from '../../src/experiments/newton2/pedagogy/simulatedReadings.ts'
import {
  NO_VARIABILITY, NOMINAL_PARTS, linearFit, mulberry32, type Newton2Params, type PartMasses,
} from '../../src/experiments/newton2/physics/index.ts'

/**
 * An ensemble of benches whose canister weights fall at random places between the printed divisions of the spring scale, so that the
 * (deterministic) reading error is a random draw across the ensemble, as the Type B uncertainty assumes. The hidden masses vary by
 * +-1.2 g (ten times the real tolerance, which would freeze the rounding error of a nominal bench). Seeded.
 */
function benchParts(seed: number): PartMasses {
  const r = mulberry32(seed * 7919)
  return { ...NOMINAL_PARTS, canister_kg: 0.0095 + (r() * 2 - 1) * 0.0012, masses_kg: NOMINAL_PARTS.masses_kg.map(() => 0.01 + (r() * 2 - 1) * 0.0012) }
}

/** Slope and intercept of F against a through the noise-free model data of a bench (same seed and masses, no run scatter, exact weights). */
function truth(seed: number): { M: number; F0: number } {
  const app = createApparatus('assembled', { seed, variability: NO_VARIABILITY, parts: benchParts(seed) })
  const a: number[] = [], F: number[] = []
  for (const n of [4, 3, 2, 1]) {
    app.setTrial(n)
    if (app.getState().cart.released) app.resetCart()
    const rec = app.getRun((app.releaseCart(1000 * n) as { runId: number }).runId)!
    const p: Newton2Params = rec.params
    a.push((2 * DISTANCE_m) / rec.tEnd_s! ** 2)
    F.push(p.mHang_kg * p.g_mps2)
  }
  const f = linearFit(a, F)
  return { M: f.slope, F0: f.intercept }
}

/** One bench with human timing that has NO common bias (equal start and stop lags, 50 ms scatter) and the real run scatter. */
function measured(seed: number): { M: number; sM: number; F0: number; sF0: number; chi2: number } {
  const app = createApparatus('assembled', { seed, parts: benchParts(seed) })
  fillTableSimulated(app, { seed, startLag_s: 0.2, stopLag_s: 0.2, reactionSd_s: 0.05 })
  const r = analysisFromApparatus(app)
  return { M: r.fit!.M_kg, sM: r.fit!.sigma_M_kg, F0: r.fit!.F0_N, sF0: r.fit!.sigma_F0_N, chi2: r.fit!.fit.chi2_red ?? NaN }
}

describe('coverage of the fitted mass (Monte Carlo over seeded benches)', () => {
  it('|M_fit - M_true| <= sigma_M in about 68 % of the benches (60 to 78 % for 120 benches); M_true is the noise-free model slope', () => {
    let hit = 0, hitF0 = 0, chi = 0
    const N = 120
    for (let seed = 1; seed <= N; seed++) {
      const t = truth(seed), m = measured(seed)
      if (Math.abs(m.M - t.M) <= m.sM) hit++
      if (Math.abs(m.F0 - t.F0) <= m.sF0) hitF0++
      chi += m.chi2
    }
    const cov = hit / N
    console.log(`coverage M: ${(cov * 100).toFixed(1)} %  coverage F0: ${((hitF0 / N) * 100).toFixed(1)} %  mean chi2_red: ${(chi / N).toFixed(2)}`)
    expect(cov).toBeGreaterThan(0.6)
    expect(cov).toBeLessThan(0.78)
  }, 120000)
})
