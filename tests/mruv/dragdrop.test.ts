import { describe, expect, it } from 'vitest'
import { Apparatus, type ItemId } from '../../src/experiments/mruv/apparatus/index.ts'
import {
  benchDraggable, defaultTarget, distanceToZone, jointOfPart, resolveDrop, zonesFor, SNAP_CM, type Probe, type Zone,
} from '../../src/experiments/mruv/views/dragdrop/snap.ts'
import { executeDrop } from '../../src/experiments/mruv/views/dragdrop/drop.ts'

const mk = (preset: 'assembled' | 'empty' | 'loose' = 'empty'): Apparatus => {
  const a = new Apparatus({ seed: 1 })
  a.preset(preset)
  return a
}
const zones = (a: Apparatus, part: ItemId): Zone[] => zonesFor(part, a.getState(), a.railPoseNow())
const zone = (zs: Zone[], id: string): Zone => zs.find((z) => z.id === id)!
/** A probe that puts the pointer at (x, z) on every plane. */
const at = (x_cm: number, z_cm: number | null): Probe => () => ({ x_cm, z_cm })

describe('snap zones', () => {
  it('every part can be dropped on the table', () => {
    const a = mk()
    for (const id of ['rail', 'cart', 'rackStand', 'level', 'stopwatch'] as ItemId[]) expect(zones(a, id).some((z) => z.id === 'table')).toBe(true)
  })
  it('offers the joints that belong to the part and no others', () => {
    const a = mk()
    expect(zones(a, 'standBase').map((z) => z.id).sort()).toEqual(['stand', 'table'])
    expect(zones(a, 'rail').map((z) => z.id).sort()).toEqual(['clampE1', 'clampE2', 'table'])
    expect(zones(a, 'twoLegStand').map((z) => z.id).sort()).toEqual(['table', 'twoLeg'])
    expect(zones(a, 'stopwatch').map((z) => z.id)).toEqual(['table'])
  })
  it('a drop inside the snap radius picks the zone, outside it falls back to the table or nothing', () => {
    const a = mk()
    const zs = zones(a, 'standBase')
    const st = zone(zs, 'stand')
    const near = resolveDrop(zs, at(st.cx + SNAP_CM - 1, st.cz))
    expect(near?.kind === 'zone' && near.zone.id).toBe('stand')
    const far = resolveDrop(zs, at(st.cx + SNAP_CM + 20, 20))
    expect(far?.kind === 'zone' && far.zone.id).toBe('table')
    expect(resolveDrop(zs, at(900, 0))).toBeNull()
  })
  it('chooses the nearest of two zones', () => {
    const a = mk()
    const zs = zones(a, 'rail')
    const e1 = zone(zs, 'clampE1'), e2 = zone(zs, 'clampE2')
    expect(e1.cx).toBeGreaterThan(e2.cx)
    const t = resolveDrop(zs, at(e1.cx - 2, 0))
    expect(t?.kind === 'zone' && t.zone.id).toBe('clampE1')
  })
  it('asks the probe for the plane height of each zone', () => {
    const a = mk()
    const zs = zones(a, 'rail')
    const seen = new Set<number>()
    resolveDrop(zs, (z) => { seen.add(z.cy); return { x_cm: 0, z_cm: 0 } })
    expect(seen.has(0)).toBe(true)
    expect(seen.size).toBeGreaterThan(1)
  })
  it('side view ignores depth (z null)', () => {
    const a = mk()
    const st = zone(zones(a, 'standBase'), 'stand')
    expect(distanceToZone(st, { x_cm: st.cx, z_cm: null })).toBe(0)
    expect(distanceToZone(st, { x_cm: st.cx, z_cm: 999 })).toBeGreaterThan(SNAP_CM)
  })
  it('marks readiness from the ghosts: the clamp is ready only after the stand is on its base', () => {
    const a = mk()
    a.addItem('rail'); a.addItem('rackStand'); a.addItem('standBase')
    expect(zone(zones(a, 'rail'), 'clampE1').ready).toBe(false)
    a.attach('standBase')
    expect(zone(zones(a, 'rail'), 'clampE1').ready).toBe(true)
  })
  it('maps a drop on the rail to a printed position the apparatus accepts', () => {
    const a = mk('assembled')
    a.removeItem('cart')
    const zs = zones(a, 'cart')
    const band = zone(zs, 'railCart')
    const t = resolveDrop(zs, at(band.rail!.highX_cm + 50, band.cz))
    expect(t?.kind === 'zone' && t.railPos_mm).not.toBeNull()
    expect(executeDrop(a, 'cart', 'tray', t!).ok).toBe(true)
    expect(a.getState().cart.placed).toBe(true)
  })
  it('default targets (keyboard) are accepted by the apparatus', () => {
    const a = mk('assembled')
    a.removeItem('cart')
    const t = defaultTarget(zone(zones(a, 'cart'), 'railCart'), a.getState(), a.evaluateMarks().aRailPos_mm)
    expect(executeDrop(a, 'cart', 'tray', t).ok).toBe(true)
  })
  it('knows which parts can be lifted again', () => {
    const a = mk('assembled')
    expect(benchDraggable('cart', a.getState())).toBe(true)
    expect(benchDraggable('rail', a.getState())).toBe(false)
    expect(benchDraggable('stopwatch', a.getState())).toBe(true)
    expect(jointOfPart('receiver', a.getState())).toBe('receiver')
    expect(jointOfPart('stopwatch', a.getState())).toBeNull()
  })
})

