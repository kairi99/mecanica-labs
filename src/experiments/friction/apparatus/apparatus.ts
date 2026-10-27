// Device logic of the Practica 4 bench (friction): inventory, setup of the block/scale/paper (exps. 1 and 2), the student's pull and
// "read now" press, the balance, the raised rail with the rack-and-pinion stand, the slip and slide of the bars, the stopwatch, tape
// reading of h, Tablas 4.1 to 4.3, the reference record, snapshot. DOM-free, timer-free, no Math.random. Time is passed in (ms
// timestamps from the caller). Physics only through ../physics. Hidden truth (masses, trial coefficients, real course length) is revealed
// only by measuring, or by hiddenTruth() / reference*() for the teacher and the "reference" overlay (hideable with ?reference=0).
import { CountedRng, gaussian, mulberry32 } from '../../../core/physics/noise.ts'
import { TAPE_DIVISION_m, quantize } from '../../../core/physics/instruments.ts'
import { Stopwatch } from '../../../core/instruments/stopwatch.ts'
import {
  SPRING_SCALES, createSpringScale, rezeroSpringScale, springScaleReading, type SpringScale, type SpringScaleId,
} from '../../../core/instruments/springScale.ts'
import {
  BAR_MASS_kg, BAR_PAIRS, BAR_SCATTER, BLOCK_ON_TABLE, COURSE_m, FACE_IDS, FACE_PAIRS, FACE_SCATTER, G_QUITO_mps2, LOOSE_PAPER_SCATTER, PAPER_ON_TABLE, PAPER_TRAVEL_m,
  PULL_SPEED_MAX_mps, PULL_SPEED_MIN_mps, PullSimulator, RACK_H_MAX_m, RAISE_RATE_MAX_mps, RAISE_RATE_MIN_mps, heightAt_m, inclineAngle_rad,
  sampleBenchMasses, sampleHand, sampleTrialCoefficients, simulateIncline, MASS_COUNT,
  type BarId, type FaceId, type InclineRun, type PullParams, type RaiseProfile,
} from '../physics/index.ts'
import {
  BALANCE_RESOLUTION_kg, BALANCE_SIGMA_kg, BAR_ITEM, BAR_ORDER, COURSE_MAX_m, COURSE_MIN_m, COURSE_SIGMA_m, COURSE_SNAP_m, FACE_ORDER, ITEM_IDS, MASS_STEPS,
  MAX_EVENTS, REFERENCE_DT_s, SCALE_ITEM, T41_ROWS, T42_ROWS, T43_TRIALS, T4_READINGS, UNLISTED_NEEDED_ITEMS, type ItemId,
} from './constants.ts'
import { emptyForceCell, emptyTables, parseForceInput, parseHeightInput, parseTimeInput, tableFill } from './table.ts'
import type {
  ApparatusEvent, ApparatusEventBody, ApparatusSnapshot, ApparatusState, Failure, InclineReference, InclineStatus, InclineTrialRecord, PaperState,
  PresetId, ProcedureSummary, PullReference, PullRunRecord, PullSetup, PullStatus, ReadingRecord, Reason, Result, SlideCrossing, StopRecord, TableData,
} from './types.ts'

export interface ApparatusOptions {
  /** Seeds the hidden masses and the per-run variability. Default 1. */
  seed?: number
  /** Override the hidden true masses (tests, teacher mode). */
  block_kg?: number
}

const RUN_STREAM = 0x9e3779b9
const READ_STREAM = 0x5bd1e995
const HIDDEN_STREAM = 0x27d4eb2f
/** Placement noise of the tape on h, m. ASSUMED. */
const HEIGHT_READ_SIGMA_m = 0.0005
const fail = (reason: Reason, item?: ItemId): Failure => (item ? { ok: false, reason, item } : { ok: false, reason })
const freshZeroed = (): Record<SpringScaleId, boolean> => ({ '1N': false, '2N': false })
const round6 = (v: number): number => Math.round(v * 1e6) / 1e6

export class FrictionApparatus {
  private readonly seed: number
  private hidden: { block_kg: number; masses_kg: number[] }
  private runRng: CountedRng
  private readRng: CountedRng
  private listeners: ((e: ApparatusEvent) => void)[] = []
  private events: ApparatusEvent[] = []
  private seq = 0
  private clock_ms = 0
  private items = new Set<ItemId>()
  // exps. 1 and 2
  private face: FaceId | null = null
  private addedMasses = 0
  private scaleId: SpringScaleId | null = null
  private paper: PaperState = 'none'
  private zeroed = freshZeroed()
  private measuredBlock_kg: number | null = null
  private pullRuns: PullRunRecord[] = []
  private activePull: number | null = null
  private sims = new Map<number, PullSimulator>()
  private announced = new Set<string>()
  private lastReading: ReadingRecord | null = null
  // exp. 3
  private courseTrue_m: number | null = null
  private bar: BarId | null = null
  private rackH_m = 0
  private trials: InclineTrialRecord[] = []
  private activeTrial: number | null = null
  private inclineCache = new Map<number, InclineRun>()
  private lastHeight_m: number | null = null
  private readonly sw = new Stopwatch<SlideCrossing>()
  private tables: TableData = emptyTables()

  constructor(opts: ApparatusOptions = {}) {
    this.seed = opts.seed ?? 1
    this.hidden = FrictionApparatus.drawHidden(this.seed, opts)
    this.runRng = new CountedRng(this.seed ^ RUN_STREAM)
    this.readRng = new CountedRng(this.seed ^ READ_STREAM)
  }
  private static drawHidden(seed: number, opts: ApparatusOptions): { block_kg: number; masses_kg: number[] } {
    const m = sampleBenchMasses(mulberry32(seed ^ HIDDEN_STREAM))
    return { block_kg: opts.block_kg ?? m.block_kg, masses_kg: m.masses_kg }
  }

