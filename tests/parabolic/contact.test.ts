// Contact geometry of the bench: a rigid rail beam rests on the rack clamp, the two-leg stand and the tabletop and never goes through
// any of them; the ball rests on the floor (or on the paper) after it lands. Pure checks of apparatus/geometry and the ball status.
import { describe, expect, it } from 'vitest'
import {
  BALL_IDS, FOOT_RANGE_mm, GAP_MAX_m, GAP_MIN_m, LEG_BASE_HEIGHT_m, LEG_MAX_mm, LEG_MIN_mm, PAPER_THICKNESS_m, RACK_BASE_HEIGHT_m, RACK_FROM_TIP_m, RACK_MAX_mm, RACK_MIN_mm,
  RAIL_HEIGHT_m, TWO_LEG_FROM_TIP_m, createApparatus, paperStack, paperSurfaceAt_m, railGeometry, rectOverlap, sheetRect, type RailInput,
} from '../../src/experiments/parabolic/apparatus/index.ts'
import { MARBLE, PING_PONG, settlePath, FLOOR_ROLL_DECEL_mps2 } from '../../src/experiments/parabolic/physics/index.ts'
import { DEFAULT_RAIL } from '../../src/core/scene3d/models.ts'
import { CM, LEVEL_HALF, RAIL, STAGED_BOXES, STAGING, TABLE, levelRailRange_cm, levelTableSpot, mountedBoxes, type Box2 } from '../../src/experiments/parabolic/views/scene3d/units.ts'

const TOL = 1e-9 // m: rounding only; the model itself puts the lowest corner exactly on the table
const base: RailInput = { rack_mm: 140, leg_mm: 0, foot_mm: 0, gap_m: 0.05, tableRoll_rad: 0, twoLegAttached: true }

function* sweep(): Generator<RailInput> {
  for (let rack = RACK_MIN_mm; rack <= RACK_MAX_mm; rack += 10) {
    for (let leg = LEG_MIN_mm; leg <= LEG_MAX_mm; leg += 5) {
      for (const foot of [-FOOT_RANGE_mm, 0, FOOT_RANGE_mm]) {
        for (const gap_m of [GAP_MIN_m, 0.05, GAP_MAX_m]) {
          for (const twoLegAttached of [true, false]) yield { rack_mm: rack, leg_mm: leg, foot_mm: foot, gap_m, tableRoll_rad: 0.003, twoLegAttached }
        }
      }
    }
  }
}

