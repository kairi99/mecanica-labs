import { describe, expect, it } from 'vitest'
import { Apparatus, createApparatus, REQUIRED_ITEM_IDS, type ApparatusEvent } from '../../src/experiments/newton2/apparatus/index.ts'
import { fillTableSimulated } from '../../src/experiments/newton2/pedagogy/simulatedReadings.ts'
import { NOMINAL_PARTS, NO_VARIABILITY, deg2rad } from '../../src/experiments/newton2/physics/index.ts'
import { tableCSV } from '../../src/experiments/newton2/analysis/csv.ts'

const exact = { seed: 1, tableTilt_rad: 0, parts: NOMINAL_PARTS, variability: NO_VARIABILITY }

describe('assembly', () => {
  it('the assembled preset is a careful, runnable bench: level, marks 90 cm apart, string connected, masses kept, Mt recorded', () => {
    const a = createApparatus('assembled', { seed: 5 })
    const p = a.procedure()
    expect(p.setupComplete).toBe(true)
    expect(p.canRun).toBe(true)
    expect(p.levelled).toBe(true)
    expect(p.distanceOk).toBe(true)
    expect(p.cartAtStart).toBe(true)
    expect(p.stringConnected).toBe(true)
    expect(p.massKept).toBe(true)
    expect(p.massesIn).toEqual({ canister: 4, cart: 0, bench: 0 })
    expect(Math.abs(p.mtRecorded_kg! - a.hiddenTruth().totalMass_kg)).toBeLessThan(6e-5) // within half a balance step
    a.placeLevel('rail')
    expect(a.levelReading().centered).toBe(true)
  })
  it('missing() lists only required parts; distractors are accepted but never required', () => {
    const a = new Apparatus()
    expect(a.missing().filter((m) => m.kind === 'item')).toHaveLength(REQUIRED_ITEM_IDS.length)
    for (const d of ['mass50', 'marble', 'twoLegStand'] as const) expect(a.addItem(d).ok).toBe(true)
    expect(a.missing().some((m) => m.id === 'mass50' || m.id === 'marble' || m.id === 'twoLegStand')).toBe(false)
    expect(a.addItem('rail')).toEqual({ ok: true })
    expect(a.addItem('rail')).toMatchObject({ ok: false, reason: 'itemAlreadyOnTable' })
  })
  it('joints need their parts and each other: no clamp without base, no receiver without clamp, no pulley string without receiver, no brass screw no tie', () => {
    const a = new Apparatus()
    for (const i of ['rail', 'rackStand', 'standBase', 'receiver', 'screws', 'string', 'cart', 'canister'] as const) a.addItem(i)
    expect(a.attach('rackClamp', { railEnd: 'E1' })).toMatchObject({ ok: false, reason: 'needStandBase' })
    a.attach('standBase')
    expect(a.attach('rackClamp')).toMatchObject({ ok: false, reason: 'railEndRequired' })
    expect(a.attach('receiver')).toMatchObject({ ok: false, reason: 'needRackClamp' })
    expect(a.attach('stringPulley')).toMatchObject({ ok: false, reason: 'needReceiver' })
    expect(a.attach('stringCart')).toMatchObject({ ok: false, reason: 'itemNotOnTable', item: 'brassScrew' })
    expect(a.attach('rackClamp', { railEnd: 'E1' }).ok).toBe(true)
    expect(a.attach('receiver').ok).toBe(true)
    expect(a.getState().screwsUsed).toBe(4)
    a.detach('rackClamp') // takes the receiver with it
    expect(a.getState().joints.receiver).toBe(false)
    expect(a.getState().screwsUsed).toBe(0)
  })
  it('a cart cannot be put off the track (rear past the rail end, or in front of the receiver stop)', () => {
    const a = createApparatus('assembled')
    expect(a.placeCart(50)).toMatchObject({ ok: false, reason: 'cartOffRail' })
    expect(a.placeCart(1180)).toMatchObject({ ok: false, reason: 'cartOffRail' })
    expect(a.placeCart(400).ok).toBe(true)
  })
  it('releasing without a receiver is blocked (the cart would fall); refusals are events', () => {
    const a = createApparatus('assembled')
    const seen: ApparatusEvent[] = []
    a.on((e) => seen.push(e))
    a.detach('receiver')
    expect(a.canRun().reasons).toContain('noReceiver')
    expect(a.releaseCart(1000)).toMatchObject({ ok: false, reason: 'noReceiver' })
    expect(seen.some((e) => e.type === 'refused')).toBe(true)
  })
})

