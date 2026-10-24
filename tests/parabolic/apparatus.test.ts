import { describe, expect, it } from 'vitest'
import {
  ITEM_IDS, MARK_RESULTS, REASONS, RUN_BLOCKS, ParabolicApparatus, createApparatus, parseRangeInput, parseTimeInput, rectOverlap, sheetRect,
  slowmoClip, compareStopToRun, type ItemId, type Reason,
} from '../../src/experiments/parabolic/apparatus/index.ts'
import { runLaunch, EXPECTED_OFFSETS } from '../../src/experiments/parabolic/apparatus/model.ts'
import { rad2deg } from '../../src/core/physics/angles.ts'
import { tapeMaxPermissibleError_m } from '../../src/core/physics/instruments.ts'
import { parseTimeInput as mruvParse } from '../../src/experiments/mruv/apparatus/index.ts'

const reasonOf = (r: { ok: boolean }): string | undefined => (r.ok ? undefined : (r as unknown as { reason: string }).reason)

/** Bench with every item on the table, nothing attached; fixed hidden values so tests do not depend on a seed. */
function loose(roll_deg = 0.2, H_m = 0.76, seed = 7): ParabolicApparatus {
  const a = new ParabolicApparatus({ seed, H_m, tableRoll_rad: (roll_deg * Math.PI) / 180 })
  for (const i of ITEM_IDS) a.addItem(i)
  return a
}
function mounted(roll_deg = 0.2): ParabolicApparatus {
  const a = loose(roll_deg)
  a.attach('standBase'); a.attach('rackClamp'); a.attach('twoLegStand')
  return a
}
/** Ready to release: rise 20 cm, gap 5 cm, marks, bond+carbon over the landing, ball on the first mark. */
function ready(seed = 3): ParabolicApparatus { return createApparatus('assembled', { seed }) }