  // ---- events ----------------------------------------------------------------------------------------------------
  on(listener: (e: ApparatusEvent) => void): () => void {
    this.listeners.push(listener)
    return () => { this.listeners = this.listeners.filter((l) => l !== listener) }
  }
  eventLog(): readonly ApparatusEvent[] { return this.events }
  private emit(body: ApparatusEventBody, t_ms: number | null = null): void {
    const e = { ...body, seq: ++this.seq, t_ms } as ApparatusEvent
    this.events.push(e)
    if (this.events.length > MAX_EVENTS) this.events.shift()
    for (const l of this.listeners) l(e)
  }
  private refuse(action: string, reason: Reason, item?: ItemId): Failure {
    this.emit({ type: 'refused', action, reason })
    return fail(reason, item)
  }
  private touch(t_ms: number): void { if (t_ms > this.clock_ms) this.clock_ms = t_ms }

  // ---- inventory -------------------------------------------------------------------------------------------------
  hasItem(id: ItemId): boolean { return this.items.has(id) }
  addItem(id: ItemId): Result {
    if (!(ITEM_IDS as readonly string[]).includes(id)) return this.refuse('addItem', 'unknownItem')
    if (this.items.has(id)) return this.refuse('addItem', 'itemAlreadyOnTable', id)
    this.items.add(id)
    this.emit({ type: 'itemAdded', item: id })
    return { ok: true }
  }
  removeItem(id: ItemId): Result {
    if (!this.items.has(id)) return this.refuse('removeItem', 'itemNotOnTable', id)
    if (this.activePull !== null && (id === 'block' || id === this.scaleItem())) return this.refuse('removeItem', 'pulling', id)
    if (this.activeTrial !== null && (id === 'rail' || id === 'rackStand' || id === 'standBase' || (this.bar !== null && id === BAR_ITEM[this.bar]))) return this.refuse('removeItem', 'raising', id)
    this.items.delete(id)
    if (id === 'block') this.face = null
    if (id === 'masses50') this.addedMasses = 0
    if (id === 'scale1N') { this.zeroed['1N'] = false; if (this.scaleId === '1N') this.scaleId = null }
    if (id === 'scale2N') { this.zeroed['2N'] = false; if (this.scaleId === '2N') this.scaleId = null }
    if (id === 'paper') this.paper = 'none'
    if (id === 'rail') { this.courseTrue_m = null; this.bar = null }
    if (this.bar !== null && id === BAR_ITEM[this.bar]) this.bar = null
    this.emit({ type: 'itemRemoved', item: id })
    return { ok: true }
  }
  private scaleItem(): ItemId | null { return this.scaleId ? SCALE_ITEM[this.scaleId] : null }

  // ---- setup of exps. 1 and 2 ------------------------------------------------------------------------------------------
  /** Put one face of the block down on the paper. */
  setFace(face: FaceId): Result {
    if (!(FACE_IDS as readonly string[]).includes(face)) return this.refuse('setFace', 'unknownFace')
    if (!this.items.has('block')) return this.refuse('setFace', 'needBlock', 'block')
    if (this.activePull !== null) return this.refuse('setFace', 'pulling')
    this.face = face
    this.emit({ type: 'faceSet', face })
    return { ok: true }
  }
  /** Masses stacked on the block (0 to 3 of 50 g). */
  setAddedMasses(count: number): Result {
    if (!Number.isInteger(count) || count < 0 || count > MASS_COUNT) return this.refuse('setAddedMasses', 'badMassCount')
    if (count > 0 && !this.items.has('masses50')) return this.refuse('setAddedMasses', 'needMasses', 'masses50')
    if (this.activePull !== null) return this.refuse('setAddedMasses', 'pulling')
    this.addedMasses = count
    this.emit({ type: 'massesSet', count })
    return { ok: true }
  }
  /** Hook the chosen scale to the block. */
  chooseScale(id: SpringScaleId): Result {
    if (!(id in SPRING_SCALES)) return this.refuse('chooseScale', 'unknownScale')
    if (!this.items.has(SCALE_ITEM[id])) return this.refuse('chooseScale', 'itemNotOnTable', SCALE_ITEM[id])
    if (this.activePull !== null) return this.refuse('chooseScale', 'pulling')
    this.scaleId = id
    this.emit({ type: 'scaleChosen', scale: id })
    return { ok: true }
  }
  /** Lay the sheet of paper on the table (loose), or tape it down (fixed): the guide says to fix it. */
  placePaper(state: 'loose' | 'fixed'): Result {
    if (!this.items.has('paper')) return this.refuse('placePaper', 'needPaper', 'paper')
    if (this.activePull !== null) return this.refuse('placePaper', 'pulling')
    this.paper = state
    this.emit({ type: 'paperPlaced', state })
    return { ok: true }
  }
  removePaper(): Result {
    if (this.activePull !== null) return this.refuse('removePaper', 'pulling')
    this.paper = 'none'
    this.emit({ type: 'paperPlaced', state: 'none' })
    return { ok: true }
  }
  /** Turn the zero screw of the chosen scale with the scale lying horizontally. */
  zeroScale(): Result {
    if (!this.scaleId) return this.refuse('zeroScale', 'needScale')
    this.zeroed[this.scaleId] = true
    this.emit({ type: 'scaleZeroed', scale: this.scaleId })
    return { ok: true }
  }
  private scaleObj(id: SpringScaleId): SpringScale {
    const s = createSpringScale(id, 'horizontal')
    return this.zeroed[id] ? rezeroSpringScale(s) : s
  }
  /** The scale as it is now (for the view: spec, zero error), or null if none is chosen. */
  currentScale(): SpringScale | null { return this.scaleId ? this.scaleObj(this.scaleId) : null }

