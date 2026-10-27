import { describe, expect, it } from 'vitest'
import { experiments, findExperiment, readyExperiments } from '../../src/experiments/registry.ts'
import { strings as landingStrings } from '../../src/landing/strings.ts'
import { strings as coreShellStrings } from '../../src/core/shell/strings.ts'
import { orderedExperiments, redirectTarget } from '../../src/landing/order.ts'
import { readShellParams } from '../../src/core/shell/params.ts'
import { Stopwatch } from '../../src/core/instruments/stopwatch.ts'

describe('registry', () => {
  it('lists MRUV, the parabolic experiment and the force-acceleration experiment as ready', () => {
    expect(findExperiment('mruv')?.status).toBe('ready')
    expect(findExperiment('parabolic')?.status).toBe('ready')
    expect(findExperiment('newton2')?.status).toBe('ready')
    expect(readyExperiments().map((x) => x.id)).toEqual(['mruv', 'parabolic', 'newton2'])
  })

  it('has unique ids and slugs and well-formed manifests', () => {
    expect(new Set(experiments.map((x) => x.id)).size).toBe(experiments.length)
    expect(new Set(experiments.map((x) => x.slug)).size).toBe(experiments.length)
    for (const x of experiments) {
      expect(x.id).toMatch(/^[a-z][a-z0-9-]*$/)
      expect(x.page).toBe(`${x.slug}/index.html`)
      expect(x.help.es).toBe(`${x.slug}/help/index.html`)
      expect(x.help.en).toBe(`${x.slug}/help/en.html`)
      expect(x.guide).toMatch(/\d+/)
      for (const lang of ['es', 'en'] as const) {
        expect(x.title[lang].length).toBeGreaterThan(0)
        expect(x.summary[lang].length).toBeGreaterThan(0)
      }
    }
  })
})

describe('landing', () => {
  it('has the same string keys in Spanish and English, and no empty text', () => {
    expect(Object.keys(landingStrings.en)).toEqual(Object.keys(landingStrings.es))
    expect(Object.keys(landingStrings.en.themes)).toEqual(Object.keys(landingStrings.es.themes))
    expect(Object.keys(coreShellStrings.en)).toEqual(Object.keys(coreShellStrings.es))
    for (const lang of ['es', 'en'] as const) {
      for (const v of Object.values(landingStrings[lang])) {
        if (typeof v === 'string') expect(v.trim()).not.toBe('')
      }
    }
    expect(landingStrings.es.guide).toContain('{n}')
    expect(landingStrings.en.guide).toContain('{n}')
  })

  it('?exp= redirects to a ready experiment and keeps the other parameters and the hash', () => {
    expect(redirectTarget('?exp=mruv', '', experiments)).toBe('mruv/index.html')
    expect(redirectTarget('?tour=0&exp=mruv&preset=assembled&step=3', '#x', experiments)).toBe('mruv/index.html?tour=0&preset=assembled&step=3#x')
    expect(redirectTarget('?exp=parabolic&preset=assembled', '', experiments)).toBe('parabolico/index.html?preset=assembled')
    expect(redirectTarget('?exp=newton2', '', experiments)).toBe('segunda-ley/index.html')
    const later = { ...experiments[0]!, id: 'later', slug: 'later', page: 'later/index.html', status: 'soon' as const }
    expect(redirectTarget('?exp=later', '', [...experiments, later])).toBeNull()
    expect(redirectTarget('?exp=nope', '', experiments)).toBeNull()
    expect(redirectTarget('', '', experiments)).toBeNull()
  })

  it('shows the last opened ready experiment first and the coming-soon ones last', () => {
    expect(orderedExperiments(experiments, null).map((x) => x.id)).toEqual(['mruv', 'parabolic', 'newton2'])
    expect(orderedExperiments(experiments, 'parabolic').map((x) => x.id)).toEqual(['parabolic', 'mruv', 'newton2'])
    const extra = { ...experiments[0]!, id: 'other', slug: 'other', page: 'other/index.html' }
    expect(orderedExperiments([...experiments, extra], 'other').map((x) => x.id)).toEqual(['other', 'mruv', 'parabolic', 'newton2'])
    const later = { ...experiments[0]!, id: 'later', slug: 'later', page: 'later/index.html', status: 'soon' as const }
    expect(orderedExperiments([later, ...experiments], null).map((x) => x.id)).toEqual(['mruv', 'parabolic', 'newton2', 'later'])
  })
})

describe('shell params', () => {
  it('reads the shared URL options and ignores bad values', () => {
    expect(readShellParams('?step=3&theme=dark&tour=0&view=2d&teacher')).toEqual({ step: 3, theme: 'dark', tour: '0', view: '2d', teacher: true })
    expect(readShellParams('?step=0&theme=pink&tour=2&view=4d&teacher=0')).toEqual({ step: null, theme: null, tour: null, view: null, teacher: false })
    expect(readShellParams('')).toEqual({ step: null, theme: null, tour: null, view: null, teacher: false })
  })
})

describe('Stopwatch (shared instrument)', () => {
  it('floors the display to 0.01 s, logs a stop with its offsets and keeps the link across a reset', () => {
    const w = new Stopwatch<{ markId: string }>()
    w.setLinkStartToRelease(true)
    w.start(1000)
    expect(w.display_s(1000 + 1239)).toBe(1.23)
    const stop = w.stop(2500, { runId: 4, releaseTime_ms: 900, crossings: [{ markId: 'a' }] }, 2)
    expect(stop).toMatchObject({ id: 1, runId: 4, markTarget: 2, reading_s: 1.5, startOffset_s: 0.1, stopOffset_s: 1.6 })
    expect(w.lastStop()?.id).toBe(1)
    w.reset()
    expect(w.lastStop()).toBeUndefined()
    expect(w.linkStartToRelease).toBe(true)
    expect(w.stops()).toHaveLength(1)
    w.clear()
    expect(w.linkStartToRelease).toBe(false)
    expect(w.stops()).toHaveLength(0)
  })
})
