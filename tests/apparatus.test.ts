import { describe, expect, it } from 'vitest'
import {
  Apparatus, ITEM_IDS, createApparatus, evaluateMarks, vernierGeometry, bubbleOffset_mm, parseTimeInput,
  RACK_BASE_HEIGHT_m, SUPPORT_SEPARATION_m, type ItemId,
} from '../src/apparatus/index.ts'
import {
  DEFAULT_CART, DEFAULT_VARIABILITY, crossingTime_s, deg2rad, inclineAngle_rad, mulberry32, rad2deg, sampleRun,
} from '../src/physics/index.ts'

/** Bench with every item on the table but nothing attached; table tilt fixed so tests are not seed dependent. */
function loose(tilt_deg = 0.1, seed = 7): Apparatus {
  const a = new Apparatus({ seed, tableTilt_rad: deg2rad(tilt_deg), digitalZeroError_m: 0.00003 })
  for (const i of ITEM_IDS) a.addItem(i)
  return a
}
function mounted(end: 'E1' | 'E2' = 'E1', tilt_deg = 0.1): Apparatus {
  const a = loose(tilt_deg)
  a.attach('standBase'); a.attach('rackClamp', { railEnd: end }); a.attach('twoLegStand'); a.attach('receiver')
  return a
}
const reasonOf = (r: { ok: boolean }): string | undefined => (r.ok ? undefined : (r as unknown as { reason: string }).reason)

describe('assembly rules', () => {
  it('items go on the table once; unknown ids are refused', () => {
    const a = new Apparatus()
    expect(a.addItem('rail').ok).toBe(true)
    expect(reasonOf(a.addItem('rail'))).toBe('itemAlreadyOnTable')
    expect(reasonOf(a.addItem('banana' as ItemId))).toBe('unknownItem')
  })
  it('rack stand clamp needs the base, a chosen rail end and two screws; other joints need the clamp first', () => {
    const a = loose()
    expect(reasonOf(a.attach('rackClamp', { railEnd: 'E1' }))).toBe('needStandBase')
    a.attach('standBase')
    expect(reasonOf(a.attach('rackClamp'))).toBe('railEndRequired')
    expect(reasonOf(a.attach('twoLegStand'))).toBe('needRackClamp')
    expect(reasonOf(a.attach('receiver'))).toBe('needRackClamp')
    expect(a.attach('rackClamp', { railEnd: 'E2' }).ok).toBe(true)
    expect(reasonOf(a.attach('rackClamp', { railEnd: 'E1' }))).toBe('alreadyAttached')
  })
  it('each rail joint consumes 2 screws; 3 joints use all 6; screws in use cannot be removed', () => {
    const a = loose()
    a.attach('standBase'); a.attach('rackClamp', { railEnd: 'E1' })
    expect(a.getState().screwsUsed).toBe(2)
    a.attach('twoLegStand'); a.attach('receiver')
    const s = a.getState()
    expect(s.screwsUsed).toBe(6)
    expect(s.screwsAvailable).toBe(0)
    expect(reasonOf(a.removeItem('screws'))).toBe('screwsInUse')
    a.detach('receiver')
    expect(a.getState().screwsAvailable).toBe(2)
  })
  it('without the screws item no rail joint can be made', () => {
    const a = new Apparatus()
    for (const i of ITEM_IDS) if (i !== 'screws') a.addItem(i)
    a.attach('standBase')
    const r = a.attach('rackClamp', { railEnd: 'E1' })
    expect(r).toEqual({ ok: false, reason: 'itemNotOnTable', item: 'screws' })
  })
  it('detaching the clamp undoes the joints that hang on it; removing the rail takes the cart off', () => {
    const a = mounted()
    a.placeMarker(200); a.placeCart(200)
    a.detach('rackClamp')
    expect(a.getState().joints).toEqual({ standBase: true, rackClamp: null, twoLegStand: false, receiver: false })
    expect(a.getState().cart.placed).toBe(false)
    expect(a.geometry()).toBeNull()
  })
  it('missing() lists every absent item and the joint that cannot be made yet, with reasons', () => {
    const a = new Apparatus()
    expect(a.missing().filter((m) => m.kind === 'item').map((m) => m.id).sort()).toEqual([...ITEM_IDS].sort())
    for (const i of ITEM_IDS) a.addItem(i)
    const m = a.missing()
    expect(m.map((x) => x.id)).toEqual(['standBase', 'rackClamp', 'twoLegStand', 'receiver'])
    expect(m.find((x) => x.id === 'rackClamp')!.reason).toBe('needsStandBase')
    expect(m.find((x) => x.id === 'twoLegStand')!.reason).toBe('needsRackClamp')
    a.attach('standBase'); a.attach('rackClamp', { railEnd: 'E1' })
    expect(a.missing().find((x) => x.id === 'twoLegStand')!.reason).toBe('notAttached')
    a.attach('twoLegStand'); a.attach('receiver')
    expect(a.missing()).toEqual([])
  })
  it('missing() marks level/stopwatch/caliper/markers as non-blocking', () => {
    const a = new Apparatus()
    const lv = a.missing().find((m) => m.id === 'level')!
    expect(lv.blocksRun).toBe(false)
    expect(a.missing().find((m) => m.id === 'receiver')!.blocksRun).toBe(true)
  })
  it('canRun: no receiver blocks (the cart would fall off the end); cart must be placed', () => {
    const a = mounted()
    a.detach('receiver')
    a.placeMarker(200)
    expect(a.placeCart(200).ok).toBe(true)
    expect(a.canRun()).toEqual({ ok: false, reasons: ['noReceiver'] })
    expect(reasonOf(a.releaseCart(0))).toBe('noReceiver')
    a.attach('receiver')
    expect(a.canRun().ok).toBe(true)
    a.removeItem('cart')
    expect(a.canRun().reasons).toContain('cartNotPlaced')
  })
  it('canRun reports a rail that is not held by both stands', () => {
    const a = loose()
    expect(a.canRun().reasons).toEqual(['railNotSupported', 'noReceiver', 'cartNotPlaced'])
    expect(new Apparatus().canRun().reasons[0]).toBe('noRail')
  })
})

