import { describe, expect, it } from 'vitest'
import { MARK_RESULTS, REASONS, RUN_BLOCKS, ITEM_IDS, TABLE_REPS, TABLE_TRIALS, createApparatus, type ApparatusSnapshot } from '../../src/experiments/parabolic/apparatus/index.ts'
import { experiments, findExperiment, readyExperiments } from '../../src/experiments/registry.ts'
import { strings as reasonStrings } from '../../src/experiments/parabolic/views/strings/reasons.ts'
import { blockText, markResultText, reasonText } from '../../src/experiments/parabolic/views/reasons.ts'
import { strings as inventoryStrings } from '../../src/experiments/parabolic/views/strings/inventory.ts'
import { strings as adjustStrings } from '../../src/experiments/parabolic/views/strings/adjust.ts'
import { strings as tapeStrings } from '../../src/experiments/parabolic/views/strings/tape.ts'
import { strings as timingStrings } from '../../src/experiments/parabolic/views/strings/timing.ts'
import { strings as launchStrings } from '../../src/experiments/parabolic/views/strings/launch.ts'
import { strings as tableStrings } from '../../src/experiments/parabolic/views/strings/table.ts'
import { strings as slowmoStrings } from '../../src/experiments/parabolic/views/strings/slowmo.ts'
import { strings as analysisStrings } from '../../src/experiments/parabolic/views/strings/analysis.ts'
import { strings as shellStrings } from '../../src/experiments/parabolic/views/strings/shell.ts'
import { strings as placeholderStrings } from '../../src/experiments/parabolic/views/strings/placeholder.ts'
import { strings as checklistStrings } from '../../src/experiments/parabolic/pedagogy/strings/checklist.ts'
import { strings as tourStrings } from '../../src/experiments/parabolic/pedagogy/strings/tour.ts'
import { strings as coachStrings } from '../../src/experiments/parabolic/pedagogy/strings/coach.ts'
import { STEP_IDS, buildChecklist, nextStep } from '../../src/experiments/parabolic/pedagogy/checklist.ts'
import { TOUR_STEP_IDS } from '../../src/experiments/parabolic/pedagogy/tour.ts'
import { COACH_KEYS, coachCandidates } from '../../src/experiments/parabolic/pedagogy/coach.ts'
import { cmText, compareReading, formatFrameTime, formatRange, formatTime, parseCm, signedText, tableCsv } from '../../src/experiments/parabolic/views/format.ts'
import { nextEmptyTimeCell, tapeFromKey, tapeKey } from '../../src/experiments/parabolic/views/uistate.ts'
import { jointBlock } from '../../src/experiments/parabolic/views/inventory.ts'
import { rebaseSnapshotTime } from '../../src/experiments/parabolic/restore.ts'
import { toCSV } from '../../src/core/views/csv.ts'

const pages = import.meta.glob('../../parabolico/**/*.html', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

/** Every leaf of a nested strings object as "path.to.leaf" -> text (arrays use their index). */
function leaves(v: unknown, path = ''): Record<string, string> {
  if (typeof v === 'string') return { [path]: v }
  const out: Record<string, string> = {}
  if (Array.isArray(v)) v.forEach((x, i) => Object.assign(out, leaves(x, `${path}[${i}]`)))
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) Object.assign(out, leaves(x, path ? `${path}.${k}` : k))
  return out
}
const placeholders = (s: string): string[] => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!).sort()

const FILES: Array<[string, { es: unknown; en: unknown }]> = [
  ['reasons', reasonStrings], ['inventory', inventoryStrings], ['adjust', adjustStrings], ['tape', tapeStrings], ['timing', timingStrings],
  ['launch', launchStrings], ['table', tableStrings], ['slowmo', slowmoStrings], ['analysis', analysisStrings], ['shell', shellStrings],
  ['placeholder', placeholderStrings], ['checklist', checklistStrings], ['tour', tourStrings], ['coach', coachStrings],
]

