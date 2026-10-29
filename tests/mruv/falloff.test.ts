import { describe, expect, it } from 'vitest'
import { createApparatus, TABLE_HEIGHT_m, TABLE_EDGE_X_m } from '../../src/experiments/mruv/apparatus/index.ts'
import {
  DEFAULT_CART, LANDING_RETENTION, NO_VARIABILITY, DEFAULT_VARIABILITY, C_RR_SURFACE, fallOffPath, fallSampleAt, mulberry32,
  sampleLandingRetention, surfaceDeceleration_mps2,
} from '../../src/experiments/mruv/physics/index.ts'

const g = DEFAULT_CART.g_mps2
const base = { theta_rad: 0, h_m: 0.1, tableHeight_m: 0.75, v_mps: 0 }

describe('fallOffPath (projectile from the rail end, rolling run-out)', () => {
  it('from rest at the rail end with a far table edge: lands on the table after sqrt(2h/g) (free fall)', () => {
    const r = fallOffPath({ ...base, edgeDistance_m: 5 })
    expect(r.tTableLand_s!).toBeCloseTo(Math.sqrt((2 * 0.1) / g), 9)
    expect(r.final).toBe('onTable')
    expect(r.restX_m).toBeCloseTo(0, 9)
  })
  it('horizontal launch beyond the table edge: falls to the floor after sqrt(2(h+H)/g); horizontal speed constant in flight', () => {
    const v = 2
    const r = fallOffPath({ ...base, v_mps: v, edgeDistance_m: 0.1 })
    expect(r.final).toBe('onFloor')
    expect(r.tTableLand_s).toBeNull()
    expect(r.tFloorLand_s!).toBeCloseTo(Math.sqrt((2 * (0.1 + 0.75)) / g), 9)
    const landing = fallSampleAt(r, r.tFloorLand_s! - 1e-6)
    expect(landing.x_m).toBeCloseTo(v * r.tFloorLand_s!, 3)
  })
  it('leaves the table edge horizontally and falls H in sqrt(2H/g)', () => {
    const r = fallOffPath({ ...base, h_m: 0, v_mps: 0.8, edgeDistance_m: 0.2 })
    expect(r.final).toBe('onFloor')
    expect(r.tEdge_s).not.toBeNull()
    expect(r.tFloorLand_s! - r.tEdge_s!).toBeCloseTo(Math.sqrt((2 * 0.75) / g), 3)
  })
  it('stays on the table when the run-out is shorter than the distance to the edge', () => {
    const r = fallOffPath({ ...base, v_mps: 0.3, theta_rad: 0.02, edgeDistance_m: 1 })
    const a = surfaceDeceleration_mps2(DEFAULT_CART, C_RR_SURFACE)
    const u = LANDING_RETENTION * 0.3 * Math.cos(0.02)
    expect(r.final).toBe('onTable')
    // rest distance = flight + u^2 / (2 a): energy balance of the rolling run-out
    const flightX = 0.3 * Math.cos(0.02) * r.tTableLand_s!
    expect(r.restX_m).toBeCloseTo(flightX + (u * u) / (2 * a), 6)
  })
  it('reaches the floor when the run-out is longer than the distance to the edge', () => {
    const r = fallOffPath({ ...base, v_mps: 1, theta_rad: 0.02, edgeDistance_m: 0.3 })
    expect(r.final).toBe('onFloor')
    expect(r.restY_m).toBe(-0.75)
  })
  it('is deterministic and the last sample is the rest pose', () => {
    const a = fallOffPath({ ...base, v_mps: 0.7, theta_rad: 0.0227, edgeDistance_m: 0.4 })
    const b = fallOffPath({ ...base, v_mps: 0.7, theta_rad: 0.0227, edgeDistance_m: 0.4 })
    expect(a).toEqual(b)
    const last = a.samples[a.samples.length - 1]!
    expect(last.t_s).toBeCloseTo(a.tRest_s, 12)
    expect(last.y_m).toBe(a.restY_m)
  })
  it('landing scatter uses only the injected RNG: none without sigma, reproducible with a seed', () => {
    expect(sampleLandingRetention(mulberry32(1), NO_VARIABILITY)).toBe(LANDING_RETENTION)
    expect(sampleLandingRetention(mulberry32(5), DEFAULT_VARIABILITY)).toBe(sampleLandingRetention(mulberry32(5), DEFAULT_VARIABILITY))
  })
})

describe('apparatus: cart without the receiver falls', () => {
  const fallRun = () => {
    const a = createApparatus('assembled', { seed: 3 })
    a.detach('receiver')
    expect(a.releaseCart(0).ok).toBe(true)
    return a
  }
  it('with the receiver the cart stops on the rail and never falls', () => {
    const a = createApparatus('assembled', { seed: 3 })
    a.releaseCart(0)
    expect(a.getRuns()[0]!.fall).toBeNull()
    expect(a.cartState(60000).phase).toBe('stopped')
    expect(a.cartFall(60000)).toBeNull()
  })
  it('without it the cart leaves the rail end, falls to the table top or the floor, and the run is invalid', () => {
    const a = fallRun()
    const rec = a.getRuns()[0]!
    expect(rec.fall).not.toBeNull()
    const tl = rec.fall!.tLeave_s
    expect(a.cartState((tl - 0.5) * 1000).phase).toBe('rolling')
    expect(a.cartState((tl + 0.05) * 1000).phase).toBe('falling')
    expect(a.cartState(120000).phase).toBe('fallen')
    expect(a.cartFall((tl - 0.1) * 1000)).toBeNull()
    const end = a.cartFall(120000)!
    expect(end.final).toBe(rec.fall!.final)
    expect(end.y_m).toBe(rec.fall!.final === 'onFloor' ? -TABLE_HEIGHT_m : 0)
    // no valid timing: no DigiCart log, no true crossing times
    expect(a.digicartRecord(rec.id)).toBeNull()
    expect(rec.marks.every((m) => m.trueTime_s === null)).toBe(true)
  })
  it('with the default bench the cart rolls off the table edge to the floor', () => {
    const a = fallRun()
    expect(a.getRuns()[0]!.fall!.final).toBe('onFloor')
    expect(a.cartFall(120000)!.x_m).toBeGreaterThan(TABLE_EDGE_X_m)
  })
  it('placing the cart on the rail again restores it, and a snapshot keeps the fallen state', () => {
    const a = fallRun()
    const b = createApparatus('empty', { seed: 3 })
    expect(b.load(a.snapshot()).ok).toBe(true)
    expect(b.cartState(120000).phase).toBe('fallen')
    expect(b.cartFall(120000)!.x_m).toBeCloseTo(a.cartFall(120000)!.x_m, 12)
    expect(a.resetCart().ok).toBe(true)
    expect(a.cartState(130000).phase).toBe('atStart')
    expect(a.cartFall(130000)).toBeNull()
  })
  it('putting the cart off the table (tray) clears the fallen state', () => {
    const a = fallRun()
    expect(a.removeItem('cart').ok).toBe(true)
    expect(a.cartState(120000).phase).toBe('unplaced')
  })
})