describe('rail as a rigid beam on its contacts', () => {
  it('the rail body is never below the tabletop over the whole adjustable range (rack, leg, foot, gap)', () => {
    let n = 0
    for (const inp of sweep()) {
      const g = railGeometry(inp)
      expect(g.lowest_m).toBeGreaterThanOrEqual(-TOL)
      n++
    }
    expect(n).toBeGreaterThan(3000)
  })
  it('the model profile is as thick as the drawn rail', () => {
    expect(DEFAULT_RAIL.height / CM).toBeCloseTo(RAIL_HEIGHT_m, 12)
    expect(RAIL.height / CM).toBeCloseTo(RAIL_HEIGHT_m, 12)
  })
  it('contacts are consistent with the pose: the clamp holds, the tip rests or hangs, the stand touches or has a clearance, never penetrates', () => {
    for (const inp of sweep()) {
      const g = railGeometry(inp)
      const cos = Math.cos(g.theta_rad)
      const under = (y_top: number): number => y_top - RAIL_HEIGHT_m * cos // underside height below a top point
      // rack: the top surface at the clamp is what the rack scale sets
      expect(g.pose.clamp.y_m).toBeCloseTo(RACK_BASE_HEIGHT_m + inp.rack_mm / 1000, 9)
      // beam geometry: the top line is straight, the rise is the clamp's height above the tip
      expect(g.rise_m).toBeCloseTo(g.pose.clamp.y_m - g.pose.tip.y_m, 9)
      expect(g.theta_rad).toBeCloseTo(Math.asin(g.rise_m / RACK_FROM_TIP_m), 9)
      expect(g.pose.tip.y_m).toBeGreaterThanOrEqual(g.tipRestHeight_m - TOL) // never lower than standing on its tip
      expect(g.stepDrop_m).toBe(g.tipHeight_m)
      // the stand support is never inside the rail
      const clearance = under(g.pose.twoLeg.y_m) - g.legHeight_m
      if (inp.twoLegAttached) expect(clearance).toBeGreaterThanOrEqual(-TOL)
      if (g.contacts.twoLeg) {
        expect(Math.abs(clearance)).toBeLessThan(TOL)
        expect(g.twoLegClearance_m).toBe(0)
      } else {
        expect(g.contacts.table).toBe(true)
        expect(Math.abs(g.pose.tip.y_m - g.tipRestHeight_m)).toBeLessThan(TOL)
        if (inp.twoLegAttached) expect(g.twoLegClearance_m).toBeCloseTo(clearance, 9)
      }
      expect(g.contacts.table).toBe(!g.tipLifted)
    }
  })
  it('without the stand the rail rests on rack and table for any rack height; the stand setting is then irrelevant', () => {
    for (const rack_mm of [0, 70, 140, 250]) {
      const a = railGeometry({ ...base, rack_mm, twoLegAttached: false, leg_mm: 0 })
      const b = railGeometry({ ...base, rack_mm, twoLegAttached: false, leg_mm: 150 })
      expect(a.theta_rad).toBe(b.theta_rad)
      expect(a.contacts).toEqual({ rack: true, twoLeg: false, table: true })
    }
  })
  it('a stand lower than the free line does not touch (a gap shows) and the rail does not move; a higher one lifts it continuously', () => {
    const free = railGeometry({ ...base, twoLegAttached: false })
    const threshold_m = TWO_LEG_FROM_TIP_m * Math.sin(free.theta_rad) // support height at which the stand just touches the free line
    const lowMm = Math.floor((threshold_m - LEG_BASE_HEIGHT_m) * 1000) - 1
    const lo = railGeometry({ ...base, leg_mm: lowMm })
    expect(lo.contacts.twoLeg).toBe(false)
    expect(lo.theta_rad).toBe(free.theta_rad)
    expect(lo.twoLegClearance_m).toBeGreaterThan(0)
    const hi = railGeometry({ ...base, leg_mm: lowMm + 12 })
    expect(hi.contacts.twoLeg).toBe(true)
    expect(hi.tipHeight_m).toBeGreaterThan(free.tipHeight_m)
    expect(hi.theta_rad).toBeLessThan(free.theta_rad)
    // continuity at the threshold: a hair above it the tip is a hair above its resting height
    const just = railGeometry({ ...base, leg_mm: (threshold_m + 1e-7 - LEG_BASE_HEIGHT_m) * 1000 })
    expect(just.tipHeight_m - just.tipRestHeight_m).toBeLessThan(1e-6)
  })
  it('the stand at its lowest scale (0 mm) never touches the default rail: the case of a stand lowered to the table', () => {
    const g = railGeometry({ ...base, leg_mm: 0, foot_mm: 5 })
    expect(g.contacts.twoLeg).toBe(false)
    expect(g.lowest_m).toBeGreaterThanOrEqual(-TOL)
    expect(LEG_BASE_HEIGHT_m).toBeGreaterThan(0) // the stand's own pads and bridge have a thickness
  })
  it('stands and rail stay on the table: the farthest gap and the highest rack leave room before the table end', () => {
    for (const rack_mm of [RACK_MIN_mm, RACK_MAX_mm]) {
      const g = railGeometry({ ...base, rack_mm, gap_m: GAP_MAX_m })
      const baseHalf_cm = 8 + 1.5 // base plate half width plus its offset from the rod (core DEFAULT_BASE)
      expect(g.pose.highEnd.x_m * CM).toBeGreaterThan(TABLE.x0 + 5)
      expect(g.pose.clamp.x_m * CM - baseHalf_cm).toBeGreaterThan(TABLE.x0 + 2)
      expect(g.pose.tip.x_m).toBeLessThan(0) // the tip never reaches the edge (setGap refuses <= 0)
      expect(g.pose.tip.x_m - RAIL_HEIGHT_m * Math.sin(g.theta_rad)).toBeLessThan(0)
    }
  })
  it('the apparatus uses the same contact geometry for launch: step drop and rise of a run come from the geometry', () => {
    const a = createApparatus('assembled', { seed: 3 })
    const g = a.geometry()!
    expect(g.contacts).toEqual({ rack: true, twoLeg: false, table: true })
    a.release(0)
    const r = a.getRun(1)!
    expect(r.bench.stepDrop_m).toBe(g.stepDrop_m)
    expect(r.bench.rise_m).toBe(g.rise_m)
    expect(r.theta_rad).toBeCloseTo(g.theta_rad, 12)
    expect(a.procedure().riseOk).toBe(true) // the tape reads the 20 cm at the clamp
  })
})

