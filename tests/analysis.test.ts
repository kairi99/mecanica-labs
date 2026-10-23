import { describe, expect, it } from 'vitest'
import teacherDoc from '../docs/teacher-key.md?raw'
import { createApparatus } from '../src/apparatus/index.ts'
import { MIN_MARKS_FOR_FIT, SIGMA_X_MARK_m, analyse, compare, markStats, residualsMm, tangentAt, vtCurve, xtCurve } from '../src/analysis/compute.ts'
import { comparisonInput } from '../src/analysis/fromApparatus.ts'
import { analysisCSV } from '../src/analysis/csv.ts'
import { pmText } from '../src/analysis/format.ts'
import { fillTableSimulated } from '../src/pedagogy/simulatedReadings.ts'
import { teacherKey, biasedFit } from '../src/pedagogy/teacherKey.ts'
import { strings as analysisStrings } from '../src/views/strings/analysis.ts'

/** Ideal MRUV from rest: x = a t^2 / 2 at 10..90 cm. */
const A_TRUE = 0.2
const tTrue = (row: number): number => Math.sqrt((2 * row * 0.1) / A_TRUE)
/** Table with `n` readings per mark: t_true + shift + a symmetric zero-sum scatter, so the mean is exactly t_true + shift. */
function table(shift_s: number, n = 10, rows = [1, 2, 3, 4, 5, 6, 7, 8, 9], scatter_s = 0.04): (number | null)[][] {
  return Array.from({ length: 10 }, (_, r) => (rows.includes(r)
    ? Array.from({ length: 10 }, (_, j) => (j < n ? tTrue(r) + shift_s + scatter_s * ((j % 2 === 0 ? 1 : -1) * (1 + Math.floor(j / 2) * 0.1)) * (j >= n - (n % 2) ? 0 : 1) : null))
    : Array.from({ length: 10 }, () => null)))
}

describe('task 1: mean time with uncertainty', () => {
  it('mean, s, s/sqrt(n), the fit u (A + resolution) and the combined u_c with the reaction bias', () => {
    const v: (number | null)[][] = Array.from({ length: 10 }, () => Array<number | null>(10).fill(null))
    v[1] = [1.0, 1.2, null, null, null, null, null, null, null, null]
    const m = markStats(v)[1]!
    expect(m.n).toBe(2)
    expect(m.mean_s).toBeCloseTo(1.1, 12)
    expect(m.sd_s).toBeCloseTo(Math.SQRT2 * 0.1, 12)
    expect(m.uA_s).toBeCloseTo(0.1, 12)
    expect(m.uRes_s).toBeCloseTo(0.01 / Math.sqrt(12), 12)
    expect(m.uReact_s).toBeCloseTo(0.1 / Math.sqrt(3), 12)
    // the reaction bias is a common systematic: NOT part of the per-point (fit) uncertainty
    expect(m.u_s).toBeCloseTo(Math.sqrt(0.1 ** 2 + (0.01 / Math.sqrt(12)) ** 2), 12)
    expect(m.uTotal_s).toBeCloseTo(Math.sqrt(0.1 ** 2 + (0.01 / Math.sqrt(12)) ** 2 + (0.1 / Math.sqrt(3)) ** 2), 12)
    expect(markStats(v)[0]!.mean_s).toBe(0)
  })
  it('the Type B reaction term does not shrink with more readings, the Type A term does', () => {
    const few = markStats(table(0, 2))[5]!
    const many = markStats(table(0, 10))[5]!
    expect(many.uReact_s).toBe(few.uReact_s)
    expect(many.uA_s).toBeLessThan(few.uA_s)
    expect(many.uTotal_s!).toBeGreaterThan(many.uReact_s)
    expect(many.u_s!).toBeLessThan(many.uReact_s) // with 10 readings the statistical part is below the systematic one
  })
  it('the reaction bias does not enter the fit weights: sigma_t of every fit point is the statistical u only', () => {
    const r = analyse(table(0, 10))
    const marks = r.marks
    for (const p of r.fit!.points) if (!p.isOrigin) expect(p.sigmaT_s).toBeCloseTo(marks[p.row]!.u_s!, 12)
  })
  it('reaction effect of a +0.1 s lag: a changes by well under 1 %, c1 by about -0.02 m/s, the mean velocity by about -3 %', () => {
    const re = analyse(table(0, 10)).reaction!
    expect(re.shift_s).toBe(0.1)
    expect(Math.abs(re.da_pct)).toBeLessThan(1)
    expect(re.dc1_mps).toBeLessThan(-0.01)
    expect(re.dc1_mps).toBeGreaterThan(-0.04)
    expect(re.dvWhole_pct!).toBeLessThan(-2)
    expect(re.dvWhole_pct!).toBeGreaterThan(-5)
  })
  it('rounds value and uncertainty to the same decimals, with a decimal comma in Spanish', () => {
    expect(pmText(1.0213, 0.058, 'en')).toBe('1.02 ± 0.06')
    expect(pmText(1.0213, 0.058, 'es')).toBe('1,02 ± 0,06')
  })
})

