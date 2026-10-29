import { describe, expect, it } from 'vitest'
import { RAIL_LENGTH_m, SUPPORT_SEPARATION_m } from '../../src/experiments/newton2/apparatus/index.ts'
import { BENCH_HEIGHT_m, CANISTER_HANG_m, STRING_ABOVE_RAIL_m } from '../../src/experiments/newton2/physics/index.ts'
import {
  BENCH, BENCH_EDGE_X_cm, BENCH_MASS_SLOT, PORTRAIT_OVERVIEW, CANISTER_H_cm, FLOOR_Y_cm, PRESET_NAMES, PRESET_VIEWS, RAIL, SCALE_POST, STAGING, STRING_ABOVE_RAIL_cm,
  drawnRailTilt_rad, drawnTilt_rad, fallenCartOrigin, LOOSE_RAIL, CART_LENGTH_cm, parsePreset, railLocalToWorld, railLocalX_cm, railPoint, railPosFromLocalX_mm,
} from '../../src/experiments/newton2/views/scene3d/units.ts'
import { KNOT_H_cm } from '../../src/experiments/newton2/views/scene3d/models.ts'
import { boxCorners, fitView, projectNdc, type Vec } from '../../src/core/scene3d/framing.ts'

const FOV = 35
function framed(min: Vec, max: Vec, az: number, el: number, aspect: number, margin = 0.04): boolean {
  const pts = boxCorners(min, max)
  const f = fitView(pts, az, el, FOV, aspect, margin)
  return pts.every((p) => { const [x, y] = projectNdc(p, f, az, el, FOV, aspect); return Math.abs(x) <= 1 + 1e-6 && Math.abs(y) <= 1 + 1e-6 })
}

describe('scene units match the apparatus', () => {
  it('scene cm are the apparatus metres x 100: rail, floor, string height, canister hang', () => {
    expect(RAIL.length).toBeCloseTo(RAIL_LENGTH_m * 100, 9)
    expect(FLOOR_Y_cm).toBeCloseTo(-BENCH_HEIGHT_m * 100, 9)
    expect(STRING_ABOVE_RAIL_cm).toBeCloseTo(STRING_ABOVE_RAIL_m * 100, 9)
    expect(KNOT_H_cm).toBeCloseTo(CANISTER_HANG_m * 100, 9)
    expect(CANISTER_H_cm).toBeLessThan(KNOT_H_cm)
  })
  it('rail positions convert both ways for either stand end', () => {
    expect(railLocalX_cm(300, true)).toBeCloseTo(30, 9)
    expect(railLocalX_cm(300, false)).toBeCloseTo(90, 9)
    for (const z of [true, false]) for (const mm of [0, 123.5, 600, 1200]) expect(railPosFromLocalX_mm(railLocalX_cm(mm, z), z)).toBeCloseTo(mm, 9)
    expect(railPosFromLocalX_mm(500, true)).toBe(1200)
  })
  it('a stand end higher than the receiver end tilts the drawn rail down toward the receiver (negative rotation about z)', () => {
    expect(drawnRailTilt_rad(0.07, 0.06, SUPPORT_SEPARATION_m)).toBeLessThan(0)
    expect(drawnRailTilt_rad(0.06, 0.06, SUPPORT_SEPARATION_m)).toBeCloseTo(0, 12)
    const p = railLocalToWorld([-5, 7, 0], drawnRailTilt_rad(0.07, 0.06, SUPPORT_SEPARATION_m), [110, 0, 0])
    expect(p[1]).toBeLessThan(7)
    expect(p[0]).toBeCloseTo(-5 + 110 * Math.cos(drawnRailTilt_rad(0.07, 0.06, SUPPORT_SEPARATION_m)), 9)
  })
})

describe('bench edge', () => {
  it('the receiver sits flush at the bench edge and the canister hangs beyond it', () => {
    const rootX = -5 // scene.ts: rail root at -SUPPORT_FROM_END
    const receiverX = rootX + RAIL.length
    expect(BENCH.x + BENCH.width / 2).toBeCloseTo(BENCH_EDGE_X_cm, 9)
    expect(receiverX).toBeCloseTo(BENCH_EDGE_X_cm, 9)
    const canisterX = receiverX + 0.9 + 2.4 // pulley offset + string offset (scene.ts)
    expect(canisterX).toBeGreaterThan(BENCH.x + BENCH.width / 2)
  })
  it('the portrait overview frames its box on a phone stage', () => {
    const v = PORTRAIT_OVERVIEW
    expect(framed(v.min, v.max, v.azimuth, v.elevation, 0.5)).toBe(true)
  })
})