  // ---- balance -----------------------------------------------------------------------------------------------------------
  /** Weigh the block, the silver masses on the pan together (`count` of them) or a bar. Reads to 0.1 g with a little noise. */
  weigh(target: 'block' | { masses: number } | { bar: BarId }): Result<{ value_kg: number }> {
    if (!this.items.has('balance')) return this.refuse('weigh', 'needBalance', 'balance')
    let truth: number
    let label: string
    if (target === 'block') {
      if (!this.items.has('block')) return this.refuse('weigh', 'needBlock', 'block')
      truth = this.hidden.block_kg; label = 'block'
    } else if ('masses' in target) {
      if (!this.items.has('masses50')) return this.refuse('weigh', 'needMasses', 'masses50')
      if (!Number.isInteger(target.masses) || target.masses < 1 || target.masses > MASS_COUNT) return this.refuse('weigh', 'badMassCount')
      truth = this.hidden.masses_kg.slice(0, target.masses).reduce((a, b) => a + b, 0); label = `masses${target.masses}`
    } else {
      if (!this.items.has(BAR_ITEM[target.bar])) return this.refuse('weigh', 'itemNotOnTable', BAR_ITEM[target.bar])
      truth = BAR_MASS_kg[target.bar]; label = `bar:${target.bar}`
    }
    const value_kg = round6(quantize(truth + BALANCE_SIGMA_kg * gaussian(this.readRng.next), BALANCE_RESOLUTION_kg))
    if (target === 'block') this.measuredBlock_kg = value_kg
    this.emit({ type: 'weighed', target: label, value_kg })
    return { ok: true, value_kg }
  }

  // ---- the pull (exps. 1 and 2) -------------------------------------------------------------------------------------------
  /** What blocks a pull, as reasons (empty: ready). */
  pullBlocks(): Reason[] {
    const r: Reason[] = []
    if (!this.items.has('block')) r.push('needBlock')
    if (this.face === null) r.push('needFace')
    if (this.scaleId === null) r.push('needScale')
    if (this.paper === 'none') r.push('needPaper')
    if (this.activePull !== null) r.push('pulling')
    return r
  }
  private pullParams(rec: PullRunRecord): PullParams {
    const spec = SPRING_SCALES[rec.setup.scale]
    const fixed = rec.setup.paper === 'fixed'
    return {
      k_Npm: spec.k_Npm, c_Nspm: spec.damping_Nspm, mass_kg: rec.mass_kg, mu_s: rec.mu_s, mu_k: rec.mu_k, g_mps2: G_QUITO_mps2,
      paperTravel_m: fixed ? PAPER_TRAVEL_m : Infinity, ...(fixed ? { off: BLOCK_ON_TABLE } : {}), hand: rec.hand,
    }
  }
  private simOf(rec: PullRunRecord): PullSimulator {
    let sim = this.sims.get(rec.id)
    if (!sim) {
      sim = new PullSimulator(this.pullParams(rec))
      for (const c of rec.commands) sim.setSpeed(c.t_s, c.speed_mps)
      this.sims.set(rec.id, sim)
    }
    return sim
  }
  private activePullRec(): PullRunRecord | null { return this.activePull === null ? null : this.pullRuns.find((r) => r.id === this.activePull) ?? null }