describe('cart placement (guide warning: never off the track)', () => {
  it('refuses a cart that is not entirely on the rail (cartOffRail) and logs a refusal event', () => {
    const a = mounted()
    expect(reasonOf(a.placeCart(20))).toBe('cartOffRail') // rear hangs over the top end
    expect(reasonOf(a.placeCart(1190))).toBe('cartOffRail') // beyond the receiver stop
    expect(reasonOf(a.placeCart(-5))).toBe('cartOffRail')
    expect(reasonOf(a.placeCart(1300))).toBe('cartOffRail')
    expect(a.eventLog().some((e) => e.type === 'refused' && e.reason === 'cartOffRail')).toBe(true)
    expect(a.placeCart(200).ok).toBe(true)
  })
  it('there is no rail for the cart: cartOffRail; rail on the table but not clamped: railNotAssembled', () => {
    const a = new Apparatus()
    a.addItem('cart')
    expect(reasonOf(a.placeCart(200))).toBe('cartOffRail')
    a.addItem('rail')
    expect(reasonOf(a.placeCart(200))).toBe('railNotAssembled')
  })
  it('with the scale reversed (0 mm at the low end) the same physical limits apply to the printed numbers', () => {
    const a = mounted('E2')
    expect(reasonOf(a.placeCart(1180))).toBe('cartOffRail') // 20 mm from the top end
    expect(reasonOf(a.placeCart(10))).toBe('cartOffRail') // beyond the stop
    expect(a.placeCart(1000).ok).toBe(true)
  })
})

