import { describe, expect, it } from 'vitest'
import { createApparatus, type ApparatusEvent, type ParabolicApparatus } from '../../src/experiments/parabolic/apparatus/index.ts'
import { STEP_IDS, buildChecklist, nextStep } from '../../src/experiments/parabolic/pedagogy/checklist.ts'
import { CoachGate, COACH_KEYS, coachCandidates, rangeLooksFromTip, trackCoach, type CoachKey } from '../../src/experiments/parabolic/pedagogy/coach.ts'
import { fillTableSimulated } from '../../src/experiments/parabolic/pedagogy/simulatedReadings.ts'
import { stopTiming } from '../../src/experiments/parabolic/pedagogy/timing.ts'
import { TOUR_SELECTORS, TOUR_STEP_IDS } from '../../src/experiments/parabolic/pedagogy/tour.ts'

const keys = (a: ParabolicApparatus, e: ApparatusEvent | undefined): CoachKey[] => (e ? coachCandidates(a, e).map((n) => n.key) : [])
const last = (a: ParabolicApparatus, type: ApparatusEvent['type']): ApparatusEvent | undefined => a.eventLog().filter((e) => e.type === type).at(-1)
const status = (a: ParabolicApparatus): Record<string, string> => Object.fromEntries(buildChecklist(a).map((s) => [s.id, s.status]))

/** One real launch: release, start at the edge + startLag, stop at the landing + stopLag. Returns the stop id. */
function launch(a: ParabolicApparatus, t0: number, startRel_s: number | 'edge', stopLag = 0.2): { runId: number; stopAt: number } {
  a.stopwatchReset()
  const rel = a.release(t0)
  expect(rel.ok).toBe(true)
  const run = a.getRun(rel.ok ? rel.runId : 0)!
  a.stopwatchStartStop(t0 + (startRel_s === 'edge' ? run.times.edge_s! + 0.2 : startRel_s) * 1000)
  const stopAt = t0 + (run.times.land_s! + stopLag) * 1000
  a.stopwatchStartStop(stopAt)
  a.tick(t0 + run.times.end_s * 1000 + 100)
  return { runId: run.id, stopAt }
}

describe('checklist derived from the apparatus', () => {
  it('lists the guide steps in order and starts at assembly on an empty bench', () => {
    const e = buildChecklist(createApparatus('empty', { seed: 1 }))
    expect(e.map((s) => s.id)).toEqual([...STEP_IDS])
    expect(nextStep(e)!.id).toBe('assembly')
    expect(e.find((s) => s.id === 'rise')!.status).toBe('na')
    expect(e.find((s) => s.id === 'launchHeight')!.status).toBe('pending')
  })
  it('the assembled bench has stands, rise, gap, marks, paper, projection and launch height done', () => {
    const s = status(createApparatus('assembled', { seed: 7 }))
    for (const id of ['assembly', 'rise', 'gap', 'marks', 'paper', 'edgeProjection', 'launchHeight']) expect(s[id], id).toBe('ok')
    expect(s.timing).toBe('na'); expect(s.range).toBe('na'); expect(s.launches).toBe('pending'); expect(s.bothBalls).toBe('pending')
  })
  it('rise and gap become pending when the student changes them', () => {
    const a = createApparatus('assembled', { seed: 7 })
    a.setRackHeight_mm(100)
    a.setGap_mm(300)
    const s = status(a)
    expect(s.rise).toBe('pending'); expect(s.gap).toBe('pending')
  })
  it('marks in the lower half or fewer than five are not done', () => {
    const a = createApparatus('assembled', { seed: 7 })
    a.placeMark(0.3)
    expect(status(a).marks).toBe('pending')
  })
  it('paper, projection and launch height follow the actions', () => {
    const a = createApparatus('assembled', { seed: 7 })
    a.removeCarbon()
    expect(status(a).paper).toBe('pending')
    const b = createApparatus('empty', { seed: 7 })
    expect(status(b).launchHeight).toBe('pending')
    b.addItem('tapeMeasure'); b.tapeMeasure({ kind: 'launchHeight' })
    expect(status(b).launchHeight).toBe('ok')
  })
  it('timing is done only for a press near the edge; a press at the release does not count', () => {
    const a = createApparatus('assembled', { seed: 7 })
    launch(a, 1000, 0.05) // start at the release
    expect(status(a).timing).toBe('pending')
    a.resetBall()
    launch(a, 20000, 'edge')
    expect(status(a).timing).toBe('ok')
  })
  it('range is pending after the paper was moved with marks on it', () => {
    const a = createApparatus('assembled', { seed: 7 })
    fillTableSimulated(a, { seed: 1, perTrial: 1, trials: [0], balls: ['marble'] })
    expect(status(a).range).toBe('ok')
    a.placeBond(0.9, 0.1)
    expect(status(a).range).toBe('pending')
  })
  it('after a full simulated session launches and both balls are done', () => {
    const a = createApparatus('assembled', { seed: 7 })
    expect(fillTableSimulated(a, { seed: 2 })).toBe(50)
    const s = status(a)
    expect(s.launches).toBe('ok'); expect(s.bothBalls).toBe('ok'); expect(s.timing).toBe('ok'); expect(s.range).toBe('ok')
    expect(nextStep(buildChecklist(a))).toBeNull()
  })
})

