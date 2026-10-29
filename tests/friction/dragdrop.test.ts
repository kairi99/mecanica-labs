import { describe, expect, it } from 'vitest'
import { ITEM_IDS, createApparatus, type ItemId } from '../../src/experiments/friction/apparatus/index.ts'
import { PART_IDS, isPlaced, zonesFor, type Area, type PartId, type Zone } from '../../src/experiments/friction/views/dragdrop/snap.ts'
import { executeDrop, type Target } from '../../src/experiments/friction/views/dragdrop/drop.ts'
import { BAR_ON_MARK, LOOSE, blockSpot } from '../../src/experiments/friction/views/dragdrop/layout.ts'
import { strings as ddStrings } from '../../src/experiments/friction/views/strings/dragdrop.ts'
import { strings as ddCore } from '../../src/core/dragdrop/strings.ts'
import { reasonText } from '../../src/experiments/friction/views/reasons.ts'

const DISTRACTORS: ItemId[] = ['masses10', 'marble']
const zone = (app: ReturnType<typeof createApparatus>, part: PartId, id: string, area: Area = 'all'): Zone => {
  const z = zonesFor(part, app.getState(), area).find((x) => x.id === id)
  if (!z) throw new Error(`no zone ${id} for ${part}`)
  return z
}
const onZone = (z: Zone): Target => ({ kind: 'zone', zone: z, dist_cm: 0 })

describe('loose preset', () => {
  it('lays every material on the table and places, hooks and stacks nothing', () => {
    const a = createApparatus('loose', { seed: 3 })
    const s = a.getState()
    for (const id of ITEM_IDS) expect(s.items[id], id).toBe(!DISTRACTORS.includes(id))
    expect(s.face).toBeNull()
    expect(s.scale).toBeNull()
    expect(s.addedMasses).toBe(0)
    expect(s.paper).toBe('none')
    expect(s.bar).toBeNull()
    expect(s.course_mark).toBe(false)
    expect(s.measuredBlock_kg).toBeNull()
    expect(a.getPullRuns()).toHaveLength(0)
    expect(a.getTrials()).toHaveLength(0)
    for (const p of PART_IDS) expect(isPlaced(p, s), p).toBe(false)
  })
  it('start over: applying it again after some work returns to the loose layout', () => {
    const a = createApparatus('exp12', { seed: 4 })
    a.pullStart(0, 0.05)
    a.pullEnd(1000)
    a.preset('loose')
    const s = a.getState()
    expect(s.face).toBeNull()
    expect(s.paper).toBe('none')
    expect(s.zeroed['1N']).toBe(false)
    expect(a.getPullRuns()).toHaveLength(0)
    expect(ITEM_IDS.filter((i) => s.items[i]).length).toBe(ITEM_IDS.length - 2)
  })
  it('the other presets are unchanged', () => {
    const empty = createApparatus('empty').getState()
    expect(ITEM_IDS.some((i) => empty.items[i])).toBe(false)
    const e12 = createApparatus('exp12', { seed: 1 }).getState()
    expect([e12.face, e12.scale, e12.paper]).toEqual(['cloth', '1N', 'fixed'])
    const e3 = createApparatus('exp3', { seed: 1 }).getState()
    expect([e3.bar, e3.course_mark]).toEqual(['wood', true])
    expect(createApparatus('loose').preset('nope' as never).ok).toBe(false)
  })
  it('the loose spots keep clear of each other and of the paper and rail', () => {
    const pts = [LOOSE.paper, LOOSE.block, LOOSE.scale1N, LOOSE.scale2N, { x: LOOSE.masses.x0, z: LOOSE.masses.z }, ...Object.values(LOOSE.bars)]
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) expect(Math.hypot(pts[i]!.x - pts[j]!.x, pts[i]!.z - pts[j]!.z)).toBeGreaterThan(8)
    expect(blockSpot({ face: null }).z).toBe(LOOSE.block.z)
    expect(blockSpot({ face: 'cloth' }).z).toBe(28)
  })
})

