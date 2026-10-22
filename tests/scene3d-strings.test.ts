import { describe, expect, it } from 'vitest'
import { strings } from '../src/views/strings/scene3d.ts'

const keys = (o: unknown, p = ''): string[] =>
  typeof o === 'object' && o !== null ? Object.entries(o).flatMap(([k, v]) => keys(v, `${p}${k}.`)) : [p]

describe('scene3d strings', () => {
  it('es and en have identical keys and no empty text (except the select-tool hint)', () => {
    expect(keys(strings.es).sort()).toEqual(keys(strings.en).sort())
    for (const lang of ['es', 'en'] as const) {
      const flat = (o: unknown, p = ''): [string, string][] =>
        typeof o === 'string' ? [[p, o]] : typeof o === 'object' && o !== null ? Object.entries(o).flatMap(([k, v]) => flat(v, `${p}${k}.`)) : []
      for (const [k, v] of flat(strings[lang])) if (k !== 'toolHint.select.') expect(v.length, `${lang} ${k}`).toBeGreaterThan(0)
    }
  })
  it('every part the scene tags has a name and a description', () => {
    for (const id of ['rail', 'cart', 'rackStand', 'standBase', 'twoLegStand', 'receiver', 'screws', 'level', 'stopwatch', 'caliper', 'markers', 'rackKnob', 'foot', 'tape', 'pulley', 'ghost']) {
      expect((strings.es.parts as Record<string, { name: string }>)[id]?.name, id).toBeTruthy()
      expect((strings.en.parts as Record<string, { info: string }>)[id]?.info, id).toBeTruthy()
    }
  })
  it('refusal texts exist for the reasons a student can trigger in the scene', () => {
    for (const r of ['cartOffRail', 'cartNotAtStart', 'cartMoving', 'noReceiver', 'railNotSupported', 'duplicateMark', 'outOfRail', 'needStandBase', 'noScrews', 'railNotAssembled']) {
      expect(strings.es.refused[r], r).toBeTruthy()
      expect(strings.en.refused[r], r).toBeTruthy()
    }
  })
})