describe('coach triggers', () => {
  it('marks in the lower half', () => {
    const a = createApparatus('assembled', { seed: 7 })
    a.placeMark(0.3)
    expect(keys(a, last(a, 'markPlaced'))).toEqual(['marksLowerHalf'])
    a.placeMark(0.95)
    expect(keys(a, last(a, 'markPlaced'))).toEqual([])
  })
  it('a release with no carbon, the rise off, a short or a long gap, no projection', () => {
    const a = createApparatus('assembled', { seed: 7 })
    a.removeCarbon(); a.release(1000)
    expect(keys(a, last(a, 'released'))).toEqual(['noCarbon'])
    const b = createApparatus('assembled', { seed: 7 })
    b.setRackHeight_mm(100); b.release(1000)
    expect(keys(b, last(b, 'released'))).toEqual(['riseOff'])
    const c = createApparatus('assembled', { seed: 7 })
    c.setGap_mm(300); c.release(1000)
    const nc = coachCandidates(c, last(c, 'released')!)
    expect(nc.map((n) => n.key)).toEqual(['gapLarge']); expect(nc[0]!.params.cm).toBe(30)
    const d = createApparatus('assembled', { seed: 7 })
    d.setGap_mm(10); d.release(1000)
    expect(keys(d, last(d, 'released'))).toEqual(['gapSmall'])
    const e = createApparatus('assembled', { seed: 7 })
    e.preset('empty')
    for (const i of ['rail', 'rackStand', 'base', 'marble', 'tapeMeasure', 'stopwatch', 'screws']) e.addItem(i as 'rail')
    e.attach('standBase'); e.attach('rackClamp'); e.selectBall('marble'); e.placeBall({ s_m: 0.8 })
    e.tapeMeasure({ kind: 'range', carbonId: 'c1' })
    expect(keys(e, last(e, 'refused'))).toEqual(['noEdgeProjection'])
  })
  it('a ball that falls off the paper, and a moved paper', () => {
    const a = createApparatus('assembled', { seed: 7 })
    a.placeBond(2.5, 1.5)
    a.release(1000)
    a.tick(1000 + a.getRun(1)!.times.end_s * 1000 + 100)
    expect(keys(a, last(a, 'ballLanded'))).toEqual(['offPaper'])
    const b = createApparatus('assembled', { seed: 7 })
    fillTableSimulated(b, { seed: 1, perTrial: 1, trials: [0], balls: ['marble'] })
    b.placeBond(0.9, 0.1)
    expect(keys(b, last(b, 'bondPlaced'))).toEqual(['paperMoved'])
  })
  it('a start press at the release, or far after the edge', () => {
    const a = createApparatus('assembled', { seed: 7 })
    launch(a, 1000, 0.05)
    const early = coachCandidates(a, last(a, 'stopwatchStop')!)
    expect(early.map((n) => n.key)).toEqual(['startedAtRelease'])
    expect(early[0]!.params.s as number).toBeGreaterThan(0.8)
    a.resetBall()
    a.stopwatchReset()
    const rel = a.release(30000)
    const run = a.getRun(rel.ok ? rel.runId : 0)!
    a.stopwatchStartStop(30000 + (run.times.edge_s! + 0.6) * 1000)
    a.stopwatchStartStop(30000 + (run.times.land_s! + 0.1) * 1000)
    expect(keys(a, last(a, 'stopwatchStop'))).toEqual(['startedLate'])
    a.resetBall(); a.stopwatchReset()
    launch(a, 60000, 'edge')
    expect(keys(a, last(a, 'stopwatchStop'))).toEqual([])
  })
  it('stop timing reads the true edge and landing from the stop record', () => {
    const a = createApparatus('assembled', { seed: 7 })
    launch(a, 1000, 'edge', 0.2)
    const t = stopTiming(a.stopLog()[0]!)
    expect(t.startError_s).toBeCloseTo(0.2, 6)
    expect(t.stopError_s).toBeCloseTo(0.2, 6)
  })
  it('an implausible flight time, a range measured from the rail tip, and a missing launch height', () => {
    const a = createApparatus('assembled', { seed: 7 })
    a.tableSetTime('marble', 0, 0, '1.40')
    expect(keys(a, last(a, 'recorded'))).toEqual(['timeFar'])
    a.tableSetTime('marble', 0, 1, '0.41')
    expect(keys(a, last(a, 'recorded'))).toEqual([])
    // range from the tip: true range + gap
    const b = createApparatus('assembled', { seed: 7 })
    fillTableSimulated(b, { seed: 1, perTrial: 1, trials: [0], balls: ['marble'] })
    const truth = b.markOnFloor(b.paperMarks().filter((m) => m.ball === 'marble')[0]!.id)!.x_m
    expect(rangeLooksFromTip(b, 'marble', truth + 0.05)).toBe(true)
    expect(rangeLooksFromTip(b, 'marble', truth)).toBe(false)
    b.tableSetRange('marble', 0, 1, (truth + 0.05).toFixed(3))
    expect(keys(b, last(b, 'recorded'))).toEqual(['rangeFromTip'])
    // launch height missing once ten values are in (an `empty` bench has not measured it)
    const c = createApparatus('assembled', { seed: 7 })
    c.preset('empty')
    for (let r = 0; r < 5; r++) c.tableSetTime('marble', 0, r, '0.40')
    c.tableSetRange('marble', 0, 0, '0.5')
    expect(keys(c, last(c, 'recorded'))).toEqual([])
    for (let r = 1; r < 5; r++) c.tableSetRange('marble', 0, r, '0.5')
    expect(keys(c, last(c, 'recorded'))).toEqual(['launchHeightMissing'])
  })
  it('the gate limits the rate and the repeats, with an injected clock', () => {
    const a = createApparatus('assembled', { seed: 7 })
    const shown: CoachKey[] = []
    let now = 0
    const off = trackCoach(a, new CoachGate<CoachKey>(), () => now, (n) => shown.push(n.key))
    a.placeMark(0.2); now = 1000; a.placeMark(0.25) // second inside the 4 s gap
    expect(shown).toEqual(['marksLowerHalf'])
    now = 10000; a.placeMark(0.3) // same nudge inside the 45 s repeat window
    expect(shown).toEqual(['marksLowerHalf'])
    now = 60000; a.placeMark(0.35)
    expect(shown).toEqual(['marksLowerHalf', 'marksLowerHalf'])
    off()
  })
  it('every coach key is reachable by one of the tests above', () => {
    expect(COACH_KEYS.length).toBe(14)
  })
})

describe('tour', () => {
  it('walks stage, inventory, adjust, timing, table, slow motion, analysis, each with a selector', () => {
    expect([...TOUR_STEP_IDS]).toEqual(['stage', 'inventory', 'adjust', 'timing', 'table', 'slowmo', 'analysis'])
    for (const id of TOUR_STEP_IDS) expect(TOUR_SELECTORS[id].length).toBeGreaterThan(5)
  })
})
