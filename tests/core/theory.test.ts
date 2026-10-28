import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createExperimentStore } from '../../src/core/persist.ts'
import { createTaskTracker, helpHref, isTheoryUnlocked, taskCompletion, theoryOverride } from '../../src/core/theory.ts'
import { strings as panelStrings } from '../../src/core/views/taskPanelStrings.ts'
import { strings as coreShell } from '../../src/core/shell/strings.ts'

const helpSources = import.meta.glob('../../{mruv,parabolico,segunda-ley,rozamiento}/help/*.html', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

function fakeStorage(): Storage {
  const m = new Map<string, string>()
  return {
    getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v) }, removeItem: (k: string) => { m.delete(k) },
    clear: () => m.clear(), key: () => null, get length() { return m.size },
  } as Storage
}

describe('taskCompletion', () => {
  const specs = [{ id: 'a' }, { id: 'b', needs: ['x'] }, { id: 'c', needs: ['x', 'y'] }]
  it('needs every tick', () => {
    const c = taskCompletion(specs, new Set(['a', 'b']), { x: true, y: true })
    expect(c).toMatchObject({ done: 2, total: 3, complete: false })
  })
  it('a ticked task without its data is not done and says so', () => {
    const c = taskCompletion(specs, new Set(['a', 'b', 'c']), { x: true, y: false })
    expect(c.complete).toBe(false)
    expect(c.tasks.find((t) => t.id === 'c')).toMatchObject({ ticked: true, dataMissing: true, done: false })
  })
  it('complete when all are ticked and the data exist; data alone is not enough', () => {
    expect(taskCompletion(specs, new Set(['a', 'b', 'c']), { x: true, y: true }).complete).toBe(true)
    expect(taskCompletion(specs, new Set(), { x: true, y: true }).done).toBe(0)
  })
  it('an empty task list is never complete', () => {
    expect(taskCompletion([], new Set(), {}).complete).toBe(false)
  })
})

describe('override and links', () => {
  it('?theory=1 opens, 0 or empty does not', () => {
    expect(theoryOverride('?theory=1')).toBe(true)
    expect(theoryOverride('?lang=en&theory=1')).toBe(true)
    expect(theoryOverride('?theory=0')).toBe(false)
    expect(theoryOverride('?theory=')).toBe(false)
    expect(theoryOverride('')).toBe(false)
  })
  it('the override is added before the anchor', () => {
    expect(helpHref('help/index.html#teoria', true)).toBe('help/index.html?theory=1#teoria')
    expect(helpHref('help/en.html', true)).toBe('help/en.html?theory=1')
    expect(helpHref('help/en.html#theory', false)).toBe('help/en.html#theory')
  })
})

describe('task tracker', () => {
  beforeEach(() => { vi.stubGlobal('localStorage', fakeStorage()) })
  afterEach(() => { vi.unstubAllGlobals() })
  it('persists ticks and the unlock flag under mecanica:<id>:...', () => {
    const t = createTaskTracker(createExperimentStore('demo'))
    t.set('t1', true); t.setUnlocked(true)
    expect(localStorage.getItem('mecanica:demo:tasks')).toBe('["t1"]')
    expect(localStorage.getItem('mecanica:demo:theoryUnlocked')).toBe('1')
    expect(createTaskTracker(createExperimentStore('demo')).has('t1')).toBe(true)
    expect(isTheoryUnlocked('demo', '')).toBe(true)
    expect(isTheoryUnlocked('other', '')).toBe(false)
    expect(isTheoryUnlocked('other', '?theory=1')).toBe(true)
    expect(localStorage.getItem('mecanica:other:theoryUnlocked')).toBeNull() // the override never stores
  })
  it('start over clears ticks and re-locks, and notifies', () => {
    const t = createTaskTracker(createExperimentStore('demo'))
    const fn = vi.fn()
    t.onChange(fn)
    t.set('t1', true); t.setUnlocked(true)
    fn.mockClear()
    t.clear()
    expect(t.has('t1')).toBe(false)
    expect(t.unlocked()).toBe(false)
    expect(localStorage.getItem('mecanica:demo:tasks')).toBeNull()
    expect(fn).toHaveBeenCalled()
  })
})

describe('strings and help pages', () => {
  it('es and en keys match and are not empty', () => {
    expect(Object.keys(panelStrings.es).sort()).toEqual(Object.keys(panelStrings.en).sort())
    for (const l of ['es', 'en'] as const) for (const v of Object.values(panelStrings[l])) expect(v.length).toBeGreaterThan(0)
    expect(coreShell.es.theoryUnlocked).not.toBe('')
    expect(coreShell.en.theoryUnlocked).not.toBe('')
  })
  it('every help page names its experiment, locks its theory with a notice, and keeps the practical sections open', () => {
    const files = Object.entries(helpSources)
    expect(files.length).toBe(8)
    for (const [file, html] of files) {
      expect(html, file).toMatch(/<body data-experiment="(mruv|parabolic|newton2|friction)">/)
      const locked = [...html.matchAll(/<section id="([^"]+)" data-locked="theory" hidden>/g)].map((m) => m[1]!)
      expect(locked.length, file).toBeGreaterThanOrEqual(2)
      expect(locked[0], file).toMatch(/^(teoria|theory)$/)
      for (const id of locked) expect(html, `${file} toc ${id}`).toContain(`<a href="#${id}" data-locked="theory" hidden>`)
      expect(html, file).toContain('data-theory-notice')
      expect(html, file).toContain('?theory=1')
      for (const open of ['uso', 'use', 'incertidumbre', 'uncertainty', 'teclas', 'keys', 'accesibilidad', 'accessibility', 'creditos', 'credits']) {
        expect(html, `${file} ${open}`).not.toContain(`<section id="${open}" data-locked`)
      }
    }
  })
})