describe('tasks 2 to 4: mean velocities', () => {
  const r = analyse(table(0, 4))
  it('whole path, 30 cm and 10 cm intervals from the mean times', () => {
    expect(r.whole!.v_mps).toBeCloseTo(0.9 / tTrue(9), 3)
    expect(r.d30).toHaveLength(3)
    expect(r.d30[1]!.v_mps).toBeCloseTo(0.3 / (tTrue(6) - tTrue(3)), 3)
    expect(r.d10).toHaveLength(9)
    expect(r.d10[8]!.v_mps).toBeCloseTo(0.1 / (tTrue(9) - tTrue(8)), 3)
    expect(r.d10[0]!.from_cm).toBe(0)
  })
  it('later 10 cm intervals are faster than earlier ones (v grows with t) and every sigma is positive', () => {
    for (let i = 1; i < 9; i++) expect(r.d10[i]!.v_mps).toBeGreaterThan(r.d10[i - 1]!.v_mps)
    for (const v of [r.whole!, ...r.d30, ...r.d10]) expect(v!.sigma_v_mps).toBeGreaterThan(0)
  })
  it('a position uncertainty enters: sigma_x of a mark is two scale readings of the rail', () => {
    expect(SIGMA_X_MARK_m).toBeCloseTo(Math.SQRT2 * 0.001 / Math.sqrt(12), 12)
  })
})

describe('empty and partial tables', () => {
  it('an empty table gives no velocities and no fit, without throwing', () => {
    const r = analyse(Array.from({ length: 10 }, () => Array<number | null>(10).fill(null)))
    expect(r.readingsTotal).toBe(0)
    expect(r.whole).toBeNull()
    expect(r.d30).toEqual([null, null, null])
    expect(r.fit).toBeNull()
    expect(r.vEnd).toBeNull()
  })
  it('a velocity needs both ends: 0-30 appears with the 30 cm row, 30-60 does not', () => {
    const r = analyse(table(0, 3, [3]))
    expect(r.d30[0]).not.toBeNull()
    expect(r.d30[1]).toBeNull()
    expect(r.whole).toBeNull()
  })
  it('the fit needs MIN_MARKS_FOR_FIT marks with at least 2 readings each', () => {
    expect(analyse(table(0, 5, [3, 6])).fit).toBeNull()
    expect(analyse(table(0, 1, [3, 6, 9])).fit).toBeNull()
    expect(analyse(table(0, 1, [3, 6, 9])).marksForFit).toBe(0)
    const ok = analyse(table(0, 2, [3, 6, 9]))
    expect(MIN_MARKS_FOR_FIT).toBe(3)
    expect(ok.fit).not.toBeNull()
    expect(ok.fit!.points).toHaveLength(4)
  })
})

describe('tasks 6 to 10: fit, v(t), final velocity, residuals', () => {
  it('recovers the true acceleration of synthetic MRUV data within its sigma', () => {
    const r = analyse(table(0, 10))
    const q = r.fit!.fit
    expect(Math.abs(q.a_mps2 - A_TRUE)).toBeLessThan(q.sigma_a_mps2)
    expect(Math.abs(q.c1)).toBeLessThan(3 * q.sigma_c1)
  })
  it('a constant +0.1 s reaction offset leaves its footprint: c1 turns negative and the mean velocity comes out low', () => {
    const clean = analyse(table(0, 10))
    const late = analyse(table(0.1, 10))
    const q = late.fit!.fit
    expect(q.c1).toBeLessThan(-0.01)
    expect(q.c1).toBeGreaterThan(-2 * A_TRUE * 0.1 * 1.2)
    expect(late.whole!.v_mps).toBeLessThan(clean.whole!.v_mps * 0.98)
    expect(Math.abs(q.a_mps2 - A_TRUE)).toBeLessThan(q.sigma_a_mps2) // the free c1 absorbs most of it: a stays within sigma
  })
  it('v(t) = c1 + 2 c2 t, a = 2 c2 and the tangent slope is v(t)', () => {
    const f = analyse(table(0, 10)).fit!
    const q = f.fit
    const curve = vtCurve(f)
    expect(curve[0]!.v).toBeCloseTo(q.c1, 12)
    expect(curve[curve.length - 1]!.v).toBeCloseTo(q.c1 + 2 * q.c2 * curve[curve.length - 1]!.t, 12)
    expect(q.a_mps2).toBeCloseTo(2 * q.c2, 12)
    const tan = tangentAt(f, 1.5)
    expect(tan.v_mps).toBeCloseTo(q.c1 + 2 * q.c2 * 1.5, 12)
    expect(xtCurve(f).length).toBeGreaterThan(10)
  })
  it('task 9: v at the end from the fit is close to twice the mean velocity for MRUV from rest', () => {
    const e = analyse(table(0, 10)).vEnd!
    expect(e.fitted_mps).toBeCloseTo(e.twiceMean_mps, 2)
    expect(e.fitted_mps).toBeCloseTo(A_TRUE * tTrue(9), 2)
  })
  it('residuals of MRUV data are small compared with their sigma and have one point per mark', () => {
    const f = analyse(table(0, 10)).fit!
    const res = residualsMm(f)
    expect(res).toHaveLength(9)
    for (const p of res) expect(Math.abs(p.r_mm)).toBeLessThan(2 * p.sigma_mm)
  })
})