  /** Begin pulling at speed_mps (m/s, 2 to 200 mm/s). The scale's far end moves at that speed; the hand lags and wobbles a little. */
  pullStart(t_ms: number, speed_mps: number): Result<{ runId: number }> {
    this.touch(t_ms)
    const blocks = this.pullBlocks()
    if (blocks.length) return this.refuse('pullStart', blocks[0]!, blocks[0] === 'needBlock' ? 'block' : undefined)
    if (!(speed_mps >= PULL_SPEED_MIN_mps && speed_mps <= PULL_SPEED_MAX_mps)) return this.refuse('pullStart', 'badSpeed')
    const setup: PullSetup = { face: this.face!, addedMasses: this.addedMasses, scale: this.scaleId!, paper: this.paper, scaleZeroed: this.zeroed[this.scaleId!] }
    const pair = setup.paper === 'fixed' ? FACE_PAIRS[setup.face] : PAPER_ON_TABLE
    const cfg = setup.paper === 'fixed' ? FACE_SCATTER : LOOSE_PAPER_SCATTER
    const co = sampleTrialCoefficients(this.runRng.next, pair, cfg)
    const hand = sampleHand(this.runRng.next)
    const mass_kg = this.hidden.block_kg + this.hidden.masses_kg.slice(0, setup.addedMasses).reduce((a, b) => a + b, 0)
    const rec: PullRunRecord = {
      id: this.pullRuns.length + 1, setup, mass_kg, mu_s: co.mu_s, mu_k: co.mu_k, hand, zeroError_N: this.scaleObj(setup.scale).zeroError_N,
      start_ms: t_ms, end_ms: null, commands: [{ t_s: 0, speed_mps }],
    }
    this.pullRuns.push(rec)
    this.activePull = rec.id
    this.simOf(rec)
    this.emit({ type: 'pullStarted', runId: rec.id, speed_mps }, t_ms)
    return { ok: true, runId: rec.id }
  }
  /** Change the pull speed (0 stops the hand: the block may still be moving). */
  pullSetSpeed(t_ms: number, speed_mps: number): Result {
    this.touch(t_ms)
    const rec = this.activePullRec()
    if (!rec) return this.refuse('pullSetSpeed', 'notPulling')
    if (!(speed_mps === 0 || (speed_mps >= PULL_SPEED_MIN_mps && speed_mps <= PULL_SPEED_MAX_mps))) return this.refuse('pullSetSpeed', 'badSpeed')
    const t_s = Math.max(0, (t_ms - rec.start_ms) / 1000)
    rec.commands.push({ t_s, speed_mps })
    this.simOf(rec).setSpeed(t_s, speed_mps)
    this.emit({ type: 'pullSpeed', runId: rec.id, speed_mps }, t_ms)
    return { ok: true }
  }
  pullStop(t_ms: number): Result { return this.pullSetSpeed(t_ms, 0) }
  /** Let go of the scale: the pull ends and the block goes back to its start for the next try. */
  pullEnd(t_ms: number): Result {
    this.touch(t_ms)
    const rec = this.activePullRec()
    if (!rec) return this.refuse('pullEnd', 'notPulling')
    this.announce(rec, t_ms)
    rec.end_ms = t_ms
    this.activePull = null
    this.emit({ type: 'pullEnded', runId: rec.id }, t_ms)
    return { ok: true }
  }
  private announce(rec: PullRunRecord, t_ms: number): void {
    const sim = this.simOf(rec)
    const s = sim.summary()
    if (s.breakaway_t_s !== null && !this.announced.has(`b${rec.id}`)) { this.announced.add(`b${rec.id}`); this.emit({ type: 'breakaway', runId: rec.id, t_s: s.breakaway_t_s }, t_ms) }
    if (s.leftPaper_t_s !== null && !this.announced.has(`o${rec.id}`)) { this.announced.add(`o${rec.id}`); this.emit({ type: 'offPaper', runId: rec.id }, t_ms) }
  }
  /** State of the pull at t_ms (the latest run; frozen at its end). */
  pullStatus(t_ms: number): PullStatus {
    const rec = this.activePullRec() ?? this.pullRuns[this.pullRuns.length - 1] ?? null
    if (!rec) return { phase: 'idle', runId: null, t_s: 0, scale: null, x_block_m: 0, x_pull_m: 0, v_block_mps: 0, sliding: false, offPaper: false }
    const end = rec.end_ms ?? t_ms
    const t_s = Math.max(0, (Math.min(t_ms, end) - rec.start_ms) / 1000)
    const sim = this.simOf(rec)
    sim.advanceTo(t_s)
    this.announce(rec, t_ms)
    const st = sim.stateAt(t_s)
    return {
      phase: rec.end_ms === null ? 'pulling' : 'ended', runId: rec.id, t_s, scale: springScaleReading(this.scaleObj(rec.setup.scale), st.F_N),
      x_block_m: st.x_block_m, x_pull_m: st.x_pull_m, v_block_mps: st.v_block_mps, sliding: st.sliding, offPaper: sim.summary().leftPaper_t_s !== null,
    }
  }
  /**
   * The "read now" press: the scale reading (to the nearest division) at the instant the student presses, not at the best instant. A press
   * after the breakaway catches the dropped force, a press during stick-slip a random point of the oscillation.
   */
  readScale(t_ms: number): Result<{ reading: ReadingRecord }> {
    this.touch(t_ms)
    const rec = this.activePullRec()
    if (!rec) return this.refuse('readScale', 'notPulling')
    const st = this.pullStatus(t_ms)
    const r = st.scale!
    this.lastReading = { value_N: round6(r.reading_N), scale: rec.setup.scale, runId: rec.id, t_s: st.t_s, overRange: r.overRange, belowZero: r.belowZero }
    this.emit({ type: 'read', runId: rec.id, value_N: this.lastReading.value_N, overRange: r.overRange }, t_ms)
    return { ok: true, reading: { ...this.lastReading } }
  }
  lastScaleReading(): ReadingRecord | null { return this.lastReading ? { ...this.lastReading } : null }
  getPullRuns(): readonly PullRunRecord[] { return this.pullRuns }

  /** Reference record of a pull: the true force trace as a force sensor would sample it, until the end (or the last query). */
  referencePull(runId: number): PullReference | null {
    const rec = this.pullRuns.find((r) => r.id === runId)
    if (!rec) return null
    const sim = this.simOf(rec)
    const tEnd = rec.end_ms !== null ? (rec.end_ms - rec.start_ms) / 1000 : sim.time_s
    sim.advanceTo(tEnd)
    const t_s: number[] = [], F_N: number[] = []
    const samples = sim.samples()
    let j = 0
    for (let t = 0; t <= tEnd + 1e-9; t += REFERENCE_DT_s) {
      while (j + 1 < samples.length && samples[j + 1]!.t_s <= t + 1e-9) j++
      t_s.push(round6(t)); F_N.push(round6(samples[j]!.F_N))
    }
    const N = rec.mass_kg * G_QUITO_mps2
    return { runId, t_s, F_N, summary: sim.summary(), mu_s: rec.mu_s, mu_k: rec.mu_k, Fk_N: rec.mu_k * N, Fs_N: rec.mu_s * N, setup: { ...rec.setup } }
  }

