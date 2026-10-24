import { describe, expect, it } from 'vitest'
import {
  BALL_IDS, RACK_MAX_mm, RAIL_LENGTH_m, TABLE_HEIGHT_MAX_m, TABLE_HEIGHT_MIN_m, createApparatus, railGeometry, sheetRect, type RailGeometry,
} from '../../src/experiments/parabolic/apparatus/index.ts'
import { EXPECTED_OFFSETS, runLaunch } from '../../src/experiments/parabolic/apparatus/model.ts'
import { projectNdc, fitView, type Vec } from '../../src/core/scene3d/framing.ts'
import { parsePreset, PRESET_NAMES } from '../../src/experiments/parabolic/views/scene3d/presets.ts'
import {
  CM, STAGING, TABLE, VIEW_ANGLES, ZONE_MAX_cm, defaultFrameInput, edgePoints, floorPoints, gapFromDrag_mm, landMaxFor, markDiameter_cm,
  markLabel, overviewPoints, planTape, rackFromKnobY_mm, railFrame, railLocalToWorld, railLocalX_cm, railS_m, releasePoints, rollAngle_rad,
  sheetRectCm, tapeAngles, tapePoints, toScene, worldToRailLocal, type FrameInput, type TapeWorld,
} from '../../src/experiments/parabolic/views/scene3d/units.ts'

const FOV = 35

/** Every point lies inside the view (|ndc| <= 1) once the camera is fitted. */
function framed(pts: readonly Vec[], az: number, el: number, aspect: number, margin = 0.04): boolean {
  const f = fitView(pts, az, el, FOV, aspect, margin)
  return pts.every((p) => { const [x, y] = projectNdc(p, f, az, el, FOV, aspect); return Math.abs(x) <= 1 + 1e-6 && Math.abs(y) <= 1 + 1e-6 })
}
const ASPECTS = [1.6, 390 / 844, 1]

function frameOf(a: ReturnType<typeof createApparatus>): FrameInput {
  const s = a.getState()
  const H = s.world.H_m * CM
  const geo = s.geometry
  const f = defaultFrameInput(H)
  if (geo) {
    f.tipX_cm = geo.pose.tip.x_m * CM
    f.highEnd = toScene(geo.pose.highEnd)
    f.clamp = toScene(geo.pose.clamp)
    f.frame = railFrame(geo)
  }
  f.sheets = [s.paper.bond, s.paper.carbon].filter((p) => p !== null).map((p) => sheetRectCm(p!))
  return f
}

describe('conversions', () => {
  it('table-frame and floor-frame points land on the scene axes', () => {
    expect(toScene({ x_m: 0.1, y_m: 0.2, z_m: -0.05 })).toEqual([10, 20, -5])
    const H = 0.76
    expect(toScene({ x_m: 0.5, y_m: H, z_m: 0 }, H)[1]).toBeCloseTo(0, 9) // ball at table-top height
    expect(toScene({ x_m: 0.5, y_m: 0.008, z_m: 0 }, H)[1]).toBeCloseTo(-75.2, 6) // ball centre on the floor
  })
  it('rail-frame x is measured from the high end', () => {
    expect(railLocalX_cm(0)).toBeCloseTo(RAIL_LENGTH_m * CM)
    expect(railLocalX_cm(RAIL_LENGTH_m)).toBeCloseTo(0)
    expect(railS_m(railLocalX_cm(0.85))).toBeCloseTo(0.85, 9)
    expect(railS_m(-10)).toBe(RAIL_LENGTH_m)
    expect(railS_m(500)).toBe(0)
  })
  it('the rail frame puts the tip at the apparatus tip pose', () => {
    const a = createApparatus('assembled', { seed: 7 })
    const geo = a.geometry()!
    const f = railFrame(geo)
    const tip = railLocalToWorld(f, [RAIL_LENGTH_m * CM, 0, 0])
    const want = toScene(geo.pose.tip)
    for (let i = 0; i < 3; i++) expect(tip[i]!).toBeCloseTo(want[i]!, 6)
    const back = worldToRailLocal(f, tip)
    expect(back[0]).toBeCloseTo(RAIL_LENGTH_m * CM, 6); expect(back[1]).toBeCloseTo(0, 6)
    // a point on the rail at s from the tip matches railPointAt-style placement
    const mid = railLocalToWorld(f, [railLocalX_cm(0.6), 0, 0])
    expect(mid[0]).toBeCloseTo(geo.pose.tip.x_m * CM + geo.pose.direction.x_m * 60, 6)
    expect(mid[1]).toBeCloseTo(geo.pose.tip.y_m * CM + geo.pose.direction.y_m * 60, 6)
  })
  it('mark labels are the aimed distance in cm', () => {
    expect(markLabel(0.8)).toBe('80')
    expect(markLabel(0.8555)).toBe('85.6')
    expect(markLabel(0.6005)).toBe('60.1')
  })
  it('mark dots never fall below the visibility floor', () => {
    expect(markDiameter_cm(0.002)).toBeGreaterThanOrEqual(0.4)
    expect(markDiameter_cm(0.01)).toBeCloseTo(1)
  })
  it('a ball rolling toward +x turns clockwise', () => {
    expect(rollAngle_rad(2 * Math.PI * 0.8, 0.8)).toBeCloseTo(-2 * Math.PI, 9)
  })
})

