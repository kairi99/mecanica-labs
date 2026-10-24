import { describe, expect, it } from 'vitest'
import teacherDoc from '../../docs/teacher-key-parabolic.md?raw'
import { createApparatus } from '../../src/experiments/parabolic/apparatus/index.ts'
import {
  G_UNCERTAINTY_mps2, SIGMA_H_m, analyseBall, differenceInSigma, expectedFlightTime, finalSpeed, fullAnalysis, referenceTime, timeError,
} from '../../src/experiments/parabolic/analysis/compute.ts'
import { ballAnalysis, slowmoReference } from '../../src/experiments/parabolic/analysis/fromApparatus.ts'
import { analysisCSV } from '../../src/experiments/parabolic/analysis/csv.ts'
import { fillTableSimulated } from '../../src/experiments/parabolic/pedagogy/simulatedReadings.ts'
import { spread, teacherKey } from '../../src/experiments/parabolic/pedagogy/teacherKey.ts'
import { BALLS } from '../../src/experiments/parabolic/physics/index.ts'
import { G_QUITO_mps2, reactionBiasTypeB_s, typeBAnalog, typeBDigital } from '../../src/core/physics/index.ts'

const grid = (rows: Array<Array<number | null>>): (number | null)[][] => {
  const out = rows.map((r) => [...r, ...Array(5 - r.length).fill(null)] as (number | null)[])
  while (out.length < 5) out.push(Array(5).fill(null))
  return out
}

describe('Tabla 2.1 means and uncertainty', () => {
  const t = grid([[0.40, 0.42, 0.38, 0.41, 0.39]])
  const x = grid([[0.500, 0.504, 0.496, 0.502, 0.498]])
  const r = analyseBall(t, x).trials[0]!
  it('means are the arithmetic means of the repetitions', () => {
    expect(r.t_s).toBeCloseTo(0.40, 12)
    expect(r.x_m).toBeCloseTo(0.50, 12)
  })
  it('Delta t is the quadrature of Type A, resolution and reaction bias (the bias does not average down)', () => {
    const sd = Math.sqrt((0 + 0.02 ** 2 + 0.02 ** 2 + 0.01 ** 2 + 0.01 ** 2) / 4)
    const uA = sd / Math.sqrt(5)
    expect(r.uA_t_s).toBeCloseTo(uA, 12)
    expect(r.u_t_s).toBeCloseTo(Math.sqrt(uA ** 2 + typeBDigital(0.01) ** 2 + reactionBiasTypeB_s() ** 2), 12)
    // with 5 or 500 identical-scatter readings the bias term stays: Delta t never falls below it
    expect(r.u_t_s!).toBeGreaterThan(reactionBiasTypeB_s())
    expect(r.uStat_t_s!).toBeLessThan(0.01)
  })
  it('Delta x combines Type A, the 1 mm tape reading and the 2 mm edge projection', () => {
    expect(r.u_x_m).toBeCloseTo(Math.sqrt(r.uA_x_m ** 2 + typeBAnalog(0.001) ** 2 + 0.002 ** 2), 12)
  })
  it('v0 = x/t with independent propagation', () => {
    expect(r.v0_mps).toBeCloseTo(0.5 / 0.4, 12)
    const rel = Math.hypot(r.u_x_m! / 0.5, r.u_t_s! / 0.4)
    expect(r.u_v0_mps).toBeCloseTo((0.5 / 0.4) * rel, 10)
  })
  it('handles empty trials and a single repetition without NaN', () => {
    const a = analyseBall(grid([[0.4]]), grid([[0.5]]))
    expect(a.trials[1]!.t_s).toBeNull()
    expect(a.trials[1]!.v0_mps).toBeNull()
    expect(a.trials[0]!.uA_t_s).toBe(0)
    expect(Number.isFinite(a.trials[0]!.u_v0_mps!)).toBe(true)
    expect(a.complete).toBe(1)
  })
  it('pools all readings and gives the spread of the trial means', () => {
    const a = analyseBall(grid([[0.4, 0.4], [0.5, 0.5]]), grid([]))
    expect(a.pooled!.n).toBe(4)
    expect(a.pooled!.t_s).toBeCloseTo(0.45, 12)
    expect(a.timeSpread_s).toBeCloseTo(0.1, 12)
  })
})

