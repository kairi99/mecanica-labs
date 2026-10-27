import { describe, expect, it } from 'vitest'
import { ITEM_IDS, REASONS, createApparatus, type ApparatusSnapshot } from '../../src/experiments/friction/apparatus/index.ts'
import { findExperiment, readyExperiments } from '../../src/experiments/registry.ts'
import { strings as reasonStrings } from '../../src/experiments/friction/views/strings/reasons.ts'
import { reasonText } from '../../src/experiments/friction/views/reasons.ts'
import { strings as inventoryStrings } from '../../src/experiments/friction/views/strings/inventory.ts'
import { strings as benchStrings } from '../../src/experiments/friction/views/strings/bench.ts'
import { strings as pullStrings } from '../../src/experiments/friction/views/strings/pull.ts'
import { strings as tableStrings } from '../../src/experiments/friction/views/strings/table.ts'
import { strings as inclineStrings } from '../../src/experiments/friction/views/strings/incline.ts'
import { strings as recordStrings } from '../../src/experiments/friction/views/strings/record.ts'
import { strings as analysisStrings } from '../../src/experiments/friction/views/strings/analysis.ts'
import { strings as side2dStrings } from '../../src/experiments/friction/views/strings/side2d.ts'
import { strings as sceneStrings, PRESETS } from '../../src/experiments/friction/views/strings/scene3d.ts'
import { strings as shellStrings } from '../../src/experiments/friction/views/strings/shell.ts'
import { strings as checklistStrings } from '../../src/experiments/friction/pedagogy/strings/checklist.ts'
import { strings as tourStrings } from '../../src/experiments/friction/pedagogy/strings/tour.ts'
import { strings as coachStrings } from '../../src/experiments/friction/pedagogy/strings/coach.ts'
import { STEP_IDS, buildChecklist, nextStep } from '../../src/experiments/friction/pedagogy/checklist.ts'
import { TOUR_STEP_IDS } from '../../src/experiments/friction/pedagogy/tour.ts'
import { COACH_KEYS, coachCandidates } from '../../src/experiments/friction/pedagogy/coach.ts'
import { rebaseSnapshotTime } from '../../src/experiments/friction/restore.ts'
import { advanceCell, getCell, resetUi, setCell } from '../../src/experiments/friction/views/uistate.ts'
import { niceTicks } from '../../src/experiments/friction/views/plot.ts'

const pages = import.meta.glob('../../rozamiento/**/*.html', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

/** Every leaf of a nested strings object as "path.to.leaf" -> text. */
function leaves(v: unknown, path = ''): Record<string, string> {
  if (typeof v === 'string') return { [path]: v }
  const out: Record<string, string> = {}
  if (Array.isArray(v)) v.forEach((x, i) => Object.assign(out, leaves(x, `${path}[${i}]`)))
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) Object.assign(out, leaves(x, path ? `${path}.${k}` : k))
  return out
}
const placeholders = (s: string): string[] => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!).sort()

const FILES: Array<[string, { es: unknown; en: unknown }]> = [
  ['reasons', reasonStrings], ['inventory', inventoryStrings], ['bench', benchStrings], ['pull', pullStrings], ['table', tableStrings], ['incline', inclineStrings],
  ['record', recordStrings], ['analysis', analysisStrings], ['side2d', side2dStrings], ['scene3d', sceneStrings], ['shell', shellStrings],
  ['checklist', checklistStrings], ['tour', tourStrings], ['coach', coachStrings],
]