describe('runs and outcomes', () => {
  it('a good set-up gives outcome ok with the model time and a cart that comes to the receiver', () => {
    const a = createApparatus('assembled', exact)
    const r = a.releaseCart(1000)
    expect(r).toMatchObject({ ok: true, outcome: 'ok' })
    const run = a.getRun(1)!
    expect(run.tEnd_s!).toBeGreaterThan(1.0)
    expect(run.tEnd_s!).toBeLessThan(1.2)
    expect(run.tFloor_s!).toBeGreaterThan(run.tEnd_s!) // the canister meets the floor only after the end mark
    expect(a.cartState(1000 + 10_000).phase).toBe('stopped')
    expect(a.cartState(1000 + 500).phase).toBe('rolling')
  })
  it('without the brass screw the string is not attached: the cart does not move', () => {
    const a = new Apparatus(exact)
    for (const i of REQUIRED_ITEM_IDS) if (i !== 'brassScrew') a.addItem(i)
    a.attach('standBase'); a.attach('rackClamp', { railEnd: 'E1' }); a.attach('receiver'); a.attach('stringCanister'); a.attach('stringPulley')
    a.placeCart(100)
    expect(a.attach('stringCart').ok).toBe(false)
    const r = a.releaseCart(0)
    expect(r).toMatchObject({ ok: true, outcome: 'stringNotAttached' })
    expect(a.getRun(1)!.tEnd_s).toBeNull()
    expect(a.cartState(5000).s_m).toBeCloseTo(0, 6)
  })
  it('a string that does not reach the pulley holds the cart (outcome stringTooShort, no time)', () => {
    const a = createApparatus('assembled', exact)
    a.setStringLength_m(0.9)
    expect(a.releaseCart(0)).toMatchObject({ ok: true, outcome: 'stringTooShort' })
    expect(a.getRun(1)!.tEnd_s).toBeNull()
  })
  it('a string that is too long lets the canister meet the floor before 90 cm: outcome canisterHitsFloor, run slower than the pulled one', () => {
    const good = createApparatus('assembled', exact)
    good.releaseCart(0)
    const a = createApparatus('assembled', exact)
    a.setStringLength_m(1.2) // hang0 = 12.5 cm: floor after 83.5 cm
    expect(a.releaseCart(0)).toMatchObject({ ok: true, outcome: 'canisterHitsFloor' })
    const run = a.getRun(1)!
    expect(run.tFloor_s!).toBeLessThan(run.tEnd_s!)
    expect(run.tEnd_s!).toBeGreaterThan(good.getRun(1)!.tEnd_s!)
    expect(a.cartState(run.releaseTime_ms + (run.tFloor_s! + 0.05) * 1000).canisterOnFloor).toBe(true)
    expect(a.cartState(run.releaseTime_ms + (run.tFloor_s! + 0.05) * 1000).phase).toBe('coasting')
  })
  it('an end mark beyond the receiver stop: the cart hits the receiver first', () => {
    const a = createApparatus('assembled', exact)
    a.placeMark('end', 1170) // 1.07 m from the start: past the receiver stop (1.06 m)
    expect(a.releaseCart(0)).toMatchObject({ ok: true, outcome: 'receiverBlocks' })
    expect(a.getRun(1)!.tReceiver_s).not.toBeNull()
  })
  it('a rail not levelled gives a tilt that changes the run time (tilt toward the pulley is faster)', () => {
    const level = createApparatus('assembled', exact)
    level.releaseCart(0)
    const tilted = createApparatus('assembled', exact)
    tilted.placeLevel('rail')
    expect(tilted.setRackHeight_mm(3).ok).toBe(true) // stand end 3 mm higher over 1.1 m: ~0.16 deg
    expect(tilted.levelReading().centered).toBe(false)
    expect(tilted.procedure().levelled).toBe(false)
    tilted.releaseCart(0)
    expect(tilted.getRun(1)!.tilt_rad).toBeGreaterThan(deg2rad(0.1))
    expect(tilted.getRun(1)!.tEnd_s!).toBeLessThan(level.getRun(1)!.tEnd_s!)
  })
  it('is deterministic for a seed and differs between seeds', () => {
    const times = (seed: number): number[] => {
      const a = createApparatus('assembled', { seed })
      const out: number[] = []
      for (let i = 0; i < 5; i++) { if (a.getState().cart.released) a.resetCart(); out.push(a.getRun((a.releaseCart(1000 * i) as { runId: number }).runId)!.tEnd_s!) }
      return out
    }
    expect(times(3)).toEqual(times(3))
    expect(times(3)).not.toEqual(times(4))
  })
  it('the DigiCart log has 50 Hz samples of 1 mm, starts at 0 and reaches the 90 cm within one sample step', () => {
    const a = createApparatus('assembled', exact)
    a.releaseCart(0)
    const d = a.digicartRecord(1)!
    expect(d.sampleRate_Hz).toBe(50)
    expect(d.x_m[0]).toBe(0)
    const k = d.t_s.findIndex((t) => t >= d.tEnd_s!)
    expect(Math.abs(d.x_m[k]! - 0.9)).toBeLessThan(0.05)
    for (const x of d.x_m) expect(Math.abs(x * 1000 - Math.round(x * 1000))).toBeLessThan(1e-6)
  })
})