describe('expected time, percent error, final speed', () => {
  it('t = sqrt(2H/g) with g of Quito, independent of v0', () => {
    const e = expectedFlightTime(0.76)!
    expect(e.t_s).toBeCloseTo(Math.sqrt((2 * 0.76) / G_QUITO_mps2), 12)
    expect(e.t_s).toBeGreaterThan(0.39); expect(e.t_s).toBeLessThan(0.40)
  })
  it('propagates H and g: u_t = t/2 sqrt((uH/H)^2 + (ug/g)^2)', () => {
    const e = expectedFlightTime(0.76)!
    expect(e.u_t_s).toBeCloseTo(0.5 * e.t_s * Math.hypot(SIGMA_H_m / 0.76, G_UNCERTAINTY_mps2 / G_QUITO_mps2), 12)
    // numerically: a +u_H shift of H moves t by about the half relative amount
    const shifted = expectedFlightTime(0.76 + 1e-6)!
    expect((shifted.t_s - e.t_s) / 1e-6).toBeCloseTo(e.t_s / (2 * 0.76), 4)
  })
  it('rejects a height that is not a lab table', () => {
    expect(expectedFlightTime(0.05)).toBeNull()
    expect(expectedFlightTime(7)).toBeNull()
    expect(expectedFlightTime(NaN)).toBeNull()
  })
  it('percent error is (t - t_theo)/t_theo and the verdict uses both uncertainties', () => {
    const e = expectedFlightTime(0.76)!
    const r = timeError(e.t_s * 1.1, 0.05, e)
    expect(r.error_pct).toBeCloseTo(10, 10)
    expect(r.comparison.sigma_tot).toBeCloseTo(Math.hypot(0.05, e.u_t_s), 12)
    expect(r.comparison.verdict).toBe(Math.abs(e.t_s * 0.1) / r.comparison.sigma_tot <= 1 ? 'within1' : 'within2')
    expect(timeError(e.t_s + 0.5, 0.01, e).comparison.verdict).toBe('beyond2')
  })
  it('final speed is sqrt(v0^2 + 2gH), equal to hypot(v0, g t), with the angle of the velocity', () => {
    const e = expectedFlightTime(0.76)!
    const f = finalSpeed(1.2, 0.1, e)
    expect(f.v_mps).toBeCloseTo(Math.sqrt(1.44 + 2 * G_QUITO_mps2 * 0.76), 12)
    expect(f.v_mps).toBeCloseTo(Math.hypot(1.2, G_QUITO_mps2 * e.t_s), 10)
    expect(f.angle_deg).toBeCloseTo((Math.atan2(G_QUITO_mps2 * e.t_s, 1.2) * 180) / Math.PI, 8)
    // v0 uncertainty is damped: (v0/v) * 0.1 plus tiny H and g terms
    expect(f.u_v_mps).toBeLessThan(0.1 * (1.2 / f.v_mps) * 1.02)
    expect(f.u_v_mps).toBeGreaterThan(0.1 * (1.2 / f.v_mps) * 0.99)
  })
  it('difference in sigma and slow-motion reference', () => {
    expect(differenceInSigma(2, 0.3, 1, 0.4)!.sigma).toBeCloseTo(1 / 0.5, 12)
    expect(differenceInSigma(null, 0.3, 1, 0.4)).toBeNull()
    expect(referenceTime([], 1 / 240)).toBeNull()
    const r = referenceTime([0.3958, 0.3958, 0.3917], 1 / 240)!
    expect(r.t_s).toBeCloseTo(0.3944, 3)
    expect(r.u_s).toBeGreaterThan(0.0005); expect(r.u_s).toBeLessThan(0.003)
  })
})

