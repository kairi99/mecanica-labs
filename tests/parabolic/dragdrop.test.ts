import { describe, expect, it } from 'vitest'
import { ITEM_IDS, ParabolicApparatus, type ItemId, type PresetId } from '../../src/experiments/parabolic/apparatus/index.ts'
import {
  benchDraggable, defaultTarget, jointOfPart, resolveDrop, zonesFor, SNAP_CM, type Probe, type Target, type Zone,
} from '../../src/experiments/parabolic/views/dragdrop/snap.ts'
import { executeDrop } from '../../src/experiments/parabolic/views/dragdrop/drop.ts'
import { strings as ddStrings } from '../../src/experiments/parabolic/views/strings/dragdrop.ts'

const mk = (preset: PresetId = 'empty'): ParabolicApparatus => {
  const a = new ParabolicApparatus({ seed: 1 })
  a.preset(preset)
  return a
}
const zones = (a: ParabolicApparatus, part: ItemId): Zone[] => zonesFor(part, a.getState())
const zone = (zs: Zone[], id: string): Zone => zs.find((z) => z.id === id)!
const at = (x_cm: number, z_cm: number | null): Probe => () => ({ x_cm, z_cm })
/** Drop on a zone the way the keyboard / zone buttons do. */
const toZone = (a: ParabolicApparatus, part: ItemId, id: string) => defaultTarget(zone(zones(a, part), id), a.getState(), part)
const drop = (a: ParabolicApparatus, part: ItemId, id: string, source: 'tray' | 'bench' = 'bench') => executeDrop(a, part, source, toZone(a, part, id))

describe('snap zones', () => {
  it('every part can be dropped on the table', () => {
    const a = mk()
    for (const id of ITEM_IDS) expect(zones(a, id).some((z) => z.id === 'table')).toBe(true)
  })
  it('offers the placements that belong to the part and no others', () => {
    const a = mk()
    expect(zones(a, 'base').map((z) => z.id).sort()).toEqual(['stand', 'table'])
    expect(zones(a, 'rackStand').map((z) => z.id).sort()).toEqual(['clamp', 'stand', 'table'])
    expect(zones(a, 'rail').map((z) => z.id).sort()).toEqual(['clamp', 'table'])
    expect(zones(a, 'twoLeg').map((z) => z.id).sort()).toEqual(['table', 'twoLeg'])
    expect(zones(a, 'level').map((z) => z.id).sort()).toEqual(['railLevel', 'table', 'tableLevel'])
    expect(zones(a, 'marble').map((z) => z.id).sort()).toEqual(['railBall', 'table'])
    expect(zones(a, 'bondPaper').map((z) => z.id).sort()).toEqual(['floor', 'table'])
    expect(zones(a, 'stopwatch').map((z) => z.id)).toEqual(['table'])
  })
  it('the paper zone is on the floor, below the table', () => {
    const a = mk('loose')
    const f = zone(zones(a, 'bondPaper'), 'floor')
    expect(f.cy).toBeLessThan(-60)
  })
  it('a drop inside the snap radius picks the zone, outside it falls back to the table or nothing', () => {
    const a = mk('loose')
    const zs = zones(a, 'base')
    const st = zone(zs, 'stand')
    const near = resolveDrop(zs, at(st.cx + SNAP_CM - 1, st.cz))
    expect(near?.kind === 'zone' && near.zone.id).toBe('stand')
    const far = resolveDrop(zs, at(st.cx + SNAP_CM + 30, 20))
    expect(far?.kind === 'zone' && far.zone.id).toBe('table')
    expect(resolveDrop(zs, at(900, 0))).toBeNull()
  })
  it('readiness follows the Apparatus rules: the clamp needs the stand on its base and the screws', () => {
    const a = mk('loose')
    expect(zone(zones(a, 'rail'), 'clamp').ready).toBe(false)
    a.attach('standBase')
    expect(zone(zones(a, 'rail'), 'clamp').ready).toBe(true)
    expect(zone(zones(a, 'twoLeg'), 'twoLeg').ready).toBe(false)
    a.attach('rackClamp')
    expect(zone(zones(a, 'twoLeg'), 'twoLeg').ready).toBe(true)
    expect(zone(zones(a, 'marble'), 'railBall').ready).toBe(true)
    expect(zone(zones(mk('loose'), 'carbonPaper'), 'floor').ready).toBe(false)
  })
  it('maps a drop on the rail to a position the Apparatus accepts', () => {
    const a = mk('assembled')
    const zs = zones(a, 'level')
    const rl = zone(zs, 'railLevel')
    const t = resolveDrop(zs, at(rl.cx, rl.cz))
    expect(t?.kind === 'zone' && t.zone.id).toBe('railLevel')
    const b = zone(zones(a, 'marble'), 'railBall')
    const tb = resolveDrop(zones(a, 'marble'), at(b.cx, b.cz))
    expect(tb?.kind === 'zone' && tb.s_m).toBeGreaterThan(0.4)
    expect(tb?.kind === 'zone' && tb.s_m).toBeLessThan(0.8)
  })
  it('default targets (keyboard) are accepted by the Apparatus in the right order', () => {
    const a = mk('loose')
    for (const [part, id] of [['base', 'stand'], ['rail', 'clamp'], ['twoLeg', 'twoLeg'], ['level', 'railLevel'], ['bondPaper', 'floor'], ['carbonPaper', 'floor']] as const) {
      expect(drop(a, part, id).ok).toBe(true)
    }
  })
  it('knows which parts can be lifted again', () => {
    const a = mk('assembled')
    expect(benchDraggable('rail', a.getState())).toBe(false)
    expect(benchDraggable('level', a.getState())).toBe(true)
    expect(jointOfPart('twoLeg', a.getState())).toBe('twoLegStand')
    expect(jointOfPart('rackStand', a.getState())).toBe('rackClamp')
    expect(jointOfPart('stopwatch', a.getState())).toBeNull()
  })
})

