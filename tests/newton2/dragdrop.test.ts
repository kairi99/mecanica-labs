import { describe, expect, it } from 'vitest'
import { Apparatus, createApparatus, ITEM_IDS, type ItemId } from '../../src/experiments/newton2/apparatus/index.ts'
import { NOMINAL_PARTS, NO_VARIABILITY } from '../../src/experiments/newton2/physics/index.ts'
import {
  benchDraggable, defaultTarget, jointsOfPart, resolveDrop, spotsFor, zonesFor, MASS_PARTS, type PartId, type Probe, type Target, type Zone, type ZoneId,
} from '../../src/experiments/newton2/views/dragdrop/snap.ts'
import { executeDrop } from '../../src/experiments/newton2/views/dragdrop/drop.ts'
import { TRAY_ORDER } from '../../src/experiments/newton2/views/dragdrop/controller.ts'
import { strings as ddStrings } from '../../src/experiments/newton2/views/strings/dragdrop.ts'
import { strings as invStrings } from '../../src/experiments/newton2/views/strings/inventory.ts'
import { reasonText } from '../../src/experiments/newton2/views/reasons.ts'

const exact = { seed: 1, tableTilt_rad: 0, parts: NOMINAL_PARTS, variability: NO_VARIABILITY }
const zonesOf = (a: Apparatus, part: PartId): Zone[] => {
  const s = a.getState()
  const st = a.cartState(0)
  return zonesFor(part, s, spotsFor(s, { frontRailPos_mm: st.frontRailPos_mm, fall: st.fall }))
}
const targetOf = (a: Apparatus, part: PartId, id: ZoneId): Target => {
  const z = zonesOf(a, part).find((x) => x.id === id)
  if (!z) throw new Error(`no zone ${id} for ${part}`)
  return defaultTarget(z, a.getState())
}
const drop = (a: Apparatus, part: PartId, id: ZoneId, source: 'tray' | 'bench' = 'bench') => executeDrop(a, part, source, targetOf(a, part, id))

describe('the loose preset', () => {
  it('puts every material on the table, joins and places nothing, leaves the four masses on the bench', () => {
    const a = createApparatus('loose')
    const s = a.getState()
    for (const id of ITEM_IDS) expect(s.items[id], id).toBe(true)
    expect(s.joints).toEqual({ standBase: false, rackClamp: null, receiver: false, stringCart: false, stringCanister: false, stringPulley: false })
    expect(s.cart.placed).toBe(false)
    expect(s.level.placement).toBeNull()
    expect(s.masses).toEqual(['bench', 'bench', 'bench', 'bench'])
    expect(s.screwsUsed).toBe(0)
    expect(a.getRuns()).toHaveLength(0)
    expect(a.procedure()).toMatchObject({ itemsComplete: true, setupComplete: false, canRun: false, stringConnected: false })
    expect(a.missing().every((m) => m.kind === 'joint')).toBe(true)
  })
  it('"Start over" returns to it from any progress, and empty / assembled still work', () => {
    const a = createApparatus('assembled', exact)
    a.releaseCart(0)
    a.preset('loose')
    expect(a.getState().cart.placed).toBe(false)
    expect(a.getRuns()).toHaveLength(0)
    expect(a.getState().items.rail).toBe(true)
    expect(a.massLocations()).toEqual(['bench', 'bench', 'bench', 'bench'])
    a.preset('empty')
    expect(ITEM_IDS.some((i) => a.hasItem(i))).toBe(false)
    expect(a.massLocations()).toEqual(['canister', 'canister', 'canister', 'canister'])
    a.preset('assembled')
    expect(a.procedure()).toMatchObject({ setupComplete: true, canRun: true, massKept: true })
    expect(a.preset('nope' as never)).toMatchObject({ ok: false, reason: 'unknownPreset' })
  })
  it('a saved snapshot loads as before (loose or assembled)', () => {
    const a = createApparatus('assembled', exact)
    const b = new Apparatus(exact)
    expect(b.load(a.snapshot()).ok).toBe(true)
    expect(b.procedure().setupComplete).toBe(true)
  })
})