describe('trials, mass bookkeeping, instruments', () => {
  it('moving a mass from the canister to the cart keeps all masses in the system and adds one plastic screw', () => {
    const a = createApparatus('assembled', exact)
    const m4 = a.hiddenTruth().totalMass_kg
    expect(a.setTrial(3).ok).toBe(true)
    expect(a.getState().masses).toEqual(['canister', 'canister', 'canister', 'cart'])
    expect(a.hiddenTruth().totalMass_kg - m4).toBeCloseTo(NOMINAL_PARTS.plasticScrew_kg, 9)
    expect(a.procedure().massKept).toBe(true)
    expect(a.setTrial(1).ok).toBe(true)
    expect(a.getState().plasticScrewsUsed).toBe(3)
    expect(a.hiddenTruth().totalMass_kg - m4).toBeCloseTo(3 * NOMINAL_PARTS.plasticScrew_kg, 9)
  })
  it('taking a mass off the system instead of moving it changes Mt by 10 g and is flagged', () => {
    const a = createApparatus('assembled', exact)
    const m4 = a.hiddenTruth().totalMass_kg
    a.setMassLocation(3, 'bench')
    expect(a.hiddenTruth().totalMass_kg - m4).toBeCloseTo(-0.01, 9)
    expect(a.procedure().massKept).toBe(false)
  })
  it('a mass cannot go on the cart without plastic screws; at most five screws exist', () => {
    const a = createApparatus('assembled')
    a.removeItem('plasticScrews')
    expect(a.setMassLocation(0, 'cart')).toMatchObject({ ok: false, reason: 'itemNotOnTable', item: 'plasticScrews' })
  })
  it('the 1 N spring scale reads the canister weight to the nearest 0.02 N (no zero error, hanging) and follows the masses in it', () => {
    const a = createApparatus('assembled', exact)
    const r4 = a.dynamometerRead()
    expect(r4.ok && r4.reading.reading_N).toBeCloseTo(0.48, 9)
    a.setTrial(1)
    const r1 = a.dynamometerRead()
    expect(r1.ok && r1.reading.reading_N).toBeCloseTo(0.2, 9)
    expect(r1.ok && r1.reading.uB_N).toBeCloseTo(0.02 / Math.sqrt(12), 9)
    expect(r1.ok && r1.reading.massesInCanister).toBe(1)
  })
  it('either spring scale satisfies the inventory; the 2 N one reads to 0.05 N and is chosen explicitly when both are on the table', () => {
    const a = createApparatus('assembled', exact)
    a.removeItem('dynamometer')
    expect(a.missing().some((m) => m.id === 'dynamometer')).toBe(true)
    a.addItem('dynamometer2N')
    expect(a.missing().some((m) => m.id === 'dynamometer')).toBe(false)
    const r = a.dynamometerRead()
    expect(r.ok && r.reading.scaleId).toBe('2N')
    expect(r.ok && r.reading.resolution_N).toBeCloseTo(0.05, 9)
    expect(r.ok && r.reading.reading_N).toBeCloseTo(0.5, 9)
    a.addItem('dynamometer')
    const both = a.dynamometerRead('2N')
    expect(both.ok && both.reading.scaleId).toBe('2N')
    expect(a.dynamometerRead().ok && (a.dynamometerRead() as { reading: { scaleId: string } }).reading.scaleId).toBe('1N')
    a.removeItem('dynamometer'); a.removeItem('dynamometer2N')
    expect(a.dynamometerRead()).toMatchObject({ ok: false, reason: 'itemNotOnTable' })
  })
  it('the observable hang below the pulley follows the string length (what the student sees on the bench)', () => {
    const a = createApparatus('assembled', exact)
    expect(a.hangBelowPulley_m()).toBeCloseTo(0.02, 9)
    a.setStringLength_m(1.2)
    expect(a.hangBelowPulley_m()).toBeCloseTo(0.125, 9)
    expect(new Apparatus().hangBelowPulley_m()).toBeNull()
  })
  it('the balance weighs parts and the system with 0.1 g steps, refuses an overload, and Mt is typed with one decimal', () => {
    const a = createApparatus('assembled', exact)
    const w = a.weigh(['system'])
    expect(w.ok && w.reading_kg).toBeCloseTo(0.3045, 9)
    expect(a.weigh(['mass0']).ok && (a.weigh(['mass0']) as { reading_kg: number }).reading_kg).toBeCloseTo(0.01, 9)
    a.addItem('mass50'); a.addItem('marble')
    expect(a.weigh(['mass50', 'cart']).ok).toBe(true)
    expect(a.weigh([])).toMatchObject({ ok: false, reason: 'nothingToWeigh' })
    expect(a.recordMt_g('304,5')).toMatchObject({ ok: true, value_g: 304.5 })
    expect(a.recordMt_g('304.55')).toMatchObject({ ok: false, reason: 'tooManyDecimals' })
  })
})

