import { describe, expect, it } from 'vitest'
import { createExperimentStore, experimentKey, LANG_KEY, LAST_KEY, LEGACY_SHARED_KEYS, migrateKeys, THEME_KEY, type StorageLike } from '../../src/core/persist.ts'
import { LEGACY_KEYS } from '../../src/experiments/mruv/persist.ts'

class FakeStorage implements StorageLike {
  readonly data = new Map<string, string>()
  getItem(k: string): string | null { return this.data.get(k) ?? null }
  setItem(k: string, v: string): void { this.data.set(k, v) }
  removeItem(k: string): void { this.data.delete(k) }
}

describe('storage keys', () => {
  it('shared keys and per-experiment keys follow mecanica:*', () => {
    expect(LANG_KEY).toBe('mecanica:lang')
    expect(THEME_KEY).toBe('mecanica:theme')
    expect(LAST_KEY).toBe('mecanica:last')
    expect(experimentKey('mruv', 'state')).toBe('mecanica:mruv:state')
    expect(createExperimentStore('mruv').key('tour-done')).toBe('mecanica:mruv:tour-done')
  })
})

describe('migration from the single-experiment keys', () => {
  it('copies every old value to its new key and leaves the old keys in place', () => {
    const s = new FakeStorage()
    const old: Record<string, string> = {
      'digicart-mruv-state': '{"version":1}', 'digicart-mruv-theme': 'dark', 'digicart-mruv-view': '2d', 'digicart-mruv-step': '3',
      'digicart-mruv-automark': '0', 'digicart-lang': 'en', 'digicart-mruv-tour-done': '1',
    }
    for (const [k, v] of Object.entries(old)) s.setItem(k, v)
    const copied = migrateKeys(LEGACY_KEYS, s)
    expect(copied).toHaveLength(7)
    expect(s.getItem('mecanica:mruv:state')).toBe('{"version":1}')
    expect(s.getItem('mecanica:theme')).toBe('dark')
    expect(s.getItem('mecanica:mruv:view')).toBe('2d')
    expect(s.getItem('mecanica:mruv:step')).toBe('3')
    expect(s.getItem('mecanica:mruv:automark')).toBe('0')
    expect(s.getItem('mecanica:lang')).toBe('en')
    expect(s.getItem('mecanica:mruv:tour-done')).toBe('1')
    for (const [k, v] of Object.entries(old)) expect(s.getItem(k)).toBe(v)
  })

  it('does not overwrite a new key that is already set, and skips absent old keys', () => {
    const s = new FakeStorage()
    s.setItem('mecanica:lang', 'es')
    s.setItem('digicart-lang', 'en')
    s.setItem('digicart-mruv-step', '2')
    const copied = migrateKeys(LEGACY_KEYS, s)
    expect(copied).toEqual(['mecanica:mruv:step'])
    expect(s.getItem('mecanica:lang')).toBe('es')
    expect(s.getItem('mecanica:mruv:state')).toBeNull()
  })

  it('is idempotent and survives a storage that throws', () => {
    const s = new FakeStorage()
    s.setItem('digicart-mruv-theme', 'light')
    expect(migrateKeys(LEGACY_SHARED_KEYS, s)).toEqual([THEME_KEY])
    expect(migrateKeys(LEGACY_SHARED_KEYS, s)).toEqual([])
    const broken: StorageLike = { getItem() { throw new Error('blocked') }, setItem() { throw new Error('blocked') }, removeItem() { throw new Error('blocked') } }
    expect(migrateKeys(LEGACY_KEYS, broken)).toEqual([])
    expect(migrateKeys(LEGACY_KEYS, null)).toEqual([])
  })

  it('covers every key the single-experiment app used', () => {
    expect(new Set(Object.values(LEGACY_KEYS))).toEqual(new Set([
      'digicart-mruv-state', 'digicart-mruv-theme', 'digicart-mruv-view', 'digicart-mruv-step', 'digicart-mruv-automark',
      'digicart-lang', 'digicart-mruv-tour-done',
    ]))
  })
})