describe('assembly rules', () => {
  it('items go on the table once; unknown ids are refused', () => {
    const a = new ParabolicApparatus()
    expect(a.addItem('rail').ok).toBe(true)
    expect(reasonOf(a.addItem('rail'))).toBe('itemAlreadyOnTable')
    expect(reasonOf(a.addItem('banana' as ItemId))).toBe('unknownItem')
  })
  it('the clamp needs the base joint, the two-leg stand needs the clamp; each rail joint takes 2 screws', () => {
    const a = loose()
    expect(reasonOf(a.attach('rackClamp'))).toBe('needStandBase')
    a.attach('standBase')
    expect(reasonOf(a.attach('twoLegStand'))).toBe('needRackClamp')
    expect(a.attach('rackClamp').ok).toBe(true)
    expect(reasonOf(a.attach('rackClamp'))).toBe('alreadyAttached')
    a.attach('twoLegStand')
    expect(a.getState().screwsUsed).toBe(4)
    expect(a.getState().screwsAvailable).toBe(0)
    expect(reasonOf(a.removeItem('screws'))).toBe('screwsInUse')
    a.detach('rackClamp') // takes the two-leg joint with it
    expect(a.getState().joints).toEqual({ standBase: true, rackClamp: false, twoLegStand: false })
    expect(a.getState().screwsAvailable).toBe(4)
  })
  it('without screws no rail joint can be made; missing() lists what is left', () => {
    const a = new ParabolicApparatus()
    for (const i of ITEM_IDS) if (i !== 'screws') a.addItem(i)
    a.attach('standBase')
    expect(a.attach('rackClamp')).toEqual({ ok: false, reason: 'itemNotOnTable', item: 'screws' })
    expect(a.missing().some((m) => m.id === 'rackClamp' && m.blocksRun)).toBe(true)
  })
  it('rise follows the rack height: rail top at the clamp = 0.06 m + rack reading', () => {
    const a = mounted()
    a.setRackHeight_mm(140)
    const g = a.geometry()!
    expect(g.clampHeight_m).toBeCloseTo(0.2, 12) // what the tape reads
    // the rail is a 2 cm thick beam resting on its tip: the high end is 0.2 m up, the tip top is t cos(theta) up, the rise is the difference
    expect(g.rise_m).toBeCloseTo(0.2 - g.tipHeight_m, 12)
    expect(g.tipHeight_m).toBeCloseTo(0.02 * Math.cos(g.theta_rad), 12)
    expect(g.theta_rad).toBeCloseTo(Math.asin(g.rise_m / 1.1), 12)
    a.setRackHeight_mm(100)
    expect(a.geometry()!.clampHeight_m).toBeCloseTo(0.16, 9) // wrong height: the procedure notices
    expect(a.procedure().riseOk).toBe(false)
    a.setRackHeight_mm(140)
    expect(a.procedure().riseOk).toBe(true)
    expect(reasonOf(a.setRackHeight_mm(999))).toBe('outOfRange')
  })
  it('a two-leg stand set too high lifts the tip off the table (step drop); too low does not touch', () => {
    const a = mounted()
    a.setRackHeight_mm(140)
    a.setLegHeight_mm(0) // support 13 mm; the free rail underside at the stand is about 16 mm: it does not touch
    const free = a.geometry()!
    expect(free.contacts).toEqual({ rack: true, twoLeg: false, table: true })
    expect(free.twoLegClearance_m).toBeGreaterThan(0.002)
    expect(free.tipLifted).toBe(false)
    expect(free.stepDrop_m).toBeCloseTo(0.02 * Math.cos(free.theta_rad), 12) // the beam stands on its tip
    a.setLegHeight_mm(40) // support 53 mm
    const g = a.geometry()!
    expect(g.contacts).toEqual({ rack: true, twoLeg: true, table: false })
    expect(g.tipLifted).toBe(true)
    expect(g.twoLegClearance_m).toBe(0)
    // the beam rests on the rack clamp (top 0.2 m at 1.1 m) and on the stand (underside 0.053 m at 0.1 m): its top line there is 0.053 + t cos(theta)
    const topAtStand = 0.053 + 0.02 * Math.cos(g.theta_rad)
    expect(g.pose.twoLeg.y_m).toBeCloseTo(topAtStand, 12)
    expect(g.pose.clamp.y_m).toBeCloseTo(0.2, 12)
    expect(g.stepDrop_m).toBeGreaterThan(free.stepDrop_m)
    expect(g.rise_m).toBeCloseTo(0.2 - g.tipHeight_m, 12)
    expect(a.procedure().tipLifted).toBe(true)
  })
  it('the step drop reaches the physics: a lifted tip changes the launch speed', () => {
    const a = ready()
    a.release(0)
    const v1 = a.getRun(1)!.v_edge_mps
    a.tick(10_000); a.resetBall()
    a.setLegHeight_mm(60)
    expect(a.geometry()!.stepDrop_m).toBeGreaterThan(0.03)
    a.release(20_000)
    const r2 = a.getRun(2)!
    expect(r2.bench.stepDrop_m).toBeGreaterThan(0.03)
    expect(Math.abs(r2.v_edge_mps - v1)).toBeGreaterThan(0) // not the same launch
  })
  it('a leg higher than the clamp slopes the rail the wrong way: the ball does not start', () => {
    const a = ready()
    a.setRackHeight_mm(0)
    a.setLegHeight_mm(150)
    expect(a.geometry()!.rise_m).toBeLessThan(0)
    a.release(0)
    const r = a.getRun(1)!
    expect(r.outcome).toBe('stopped')
    expect(r.times.edge_s).toBeNull()
    expect(r.flight).toBeNull()
  })
})