  // ---- exp. 3: course, bar, rack ----------------------------------------------------------------------------------------------
  /** Measure `length_m` along the rail with the tape and mark the start and the finish (default 1.00 m). The real mark spacing differs a little. */
  markCourse(length_m: number = COURSE_m): Result {
    if (!this.items.has('rail')) return this.refuse('markCourse', 'needRail', 'rail')
    if (!this.items.has('tape')) return this.refuse('markCourse', 'needTape', 'tape')
    if (!(length_m > 0) || !Number.isFinite(length_m)) return this.refuse('markCourse', 'badTarget')
    if (length_m > COURSE_MAX_m + 1e-9) return this.refuse('markCourse', 'courseTooLong')
    if (length_m < COURSE_MIN_m) return this.refuse('markCourse', 'courseTooShort')
    if (this.activeTrial !== null) return this.refuse('markCourse', 'raising')
    const aimed = Math.round(length_m / COURSE_SNAP_m) * COURSE_SNAP_m
    this.courseTrue_m = round6(aimed + COURSE_SIGMA_m * gaussian(this.readRng.next))
    this.emit({ type: 'courseMarked', course_m: round6(aimed) })
    return { ok: true }
  }
  /** Put a bar on the start mark (rail flat on the table). */
  placeBar(bar: BarId): Result {
    if (!(bar in BAR_ITEM)) return this.refuse('placeBar', 'unknownBar')
    if (!this.items.has(BAR_ITEM[bar])) return this.refuse('placeBar', 'itemNotOnTable', BAR_ITEM[bar])
    if (!this.items.has('rail')) return this.refuse('placeBar', 'needRail', 'rail')
    if (this.courseTrue_m === null) return this.refuse('placeBar', 'needCourse')
    if (this.activeTrial !== null) return this.refuse('placeBar', 'raising')
    this.bar = bar
    this.emit({ type: 'barPlaced', bar })
    return { ok: true }
  }
  raiseBlocks(): Reason[] {
    const r: Reason[] = []
    if (!this.items.has('rail')) r.push('needRail')
    if (!this.items.has('rackStand') || !this.items.has('standBase')) r.push('needRack')
    if (this.bar === null) r.push('needBar')
    if (this.courseTrue_m === null) r.push('needCourse')
    return r
  }
  private trialRec(id: number | null): InclineTrialRecord | null { return id === null ? null : this.trials.find((t) => t.id === id) ?? null }
  private profileOf(tr: InclineTrialRecord): RaiseProfile { return { h0_m: tr.h0_m, segments: tr.segments } }
  private runOf(tr: InclineTrialRecord): InclineRun {
    let r = this.inclineCache.get(tr.id)
    if (!r) {
      r = simulateIncline(this.profileOf(tr), tr.mu_s, tr.mu_k, G_QUITO_mps2, tr.course_m)
      this.inclineCache.set(tr.id, r)
    }
    return r
  }

  /** Turn the rack crank at rate_mps (m/s of h, 0.5 to 20 mm/s; negative lowers). The first call starts the trial. */
  raiseStart(t_ms: number, rate_mps: number): Result<{ trialId: number }> {
    this.touch(t_ms)
    const rateOk = Math.abs(rate_mps) >= RAISE_RATE_MIN_mps && Math.abs(rate_mps) <= RAISE_RATE_MAX_mps
    const act = this.trialRec(this.activeTrial)
    if (act) {
      if (!rateOk) return this.refuse('raiseStart', 'badSpeed')
      return this.addRate(act, t_ms, rate_mps)
    }
    const blocks = this.raiseBlocks()
    if (blocks.length) return this.refuse('raiseStart', blocks[0]!)
    if (!rateOk) return this.refuse('raiseStart', 'badSpeed')
    const co = sampleTrialCoefficients(this.runRng.next, BAR_PAIRS[this.bar!], BAR_SCATTER)
    const tr: InclineTrialRecord = {
      id: this.trials.length + 1, bar: this.bar!, mu_s: co.mu_s, mu_k: co.mu_k, course_m: this.courseTrue_m!, h0_m: this.rackH_m,
      start_ms: t_ms, end_ms: null, segments: [{ t_s: 0, rate_mps }],
    }
    this.trials.push(tr)
    this.activeTrial = tr.id
    this.emit({ type: 'raiseStarted', trialId: tr.id, rate_mps }, t_ms)
    return { ok: true, trialId: tr.id }
  }
  private addRate(tr: InclineTrialRecord, t_ms: number, rate_mps: number): Result<{ trialId: number }> {
    const t_s = Math.max(0, (t_ms - tr.start_ms) / 1000)
    const last = tr.segments[tr.segments.length - 1]!
    if (t_s <= last.t_s) last.rate_mps = rate_mps
    else tr.segments.push({ t_s, rate_mps })
    this.inclineCache.delete(tr.id)
    this.emit({ type: 'raiseRate', trialId: tr.id, rate_mps }, t_ms)
    return { ok: true, trialId: tr.id }
  }
  /** Stop turning the crank (the bar, if it has begun to slide, goes on sliding at the frozen angle). */
  raiseStop(t_ms: number): Result {
    this.touch(t_ms)
    const tr = this.trialRec(this.activeTrial)
    if (!tr) return this.refuse('raiseStop', 'notRaising')
    this.addRate(tr, t_ms, 0)
    return { ok: true }
  }
  /** Lower the rail to the table and put the bar back on the mark: ends the trial. */
  lowerRail(t_ms: number): Result {
    this.touch(t_ms)
    const tr = this.trialRec(this.activeTrial)
    if (tr) { this.inclineStatus(t_ms); tr.end_ms = t_ms }
    this.activeTrial = null
    this.rackH_m = 0
    this.emit({ type: 'railLowered', trialId: tr?.id ?? null }, t_ms)
    return { ok: true }
  }