describe('comparison with the DigiCart record', () => {
  const app = createApparatus('assembled', { seed: 21 })
  fillTableSimulated(app, { seed: 5, startLag_s: 0.2, stopLag_s: 0.25, reactionSd_s: 0.04 })
  const input = comparisonInput(app)
  const cmp = compare(input)
  it('reference a from the true crossing times agrees with the model a', () => {
    expect(cmp.reference).not.toBeNull()
    expect(input.aModel_mps2).toBeGreaterThan(0.19)
    expect(Math.abs(cmp.reference!.a_mps2 - input.aModel_mps2!)).toBeLessThan(3 * cmp.reference!.sigma_a_mps2 + 0.003)
  })
  it('the mean reaction offset per mark shows the stop-minus-start lag as a systematic shift', () => {
    const offs = cmp.offsets.filter((o) => o !== null)
    expect(offs).toHaveLength(9)
    for (const o of offs) expect(Math.abs(o!.mean_s - 0.05)).toBeLessThan(4 * o!.sem_s + 0.01)
  })
  it('no stopwatch pairs for typed values: offsets are null', () => {
    const typed = createApparatus('assembled', { seed: 21 })
    for (let c = 0; c < 4; c++) typed.tableSet(3, c, 1.7)
    expect(compare(comparisonInput(typed)).offsets.every((o) => o === null)).toBe(true)
  })
})

describe('CSV export', () => {
  const r = analyse(table(0, 10))
  const cmp = compare({ runTimes_s: [], pairs: [], aModel_mps2: 0.2057 })
  it('Spanish: semicolon separator and decimal comma', () => {
    const csv = analysisCSV(r, { lang: 'es', comparison: cmp })
    const row = csv.split('\n').find((l) => l.startsWith('10;'))!
    expect(row.split(';').length).toBeGreaterThan(6)
    expect(row).toMatch(/\d,\d/)
    expect(csv).not.toMatch(/\d\.\d/)
  })
  it('English: comma separator and decimal point; model a only when asked', () => {
    const csv = analysisCSV(r, { lang: 'en', comparison: cmp })
    expect(csv.split('\n').find((l) => l.startsWith('10,'))).toMatch(/\d\.\d/)
    expect(csv).not.toContain('model a')
    expect(analysisCSV(r, { lang: 'en', comparison: cmp, includeModel: true })).toContain('model a')
  })
  it('an empty table still exports the header', () => {
    const e = analyse(Array.from({ length: 10 }, () => Array<number | null>(10).fill(null)))
    expect(analysisCSV(e, { lang: 'en' })).toContain(analysisStrings.en.csvT1)
  })
})

describe('teacher key', () => {
  const md = teacherKey()
  it('is deterministic and carries the geometry, model a, times, bias table and URL flags', () => {
    expect(teacherKey()).toBe(md)
    expect(md).toContain('24.96 mm')
    expect(md).toMatch(/Model a \(constant-force part\)/)
    expect(md).toMatch(/\| 90 \| 2\.9\d\d \|/)
    expect(md).toContain('?teacher')
    expect(md).toContain('?analysis=0')
    expect(md).toContain('?seed=N')
    expect(md).toContain('?preset=assembled')
  })
  it('docs/teacher-key.md is up to date with the model (run npm run teacher-key)', () => {
    expect(teacherDoc.trimEnd()).toBe(md.trimEnd())
  })
  it('a constant +0.1 s stop lag lowers the mean velocity and makes c1 negative', () => {
    const b0 = biasedFit(0), b1 = biasedFit(0.1)
    expect(b1.whole).toBeLessThan(b0.whole)
    expect(b1.c1).toBeLessThan(b0.c1 - 0.01)
  })
})

describe('analysis strings', () => {
  it('ES and EN keys match', () => {
    expect(Object.keys(analysisStrings.es).sort()).toEqual(Object.keys(analysisStrings.en).sort())
  })
})