describe('Tabla 3.1', () => {
  it('takes typed and copied forces and times with the stopwatch rules, and refuses bad input', () => {
    const a = createApparatus('assembled', exact)
    expect(a.tableSetForce(0, '0,48')).toMatchObject({ ok: true, value_N: 0.48 })
    expect(a.tableSetForce(0, '0.481')).toMatchObject({ ok: false, reason: 'tooManyDecimals' })
    expect(a.tableSetForce(7, 1)).toMatchObject({ ok: false, reason: 'badCell' })
    expect(a.tableCopyForce(1)).toMatchObject({ ok: false, reason: 'noForceReading' })
    a.dynamometerRead()
    expect(a.tableCopyForce(1)).toMatchObject({ ok: true, value_N: 0.48 })
    expect(a.tableSet(0, 0, '1,23')).toMatchObject({ ok: true, value_s: 1.23 })
    expect(a.tableSet(0, 10, 1)).toMatchObject({ ok: false, reason: 'badCell' })
    expect(a.tableCopyDisplay(0, 1, 0)).toMatchObject({ ok: false, reason: 'noStopwatchReading' })
    const d = a.tableData()
    expect(d.trialMasses).toEqual([4, 3, 2, 1, 0])
    expect(d.forces_N.slice(0, 2)).toEqual([0.48, 0.48])
    expect(d.values_s[0]![0]).toBe(1.23)
  })
  it('a simulated careful student fills the four trials; each cell links to a run and the table is complete', () => {
    const a = createApparatus('assembled', { seed: 2 })
    expect(fillTableSimulated(a, { seed: 2 })).toBe(40)
    const p = a.procedure()
    expect(p.tableComplete).toBe(true)
    expect(p.recordsPerRow.slice(0, 4)).toEqual([10, 10, 10, 10])
    expect(p.outcomes.ok).toBe(40)
    expect(a.tableData().cells[2]![5]!.runId).not.toBeNull()
    // the trials keep the total mass constant except the plastic screws
    expect(a.getRuns()[39]!.totalMass_kg - a.getRuns()[0]!.totalMass_kg).toBeCloseTo(3 * a.hiddenTruth().parts.plasticScrew_kg, 9)
  })
  it('CSV: Spanish uses ";" and a decimal comma, English "," and a point', () => {
    const a = createApparatus('assembled', exact)
    a.tableSetForce(0, 0.48); a.tableSet(0, 0, 1.23)
    const es = tableCSV(a.tableData(), 'es').split('\n')
    const en = tableCSV(a.tableData(), 'en').split('\n')
    expect(es[0]).toContain(';')
    expect(es[1]).toContain('0,48;')
    expect(es[1]).toContain('1,23')
    expect(en[0]).toContain(',')
    expect(en[1]).toContain('0.48,')
    expect(en[1]).toContain('1.23')
    expect(es).toHaveLength(7) // header + 5 rows + trailing newline
  })
})

describe('persistence', () => {
  it('a snapshot survives JSON and restores the runs, the table and the rng stream', () => {
    const a = createApparatus('assembled', { seed: 9 })
    fillTableSimulated(a, { seed: 9, perRow: 2, rows: [0, 1] })
    const snap = JSON.parse(JSON.stringify(a.snapshot()))
    const b = new Apparatus({ seed: 9 })
    expect(b.load(snap)).toEqual({ ok: true })
    expect(b.getRuns()).toEqual(a.getRuns())
    expect(b.tableData()).toEqual(a.tableData())
    expect(b.cartState(9e5)).toEqual(a.cartState(9e5))
    expect(b.digicartRecord(1)).toEqual(a.digicartRecord(1))
    a.resetCart(); b.resetCart()
    expect(a.releaseCart(5e6)).toEqual(b.releaseCart(5e6))
    expect(b.getRuns().at(-1)).toEqual(a.getRuns().at(-1))
  })
  it('a bad snapshot is refused', () => {
    expect(new Apparatus().load({ version: 2 } as never)).toMatchObject({ ok: false, reason: 'badSnapshot' })
  })
})