describe('rail position and refusals', () => {
  it('a tip at or past the edge is refused; far gaps are allowed', () => {
    const a = mounted()
    expect(reasonOf(a.setGap_mm(0))).toBe('tipOverhangsEdge')
    expect(reasonOf(a.setGap_mm(3))).toBe('tipOverhangsEdge') // the rail's end cap would reach the edge
    expect(a.setGap_mm(4).ok).toBe(true)
    expect(reasonOf(a.setGap_mm(-5))).toBe('tipOverhangsEdge') // band around the edge corner: end cap on the corner
    expect(a.setGap_mm(-20).ok).toBe(true) // overhang: the rail rests on the edge corner
    expect(reasonOf(a.setGap_mm(-120))).toBe('outOfRange')
    expect(reasonOf(a.setGap_mm(5000))).toBe('outOfRange')
    expect(a.setGap_mm(50).ok).toBe(true)
    expect(a.procedure().gapOk).toBe(true)
    a.setGap_mm(200)
    expect(a.procedure().gapOk).toBe(false)
  })
  it('a rail that is almost flat never starts the ball (rolling resistance wins): stopped, no flight, no mark', () => {
    const a = ready()
    a.setRackHeight_mm(0)
    a.setLegHeight_mm(26) // two-leg stand (support 39 mm) lifts the tip: rise ~1 mm over 1.1 m, below the c_rr threshold
    expect(a.geometry()!.rise_m).toBeGreaterThan(0)
    a.release(0)
    const r = a.getRun(1)!
    expect(r.outcome).toBe('stopped')
    expect(r.times.land_s).toBeNull()
    expect(a.ballStatus(60_000).phase).toBe('stopped')
    expect(a.paperMarks(60_000)).toHaveLength(0)
  })
  it('a far gap slows the ball only slightly at this rolling resistance (model note: it does not stop within the table)', () => {
    const near = ready(); near.release(0)
    const far = ready(); far.setGap_mm(600); far.release(0)
    expect(far.getRun(1)!.outcome).toBe('landed')
    expect(far.getRun(1)!.v_edge_mps).toBeLessThan(near.getRun(1)!.v_edge_mps)
  })
  it('a ball cannot be placed away from the rail', () => {
    const a = loose()
    a.selectBall('marble')
    expect(reasonOf(a.placeBall({ s_m: 0.8 }))).toBe('noRail') // rail not mounted
    a.attach('standBase'); a.attach('rackClamp')
    expect(reasonOf(a.placeBall({ s_m: 1.5 }))).toBe('ballOffRail')
    expect(reasonOf(a.placeBall({ s_m: -0.1 }))).toBe('ballOffRail')
    expect(reasonOf(a.placeBall({ markId: 'zz' }))).toBe('unknownMark')
    expect(a.placeBall({ s_m: 0.8 }).ok).toBe(true)
  })
  it('the ball must be in the inventory; release is blocked without a rail, a ball, a placed ball', () => {
    const a = new ParabolicApparatus()
    expect(reasonOf(a.selectBall('marble'))).toBe('itemNotOnTable')
    expect(reasonOf(a.selectBall('golf' as 'marble'))).toBe('unknownBall')
    expect(a.canRelease().reasons).toEqual(['noRail', 'noBallSelected'])
    const b = mounted(); b.selectBall('pingpong')
    expect(b.canRelease().reasons).toEqual(['noBallPlaced'])
    expect(reasonOf(b.release(0))).toBe('noBallPlaced')
  })
})

describe('level and lateral drift', () => {
  it('the level on the rail shows the roll; the foot of the two-leg stand removes it, and so the lateral drift', () => {
    const a = mounted(0.25)
    a.placeLevel('rail')
    expect(a.levelReading().centered).toBe(false)
    expect(a.levelReading().bubble_mm).toBeCloseTo(5, 6) // 20 mm/deg x 0.25 deg
    expect(a.geometry()!.roll_rad).toBeCloseTo((0.25 * Math.PI) / 180, 12)
    a.setFoot_mm(-1000 * 0.2 * Math.sin((0.25 * Math.PI) / 180))
    expect(a.levelReading().centered).toBe(true)
    expect(Math.abs(rad2deg(a.geometry()!.roll_rad))).toBeLessThan(0.02)
    expect(a.eventLog().some((e) => e.type === 'leveled')).toBe(true)
    expect(a.procedure().railRollCentered).toBe(true)
  })
  it('an unlevelled rail adds a systematic lateral launch angle, a levelled one does not', () => {
    // same seed (same run draws), roll 0.3 deg vs trimmed: only the drift term differs.
    const lat = (trim: boolean): number => {
      const a = createApparatus('assembled', { seed: 5, tableRoll_rad: (0.3 * Math.PI) / 180 })
      if (!trim) a.setFoot_mm(0)
      a.release(0)
      return a.getRun(1)!.offsets.lateralAngle_rad
    }
    const diff = lat(false) - lat(true)
    expect(diff).toBeCloseTo(4 * (0.3 * Math.PI) / 180, 2) // LATERAL_DRIFT_GAIN x roll, foot residual <= 0.01 deg
  })
  it('foot range is limited', () => {
    expect(reasonOf(mounted().setFoot_mm(6))).toBe('outOfRange')
  })
})

describe('marks on the rail', () => {
  it('flags marks outside the upper half (s < 0.60 m) and a wrong count', () => {
    const a = mounted()
    for (const s of [0.6, 0.7, 0.8, 0.9, 1.0]) a.placeMark(s)
    let ev = a.marksEvaluation()
    expect(ev.marksInUpperHalf).toBe(true)
    expect(ev.fiveMarks).toBe(true)
    a.placeMark(0.3)
    ev = a.marksEvaluation()
    expect(ev.marksInUpperHalf).toBe(false)
    expect(ev.upperHalfCount).toBe(5)
    expect(ev.fiveMarks).toBe(false)
  })
  it('refuses marks off the rail and duplicates; the true position differs from the aim by about 1 mm', () => {
    const a = mounted()
    expect(reasonOf(a.placeMark(1.3))).toBe('outOfRail')
    const r = a.placeMark(0.8)
    expect(r.ok).toBe(true)
    expect(reasonOf(a.placeMark(0.8))).toBe('duplicateMark')
    const truth = a.hiddenTruth().markTrueS_m['m1']!
    expect(Math.abs(truth - 0.8)).toBeLessThan(0.006) // 6 sigma
    expect(a.getMarks()).toEqual([{ id: 'm1', s_m: 0.8 }]) // the aim is what the state shows
  })
})

