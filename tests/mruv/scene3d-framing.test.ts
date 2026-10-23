import { describe, expect, it } from 'vitest'
import { createApparatus, railPose } from '../../src/experiments/mruv/apparatus/index.ts'
import { boxCorners, fitView, projectNdc, viewBasis, type Vec } from '../../src/core/scene3d/framing.ts'
import { parsePreset, PRESET_NAMES } from '../../src/experiments/mruv/views/scene3d/presets.ts'
import {
  LATERAL_MM, MARK_HALF_cm, RAIL, STAGING, TRAY, VIEW_ANGLES, markLocalX_cm, markerLabel, markerLabels, overviewPoints, railLocalToWorld,
  railLocalX_cm, railSpanPoints, toScene,
} from '../../src/experiments/mruv/views/scene3d/units.ts'

const FOV = 35
const inside = (pts: readonly Vec[], az: number, el: number, aspect: number, margin: number) => {
  const f = fitView(pts, az, el, FOV, aspect, margin)
  return { f, ndc: pts.map((p) => projectNdc(p, f, az, el, FOV, aspect)) }
}

describe('view basis', () => {
  it('azimuth 0, elevation 0 looks along -z with x to the right', () => {
    const b = viewBasis(0, 0)
    expect(b.dir[2]).toBeCloseTo(1, 9); expect(b.right[0]).toBeCloseTo(1, 9); expect(b.up[1]).toBeCloseTo(1, 9)
  })
  it('positive azimuth swings the camera toward +x', () => {
    expect(viewBasis(30, 10).dir[0]).toBeGreaterThan(0)
  })
})

describe('fitView', () => {
  const pts = boxCorners([0, 0, -5], [100, 10, 5])
  it('keeps every point inside the frame for landscape and portrait, with the margin', () => {
    for (const aspect of [1.6, 1.0, 0.46]) {
      const { ndc } = inside(pts, -15, 20, aspect, 0.08)
      for (const [x, y] of ndc) { expect(Math.abs(x)).toBeLessThanOrEqual(1 / 1.08 + 1e-6); expect(Math.abs(y)).toBeLessThanOrEqual(1 / 1.08 + 1e-6) }
    }
  })
  it('is tight: the widest point sits exactly at the margin edge', () => {
    const { ndc } = inside(pts, 0, 5, 1.6, 0.08)
    const widest = Math.max(...ndc.map(([x]) => Math.abs(x)), ...ndc.map(([, y]) => Math.abs(y)))
    expect(widest).toBeCloseTo(1 / 1.08, 2)
  })
  it('a portrait frame is limited by width, so the camera is farther than in landscape', () => {
    const land = fitView(pts, 0, 5, FOV, 1.6).distance, port = fitView(pts, 0, 5, FOV, 0.6).distance
    expect(port).toBeGreaterThan(land)
    // width-limited in portrait: half width 50 cm at 1.08 margin
    expect(port).toBeGreaterThanOrEqual((50 * 1.08) / (Math.tan((FOV * Math.PI) / 360) * 0.6) - 1e-6)
  })
})

describe('lateral view', () => {
  const a = createApparatus('assembled', { seed: 42 })
  const geo = a.geometry()!
  const zh = geo.scaleZeroAtHighEnd!
  const high = toScene(geo.pose.highEnd), tilt = -geo.pose.railAngle_rad
  const x0 = railLocalX_cm(LATERAL_MM.from, zh), x1 = railLocalX_cm(LATERAL_MM.to, zh)
  const pts = railSpanPoints(Math.min(x0, x1), Math.max(x0, x1)).map((p) => railLocalToWorld(high, tilt, p))
  it('frames rail mm 150 to 1150 (100 cm) perpendicular to the rail at 5 degrees', () => {
    expect(Math.abs(x1 - x0)).toBeCloseTo(100, 6)
    expect(VIEW_ANGLES.lateral).toEqual({ azimuth: 0, elevation: 5 })
  })
  it('fits the full width on landscape and on portrait (portrait accepts a short height)', () => {
    for (const aspect of [1.6, 0.9, 0.46]) {
      const { ndc, f } = inside(pts, VIEW_ANGLES.lateral.azimuth, VIEW_ANGLES.lateral.elevation, aspect, 0.03)
      for (const [x] of ndc) expect(Math.abs(x)).toBeLessThanOrEqual(1 / 1.03 + 1e-6)
      expect(f.target[0]).toBeCloseTo(high[0] + (x0 + x1) / 2, 0) // centred on the middle of the framed span
    }
  })
  it('the camera looks along z, perpendicular to the rail axis (the rail only tilts in the image plane)', () => {
    const f = fitView(pts, 0, 5, FOV, 1.6)
    expect(f.position[0]).toBeCloseTo(f.target[0], 6)
  })
})

