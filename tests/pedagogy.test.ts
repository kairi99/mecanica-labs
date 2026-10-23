import { describe, expect, it } from 'vitest'
import { Apparatus, ITEM_IDS, SUPPORT_SEPARATION_m, createApparatus, type ApparatusEvent } from '../src/apparatus/index.ts'
import { deg2rad } from '../src/physics/index.ts'
import { STEP_IDS, buildChecklist, nextStep, type StepId, type StepStatus } from '../src/pedagogy/checklist.ts'
import { CoachGate, coachCandidates, trackCoach, type CoachKey } from '../src/pedagogy/coach.ts'
import { fillTableSimulated } from '../src/pedagogy/simulatedReadings.ts'
import { fmt } from '../src/pedagogy/dom.ts'
import { localiseParams } from '../src/pedagogy/checklistView.ts'
import { strings as checklistStrings } from '../src/pedagogy/strings/checklist.ts'
import { strings as coachStrings } from '../src/pedagogy/strings/coach.ts'
import { strings as tourStrings } from '../src/pedagogy/strings/tour.ts'
import { TOUR_STEP_IDS } from '../src/pedagogy/tour.ts'

const status = (a: Apparatus): Record<StepId, StepStatus> =>
  Object.fromEntries(buildChecklist(a).map((s) => [s.id, s.status])) as Record<StepId, StepStatus>

describe('procedure checklist is reachable by scripted actions from an empty bench', () => {
  it('lists every guide step in order and starts with nothing done', () => {
    const a = createApparatus('empty', { seed: 5 })
    const steps = buildChecklist(a)
    expect(steps.map((s) => s.id)).toEqual([...STEP_IDS])
    expect(steps.filter((s) => s.status === 'ok')).toHaveLength(0)
    expect(nextStep(steps)?.id).toBe('materials')
  })

  it('every step turns ok through real apparatus actions, in the guide order', () => {
    const a = createApparatus('empty', { seed: 5 })
    const tilt = a.hiddenTruth().tableTilt_rad
    for (const i of ITEM_IDS) a.addItem(i)
    expect(status(a).materials).toBe('ok')
    a.attach('standBase')
    expect(status(a).standBase).toBe('ok')
    a.attach('rackClamp', { railEnd: 'E1' })
    expect(status(a).railClamped).toBe('ok')
    expect(status(a).scale).toBe('ok')
    a.attach('twoLegStand'); a.attach('receiver')
    expect(status(a).lowEnd).toBe('ok')
    expect(status(a).screws).toBe('ok')
    expect(status(a).levelled).toBe('pending')
    a.placeLevel('rail')
    a.setFoot_mm(1000 * SUPPORT_SEPARATION_m * Math.sin(tilt))
    expect(status(a).levelled).toBe('ok')
    expect(status(a).angle).toBe('pending')
    const R = Math.round(1000 * SUPPORT_SEPARATION_m * (Math.sin(tilt) + Math.sin(deg2rad(1.3) - tilt)))
    a.setRackHeight_mm(R)
    a.setFoot_mm(R - 1000 * SUPPORT_SEPARATION_m * Math.sin(deg2rad(1.3) - tilt))
    expect(status(a).angle).toBe('ok')
    expect(status(a).marks).toBe('pending')
    for (let i = 0; i < 10; i++) a.placeMarker(200 + 100 * i)
    expect(status(a).marks).toBe('ok')
    expect(status(a).cartZero).toBe('pending')
    a.placeCart(200)
    expect(status(a).cartZero).toBe('ok')
    expect(status(a).measure).toBe('pending')
    expect(nextStep(buildChecklist(a))?.id).toBe('measure')
    fillTableSimulated(a, { rows: [1, 2] })
    const m = buildChecklist(a).find((s) => s.id === 'measure')!
    expect(m.progress?.slice(0, 3)).toEqual([10, 10, 0])
    expect(m.status).toBe('pending')
    fillTableSimulated(a, { rows: [3, 4, 5, 6, 7, 8, 9] })
    expect(buildChecklist(a).every((s) => s.status === 'ok')).toBe(true)
    expect(nextStep(buildChecklist(a))).toBeNull()
  })

  it('detects a reversed scale', () => {
    const a = createApparatus('empty', { seed: 5 })
    for (const i of ITEM_IDS) a.addItem(i)
    a.attach('standBase'); a.attach('rackClamp', { railEnd: 'E2' })
    const s = buildChecklist(a).find((x) => x.id === 'scale')!
    expect(s.status).toBe('pending')
    expect(s.detail?.key).toBe('reversed')
  })

  it('the angle step shows the formula to students and the target dh only to teachers', () => {
    const a = createApparatus('assembled', { seed: 5 })
    const stu = buildChecklist(a).find((x) => x.id === 'angle')!
    expect(stu.detail?.key).toBe('measured')
    expect(JSON.stringify(stu.detail)).not.toMatch(/target/)
    const tea = buildChecklist(a, { teacher: true }).find((x) => x.id === 'angle')!
    expect(tea.detail?.key).toBe('teacher')
    expect(tea.detail?.params.target_mm).toBeCloseTo(24.96, 1)
    const fresh = createApparatus('empty')
    expect(buildChecklist(fresh).find((x) => x.id === 'angle')!.detail?.key).toBe('formula')
  })

  it('every step has text, a "show me" target and a known panel', () => {
    for (const s of buildChecklist(createApparatus('assembled'))) {
      expect(checklistStrings.es.steps[s.id].why.length).toBeGreaterThan(10)
      expect(['inventory', 'adjust', 'tape', 'stopwatch', 'table']).toContain(s.panel)
      if (s.detail) expect(checklistStrings.en.detail[s.detail.key]).toBeTruthy()
    }
  })
})

