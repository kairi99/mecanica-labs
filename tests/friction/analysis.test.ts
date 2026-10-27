import { describe, expect, it } from 'vitest'
import teacherDoc from '../../docs/teacher-key-friction.md?raw'
import { teacherKey } from '../../src/experiments/friction/pedagogy/teacherKey.ts'
import {
  compareWithLiterature, forceRow, fullAnalysis, inclineTrial, table41, table42, table43Material, weight_N,
} from '../../src/experiments/friction/analysis/compute.ts'
import type { ForceRowInput } from '../../src/experiments/friction/analysis/compute.ts'
import { analysisFromApparatus } from '../../src/experiments/friction/analysis/fromApparatus.ts'
import { analysisCSV } from '../../src/experiments/friction/analysis/csv.ts'
import { createApparatus } from '../../src/experiments/friction/apparatus/index.ts'
import {
  BAR_PAIRS, COURSE_m, FACE_PAIRS, G_QUITO_mps2 as g, inclineAngle_rad, onsetHeight_m, slideAcceleration_mps2, slideTime_s,
} from '../../src/experiments/friction/physics/index.ts'

const M = 0.1
/** Exact (noise-free) readings of Tabla 4.1 for given mu_k per face, and the scale division. */
const exactRows = (muK: [number, number], division = 0.02): ForceRowInput[] =>
  [0, 1].flatMap((fi) => [0, 1, 2, 3].map((k) => ({ readings_N: Array(5).fill(muK[fi]! * (M + k * 0.05) * g) as number[], division_N: division })))

describe('Tabla 4.1: force against weight', () => {
  it('a weighted fit of exact data recovers mu_k as the slope and a zero intercept', () => {
    const r = table41({ M_kg: M, rows: exactRows([0.3, 0.55]) })
    expect(r.fits[0]!.mu_k).toBeCloseTo(0.3, 10)
    expect(r.fits[1]!.mu_k).toBeCloseTo(0.55, 10)
    expect(Math.abs(r.fits[0]!.intercept_N!)).toBeLessThan(1e-9)
  })
  it('a constant zero error (scale not zeroed) shows up as the intercept, not in the slope', () => {
    const rows = exactRows([0.3, 0.55]).map((r) => ({ ...r, readings_N: r.readings_N.map((x) => x! - 0.0195) }))
    const f = table41({ M_kg: M, rows }).fits[0]!
    expect(f.mu_k).toBeCloseTo(0.3, 9)
    expect(f.intercept_N).toBeCloseTo(-0.0195, 9)
  })
  it('row mean uncertainty combines s/sqrt(n) with the scale division (Type B d/sqrt(12)), which does not average down', () => {
    const r = forceRow({ readings_N: [0.3, 0.3, 0.3, 0.3, 0.3], division_N: 0.02 })!
    expect(r.uA).toBe(0)
    expect(r.dF_N).toBeCloseTo(0.02 / Math.sqrt(12), 12)
    const r2 = forceRow({ readings_N: [0.28, 0.32, 0.3, 0.3, 0.3], division_N: 0.02 })!
    expect(r2.dF_N).toBeGreaterThan(r.dF_N)
  })
  it('a missing row is skipped and one point cannot be fitted', () => {
    const rows = exactRows([0.3, 0.55])
    rows[1] = { readings_N: [null, null, null, null, null], division_N: 0.02 }
    expect(table41({ M_kg: M, rows }).fits[0]!.masses).toEqual([0, 2, 3])
    const only1 = exactRows([0.3, 0.55]).map((r, i) => (i % 4 === 0 ? r : { readings_N: [null], division_N: 0.02 }))
    expect(table41({ M_kg: M, rows: only1 }).fits[0]!.mu_k).toBeNull()
  })
  it('weight W = (M + n m) g, with its uncertainty', () => {
    expect(weight_N(0.1, 2).W_N).toBeCloseTo(0.2 * g, 12)
    expect(weight_N(0.1, 2).sigma_W_N).toBeGreaterThan(0)
  })
})

describe('Tabla 4.2: mu_s = F_max / (M g)', () => {
  it('recovers mu_s from the exact peak and propagates the uncertainty', () => {
    const rows = [0.4, 0.72].map((mu) => ({ readings_N: Array(5).fill(mu * M * g) as number[], division_N: 0.02 }))
    const r = table42(rows, M)
    expect(r[0]!.mu_s).toBeCloseTo(0.4, 12)
    expect(r[1]!.mu_s).toBeCloseTo(0.72, 12)
    expect(r[0]!.sigma_mu_s / r[0]!.mu_s).toBeGreaterThan(0.01)
    expect(table42([{ readings_N: [null], division_N: 0.02 }], M)[0]).toBeNull()
  })
})

