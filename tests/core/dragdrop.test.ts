import { describe, expect, it } from 'vitest'
import { distanceToZone, nearestZone, resolveDrop, type Probe, type Zone } from '../../src/core/dragdrop/snap.ts'
import { strings } from '../../src/core/dragdrop/strings.ts'

const z = (id: string, o: Partial<Zone> = {}): Zone =>
  ({ id, kind: 'point', cx: 0, cy: 0, cz: 0, hx: 0, hz: 0, snap_cm: 10, priority: 2, ready: true, ...o })
const table = z('table', { kind: 'area', hx: 100, hz: 50, snap_cm: 0, priority: 0 })
/** A probe that puts the pointer at (x, z) on every plane. */
const at = (x_cm: number, z_cm: number | null): Probe => () => ({ x_cm, z_cm })

describe('core snap resolution', () => {
  it('a drop inside the snap radius picks the zone, outside it falls back to the area, off the area gives nothing', () => {
    const zs = [table, z('a', { cx: 20 })]
    expect(resolveDrop(zs, at(29, 0))?.zone.id).toBe('a')
    expect(resolveDrop(zs, at(35, 0))?.zone.id).toBe('table')
    expect(resolveDrop(zs, at(500, 0))).toBeNull()
  })
  it('chooses the nearest of two zones, and on a tie the higher priority', () => {
    const zs = [table, z('a', { cx: 0 }), z('b', { cx: 10, priority: 3 })]
    expect(resolveDrop(zs, at(7, 0))?.zone.id).toBe('b')
    expect(resolveDrop(zs, at(2, 0))?.zone.id).toBe('a')
    expect(resolveDrop(zs, at(5, 0))?.zone.id).toBe('b')
  })
  it('asks the probe for the plane of each zone (heights differ)', () => {
    const seen = new Set<number>()
    resolveDrop([table, z('hi', { cy: 30 })], (zone) => { seen.add(zone.cy); return { x_cm: 0, z_cm: 0 } })
    expect([...seen].sort()).toEqual([0, 30])
  })
  it('a probe that returns null for a zone skips it', () => {
    const zs = [table, z('a')]
    expect(resolveDrop(zs, (zone) => (zone.id === 'a' ? null : { x_cm: 0, z_cm: 0 }))?.zone.id).toBe('table')
    expect(resolveDrop(zs, () => null)).toBeNull()
  })
  it('side view ignores depth (z null); a box zone is 0 inside, widened by its snap radius', () => {
    const a = z('a', { cx: 10, hx: 5, hz: 2 })
    expect(distanceToZone(a, { x_cm: 10, z_cm: null })).toBe(0)
    expect(distanceToZone(a, { x_cm: 10, z_cm: 999 })).toBeGreaterThan(a.snap_cm)
    expect(distanceToZone(a, { x_cm: 20, z_cm: 0 })).toBe(5)
    expect(nearestZone([a], at(20, 0))?.dist_cm).toBe(5)
    expect(nearestZone([a], at(16, 0))?.point).toEqual({ x_cm: 16, z_cm: 0 })
  })
  it('keeps the extra fields of an experiment zone in the result', () => {
    const zs = [{ ...z('a'), action: 'attach' }]
    expect(resolveDrop(zs, at(0, 0))?.zone.action).toBe('attach')
  })
})

describe('core drag-drop strings', () => {
  it('es and en have the same keys, all non-empty', () => {
    expect(Object.keys(strings.es).sort()).toEqual(Object.keys(strings.en).sort())
    for (const l of ['es', 'en'] as const) for (const v of Object.values(strings[l])) expect(v.length).toBeGreaterThan(0)
  })
  it('placeholders match between languages', () => {
    for (const k of Object.keys(strings.es) as (keyof typeof strings.es)[]) expect(strings.es[k].includes('{x}')).toBe(strings.en[k].includes('{x}'))
  })
})