  /** State of the rail and bar at t_ms. */
  inclineStatus(t_ms: number): InclineStatus {
    const tr = this.trialRec(this.activeTrial)
    if (!tr) {
      const h = this.rackH_m
      return { phase: 'idle', trialId: null, h_m: h, theta_rad: inclineAngle_rad(h), s_m: 0, v_mps: 0, slipped: false }
    }
    const t_s = Math.max(0, (t_ms - tr.start_ms) / 1000)
    const h = heightAt_m(this.profileOf(tr), t_s)
    const run = this.runOf(tr)
    const lastRate = [...tr.segments].reverse().find((sg) => sg.t_s <= t_s)?.rate_mps ?? 0
    let phase: InclineStatus['phase'] = lastRate !== 0 && h < RACK_H_MAX_m ? 'raising' : 'holding'
    let s = 0, v = 0, theta = inclineAngle_rad(h)
    let slipped = false
    if (run.onset_t_s !== null && t_s >= run.onset_t_s) {
      slipped = true
      const idx = Math.min(run.slide.length - 1, Math.round((t_s - run.onset_t_s) / 0.001))
      const smp = run.slide[idx]!
      s = smp.s_m; v = smp.v_mps; theta = smp.theta_rad
      phase = s >= tr.course_m ? 'finished' : run.stopped && idx >= run.slide.length - 1 ? 'stopped' : 'sliding'
      if (!this.announced.has(`s${tr.id}`)) { this.announced.add(`s${tr.id}`); this.emit({ type: 'barSlips', trialId: tr.id, h_m: run.onset_h_m! }, tr.start_ms + run.onset_t_s * 1000) }
      if (phase === 'finished' && !this.announced.has(`f${tr.id}`)) { this.announced.add(`f${tr.id}`); this.emit({ type: 'barFinished', trialId: tr.id }, t_ms) }
    }
    return { phase, trialId: tr.id, h_m: h, theta_rad: theta, s_m: Math.min(s, tr.course_m + 0.05), v_mps: v, slipped }
  }
  /** Reference record of a trial (true onset and slide time; mu_s and mu_k of the trial). */
  referenceTrial(trialId: number): InclineReference | null {
    const tr = this.trialRec(trialId) ?? this.trials.find((t) => t.id === trialId) ?? null
    if (!tr) return null
    const run = this.runOf(tr)
    return {
      trialId, bar: tr.bar, onsetH_m: run.onset_h_m, onsetTheta_rad: run.onset_h_m === null ? null : inclineAngle_rad(run.onset_h_m),
      slideTime_s: run.slideTime_s, mu_s: tr.mu_s, mu_k: tr.mu_k, course_m: tr.course_m,
    }
  }
  getTrials(): readonly InclineTrialRecord[] { return this.trials }

  /** Tape reading of h (rail underside at the clamp above the table), to the mm. Refused while the crank is turning. */
  measureHeight(t_ms: number): Result<{ h_m: number }> {
    this.touch(t_ms)
    if (!this.items.has('tape')) return this.refuse('measureHeight', 'needTape', 'tape')
    if (!this.items.has('rail')) return this.refuse('measureHeight', 'needRail', 'rail')
    const st = this.inclineStatus(t_ms)
    const tr = this.trialRec(this.activeTrial)
    if (tr) {
      const t_s = Math.max(0, (t_ms - tr.start_ms) / 1000)
      const rate = [...tr.segments].reverse().find((sg) => sg.t_s <= t_s)?.rate_mps ?? 0
      if (rate !== 0 && st.h_m < RACK_H_MAX_m && st.h_m > 0) return this.refuse('measureHeight', 'stillRaising')
    }
    const h_m = round6(quantize(st.h_m + HEIGHT_READ_SIGMA_m * gaussian(this.readRng.next), TAPE_DIVISION_m))
    this.lastHeight_m = Math.max(0, h_m)
    this.emit({ type: 'heightMeasured', h_m: this.lastHeight_m }, t_ms)
    return { ok: true, h_m: this.lastHeight_m }
  }

  // ---- stopwatch ----------------------------------------------------------------------------------------------------------------
  stopwatchDisplay_s(t_ms: number): number { return this.sw.display_s(t_ms) }
  /** Single start/stop button. The student starts when the bar begins to slide and stops when it passes the finish mark. */
  stopwatchStartStop(t_ms: number): Result<{ running: boolean; stop?: StopRecord }> {
    this.touch(t_ms)
    if (!this.items.has('stopwatch')) return this.refuse('stopwatchStartStop', 'needStopwatch', 'stopwatch')
    if (!this.sw.running) {
      this.sw.start(t_ms)
      this.emit({ type: 'stopwatchStart' }, t_ms)
      return { ok: true, running: true }
    }
    const tr = this.trials[this.trials.length - 1] ?? null
    let run: { runId: number; releaseTime_ms: number; crossings: SlideCrossing[] } | null = null
    if (tr) {
      const r = this.runOf(tr)
      if (r.onset_t_s !== null) {
        run = { runId: tr.id, releaseTime_ms: tr.start_ms + r.onset_t_s * 1000, crossings: [{ event: 'slip', trueTime_s: 0 }, { event: 'finish', trueTime_s: r.slideTime_s }] }
      }
    }
    const stop = this.sw.stop(t_ms, run)
    this.emit({ type: 'stopwatchStop', stopId: stop.id, reading_s: stop.reading_s }, t_ms)
    return { ok: true, running: false, stop }
  }
  stopwatchReset(): Result {
    if (!this.items.has('stopwatch')) return this.refuse('stopwatchReset', 'needStopwatch', 'stopwatch')
    this.sw.reset()
    this.emit({ type: 'stopwatchReset' })
    return { ok: true }
  }
  stopLog(): readonly StopRecord[] { return this.sw.stops() }