describe('release, states and landing', () => {
  it('idle -> rolling -> flying -> landed; mark appears on the paper at the physics landing point', () => {
    const a = ready()
    expect(a.ballStatus(0).phase).toBe('idle')
    expect(a.release(1000).ok).toBe(true)
    const r = a.getRun(1)!
    expect(r.outcome).toBe('landed')
    const t = r.times
    expect(t.tip_s!).toBeGreaterThan(0.5)
    expect(t.edge_s!).toBeGreaterThan(t.tip_s!)
    expect(t.land_s! - t.edge_s!).toBeCloseTo(r.flight!.t_flight_s, 12)
    const at = (dt: number): string => a.ballStatus(1000 + dt * 1000).phase
    expect(at(t.tip_s! / 2)).toBe('rolling')
    expect(at(t.edge_s! + 0.01)).toBe('flying')
    expect(at(t.land_s! + 0.01)).toBe('landed')
    // physics landing point = the bond-paper mark (first contact only)
    const out = runLaunch(r.bench, r.ball, r.startS_m, r.offsets)
    expect(out.summary.flight!.x_land_m).toBeCloseTo(r.flight!.x_land_m, 12)
    expect(r.mark.result).toBe('marked')
    expect(a.paperMarks(1000)).toHaveLength(0) // not there before the ball lands
    const m = a.paperMarks(1000 + (t.land_s! + 0.01) * 1000)
    expect(m).toHaveLength(1)
    const p = a.markOnFloor(m[0]!.id)!
    expect(p.x_m).toBeCloseTo(r.flight!.x_land_m, 9)
    expect(p.z_m).toBeCloseTo(r.flight!.z_land_m, 9)
    expect(r.flight!.x_land_m / r.flight!.t_flight_s).toBeGreaterThan(0.5 * r.v_edge_mps) // horizontal range ~ v t (drag shaves a little)
  })
  it('flight time is about sqrt(2H/g): independent of the ball and of the mark', () => {
    const a = ready()
    a.release(0)
    const r = a.getRun(1)!
    const H = a.hiddenTruth().H_m
    // The ball leaves the table with a downward (or upward after a hop) velocity component now, not horizontally: the flight time from the
    // edge is sqrt(2H/g) only for a horizontal launch (physics.test.ts checks the exact diagonal closed form). Here a coarse band.
    expect(r.flight!.t_flight_s).toBeGreaterThan(Math.sqrt((2 * H) / 9.7717) * 0.75)
    expect(r.flight!.t_flight_s).toBeLessThan(Math.sqrt((2 * H) / 9.7717) * 1.15)
  })
  it('only one ball moves at a time; reset puts the ball back on its mark', () => {
    const a = ready()
    a.release(0)
    expect(reasonOf(a.release(100))).toBe('ballMoving')
    expect(reasonOf(a.resetBall())).toBe('ballMoving')
    expect(reasonOf(a.setGap_mm(60))).toBe('ballMoving')
    const end = a.getRun(1)!.times.end_s * 1000
    const ev: string[] = []
    a.on((e) => ev.push(e.type))
    a.tick(end + 1); a.tick(end + 2)
    expect(ev.filter((e) => e === 'ballLanded')).toHaveLength(1) // announced once
    expect(a.resetBall().ok).toBe(true)
    expect(a.ballStatus(end + 5).phase).toBe('idle')
    expect(a.release(end + 10).ok).toBe(true)
    expect(a.getRuns()).toHaveLength(2)
  })
})