describe('analysis of a simulated careful student on the real apparatus', () => {
  const app = createApparatus('assembled', { seed: 7 })
  const n = fillTableSimulated(app, { seed: 3 })
  const H = Math.round(app.hiddenTruth().H_m * 1000) / 1000
  const a = fullAnalysis({ tables: { marble: app.tableData('marble'), pingpong: app.tableData('pingpong') }, H_m: H })
  it('fills 50 time+range pairs, five per mark for both balls', () => {
    expect(n).toBe(50)
    for (const b of ['marble', 'pingpong'] as const) for (const t of a.balls[b].trials) { expect(t.n_t).toBe(5); expect(t.n_x).toBe(5) }
  })
  it('range grows with the mark and v0 sits between 0.8 and 1.7 m/s', () => {
    for (const b of ['marble', 'pingpong'] as const) {
      const xs = a.balls[b].trials.map((t) => t.x_m!)
      for (let i = 1; i < xs.length; i++) expect(xs[i]!).toBeGreaterThan(xs[i - 1]!)
      for (const t of a.balls[b].trials) { expect(t.v0_mps!).toBeGreaterThan(0.8); expect(t.v0_mps!).toBeLessThan(1.7) }
    }
  })
  it('the hand-timed percent error is small compared with Delta t: |error| within 2 sigma, and the reaction term dominates Delta t', () => {
    for (const b of ['marble', 'pingpong'] as const) {
      expect(a.pooledError[b]!.comparison.verdict).not.toBe('beyond2')
      for (const t of a.balls[b].trials) expect(t.u_t_s!).toBeGreaterThan(0.05)
    }
  })
  it('the marble goes farther than the ping-pong ball at the same mark (task 8); hand-timed v0 is too noisy to rank them', () => {
    for (const c of a.compare) expect(c.xRatio!).toBeGreaterThan(1)
    // the reaction-dominated Delta v is larger than the true gap in v0 between the balls at most marks
    expect(a.compare.filter((c) => Math.abs(c.v0!.sigma) < 2).length).toBeGreaterThanOrEqual(3)
  })
  it('the final speed exceeds the launch speed and is nearly vertical-dominated', () => {
    for (const d of a.derived.marble) { expect(d.final!.v_mps).toBeGreaterThan(3.5); expect(d.final!.angle_deg).toBeGreaterThan(60) }
  })
  it('adapters read the apparatus and the slow-motion clips', () => {
    expect(ballAnalysis(app, 'marble').trials[0]!.t_s).toBeCloseTo(a.balls.marble.trials[0]!.t_s!, 12)
    const ref = slowmoReference(app, 'marble')!
    expect(ref.n).toBeGreaterThanOrEqual(25)
    // frame counting is within a frame or two of the true flight, and near sqrt(2H/g)
    expect(Math.abs(ref.t_s - Math.sqrt((2 * app.hiddenTruth().H_m) / G_QUITO_mps2))).toBeLessThan(0.006)
  })
  it('CSV has one row per trial and ball and the expected time', () => {
    const csv = analysisCSV(a, 'en')
    expect(csv.trim().split('\n').length).toBe(1 + 10 + 3)
    expect(analysisCSV(a, 'es')).toContain(';')
  })
  it('without a height there is no expected time, error or final speed', () => {
    const b = fullAnalysis({ tables: { marble: app.tableData('marble'), pingpong: app.tableData('pingpong') }, H_m: null })
    expect(b.expected).toBeNull()
    expect(b.derived.marble[0]!.error).toBeNull()
    expect(b.derived.marble[0]!.final).toBeNull()
  })
})

describe('teacher key', () => {
  const md = teacherKey()
  it('is deterministic', () => { expect(teacherKey()).toBe(md) })
  it('states the expected time and the bias table', () => {
    expect(md).toContain('sqrt(2H/g)')
    expect(md).toContain('Bias b (s)')
    expect(md).toContain('A simulated careful student')
  })
  it('run spread of the flight time is far smaller than that of the range (time does not depend on v0)', () => {
    const s = spread(BALLS.marble, 0.8, 1, 300)
    expect(s.t[1] / s.t[0]).toBeLessThan(1e-3)
    expect(s.x[1] / s.x[0]).toBeGreaterThan(5e-3)
  })
  it('docs/teacher-key-parabolic.md is up to date with the model (run npm run teacher-key)', () => {
    expect(teacherDoc.trimEnd()).toBe(md.trimEnd())
  })
})