describe('drag maths', () => {
  it('rack height follows the knob and clamps to the stand range', () => {
    // clamp at 20 cm (rack reading 140 mm): knob 2.4 cm below it
    expect(rackFromKnobY_mm(20 - 2.4)).toBe(140)
    expect(rackFromKnobY_mm(-50)).toBe(0)
    expect(rackFromKnobY_mm(500)).toBe(RACK_MAX_mm)
  })
  it('dragging the rail toward the edge shrinks the gap and stays accepted by the apparatus', () => {
    expect(gapFromDrag_mm(50, 2)).toBe(30)
    expect(gapFromDrag_mm(50, 100)).toBe(1)
    expect(gapFromDrag_mm(50, -1000)).toBe(600)
    const a = createApparatus('assembled', { seed: 7 })
    for (const g of [1, 30, 600]) expect(a.setGap_mm(g).ok).toBe(true)
  })
})

describe('landing zone', () => {
  it('covers the farthest landing of the highest release on the tallest table', () => {
    let far = 0
    for (const H_m of [TABLE_HEIGHT_MIN_m, TABLE_HEIGHT_MAX_m]) {
      const geo: RailGeometry = railGeometry({ rack_mm: RACK_MAX_mm, leg_mm: 0, foot_mm: 0, gap_m: 0.001, tableRoll_rad: 0, twoLegAttached: false })
      const bench = { rise_m: geo.rise_m, gap_m: 0.001, H_m, stepDrop_m: geo.stepDrop_m }
      for (const ball of BALL_IDS) {
        const x = runLaunch(bench, ball, RAIL_LENGTH_m, EXPECTED_OFFSETS).summary.flight?.x_land_m ?? 0
        far = Math.max(far, x * CM)
      }
    }
    expect(far).toBeGreaterThan(20)
    expect(far + 10).toBeLessThanOrEqual(ZONE_MAX_cm)
  })
  it('grows when paper or marks lie beyond the default zone', () => {
    expect(landMaxFor([], [])).toBe(ZONE_MAX_cm)
    expect(landMaxFor([{ x0: 100, x1: 160, z0: -10, z1: 10 }], [])).toBe(170)
    expect(landMaxFor([], [[200, 0]])).toBe(210)
  })
})