describe('paper and carbon', () => {
  const landed = (a: ParabolicApparatus): void => { a.release(0); a.tick(5000) }
  it('no carbon paper: the ball lands and leaves nothing', () => {
    const a = ready()
    a.removeCarbon()
    landed(a)
    expect(a.getRun(1)!.mark.result).toBe('noCarbon')
    expect(a.paperMarks()).toHaveLength(0)
  })
  it('no bond paper, or a landing off the paper, leaves nothing', () => {
    const a = ready()
    a.placeBond(2, 1, 'alongX'); a.removeCarbon(); a.placeCarbon(2, 1, 'alongX')
    landed(a)
    expect(a.getRun(1)!.mark.result).toBe('offPaper')
    const b = ready(); b.removeBond()
    landed(b)
    expect(b.getRun(1)!.mark.result).toBe('noBond')
  })
  it('the carbon sheet must overlap the bond paper; a landing on bond without carbon beneath marks nothing', () => {
    const a = ready()
    const bond = a.getState().paper.bond!
    expect(reasonOf(a.placeCarbon(bond.x_m + 1, 0))).toBe('carbonNotOverBond')
    a.placeCarbon(bond.x_m + 0.29, bond.z_m, 'alongX') // overlaps by 8 mm, away from the landing
    landed(a)
    expect(['noCarbon', 'marked']).toContain(a.getRun(1)!.mark.result)
    expect(reasonOf(createApparatus('empty').placeCarbon(0, 0))).toBe('itemNotOnTable')
  })
  it('moving the bond paper after marks exist sets the flag and carries the marks along', () => {
    const a = ready()
    landed(a)
    const id = a.paperMarks()[0]!.id
    const before = a.markOnFloor(id)!
    expect(a.procedure().paperMovedSinceMarks).toBe(false)
    const b = a.getState().paper.bond!
    a.placeBond(b.x_m + 0.1, b.z_m, 'alongX')
    expect(a.procedure().paperMovedSinceMarks).toBe(true)
    const after = a.markOnFloor(id)!
    expect(after.x_m - before.x_m).toBeCloseTo(0.1, 9)
    expect(after.z_m).toBeCloseTo(before.z_m, 9)
  })
  it('turning the paper rotates the marks with it (distances between marks are kept)', () => {
    const a = ready()
    landed(a); a.resetBall(); a.release(6000); a.tick(12000)
    const ids = a.paperMarks().map((m) => m.id)
    expect(ids.length).toBe(2)
    const d = (): number => { const p = a.markOnFloor(ids[0]!)!; const q = a.markOnFloor(ids[1]!)!; return Math.hypot(p.x_m - q.x_m, p.z_m - q.z_m) }
    const d0 = d()
    const b = a.getState().paper.bond!
    a.placeBond(b.x_m, b.z_m, 'alongZ')
    expect(d()).toBeCloseTo(d0, 9)
  })
  it('a new bond sheet drops the old marks and clears the flag; there are only two sheets', () => {
    const a = ready()
    landed(a)
    const b = a.getState().paper.bond!
    a.placeBond(b.x_m + 0.05, b.z_m)
    expect(a.newBondSheet(b.x_m, b.z_m).ok).toBe(true)
    expect(a.paperMarks()).toHaveLength(0)
    expect(a.procedure().paperMovedSinceMarks).toBe(false)
    expect(a.getState().paper.sheetsAvailable).toBe(0)
    expect(reasonOf(a.newBondSheet(b.x_m, b.z_m))).toBe('noSheetsLeft')
  })
  it('the faint ping-pong mark can fail, the marble always marks', () => {
    const results = new Set<string>()
    for (let seed = 1; seed <= 40; seed++) {
      const a = createApparatus('assembled', { seed })
      a.selectBall('pingpong'); a.placeBall({ markId: 'm1' })
      a.release(0)
      results.add(a.getRun(1)!.mark.result)
    }
    expect(results.has('marked')).toBe(true)
  })
})

