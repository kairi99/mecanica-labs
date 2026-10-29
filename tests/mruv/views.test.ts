import { describe, expect, it } from 'vitest'
import typesSource from '../../src/experiments/mruv/apparatus/types.ts?raw'
import { Apparatus } from '../../src/experiments/mruv/apparatus/index.ts'
import { toCSV } from '../../src/core/views/csv.ts'
import { formatCell, formatNum, lcdText, parseDecimal } from '../../src/core/views/numfmt.ts'
import { strings as reasonStrings } from '../../src/experiments/mruv/views/strings/reasons.ts'
import { reasonText } from '../../src/experiments/mruv/views/reasons.ts'
import { handleStopwatchKey } from '../../src/core/views/stopwatchkeys.ts'
import { strings as invStrings } from '../../src/experiments/mruv/views/strings/inventory.ts'
import { strings as adjustStrings } from '../../src/experiments/mruv/views/strings/adjust.ts'
import { strings as stopwatchStrings } from '../../src/experiments/mruv/views/strings/stopwatch.ts'
import { strings as tapeStrings } from '../../src/experiments/mruv/views/strings/tape.ts'
import { strings as tableStrings } from '../../src/experiments/mruv/views/strings/table.ts'
import { strings as tabletStrings } from '../../src/experiments/mruv/views/strings/tablet.ts'
import { strings as checklistStrings } from '../../src/experiments/mruv/pedagogy/strings/checklist.ts'
import { strings as coachStrings } from '../../src/experiments/mruv/pedagogy/strings/coach.ts'
import { strings as tourStrings } from '../../src/experiments/mruv/pedagogy/strings/tour.ts'
import { strings as analysisStrings } from '../../src/experiments/mruv/views/strings/analysis.ts'
import { strings as dragdropStrings } from '../../src/experiments/mruv/views/strings/dragdrop.ts'
import { strings as side2dStrings } from '../../src/experiments/mruv/views/strings/side2d.ts'
import { strings as shellStrings } from '../../src/experiments/mruv/views/strings/shell.ts'
import { strings as landingStrings } from '../../src/landing/strings.ts'
import { strings as coreShellStrings } from '../../src/core/shell/strings.ts'

describe('CSV export', () => {
  const pos = [0, 10, 20]
  const vals: (number | null)[][] = [[0, null], [1.5, 1.23], [2.97, null]]
  it('ES uses ; and decimal comma', () => {
    const lines = toCSV(pos, vals, 'es').trim().split('\n')
    expect(lines[0]).toBe('x (cm);t1 (s);t2 (s)')
    expect(lines[2]).toBe('10;1,50;1,23')
    expect(lines[3]).toBe('20;2,97;')
  })
  it('EN uses , and decimal point', () => {
    const lines = toCSV(pos, vals, 'en').trim().split('\n')
    expect(lines[0]).toBe('x (cm),t1 (s),t2 (s)')
    expect(lines[2]).toBe('10,1.50,1.23')
    expect(lines[3]).toBe('20,2.97,')
  })
})

describe('number parsing and formatting', () => {
  it('accepts decimal comma and point', () => {
    expect(parseDecimal('2,97')).toBe(2.97)
    expect(parseDecimal(' 2.97 ')).toBe(2.97)
    expect(parseDecimal('abc')).toBeNaN()
    expect(parseDecimal('1,2,3')).toBeNaN()
  })
  it('formats with the language decimal mark', () => {
    expect(formatNum(2.5, 2, 'es')).toBe('2,50')
    expect(formatNum(2.5, 2, 'en')).toBe('2.50')
    expect(formatCell(null, 'es')).toBe('')
    expect(formatCell(1.2, 'es')).toBe('1,20')
  })
  it('stopwatch LCD text', () => {
    expect(lcdText(0)).toBe('00:00.00')
    expect(lcdText(2.97)).toBe('00:02.97')
    expect(lcdText(61.5)).toBe('01:01.50')
  })
  it('table cell input with decimal comma goes through the apparatus', () => {
    const a = new Apparatus({ seed: 1 })
    const ok = a.tableSet(1, 0, '2,97')
    expect(ok.ok).toBe(true)
    expect(a.tableData().values_s[1]![0]).toBe(2.97)
    const bad = a.tableSet(1, 1, '2,971')
    expect(bad.ok).toBe(false)
    if (!bad.ok) expect(bad.reason).toBe('tooManyDecimals')
    const nan = a.tableSet(1, 2, 'x')
    if (!nan.ok) expect(nan.reason).toBe('notANumber')
  })
})

