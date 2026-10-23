import { describe, expect, it } from 'vitest'
import {
  CART_LENGTH_m, RAIL_LENGTH_m, createApparatus, type TapeTarget,
} from '../src/apparatus/index.ts'
import {
  LEVEL_ON_TABLE, STAGING, TABLE, tapeLength_m, cartFrontValid, cartGhostFront_mm, clampCartFront, clampHeight_cm, footFromDrag_mm,
  footWheelStep_mm, ghostsFor, markerLabel, markerLabels, onRailFootprint, rackFromHeight_mm, rackWheelStep_mm, railLocalX_cm,
  railPosFromLocalX_mm, toScene, twoLegHeight_cm,
} from '../src/views/scene3d/units.ts'

describe('coordinate mapping world m -> scene cm', () => {
  it('multiplies by 100 and keeps the axes', () => {
    const v = toScene({ x_m: 1.15, y_m: 0.0613, z_m: -0.25 })
    expect(v[0]).toBeCloseTo(115, 9); expect(v[1]).toBeCloseTo(6.13, 9); expect(v[2]).toBeCloseTo(-25, 9)
  })
  it('rail pose of the assembled bench lands on the table in cm', () => {
    const a = createApparatus('assembled', { seed: 42 })
    const p = a.geometry()!.pose
    const hi = toScene(p.highEnd), lo = toScene(p.lowEnd)
    expect(Math.hypot(lo[0] - hi[0], lo[1] - hi[1])).toBeCloseTo(RAIL_LENGTH_m * 100, 6)
    expect(hi[1]).toBeGreaterThan(lo[1]) // the high end is higher
  })
})

describe('printed scale <-> rail frame', () => {
  it('scale zero at the high end: printed 300 mm is 30 cm from the high end', () => {
    expect(railLocalX_cm(300, true)).toBeCloseTo(30, 9)
  })
  it('rail turned (E2 in the clamp): printed 300 mm is 90 cm from the high end', () => {
    expect(railLocalX_cm(300, false)).toBeCloseTo(90, 9)
  })
  it('round trip for both orientations and clamps outside the rail', () => {
    for (const zh of [true, false]) {
      for (const pos of [0, 125.5, 600, 1200]) expect(railPosFromLocalX_mm(railLocalX_cm(pos, zh), zh)).toBeCloseTo(pos, 6)
    }
    expect(railPosFromLocalX_mm(-10, true)).toBe(0)
    expect(railPosFromLocalX_mm(500, true)).toBe(1200)
  })
  it('footprint test', () => {
    expect(onRailFootprint(60, 0.5)).toBe(true)
    expect(onRailFootprint(60, 3)).toBe(false)
    expect(onRailFootprint(60, 3, 6)).toBe(true)
    expect(onRailFootprint(130, 0)).toBe(false)
  })
})

describe('marker labels (cm relative to A)', () => {
  it('whole cm without decimals, fractions with one', () => {
    expect(markerLabel(0)).toBe('0')
    expect(markerLabel(100)).toBe('10')
    expect(markerLabel(900)).toBe('90')
    expect(markerLabel(305)).toBe('30.5')
    expect(markerLabel(99.5)).toBe('9.95')
  })
  it('labels follow the apparatus marks: A is the top mark whatever the scale orientation', () => {
    const a = createApparatus('assembled', { seed: 42 })
    const labels = markerLabels(a.getMarkers(), a.evaluateMarks())
    expect([...labels.values()]).toEqual(['0', '10', '20', '30', '40', '50', '60', '70', '80', '90'])
  })
  it('a mark placed above A relabels everything (A moves up the slope)', () => {
    const a = createApparatus('assembled', { seed: 42 })
    a.placeMarker(100)
    const marks = a.getMarkers()
    const labels = markerLabels(marks, a.evaluateMarks())
    const top = marks.find((m) => m.railPos_mm === 100)!
    expect(labels.get(top.id)).toBe('0')
    expect(labels.get(marks.find((m) => m.railPos_mm === 200)!.id)).toBe('10')
  })
  it('no marks yet: empty label', () => {
    const a = createApparatus('empty', { seed: 1 })
    expect(markerLabels([{ id: 'x', railPos_mm: 5 }], a.evaluateMarks()).get('x')).toBe('')
  })
})

describe('ghost (assembly affordance) decisions follow the real apparatus', () => {
  const ghosts = (a: ReturnType<typeof createApparatus>): string[] => ghostsFor({ ...a.getState(), geometry: a.getState().geometry })
  it('nothing on an empty bench', () => {
    expect(ghosts(createApparatus('empty', { seed: 1 }))).toEqual([])
  })
  it('stand ghost needs both the rack stand and its base', () => {
    const a = createApparatus('empty', { seed: 1 })
    a.addItem('rackStand')
    expect(ghosts(a)).toEqual([])
    a.addItem('standBase')
    expect(ghosts(a)).toEqual(['stand'])
    a.attach('standBase')
    expect(ghosts(a)).toEqual([])
  })
  it('clamp ghost: rail + stand on base; then the two-leg and receiver ghosts; cart ghost once the rail is mounted', () => {
    const a = createApparatus('empty', { seed: 1 })
    for (const i of ['rail', 'rackStand', 'standBase', 'twoLegStand', 'receiver', 'screws', 'cart'] as const) a.addItem(i)
    a.attach('standBase')
    expect(ghosts(a)).toEqual(['clamp'])
    a.attach('rackClamp', { railEnd: 'E1' })
    expect(ghosts(a)).toEqual(['twoLeg', 'receiver', 'cart'])
    a.attach('twoLegStand'); a.attach('receiver')
    expect(ghosts(a)).toEqual(['cart'])
    a.placeCart(200)
    expect(ghosts(a)).toEqual([])
  })
  it('the assembled preset has no ghosts', () => {
    expect(ghosts(createApparatus('assembled', { seed: 42 }))).toEqual([])
  })
})