describe('zones', () => {
  const app = createApparatus('loose', { seed: 1 })
  const st = app.getState()
  it('every part has the table; the others only in the step that uses them', () => {
    for (const p of PART_IDS) {
      const all = zonesFor(p, st, 'all')
      expect(all.some((z) => z.id === 'table' && z.kind === 'area' && z.ready), p).toBe(true)
      expect(all.length, p).toBeGreaterThan(1)
    }
    expect(zonesFor('block', st, 'exp3').map((z) => z.id)).toEqual(['table'])
    expect(zonesFor('woodBar', st, 'exp12').map((z) => z.id)).toEqual(['table'])
    expect(zonesFor('block', st, 'exp12').map((z) => z.id)).toEqual(['table', 'faceCloth', 'faceSand'])
    expect(zonesFor('alBar', st, 'exp3').map((z) => z.id)).toEqual(['table', 'barStart'])
    expect(zonesFor('scale2N', st, 'exp12').map((z) => z.id)).toEqual(['table', 'hook'])
    expect(zonesFor('masses50', st, 'exp12').map((z) => z.id)).toEqual(['table', 'masses'])
    expect(zonesFor('paper', st, 'exp12').map((z) => z.id)).toEqual(['table', 'paper'])
  })
  it('the bar zone is not ready until the course is marked; the masses zone closes at three', () => {
    expect(zone(app, 'woodBar', 'barStart').ready).toBe(false)
    const b = createApparatus('exp3', { seed: 2 })
    expect(zone(b, 'woodBar', 'barStart').ready).toBe(true)
    expect(zone(b, 'woodBar', 'barStart').cx).toBeCloseTo(BAR_ON_MARK.x, 6)
    const c = createApparatus('loose', { seed: 2 })
    c.setAddedMasses(3)
    expect(zone(c, 'masses50', 'masses').ready).toBe(false)
  })
  it('the keyboard / button default of every zone is accepted by the Apparatus when its rules are met', () => {
    const a = createApparatus('exp3', { seed: 5 })
    for (const [part, id] of [['paper', 'paper'], ['block', 'faceSand'], ['scale1N', 'hook'], ['masses50', 'masses'], ['alBar', 'barStart']] as const) {
      const r = executeDrop(a, part, 'tray', onZone(zone(a, part, id)))
      expect(r.ok, `${part} -> ${id}`).toBe(true)
    }
  })
})