describe('executeDrop calls the Apparatus and keeps its refusals', () => {
  it('wrong order is refused with the Apparatus reason and the part goes back to the tray', () => {
    const a = mk('loose')
    a.removeItem('rail')
    const r = drop(a, 'rail', 'clamp', 'tray')
    expect(r.ok).toBe(false)
    expect(a.hasItem('rail')).toBe(false)
    const r2 = drop(a, 'rail', 'clamp')
    expect(r2.ok).toBe(false)
    expect(a.getState().joints.rackClamp).toBe(false)
  })
  it('a part from the tray is put on the table first', () => {
    const a = mk('loose')
    a.removeItem('level')
    const r = drop(a, 'level', 'tableLevel', 'tray')
    expect(r.ok).toBe(true)
    expect(a.hasItem('level')).toBe(true)
    expect(a.getState().level.placement).toBe('table')
  })
  it('dropping an attached part on the table detaches it; dropping on the tray removes it', () => {
    const a = mk('assembled')
    const table = (part: ItemId): Target => defaultTarget(zone(zones(a, part), 'table'), a.getState(), part)
    expect(executeDrop(a, 'twoLeg', 'bench', table('twoLeg')).ok).toBe(true)
    expect(a.getState().joints.twoLegStand).toBe(false)
    expect(executeDrop(a, 'level', 'bench', table('level')).ok).toBe(true)
    expect(a.getState().level.placement).toBeNull()
    expect(executeDrop(a, 'stopwatch', 'bench', { kind: 'tray' })).toMatchObject({ ok: true, removed: true })
    expect(a.hasItem('stopwatch')).toBe(false)
  })
  it('screws in use cannot go back to the tray', () => {
    const a = mk('assembled')
    const r = executeDrop(a, 'screws', 'bench', { kind: 'tray' })
    expect(r.ok).toBe(false)
  })
  it('papers: bond first, carbon over it; lifting them back to the table removes them from the floor', () => {
    const a = mk('loose')
    expect(drop(a, 'carbonPaper', 'floor').ok).toBe(false)
    expect(drop(a, 'bondPaper', 'floor').ok).toBe(true)
    expect(a.getState().paper.bond).not.toBeNull()
    expect(drop(a, 'carbonPaper', 'floor').ok).toBe(true)
    expect(a.procedure().carbonOverBond).toBe(true)
    const t = defaultTarget(zone(zones(a, 'bondPaper'), 'table'), a.getState(), 'bondPaper')
    expect(executeDrop(a, 'bondPaper', 'bench', t).ok).toBe(true)
    expect(a.getState().paper.bond).toBeNull()
  })
  it('a ball dropped on the rail is selected and placed (on the mark, when there is one)', () => {
    const a = mk('assembled')
    a.selectBall('pingpong')
    const r = drop(a, 'marble', 'railBall')
    expect(r.ok).toBe(true)
    expect(a.getState().ball).toMatchObject({ selected: 'marble', placed: true })
    expect(a.getState().ball.markId).not.toBeNull()
    const loose = mk('loose')
    expect(drop(loose, 'marble', 'railBall').ok).toBe(false)
  })
})