describe('preset framing', () => {
  const a = createApparatus('assembled', { seed: 7 })
  const f = frameOf(a)

  it('parses the preset names of the stage contract', () => {
    for (const p of PRESET_NAMES) expect(parsePreset(p)).toBe(p)
    expect(parsePreset('lateral')).toBeNull()
    expect(parsePreset(null)).toBeNull()
  })
  it('edge view contains the table edge, the near corner, the floor and the farthest landing point', () => {
    const farthest = runLaunch({ rise_m: 0.31, gap_m: 0.001, H_m: TABLE_HEIGHT_MAX_m, stepDrop_m: 0 }, 'marble', RAIL_LENGTH_m, EXPECTED_OFFSETS).summary.flight!.x_land_m * CM
    const must: Vec[] = [
      [0, 0, 0], [0, 0, TABLE.halfD], [0, -TABLE.thickness, TABLE.halfD], // table edge
      [farthest, -f.H_cm, 0], // landing point on the floor
      [-5, -f.H_cm, 0], // floor under the edge
    ]
    for (const aspect of ASPECTS) {
      const pts = edgePoints(f)
      const { azimuth, elevation } = VIEW_ANGLES.edge
      const fit = fitView(pts, azimuth, elevation, FOV, aspect, 0.04)
      for (const p of must) {
        const [x, y] = projectNdc(p, fit, azimuth, elevation, FOV, aspect)
        expect(Math.abs(x), `x ${p} aspect ${aspect}`).toBeLessThanOrEqual(1)
        expect(Math.abs(y), `y ${p} aspect ${aspect}`).toBeLessThanOrEqual(1)
      }
    }
  })
  it('edge view looks perpendicular to the launch plane (azimuth 0, nearly level)', () => {
    expect(VIEW_ANGLES.edge.azimuth).toBe(0)
    expect(VIEW_ANGLES.edge.elevation).toBeLessThan(15)
  })
  it('edge view also holds a far-out rail tip', () => {
    const g = createApparatus('assembled', { seed: 7 })
    g.setGap_mm(600)
    const ff = frameOf(g)
    for (const aspect of ASPECTS) expect(framed([...edgePoints(ff), [-600 / 10, 0, 0]], 0, VIEW_ANGLES.edge.elevation, aspect)).toBe(true)
    expect(Math.min(...edgePoints(ff).map((p) => p[0]))).toBeLessThanOrEqual(-60)
  })
  it('floor view contains the paper sheets and the marks', () => {
    const g = createApparatus('assembled', { seed: 7 })
    const ff = frameOf(g)
    expect(ff.sheets.length).toBe(2)
    const rects = ff.sheets
    const pts = floorPoints({ ...ff, floorPoints: [[ff.sheets[0]!.x1 + 5, 3]] })
    for (const aspect of ASPECTS) {
      const { azimuth, elevation } = VIEW_ANGLES.floor
      const fit = fitView(pts, azimuth, elevation, FOV, aspect, 0.04)
      for (const r of rects) for (const [x, z] of [[r.x0, r.z0], [r.x1, r.z0], [r.x0, r.z1], [r.x1, r.z1]] as const) {
        const [nx, ny] = projectNdc([x, -ff.H_cm, z], fit, azimuth, elevation, FOV, aspect)
        expect(Math.abs(nx)).toBeLessThanOrEqual(1); expect(Math.abs(ny)).toBeLessThanOrEqual(1)
      }
    }
  })
  it('floor view has a default landing zone when no paper is down', () => {
    const e = defaultFrameInput(76)
    const xs = floorPoints(e).map((p) => p[0])
    expect(Math.min(...xs)).toBeLessThan(0)
    expect(Math.max(...xs)).toBeGreaterThan(50)
  })
  it('floor view looks straight down with the launch direction to the right', () => {
    expect(VIEW_ANGLES.floor.elevation).toBeGreaterThan(80)
    expect(VIEW_ANGLES.floor.elevation).toBeLessThan(90)
  })
  it('overview holds the stand, the table edge and the landing zone; release holds the high end', () => {
    for (const aspect of ASPECTS) {
      expect(framed(overviewPoints(f), VIEW_ANGLES.overview.azimuth, VIEW_ANGLES.overview.elevation, aspect)).toBe(true)
      expect(framed(releasePoints(f), VIEW_ANGLES.release.azimuth, VIEW_ANGLES.release.elevation, aspect)).toBe(true)
    }
    const ov = overviewPoints(f)
    expect(Math.min(...ov.map((p) => p[0]))).toBeLessThan(f.highEnd![0])
    expect(Math.max(...ov.map((p) => p[0]))).toBeGreaterThanOrEqual(ZONE_MAX_cm)
    const rel = releasePoints(f)
    expect(Math.min(...rel.map((p) => p[0]))).toBeLessThan(f.highEnd![0])
  })
  it('presets still work while the rail is not mounted', () => {
    const e = createApparatus('empty', { seed: 1 })
    const ff = frameOf(e)
    expect(ff.frame).toBeNull()
    for (const pts of [overviewPoints(ff), releasePoints(ff), edgePoints(ff), floorPoints(ff)]) expect(pts.length).toBeGreaterThan(0)
    expect(STAGING.stopwatch.z).toBeGreaterThan(12)
  })
})