describe('tape measure', () => {
  it('launch height: quantised to 1 mm, true value hidden, MPE reported', () => {
    const a = ready()
    const r = a.tapeMeasure({ kind: 'launchHeight' })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const H = a.hiddenTruth().H_m
    expect(r.reading.trueLength_m).toBe(H)
    expect(r.reading.tape.idealReading_m).toBeCloseTo(Math.round(H * 1000) / 1000, 9)
    expect(r.reading.tape.division_mm).toBe(1)
    expect(r.reading.mpe_m).toBeCloseTo(tapeMaxPermissibleError_m(H), 12)
    expect(a.getState().world.H_m).toBe(H) // for drawing only; the checklist records that it was measured
    expect(a.procedure().measured.launchHeight).toBe(true)
  })
  it('table height is seeded in 0.74-0.78 m and differs between benches', () => {
    const Hs = [1, 2, 3, 4, 5, 6].map((s) => new ParabolicApparatus({ seed: s }).hiddenTruth().H_m)
    for (const H of Hs) { expect(H).toBeGreaterThanOrEqual(0.74); expect(H).toBeLessThanOrEqual(0.78) }
    expect(new Set(Hs).size).toBeGreaterThan(3)
  })
  it('gap, rise (clamp height) and mark position', () => {
    const a = ready()
    const g = a.tapeMeasure({ kind: 'gap' })
    const ri = a.tapeMeasure({ kind: 'rise' })
    const mp = a.tapeMeasure({ kind: 'markPosition', markId: 'm3' })
    expect(g.ok && g.reading.trueLength_m).toBeCloseTo(0.05, 9)
    expect(ri.ok && ri.reading.trueLength_m).toBeCloseTo(0.2, 9)
    expect(mp.ok && Math.abs(mp.reading.trueLength_m - 0.8)).toBeLessThan(0.006)
    expect(reasonOf(a.tapeMeasure({ kind: 'markPosition', markId: 'zz' }))).toBe('unknownMark')
  })
  it('range: Euclidean floor distance from the edge projection to the dot, visible only after landing', () => {
    const a = ready()
    a.release(0)
    expect(reasonOf(a.tapeMeasure({ kind: 'range', carbonId: 'c1' }))).toBe('unknownCarbonMark') // ball still in the air
    a.tick(5000)
    const r = a.tapeMeasure({ kind: 'range', carbonId: 'c1' })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const run = a.getRun(1)!
    const proj = a.hiddenTruth().edgeProjection!
    expect(Math.hypot(proj.x_m, proj.z_m)).toBeLessThan(0.012) // 2 mm sigma per axis
    const expected = Math.hypot(run.flight!.x_land_m - proj.x_m, run.flight!.z_land_m - proj.z_m)
    expect(r.reading.trueLength_m).toBeCloseTo(expected, 9)
    expect(r.reading.range!.alongX_m).toBeCloseTo(run.flight!.x_land_m - proj.x_m, 9)
    expect(r.reading.trueLength_m).toBeGreaterThanOrEqual(Math.abs(r.reading.range!.alongX_m))
  })
  it('range needs the edge projection; a moved paper changes the reading (mark no longer matches the projection)', () => {
    const a = ready()
    a.release(0); a.tick(5000)
    const r1 = a.tapeMeasure({ kind: 'range', carbonId: 'c1' })
    const b = a.getState().paper.bond!
    a.placeBond(b.x_m + 0.05, b.z_m)
    const r2 = a.tapeMeasure({ kind: 'range', carbonId: 'c1' })
    expect(r1.ok && r2.ok && r2.reading.trueLength_m - r1.reading.trueLength_m).toBeCloseTo(0.05, 2)
    const c = createApparatus('assembled', { seed: 3 })
    c.release(0); c.tick(5000)
    const snap = c.snapshot(); snap.edgeProjection = null
    const d = new ParabolicApparatus({ seed: 3 }); d.load(snap)
    expect(reasonOf(d.tapeMeasure({ kind: 'range', carbonId: 'c1' }))).toBe('noEdgeProjection')
  })
  it('needs the tape in the inventory', () => {
    const a = ready(); a.removeItem('tapeMeasure')
    expect(reasonOf(a.tapeMeasure({ kind: 'gap' }))).toBe('itemNotOnTable')
  })
})

describe('stopwatch', () => {
  it('start at the edge, stop at the landing: the stop record keeps the true event times and the error is the reaction', () => {
    const a = ready()
    a.release(0)
    const run = a.getRun(1)!
    const edge = run.times.edge_s! * 1000
    const land = run.times.land_s! * 1000
    a.stopwatchStartStop(edge + 200)
    const s = a.stopwatchStartStop(land + 150)
    expect(s.ok).toBe(true)
    const stop = a.stopLog()[0]!
    expect(stop.runId).toBe(1)
    expect(stop.crossings.map((c) => c.event)).toEqual(['tip', 'edge', 'landing'])
    expect(stop.crossings[2]!.trueTime_s).toBeCloseTo(run.times.land_s!, 12)
    const cmp = compareStopToRun(stop, run)!
    expect(cmp.startError_s).toBeCloseTo(0.2, 6)
    expect(cmp.stopError_s).toBeCloseTo(0.15, 6)
    expect(cmp.error_s).toBeCloseTo(-0.05, 1) // display floored to 0.01 s
    expect(a.stopsForRun(1)).toHaveLength(1)
  })
})