describe('parabolic strings', () => {
  for (const [name, pair] of FILES) {
    it(`${name}: Spanish and English have the same keys, the same {placeholders} and no empty text`, () => {
      const es = leaves(pair.es), en = leaves(pair.en)
      expect(Object.keys(en)).toEqual(Object.keys(es))
      for (const k of Object.keys(es)) {
        expect(placeholders(en[k]!), `${name}.${k}`).toEqual(placeholders(es[k]!))
        // a few strings are intentionally empty in both languages (none today)
        expect(es[k]!.trim(), `${name}.${k} (es)`).not.toBe('')
        expect(en[k]!.trim(), `${name}.${k} (en)`).not.toBe('')
      }
    })
  }

  it('translates every Reason, every RunBlock and every MarkResult the apparatus exports', () => {
    for (const lang of ['es', 'en'] as const) {
      expect(Object.keys(reasonStrings[lang].reasons).sort()).toEqual([...REASONS].sort())
      expect(Object.keys(reasonStrings[lang].blocks).sort()).toEqual([...RUN_BLOCKS].sort())
      expect(Object.keys(reasonStrings[lang].markResults).sort()).toEqual([...MARK_RESULTS].sort())
      for (const r of REASONS) expect(reasonText(lang, r, 'rail').length).toBeGreaterThan(5)
      for (const b of RUN_BLOCKS) expect(blockText(lang, b).length).toBeGreaterThan(5)
      for (const m of MARK_RESULTS) expect(markResultText(lang, m).length).toBeGreaterThan(5)
    }
  })

  it('names every inventory item and joint, and fills {item} in refusals', () => {
    for (const lang of ['es', 'en'] as const) {
      expect(Object.keys(inventoryStrings[lang].items).sort()).toEqual([...ITEM_IDS].sort())
      expect(Object.keys(inventoryStrings[lang].itemShort).sort()).toEqual([...ITEM_IDS].sort())
    }
    expect(reasonText('es', 'itemNotOnTable', 'rail')).toBe('Falta la riel sobre la mesa: está en la bandeja bajo el escenario; arrastra la pieza de vuelta.')
    expect(reasonText('en', 'itemNotOnTable', 'tapeMeasure')).toContain('the tape measure')
    expect(reasonText('es', 'itemNotOnTable')).not.toContain('{')
    expect(reasonText('es', 'itemAlreadyOnTable', 'level')).toContain('el nivelador')
  })

  it('has a checklist, tour and coach text for every step id', () => {
    for (const lang of ['es', 'en'] as const) {
      expect(Object.keys(checklistStrings[lang].steps)).toEqual([...STEP_IDS])
      expect(Object.keys(tourStrings[lang].steps)).toEqual([...TOUR_STEP_IDS])
      expect(Object.keys(coachStrings[lang].nudges)).toEqual([...COACH_KEYS])
    }
  })

  it('lists five lab steps with matching long and short names', () => {
    for (const lang of ['es', 'en'] as const) {
      expect(shellStrings[lang].stepNames).toHaveLength(5)
      expect(shellStrings[lang].stepShort).toHaveLength(5)
    }
    expect(shellStrings.es.stepNames[0]).toBe('Montaje')
    expect(shellStrings.en.stepNames[2]).toBe('Launches and Table 2.1')
  })
})

describe('registry and pages', () => {
  it('parabolic is ready and its page and help pages exist', () => {
    const x = findExperiment('parabolic')!
    expect(x.status).toBe('ready')
    expect(readyExperiments().map((e) => e.id)).toContain('parabolic')
    for (const path of [x.page, x.help.es, x.help.en]) expect(Object.keys(pages), path).toContain(`../../${path}`)
    expect(pages['../../parabolico/index.html']).toContain('Movimiento parabólico · Laboratorio virtual')
    expect(pages['../../parabolico/index.html']).toContain('/src/experiments/parabolic/main.ts')
    expect(experiments.every((e) => e.status === 'ready')).toBe(true)
  })
})