/** Run `act` and collect the coach keys for every event it emits. */
function keysDuring(a: Apparatus, act: () => void): CoachKey[] {
  const keys: CoachKey[] = []
  const off = a.on((e: ApparatusEvent) => { for (const n of coachCandidates(a, e)) keys.push(n.key) })
  act()
  off()
  return keys
}

describe('coach triggers', () => {
  it('cart placed off the rail (guide warning)', () => {
    const a = createApparatus('assembled', { seed: 2 })
    expect(keysDuring(a, () => a.placeCart(20))).toContain('cartOffRail')
  })
  it('releasing without the receiver', () => {
    const a = createApparatus('assembled', { seed: 2 })
    a.detach('receiver')
    expect(keysDuring(a, () => a.releaseCart(1000))).toContain('noReceiver')
  })
  it('scale reversed when the high end is the 1200 mm end', () => {
    const a = createApparatus('empty')
    for (const i of ITEM_IDS) a.addItem(i)
    a.attach('standBase')
    expect(keysDuring(a, () => a.attach('rackClamp', { railEnd: 'E2' }))).toContain('scaleReversed')
  })
  it('raising before levelling, but not after', () => {
    const a = createApparatus('empty')
    for (const i of ITEM_IDS) a.addItem(i)
    a.attach('standBase'); a.attach('rackClamp', { railEnd: 'E1' }); a.attach('twoLegStand'); a.attach('receiver')
    expect(keysDuring(a, () => a.setRackHeight_mm(20))).toContain('raisedBeforeLevel')
    const b = createApparatus('assembled')
    expect(keysDuring(b, () => b.setRackHeight_mm(b.getState().rack_mm + 1))).not.toContain('raisedBeforeLevel')
  })
  it('angle off the tolerance at release, none when right', () => {
    const a = createApparatus('assembled', { seed: 3 })
    expect(keysDuring(a, () => a.releaseCart(1000))).not.toContain('angleOff')
    const b = createApparatus('assembled', { seed: 3 })
    b.setRackHeight_mm(b.getState().rack_mm + 8)
    expect(keysDuring(b, () => b.releaseCart(1000))).toContain('angleOff')
  })
  it('cart not at 0 cm, and no marks', () => {
    const a = createApparatus('assembled', { seed: 3 })
    a.placeCart(400)
    expect(keysDuring(a, () => a.releaseCart(1000))).toContain('cartNotAtZero')
    const b = createApparatus('assembled', { seed: 3 })
    for (const m of b.getState().markers) b.removeMarker(m.id)
    expect(keysDuring(b, () => b.releaseCart(1000))).toContain('noMarks')
  })
  it('stopwatch started late or early relative to the release', () => {
    const late = createApparatus('assembled', { seed: 4 })
    late.releaseCart(1000)
    expect(keysDuring(late, () => { late.stopwatchStartStop(2000); late.stopwatchStartStop(4000, { markTarget: 3 }) })).toContain('startLate')
    const early = createApparatus('assembled', { seed: 4 })
    early.stopwatchStartStop(500)
    early.releaseCart(1500)
    const ks = keysDuring(early, () => { early.stopwatchStartStop(4500, { markTarget: 3 }) })
    expect(ks).toContain('startEarly')
    const ok = createApparatus('assembled', { seed: 4 })
    ok.releaseCart(1000)
    expect(keysDuring(ok, () => { ok.stopwatchStartStop(1200); ok.stopwatchStartStop(4000, { markTarget: 9 }) })).not.toContain('startLate')
  })
  it('timing a different mark than the selected target', () => {
    const a = createApparatus('assembled', { seed: 4 })
    const run = a.releaseCart(1000)
    expect(run.ok).toBe(true)
    const t30 = a.getRun(1)!.marks[3]!.trueTime_s!
    const ks = keysDuring(a, () => { a.stopwatchStartStop(1200); a.stopwatchStartStop(1000 + (t30 + 0.25) * 1000, { markTarget: 1 }) })
    expect(ks).toContain('wrongMark')
    const b = createApparatus('assembled', { seed: 4 })
    b.releaseCart(1000)
    const t10 = b.getRun(1)!.marks[1]!.trueTime_s!
    expect(keysDuring(b, () => { b.stopwatchStartStop(1200); b.stopwatchStartStop(1000 + (t10 + 0.25) * 1000, { markTarget: 1 }) })).not.toContain('wrongMark')
  })
  it('implausible recorded value', () => {
    const a = createApparatus('assembled', { seed: 4 })
    for (let c = 0; c < 5; c++) a.tableSet(1, c, 1.0 + 0.02 * c)
    expect(keysDuring(a, () => a.tableSet(1, 5, 3.5))).toContain('implausible')
    expect(keysDuring(a, () => a.tableSet(1, 6, 1.05))).not.toContain('implausible')
    // a further mark cannot be reached before a nearer one
    const b = createApparatus('assembled', { seed: 4 })
    b.tableSet(2, 0, 1.4)
    expect(keysDuring(b, () => b.tableSet(3, 0, 0.5))).toContain('implausible')
  })
  it('copying an empty stopwatch', () => {
    const a = createApparatus('assembled', { seed: 4 })
    expect(keysDuring(a, () => a.tableCopyDisplay(1, 0, 5000))).toContain('emptyCopy')
  })
})

