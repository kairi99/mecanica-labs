import { describe, expect, it } from 'vitest'
import { createApparatus, FrictionApparatus, REASONS, T41_ROWS } from '../../src/experiments/friction/apparatus/index.ts'
import { tablesCSV } from '../../src/experiments/friction/analysis/csv.ts'
import { G_QUITO_mps2 as g, onsetHeight_m } from '../../src/experiments/friction/physics/index.ts'

/** Pull at 5 mm/s and return the time series of the status every 20 ms until `until_s`. */
function drive(lab: FrictionApparatus, speed: number, until_s: number, t0 = 1000): { t_ms: number; F: number }[] {
  lab.pullStart(t0, speed)
  const out: { t_ms: number; F: number }[] = []
  for (let t = 0; t <= until_s * 1000; t += 20) out.push({ t_ms: t0 + t, F: lab.pullStatus(t0 + t).scale!.indicated_N })
  return out
}

describe('inventory and setup rules', () => {
  it('starts empty; unknown, duplicate and absent items are refused with reasons', () => {
    const lab = new FrictionApparatus()
    expect(lab.addItem('block').ok).toBe(true)
    expect(lab.addItem('block')).toMatchObject({ ok: false, reason: 'itemAlreadyOnTable' })
    expect(lab.removeItem('paper')).toMatchObject({ ok: false, reason: 'itemNotOnTable' })
    expect(lab.addItem('nope' as never)).toMatchObject({ ok: false, reason: 'unknownItem' })
  })
  it('a pull needs block, face, scale and paper; distractors cannot stand in for the 50 g masses', () => {
    const lab = new FrictionApparatus()
    expect(lab.pullStart(0, 0.05)).toMatchObject({ ok: false, reason: 'needBlock' })
    lab.addItem('block'); lab.addItem('masses10')
    expect(lab.setAddedMasses(1)).toMatchObject({ ok: false, reason: 'needMasses' })
    expect(lab.setFace('cloth').ok).toBe(true)
    expect(lab.pullStart(0, 0.05)).toMatchObject({ ok: false, reason: 'needScale' })
    lab.addItem('scale1N'); lab.chooseScale('1N')
    expect(lab.pullStart(0, 0.05)).toMatchObject({ ok: false, reason: 'needPaper' })
    expect(lab.chooseScale('2N')).toMatchObject({ ok: false, reason: 'itemNotOnTable' })
    lab.addItem('paper'); lab.placePaper('fixed')
    expect(lab.pullStart(0, 5)).toMatchObject({ ok: false, reason: 'badSpeed' })
    expect(lab.pullStart(0, 0.05).ok).toBe(true)
    expect(lab.setFace('sandpaper')).toMatchObject({ ok: false, reason: 'pulling' })
  })
  it('the guide omits the stand, base, stopwatch and balance: the exp12/exp3 presets include them and a balance weighs the block', () => {
    const lab = createApparatus('exp12', { seed: 4 })
    const p = lab.procedure()
    expect(p.unlistedNeededPresent).toBe(true)
    expect(lab.hasItem('masses10')).toBe(false)
    expect(Math.abs(lab.getState().measuredBlock_kg! - lab.hiddenTruth().block_kg)).toBeLessThanOrEqual(0.0003)
  })
  it('every refusal reason is listed', () => {
    const lab = new FrictionApparatus()
    lab.pullStart(0, 0.05); lab.readScale(0); lab.markCourse(); lab.raiseStart(0, 0.002)
    for (const e of lab.eventLog()) if (e.type === 'refused') expect(REASONS).toContain(e.reason)
  })
})