describe('geometry', () => {
  it('rail angle follows the stand heights and the hidden table tilt: sin(theta_r) = dh / d, theta = theta_r + tilt', () => {
    const a = mounted('E1', 0.1)
    a.setRackHeight_mm(25); a.setFoot_mm(2)
    const g = a.geometry()!
    expect(g.clampHeight_m).toBeCloseTo(RACK_BASE_HEIGHT_m + 0.025, 12)
    const expected = inclineAngle_rad(g.clampHeight_m, g.twoLegHeight_m, SUPPORT_SEPARATION_m, deg2rad(0.1))
    expect(g.theta_rad).toBeCloseTo(expected, 12)
    expect(g.theta_rad - g.railAngle_rad).toBeCloseTo(deg2rad(0.1), 12)
    expect(g.railAngle_rad).toBeCloseTo(Math.asin(0.023 / SUPPORT_SEPARATION_m), 12)
  })
  it('rack reads whole millimetres and refuses out-of-range', () => {
    const a = mounted()
    expect(a.setRackHeight_mm(24.6)).toEqual({ ok: true, rack_mm: 25 })
    expect(reasonOf(a.setRackHeight_mm(251))).toBe('outOfRange')
    expect(reasonOf(a.setRackHeight_mm(-1))).toBe('outOfRange')
    expect(reasonOf(a.setFoot_mm(5.5))).toBe('outOfRange')
    expect(a.setFoot_mm(1.234)).toEqual({ ok: true, foot_mm: 1.25 })
  })
  it('levelling with the foot removes the table tilt systematic', () => {
    const tilt = 0.12
    const a = mounted('E1', tilt)
    expect(rad2deg(a.geometry()!.theta_rad)).toBeCloseTo(tilt, 6) // rack 0, foot 0: rail geometrically flat, table tilt remains
    const f = 1000 * SUPPORT_SEPARATION_m * Math.sin(deg2rad(tilt))
    a.setFoot_mm(f)
    expect(Math.abs(rad2deg(a.geometry()!.theta_rad))).toBeLessThan(0.002) // within one foot step (0.05 mm / 1.1 m = 0.0026 deg)
  })
  it('world frame: rail endpoints are 1.2 m apart, the clamp is at x = 0 and the rail descends toward +x', () => {
    const a = mounted()
    a.setRackHeight_mm(25)
    const p = a.geometry()!.pose
    const len = Math.hypot(p.lowEnd.x_m - p.highEnd.x_m, p.lowEnd.y_m - p.highEnd.y_m, p.lowEnd.z_m - p.highEnd.z_m)
    expect(len).toBeCloseTo(1.2, 12)
    expect(p.clamp.x_m).toBe(0)
    expect(p.clamp.y_m).toBeCloseTo(RACK_BASE_HEIGHT_m + 0.025, 12)
    expect(p.lowEnd.y_m).toBeLessThan(p.highEnd.y_m)
    expect(Math.hypot(p.twoLeg.x_m - p.clamp.x_m, p.twoLeg.y_m - p.clamp.y_m)).toBeCloseTo(SUPPORT_SEPARATION_m, 12)
  })
  it('preset assembled: 1.30 deg within 0.005 deg for several seeds, can run, tilt compensated', () => {
    for (const seed of [1, 2, 3, 11, 42, 2026]) {
      const a = createApparatus('assembled', { seed })
      const th = rad2deg(a.geometry()!.theta_rad)
      expect(Math.abs(th - 1.3)).toBeLessThan(0.005)
      expect(a.canRun().ok).toBe(true)
      expect(a.missing()).toEqual([])
      const p = a.procedure()
      expect(p.angleOk && p.levelledBeforeRaise && p.scaleOk && p.marksOk && p.cart.atZero && p.setupComplete).toBe(true)
      expect(p.heightsMeasured).toEqual({ clamp: true, twoLeg: true })
      expect(a.eventLog().some((e) => e.type === 'refused')).toBe(false)
    }
  })
  it('preset empty is a bare bench', () => {
    const a = createApparatus('empty')
    expect(a.getState().items.rail).toBe(false)
    expect(a.eventLog().map((e) => e.type)).toEqual(['presetApplied'])
    expect(reasonOf(a.preset('nope' as 'empty'))).toBe('unknownPreset')
  })
})

describe('level (nivelador)', () => {
  it('bubble offset is proportional (2 mm per 0.1 deg) and saturates', () => {
    expect(bubbleOffset_mm(deg2rad(0.1))).toBeCloseTo(2, 9)
    expect(bubbleOffset_mm(deg2rad(-0.05))).toBeCloseTo(-1, 9)
    expect(bubbleOffset_mm(deg2rad(1.3))).toBe(6)
    expect(bubbleOffset_mm(deg2rad(-3))).toBe(-6)
  })
  it('on the table it reads the table tilt; on the rail it reads the rail incline', () => {
    const a = mounted('E1', 0.1)
    expect(a.levelReading().bubble_mm).toBeNull()
    a.placeLevel('table')
    expect(a.levelReading().bubble_mm).toBeCloseTo(2, 6)
    a.placeLevel('rail')
    a.setRackHeight_mm(25)
    const r = a.levelReading()
    expect(r.saturated).toBe(true)
    expect(r.centered).toBe(false)
  })
  it('levelled-before-raise needs the level on the rail, rack at 0 and a centred bubble', () => {
    const a = mounted('E1', 0.12)
    a.placeLevel('rail')
    expect(a.procedure().levelledBeforeRaise).toBe(false)
    a.setFoot_mm(1000 * SUPPORT_SEPARATION_m * Math.sin(deg2rad(0.12)))
    expect(a.procedure().levelledBeforeRaise).toBe(true)
    expect(a.eventLog().filter((e) => e.type === 'leveled')).toHaveLength(1)
    // raising first, never levelling: flag stays false
    const b = mounted('E1', 0.12)
    b.placeLevel('rail'); b.setRackHeight_mm(25)
    expect(b.procedure().levelledBeforeRaise).toBe(false)
  })
  it('the level cannot go on the rail when there is no rail', () => {
    const a = new Apparatus()
    a.addItem('level')
    expect(reasonOf(a.placeLevel('rail'))).toBe('levelNeedsRail')
    expect(a.placeLevel('table').ok).toBe(true)
  })
})

