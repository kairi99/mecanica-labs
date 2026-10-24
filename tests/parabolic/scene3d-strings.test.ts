import { describe, expect, it } from 'vitest'
import { REASONS } from '../../src/experiments/parabolic/apparatus/index.ts'
import { PRESETS, TOOLS } from '../../src/experiments/parabolic/views/stage.ts'
import { strings } from '../../src/experiments/parabolic/views/strings/scene3d.ts'
import { strings as side } from '../../src/experiments/parabolic/views/strings/side2d.ts'

/** Dotted paths of every string leaf. */
function keys(o: unknown, prefix = ''): string[] {
  if (typeof o === 'string') return [prefix]
  return Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k))
}
const leaves = (o: unknown): string[] => {
  const out: string[] = []
  const walk = (v: unknown): void => { if (typeof v === 'string') out.push(v); else for (const x of Object.values(v as Record<string, unknown>)) walk(x) }
  walk(o)
  return out
}

describe('scene3d strings', () => {
  it('Spanish and English have the same keys', () => {
    expect(keys(strings.en).sort()).toEqual(keys(strings.es).sort())
  })
  it('every preset and tool has a label and a hint', () => {
    for (const lang of ['es', 'en'] as const) {
      for (const p of PRESETS) expect(strings[lang].presets[p].length).toBeGreaterThan(0)
      for (const t of TOOLS) { expect(strings[lang].tools[t].length).toBeGreaterThan(0); expect(strings[lang].toolHint).toHaveProperty(t) }
      expect(strings[lang].toolHint.select).toBe('')
      for (const t of TOOLS.filter((x) => x !== 'select')) expect(strings[lang].toolHint[t].length).toBeGreaterThan(0)
    }
  })
  it('refusal texts only exist for real apparatus reasons, and cover what the scene can trigger', () => {
    const real = new Set<string>(REASONS)
    for (const lang of ['es', 'en'] as const) {
      for (const k of Object.keys(strings[lang].refused)) expect(real.has(k), k).toBe(true)
      for (const r of ['noRail', 'ballMoving', 'noBallPlaced', 'noBallSelected', 'outOfRail', 'ballOffRail', 'tipOverhangsEdge', 'carbonNotOverBond', 'needBondPaper',
        'duplicateMark', 'tooManyMarks', 'unknownMark', 'noEdgeProjection', 'unknownCarbonMark', 'itemNotOnTable', 'levelNeedsRail', 'outOfRange', 'notMeasurable']) {
        expect(strings[lang].refused[r], `${lang}.${r}`).toBeTruthy()
      }
    }
  })
  it('every part has a name and a description in both languages', () => {
    for (const lang of ['es', 'en'] as const) for (const [id, p] of Object.entries(strings[lang].parts)) { expect(p.name.length, id).toBeGreaterThan(0); expect(p.info.length, id).toBeGreaterThan(0) }
  })
  it('no string is empty and none leaks a hidden number', () => {
    for (const lang of ['es', 'en'] as const) for (const s of leaves({ ...strings[lang], toolHint: {} })) expect(s.length).toBeGreaterThan(0) // the select hint is empty on purpose
    // part descriptions never state the table height or any bench value (the student measures them)
    for (const lang of ['es', 'en'] as const) for (const p of Object.values(strings[lang].parts)) expect(p.info).not.toMatch(/\b7[4-8][.,]?\d*\s?cm\b/)
  })
})

describe('side2d strings', () => {
  it('Spanish and English have the same keys', () => {
    expect(keys(side.en).sort()).toEqual(keys(side.es).sort())
    for (const s of leaves(side.es)) expect(s.length).toBeGreaterThan(0)
  })
})