describe('executeDrop', () => {
  it('assembles experiments 1 and 2: paper fixed, block on it with the chosen face down, scale hooked, masses stacked', () => {
    const a = createApparatus('loose', { seed: 7 })
    expect(executeDrop(a, 'paper', 'bench', onZone(zone(a, 'paper', 'paper', 'exp12'))).ok).toBe(true)
    expect(executeDrop(a, 'block', 'bench', onZone(zone(a, 'block', 'faceSand', 'exp12'))).ok).toBe(true)
    expect(executeDrop(a, 'scale2N', 'bench', onZone(zone(a, 'scale2N', 'hook', 'exp12'))).ok).toBe(true)
    expect(executeDrop(a, 'masses50', 'bench', onZone(zone(a, 'masses50', 'masses', 'exp12'))).ok).toBe(true)
    expect(executeDrop(a, 'masses50', 'bench', onZone(zone(a, 'masses50', 'masses', 'exp12'))).ok).toBe(true)
    const s = a.getState()
    expect([s.paper, s.face, s.scale, s.addedMasses]).toEqual(['fixed', 'sandpaper', '2N', 2])
    expect(a.pullBlocks()).toEqual([]) // a pull can start
    // the other face
    expect(executeDrop(a, 'block', 'bench', onZone(zone(a, 'block', 'faceCloth', 'exp12'))).ok).toBe(true)
    expect(a.getState().face).toBe('cloth')
  })
  it('assembles experiment 3: the bar goes on the start mark once the course is marked', () => {
    const a = createApparatus('loose', { seed: 8 })
    const early = executeDrop(a, 'ironBar', 'bench', onZone(zone(a, 'ironBar', 'barStart', 'exp3')))
    expect(early).toMatchObject({ ok: false, reason: 'needCourse' })
    expect(a.getState().bar).toBeNull()
    expect(a.hasItem('ironBar')).toBe(true) // still lying on the table
    a.markCourse(1)
    expect(executeDrop(a, 'ironBar', 'bench', onZone(zone(a, 'ironBar', 'barStart', 'exp3'))).ok).toBe(true)
    expect(a.getState().bar).toBe('iron')
    // swapping the bar: the first one comes back to the table
    expect(executeDrop(a, 'woodBar', 'bench', onZone(zone(a, 'woodBar', 'barStart', 'exp3'))).ok).toBe(true)
    expect(a.getState().bar).toBe('wood')
    expect(a.raiseBlocks()).toEqual([])
  })
  it('from the tray the part is put on the table first and goes back if the zone refuses it', () => {
    const a = createApparatus('loose', { seed: 9 })
    a.removeItem('woodBar')
    expect(a.hasItem('woodBar')).toBe(false)
    const r = executeDrop(a, 'woodBar', 'tray', onZone(zone(a, 'woodBar', 'barStart', 'exp3')))
    expect(r.ok).toBe(false)
    expect(a.hasItem('woodBar')).toBe(false) // back in the tray
    a.markCourse(1)
    expect(executeDrop(a, 'woodBar', 'tray', onZone(zone(a, 'woodBar', 'barStart', 'exp3')))).toMatchObject({ ok: true, added: true })
    expect(a.getState().bar).toBe('wood')
  })
  it('a refusal has a reason text in both languages; masses beyond three are refused', () => {
    const a = createApparatus('loose', { seed: 10 })
    for (let i = 0; i < 3; i++) executeDrop(a, 'masses50', 'bench', onZone(zone(a, 'masses50', 'masses')))
    const r = executeDrop(a, 'masses50', 'bench', onZone(zone(a, 'masses50', 'masses')))
    expect(r).toMatchObject({ ok: false, reason: 'badMassCount' })
    expect(a.getState().addedMasses).toBe(3)
    if (!r.ok) for (const lang of ['es', 'en'] as const) expect(reasonText(lang, r.reason).length).toBeGreaterThan(5)
  })
  it('refuses while a pull runs (the part stays where it was)', () => {
    const a = createApparatus('exp12', { seed: 11 })
    a.pullStart(0, 0.05)
    const r = executeDrop(a, 'block', 'bench', onZone(zone(a, 'block', 'faceSand', 'exp12')))
    expect(r).toMatchObject({ ok: false, reason: 'pulling' })
    expect(a.getState().face).toBe('cloth')
  })
  it('lifting a placed part onto the table undoes it; onto the tray takes it off the table', () => {
    const a = createApparatus('exp12', { seed: 12 })
    const table = (p: PartId): Target => onZone(zone(a, p, 'table'))
    expect(executeDrop(a, 'paper', 'bench', table('paper')).ok).toBe(true)
    expect(a.getState().paper).toBe('none')
    expect(executeDrop(a, 'scale1N', 'bench', table('scale1N')).ok).toBe(true)
    expect(a.getState().scale).toBeNull()
    expect(a.hasItem('scale1N')).toBe(true)
    expect(executeDrop(a, 'block', 'bench', table('block')).ok).toBe(true)
    expect(a.getState().face).toBeNull()
    expect(a.hasItem('block')).toBe(true)
    expect(executeDrop(a, 'block', 'bench', { kind: 'tray' })).toMatchObject({ ok: true, removed: true })
    expect(a.hasItem('block')).toBe(false)
    expect(executeDrop(a, 'block', 'tray', { kind: 'tray' }).ok).toBe(true) // nothing to do
  })
  it('a drop of a non-part (tape, stopwatch...) does nothing', () => {
    const a = createApparatus('loose', { seed: 13 })
    expect(executeDrop(a, 'tape', 'bench', { kind: 'tray' }).ok).toBe(true)
    expect(a.hasItem('tape')).toBe(true)
  })
})

describe('strings', () => {
  it('zone names and the intro exist in both languages with the same keys', () => {
    expect(Object.keys(ddStrings.en.zones)).toEqual(Object.keys(ddStrings.es.zones))
    for (const lang of ['es', 'en'] as const) {
      for (const v of Object.values(ddStrings[lang].zones)) expect(v.length).toBeGreaterThan(3)
      expect(ddStrings[lang].inventoryIntro.length).toBeGreaterThan(20)
      expect(ddCore[lang].disclosure.length).toBeGreaterThan(3)
    }
  })
})