describe('reason ids to text', () => {
  const block = /export type Reason =([\s\S]*?)\n\nexport type Failure/.exec(typesSource)![1]!
  const ids = [...block.matchAll(/'([A-Za-z]+)'/g)].map((m) => m[1]!)
  it('found the reason ids', () => { expect(ids.length).toBeGreaterThan(30) })
  it('every apparatus reason id has ES and EN text', () => {
    for (const id of ids) {
      for (const lang of ['es', 'en'] as const) {
        const txt = (reasonStrings[lang] as Record<string, string>)[id]
        expect(txt, `${lang}:${id}`).toBeTruthy()
      }
    }
    expect(Object.keys(reasonStrings.es).sort()).toEqual([...ids].sort())
  })
  it('names the item in the refusal', () => {
    expect(reasonText('es', 'itemNotOnTable', 'rail')).toContain('riel')
    expect(reasonText('en', 'itemNotOnTable', 'rail')).toContain('rail')
  })
  it("includes the guide's warning about the cart off the track", () => {
    expect(reasonText('es', 'cartOffRail')).toMatch(/nunca debe quedar fuera de la pista/)
  })
})

describe('strings key parity ES/EN', () => {
  const shape = (v: unknown, path = ''): string[] => {
    if (Array.isArray(v)) return [`${path}[${v.length}]`]
    if (v && typeof v === 'object') return Object.keys(v).sort().flatMap((k) => shape((v as Record<string, unknown>)[k], `${path}.${k}`))
    return [path]
  }
  const files = {
    reasons: reasonStrings, inventory: invStrings, adjust: adjustStrings, stopwatch: stopwatchStrings, tape: tapeStrings,
    table: tableStrings, tablet: tabletStrings, checklist: checklistStrings, coach: coachStrings, tour: tourStrings, analysis: analysisStrings, side2d: side2dStrings, dragdrop: dragdropStrings, shell: shellStrings,
    landing: landingStrings, coreShell: coreShellStrings,
  }
  for (const [name, s] of Object.entries(files)) {
    it(`${name} has identical keys and no empty text`, () => {
      expect(shape(s.es)).toEqual(shape(s.en))
      const empties = (v: unknown): number => (typeof v === 'string' ? (v.trim() === '' ? 1 : 0) : v && typeof v === 'object' ? Object.values(v).reduce<number>((n, x) => n + empties(x), 0) : 0)
      expect(empties(s.es)).toBe(0)
      expect(empties(s.en)).toBe(0)
    })
  }
})

describe('tape measure wording', () => {
  it('names the instrument Flexómetro / Tape measure and never mentions the retired caliper', () => {
    expect(tapeStrings.es.title).toBe('Flexómetro')
    expect(tapeStrings.en.title).toBe('Tape measure')
    expect(invStrings.es.items.tape.name).toBe('Flexómetro (cinta métrica)')
    expect(invStrings.en.items.tape.name).toBe('Tape measure')
    const all = JSON.stringify([tapeStrings, invStrings, reasonStrings, checklistStrings, coachStrings, tourStrings])
    expect(all).not.toMatch(/calibrador|pie de rey|vernier|nonio|caliper|mordaza|jaw/i)
  })
})