describe('coach rate limit', () => {
  const n = (key: CoachKey) => ({ key, params: {} })
  it('keeps a minimum gap between any two nudges and between repeats of one', () => {
    const g = new CoachGate({ gap_ms: 1000, repeat_ms: 10_000, dismissed_ms: 60_000 })
    expect(g.offer([n('noMarks')], 0)?.key).toBe('noMarks')
    expect(g.offer([n('angleOff')], 500)).toBeNull()
    expect(g.offer([n('noMarks')], 2000)).toBeNull()
    expect(g.offer([n('noMarks'), n('angleOff')], 2000)?.key).toBe('angleOff')
    expect(g.offer([n('noMarks')], 11_000)?.key).toBe('noMarks')
  })
  it('a dismissed nudge stays quiet for a while', () => {
    const g = new CoachGate({ gap_ms: 0, repeat_ms: 1000, dismissed_ms: 60_000 })
    g.offer([n('noMarks')], 0)
    g.dismiss('noMarks', 100)
    expect(g.offer([n('noMarks')], 5000)).toBeNull()
    expect(g.offer([n('noMarks')], 61_000)?.key).toBe('noMarks')
  })
  it('trackCoach delivers the first nudge of a live event stream and then rate-limits', () => {
    const a = createApparatus('assembled', { seed: 2 })
    const got: CoachKey[] = []
    let clock = 0
    const off = trackCoach(a, new CoachGate(), () => clock, (x) => got.push(x.key))
    a.placeCart(20)
    clock = 1000
    a.placeCart(30)
    off()
    expect(got).toEqual(['cartOffRail'])
  })
})

describe('simulated readings drive the real apparatus', () => {
  it('fills 90 cells with copied stopwatch readings tied to runs, around the true time plus the mean lag', () => {
    const a = createApparatus('assembled', { seed: 9 })
    expect(fillTableSimulated(a, { seed: 3, startLag_s: 0.1, stopLag_s: 0.1, reactionSd_s: 0 })).toBe(90)
    const d = a.tableData()
    expect(d.cells[5]![3]!.stopId).not.toBeNull()
    const stop = a.stopLog().find((s) => s.id === d.cells[5]![3]!.stopId)!
    expect(d.values_s[5]![3]).toBeCloseTo(stop.crossings[5]!.trueTime_s!, 1)
    expect(a.procedure().tableFilled).toBe(90)
  })
})

describe('pedagogy strings', () => {
  const keys = (o: unknown, p = ''): string[] => (typeof o === 'object' && o !== null ? Object.entries(o).flatMap(([k, v]) => keys(v, `${p}${k}.`)) : [p])
  it('tour has a text for every step, in both languages', () => {
    for (const id of TOUR_STEP_IDS) {
      expect(tourStrings.es.steps[id].body.length).toBeGreaterThan(20)
      expect(tourStrings.en.steps[id].body.length).toBeGreaterThan(20)
    }
    expect(keys(tourStrings.es).sort()).toEqual(keys(tourStrings.en).sort())
  })
  it('coach texts keep the same placeholders in ES and EN', () => {
    const ph = (s: string): string[] => (s.match(/\{\w+\}/g) ?? []).sort()
    for (const k of Object.keys(coachStrings.es.nudges) as CoachKey[]) expect(ph(coachStrings.es.nudges[k])).toEqual(ph(coachStrings.en.nudges[k]))
    for (const k of Object.keys(checklistStrings.es.detail)) expect(ph(checklistStrings.es.detail[k]!)).toEqual(ph(checklistStrings.en.detail[k]!))
  })
  it('fmt fills placeholders and localiseParams uses the decimal comma in Spanish', () => {
    expect(fmt('a {x} b {y}', { x: 1, y: 'z' })).toBe('a 1 b z')
    expect(localiseParams({ x: 24.9 }, 'es').x).toBe('24,9')
    expect(localiseParams({ x: 24.9 }, 'en').x).toBe(24.9)
  })
})