describe('executeDrop calls the apparatus and keeps its refusals', () => {
  const drop = (a: Apparatus, part: ItemId, id: string, src: 'tray' | 'bench' = 'tray') => {
    const zs = zones(a, part)
    return executeDrop(a, part, src, defaultTarget(zone(zs, id), a.getState(), null))
  }
  it('table drop puts the item on the table (addItem)', () => {
    const a = mk()
    expect(drop(a, 'stopwatch', 'table').ok).toBe(true)
    expect(a.hasItem('stopwatch')).toBe(true)
  })
  it('wrong order is attempted, refused with the apparatus reason, and the part goes back to the tray', () => {
    const a = mk()
    const r = drop(a, 'standBase', 'stand')
    expect(r).toMatchObject({ ok: false, reason: 'itemNotOnTable', item: 'rackStand' })
    expect(a.hasItem('standBase')).toBe(false)
  })
  it('builds the track in the right order', () => {
    const a = mk()
    for (const p of ['rackStand', 'standBase'] as ItemId[]) a.addItem(p)
    expect(drop(a, 'standBase', 'stand', 'bench').ok).toBe(true)
    expect(a.getState().joints.standBase).toBe(true)
    a.addItem('screws')
    expect(drop(a, 'rail', 'clampE1').ok).toBe(true)
    expect(a.getState().joints.rackClamp).toBe('E1')
    expect(drop(a, 'twoLegStand', 'twoLeg').ok).toBe(true)
    expect(drop(a, 'receiver', 'receiver').ok).toBe(true)
  })
  it('without screws the joint is refused by the apparatus and the rail is taken back off', () => {
    const a = mk()
    for (const p of ['rackStand', 'standBase'] as ItemId[]) a.addItem(p)
    a.attach('standBase')
    expect(drop(a, 'rail', 'clampE1')).toMatchObject({ ok: false, reason: 'itemNotOnTable', item: 'screws' })
    expect(a.hasItem('rail')).toBe(false)
  })
  it('moves the rail from one end to the other (detach then attach)', () => {
    const a = mk('assembled')
    expect(a.getState().joints.rackClamp).toBe('E1')
    expect(drop(a, 'rail', 'clampE2', 'bench').ok).toBe(true)
    expect(a.getState().joints.rackClamp).toBe('E2')
  })
  it('dropping an attached part on the table detaches it; dropping on the tray removes it', () => {
    const a = mk('assembled')
    expect(drop(a, 'receiver', 'table', 'bench').ok).toBe(true)
    expect(a.getState().joints.receiver).toBe(false)
    expect(a.hasItem('receiver')).toBe(true)
    expect(executeDrop(a, 'receiver', 'bench', { kind: 'tray' })).toMatchObject({ ok: true, removed: true })
    expect(a.hasItem('receiver')).toBe(false)
  })
  it('screws in use cannot go back to the box', () => {
    const a = mk('assembled')
    expect(executeDrop(a, 'screws', 'bench', { kind: 'tray' })).toMatchObject({ ok: false, reason: 'screwsInUse' })
  })
  it('level and marker drops use placeLevel and placeMarker', () => {
    const a = mk('assembled')
    a.removeItem('level')
    expect(drop(a, 'level', 'tableLevel').ok).toBe(true)
    expect(a.getState().level.placement).toBe('table')
    const before = a.getState().markers.length
    a.removeItem('markers')
    expect(drop(a, 'markers', 'railMark').ok).toBe(true)
    expect(a.getState().markers.length).toBe(before + 1)
  })
})