describe('cart placement preview', () => {
  it('mirrors the apparatus: the whole cart must lie on the rail and before the stop', () => {
    const a = createApparatus('assembled', { seed: 42 })
    for (const pos of [0, 50, 98, 99, 100, 500, 1100, 1159, 1160, 1161, 1200]) {
      const geo = a.geometry()!
      const view = cartFrontValid(pos, geo.scaleZeroAtHighEnd!, true)
      const b = createApparatus('assembled', { seed: 42 })
      expect(view, `front ${pos} mm`).toBe(b.placeCart(pos).ok)
    }
  })
  it('without a receiver the cart may go to the very end', () => {
    expect(cartFrontValid(1200, true, false)).toBe(true)
    expect(cartFrontValid(1200, true, true)).toBe(false)
  })
  it('clamps to the nearest valid position in both orientations', () => {
    expect(clampCartFront(0, true, true)).toBeCloseTo(CART_LENGTH_m * 1000, 6)
    expect(clampCartFront(1200, true, true)).toBeCloseTo(1160, 6)
    expect(clampCartFront(0, false, true)).toBeCloseTo(1200 - 1160 + 0, 6) // E2 on top: the stop is near printed 40
    expect(clampCartFront(1200, false, true)).toBeCloseTo(1200 - CART_LENGTH_m * 1000, 6)
  })
  it('ghost goes to mark A when it exists, else just inside the top end', () => {
    expect(cartGhostFront_mm(200, true)).toBe(200)
    expect(cartGhostFront_mm(null, true)).toBeCloseTo(CART_LENGTH_m * 1000 + 10, 6)
    expect(cartGhostFront_mm(null, false)).toBeCloseTo(1200 - CART_LENGTH_m * 1000 - 10, 6)
  })
})

describe('drag maths', () => {
  it('rack reading from a clamp height (6 cm base) with clamping to the scale', () => {
    expect(rackFromHeight_mm(6)).toBe(0)
    expect(rackFromHeight_mm(8.5)).toBe(25)
    expect(rackFromHeight_mm(-3)).toBe(0)
    expect(rackFromHeight_mm(100)).toBe(250)
    expect(clampHeight_cm(25)).toBeCloseTo(8.5, 9)
  })
  it('foot drag: one pixel is one 0.05 mm step, snapped and limited to +-5 mm', () => {
    expect(footFromDrag_mm(0, 10)).toBeCloseTo(0.5, 9)
    expect(footFromDrag_mm(0.3, -2)).toBeCloseTo(0.2, 9)
    expect(footFromDrag_mm(0, 1000)).toBe(5)
    expect(footFromDrag_mm(0, -1000)).toBe(-5)
    expect(footFromDrag_mm(1.23, 0)).toBeCloseTo(1.25, 9)
    expect(twoLegHeight_cm(2)).toBeCloseTo(6.2, 9)
  })
  it('wheel notches: up raises', () => {
    expect(rackWheelStep_mm(-100)).toBe(1)
    expect(rackWheelStep_mm(100)).toBe(-1)
    expect(footWheelStep_mm(-100, false)).toBeCloseTo(0.05, 9)
    expect(footWheelStep_mm(100, true)).toBeCloseTo(-0.25, 9)
  })
})

describe('tape length drawn in the scene equals what the apparatus measures', () => {
  it('for every kind of target', () => {
    const a = createApparatus('assembled', { seed: 42 })
    const geo = a.getState().geometry
    const targets: TapeTarget[] = [
      { kind: 'railHeight', at: 'clamp' }, { kind: 'railHeight', at: 'twoLeg' }, { kind: 'railHeight', at: { railPos_mm: 400 } },
      { kind: 'cartLength' }, { kind: 'supportSeparation' },
    ]
    for (const t of targets) {
      const r = a.tapeMeasure(t)
      expect(r.ok).toBe(true)
      if (r.ok) expect(tapeLength_m(t, geo)).toBeCloseTo(r.reading.trueLength_m, 9)
    }
  })
  it('a rail position outside the rail is not drawable', () => {
    const a = createApparatus('assembled', { seed: 42 })
    expect(tapeLength_m({ kind: 'railHeight', at: { railPos_mm: 1300 } }, a.getState().geometry)).toBeNull()
    expect(tapeLength_m({ kind: 'railHeight', at: 'clamp' }, null)).toBeNull()
  })
})

describe('staging layout', () => {
  it('every slot is on the table and clear of the mounted rail line (z = 0) and the loose rail (z = 25)', () => {
    for (const [k, s] of Object.entries(STAGING)) {
      expect(s.x, k).toBeGreaterThan(TABLE.x - TABLE.width / 2)
      expect(s.x, k).toBeLessThan(TABLE.x + TABLE.width / 2)
      expect(Math.abs(s.z), k).toBeLessThan(TABLE.depth / 2)
      expect(Math.abs(s.z), k).toBeGreaterThan(13)
      expect(Math.abs(s.z - 25) > 6 || k === 'rail', k).toBe(true)
    }
    expect(Math.abs(LEVEL_ON_TABLE.z)).toBeGreaterThan(10)
  })
})