describe('caliper', () => {
  it('vernier: returns the true length and the scale geometry (1 mm main, 20 divisions, 0.05 mm)', () => {
    const a = mounted()
    a.setRackHeight_mm(25)
    const r = a.caliperMeasure({ kind: 'railHeight', at: 'clamp' })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.reading.trueLength_m).toBeCloseTo(0.085, 12)
    expect(r.reading.display_m).toBeNull()
    const v = vernierGeometry(0.08537)
    expect(v.mainScaleReading_mm).toBe(85)
    expect(v.coincidentDivision).toBe(7) // 0.37 mm / 0.05 = 7.4 -> 7
    expect(v.idealReading_m).toBeCloseTo(0.08535, 12)
    expect(v.leastCount_mm).toBeCloseTo(0.05, 12)
  })
  it('digital: display = quantize(true + zero error, 0.01 mm); the zero button (jaws closed) removes the error', () => {
    const a = mounted()
    a.setCaliperVariant('digital')
    a.setRackHeight_mm(25)
    expect(reasonOf(a.caliperZero())).toBe('jawsNotClosed')
    a.setCaliperJaws(true)
    expect(a.caliperClosedDisplay_m()).toBeCloseTo(0.00003, 9)
    a.setCaliperJaws(false)
    const before = a.caliperMeasure({ kind: 'railHeight', at: 'clamp' })
    if (!before.ok) throw new Error('measure failed')
    expect(before.reading.display_m).toBeCloseTo(0.08503, 9)
    a.setCaliperJaws(true)
    expect(a.caliperZero().ok).toBe(true)
    expect(a.caliperClosedDisplay_m()).toBe(0)
    const after = a.caliperMeasure({ kind: 'railHeight', at: 'clamp' })
    if (!after.ok) throw new Error('measure failed')
    expect(after.reading.display_m).toBeCloseTo(0.085, 9)
    expect(a.getState().caliper).toEqual({ variant: 'digital', jawsClosed: false, zeroed: true })
  })
  it('zero is refused on the vernier; seeded zero error stays within +-0.05 mm', () => {
    const a = new Apparatus({ seed: 5 })
    a.addItem('caliper'); a.setCaliperJaws(true)
    expect(reasonOf(a.caliperZero())).toBe('notDigital')
    for (let s = 1; s < 50; s++) expect(Math.abs(new Apparatus({ seed: s }).hiddenTruth().digitalZeroError_m)).toBeLessThanOrEqual(0.00005)
  })
  it('range 0..150 mm: a high rack exceeds it; a rail-scale point interpolates the height; bad point refused', () => {
    const a = mounted('E1', 0)
    a.setRackHeight_mm(25)
    const g = a.geometry()!
    const mid = a.caliperMeasure({ kind: 'railHeight', at: { railPos_mm: 600 } })
    if (!mid.ok) throw new Error('measure failed')
    expect(mid.reading.trueLength_m).toBeCloseTo(g.pose.highEnd.y_m + (g.pose.lowEnd.y_m - g.pose.highEnd.y_m) / 2, 9)
    expect(reasonOf(a.caliperMeasure({ kind: 'railHeight', at: { railPos_mm: 1300 } }))).toBe('outOfRail')
    a.setRackHeight_mm(100) // 160 mm
    expect(reasonOf(a.caliperMeasure({ kind: 'railHeight', at: 'clamp' }))).toBe('outOfRange')
  })
  it('measures the cart length (item needed) and the front reference offset', () => {
    const a = loose()
    const l = a.caliperMeasure({ kind: 'cartLength' })
    if (!l.ok) throw new Error('fail')
    expect(l.reading.trueLength_m).toBeGreaterThan(0.09)
    const f = a.caliperMeasure({ kind: 'frontReferenceOffset' })
    expect(f.ok).toBe(true)
    a.removeItem('cart')
    expect(reasonOf(a.caliperMeasure({ kind: 'cartLength' }))).toBe('itemNotOnTable')
  })
})

