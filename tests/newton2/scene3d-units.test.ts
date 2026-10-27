import { describe, expect, it } from 'vitest'
import { RAIL_LENGTH_m, SUPPORT_SEPARATION_m } from '../../src/experiments/newton2/apparatus/index.ts'
import { BENCH_HEIGHT_m, CANISTER_HANG_m, STRING_ABOVE_RAIL_m } from '../../src/experiments/newton2/physics/index.ts'
import {
  BENCH, BENCH_MASS_SLOT, CANISTER_H_cm, FLOOR_Y_cm, PRESET_NAMES, PRESET_VIEWS, RAIL, SCALE_POST, STAGING, STRING_ABOVE_RAIL_cm,
  drawnRailTilt_rad, parsePreset, railLocalToWorld, railLocalX_cm, railPosFromLocalX_mm,
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