describe('staging and presets', () => {
  it('every staged item rests inside the bench top, clear of the loose rail', () => {
    for (const [id, s] of Object.entries(STAGING)) {
      expect(Math.abs(s.x - BENCH.x), id).toBeLessThanOrEqual(BENCH.width / 2 - 4)
      expect(Math.abs(s.z - BENCH.z), id).toBeLessThanOrEqual(BENCH.depth / 2 - 4)
      expect(Math.abs(s.z - 28) > 4 || s.x > 140 || s.x < 5, `${id} overlaps the loose rail`).toBe(true)
    }
    for (const s of [BENCH_MASS_SLOT, SCALE_POST]) expect(Math.abs(s.z)).toBeLessThan(BENCH.depth / 2)
    expect(SCALE_POST.height).toBeGreaterThan(40)
  })
  it('every camera preset frames its box in portrait, square and wide stages', () => {
    for (const n of PRESET_NAMES) {
      const v = PRESET_VIEWS[n]
      for (const aspect of [0.5, 1, 1.6, 2.2]) expect(framed(v.min, v.max, v.azimuth, v.elevation, aspect), `${n} @ ${aspect}`).toBe(true)
    }
  })
  it('the floor preset reaches the floor and the pulley preset includes the canister drop', () => {
    expect(PRESET_VIEWS.floor.min[1]).toBeLessThan(FLOOR_Y_cm)
    expect(PRESET_VIEWS.floor.max[1]).toBeGreaterThan(0)
    expect(PRESET_VIEWS.pulley.min[1]).toBeLessThan(-20)
  })
  it('parsePreset accepts the six names and nothing else', () => {
    for (const n of PRESET_NAMES) expect(parsePreset(n)).toBe(n)
    expect(parsePreset('mark')).toBeNull()
    expect(parsePreset(null)).toBeNull()
  })
})

describe('rail pose and the fallen cart', () => {
  const base = { rack_mm: 0 }
  const loose = { ...base, geometry: null, joints: { standBase: false, rackClamp: null, receiver: false, stringCart: false, stringCanister: false, stringPulley: false } }
  const clamped = { ...loose, joints: { ...loose.joints, rackClamp: 'E1' as const } }
  it('a loose rail is not tilted; clamped at one end only it sags toward the free end; held at both ends it follows the supports', () => {
    expect(drawnTilt_rad(loose)).toBe(0)
    expect(drawnTilt_rad(clamped)).toBeLessThan(0)
    expect(Math.tan(-drawnTilt_rad(clamped)) * SUPPORT_SEPARATION_m).toBeCloseTo(0.03 / Math.cos(drawnTilt_rad(clamped)), 3)
    const both = { ...clamped, geometry: { highEnd: 'E1' as const, standEnd: 'E1' as const, standHeight_m: 0.07, receiverHeight_m: 0.06, tilt_rad: 0 } }
    expect(drawnTilt_rad(both)).toBeCloseTo(drawnRailTilt_rad(0.07, 0.06, SUPPORT_SEPARATION_m), 12)
    expect(railPoint(loose, 60)[0]).toBeCloseTo(55, 9)
  })
  it('the loose rail lies inside the bench top', () => {
    expect(LOOSE_RAIL.x).toBeGreaterThan(BENCH.x - BENCH.width / 2)
    expect(LOOSE_RAIL.x + RAIL.length).toBeLessThan(BENCH.x + BENCH.width / 2)
  })
  it('a cart that left the rail end starts at the end and never goes below the floor', () => {
    const o0 = fallenCartOrigin(clamped, { x_m: 0, drop_m: 0 })
    expect(o0[0]).toBeCloseTo(railPoint(clamped, RAIL.length + CART_LENGTH_cm / 2)[0], 9)
    expect(fallenCartOrigin(clamped, { x_m: 0.5, drop_m: 5 })[1]).toBe(FLOOR_Y_cm)
    expect(fallenCartOrigin(clamped, { x_m: 0.5, drop_m: 0.2 })[0]).toBeCloseTo(o0[0] + 50, 9)
  })
})