describe('numbers and CSV', () => {
  it('formats times with two decimals and ranges with three, with the language mark', () => {
    expect(formatTime(0.4, 'es')).toBe('0,40')
    expect(formatTime(0.4, 'en')).toBe('0.40')
    expect(formatRange(0.6523, 'es')).toBe('0,652')
    expect(formatRange(null, 'en')).toBe('')
    expect(formatFrameTime(-0.00833, 'es')).toBe('−0,008')
    expect(formatFrameTime(0.0001, 'es')).toBe('0,000')
    expect(formatFrameTime(0.1542, 'en')).toBe('0.154')
  })
  it('shows lengths in cm without trailing zeros and parses typed cm to metres', () => {
    expect(cmText(0.6, 'es')).toBe('60')
    expect(cmText(0.605, 'es')).toBe('60,5')
    expect(cmText(1.2, 'en')).toBe('120')
    expect(cmText(0.1, 'en')).toBe('10')
    expect(parseCm('62,5')).toBeCloseTo(0.625, 12)
    expect(parseCm(' 5 ')).toBeCloseTo(0.05, 12)
    expect(parseCm('abc')).toBeNaN()
  })
  it('compares a stopwatch reading with the frame time: difference and relative error', () => {
    const c = compareReading(0.45, 0.4)
    expect(c.difference_s).toBeCloseTo(0.05, 12)
    expect(c.relative).toBeCloseTo(0.125, 12)
    expect(compareReading(0.3, 0.4).difference_s).toBeCloseTo(-0.1, 12)
    expect(compareReading(0.3, 0).relative).toBeNaN()
    expect(signedText(0.05, 2, 'es')).toBe('+0,05')
    expect(signedText(-0.1, 2, 'en')).toBe('−0.10')
    expect(signedText(12.5, 1, 'es')).toBe('+12,5')
    expect(signedText(0, 1, 'en')).toBe('0.0')
  })

  function filled() {
    const a = createApparatus('empty', { seed: 2 })
    a.tableSetTime('marble', 0, 0, '0,41'); a.tableSetTime('marble', 0, 1, '0.39'); a.tableSetRange('marble', 0, 0, '0,652'); a.tableSetRange('marble', 4, 4, '1.2')
    return a.tableData('marble')
  }
  it('exports Tabla 2.1 as CSV: Spanish with ";" and decimal comma, English with "," and decimal point', () => {
    const es = tableCsv(filled(), 'es').trim().split('\n')
    expect(es).toHaveLength(1 + TABLE_TRIALS)
    expect(es[0]).toBe('No.;t1 (s);t2 (s);t3 (s);t4 (s);t5 (s);x1 (m);x2 (m);x3 (m);x4 (m);x5 (m)')
    expect(es[1]).toBe('1;0,41;0,39;;;;0,652;;;;')
    expect(es[5]).toBe('5;;;;;;;;;;1,200')
    const en = tableCsv(filled(), 'en').trim().split('\n')
    expect(en[0]).toBe('No.,t1 (s),t2 (s),t3 (s),t4 (s),t5 (s),x1 (m),x2 (m),x3 (m),x4 (m),x5 (m)')
    expect(en[1]).toBe('1,0.41,0.39,,,,0.652,,,,')
    expect(en[5]).toBe('5,,,,,,,,,,1.200')
    expect(es.every((r) => r.split(';').length === 1 + 2 * TABLE_REPS)).toBe(true)
  })
  it('the MRUV CSV export is unchanged', () => {
    expect(toCSV([0, 10], [[0, null], [1.5, 1.23]], 'es')).toBe('x (cm);t1 (s);t2 (s)\n0;0,00;\n10;1,50;1,23\n')
  })
})

describe('shared UI state helpers', () => {
  it('moves the target to the next cell without a time, wrapping to the next trial and staying put when the table is full', () => {
    const empty = Array.from({ length: TABLE_TRIALS }, () => Array<number | null>(TABLE_REPS).fill(null))
    expect(nextEmptyTimeCell(empty, { trial: 0, rep: 0 })).toEqual({ trial: 0, rep: 1 })
    expect(nextEmptyTimeCell(empty, { trial: 0, rep: 4 })).toEqual({ trial: 1, rep: 0 })
    const t = empty.map((r) => [...r])
    t[0]![1] = 0.4; t[0]![2] = 0.4
    expect(nextEmptyTimeCell(t, { trial: 0, rep: 0 })).toEqual({ trial: 0, rep: 3 })
    const full = empty.map((r) => r.map(() => 0.4))
    expect(nextEmptyTimeCell(full, { trial: 2, rep: 2 })).toEqual({ trial: 2, rep: 2 })
  })
  it('converts tape targets to keys and back', () => {
    for (const t of [{ kind: 'launchHeight' }, { kind: 'gap' }, { kind: 'rise' }, { kind: 'range', carbonId: 'c3' }, { kind: 'markPosition', markId: 'm2' }] as const) {
      expect(tapeFromKey(tapeKey(t))).toEqual(t)
    }
    expect(tapeFromKey('nonsense')).toBeNull()
  })
})

describe('inventory joints', () => {
  it('explains why a joint cannot be made, in the apparatus order of checks', () => {
    const a = createApparatus('empty', { seed: 1 })
    expect(jointBlock(a.getState(), 'standBase')).toEqual({ reason: 'itemNotOnTable', item: 'rackStand' })
    for (const i of ITEM_IDS) a.addItem(i)
    expect(jointBlock(a.getState(), 'rackClamp')).toEqual({ reason: 'needStandBase' })
    expect(jointBlock(a.getState(), 'twoLegStand')).toEqual({ reason: 'needRackClamp' })
    expect(jointBlock(a.getState(), 'standBase')).toBeNull()
    a.attach('standBase'); a.attach('rackClamp')
    expect(jointBlock(a.getState(), 'twoLegStand')).toBeNull()
    expect(jointBlock(a.getState(), 'standBase')).toEqual({ reason: 'alreadyAttached' })
  })
})