describe('friction strings', () => {
  for (const [name, pair] of FILES) {
    it(`${name}: Spanish and English have the same keys, the same {placeholders} and no empty text`, () => {
      const es = leaves(pair.es), en = leaves(pair.en)
      expect(Object.keys(en)).toEqual(Object.keys(es))
      for (const k of Object.keys(es)) {
        expect(placeholders(en[k]!), `${name}.${k}`).toEqual(placeholders(es[k]!))
        expect(es[k]!.trim(), `${name}.${k} (es)`).not.toBe('')
        expect(en[k]!.trim(), `${name}.${k} (en)`).not.toBe('')
      }
    })
  }
  it('translates every Reason and names every item', () => {
    for (const lang of ['es', 'en'] as const) {
      for (const r of REASONS) expect(reasonStrings[lang].reasons[r], `${lang}.${r}`).toBeTruthy()
      for (const i of ITEM_IDS) {
        expect(inventoryStrings[lang].items[i]).toBeTruthy()
        expect(reasonText(lang, 'itemNotOnTable', i)).toContain(inventoryStrings[lang].itemShort[i].replace(/^(el|la|los|las|the) /, ''))
      }
    }
  })
  it('mentions that the guide omits the stand, the stopwatch and the balance, and states no friction coefficient value', () => {
    expect(inventoryStrings.es.note).toMatch(/balanza/)
    expect(inventoryStrings.en.note).toMatch(/balance/)
    for (const [file, html] of Object.entries(pages)) {
      if (!file.includes('help')) continue
      expect(html).toMatch(/1[,.]10 m/)
      expect(html).not.toMatch(/μ\s*(<sub>[sk]<\/sub>)?\s*=\s*0[,.]\d/) // no "μ = 0.4"-style literature values
    }
  })
  it('has six step names and short names in both languages', () => {
    for (const lang of ['es', 'en'] as const) { expect(shellStrings[lang].stepNames).toHaveLength(6); expect(shellStrings[lang].stepShort).toHaveLength(6) }
    expect(PRESETS).toHaveLength(4)
  })
})

describe('registry and pages', () => {
  it('lists friction as ready with its pages', () => {
    const m = findExperiment('friction')!
    expect(m.status).toBe('ready')
    expect(readyExperiments().map((x) => x.id)).toContain('friction')
    expect(m.page).toBe('rozamiento/index.html')
    expect(m.thumb).toBe('block')
    expect(Object.keys(pages).sort()).toEqual(['../../rozamiento/help/en.html', '../../rozamiento/help/index.html', '../../rozamiento/index.html'])
  })
})

describe('checklist', () => {
  it('starts with the assembly pending and follows the guide in order', () => {
    const app = createApparatus('empty')
    const steps = buildChecklist(app)
    expect(steps.map((s) => s.id)).toEqual([...STEP_IDS])
    expect(nextStep(steps)!.id).toBe('assembly')
    expect(steps.find((s) => s.id === 'exp1')!.status).toBe('na')
  })
  it('the exp12 preset has the weighing, the paper and the zero done, and exp1 pending', () => {
    const steps = buildChecklist(createApparatus('exp12'))
    const st = (id: string): string => steps.find((s) => s.id === id)!.status
    expect(['mass', 'paper', 'zero'].map(st)).toEqual(['ok', 'ok', 'ok'])
    expect(st('exp1')).toBe('pending')
    expect(st('course')).toBe('pending')
  })
  it('every checklist and tour step has strings in both languages', () => {
    for (const lang of ['es', 'en'] as const) {
      for (const id of STEP_IDS) expect(checklistStrings[lang].steps[id].label).toBeTruthy()
      for (const id of TOUR_STEP_IDS) expect(tourStrings[lang].steps[id].title).toBeTruthy()
      for (const k of COACH_KEYS) expect(coachStrings[lang].nudges[k]).toBeTruthy()
    }
  })
})