describe('markers', () => {
  const good = Array.from({ length: 10 }, (_, i) => 200 + 100 * i)
  it('guide layout is OK; spacing, count and AB are evaluated', () => {
    const e = evaluateMarks(good, true)
    expect(e.ok && e.abOk && e.spacingOk && e.allPositionsMatched).toBe(true)
    expect(e.ab_mm).toBe(900)
    expect(e.aRailPos_mm).toBe(200)
    const short = evaluateMarks(good.slice(0, 8), true)
    expect(short.abOk).toBe(false)
    expect(short.ok).toBe(false)
    const bad = evaluateMarks([...good.slice(0, 4), 590, ...good.slice(5)], true)
    expect(bad.spacingOk).toBe(false)
    expect(bad.matched[4]).toBe(false)
    expect(bad.matched[3]).toBe(true)
  })
  it('with the scale reversed A is the mark with the largest number', () => {
    const rev = good.map((p) => 1200 - p)
    const e = evaluateMarks(rev, false)
    expect(e.aRailPos_mm).toBe(1000)
    expect(e.ok).toBe(true)
    const a = mounted('E2')
    for (const p of rev) a.placeMarker(p)
    expect(a.evaluateMarks().ok).toBe(true)
  })
  it('placeMarker snaps to 0.5 mm, rejects duplicates and off-rail, needs tape and rail', () => {
    const a = mounted()
    expect(a.placeMarker(100.3)).toMatchObject({ ok: true, railPos_mm: 100.5 })
    expect(reasonOf(a.placeMarker(100.4))).toBe('duplicateMark')
    expect(reasonOf(a.placeMarker(-1))).toBe('outOfRail')
    expect(reasonOf(a.placeMarker(1201))).toBe('outOfRail')
    const m = a.getMarkers()[0]!
    expect(a.moveMarker(m.id, 150).ok).toBe(true)
    expect(a.getMarkers()[0]!.railPos_mm).toBe(150)
    expect(reasonOf(a.moveMarker('zz', 1))).toBe('unknownMark')
    a.removeMarker(m.id)
    expect(a.getMarkers()).toHaveLength(0)
    a.removeItem('markers')
    expect(reasonOf(a.placeMarker(100))).toBe('itemNotOnTable')
  })
})

describe('cart runs', () => {
  it('true crossing times equal physics crossingTime_s with the sampled variability', () => {
    const a = createApparatus('assembled', { seed: 9 })
    const r = a.releaseCart(1000)
    expect(r).toEqual({ ok: true, runId: 1 })
    const run = a.getRun(1)!
    // replay the run RNG stream independently
    const cond = sampleRun({ ...DEFAULT_CART, theta_rad: a.geometry()!.theta_rad }, mulberry32(9), DEFAULT_VARIABILITY)
    expect(run.conditions.releaseOffset_m).toBeCloseTo(cond.init.s_m, 15)
    expect(run.conditions.v0_mps).toBeCloseTo(cond.init.v_mps, 15)
    expect(run.marks).toHaveLength(10)
    run.marks.forEach((m, i) => {
      const exact = crossingTime_s(i * 0.1, cond.params, cond.init)!
      expect(m.trueTime_s).toBeCloseTo(exact, 12)
    })
    expect(run.marks[0]!.trueTime_s!).toBeLessThan(0.01) // mark A under the cart front
    expect(run.marks[9]!.trueTime_s!).toBeGreaterThan(2.85) // model: 2.96 s at 1.30 deg; run scatter ~0.02 s
    expect(run.marks[9]!.trueTime_s!).toBeLessThan(3.05)
  })
  it('the moving cart passes each mark at its crossing time (position consistent with times) and ends stopped at the receiver', () => {
    const a = createApparatus('assembled', { seed: 4 })
    a.releaseCart(5000)
    const run = a.getRun(1)!
    expect(a.cartState(4000).phase).toBe('rolling') // before release timestamp: still at start (t clamped to 0)
    for (const m of run.marks.slice(1)) {
      const st = a.cartState(5000 + m.trueTime_s! * 1000)
      expect(Math.abs(st.frontRailPos_mm! - m.railPos_mm)).toBeLessThan(0.05)
      expect(st.v_mps).toBeGreaterThan(0)
    }
    const end = a.cartState(5000 + 20000)
    expect(end.phase).toBe('stopped')
    expect(end.v_mps).toBe(0)
    expect(end.frontRailPos_mm).toBeCloseTo(1160, 6) // 1.2 m - 40 mm stop
    expect(run.tStop_s!).toBeGreaterThan(run.marks[9]!.trueTime_s!)
    const mid = a.cartState(5000 + run.tStop_s! * 1000 - 1)
    expect(mid.phase).toBe('rolling')
  })
  it('release rules: needs a reset after a run; reset returns the cart to its start; marks behind/beyond get null', () => {
    const a = createApparatus('assembled', { seed: 2 })
    a.releaseCart(0)
    expect(reasonOf(a.releaseCart(500))).toBe('cartMoving')
    expect(reasonOf(a.releaseCart(30000))).toBe('cartNotAtStart')
    expect(a.resetCart()).toMatchObject({ ok: true, front_railPos_mm: 200 })
    expect(a.cartState(40000).phase).toBe('atStart')
    expect(a.getRun(1)!.endedBy).toBe('placed')
    expect(a.releaseCart(40000)).toEqual({ ok: true, runId: 2 })
    expect(a.getRuns()[0]!.conditions.v0_mps).not.toBe(a.getRuns()[1]!.conditions.v0_mps)
    // start lower on the rail: marks above the cart are behind it
    a.resetCart(); a.placeCart(500)
    a.releaseCart(50000)
    const r3 = a.getRun(3)!
    expect(r3.marks.filter((m) => m.railPos_mm < 499).every((m) => m.trueTime_s === null)).toBe(true)
    expect(r3.marks.find((m) => m.railPos_mm === 600)!.trueTime_s).not.toBeNull()
  })
  it('mirrored scale (E2 in the clamp) gives the same physics with reversed printed numbers', () => {
    const a = mounted('E2', 0)
    a.setFoot_mm(0)
    a.setRackHeight_mm(25)
    for (let i = 0; i < 10; i++) a.placeMarker(1000 - 100 * i)
    a.placeCart(1000)
    expect(a.procedure().scaleOk).toBe(false)
    a.releaseCart(0)
    const run = a.getRun(1)!
    expect(run.marks[0]!.railPos_mm).toBe(1000)
    expect(run.marks[9]!.railPos_mm).toBe(100)
    expect(run.marks[9]!.trueTime_s!).toBeGreaterThan(run.marks[5]!.trueTime_s!)
    const st = a.cartState(1e6)
    expect(st.frontRailPos_mm).toBeCloseTo(40, 6)
  })
  it('a flat rail does not move the cart (static friction) and nothing crosses', () => {
    const a = mounted('E1', 0)
    a.placeMarker(300); a.placeCart(200)
    a.releaseCart(0)
    expect(a.getRun(1)!.marks[0]!.trueTime_s).toBeNull()
    expect(a.cartState(10000).phase).toBe('stuck')
    expect(a.cartState(10000).s_m).toBeCloseTo(a.getRun(1)!.conditions.releaseOffset_m, 12) // only the release offset
  })
  it('breakaway: a 0.1 deg rail (table tilt only) leaves the cart stuck, as static friction holds it', () => {
    const a = mounted('E1', 0.1)
    a.placeMarker(300); a.placeCart(200)
    a.releaseCart(0)
    expect(a.getRun(1)!.marks[0]!.trueTime_s).toBeNull()
    expect(a.cartState(20000).phase).toBe('stuck')
  })
  it('cart pose lies on the rail top surface and moves down-slope', () => {
    const a = createApparatus('assembled')
    const p0 = a.cartPose(0)!
    a.releaseCart(0)
    const p1 = a.cartPose(2000)!
    expect(p1.front.x_m).toBeGreaterThan(p0.front.x_m)
    expect(Math.hypot(p0.front.x_m - p0.rear.x_m, p0.front.y_m - p0.rear.y_m)).toBeCloseTo(0.0984, 9)
  })
})

