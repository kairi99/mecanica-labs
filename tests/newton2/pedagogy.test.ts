import { describe, expect, it } from 'vitest'
import { createApparatus, type Apparatus, type ApparatusEvent } from '../../src/experiments/newton2/apparatus/index.ts'
import { STEP_IDS, buildChecklist, nextStep } from '../../src/experiments/newton2/pedagogy/checklist.ts'
import { COACH_KEYS, CoachGate, TIME_PLAUSIBLE_MAX_s, TIME_PLAUSIBLE_MIN_s, coachCandidates, trackCoach, type CoachKey } from '../../src/experiments/newton2/pedagogy/coach.ts'
import { TOUR_SELECTORS, TOUR_STEP_IDS } from '../../src/experiments/newton2/pedagogy/tour.ts'
import { fillTableSimulated } from '../../src/experiments/newton2/pedagogy/simulatedReadings.ts'
import { NO_VARIABILITY } from '../../src/experiments/newton2/physics/index.ts'

const last = (a: Apparatus, type: ApparatusEvent['type']): ApparatusEvent | undefined => a.eventLog().filter((e) => e.type === type).at(-1)
const keys = (a: Apparatus, e: ApparatusEvent | undefined): CoachKey[] => (e ? coachCandidates(a, e).map((n) => n.key) : [])
const status = (a: Apparatus): Record<string, string> => Object.fromEntries(buildChecklist(a).map((s) => [s.id, s.status]))

describe('checklist', () => {
  it('has the steps of the guide in order and everything pending on an empty bench', () => {
    expect(STEP_IDS).toHaveLength(9)
    const s = status(createApparatus('empty'))
    expect(s.assembly).toBe('pending')
    expect(s.levelled).toBe('na')
    expect(s.timings).toBe('na')
    expect(nextStep(buildChecklist(createApparatus('empty')))?.id).toBe('assembly')
  })
  it('the assembled bench has the set-up steps done and the measurements still to do', () => {
    const s = status(createApparatus('assembled', { seed: 4 }))
    for (const k of ['assembly', 'levelled', 'marks', 'cartStart', 'stringLength', 'mt']) expect(s[k], k).toBe('ok')
    expect(s.force).toBe('pending')
    expect(s.timings).toBe('na')
  })
  it('a full simulated session completes force, timings and the mass bookkeeping', () => {
    const a = createApparatus('assembled', { seed: 4 })
    fillTableSimulated(a, { seed: 4 })
    const s = status(a)
    expect(s.force).toBe('ok')
    expect(s.timings).toBe('ok')
    expect(s.massKept).toBe('ok')
    expect(nextStep(buildChecklist(a))).toBeNull()
  })
  it('taking a mass out instead of moving it leaves the mass step pending; changing the masses makes the force stale', () => {
    const a = createApparatus('assembled', { seed: 4 })
    a.dynamometerRead(); a.tableCopyForce(0)
    a.setMassLocation(3, 'bench')
    expect(status(a).massKept).not.toBe('ok')
    const b = createApparatus('assembled', { seed: 4 })
    b.dynamometerRead()
    b.setTrial(3)
    expect(buildChecklist(b).find((x) => x.id === 'force')!.detail?.key).toBe('stale')
  })
  it('every step points to a panel that exists on the page', () => {
    const panels = new Set(['inventory', 'adjust', 'masses', 'instruments', 'table'])
    for (const s of buildChecklist(createApparatus('empty'))) expect(panels.has(s.panel)).toBe(true)
  })
})

describe('coach', () => {
  it('a string that is too long, too short or untied is named after the release', () => {
    const long = createApparatus('assembled', { seed: 1, variability: NO_VARIABILITY })
    long.setStringLength_m(1.2)
    long.releaseCart(0)
    expect(keys(long, last(long, 'released'))).toContain('stringTooLong')
    const short = createApparatus('assembled', { seed: 1, variability: NO_VARIABILITY })
    short.setStringLength_m(0.9)
    short.releaseCart(0)
    expect(keys(short, last(short, 'released'))).toContain('stringTooShort')
    const untied = createApparatus('assembled', { seed: 1, variability: NO_VARIABILITY })
    untied.detach('stringCart')
    untied.releaseCart(0)
    expect(keys(untied, last(untied, 'released'))).toContain('stringNotAttached')
  })
  it('a rail that is not level, a mass taken out and a stale force are named', () => {
    const a = createApparatus('assembled', { seed: 1 })
    a.setRackHeight_mm(3)
    a.setMassLocation(0, 'bench')
    a.releaseCart(0)
    const k = keys(a, last(a, 'released'))
    expect(k).toContain('notLevel')
    expect(k).toContain('massTaken')
    expect(k).toContain('forceMissing')
    a.dynamometerRead()
    a.setTrial(2)
    a.resetCart()
    a.releaseCart(10000)
    expect(keys(a, last(a, 'released'))).toContain('forceStale')
  })
  it('a cart put off the track, wrong marks and implausible times are named', () => {
    const a = createApparatus('assembled', { seed: 1 })
    a.placeCart(20)
    expect(keys(a, last(a, 'refused'))).toContain('cartOffTrack')
    a.placeMark('end', 700)
    expect(keys(a, last(a, 'markPlaced'))).toContain('distanceOff')
    a.tableSet(0, 0, '0.2')
    expect(keys(a, last(a, 'recorded'))).toContain('timeImplausible')
    a.tableSet(0, 1, '1.2')
    expect(keys(a, last(a, 'recorded'))).not.toContain('timeImplausible')
    expect(TIME_PLAUSIBLE_MIN_s).toBeLessThan(1)
    expect(TIME_PLAUSIBLE_MAX_s).toBeGreaterThan(3)
  })
  it('a clean run gets no nudge about the set-up', () => {
    const a = createApparatus('assembled', { seed: 1, variability: NO_VARIABILITY })
    a.dynamometerRead()
    a.releaseCart(0)
    expect(keys(a, last(a, 'released'))).toEqual([])
  })
  it('trackCoach hands nudges through the rate limit', () => {
    const a = createApparatus('assembled', { seed: 1 })
    a.setRackHeight_mm(3)
    const got: CoachKey[] = []
    let t = 0
    const off = trackCoach(a, new CoachGate<CoachKey>(), () => t, (n) => got.push(n.key))
    a.releaseCart(0)
    expect(got.length).toBe(1)
    off()
    expect(COACH_KEYS).toContain(got[0]!)
  })
})

describe('tour', () => {
  it('has a selector for every step', () => {
    for (const id of TOUR_STEP_IDS) expect(TOUR_SELECTORS[id].length).toBeGreaterThan(0)
  })
})