describe('paper on the floor', () => {
  const bond = { x_m: 0.5, z_m: 0, orientation: 'alongX' as const }
  it('the carbon sheet lies on the bond paper where they overlap and on the floor otherwise (no floating, no z-fight)', () => {
    expect(paperStack(bond, { ...bond, x_m: 0.55 }).carbonBase_m).toBe(PAPER_THICKNESS_m)
    expect(paperStack(bond, { ...bond, x_m: 3 }).carbonBase_m).toBe(0)
    expect(paperStack(bond, null).carbonBase_m).toBe(0)
    expect(paperStack(bond, { ...bond, x_m: 0.55 }).bondBase_m).toBe(0)
  })
  it('a ball resting on the paper sits on its top surface; on bare floor at floor level', () => {
    const carbon = { ...bond, x_m: 0.52 }
    expect(rectOverlap(sheetRect(bond), sheetRect(carbon))).not.toBeNull()
    expect(paperSurfaceAt_m(0.5, 0, bond, null)).toBe(PAPER_THICKNESS_m)
    expect(paperSurfaceAt_m(0.5, 0, bond, carbon)).toBe(2 * PAPER_THICKNESS_m)
    expect(paperSurfaceAt_m(2, 1, bond, carbon)).toBe(0)
    const clear = { ...bond, x_m: 1.2 } // carbon off the bond: lies on the floor
    expect(paperSurfaceAt_m(1.2, 0, bond, clear)).toBe(PAPER_THICKNESS_m)
  })
})

describe('where a landed ball comes to rest', () => {
  const g = 9.77
  const imp = { x_m: 0.5, z_m: 0.01, vx_mps: 1.3, vy_mps: -3.9, vz_mps: 0.02 }
  it('hops, never below the floor, and stops beyond the landing point; the ping-pong ball hops longer than the marble', () => {
    for (const ball of [MARBLE, PING_PONG]) {
      const p = settlePath(imp, ball, g)
      let prev = imp.x_m
      for (let tau = 0; tau <= p.duration_s + 0.1; tau += 0.002) {
        const q = p.at(tau)
        expect(q.lift_m).toBeGreaterThanOrEqual(0)
        expect(q.x_m).toBeGreaterThanOrEqual(prev - 1e-9) // never goes back toward the table
        prev = q.x_m
      }
      expect(p.at(p.duration_s + 1)).toEqual({ x_m: p.rest.x_m, z_m: p.rest.z_m, lift_m: 0 })
      expect(p.rest.x_m).toBeGreaterThan(imp.x_m)
    }
    expect(settlePath(imp, PING_PONG, g).duration_s).toBeGreaterThan(settlePath(imp, MARBLE, g).duration_s)
  })
  it('first hop follows the restitution rule: apex height e^2 vy^2 / 2g', () => {
    const p = settlePath(imp, MARBLE, g)
    const vUp = MARBLE.restitution * 3.9
    const t = vUp / g
    expect(p.at(t).lift_m).toBeCloseTo((vUp * vUp) / (2 * g), 9)
    expect(p.at(t).x_m).toBeCloseTo(imp.x_m + imp.vx_mps * t, 9)
  })
  it('the roll-out ends with the stopping distance v^2 / 2a', () => {
    const slow = settlePath({ ...imp, vy_mps: -0.1 }, MARBLE, g) // no hop at all
    expect(slow.at(0).lift_m).toBe(0)
    expect(slow.rest.x_m - imp.x_m).toBeCloseTo((imp.vx_mps ** 2 + imp.vz_mps ** 2) / (2 * FLOOR_ROLL_DECEL_mps2) * (imp.vx_mps / Math.hypot(imp.vx_mps, imp.vz_mps)), 9)
  })
  it('in the apparatus the landed ball stays visible on the floor: bottom at the floor, until it is returned to its mark', () => {
    for (const ball of BALL_IDS) {
      const a = createApparatus('assembled', { seed: 5 })
      a.selectBall(ball)
      a.placeBall({ markId: a.getState().marks[0]!.id })
      a.release(0)
      const run = a.getRun(1)!
      expect(run.outcome).toBe('landed')
      const R = ball === 'marble' ? 0.008 : 0.02
      const tLand = run.times.land_s! * 1000
      let last = a.ballStatus(tLand + 1)
      for (let ms = tLand; ms <= tLand + 6000; ms += 10) {
        const s = a.ballStatus(ms)
        expect(s.phase).toBe('landed')
        expect(s.pos).not.toBeNull()
        expect(s.pos!.y_m).toBeGreaterThanOrEqual(R - 1e-9) // never sinks into the floor
        last = s
      }
      expect(last.atRest).toBe(true)
      // at rest: centre exactly R above the surface it lies on (floor, or the paper top)
      const paperTop = 2 * PAPER_THICKNESS_m
      expect([R, R + PAPER_THICKNESS_m, R + paperTop].some((y) => Math.abs(last.pos!.y_m - y) < 1e-9)).toBe(true)
      expect(last.pos!.x_m).toBeGreaterThan(run.flight!.x_land_m)
      expect(last.phase).toBe('landed') // not hidden by any flag: the view draws it while this phase holds
      expect(a.resetBall().ok).toBe(true)
      expect(a.ballStatus(tLand + 7000).phase).toBe('idle') // returned: it is on the rail again
    }
  })
  it('a ball on the paper rests on its surface (centre R + paper thickness)', () => {
    const a = createApparatus('assembled', { seed: 5 })
    a.release(0)
    const run = a.getRun(1)!
    const bondPose = a.getState().paper.bond!
    const s = a.ballStatus(run.times.land_s! * 1000 + 100_000)
    const r = sheetRect(bondPose)
    const onBond = s.pos!.x_m >= r.xMin_m && s.pos!.x_m <= r.xMax_m && Math.abs(s.pos!.z_m - bondPose.z_m) <= r.zMax_m - bondPose.z_m
    const expected = 0.008 + (onBond ? (paperSurfaceAt_m(s.pos!.x_m, s.pos!.z_m, a.getState().paper.bond, a.getState().paper.carbon)) : 0)
    expect(s.pos!.y_m).toBeCloseTo(expected, 9)
  })
})