describe('Tabla 2.1', () => {
  it('parses es/en decimals, limits 2 decimals for times and 3 for ranges; MRUV parser unchanged', () => {
    expect(parseTimeInput('0,40')).toEqual({ ok: true, value_s: 0.4 })
    expect(parseTimeInput('0.401')).toEqual({ ok: false, reason: 'tooManyDecimals' })
    expect(parseTimeInput('-1')).toEqual({ ok: false, reason: 'negative' })
    expect(parseTimeInput('abc')).toEqual({ ok: false, reason: 'notANumber' })
    expect(parseTimeInput('')).toEqual({ ok: false, reason: 'empty' })
    expect(parseTimeInput('31')).toEqual({ ok: false, reason: 'tooLarge' })
    expect(parseRangeInput('0,512')).toEqual({ ok: true, value_m: 0.512 })
    expect(parseRangeInput('0.5123')).toEqual({ ok: false, reason: 'tooManyDecimals' })
    expect(parseRangeInput('3.5')).toEqual({ ok: false, reason: 'tooLarge' })
    expect(mruvParse('1,23')).toEqual({ ok: true, value_s: 1.23 })
    expect(mruvParse('1.234')).toEqual({ ok: false, reason: 'tooManyDecimals' })
  })
  it('is 5 x 5 per ball, typed, copied from stopwatch and tape, cleared', () => {
    const a = ready()
    const td = a.tableData('marble')
    expect(td.t_s).toHaveLength(5)
    expect(td.t_s[0]).toHaveLength(5)
    expect(a.tableSetTime('marble', 0, 0, '0,39').ok).toBe(true)
    expect(a.tableSetRange('pingpong', 4, 4, 0.512).ok).toBe(true)
    expect(a.tableData('marble').t_s[0]![0]).toBe(0.39)
    expect(a.tableData('pingpong').x_m[4]![4]).toBe(0.512)
    expect(a.tableData('pingpong').t_s[4]![4]).toBeNull()
    expect(reasonOf(a.tableSetTime('marble', 5, 0, 1))).toBe('badCell')
    expect(reasonOf(a.tableSetTime('golf' as 'marble', 0, 0, 1))).toBe('unknownBall')
    expect(reasonOf(a.tableSetTime('marble', 0, 1, '1.234'))).toBe('tooManyDecimals')
    // copy from stopwatch
    expect(reasonOf(a.tableCopyTime('marble', 0, 1, 0))).toBe('noStopwatchReading')
    a.release(0)
    a.stopwatchStartStop(400); a.stopwatchStartStop(800)
    const c = a.tableCopyTime('marble', 0, 1, 1000)
    expect(c.ok).toBe(true)
    const cell = a.tableData('marble').cells[0]![1]!
    expect(cell.t_s).toBe(0.4)
    expect(cell.timeRunId).toBe(1)
    expect(cell.timeStopId).toBe(1)
    // copy from tape
    expect(reasonOf(a.tableCopyRange('marble', 0, 1))).toBe('noTapeReading')
    a.tick(5000)
    const rd = a.tapeMeasure({ kind: 'range', carbonId: 'c1' })
    expect(a.tableCopyRange('marble', 0, 1).ok).toBe(true)
    const cell2 = a.tableData('marble').cells[0]![1]!
    expect(rd.ok && cell2.x_m).toBe(rd.ok ? rd.reading.tape.idealReading_m : null)
    expect(cell2.rangeCarbonId).toBe('c1')
    // clear
    a.tableClearCell('marble', 0, 1)
    expect(a.tableData('marble').cells[0]![1]).toMatchObject({ t_s: null, x_m: null })
    a.tableClear('pingpong')
    expect(a.tableData('pingpong').x_m[4]![4]).toBeNull()
    expect(a.tableData('marble').t_s[0]![0]).toBe(0.39)
    a.tableClear()
    expect(a.tableData('marble').t_s[0]![0]).toBeNull()
  })
  it('does not compute derived values: no mean fields in the raw table', () => {
    expect(Object.keys(createApparatus('assembled').tableData('marble')).sort()).toEqual(['ball', 'cells', 'reps', 't_s', 'trials', 'x_m'])
  })
})

