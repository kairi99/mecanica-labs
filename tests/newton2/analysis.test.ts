import { describe, expect, it } from 'vitest'
import teacherDoc from '../../docs/teacher-key-newton2.md?raw'
import {
  DISTANCE_m, SIGMA_D_m, analyse, analyseTrial, linearFitEffectiveVariance,
} from '../../src/experiments/newton2/analysis/compute.ts'
import { analysisCSV } from '../../src/experiments/newton2/analysis/csv.ts'
import { analysisFromApparatus } from '../../src/experiments/newton2/analysis/fromApparatus.ts'
import { createApparatus } from '../../src/experiments/newton2/apparatus/index.ts'
import { fillTableSimulated } from '../../src/experiments/newton2/pedagogy/simulatedReadings.ts'
import { teacherKey } from '../../src/experiments/newton2/pedagogy/teacherKey.ts'
import { G_QUITO_mps2, reactionBiasTypeB_s, typeBDigital } from '../../src/core/physics/index.ts'

/** Exact table for a line F = M a + F0: two equal readings per trial (sd 0). */
function synthetic(M: number, F0: number, forces: number[]): { forces_N: number[]; values_s: (number | null)[][] } {
  const values_s = forces.map((F) => {
    const a = (F - F0) / M
    const t = Math.sqrt((2 * DISTANCE_m) / a)
    return [t, t, ...Array(8).fill(null)] as (number | null)[]
  })
  return { forces_N: forces, values_s }
}

describe('per-trial statistics', () => {
  it('a = 2 d / t^2 with sigma_a^2/a^2 = (sigma_d/d)^2 + (2 u/t)^2 and u = sqrt(uA^2 + uRes^2)', () => {
    const times = [1.1, 1.2, 1.15, 1.13, 1.17]
    const t = analyseTrial(0, 0.48, times)
    const mean = times.reduce((a, b) => a + b, 0) / times.length
    expect(t.mean_s).toBeCloseTo(mean, 12)
    expect(t.a_mps2).toBeCloseTo((2 * 0.9) / mean ** 2, 12)
    const uA = t.sd_s / Math.sqrt(5)
    expect(t.u_s).toBeCloseTo(Math.hypot(uA, typeBDigital(0.01)), 12)
    expect(t.uTotal_s).toBeCloseTo(Math.hypot(t.u_s!, reactionBiasTypeB_s()), 12)
    expect(t.u_a_mps2).toBeCloseTo(t.a_mps2! * Math.hypot(SIGMA_D_m / 0.9, (2 * t.u_s!) / mean), 12)
    expect(t.uTotal_a_mps2!).toBeGreaterThan(t.u_a_mps2!)
  })
  it('a trial with fewer than two readings has no uncertainty and no acceleration', () => {
    const t = analyseTrial(1, 0.3, [1.5, null, null])
    expect(t.a_mps2).toBeNull()
    expect(t.u_s).toBeNull()
  })
})

describe('fit of F against a', () => {
  it('recovers the mass from exact synthetic data and the error against Mt is zero', () => {
    const { forces_N, values_s } = synthetic(0.3045, 0, [0.48, 0.39, 0.29, 0.19])
    const r = analyse({ forces_N, values_s, Mt_kg: 0.3045 })
    expect(r.fit!.M_kg).toBeCloseTo(0.3045, 9)
    expect(r.fit!.F0_N).toBeCloseTo(0, 9)
    expect(r.massComparison!.error_pct).toBeCloseTo(0, 6)
  })
  it('recovers a mass larger than Mt and the friction intercept, and the percent error is signed', () => {
    const { forces_N, values_s } = synthetic(0.32, 0.005, [0.48, 0.39, 0.29, 0.19])
    const r = analyse({ forces_N, values_s, Mt_kg: 0.3045 })
    expect(r.fit!.M_kg).toBeCloseTo(0.32, 9)
    expect(r.fit!.F0_N).toBeCloseTo(0.005, 9)
    expect(r.massComparison!.error_pct).toBeCloseTo(((0.32 - 0.3045) / 0.3045) * 100, 6)
    expect(r.massComparison!.absError_pct).toBeGreaterThan(0)
  })
  it('the effective-variance fit gives a larger weight to the less uncertain points and is exact on a line', () => {
    const x = [0.3, 0.6, 0.9, 1.2], y = x.map((v) => 0.31 * v + 0.004)
    const f = linearFitEffectiveVariance(x, y, [0.01, 0.01, 0.05, 0.05], [0.003, 0.003, 0.003, 0.003])
    expect(f.fit.slope).toBeCloseTo(0.31, 10)
    expect(f.fit.intercept).toBeCloseTo(0.004, 10)
  })
  it('needs two trials for a line; one trial gives no fit', () => {
    const { forces_N, values_s } = synthetic(0.3, 0, [0.48])
    expect(analyse({ forces_N, values_s }).fit).toBeNull()
  })
  it('the stop-press bias is reported as a separate effect, not folded into the weights', () => {
    const { forces_N, values_s } = synthetic(0.3045, 0, [0.48, 0.39, 0.29, 0.19])
    const r = analyse({ forces_N, values_s, Mt_kg: 0.3045 })
    expect(r.reactionEffect!.shift_s).toBeCloseTo(reactionBiasTypeB_s(), 12)
    expect(Math.abs(r.reactionEffect!.dM_pct)).toBeGreaterThan(0)
  })
  it('simulated student: M_fit stays within a few sigma of the true model slope; the answer to the guide questions is not computed', () => {
    const a = createApparatus('assembled', { seed: 4 })
    fillTableSimulated(a, { seed: 4, startLag_s: 0.25, stopLag_s: 0.25 })
    const r = analysisFromApparatus(a)
    expect(r.trials.filter((t) => t.n === 10)).toHaveLength(4)
    expect(r.fit!.M_kg).toBeGreaterThan(0.25)
    expect(r.fit!.M_kg).toBeLessThan(0.4)
    expect(Object.keys(r)).toEqual(['trials', 'points', 'fit', 'massComparison', 'reactionEffect'])
    const forceFromMass = r.points[0]!.F_N / G_QUITO_mps2
    expect(forceFromMass).toBeGreaterThan(0.045)
  })
})

describe('CSV of the analysis', () => {
  const a = createApparatus('assembled', { seed: 4 })
  fillTableSimulated(a, { seed: 4, perRow: 5 })
  const r = analysisFromApparatus(a)
  it('Spanish: ";" and decimal comma; English: "," and decimal point', () => {
    const es = analysisCSV(r, 'es'), en = analysisCSV(r, 'en')
    expect(es.split('\n')[0]).toContain(';')
    expect(es).toMatch(/\d,\d/)
    expect(en.split('\n')[0]).toContain(',')
    expect(en).toMatch(/\d\.\d/)
    expect(es).toContain('M_ajuste')
    expect(en).toContain('M_fit')
  })
})

describe('teacher key', () => {
  const md = teacherKey()
  it('is deterministic and states geometry, masses, the fit table, the tilt cases and the stop lag', () => {
    expect(teacherKey()).toBe(md)
    for (const s of ['## Geometry', '## Masses', 'Full model, level rail', 'tilt +0.025 deg', 'A constant +0.1 s', '## A simulated careful student']) expect(md).toContain(s)
  })
  it('docs/teacher-key-newton2.md is up to date with the model (run npm run teacher-key)', () => {
    expect(teacherDoc.trimEnd()).toBe(md.trimEnd())
  })
})