  // ---- tables --------------------------------------------------------------------------------------------------------------------
  private checkCell(action: string, table: '4.1' | '4.2' | '4.3', row: number, col: number): Failure | null {
    const rows = table === '4.1' ? T41_ROWS : table === '4.2' ? T42_ROWS : BAR_ORDER.length
    const cols = table === '4.3' ? T43_TRIALS : T4_READINGS
    if (!Number.isInteger(row) || !Number.isInteger(col) || row < 0 || row >= rows || col < 0 || col >= cols) return this.refuse(action, 'badCell')
    return null
  }
  private forceTable(table: '4.1' | '4.2'): TableData['t41'] { return table === '4.1' ? this.tables.t41 : this.tables.t42 }
  /** Type a force (N) into Tabla 4.1 (row = face index x 4 + added 50 g masses) or 4.2 (row = face index). */
  tableSetForce(table: '4.1' | '4.2', row: number, rep: number, input: string | number): Result<{ value_N: number }> {
    const f = this.checkCell('tableSetForce', table, row, rep); if (f) return f
    const p = parseForceInput(input)
    if (!p.ok) return this.refuse('tableSetForce', p.reason)
    this.forceTable(table)[row]![rep] = { F_N: p.value_N, runId: null, setup: null, overRange: false }
    this.emit({ type: 'recorded', table, row, col: rep, value: p.value_N, source: 'typed' })
    return { ok: true, value_N: p.value_N }
  }
  /** Copy the last "read now" value into a cell, remembering the run and its setup. */
  tableCopyForce(table: '4.1' | '4.2', row: number, rep: number): Result<{ value_N: number }> {
    const f = this.checkCell('tableCopyForce', table, row, rep); if (f) return f
    if (!this.lastReading) return this.refuse('tableCopyForce', 'noReading')
    const run = this.pullRuns.find((r) => r.id === this.lastReading!.runId)!
    this.forceTable(table)[row]![rep] = { F_N: this.lastReading.value_N, runId: run.id, setup: { ...run.setup }, overRange: this.lastReading.overRange }
    this.emit({ type: 'recorded', table, row, col: rep, value: this.lastReading.value_N, source: 'copied' })
    return { ok: true, value_N: this.lastReading.value_N }
  }
  tableSetHeight(bar: number, trial: number, input: string | number): Result<{ value_m: number }> {
    const f = this.checkCell('tableSetHeight', '4.3', bar, trial); if (f) return f
    const p = parseHeightInput(input)
    if (!p.ok) return this.refuse('tableSetHeight', p.reason)
    const c = this.tables.t43[bar]![trial]!
    c.h_m = p.value_m; c.hTrialId = null
    this.emit({ type: 'recorded', table: '4.3', row: bar, col: trial * 2, value: p.value_m, source: 'typed' })
    return { ok: true, value_m: p.value_m }
  }
  tableCopyHeight(bar: number, trial: number): Result<{ value_m: number }> {
    const f = this.checkCell('tableCopyHeight', '4.3', bar, trial); if (f) return f
    if (this.lastHeight_m === null) return this.refuse('tableCopyHeight', 'noReading')
    const c = this.tables.t43[bar]![trial]!
    c.h_m = this.lastHeight_m; c.hTrialId = this.trials[this.trials.length - 1]?.id ?? null
    this.emit({ type: 'recorded', table: '4.3', row: bar, col: trial * 2, value: this.lastHeight_m, source: 'copied' })
    return { ok: true, value_m: this.lastHeight_m }
  }
  tableSetTime(bar: number, trial: number, input: string | number): Result<{ value_s: number }> {
    const f = this.checkCell('tableSetTime', '4.3', bar, trial); if (f) return f
    const p = parseTimeInput(input)
    if (!p.ok) return this.refuse('tableSetTime', p.reason)
    const c = this.tables.t43[bar]![trial]!
    c.t_s = p.value_s; c.tTrialId = null; c.tStopId = null
    this.emit({ type: 'recorded', table: '4.3', row: bar, col: trial * 2 + 1, value: p.value_s, source: 'typed' })
    return { ok: true, value_s: p.value_s }
  }
  tableCopyTime(bar: number, trial: number, t_ms: number): Result<{ value_s: number }> {
    const f = this.checkCell('tableCopyTime', '4.3', bar, trial); if (f) return f
    this.touch(t_ms)
    if (!this.items.has('stopwatch')) return this.refuse('tableCopyTime', 'needStopwatch', 'stopwatch')
    if (this.sw.running) return this.refuse('tableCopyTime', 'stopwatchRunning')
    const stop = this.sw.lastStop()
    if (!stop) return this.refuse('tableCopyTime', 'noStopwatchReading')
    const v = this.sw.display_s(t_ms)
    const c = this.tables.t43[bar]![trial]!
    c.t_s = v; c.tTrialId = stop.runId; c.tStopId = stop.id
    this.emit({ type: 'recorded', table: '4.3', row: bar, col: trial * 2 + 1, value: v, source: 'copied' })
    return { ok: true, value_s: v }
  }
  tableClearCell(table: '4.1' | '4.2' | '4.3', row: number, col: number): Result {
    const f = this.checkCell('tableClearCell', table, row, table === '4.3' ? Math.floor(col / 2) : col); if (f) return f
    if (table === '4.3') {
      const c = this.tables.t43[row]![Math.floor(col / 2)]!
      if (col % 2 === 0) { c.h_m = null; c.hTrialId = null } else { c.t_s = null; c.tTrialId = null; c.tStopId = null }
    } else this.forceTable(table)[row]![col] = emptyForceCell()
    this.emit({ type: 'cellCleared', table, row, col })
    return { ok: true }
  }
  tableClear(): void { this.tables = emptyTables(); this.emit({ type: 'tableCleared' }) }
  tableData(): TableData { return structuredClone(this.tables) }