describe('coach', () => {
  it('warns about a loose paper and a missing zero when the pull starts', () => {
    const app = createApparatus('exp12')
    app.placePaper('loose')
    app.removeItem('scale1N'); app.addItem('scale1N'); app.chooseScale('1N')
    app.pullStart(0, 0.04)
    const e = [...app.eventLog()].reverse().find((x) => x.type === 'pullStarted')!
    const keys = coachCandidates(app, e).map((n) => n.key)
    expect(keys).toContain('paperLoose')
    expect(keys).toContain('zeroMissing')
  })
  it('flags a late read on a slow pull and a 1 N over-range read on heavy sandpaper', () => {
    const app = createApparatus('exp12', { seed: 3 })
    app.setFace('sandpaper'); app.setAddedMasses(3)
    app.pullStart(0, 0.01)
    for (let t = 0; t < 19000; t += 50) app.pullStatus(t)
    app.readScale(19000)
    const read = [...app.eventLog()].reverse().find((x) => x.type === 'read')!
    const keys = coachCandidates(app, read).map((n) => n.key)
    expect(keys).toContain('overRange')
    expect(keys).toContain('lateRead')
  })
  it('flags stick-slip when a slow pull on the soft 1 N scale sticks and slips repeatedly', () => {
    const app = createApparatus('exp12', { seed: 4 })
    app.pullStart(0, 0.01)
    for (let t = 0; t < 30000; t += 50) app.pullStatus(t)
    app.pullEnd(30000)
    const end = [...app.eventLog()].reverse().find((x) => x.type === 'pullEnded')!
    expect(coachCandidates(app, end).map((n) => n.key)).toContain('stickSlip')
  })
  it('warns when the crank is stopped late and when h is read while cranking', () => {
    const app = createApparatus('exp3', { seed: 5 })
    app.raiseStart(0, 0.02)
    const onset = app.inclineOnset_s(1)!
    app.measureHeight(500)
    const refused = [...app.eventLog()].reverse().find((x) => x.type === 'refused')!
    expect(coachCandidates(app, refused).map((n) => n.key)).toContain('heightWhileRaising')
    app.raiseStop((onset + 1) * 1000)
    const rate = [...app.eventLog()].reverse().find((x) => x.type === 'raiseRate')!
    expect(coachCandidates(app, rate).map((n) => n.key)).toContain('crankLate')
  })
  it('flags implausible typed values and a reading copied into the wrong row', () => {
    const app = createApparatus('exp12')
    app.tableSetForce('4.1', 0, 0, '3.2')
    expect(coachCandidates(app, [...app.eventLog()].reverse().find((x) => x.type === 'recorded')!).map((n) => n.key)).toContain('implausibleForce')
    app.pullStart(0, 0.04); app.pullStatus(3000); app.readScale(3000)
    app.tableCopyForce('4.1', 5, 0) // a cloth, 0 g reading into a sandpaper row
    expect(coachCandidates(app, [...app.eventLog()].reverse().find((x) => x.type === 'recorded')!).map((n) => n.key)).toContain('wrongSetup')
  })
})

describe('restore, ui state, plot helpers', () => {
  it('rebases timestamps so a pull in flight counts as ended and the stopwatch is zeroed', () => {
    const app = createApparatus('exp12', { seed: 9 })
    app.pullStart(5000, 0.04)
    app.pullStatus(8000)
    const snap = JSON.parse(JSON.stringify(app.snapshot())) as ApparatusSnapshot
    const re = rebaseSnapshotTime(snap)
    expect(re.activePull).toBeNull()
    expect(re.pullRuns[0]!.end_ms).not.toBeNull()
    expect(Math.max(re.clock_ms, re.pullRuns[0]!.start_ms)).toBeLessThanOrEqual(0)
    const back = createApparatus('empty', { seed: 9 })
    expect(back.load(re).ok).toBe(true)
    expect(back.pullStatus(100).phase).toBe('ended')
  })
  it('moves the active table cell in reading order and clamps it', () => {
    resetUi()
    setCell('4.1', 0, 4)
    advanceCell('4.1')
    expect(getCell('4.1')).toEqual({ row: 1, col: 0 })
    setCell('4.1', 99, 99)
    expect(getCell('4.1')).toEqual({ row: 7, col: 4 })
    setCell('4.3', 2, 4); advanceCell('4.3')
    expect(getCell('4.3')).toEqual({ row: 2, col: 4 })
    resetUi()
  })
  it('chooses 1-2-5 axis ticks that cover the data', () => {
    for (const m of [0.37, 1.2, 2.45, 9.1]) {
      const t = niceTicks(m)
      expect(t.max).toBeGreaterThanOrEqual(m)
      expect(t.ticks[0]).toBe(0)
      expect(t.ticks[t.ticks.length - 1]).toBeCloseTo(t.max, 9)
    }
  })
})