describe('procedure checklist and coach', () => {
  it('reads the apparatus: nothing done on an empty bench, assembly, rise, gap, marks and paper done on the assembled one', () => {
    const empty = buildChecklist(createApparatus('empty', { seed: 1 }))
    expect(empty.map((s) => s.id)).toEqual([...STEP_IDS])
    expect(empty.find((s) => s.id === 'assembly')!.status).toBe('pending')
    expect(empty.find((s) => s.id === 'rise')!.status).toBe('na')
    expect(nextStep(empty)!.id).toBe('assembly')
    const ready = buildChecklist(createApparatus('assembled', { seed: 7 }))
    const st = Object.fromEntries(ready.map((s) => [s.id, s.status]))
    expect(st).toEqual({ assembly: 'ok', rise: 'ok', gap: 'ok', marks: 'ok', paper: 'ok', edgeProjection: 'ok', timing: 'na', range: 'na', launches: 'pending', bothBalls: 'pending', launchHeight: 'ok' })
    expect(nextStep(ready)!.id).toBe('launches')
  })
  it('coaches marks in the lower half, a release without carbon and a moved paper', () => {
    const a = createApparatus('assembled', { seed: 7 })
    const low = a.placeMark(0.3)
    expect(low.ok).toBe(true)
    const ev = a.eventLog().filter((e) => e.type === 'markPlaced').at(-1)!
    expect(coachCandidates(a, ev).map((n) => n.key)).toEqual(['marksLowerHalf'])
    expect(coachCandidates(a, a.eventLog().filter((e) => e.type === 'markPlaced')[0]!)).toEqual([])
    a.removeCarbon()
    a.release(1000)
    expect(coachCandidates(a, a.eventLog().at(-1)!).map((n) => n.key)).toEqual(['noCarbon'])
  })
})

describe('restoring a saved snapshot', () => {
  function afterOneLaunch(): ApparatusSnapshot {
    const a = createApparatus('assembled', { seed: 7 })
    a.addItem('stopwatch') // already there; ignored
    const rel = a.release(5000)
    expect(rel.ok).toBe(true)
    const run = a.getRun(1)!
    a.stopwatchStartStop(5000 + run.times.edge_s! * 1000)
    a.stopwatchStartStop(5000 + run.times.land_s! * 1000 + 100)
    a.tick(5000 + run.times.end_s * 1000 + 50)
    return a.snapshot()
  }
  it('puts every saved time in the past of the new clock, so the finished run and its mark are in place', () => {
    const snap = afterOneLaunch()
    const rebased = rebaseSnapshotTime(snap)
    expect(rebased.clock_ms).toBeLessThanOrEqual(0)
    expect(rebased.runs[0]!.releaseTime_ms).toBeLessThan(0)
    expect(rebased.stops[0]!.stopTime_ms).toBeLessThanOrEqual(0)
    const b = createApparatus('empty', { seed: 7 })
    expect(b.load(rebased).ok).toBe(true)
    expect(b.canRelease(0).reasons).not.toContain('ballMoving')
    expect(b.ballStatus(0).phase).toBe('landed')
    expect(b.paperMarks(0)).toHaveLength(1)
    expect(b.tableData('marble').trials).toBe(TABLE_TRIALS)
    expect(b.resetBall().ok).toBe(true)
    expect(b.release(10).ok).toBe(true)
    // the original snapshot is not touched
    expect(snap.runs[0]!.releaseTime_ms).toBe(5000)
  })
  it('zeroes a stopwatch that was running and keeps the stop log', () => {
    const a = createApparatus('assembled', { seed: 3 })
    a.stopwatchStartStop(100)
    a.stopwatchStartStop(900)
    a.stopwatchStartStop(1500)
    const r = rebaseSnapshotTime(a.snapshot())
    expect(r.stopwatch.running).toBe(false)
    expect(r.stopwatch.accumulated_ms).toBe(0)
    expect(r.stops).toHaveLength(1)
    const b = createApparatus('empty', { seed: 3 })
    expect(b.load(r).ok).toBe(true)
    expect(b.getState().stopwatch.running).toBe(false)
  })
})