describe('Tabla 4.3: theta, a and mu', () => {
  it('exact (h, t) at the onset recover mu_k = tan theta - a / (g cos theta) for every bar', () => {
    for (const bar of ['wood', 'aluminium', 'iron'] as const) {
      const { mu_s, mu_k } = BAR_PAIRS[bar]
      const h = onsetHeight_m(mu_s)
      const t = slideTime_s(COURSE_m, slideAcceleration_mps2(inclineAngle_rad(h), mu_k, g))
      const r = inclineTrial(h, t)!
      expect(r.mu).toBeCloseTo(mu_k, 10)
      expect(r.a_mps2).toBeCloseTo(slideAcceleration_mps2(inclineAngle_rad(h), mu_k, g), 10)
    }
  })
  it('mean and delta mu from five trials; a +0.1 s timing bias raises mu', () => {
    const { mu_s, mu_k } = BAR_PAIRS.wood
    const h = onsetHeight_m(mu_s)
    const t = slideTime_s(COURSE_m, slideAcceleration_mps2(inclineAngle_rad(h), mu_k, g))
    const exact = table43Material(Array.from({ length: 5 }, () => ({ h_m: h, t_s: t })))
    expect(exact.mu).toBeCloseTo(mu_k, 10)
    expect(exact.delta_mu!).toBeGreaterThan(0)
    const late = table43Material(Array.from({ length: 5 }, () => ({ h_m: h, t_s: t + 0.1 })))
    expect(late.mu!).toBeGreaterThan(exact.mu!)
  })
  it('invalid or empty trials are ignored', () => {
    expect(inclineTrial(0, 1.5)).toBeNull()
    expect(inclineTrial(2, 1.5)).toBeNull()
    expect(table43Material([{ h_m: null, t_s: 1 }]).mu).toBeNull()
  })
})

describe('literature comparison', () => {
  it('relative error is signed and uses the student\'s own value', () => {
    const c = compareWithLiterature(0.45, 0.02, 0.5)!
    expect(c.relativeError_pct).toBeCloseTo(-10, 12)
    expect(c.comparison.verdict).toBe('beyond2')
    expect(compareWithLiterature(0.45, 0.02, 0)).toBeNull()
  })
})

describe('analysis from the apparatus and the CSV', () => {
  it('works on tables filled by typing; the CSV is localized', () => {
    const lab = createApparatus('exp12', { seed: 31 })
    for (let k = 0; k < 4; k++) for (let i = 0; i < 5; i++) lab.tableSetForce('4.1', k, i, (0.3 * (0.1 + 0.05 * k) * g).toFixed(3))
    for (let i = 0; i < 5; i++) lab.tableSetForce('4.2', 0, i, '0.39')
    const a = analysisFromApparatus(lab)
    expect(a.t41!.fits[0]!.mu_k!).toBeCloseTo(0.3, 1)
    expect(a.t42[0]!.mu_s).toBeCloseTo(0.39 / (lab.getState().measuredBlock_kg! * g), 9)
    expect(analysisCSV(a, 'es')).toContain(';')
    expect(analysisCSV(a, 'es')).toMatch(/Tela;0;0,\d+;0,\d+/)
    expect(analysisCSV(a, 'en')).toMatch(/Cloth,0,0\.\d+,0\.\d+/)
    expect(fullAnalysis({ M_kg: null, t41: [], t42: [], t43: [] }).t41).toBeNull()
  })
})

describe('teacher key', () => {
  const md = teacherKey()
  it('is deterministic', () => { expect(teacherKey()).toBe(md) })
  it('states the expected peak, plateau, onset and slide numbers from the model', () => {
    expect(md).toContain(FACE_PAIRS.cloth.mu_k.toFixed(3))
    expect(md).toContain(onsetHeight_m(BAR_PAIRS.iron.mu_s).toFixed(3))
  })
  it('docs/teacher-key-friction.md is up to date with the model (run npm run teacher-key)', () => {
    expect(teacherDoc.trimEnd()).toBe(md.trimEnd())
  })
})