describe('exps. 1 and 2: pulling and reading', () => {
  it('with fixed paper and a zeroed scale the plateau reading is about mu_k M g (no systematic offset)', () => {
    const lab = createApparatus('exp12', { seed: 2 })
    lab.placePaper('fixed')
    const series = drive(lab, 0.1, 1.9)
    const tail = series.slice(-30)
    const mean = tail.reduce((a, s) => a + s.F, 0) / tail.length
    const rec = lab.getPullRuns()[0]!
    expect(mean).toBeCloseTo(rec.mu_k * rec.mass_kg * g, 1)
    expect(lab.referencePull(1)!.Fk_N).toBeCloseTo(rec.mu_k * rec.mass_kg * g, 9)
  })
  it('a scale not zeroed horizontally reads low by the weight of its moving parts', () => {
    const a = createApparatus('exp12', { seed: 3 })
    const b = createApparatus('exp12', { seed: 3 })
    b.removeItem('scale1N'); b.addItem('scale1N'); b.chooseScale('1N') // new scale: not zeroed
    expect(b.currentScale()!.zeroError_N).toBeLessThan(0)
    expect(a.currentScale()!.zeroError_N).toBe(0)
  })
  it('paper not fixed: the paper slides and the reading is low (paper-on-table friction replaces sandpaper-on-paper)', () => {
    const a = createApparatus('exp12', { seed: 5 })
    a.setFace('sandpaper')
    a.placePaper('loose')
    const mean = (lab: FrictionApparatus): number => { const s = drive(lab, 0.1, 1.9); return s.slice(-30).reduce((x, y) => x + y.F, 0) / 30 }
    const loose = mean(a)
    const b = createApparatus('exp12', { seed: 5 })
    b.setFace('sandpaper')
    expect(loose).toBeLessThan(mean(b) * 0.7)
  })
  it('a 1 N scale overranges on a heavy sandpaper load and the reading is flagged', () => {
    const lab = createApparatus('exp12', { seed: 6 })
    lab.setFace('sandpaper'); lab.setAddedMasses(3)
    lab.pullStart(0, 0.1)
    lab.pullStatus(2000)
    const r = lab.readScale(2000)
    expect(r.ok && r.reading.overRange).toBe(true)
    expect(r.ok && r.reading.value_N).toBe(1)
  })
  it('a late press after the breakaway catches a lower value than a press at the peak (the human element)', () => {
    const lab = createApparatus('exp12', { seed: 7 })
    lab.pullStart(0, 0.004)
    const truth = lab.referencePull(1)
    void truth
    let peakT = 0, peak = 0
    for (let t = 0; t < 40000; t += 10) {
      const F = lab.pullStatus(t).scale!.indicated_N
      if (F > peak) { peak = F; peakT = t }
      if (F < peak - 0.15) break
    }
    expect(peak).toBeGreaterThan(0.3)
    const atPeak = lab.readScale(peakT)
    const late = lab.readScale(peakT + 400)
    expect(atPeak.ok && late.ok && late.reading.value_N < atPeak.reading.value_N - 0.05).toBe(true)
  })
  it('readings fill Tablas 4.1 and 4.2 by copy or typing, with the setup remembered', () => {
    const lab = createApparatus('exp12', { seed: 8 })
    lab.pullStart(0, 0.05); lab.pullStatus(3000); lab.readScale(3000)
    expect(lab.tableCopyForce('4.1', 0, 0).ok).toBe(true)
    expect(lab.tableData().t41[0]![0]!.setup).toMatchObject({ face: 'cloth', addedMasses: 0, scale: '1N' })
    expect(lab.tableSetForce('4.2', 1, 4, '0,66').ok).toBe(true)
    expect(lab.tableData().t42[1]![4]!.F_N).toBe(0.66)
    expect(lab.tableSetForce('4.1', T41_ROWS, 0, 1)).toMatchObject({ ok: false, reason: 'badCell' })
    expect(lab.tableSetForce('4.1', 0, 1, '0.1234')).toMatchObject({ ok: false, reason: 'tooManyDecimals' })
    expect(lab.tableCopyForce('4.1', 1, 0).ok).toBe(true)
    lab.pullEnd(4000)
    expect(lab.procedure().filled.t41).toBe(2)
  })
  it('the reference trace is a sampled true force with the trial coefficients', () => {
    const lab = createApparatus('exp12', { seed: 9 })
    lab.pullStart(0, 0.01)
    lab.pullStatus(6000)
    lab.pullEnd(6000)
    const ref = lab.referencePull(1)!
    expect(ref.t_s.length).toBe(ref.F_N.length)
    expect(ref.summary.F_breakaway_N).not.toBeNull()
    expect(Math.max(...ref.F_N)).toBeGreaterThan(ref.Fk_N)
  })
})