describe('things on the table do not overlap', () => {
  const overlap = (a: Box2, b: Box2): boolean => a.x0 < b.x1 && a.x1 > b.x0 && a.z0 < b.z1 && a.z1 > b.z0
  it('the waiting places of the loose parts are disjoint and on the table', () => {
    STAGED_BOXES.forEach((a, i) => {
      expect(a.x0).toBeGreaterThan(TABLE.x0)
      expect(a.x1).toBeLessThan(0)
      expect(Math.abs(a.z0)).toBeLessThan(TABLE.halfD)
      expect(Math.abs(a.z1)).toBeLessThan(TABLE.halfD)
      STAGED_BOXES.forEach((b, j) => { if (j > i) expect(overlap(a, b), `boxes ${i} and ${j}`).toBe(false) })
    })
    // every staging point is inside its box
    for (const [, p] of Object.entries(STAGING)) expect(STAGED_BOXES.some((b) => p.x >= b.x0 && p.x <= b.x1 && p.z >= b.z0 && p.z <= b.z1)).toBe(true)
  })
  it('the level dragged onto the table lands clear of the rail, the stands and the waiting parts, and inside the table', () => {
    const geo = railGeometry(base)
    const boxes = [...STAGED_BOXES, ...mountedBoxes(geo, true, true)]
    for (let x = TABLE.x0; x <= 0; x += 7) {
      for (let z = -TABLE.halfD; z <= TABLE.halfD; z += 4) {
        const p = levelTableSpot(x, z, boxes)
        expect(p.x - LEVEL_HALF.x).toBeGreaterThanOrEqual(TABLE.x0)
        expect(p.x + LEVEL_HALF.x).toBeLessThanOrEqual(0)
        expect(Math.abs(p.z) + LEVEL_HALF.z).toBeLessThanOrEqual(TABLE.halfD)
        const me: Box2 = { x0: p.x - LEVEL_HALF.x, x1: p.x + LEVEL_HALF.x, z0: p.z - LEVEL_HALF.z, z1: p.z + LEVEL_HALF.z }
        for (const b of boxes) expect(overlap(me, b), `level at ${p.x},${p.z} vs ${JSON.stringify(b)}`).toBe(false)
      }
    }
  })
  it('the level on the rail stays between the rack-stand collar and the two-leg stand', () => {
    for (const twoLeg of [true, false]) {
      const r = levelRailRange_cm(twoLeg)
      expect(r.min).toBeLessThan(r.max)
      const clampX = RAIL.length - 110, legX = RAIL.length - 10
      expect(r.min - LEVEL_HALF.x).toBeGreaterThan(clampX + 2.4)
      if (twoLeg) expect(r.max + LEVEL_HALF.x).toBeLessThan(legX - 1.2)
      else expect(r.max + LEVEL_HALF.x).toBeLessThanOrEqual(RAIL.length)
    }
  })
})