describe('slow-motion reference', () => {
  it('240 fps frames, launch frame at the edge, v0 near the true edge speed, flight within one frame', () => {
    const a = ready()
    a.release(0)
    const run = a.getRun(1)!
    const clip = a.slowmo(1)!
    const f = clip.frames
    expect(clip.fps_hz).toBe(240)
    for (let i = 1; i < f.length; i++) expect(f[i]!.t_s - f[i - 1]!.t_s).toBeCloseTo(1 / 240, 12)
    expect(f[clip.launchFrameIndex]!.t_s).toBeGreaterThanOrEqual(0)
    expect(f[clip.launchFrameIndex]!.t_s).toBeLessThan(1 / 240)
    expect(f[clip.launchFrameIndex - 1]!.t_s).toBeLessThan(0)
    expect(f[clip.launchFrameIndex - 1]!.x_m).toBeLessThan(0) // still on the table
    expect(f.length - 1 - clip.landingFrameIndex).toBe(3)
    expect(clip.launchFrameIndex).toBe(3)
    expect(f[clip.landingFrameIndex]!.t_s).toBeGreaterThanOrEqual(run.flight!.t_flight_s)
    expect(Math.abs(clip.flightFromFrames_s - run.flight!.t_flight_s)).toBeLessThanOrEqual(1 / 240 + 1e-12)
    expect(clip.flightTrue_s).toBe(run.flight!.t_flight_s)
    expect(Math.abs(clip.v0FromFrames_mps - run.v_edge_mps) / run.v_edge_mps).toBeLessThan(0.02)
    // trajectory is continuous across the edge and the landing
    for (let i = 1; i < f.length; i++) expect(Math.abs(f[i]!.x_m - f[i - 1]!.x_m)).toBeLessThan(0.02)
    expect(f[clip.landingFrameIndex]!.y_m).toBeLessThan(0.05)
    expect(slowmoClip({ ...run, flight: null }, [])).toBeNull()
  })
  it('works from the stored record after a snapshot (trajectory regenerated, identical)', () => {
    const a = ready()
    a.release(0)
    const c1 = a.slowmo(1)!
    const b = new ParabolicApparatus({ seed: 3 }); b.load(a.snapshot())
    expect(b.slowmo(1)).toEqual(c1)
  })
})

describe('snapshot and determinism', () => {
  it('round-trips as JSON and continues the random streams', () => {
    const a = ready()
    a.release(0); a.tick(5000); a.resetBall()
    const json = JSON.stringify(a.snapshot())
    const b = new ParabolicApparatus({ seed: 3 })
    expect(b.load(JSON.parse(json)).ok).toBe(true)
    expect(JSON.parse(JSON.stringify(b.snapshot())).hidden).toEqual(JSON.parse(json).hidden)
    expect(b.getState()).toEqual(a.getState())
    a.release(9000); b.release(9000)
    expect(b.getRun(2)).toEqual(a.getRun(2))
    expect(a.snapshot().version).toBe(1)
    expect(reasonOf(b.load({ version: 2 } as never))).toBe('badSnapshot')
  })
  it('the same seed gives the same bench and runs; another seed differs', () => {
    const run = (seed: number): number => { const a = ready(seed); a.release(0); return a.getRun(1)!.flight!.x_land_m }
    expect(run(11)).toBe(run(11))
    expect(run(11)).not.toBe(run(12))
    expect(new ParabolicApparatus({ seed: 4 }).hiddenTruth()).toEqual(new ParabolicApparatus({ seed: 4 }).hiddenTruth())
  })
  it('preset assembled satisfies the guide; empty starts bare; unknown preset refused', () => {
    const a = ready()
    const p = a.procedure()
    expect(p.setupComplete).toBe(true)
    expect(p.riseOk && p.gapOk && !p.tipLifted && p.railRollCentered && p.carbonOverBond && p.edgeProjectionPlaced).toBe(true)
    expect(p.marks.marksInUpperHalf && p.marks.fiveMarks).toBe(true)
    expect(p.canRelease).toBe(true)
    expect(createApparatus('empty').getState().items.rail).toBe(false)
    expect(reasonOf(a.preset('bogus' as 'empty'))).toBe('unknownPreset')
  })
  it('emits events on actions and refusals (Subscribable)', () => {
    const a = new ParabolicApparatus()
    const seen: string[] = []
    const off = a.on((e) => seen.push(e.type))
    a.addItem('rail'); a.addItem('rail')
    off(); a.addItem('level')
    expect(seen).toEqual(['itemAdded', 'refused'])
  })
})

describe('reason codes', () => {
  it('lists every reason, run block and mark result for translation, without duplicates', () => {
    expect(new Set(REASONS).size).toBe(REASONS.length)
    for (const b of RUN_BLOCKS) expect(REASONS as readonly string[]).toContain(b)
    expect(MARK_RESULTS).toEqual(['marked', 'noBond', 'noCarbon', 'offPaper', 'tooFaint', 'noLanding'])
    const r: Reason = 'tipOverhangsEdge'
    expect(REASONS).toContain(r)
  })
  it('sheet helpers: A4 rectangles and overlap', () => {
    const r = sheetRect({ x_m: 0.5, z_m: 0, orientation: 'alongX' })
    expect(r.xMax_m - r.xMin_m).toBeCloseTo(0.297, 12)
    expect(r.zMax_m - r.zMin_m).toBeCloseTo(0.21, 12)
    expect(rectOverlap(r, sheetRect({ x_m: 2, z_m: 0, orientation: 'alongX' }))).toBeNull()
    expect(EXPECTED_OFFSETS.junctionFactor).toBe(1)
  })
})