  // ---- state and procedure -----------------------------------------------------------------------------------------------------
  getState(): ApparatusState {
    const items = Object.fromEntries(ITEM_IDS.map((i) => [i, this.items.has(i)])) as Record<ItemId, boolean>
    return {
      items, face: this.face, addedMasses: this.addedMasses, scale: this.scaleId, paper: this.paper, zeroed: { ...this.zeroed },
      measuredBlock_kg: this.measuredBlock_kg, course_mark: this.courseTrue_m !== null, bar: this.bar, pulling: this.activePull !== null,
      raising: this.activeTrial !== null, stopwatch: { running: this.sw.running },
    }
  }
  procedure(): ProcedureSummary {
    const has = (...ids: ItemId[]): boolean => ids.every((i) => this.items.has(i))
    const fill = tableFill(this.tables)
    return {
      itemsExp12: has('block', 'paper', 'masses50') && (this.items.has('scale1N') || this.items.has('scale2N')),
      itemsExp3: has('rail', 'tape') && (this.items.has('woodBar') && this.items.has('alBar') && this.items.has('ironBar')),
      unlistedNeededPresent: UNLISTED_NEEDED_ITEMS.every((i) => this.items.has(i)),
      blockWeighed: this.measuredBlock_kg !== null,
      paperFixed: this.paper === 'fixed',
      scaleZeroed: this.scaleId !== null && this.zeroed[this.scaleId],
      courseMarked: this.courseTrue_m !== null,
      pullsCount: this.pullRuns.length, trialsCount: this.trials.length,
      filled: { t41: fill.t41, t42: fill.t42, t43: fill.t43 }, complete: fill.complete,
    }
  }
  /** Hidden truth for teacher mode and tests ONLY. */
  hiddenTruth(): { block_kg: number; masses_kg: number[]; course_m: number | null } {
    return { block_kg: this.hidden.block_kg, masses_kg: [...this.hidden.masses_kg], course_m: this.courseTrue_m }
  }

  // ---- snapshot, reset, presets -----------------------------------------------------------------------------------------------
  snapshot(): ApparatusSnapshot {
    const sw = this.sw.snapshot()
    return structuredClone({
      version: 1 as const, seed: this.seed, runRngDraws: this.runRng.draws, readRngDraws: this.readRng.draws, hidden: this.hidden, items: [...this.items],
      face: this.face, addedMasses: this.addedMasses, scale: this.scaleId, paper: this.paper, zeroed: this.zeroed, measuredBlock_kg: this.measuredBlock_kg,
      course_true_m: this.courseTrue_m, bar: this.bar, rackH_m: this.rackH_m, pullRuns: this.pullRuns, activePull: this.activePull, trials: this.trials,
      activeTrial: this.activeTrial, lastReading: this.lastReading, lastHeight_m: this.lastHeight_m, clock_ms: this.clock_ms, stopwatch: sw.state,
      stops: sw.stops, tables: this.tables, events: this.events,
    })
  }
  load(s: ApparatusSnapshot): Result {
    if (!s || s.version !== 1 || !s.hidden || !s.tables || !Array.isArray(s.pullRuns) || !Array.isArray(s.trials)) return this.refuse('load', 'badSnapshot')
    const c = structuredClone(s)
    this.hidden = c.hidden
    this.runRng = new CountedRng(c.seed ^ RUN_STREAM, c.runRngDraws)
    this.readRng = new CountedRng(c.seed ^ READ_STREAM, c.readRngDraws)
    this.items = new Set(c.items.filter((i): i is ItemId => (ITEM_IDS as readonly string[]).includes(i)))
    this.face = c.face; this.addedMasses = c.addedMasses; this.scaleId = c.scale; this.paper = c.paper; this.zeroed = c.zeroed
    this.measuredBlock_kg = c.measuredBlock_kg; this.courseTrue_m = c.course_true_m; this.bar = c.bar; this.rackH_m = c.rackH_m
    this.pullRuns = c.pullRuns; this.activePull = c.activePull; this.trials = c.trials; this.activeTrial = c.activeTrial
    this.sims.clear(); this.inclineCache.clear()
    this.announced = new Set([...c.pullRuns.flatMap((r) => [`b${r.id}`, `o${r.id}`]), ...c.trials.flatMap((t) => [`s${t.id}`, `f${t.id}`])])
    this.lastReading = c.lastReading; this.lastHeight_m = c.lastHeight_m; this.clock_ms = c.clock_ms
    this.sw.load(c.stopwatch, c.stops)
    this.tables = c.tables
    this.events = c.events; this.seq = c.events.length ? c.events[c.events.length - 1]!.seq : 0
    this.emit({ type: 'loaded' })
    return { ok: true }
  }
  reset(): void {
    this.runRng = new CountedRng(this.seed ^ RUN_STREAM)
    this.readRng = new CountedRng(this.seed ^ READ_STREAM)
    this.events = []; this.seq = 0; this.clock_ms = 0
    this.items = new Set(); this.face = null; this.addedMasses = 0; this.scaleId = null; this.paper = 'none'; this.zeroed = freshZeroed()
    this.measuredBlock_kg = null; this.pullRuns = []; this.activePull = null; this.sims.clear(); this.announced = new Set(); this.lastReading = null
    this.courseTrue_m = null; this.bar = null; this.rackH_m = 0; this.trials = []; this.activeTrial = null; this.inclineCache.clear(); this.lastHeight_m = null
    this.sw.clear(); this.tables = emptyTables()
  }
  /**
   * 'empty': nothing on the table. 'exp12': a careful bench for exps. 1 and 2 (all items, block weighed, cloth face, 1 N scale zeroed
   * horizontally, paper fixed). 'exp3': a careful bench for exp. 3 (all items, course of 1.00 m marked, wooden bar on the mark).
   */
  preset(name: PresetId): Result {
    if (name !== 'empty' && name !== 'exp12' && name !== 'exp3') return this.refuse('preset', 'unknownPreset')
    this.reset()
    if (name !== 'empty') {
      for (const i of ITEM_IDS) if (!(i === 'masses10' || i === 'marble')) this.addItem(i)
    }
    if (name === 'exp12') {
      this.weigh('block'); this.setFace('cloth'); this.chooseScale('1N'); this.placePaper('fixed'); this.zeroScale()
    }
    if (name === 'exp3') { this.markCourse(COURSE_m); this.placeBar('wood') }
    this.emit({ type: 'presetApplied', preset: name })
    return { ok: true }
  }
}



export function createApparatus(preset: PresetId = 'empty', opts: ApparatusOptions = {}): FrictionApparatus {
  const a = new FrictionApparatus(opts)
  a.preset(preset)
  return a
}

export { FACE_ORDER, MASS_STEPS }