describe('tape plan', () => {
  const a = createApparatus('assembled', { seed: 7 })
  const mk = (): { world: TapeWorld; ids: string[] } => {
    const b = createApparatus('assembled', { seed: 7 })
    b.addItem('tapeMeasure')
    // run one marble so there is a carbon mark
    b.selectBall('marble'); b.placeBall({ s_m: 1.0 })
    let t = 1000
    b.release(t)
    t += 8000
    b.tick(t)
    const mark = b.paperMarks(t)[0]
    const truth = b.hiddenTruth()
    const marks = b.getState().marks
    return {
      ids: [mark?.id ?? '', ...marks.map((m) => m.id)],
      world: {
        H_m: b.getState().world.H_m, geo: b.geometry(),
        markS_m: (id) => truth.markTrueS_m[id] ?? null, markOnFloor: (id) => b.markOnFloor(id), edgeProjection: truth.edgeProjection,
      },
    }
  }
  void a

  it('launch height hangs from the table edge down to the floor', () => {
    const { world } = mk()
    const p = planTape({ kind: 'launchHeight' }, world)!
    expect(p.mode).toBe('down')
    expect(p.length_cm).toBeCloseTo(world.H_m * CM, 9)
    expect(p.reading[1]).toBe(0) // table top level
    expect(p.hook[1]).toBeCloseTo(-world.H_m * CM, 9) // floor
    expect(p.reading[0]).toBe(0) // at the edge
  })
  it('gap lies flat on the table from the edge back to the rail tip', () => {
    const { world } = mk()
    const p = planTape({ kind: 'gap' }, world)!
    expect(p.mode).toBe('left'); expect(p.flat).toBe(true)
    expect(p.length_cm).toBeCloseTo(world.geo!.gap_m * CM, 9)
    expect(p.hook[0]).toBe(0)
    expect(p.reading[0]).toBeCloseTo(world.geo!.pose.tip.x_m * CM, 9)
  })
  it('rise measures table top to the rail top at the clamp, vertically', () => {
    const { world } = mk()
    const p = planTape({ kind: 'rise' }, world)!
    const clamp = toScene(world.geo!.pose.clamp)
    expect(p.mode).toBe('down')
    expect(p.length_cm).toBeCloseTo(world.geo!.clampHeight_m * CM, 9)
    expect(p.reading[0]).toBeCloseTo(clamp[0], 9); expect(p.reading[1]).toBeCloseTo(clamp[1], 9)
    expect(p.hook[1]).toBeCloseTo(0, 6) // the hook rests on the table
  })
  it('mark position runs on the rail from the low tip to the mark', () => {
    const { world, ids } = mk()
    const id = ids.find((x) => x.startsWith('m')) ?? ids[1]!
    const s = world.markS_m(id)!
    const p = planTape({ kind: 'markPosition', markId: id }, world)!
    expect(p.frame).toBe('rail')
    expect(p.length_cm).toBeCloseTo(s * CM, 9)
    const tip = toScene(world.geo!.pose.tip)
    expect(Math.hypot(p.hook[0] - tip[0], p.hook[1] - tip[1])).toBeLessThan(2.5) // hook at the tip (offset by the face of the rail)
    const dist = Math.hypot(p.reading[0] - p.hook[0], p.reading[1] - p.hook[1])
    expect(dist).toBeCloseTo(s * CM, 6)
    expect(planTape({ kind: 'markPosition', markId: 'nope' }, world)).toBeNull()
  })
  it('range lies flat on the floor from the plumb point toward the carbon mark', () => {
    const { world, ids } = mk()
    const carbon = ids[0]!
    expect(carbon).not.toBe('')
    const p = planTape({ kind: 'range', carbonId: carbon }, world)!
    const m = world.markOnFloor(carbon)!
    const e = world.edgeProjection!
    expect(p.flat).toBe(true); expect(p.mode).toBe('right')
    expect(p.length_cm).toBeCloseTo(Math.hypot(m.x_m - e.x_m, m.z_m - e.z_m) * CM, 9)
    expect(p.reading[0]).toBeCloseTo(m.x_m * CM, 9)
    // the blade direction (cos yaw, -sin yaw) points from the hook to the reading point
    const dx = p.reading[0] - p.hook[0], dz = p.reading[2] - p.hook[2]
    expect(Math.cos(p.yaw_rad) * p.length_cm).toBeCloseTo(dx, 6)
    expect(-Math.sin(p.yaw_rad) * p.length_cm).toBeCloseTo(dz, 6)
    expect(p.hook[1]).toBeLessThan(-world.H_m * CM + 1)
    expect(planTape({ kind: 'range', carbonId: 'nope' }, world)).toBeNull()
  })
  it('targets that cannot be drawn give null; the close-up frames the reading point', () => {
    const { world } = mk()
    expect(planTape({ kind: 'gap' }, { ...world, geo: null })).toBeNull()
    expect(planTape({ kind: 'range', carbonId: 'c1' }, { ...world, edgeProjection: null })).toBeNull()
    for (const t of [{ kind: 'launchHeight' }, { kind: 'gap' }, { kind: 'rise' }] as const) {
      const p = planTape(t, world)!
      const { azimuth, elevation } = tapeAngles(p)
      const pts = tapePoints(p, null)
      for (const aspect of ASPECTS) {
        const fit = fitView(pts, azimuth, elevation, FOV, aspect, 0.04)
        const [x, y] = projectNdc(p.reading, fit, azimuth, elevation, FOV, aspect)
        expect(Math.abs(x)).toBeLessThanOrEqual(1); expect(Math.abs(y)).toBeLessThanOrEqual(1)
      }
    }
    expect(tapePoints(null, null).length).toBe(8)
  })
})

describe('sheets', () => {
  it('sheet rectangles agree with the apparatus (cm vs m)', () => {
    for (const orientation of ['alongX', 'alongZ'] as const) {
      const pose = { x_m: 0.45, z_m: -0.02, orientation }
      const r = sheetRect(pose)
      const c = sheetRectCm(pose)
      expect(c.x0).toBeCloseTo(r.xMin_m * CM, 6); expect(c.x1).toBeCloseTo(r.xMax_m * CM, 6)
      expect(c.z0).toBeCloseTo(r.zMin_m * CM, 6); expect(c.z1).toBeCloseTo(r.zMax_m * CM, 6)
    }
  })
})