describe('stopwatch', () => {
  it('display floors to 0.01 s (does not round) and follows the caller timestamps', () => {
    const a = createApparatus('assembled')
    expect(a.stopwatchDisplay_s(0)).toBe(0)
    a.stopwatchStartStop(1000)
    expect(a.stopwatchDisplay_s(1000 + 2999.9)).toBe(2.99)
    expect(a.stopwatchDisplay_s(1000 + 3000)).toBe(3)
    expect(a.stopwatchDisplay_s(1000 + 9)).toBe(0)
    const r = a.stopwatchStartStop(1000 + 2999.9)
    expect(r).toMatchObject({ ok: true, running: false })
    expect(a.stopwatchDisplay_s(1e9)).toBe(2.99) // frozen once stopped
    a.stopwatchStartStop(10000) // continue accumulating like a real stopwatch
    expect(a.stopwatchDisplay_s(11000)).toBeCloseTo(3.99, 9)
    a.stopwatchStartStop(11000)
    a.stopwatchReset()
    expect(a.stopwatchDisplay_s(20000)).toBe(0)
    expect(a.getState().stopwatch.running).toBe(false)
  })
  it('a stop is logged with the run, true crossing times and the start offset', () => {
    const a = createApparatus('assembled', { seed: 3 })
    a.releaseCart(10000)
    a.stopwatchStartStop(10150) // student reacts 150 ms late
    const trueT = a.getRun(1)!.marks[3]!.trueTime_s!
    const res = a.stopwatchStartStop(10000 + trueT * 1000 + 180, { markTarget: 3 })
    if (!res.ok || !res.stop) throw new Error('stop expected')
    const s = res.stop
    expect(s.runId).toBe(1)
    expect(s.markTarget).toBe(3)
    expect(s.startOffset_s).toBeCloseTo(0.15, 9)
    expect(s.reading_s).toBeCloseTo(Math.floor((trueT + 0.03) * 100) / 100, 9)
    expect(s.crossings).toHaveLength(10)
    expect(s.crossings[3]!.trueTime_s).toBeCloseTo(trueT, 12)
    expect(a.stopLog()).toHaveLength(1)
  })
  it('practice mode linkStartToRelease starts the stopwatch at the release timestamp (off by default)', () => {
    const a = createApparatus('assembled')
    expect(a.getState().stopwatch.linkStartToRelease).toBe(false)
    a.releaseCart(500)
    expect(a.getState().stopwatch.running).toBe(false)
    a.resetCart()
    a.setLinkStartToRelease(true)
    a.releaseCart(2000)
    expect(a.getState().stopwatch.running).toBe(true)
    expect(a.stopwatchDisplay_s(2000 + 1234)).toBe(1.23)
    const res = a.stopwatchStartStop(2000 + 1234)
    if (!res.ok || !res.stop) throw new Error('stop expected')
    expect(res.stop.startOffset_s).toBe(0)
    expect(a.eventLog().some((e) => e.type === 'stopwatchStart' && e.linked)).toBe(true)
  })
  it('needs the stopwatch item', () => {
    const a = new Apparatus()
    expect(a.stopwatchStartStop(0)).toEqual({ ok: false, reason: 'itemNotOnTable', item: 'stopwatch' })
  })
})