describe('exp. 3: rail, onset, stopwatch', () => {
  it('the bar slips when tan(theta) passes mu_s of the trial; the reference gives the true onset height', () => {
    const lab = createApparatus('exp3', { seed: 11 })
    lab.raiseStart(0, 0.004)
    const ref = lab.referenceTrial(1)!
    expect(ref.onsetH_m).toBeCloseTo(onsetHeight_m(ref.mu_s), 6)
    const tOn = ref.onsetH_m! / 0.004 * 1000
    expect(lab.inclineStatus(tOn - 50).slipped).toBe(false)
    expect(lab.inclineStatus(tOn + 50).slipped).toBe(true)
  })
  it('a late stop of the crank overshoots the onset height; the tape reads h only once the crank is still', () => {
    const lab = createApparatus('exp3', { seed: 12 })
    lab.raiseStart(0, 0.005)
    const ref = lab.referenceTrial(1)!
    const tOn = (ref.onsetH_m! / 0.005) * 1000
    lab.raiseStop(tOn + 300)
    expect(lab.measureHeight(tOn + 100)).toMatchObject({ ok: false, reason: 'stillRaising' })
    const h = lab.measureHeight(tOn + 400)
    expect(h.ok && h.h_m).toBeGreaterThan(ref.onsetH_m! + 0.001)
  })
  it('stopwatch timing of the slide: the true slide time is attached to the stop, the reading carries the student\'s delays', () => {
    const lab = createApparatus('exp3', { seed: 13 })
    lab.raiseStart(0, 0.005)
    const ref = lab.referenceTrial(1)!
    const tOn = (ref.onsetH_m! / 0.005) * 1000
    lab.raiseStop(tOn + 200)
    lab.stopwatchStartStop(tOn + 250) // 0.25 s late
    const slide = lab.referenceTrial(1)!.slideTime_s! // the profile now includes the stop of the crank
    const stopAt = tOn + slide * 1000 + 100 // 0.1 s late stop
    const r = lab.stopwatchStartStop(stopAt)
    expect(r.ok && r.stop!.reading_s).toBeCloseTo(slide - 0.15, 1)
    expect(r.ok && r.stop!.crossings.find((c) => c.event === 'finish')!.trueTime_s).toBeCloseTo(slide, 9)
    expect(lab.tableCopyTime(0, 0, stopAt + 10).ok).toBe(true)
    expect(lab.tableCopyHeight(0, 0)).toMatchObject({ ok: false, reason: 'noReading' })
  })
  it('the course must fit the rail and the tape is needed', () => {
    const lab = new FrictionApparatus()
    lab.addItem('rail')
    expect(lab.markCourse(1)).toMatchObject({ ok: false, reason: 'needTape' })
    lab.addItem('tape')
    expect(lab.markCourse(1.15)).toMatchObject({ ok: false, reason: 'courseTooLong' })
    expect(lab.markCourse(1).ok).toBe(true)
    expect(Math.abs(lab.hiddenTruth().course_m! - 1)).toBeLessThan(0.006)
  })
})

describe('snapshot, determinism, CSV', () => {
  it('the same seed and the same presses give the same readings; a snapshot resumes exactly', () => {
    const run = (): number => { const l = createApparatus('exp12', { seed: 21 }); l.pullStart(0, 0.05); l.pullStatus(2500); const r = l.readScale(2500); return r.ok ? r.reading.value_N : NaN }
    expect(run()).toBe(run())
    const a = createApparatus('exp12', { seed: 21 })
    a.pullStart(0, 0.05); a.pullStatus(1500)
    const snap = a.snapshot()
    const b = new FrictionApparatus({ seed: 21 })
    expect(b.load(JSON.parse(JSON.stringify(snap))).ok).toBe(true)
    expect(b.pullStatus(2500).scale!.force_N).toBeCloseTo(a.pullStatus(2500).scale!.force_N, 9)
    a.pullEnd(2600); b.pullEnd(2600)
    a.pullStart(3000, 0.03); b.pullStart(3000, 0.03)
    expect(b.getPullRuns()[1]!.mu_k).toBe(a.getPullRuns()[1]!.mu_k)
  })
  it('tables CSV: Spanish uses ; and decimal comma, English uses , and a point', () => {
    const lab = createApparatus('exp12')
    lab.tableSetForce('4.1', 0, 0, '0.34')
    lab.tableSetHeight(0, 0, '0.452'); lab.tableSetTime(0, 0, '1.43')
    const es = tablesCSV(lab.tableData(), 'es')
    const en = tablesCSV(lab.tableData(), 'en')
    expect(es).toContain('Tela;0;0,340')
    expect(en).toContain('Cloth,0,0.340')
    expect(es).toContain('Madera;1;0,452;1,43')
    expect(en).toContain('Wood,1,0.452,1.43')
  })
})
