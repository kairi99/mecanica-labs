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
  it('naming: DigiCart as the device label, never "carrito"; Retirar not Guardar; Extremo bajo and Pie de rey in the short labels', () => {
    const flat = (o: unknown): string[] => (typeof o === 'string' ? [o] : typeof o === 'object' && o !== null ? Object.values(o).flatMap(flat) : [])
    for (const t of flat(strings.es)) {
      expect(t, t).not.toMatch(/carrito/i)
      expect(t, t).not.toMatch(/guardar/i)
      expect(t, t).not.toMatch(/\bel riel\b|\bdel riel\b|\bal riel\b/i) // the EPN guide says "la riel"
    }
    expect(strings.es.presets.lowEnd).toBe('Extremo bajo')
    expect(strings.es.presets.caliper).toBe('Pie de rey')
    expect(strings.es.tools.caliper).toBe('Pie de rey')
    expect(strings.es.parts.cart.name).toBe('DigiCart')
    expect(strings.es.resetCart).toContain('DigiCart')
    expect(Object.keys(strings.es.presets)).toEqual(['overview', 'highEnd', 'lowEnd', 'lateral', 'mark', 'caliper'])
    expect('release' in strings.es).toBe(false) // release lives in the shell's timing bar
  })
})
