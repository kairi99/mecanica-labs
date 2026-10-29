import { describe, expect, it } from 'vitest'
import { createApparatus } from '../../src/experiments/newton2/apparatus/index.ts'
import {
  BENCH_HEIGHT_m, FLOOR_FRICTION_COEFF, FLOOR_RESTITUTION, G_QUITO_mps2, NO_VARIABILITY, NOMINAL_PARTS, fallAt, planFall,
} from '../../src/experiments/newton2/physics/index.ts'

const exact = { seed: 1, tableTilt_rad: 0, parts: NOMINAL_PARTS, variability: NO_VARIABILITY }

describe('planFall (pure ballistic drop with the Quito g)', () => {
  const p = planFall({ g_mps2: G_QUITO_mps2, vExit_mps: 0.8, slope_rad: 0, h_m: 1 })
  it('lands after sqrt(2 h / g) with the exit speed as horizontal speed', () => {
    expect(p.tLand_s).toBeCloseTo(Math.sqrt((2 * 1) / G_QUITO_mps2), 10)
    expect(p.xLand_m).toBeCloseTo(0.8 * p.tLand_s, 10)
    expect(p.vImpact_mps).toBeCloseTo(G_QUITO_mps2 * p.tLand_s, 10)
  })
  it('is deterministic and continuous: starts at the rail end, ends at rest on the floor', () => {
    expect(fallAt(p, 0)).toMatchObject({ x_m: 0, y_m: 1, drop_m: 0, onFloor: false })
    expect(fallAt(planFall({ g_mps2: G_QUITO_mps2, vExit_mps: 0.8, slope_rad: 0, h_m: 1 }), 0.1)).toEqual(fallAt(p, 0.1))
    const end = fallAt(p, p.tRest_s + 5)
    expect(end).toMatchObject({ y_m: 0, onFloor: true, speed_mps: 0 })
    expect(end.x_m).toBeCloseTo(p.xRest_m, 10)
    expect(fallAt(p, p.tRest_s).x_m).toBeCloseTo(p.xRest_m, 8)
    // height never negative, x never decreases
    let lastX = 0
    for (let t = 0; t <= p.tRest_s; t += 0.01) { const f = fallAt(p, t); expect(f.y_m).toBeGreaterThanOrEqual(0); expect(f.x_m).toBeGreaterThanOrEqual(lastX - 1e-12); lastX = f.x_m }
  })
  it('bounces with the restitution and slides to rest with the floor friction', () => {
    expect(p.arcs[1]!.vy0_mps).toBeCloseTo(FLOOR_RESTITUTION * p.vImpact_mps, 10)
    expect(p.xRest_m - p.vx_mps * p.tSlide_s).toBeCloseTo(p.vx_mps ** 2 / (2 * FLOOR_FRICTION_COEFF * G_QUITO_mps2), 10)
  })
  it('a steeper exit slope adds a downward start speed: it lands sooner', () => {
    const q = planFall({ g_mps2: G_QUITO_mps2, vExit_mps: 0.8, slope_rad: 0.3, h_m: 1 })
    expect(q.tLand_s).toBeLessThan(p.tLand_s)
  })
})

describe('the cart falls when the pulley end is open', () => {
  it('no receiver: release runs off the rail end, falls to the floor and stays fallen; no timing, no DigiCart record; flagged as a run that did not count', () => {
    const a = createApparatus('assembled', exact)
    a.detach('receiver')
    const r = a.releaseCart(0)
    expect(r).toMatchObject({ ok: true, outcome: 'fell' })
    const rec = a.getRun(1)!
    expect(rec.tEnd_s).toBeNull()
    expect(rec.fall).toBeDefined()
    expect(a.digicartRecord(1)).toBeNull()
    expect(a.cartState(0).phase).toBe('rolling')
    const tExit = rec.fall!.tExit_s * 1000
    expect(a.cartState(tExit - 50).phase).toBe('rolling')
    const falling = a.cartState(tExit + 100)
    expect(falling.phase).toBe('falling')
    expect(falling.fall!.drop_m).toBeGreaterThan(0)
    const end = a.cartState(tExit + 30000)
    expect(end.phase).toBe('fallen')
    expect(end.fall!.onFloor).toBe(true)
    // the floor is BENCH_HEIGHT below the bench top: the cart drops about that much (rail end is a few cm above the bench)
    expect(end.fall!.drop_m).toBeGreaterThan(BENCH_HEIGHT_m)
    expect(a.procedure().cartAtStart).toBe(false)
    expect(a.procedure().outcomes.fell).toBe(1)
    // a second release is refused until the cart is put back
    expect(a.releaseCart(tExit + 31000)).toMatchObject({ ok: false, reason: 'cartNotAtStart' })
    expect(a.releaseCart(tExit + 10)).toMatchObject({ ok: false, reason: 'cartMoving' })
    expect(a.resetCart().ok).toBe(true)
    expect(a.cartState(tExit + 40000).phase).toBe('atStart')
  })
  it('the run is deterministic for the same bench and seed', () => {
    const run = () => { const a = createApparatus('assembled', exact); a.detach('receiver'); a.releaseCart(0); return a.getRun(1)!.fall! }
    expect(run()).toEqual(run())
  })
  it('the stopwatch stop of a fallen run carries no true end-mark time', () => {
    const a = createApparatus('assembled', exact)
    a.detach('receiver')
    a.releaseCart(0)
    a.stopwatchStartStop(100)
    const r = a.stopwatchStartStop(2500)
    expect(r.ok && r.stop?.crossings[0]?.trueTime_s).toBeNull()
  })
  it('with the receiver fitted the cart never falls (it is stopped at the receiver)', () => {
    const a = createApparatus('assembled', exact)
    expect(a.releaseCart(0)).toMatchObject({ ok: true, outcome: 'ok' })
    expect(a.getRun(1)!.fall).toBeUndefined()
    for (const t of [500, 2000, 8000, 60000]) expect(['rolling', 'coasting', 'stopped']).toContain(a.cartState(t).phase)
    expect(a.cartState(10000).fall).toBeNull()
  })
  it('survives a snapshot round trip (plain data)', () => {
    const a = createApparatus('assembled', exact)
    a.detach('receiver')
    a.releaseCart(0)
    const tExit = a.getRun(1)!.fall!.tExit_s * 1000
    const b = createApparatus('empty', exact)
    b.load(JSON.parse(JSON.stringify(a.snapshot())))
    expect(b.cartState(tExit + 200)).toEqual(a.cartState(tExit + 200))
  })
})