describe('zones', () => {
  it('every part has the table; the guide parts have their own spot and the Apparatus decides readiness', () => {
    const a = createApparatus('loose')
    for (const p of TRAY_ORDER) {
      const z = zonesOf(a, p)
      expect(z[0]!.id).toBe('table')
      expect(z[0]!.kind).toBe('area')
    }
    const ids = (p: PartId): ZoneId[] => zonesOf(a, p).map((z) => z.id)
    expect(ids('rackStand')).toContain('stand')
    expect(ids('standBase')).toContain('stand')
    expect(ids('rail')).toEqual(expect.arrayContaining(['clampE1', 'clampE2']))
    expect(ids('receiver')).toContain('receiver')
    expect(ids('cart')).toContain('railCart')
    expect(ids('brassScrew')).toContain('screwOnCart')
    expect(ids('string')).toContain('pulleyThread')
    expect(ids('canister')).toContain('canisterHook')
    expect(ids('mass2')).toEqual(expect.arrayContaining(['canisterMass', 'cartMass']))
    expect(ids('level')).toEqual(expect.arrayContaining(['railLevel', 'tableLevel']))
    // order matters: before the stand is on its base the rail zones are not ready, the stand zone is
    expect(zonesOf(a, 'rail').find((z) => z.id === 'clampE1')!.ready).toBe(false)
    expect(zonesOf(a, 'rackStand').find((z) => z.id === 'stand')!.ready).toBe(true)
    a.attach('standBase')
    expect(zonesOf(a, 'rail').find((z) => z.id === 'clampE1')!.ready).toBe(true)
    expect(zonesOf(a, 'cart').find((z) => z.id === 'railCart')!.ready).toBe(false)
  })
  it('the cart band maps the drop point to a printed-scale position of the front, on the rail and in front of the receiver stop', () => {
    const a = createApparatus('assembled', exact)
    const z = zonesOf(a, 'cart').find((x) => x.id === 'railCart')!
    const at = (x: number): Probe => () => ({ x_cm: x, z_cm: 0 })
    const mid = resolveDrop([z], at(45)) as Extract<Target, { kind: 'zone' }>
    expect(mid.railPos_mm).toBeGreaterThan(400)
    expect(mid.railPos_mm).toBeLessThan(600)
    const farRight = resolveDrop([z], at(z.cx + z.hx)) as Extract<Target, { kind: 'zone' }>
    expect(a.placeCart(farRight.railPos_mm!).ok).toBe(true) // clamped before the stop: never "off the rail"
    const farLeft = resolveDrop([z], at(z.cx - z.hx)) as Extract<Target, { kind: 'zone' }>
    expect(a.placeCart(farLeft.railPos_mm!).ok).toBe(true)
  })
  it('a rail in the clamp cannot be lifted by hand; everything else can', () => {
    const a = createApparatus('assembled')
    expect(benchDraggable('rail', a.getState())).toBe(false)
    expect(benchDraggable('cart', a.getState())).toBe(true)
    expect(jointsOfPart('string', a.getState())).toEqual(['stringCart', 'stringCanister', 'stringPulley'])
    expect(jointsOfPart('rackStand', a.getState())).toEqual(['rackClamp'])
  })
})