describe('Table 1.1', () => {
  it('validates typed input: comma decimals, negatives, junk, too many decimals, too large', () => {
    expect(parseTimeInput('2,96')).toEqual({ ok: true, value_s: 2.96 })
    expect(parseTimeInput(' 1.5 ')).toEqual({ ok: true, value_s: 1.5 })
    expect(parseTimeInput(3)).toEqual({ ok: true, value_s: 3 })
    expect(parseTimeInput('')).toEqual({ ok: false, reason: 'empty' })
    expect(parseTimeInput('abc')).toEqual({ ok: false, reason: 'notANumber' })
    expect(parseTimeInput('1.2.3')).toEqual({ ok: false, reason: 'notANumber' })
    expect(parseTimeInput('-1')).toEqual({ ok: false, reason: 'negative' })
    expect(parseTimeInput(-0.5)).toEqual({ ok: false, reason: 'negative' })
    expect(parseTimeInput('2.345')).toEqual({ ok: false, reason: 'tooManyDecimals' })
    expect(parseTimeInput('2.340')).toEqual({ ok: true, value_s: 2.34 })
    expect(parseTimeInput('31')).toEqual({ ok: false, reason: 'tooLarge' })
    expect(parseTimeInput(NaN)).toEqual({ ok: false, reason: 'notANumber' })
  })
  it('set, clear cell, clear all; bad cell indices; counts per position', () => {
    const a = createApparatus('assembled')
    expect(a.tableSet(3, 0, '1,71')).toEqual({ ok: true, value_s: 1.71 })
    expect(a.tableSet(3, 1, 1.69).ok).toBe(true)
    expect(reasonOf(a.tableSet(10, 0, 1))).toBe('badCell')
    expect(reasonOf(a.tableSet(0, -1, 1))).toBe('badCell')
    expect(reasonOf(a.tableSet(0, 0, 'x'))).toBe('notANumber')
    expect(a.tableData().values_s[3]!.slice(0, 3)).toEqual([1.71, 1.69, null])
    expect(a.tableData().positions_cm).toHaveLength(10)
    expect(a.procedure().recordsPerPosition[3]).toBe(2)
    a.tableClearCell(3, 0)
    expect(a.procedure().recordsPerPosition[3]).toBe(1)
    a.tableClear()
    expect(a.procedure().tableFilled).toBe(0)
  })
  it('copy-the-display remembers the run; refused while running or with no reading', () => {
    const a = createApparatus('assembled', { seed: 6 })
    expect(reasonOf(a.tableCopyDisplay(1, 0, 0))).toBe('noStopwatchReading')
    a.releaseCart(0)
    a.stopwatchStartStop(30)
    expect(reasonOf(a.tableCopyDisplay(1, 0, 500))).toBe('stopwatchRunning')
    a.stopwatchStartStop(1040)
    expect(a.tableCopyDisplay(1, 0, 9999)).toEqual({ ok: true, value_s: 1.01 })
    const c = a.tableData().cells[1]![0]!
    expect(c).toEqual({ value_s: 1.01, runId: 1, stopId: 1 })
    a.stopwatchReset()
    expect(reasonOf(a.tableCopyDisplay(1, 1, 0))).toBe('noStopwatchReading')
  })
})