describe('mark view', () => {
  it('locates a mark fromA below A, down-slope, in the rail frame', () => {
    const a = createApparatus('assembled', { seed: 42 })
    const A = a.evaluateMarks().aRailPos_mm
    expect(A).not.toBeNull()
    const zh = a.geometry()!.scaleZeroAtHighEnd!
    const xA = markLocalX_cm(A, 0, zh)
    expect(markLocalX_cm(A, 10, zh) - xA).toBeCloseTo(10, 9)
    expect(markLocalX_cm(A, 90, zh) - xA).toBeCloseTo(90, 9)
    expect(xA).toBeCloseTo(railLocalX_cm(A!, zh), 9)
  })
  it('clamps to the rail and falls back to the rail middle without A', () => {
    expect(markLocalX_cm(null, 0, true)).toBeCloseTo(RAIL.length / 2, 9)
    expect(markLocalX_cm(1190, 90, true)).toBeLessThanOrEqual(RAIL.length)
  })
  it('frames +-12 cm around the mark on landscape and portrait, mark centred', () => {
    const high: [number, number, number] = [0, 10, 0]
    for (const aspect of [1.6, 0.46]) {
      const pts = railSpanPoints(50 - MARK_HALF_cm, 50 + MARK_HALF_cm).map((p) => railLocalToWorld(high, -0.0227, p))
      const { f, ndc } = inside(pts, VIEW_ANGLES.mark.azimuth, VIEW_ANGLES.mark.elevation, aspect, 0.04)
      for (const [x] of ndc) expect(Math.abs(x)).toBeLessThanOrEqual(1 / 1.04 + 1e-6)
      expect(f.target[0]).toBeCloseTo(50, 0)
    }
  })
  it('the mark distance is a visible number of centimetres: the camera stays within reach of the orbit limits', () => {
    const pts = railSpanPoints(38, 62).map((p) => railLocalToWorld([0, 10, 0], 0, p))
    const d = fitView(pts, 0, 6, FOV, 1.6).distance
    expect(d).toBeGreaterThan(6) // the controls' minDistance
    expect(d).toBeLessThan(330)
  })
})

describe('rail frame to scene', () => {
  it('matches the apparatus pose at both ends of the rail', () => {
    const p = railPose(0.12, 0.05)
    const hi = toScene(p.highEnd), lo = toScene(p.lowEnd)
    const w = railLocalToWorld(hi, -p.railAngle_rad, [RAIL.length, 0, 0])
    expect(w[0]).toBeCloseTo(lo[0], 4); expect(w[1]).toBeCloseTo(lo[1], 4)
  })
})

describe('mark labels on the tape', () => {
  it('are the plain distance from A in cm: 0, 10, ... 90 like Table 1.1', () => {
    const markers = [0, 100, 200, 900].map((d, i) => ({ id: `m${i}`, railPos_mm: 200 + d }))
    const labels = markerLabels(markers, { aRailPos_mm: 200 })
    expect([...labels.values()]).toEqual(['0', '10', '20', '90'])
    expect(markerLabel(0)).toBe('0')
  })
})

describe('overview framing and the parts tray', () => {
  it('fits rail, stands, receiver and tray with an 8 % margin at 20 degrees elevation', () => {
    expect(VIEW_ANGLES.overview.elevation).toBeGreaterThanOrEqual(18)
    expect(VIEW_ANGLES.overview.elevation).toBeLessThanOrEqual(22)
    expect(Math.abs(VIEW_ANGLES.overview.azimuth + 15)).toBeLessThanOrEqual(5)
    for (const aspect of [1.6, 1.2]) {
      const { ndc } = inside(overviewPoints(), VIEW_ANGLES.overview.azimuth, VIEW_ANGLES.overview.elevation, aspect, 0.08)
      for (const [x, y] of ndc) { expect(Math.abs(x)).toBeLessThanOrEqual(1 / 1.08 + 1e-6); expect(Math.abs(y)).toBeLessThanOrEqual(1 / 1.08 + 1e-6) }
    }
  })
  it('small props rest inside one tray near the low end, not in the corners of the table', () => {
    for (const k of ['stopwatch', 'tape', 'level', 'markers', 'screws'] as const) {
      const s = STAGING[k]
      expect(Math.abs(s.x - TRAY.x), k).toBeLessThan(TRAY.width / 2)
      expect(Math.abs(s.z - TRAY.z), k).toBeLessThan(TRAY.depth / 2)
    }
    expect(TRAY.x).toBeGreaterThan(80) // low end side of the 120 cm rail
  })
})

describe('preset names', () => {
  it('accepts the old alongRail name as an alias of lateral and rejects unknown names', () => {
    expect(parsePreset('alongRail')).toBe('lateral')
    expect(parsePreset('mark')).toBe('mark')
    expect(parsePreset('bogus')).toBeNull()
    expect(parsePreset(null)).toBeNull()
    expect(PRESET_NAMES).toEqual(['overview', 'highEnd', 'lowEnd', 'lateral', 'mark', 'tape'])
  })
})