describe('fresh lab: every material lies loose on the table', () => {
  it('loose preset: all items on the table, no joints, cart off the rail, no marks, level not placed', () => {
    const a = mk('loose')
    const s = a.getState()
    expect(Object.values(s.items).every(Boolean)).toBe(true)
    expect(s.joints).toEqual({ standBase: false, rackClamp: null, twoLegStand: false, receiver: false })
    expect(s.cart.placed).toBe(false)
    expect(s.markers).toHaveLength(0)
    expect(s.level.placement).toBeNull()
    expect(s.geometry).toBeNull()
  })
  it('presets empty and assembled are unchanged', () => {
    const e = mk('empty')
    expect(Object.values(e.getState().items).some(Boolean)).toBe(false)
    const a = mk('assembled')
    expect(a.getState().joints.rackClamp).toBe('E1')
    expect(a.getState().cart.placed).toBe(true)
  })
  it('start over (preset loose again) returns to the loose bench', () => {
    const a = mk('assembled')
    a.preset('loose')
    expect(a.getState().joints.standBase).toBe(false)
    expect(a.getState().cart.placed).toBe(false)
    expect(Object.values(a.getState().items).every(Boolean)).toBe(true)
  })
  it('dragging bench parts to their zones assembles the track (the stand, the rail, the low end, the cart)', () => {
    const a = mk('loose')
    const go = (part: ItemId, id: string) => executeDrop(a, part, 'bench', defaultTarget(zone(zones(a, part), id), a.getState(), a.evaluateMarks().aRailPos_mm))
    expect(go('standBase', 'stand').ok).toBe(true)
    expect(a.getState().joints.standBase).toBe(true)
    expect(go('rail', 'clampE1').ok).toBe(true)
    expect(a.getState().joints.rackClamp).toBe('E1')
    expect(go('twoLegStand', 'twoLeg').ok).toBe(true)
    expect(go('receiver', 'receiver').ok).toBe(true)
    expect(go('level', 'railLevel').ok).toBe(true)
    expect(go('cart', 'railCart').ok).toBe(true)
    expect(a.getState().cart.placed).toBe(true)
  })
  it('a part taken to the tray and dragged back works from the tray', () => {
    const a = mk('loose')
    expect(executeDrop(a, 'stopwatch', 'bench', { kind: 'tray' })).toMatchObject({ ok: true, removed: true })
    expect(a.hasItem('stopwatch')).toBe(false)
    expect(executeDrop(a, 'stopwatch', 'tray', defaultTarget(zone(zones(a, 'stopwatch'), 'table'), a.getState(), null)).ok).toBe(true)
    expect(a.hasItem('stopwatch')).toBe(true)
  })
})