describe('DigiCart record', () => {
  it('samples x(t) at 50 Hz with 1 mm resolution from release and carries the true mark times', () => {
    const a = createApparatus('assembled', { seed: 8 })
    a.releaseCart(0)
    const rec = a.digicartRecord(1)!
    expect(rec.sampleRate_Hz).toBe(50)
    expect(rec.t_s[1]! - rec.t_s[0]!).toBeCloseTo(0.02, 12)
    expect(rec.x_m[0]).toBe(0)
    for (const x of rec.x_m) expect(Math.abs(x * 1000 - Math.round(x * 1000))).toBeLessThan(1e-6) // whole mm
    const run = a.getRun(1)!
    expect(rec.marks).toEqual(run.marks)
    // each sample within 1 mm (half-step + offset reference) of the live cart position
    for (let k = 0; k < rec.t_s.length; k += 10) {
      const s = a.cartState(rec.t_s[k]! * 1000).s_m - run.conditions.releaseOffset_m
      expect(Math.abs(rec.x_m[k]! - s)).toBeLessThanOrEqual(0.0005 + 1e-9)
    }
    // last sample is the stop distance 1160 - 200 mm minus the release offset
    expect(rec.x_m[rec.x_m.length - 1]).toBeCloseTo(0.96 - run.conditions.releaseOffset_m, 3)
    expect(a.digicartRecord(99)).toBeNull()
  })
})

describe('determinism, snapshot, events', () => {
  const runTwice = (seed: number): number[] => {
    const a = createApparatus('assembled', { seed })
    const out: number[] = []
    for (let i = 0; i < 3; i++) {
      a.releaseCart(1000 * i)
      out.push(...a.getRun(i + 1)!.marks.map((m) => m.trueTime_s!))
      a.resetCart()
    }
    return out
  }
  it('same seed gives identical hidden values and runs; another seed differs', () => {
    expect(runTwice(5)).toEqual(runTwice(5))
    expect(runTwice(5)).not.toEqual(runTwice(6))
    expect(new Apparatus({ seed: 5 }).hiddenTruth()).toEqual(new Apparatus({ seed: 5 }).hiddenTruth())
    const t = new Apparatus({ seed: 5 }).hiddenTruth().tableTilt_rad
    expect(Math.abs(rad2deg(t))).toBeLessThanOrEqual(0.15)
  })
  it('snapshot round-trips through JSON and the run variability continues identically', () => {
    const a = createApparatus('assembled', { seed: 12 })
    a.releaseCart(0); a.stopwatchStartStop(10); a.stopwatchStartStop(1500); a.tableCopyDisplay(0, 0, 2000); a.resetCart()
    const snap = JSON.parse(JSON.stringify(a.snapshot()))
    const b = new Apparatus({ seed: 99 })
    expect(b.load(snap).ok).toBe(true)
    expect(b.tableData()).toEqual(a.tableData())
    expect(b.cartState(500).phase).toBe('atStart')
    a.releaseCart(5000); b.releaseCart(5000)
    expect(b.getRun(2)).toEqual(a.getRun(2))
    expect(b.digicartRecord(1)).toEqual(a.digicartRecord(1)) // rebuilt from the stored conditions
    expect(b.hiddenTruth()).toEqual(a.hiddenTruth())
    expect(b.procedure()).toEqual(a.procedure())
    expect(reasonOf(b.load({ ...snap, version: 2 }))).toBe('badSnapshot')
  })
  it('reset clears the bench but keeps the hidden values; events are typed, ordered and observable', () => {
    const a = new Apparatus({ seed: 3 })
    const seen: string[] = []
    const off = a.on((e) => seen.push(e.type))
    a.addItem('rail'); a.addItem('cart'); a.placeCart(5)
    off(); a.addItem('level')
    expect(seen).toEqual(['itemAdded', 'itemAdded', 'refused'])
    expect(a.eventLog().map((e) => e.seq)).toEqual([1, 2, 3, 4])
    const hidden = a.hiddenTruth()
    a.reset()
    expect(a.eventLog()).toEqual([])
    expect(a.hiddenTruth()).toEqual(hidden)
  })
  it('procedure() flags a wrong set-up: reversed scale, shallow angle, short marks, cart not at A', () => {
    const a = mounted('E2', 0)
    a.setRackHeight_mm(10)
    for (let i = 0; i < 6; i++) a.placeMarker(1000 - 100 * i)
    a.placeCart(900)
    const p = a.procedure()
    expect(p.scaleOk).toBe(false)
    expect(p.angleOk).toBe(false)
    expect(p.theta_rad!).toBeLessThan(deg2rad(1.3))
    expect(p.marksOk).toBe(false)
    expect(p.cart.atZero).toBe(false)
    expect(p.levelledBeforeRaise).toBe(false)
    expect(p.tableComplete).toBe(false)
  })
})