describe('stopwatch keys use event.timeStamp', () => {
  const mk = () => {
    const calls: string[] = []
    const actions = {
      startStop: (t: number) => calls.push(`startStop@${t}`),
      reset: () => calls.push('reset'),
      release: (t: number) => calls.push(`release@${t}`),
    }
    return { calls, actions }
  }
  it('Space starts/stops at the keydown timestamp, not a later clock', () => {
    const { calls, actions } = mk()
    let prevented = false
    const e = { timeStamp: 1234.5, code: 'Space', key: ' ', target: { tagName: 'BODY' } as unknown as EventTarget, preventDefault: () => { prevented = true } }
    expect(handleStopwatchKey(e, actions)).toBe(true)
    expect(calls).toEqual(['startStop@1234.5'])
    expect(prevented).toBe(true)
  })
  it('S releases at the keydown timestamp; R resets', () => {
    const { calls, actions } = mk()
    handleStopwatchKey({ timeStamp: 77.25, code: 'KeyS', key: 's' }, actions)
    handleStopwatchKey({ timeStamp: 80, code: 'KeyR', key: 'r' }, actions)
    expect(calls).toEqual(['release@77.25', 'reset'])
  })
  it('ignores keys typed in text inputs, repeats and modified keys', () => {
    const { calls, actions } = mk()
    const input = { tagName: 'INPUT', type: 'text' } as unknown as EventTarget
    expect(handleStopwatchKey({ timeStamp: 1, code: 'Space', key: ' ', target: input }, actions)).toBe(false)
    expect(handleStopwatchKey({ timeStamp: 2, code: 'KeyS', key: 's', target: { tagName: 'SELECT' } as unknown as EventTarget }, actions)).toBe(false)
    handleStopwatchKey({ timeStamp: 3, code: 'Space', key: ' ', repeat: true }, actions)
    expect(handleStopwatchKey({ timeStamp: 4, code: 'KeyR', key: 'r', ctrlKey: true }, actions)).toBe(false)
    expect(calls).toEqual([])
  })
  it('does not hijack buttons, links, summaries, checkboxes, radios, ranges or [role=button] (B5)', () => {
    const { calls, actions } = mk()
    const targets: Array<Record<string, unknown>> = [
      { tagName: 'BUTTON' }, { tagName: 'A' }, { tagName: 'SUMMARY' },
      { tagName: 'INPUT', type: 'checkbox' }, { tagName: 'INPUT', type: 'radio' }, { tagName: 'INPUT', type: 'range' },
      { tagName: 'DIV', getAttribute: (k: string) => (k === 'role' ? 'button' : null) },
    ]
    for (const t of targets) {
      for (const [code, key] of [['Space', ' '], ['KeyS', 's'], ['KeyR', 'r'], ['Enter', 'Enter']] as const) {
        expect(handleStopwatchKey({ timeStamp: 1, code, key, target: t as unknown as EventTarget }, actions), `${String(t.tagName)} ${code}`).toBe(false)
      }
    }
    expect(calls).toEqual([])
  })
  it('works on the page body and on the stage canvas, and Enter copies to the table', () => {
    const { calls, actions } = mk()
    const copies: number[] = []
    const withCopy = { ...actions, copy: (t: number) => copies.push(t) }
    for (const tagName of ['BODY', 'CANVAS', 'DIV']) {
      expect(handleStopwatchKey({ timeStamp: 5, code: 'Space', key: ' ', target: { tagName } as unknown as EventTarget }, withCopy)).toBe(true)
    }
    expect(handleStopwatchKey({ timeStamp: 9, code: 'Enter', key: 'Enter', target: { tagName: 'BODY' } as unknown as EventTarget }, withCopy)).toBe(true)
    expect(copies).toEqual([9])
    expect(calls).toEqual(['startStop@5', 'startStop@5', 'startStop@5'])
    expect(handleStopwatchKey({ timeStamp: 9, code: 'Enter', key: 'Enter' }, actions)).toBe(false) // no copy action: Enter is not ours
  })
  it("the timing bar's own buttons keep Space and Enter; S and R still work there, never in its select", () => {
    const { calls, actions } = mk()
    const inBar = (tagName: string, extra: Record<string, unknown> = {}) => ({ tagName, closest: (s: string) => (s === '[data-timing-bar]' ? {} : null), ...extra }) as unknown as EventTarget
    expect(handleStopwatchKey({ timeStamp: 1, code: 'Space', key: ' ', target: inBar('BUTTON') }, actions)).toBe(false)
    expect(handleStopwatchKey({ timeStamp: 1, code: 'Enter', key: 'Enter', target: inBar('BUTTON') }, actions)).toBe(false)
    expect(handleStopwatchKey({ timeStamp: 2, code: 'KeyS', key: 's', target: inBar('BUTTON') }, actions)).toBe(true)
    expect(handleStopwatchKey({ timeStamp: 3, code: 'KeyR', key: 'r', target: inBar('BUTTON') }, actions)).toBe(true)
    expect(handleStopwatchKey({ timeStamp: 4, code: 'KeyS', key: 's', target: inBar('SELECT') }, actions)).toBe(false)
    expect(calls).toEqual(['release@2', 'reset'])
  })
  it('the stop is recorded at that timestamp by the apparatus', () => {
    const a = new Apparatus({ seed: 1 })
    a.preset('assembled')
    const rel = a.releaseCart(10_000)
    expect(rel.ok).toBe(true)
    handleStopwatchKey({ timeStamp: 10_300, code: 'Space', key: ' ' }, { startStop: (t) => a.stopwatchStartStop(t), reset: () => {}, release: () => {} })
    handleStopwatchKey({ timeStamp: 13_300, code: 'Space', key: ' ' }, { startStop: (t) => a.stopwatchStartStop(t, { markTarget: 9 }), reset: () => {}, release: () => {} })
    const stop = a.stopLog()[0]!
    expect(stop.startTime_ms).toBe(10_300)
    expect(stop.stopTime_ms).toBe(13_300)
    expect(stop.reading_s).toBeCloseTo(3.0, 2)
    expect(stop.startOffset_s).toBeCloseTo(0.3, 6)
  })
})