describe('executeDrop', () => {
  it('assembles the full set-up from the loose start, one drop per part, in the procedure order', () => {
    const a = createApparatus('loose', exact)
    const steps: Array<[PartId, ZoneId]> = [
      ['rackStand', 'stand'], ['rail', 'clampE1'], ['receiver', 'receiver'], ['level', 'railLevel'], ['cart', 'railCart'], ['brassScrew', 'screwOnCart'],
      ['string', 'pulleyThread'], ['canister', 'canisterHook'],
      ['mass0', 'canisterMass'], ['mass1', 'canisterMass'], ['mass2', 'canisterMass'], ['mass3', 'canisterMass'],
    ]
    for (const [p, z] of steps) expect(drop(a, p, z), `${p} -> ${z}`).toMatchObject({ ok: true })
    const s = a.getState()
    expect(s.joints).toMatchObject({ standBase: true, rackClamp: 'E1', receiver: true, stringCart: true, stringCanister: true, stringPulley: true })
    expect(s.cart.placed).toBe(true)
    expect(s.level.placement).toBe('rail')
    expect(a.massLocations()).toEqual(['canister', 'canister', 'canister', 'canister'])
    expect(a.procedure()).toMatchObject({ setupComplete: true, stringConnected: true, canRun: true })
    // the same set-up a button press sequence gives: the drops call the same Apparatus methods
    expect(a.getRuns()).toHaveLength(0)
  })
  it('a mass moves from the canister to the cart and back; the plastic screw rule is the Apparatus rule', () => {
    const a = createApparatus('assembled', exact)
    expect(drop(a, 'mass3', 'cartMass')).toMatchObject({ ok: true })
    expect(a.massLocations()[3]).toBe('cart')
    expect(a.getState().plasticScrewsUsed).toBe(1)
    expect(drop(a, 'mass3', 'canisterMass')).toMatchObject({ ok: true })
    expect(a.massLocations()[3]).toBe('canister')
    a.removeItem('plasticScrews')
    const r = drop(a, 'mass3', 'cartMass')
    expect(r).toMatchObject({ ok: false, reason: 'itemNotOnTable', item: 'plasticScrews' })
    expect(a.massLocations()[3]).toBe('canister')
  })
  it('a refused drop from the tray takes the part back off the table; the refusal has text in both languages', () => {
    const a = createApparatus('loose', exact)
    a.removeItem('rail')
    const r = executeDrop(a, 'rail', 'tray', targetOf(a, 'rail', 'clampE1'))
    expect(r).toMatchObject({ ok: false, reason: 'needStandBase' })
    expect(a.hasItem('rail')).toBe(false)
    for (const l of ['es', 'en'] as const) expect(reasonText(l, 'needStandBase').length).toBeGreaterThan(10)
  })
  it('from the tray: the part is put on the table first, then the joint is made', () => {
    const a = createApparatus('loose', exact)
    a.removeItem('rackStand')
    expect(executeDrop(a, 'rackStand', 'tray', targetOf(a, 'rackStand', 'stand'))).toMatchObject({ ok: true, added: true })
    expect(a.getState().joints.standBase).toBe(true)
  })
  it('lifting an attached part and dropping it on the table undoes the joint (and what hangs on it)', () => {
    const a = createApparatus('assembled', exact)
    expect(drop(a, 'receiver', 'table')).toMatchObject({ ok: true })
    expect(a.getState().joints.receiver).toBe(false)
    expect(a.getState().joints.stringPulley).toBe(false)
    expect(drop(a, 'cart', 'table')).toMatchObject({ ok: true })
    expect(a.getState().cart.placed).toBe(false)
    expect(drop(a, 'canister', 'table')).toMatchObject({ ok: true })
    expect(a.getState().joints.stringCanister).toBe(false)
  })
  it('dropping on the tray takes a part off the table; a mass only leaves the system', () => {
    const a = createApparatus('assembled', exact)
    expect(executeDrop(a, 'balance', 'bench', { kind: 'tray' })).toMatchObject({ ok: true, removed: true })
    expect(a.hasItem('balance')).toBe(false)
    expect(executeDrop(a, 'mass0', 'bench', { kind: 'tray' })).toMatchObject({ ok: true })
    expect(a.massLocations()[0]).toBe('bench')
    expect(executeDrop(a, 'screws', 'bench', { kind: 'tray' })).toMatchObject({ ok: false, reason: 'screwsInUse' })
  })
  it('the cart can be put back on the rail after it fell', () => {
    const a = createApparatus('assembled', exact)
    a.detach('receiver')
    a.releaseCart(0)
    const tEnd = a.getRun(1)!.fall!.tExit_s * 1000 + 30000
    expect(a.cartState(tEnd).phase).toBe('fallen')
    expect(drop(a, 'cart', 'railCart')).toMatchObject({ ok: true })
    expect(a.cartState(tEnd).phase).toBe('atStart')
  })
})

describe('strings', () => {
  it('es and en have the same keys, one name per zone, and every part has a name', () => {
    for (const l of ['es', 'en'] as const) {
      expect(Object.keys(ddStrings[l].zones).sort()).toEqual(Object.keys(ddStrings.es.zones).sort())
      for (const t of Object.values(ddStrings[l].zones)) expect(t.length).toBeGreaterThan(3)
      for (const id of ITEM_IDS) expect(invStrings[l].items[id as ItemId].name.length).toBeGreaterThan(2)
      expect(ddStrings[l].massName).toContain('{n}')
    }
    expect(Object.keys(ddStrings.en.zones)).toHaveLength(13)
    expect(MASS_PARTS).toHaveLength(4)
  })
})