describe('fresh lab: every material lies loose on the table', () => {
  it('loose preset: all items on the table, no joints, nothing placed', () => {
    const a = mk('loose')
    const s = a.getState()
    for (const id of ITEM_IDS) expect(s.items[id]).toBe(true)
    expect(Object.values(s.joints).every((v) => v === false)).toBe(true)
    expect(s.geometry).toBeNull()
    expect(s.marks).toHaveLength(0)
    expect(s.paper.bond).toBeNull()
    expect(s.paper.carbon).toBeNull()
    expect(s.level.placement).toBeNull()
    expect(s.ball.placed).toBe(false)
    expect(s.ball.selected).toBeNull()
    expect(s.edgeProjection).toBe(false)
    expect(a.getRuns()).toHaveLength(0)
  })
  it('presets empty and assembled are unchanged', () => {
    const e = mk('empty').getState()
    expect(ITEM_IDS.every((i) => !e.items[i])).toBe(true)
    const as = mk('assembled')
    expect(as.missing()).toHaveLength(0)
    expect(as.canRelease().ok).toBe(true)
  })
  it('start over (preset loose again) returns to the loose bench', () => {
    const a = mk('assembled')
    a.preset('loose')
    const s = a.getState()
    expect(ITEM_IDS.every((i) => s.items[i])).toBe(true)
    expect(s.geometry).toBeNull()
    expect(s.paper.bond).toBeNull()
  })
  it('dragging bench parts to their zones assembles the full setup', () => {
    const a = mk('loose')
    expect(drop(a, 'base', 'stand').ok).toBe(true)
    expect(drop(a, 'rail', 'clamp').ok).toBe(true)
    expect(drop(a, 'twoLeg', 'twoLeg').ok).toBe(true)
    expect(drop(a, 'level', 'railLevel').ok).toBe(true)
    expect(drop(a, 'bondPaper', 'floor').ok).toBe(true)
    expect(drop(a, 'carbonPaper', 'floor').ok).toBe(true)
    const s = a.getState()
    expect(s.joints).toEqual({ standBase: true, rackClamp: true, twoLegStand: true })
    expect(s.level.placement).toBe('rail')
    expect(a.procedure().setupComplete).toBe(true)
    expect(a.procedure().carbonOverBond).toBe(true)
  })
})

describe('strings', () => {
  it('es and en name the same zones', () => {
    expect(Object.keys(ddStrings.es.zones).sort()).toEqual(Object.keys(ddStrings.en.zones).sort())
    expect(ddStrings.es.inventoryIntro.length).toBeGreaterThan(10)
  })
})
