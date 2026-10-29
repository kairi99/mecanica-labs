// Device logic of the Practica 2 bench (horizontal launch): inventory and assembly, rail geometry, level, tape measure,
// rail marks, ball, paper on the floor, runs, stopwatch, Tabla 2.1, slow-motion reference, procedure summary, snapshot.
// DOM-free, timer-free, no Math.random. Time is always passed in (ms timestamps from the caller). Physics only through
// ./model.ts. Hidden truth (table height, table tilt, true mark positions, edge projection) is revealed only by measuring.
import { CountedRng, gaussian, mulberry32 } from '../../../core/physics/noise.ts'
import { tapeMaxPermissibleError_m } from '../../../core/physics/instruments.ts'
import { deg2rad } from '../../../core/physics/angles.ts'
import { Stopwatch } from '../../../core/instruments/stopwatch.ts'
import {
  BALL_IDS, EXPECTED_OFFSETS, GRAVITY_mps2, ballSpec, rollingRadius_m, drawRunOffsets, insidePaper, markOnPaper, runLaunch, runPath, runTrajectory, settleAfterLanding, type BallId, type PathPoint, type TrajectoryPoint,
} from './model.ts'
import {
  BOND_SHEETS, EDGE_PROJECTION_SIGMA_m, FOOT_RANGE_mm, FOOT_STEP_mm, GAP_MAX_m, GAP_MIN_m, GAP_OVERHANG_MAX_m, GAP_OVERHANG_MIN_m, GAP_START_m, GAP_STEP_m, GAP_TARGET_m, GAP_TOLERANCE_m,
  LATERAL_DRIFT_GAIN, LEG_MAX_mm, LEG_MIN_mm, LEG_STEP_mm, LEVEL_BUBBLE_MAX_mm, LEVEL_CENTERED_TOL_mm, MARK_COUNT_EXPECTED,
  MARK_MAX_COUNT, MARK_PLACEMENT_SIGMA_m, MARK_SNAP_m, MARK_UPPER_HALF_FROM_m, PAPER_POS_MAX_m, PAPER_SNAP_m, RACK_BASE_HEIGHT_m,
  RACK_MAX_mm, RACK_MIN_mm, RACK_STEP_mm, RAIL_LENGTH_m, RISE_TARGET_m, RISE_TOLERANCE_m, ROLL_OVER_TAIL_s, SCREWS_PER_JOINT, SCREWS_TOTAL,
  TABLE_REPS, TABLE_ROLL_MAX_deg, TABLE_TRIALS, TABLE_HEIGHT_MAX_m, TABLE_HEIGHT_MIN_m, TRAJECTORY_RATE_hz,
} from './constants.ts'
import {
  bubbleOffset_mm, floorDistance_m, floorToSheet, inTapeRange, paperSurfaceAt_m, railGeometry, rectOverlap, sheetRect, sheetToFloor, tapeGeometry,
  type SheetPose,
} from './geometry.ts'
import { eventRecords, slowmoClip, flightPointAt, type SlowmoClip } from './slowmo.ts'
import { emptyBallTable, emptyRep, parseRangeInput, parseTimeInput, tableData, tableFill } from './table.ts'
import {
  BALL_ITEM, ITEM_IDS, JOINT_IDS,
  type ApparatusEvent, type ApparatusEventBody, type ApparatusSnapshot, type ApparatusState, type BallStatus, type BallTable, type CanRelease,
  type Failure, type ItemId, type JointId, type LevelPlacement, type LevelReading, type MarkResult, type MarksEvaluation, type MissingEntry,
  type PaperMark, type PaperOrientation, type PaperState, type PresetId, type ProcedureSummary, type RailMark, type Reason, type Result,
  type RunBlock, type RunRecord, type StopRecord, type TableData, type TapeReading, type TapeTarget, type Vec3,
} from './types.ts'
import type { RailGeometry } from './geometry.ts'

export interface ApparatusOptions {
  /** Seeds the hidden bench values, the placement errors and the run variability. Default 1. */
  seed?: number
  /** Override the hidden values (tests, teacher mode). */
  H_m?: number
  tableRoll_rad?: number
}

const MAX_EVENTS = 5000
const BENCH_STREAM = 0x9e3779b9
const HIDDEN_STREAM = 0x5bd1e995
const snap = (v: number, step: number): number => Math.round(v / step) * step
const round6 = (v: number): number => Math.round(v * 1e6) / 1e6
const fail = (reason: Reason, item?: ItemId): Failure => (item ? { ok: false, reason, item } : { ok: false, reason })
const freshJoints = (): Record<JointId, boolean> => ({ standBase: false, rackClamp: false, twoLegStand: false })
const freshBall = (): ApparatusState['ball'] => ({ selected: null, placed: false, s_m: null, markId: null, released: false, runId: null })
const freshTables = (): Record<BallId, BallTable> => ({ marble: emptyBallTable(), pingpong: emptyBallTable() })

type RailMarkTrue = RailMark & { trueS_m: number }
type Paper = { bond: SheetPose | null; carbon: SheetPose | null; sheetsUsed: number; paperMovedSinceMarks: boolean; marks: PaperMark[]; nextCarbonId: number }
const freshPaper = (): Paper => ({ bond: null, carbon: null, sheetsUsed: 0, paperMovedSinceMarks: false, marks: [], nextCarbonId: 1 })

export class ParabolicApparatus {
  private readonly seed: number
  private hidden: { H_m: number; tableRoll_rad: number }
  private runRng: CountedRng
  private benchRng: CountedRng
  private listeners: ((e: ApparatusEvent) => void)[] = []

  private events: ApparatusEvent[] = []
  private seq = 0
  private clock_ms = 0
  private items = new Set<ItemId>()
  private joints = freshJoints()
  private rack_mm = 0
  private leg_mm = 0
  private foot_mm = 0
  private gap_m = GAP_START_m
  private levelPlacement: LevelPlacement = null
  private levelUsed = false
  private levelWasCentered = false
  private measured = { launchHeight: false, gap: false, rise: false }
  private marks: RailMarkTrue[] = []
  private nextMarkId = 1
  private ball = freshBall()
  private paper: Paper = freshPaper()
  private edgeProjection: { x_m: number; z_m: number } | null = null
  private lastRange: { carbonId: string; runId: number; reading_m: number } | null = null
  private runs: RunRecord[] = []
  private trajectories = new Map<number, TrajectoryPoint[]>()
  private paths = new Map<number, PathPoint[]>()
  private announced = new Set<number>()
  private readonly sw = new Stopwatch<ReturnType<typeof eventRecords>[number]>()
  private tables = freshTables()

  constructor(opts: ApparatusOptions = {}) {
    this.seed = opts.seed ?? 1
    this.hidden = ParabolicApparatus.drawHidden(this.seed, opts)
    this.runRng = new CountedRng(this.seed)
    this.benchRng = new CountedRng(this.seed ^ BENCH_STREAM)
  }
  private static drawHidden(seed: number, opts: ApparatusOptions): { H_m: number; tableRoll_rad: number } {
    const h = mulberry32(seed ^ HIDDEN_STREAM)
    const H = TABLE_HEIGHT_MIN_m + (TABLE_HEIGHT_MAX_m - TABLE_HEIGHT_MIN_m) * h()
    const roll = deg2rad((h() * 2 - 1) * TABLE_ROLL_MAX_deg)
    return { H_m: opts.H_m ?? Math.round(H * 1e4) / 1e4, tableRoll_rad: opts.tableRoll_rad ?? roll }
  }

  // ---- events ----------------------------------------------------------------------------------------------------
  /** Subscribe to events; returns the unsubscribe function (satisfies the views' `Subscribable`). */
  on(listener: (e: ApparatusEvent) => void): () => void {
    this.listeners.push(listener)
    return () => { this.listeners = this.listeners.filter((l) => l !== listener) }
  }
  /** The event log so far (oldest first). */
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
  /** Remember the latest time the caller passed (the apparatus has no clock of its own). */
  private touch(t_ms: number): void { if (t_ms > this.clock_ms) this.clock_ms = t_ms }

  // ---- inventory and assembly ------------------------------------------------------------------------------------
  hasItem(id: ItemId): boolean { return this.items.has(id) }
  addItem(id: ItemId): Result {
    if (!(ITEM_IDS as readonly string[]).includes(id)) return this.refuse('addItem', 'unknownItem')
    if (this.items.has(id)) return this.refuse('addItem', 'itemAlreadyOnTable', id)
    this.items.add(id)
    this.emit({ type: 'itemAdded', item: id })
    return { ok: true }
  }
  /** Take an item off the table. Joints that depend on it are undone first. Screws in use cannot be removed. */
  removeItem(id: ItemId): Result {
    if (!this.items.has(id)) return this.refuse('removeItem', 'itemNotOnTable', id)
    if (id === 'screws' && this.screwsUsed() > 0) return this.refuse('removeItem', 'screwsInUse', id)
    if ((id === 'marble' || id === 'pingPong') && this.ball.selected !== null && BALL_ITEM[this.ball.selected] === id && this.activeRun(this.clock_ms)) {
      return this.refuse('removeItem', 'ballMoving', id)
    }
    switch (id) {
      case 'rail': this.detachJoint('rackClamp'); this.marks = []; this.ball.markId = null; if (this.levelPlacement === 'rail') this.setLevel('table'); break
      case 'rackStand': case 'base': this.detachJoint('standBase'); if (id === 'rackStand') this.rack_mm = 0; break
      case 'twoLeg': this.detachJoint('twoLegStand'); this.leg_mm = 0; this.foot_mm = 0; break
      case 'marble': case 'pingPong': if (this.ball.selected !== null && BALL_ITEM[this.ball.selected] === id) this.ball = freshBall(); break
      case 'level': this.levelPlacement = null; break
      case 'stopwatch': this.sw.reset(); break
      case 'bondPaper': this.paper = { ...freshPaper(), carbon: this.paper.carbon, nextCarbonId: this.paper.nextCarbonId }; break
      case 'carbonPaper': this.paper.carbon = null; break
      default: break
    }
    this.items.delete(id)
    this.emit({ type: 'itemRemoved', item: id })
    return { ok: true }
  }
  private railJointCount(): number { return (this.joints.rackClamp ? 1 : 0) + (this.joints.twoLegStand ? 1 : 0) }
  private screwsUsed(): number { return this.railJointCount() * SCREWS_PER_JOINT }
  private screwsAvailable(): number { return this.items.has('screws') ? SCREWS_TOTAL - this.screwsUsed() : 0 }

  /**
   * Snap an attachment. standBase: rack stand on its base. rackClamp: the rail's high end in the rack-stand clamp (needs the
   * base joint, 2 screws). twoLegStand: the rail on the two-leg stand near its low end (needs the clamp first, 2 screws).
   */
  attach(joint: JointId): Result {
    if (!(JOINT_IDS as readonly string[]).includes(joint)) return this.refuse('attach', 'unknownItem')
    const j = this.joints
    const need = (...ids: ItemId[]): Failure | null => {
      for (const i of ids) if (!this.items.has(i)) return this.refuse('attach', 'itemNotOnTable', i)
      return null
    }
    if (joint === 'standBase') {
      const f = need('rackStand', 'base'); if (f) return f
      if (j.standBase) return this.refuse('attach', 'alreadyAttached')
      j.standBase = true
      this.emit({ type: 'attached', joint })
      return { ok: true }
    }
    const f = need('rail', joint === 'rackClamp' ? 'rackStand' : 'twoLeg')
    if (f) return f
    if (j[joint]) return this.refuse('attach', 'alreadyAttached')
    if (joint === 'rackClamp') { if (!j.standBase) return this.refuse('attach', 'needStandBase') }
    else if (!j.rackClamp) return this.refuse('attach', 'needRackClamp')
    if (!this.items.has('screws')) return this.refuse('attach', 'itemNotOnTable', 'screws')
    if (this.screwsAvailable() < SCREWS_PER_JOINT) return this.refuse('attach', 'noScrews')
    j[joint] = true
    this.emit({ type: 'attached', joint })
    this.updateLevelFlag()
    return { ok: true }
  }
  /** Undo a joint (and everything that hangs on it: base -> clamp -> two-leg). Screws come back. */
  detach(joint: JointId): Result {
    if (!(JOINT_IDS as readonly string[]).includes(joint)) return this.refuse('detach', 'unknownItem')
    if (!this.joints[joint]) return this.refuse('detach', 'notAttached')
    this.detachJoint(joint)
    return { ok: true }
  }
  private detachJoint(joint: JointId): void {
    if (!this.joints[joint]) return
    if (joint === 'standBase') this.detachJoint('rackClamp')
    else if (joint === 'rackClamp') { this.detachJoint('twoLegStand'); this.unplaceBall() }
    this.joints[joint] = false
    this.emit({ type: 'detached', joint })
  }

  /** Everything still needed, with the reason. Empty when the whole bench (all items, all joints) is ready. */
  missing(): MissingEntry[] {
    const out: MissingEntry[] = []
    const blocking: Record<ItemId, boolean> = {
      rail: true, rackStand: true, base: true, twoLeg: false, screws: true, level: false, marble: false, pingPong: false,
      tapeMeasure: false, stopwatch: false, bondPaper: false, carbonPaper: false,
    }
    for (const id of ITEM_IDS) if (!this.items.has(id)) out.push({ kind: 'item', id, reason: 'notOnTable', blocksRun: blocking[id] })
    const has = (...ids: ItemId[]): boolean => ids.every((i) => this.items.has(i))
    const j = this.joints
    if (has('rackStand', 'base') && !j.standBase) out.push({ kind: 'joint', id: 'standBase', reason: 'notAttached', blocksRun: true })
    if (has('rail', 'rackStand') && !j.rackClamp) out.push({ kind: 'joint', id: 'rackClamp', reason: j.standBase ? 'notAttached' : 'needsStandBase', blocksRun: true })
    if (has('rail', 'twoLeg') && !j.twoLegStand) out.push({ kind: 'joint', id: 'twoLegStand', reason: j.rackClamp ? 'notAttached' : 'needsRackClamp', blocksRun: false })
    return out
  }
  /** Can the ball be released at now_ms? (Defaults to the latest time the apparatus was told.) */
  canRelease(now_ms: number = this.clock_ms): CanRelease {
    const reasons: RunBlock[] = []
    if (this.activeRun(now_ms)) reasons.push('ballMoving')
    if (!this.joints.rackClamp) reasons.push('noRail')
    if (this.ball.selected === null) reasons.push('noBallSelected')
    else if (!this.ball.placed && reasons.length === 0) reasons.push('noBallPlaced')
    return { ok: reasons.length === 0, reasons }
  }

  // ---- geometry and adjustments ----------------------------------------------------------------------------------
  /** Rail geometry on the table; null while the rail is not held by the rack-stand clamp. */
  geometry(): RailGeometry | null {
    if (!this.joints.rackClamp) return null
    return railGeometry({
      rack_mm: this.rack_mm, leg_mm: this.leg_mm, foot_mm: this.foot_mm, gap_m: this.gap_m,
      tableRoll_rad: this.hidden.tableRoll_rad, twoLegAttached: this.joints.twoLegStand,
    })
  }
  private adjustCheck(action: string, item: ItemId, value: number): Failure | null {
    if (!this.items.has(item)) return this.refuse(action, 'itemNotOnTable', item)
    if (!Number.isFinite(value)) return this.refuse(action, 'notFinite')
    if (this.activeRun(this.clock_ms)) return this.refuse(action, 'ballMoving')
    return null
  }
  /** Rack-stand clamp height above its lowest position, whole mm: sets the rise of the high support. */
  setRackHeight_mm(value_mm: number): Result<{ rack_mm: number }> {
    const f = this.adjustCheck('setRack', 'rackStand', value_mm); if (f) return f
    const v = Math.round(value_mm / RACK_STEP_mm) * RACK_STEP_mm
    if (v < RACK_MIN_mm || v > RACK_MAX_mm) return this.refuse('setRack', 'outOfRange')
    this.rack_mm = v
    this.emit({ type: 'heightSet', which: 'rack', value_mm: v })
    this.updateLevelFlag()
    return { ok: true, rack_mm: v }
  }
  /** Height of the two-leg stand support (rail top above the table), whole mm. Too high lifts the rail tip off the table. */
  setLegHeight_mm(value_mm: number): Result<{ leg_mm: number }> {
    const f = this.adjustCheck('setLeg', 'twoLeg', value_mm); if (f) return f
    const v = Math.round(value_mm / LEG_STEP_mm) * LEG_STEP_mm
    if (v < LEG_MIN_mm || v > LEG_MAX_mm) return this.refuse('setLeg', 'outOfRange')
    this.leg_mm = v
    this.emit({ type: 'heightSet', which: 'leg', value_mm: v })
    this.updateLevelFlag()
    return { ok: true, leg_mm: v }
  }
  /** Screw foot of one leg of the two-leg stand, mm (+up), +-5 mm in 0.05 mm steps: trims the lateral roll of the rail. */
  setFoot_mm(value_mm: number): Result<{ foot_mm: number }> {
    const f = this.adjustCheck('setFoot', 'twoLeg', value_mm); if (f) return f
    const v = round6(snap(value_mm, FOOT_STEP_mm))
    if (Math.abs(v) > FOOT_RANGE_mm) return this.refuse('setFoot', 'outOfRange')
    this.foot_mm = v
    this.emit({ type: 'heightSet', which: 'foot', value_mm: v })
    this.updateLevelFlag()
    return { ok: true, foot_mm: v }
  }
  /**
   * Slide the rail along the table: distance from its low tip to the table edge, whole mm; negative = the tip overhangs the edge (rail resting on
   * the edge corner, GAP_OVERHANG_MIN_m to GAP_OVERHANG_MAX_m). The band from -GAP_OVERHANG_MIN_m to GAP_MIN_m (end cap on the corner) is
   * refused. A far-away tip is allowed: the ball may stop on the table before the edge.
   */
  setGap_mm(value_mm: number): Result<{ gap_mm: number }> {
    const f = this.adjustCheck('setGap', 'rail', value_mm); if (f) return f
    const v = round6(snap(value_mm / 1000, GAP_STEP_m))
    if (v < GAP_MIN_m - 1e-9 && v > -GAP_OVERHANG_MIN_m + 1e-9) return this.refuse('setGap', 'tipOverhangsEdge')
    if (v < -GAP_OVERHANG_MAX_m - 1e-9) return this.refuse('setGap', 'outOfRange')
    if (v > GAP_MAX_m) return this.refuse('setGap', 'outOfRange')
    this.gap_m = v
    this.emit({ type: 'gapSet', gap_mm: Math.round(v * 1000) })
    return { ok: true, gap_mm: Math.round(v * 1000) }
  }

  // ---- level -------------------------------------------------------------------------------------------------------
  placeLevel(where: LevelPlacement): Result {
    if (!this.items.has('level')) return this.refuse('placeLevel', 'itemNotOnTable', 'level')
    if (where === 'rail' && !this.items.has('rail')) return this.refuse('placeLevel', 'levelNeedsRail')
    this.setLevel(where)
    return { ok: true }
  }
  private setLevel(where: LevelPlacement): void {
    this.levelPlacement = where
    if (where === 'rail') this.levelUsed = true
    this.levelWasCentered = false
    this.emit({ type: 'levelPlaced', placement: where })
    this.updateLevelFlag()
  }
  /** Bubble of the level where it sits: on the rail it shows the rail's roll about its axis, on the table the table's tilt. */
  levelReading(): LevelReading {
    const p = this.levelPlacement
    if (p === null) return { placement: null, bubble_mm: null, saturated: false, centered: false }
    const tilt = p === 'rail' ? this.geometry()?.roll_rad ?? this.hidden.tableRoll_rad : this.hidden.tableRoll_rad
    const b = bubbleOffset_mm(tilt)
    return { placement: p, bubble_mm: b, saturated: Math.abs(b) >= LEVEL_BUBBLE_MAX_mm, centered: Math.abs(b) <= LEVEL_CENTERED_TOL_mm }
  }
  private updateLevelFlag(): void {
    if (this.levelPlacement !== 'rail') return
    const r = this.levelReading()
    if (r.centered && !this.levelWasCentered) this.emit({ type: 'leveled', bubble_mm: r.bubble_mm! })
    this.levelWasCentered = r.centered
  }

  // ---- tape measure ------------------------------------------------------------------------------------------------
  /**
   * Hold the tape against a length. Targets: launchHeight (floor to table top), range (from the student's edge-projection
   * point to the centre of a carbon mark; the tape lies straight on the floor, so the reading is the Euclidean distance),
   * gap (rail tip to table edge), rise (table top to the rail top at the high support), markPosition (along the rail from
   * the low tip to a mark). Returns the blade geometry for the view to draw; the student reads it (1 mm graduation) and
   * enters the number. The class II tolerance of the tape is reported as `mpe_m`, not applied. Range 0..3 m.
   */
  tapeMeasure(target: TapeTarget): Result<{ reading: TapeReading }> {
    if (!this.items.has('tapeMeasure')) return this.refuse('tapeMeasure', 'itemNotOnTable', 'tapeMeasure')
    let L: number
    let range: TapeReading['range']
    switch (target.kind) {
      case 'launchHeight': L = this.hidden.H_m; break
      case 'gap':
        if (!this.items.has('rail')) return this.refuse('tapeMeasure', 'noRail')
        L = this.gap_m
        break
      case 'rise': {
        const geo = this.geometry()
        if (!geo) return this.refuse('tapeMeasure', 'noRail')
        L = geo.clampHeight_m
        break
      }
      case 'markPosition': {
        const m = this.marks.find((x) => x.id === target.markId)
        if (!m) return this.refuse('tapeMeasure', 'unknownMark')
        L = m.trueS_m
        break
      }
      case 'range': {
        if (!this.edgeProjection) return this.refuse('tapeMeasure', 'noEdgeProjection')
        const m = this.paper.marks.find((x) => x.id === target.carbonId)
        if (!m || !this.paper.bond || m.visibleFrom_ms > this.clock_ms) return this.refuse('tapeMeasure', 'unknownCarbonMark')
        const at = sheetToFloor(this.paper.bond, m.a_m, m.b_m)
        L = floorDistance_m(this.edgeProjection.x_m, this.edgeProjection.z_m, at.x_m, at.z_m)
        range = { alongX_m: at.x_m - this.edgeProjection.x_m, lateral_m: at.z_m - this.edgeProjection.z_m, carbonId: m.id, runId: m.runId }
        break
      }
      default: return this.refuse('tapeMeasure', 'notMeasurable')
    }
    if (!inTapeRange(L)) return this.refuse('tapeMeasure', 'outOfRange')
    if (target.kind === 'launchHeight') this.measured.launchHeight = true
    else if (target.kind === 'gap') this.measured.gap = true
    else if (target.kind === 'rise') this.measured.rise = true
    const tape = tapeGeometry(L)
    const reading: TapeReading = { trueLength_m: L, tape, mpe_m: tapeMaxPermissibleError_m(L), ...(range ? { range } : {}) }
    if (range) this.lastRange = { carbonId: range.carbonId, runId: range.runId, reading_m: tape.idealReading_m }
    this.emit({ type: 'measured', target, value_m: L })
    return { ok: true, reading }
  }

  // ---- marks on the rail -------------------------------------------------------------------------------------------
  private markCheck(action: string, s_m: number): Failure | null {
    if (!this.items.has('rail')) return this.refuse(action, 'itemNotOnTable', 'rail')
    if (!this.items.has('tapeMeasure')) return this.refuse(action, 'itemNotOnTable', 'tapeMeasure')
    if (!Number.isFinite(s_m)) return this.refuse(action, 'notFinite')
    if (s_m < 0 || s_m > RAIL_LENGTH_m) return this.refuse(action, 'outOfRail')
    return null
  }
  /** The mark really lands where the student's hand puts it: aimed position plus a placement error (hidden). */
  private placedAt(aim_m: number): number {
    return round6(Math.min(RAIL_LENGTH_m, Math.max(0, aim_m + MARK_PLACEMENT_SIGMA_m * gaussian(this.benchRng.next))))
  }
  /** Mark a position on the rail, s_m from the low tip (aim snapped to 0.5 mm). The guide wants the upper half (s >= 0.60 m). */
  placeMark(s_m: number): Result<{ markId: string; s_m: number }> {
    const f = this.markCheck('placeMark', s_m); if (f) return f
    const p = round6(snap(s_m, MARK_SNAP_m))
    if (this.marks.length >= MARK_MAX_COUNT) return this.refuse('placeMark', 'tooManyMarks')
    if (this.marks.some((m) => m.s_m === p)) return this.refuse('placeMark', 'duplicateMark')
    const id = `m${this.nextMarkId++}`
    this.marks.push({ id, s_m: p, trueS_m: this.placedAt(p) })
    this.emit({ type: 'markPlaced', markId: id, s_m: p })
    return { ok: true, markId: id, s_m: p }
  }
  moveMark(markId: string, s_m: number): Result<{ s_m: number }> {
    const m = this.marks.find((x) => x.id === markId)
    if (!m) return this.refuse('moveMark', 'unknownMark')
    const f = this.markCheck('moveMark', s_m); if (f) return f
    const p = round6(snap(s_m, MARK_SNAP_m))
    if (this.marks.some((x) => x.id !== markId && x.s_m === p)) return this.refuse('moveMark', 'duplicateMark')
    m.s_m = p
    m.trueS_m = this.placedAt(p)
    this.emit({ type: 'markMoved', markId, s_m: p })
    return { ok: true, s_m: p }
  }
  removeMark(markId: string): Result {
    if (!this.marks.some((x) => x.id === markId)) return this.refuse('removeMark', 'unknownMark')
    this.marks = this.marks.filter((x) => x.id !== markId)
    if (this.ball.markId === markId) this.ball.markId = null
    this.emit({ type: 'markRemoved', markId })
    return { ok: true }
  }
  clearMarks(): void { for (const m of [...this.marks]) this.removeMark(m.id) }
  /** The marks as the student set them (aimed positions; the true ones are only measurable with the tape). */
  getMarks(): RailMark[] { return this.marks.map((m) => ({ id: m.id, s_m: m.s_m })) }
  marksEvaluation(): MarksEvaluation {
    const pos = this.marks.map((m) => m.s_m).sort((a, b) => a - b)
    const upper = pos.filter((s) => s >= MARK_UPPER_HALF_FROM_m - 1e-9).length
    return { count: pos.length, positions_m: pos, fiveMarks: pos.length === MARK_COUNT_EXPECTED, upperHalfCount: upper, marksInUpperHalf: pos.length > 0 && upper === pos.length }
  }

  // ---- ball --------------------------------------------------------------------------------------------------------
  /** Choose the ball for the next runs (it must be in the inventory). The ball goes off the rail until placed again. */
  selectBall(ball: BallId): Result {
    if (!(BALL_IDS as readonly string[]).includes(ball)) return this.refuse('selectBall', 'unknownBall')
    if (!this.items.has(BALL_ITEM[ball])) return this.refuse('selectBall', 'itemNotOnTable', BALL_ITEM[ball])
    if (this.activeRun(this.clock_ms)) return this.refuse('selectBall', 'ballMoving')
    this.ball = { ...freshBall(), selected: ball }
    this.emit({ type: 'ballSelected', ball })
    return { ok: true }
  }
  /**
   * Put the chosen ball on the rail at a mark (its true position) or at s_m from the low tip. A ball can only rest on a
   * mounted rail: anywhere else (off the rail, rail not mounted) is refused.
   */
  placeBall(target: { markId: string } | { s_m: number }): Result<{ s_m: number }> {
    if (this.ball.selected === null) return this.refuse('placeBall', 'noBallSelected')
    if (!this.joints.rackClamp) return this.refuse('placeBall', 'noRail')
    if (this.activeRun(this.clock_ms)) return this.refuse('placeBall', 'ballMoving')
    let s: number
    let markId: string | null = null
    if ('markId' in target) {
      const m = this.marks.find((x) => x.id === target.markId)
      if (!m) return this.refuse('placeBall', 'unknownMark')
      s = m.trueS_m
      markId = m.id
    } else {
      if (!Number.isFinite(target.s_m)) return this.refuse('placeBall', 'notFinite')
      if (target.s_m < 0 || target.s_m > RAIL_LENGTH_m) return this.refuse('placeBall', 'ballOffRail')
      s = round6(snap(target.s_m, MARK_SNAP_m))
    }
    this.ball = { ...this.ball, placed: true, s_m: s, markId, released: false, runId: null }
    this.emit({ type: 'ballPlaced', ball: this.ball.selected!, s_m: s, markId })
    return { ok: true, s_m: s }
  }
  private unplaceBall(): void {
    if (this.ball.selected !== null) this.ball = { ...freshBall(), selected: this.ball.selected }
  }
  /** Put the ball back where it was placed (same mark). Refused while it is moving. */
  resetBall(): Result {
    if (this.ball.selected === null) return this.refuse('resetBall', 'noBallSelected')
    if (this.ball.s_m === null) return this.refuse('resetBall', 'noBallPlaced')
    if (this.activeRun(this.clock_ms)) return this.refuse('resetBall', 'ballMoving')
    this.ball = { ...this.ball, placed: true, released: false }
    this.emit({ type: 'ballReset', ball: this.ball.selected! })
    return { ok: true }
  }

  // ---- paper on the floor ------------------------------------------------------------------------------------------
  private paperCheck(action: string, item: ItemId, x_m: number, z_m: number): Failure | null {
    if (!this.items.has(item)) return this.refuse(action, 'itemNotOnTable', item)
    if (!Number.isFinite(x_m) || !Number.isFinite(z_m)) return this.refuse(action, 'notFinite')
    if (Math.abs(x_m) > PAPER_POS_MAX_m || Math.abs(z_m) > PAPER_POS_MAX_m) return this.refuse(action, 'outOfRange')
    if (this.activeRun(this.clock_ms)) return this.refuse(action, 'ballMoving')
    return null
  }
  private static poseOf(x_m: number, z_m: number, orientation: PaperOrientation): SheetPose {
    return { x_m: round6(snap(x_m, PAPER_SNAP_m)), z_m: round6(snap(z_m, PAPER_SNAP_m)), orientation }
  }
  /**
   * Lay (or move) the bond paper: centre at x_m from the table edge and z_m lateral, 1 mm snap. The first call takes a
   * sheet. Moving or turning it while it carries marks keeps the marks on the paper but sets `paperMovedSinceMarks`.
   */
  placeBond(x_m: number, z_m: number, orientation: PaperOrientation = 'alongX'): Result<{ pose: SheetPose }> {
    const f = this.paperCheck('placeBond', 'bondPaper', x_m, z_m); if (f) return f
    if (orientation !== 'alongX' && orientation !== 'alongZ') return this.refuse('placeBond', 'outOfRange')
    const pose = ParabolicApparatus.poseOf(x_m, z_m, orientation)
    const old = this.paper.bond
    const moved = old !== null && (old.x_m !== pose.x_m || old.z_m !== pose.z_m || old.orientation !== pose.orientation)
    if (old === null) this.paper.sheetsUsed = Math.max(1, this.paper.sheetsUsed)
    if (moved && this.paper.marks.length > 0) this.paper.paperMovedSinceMarks = true
    this.paper.bond = pose
    this.emit({ type: 'bondPlaced', moved })
    return { ok: true, pose }
  }
  /** Lay (or move) the carbon paper, which must overlap the bond paper. Moving the carbon does not move the marks. */
  placeCarbon(x_m: number, z_m: number, orientation: PaperOrientation = 'alongX'): Result<{ pose: SheetPose }> {
    const f = this.paperCheck('placeCarbon', 'carbonPaper', x_m, z_m); if (f) return f
    if (orientation !== 'alongX' && orientation !== 'alongZ') return this.refuse('placeCarbon', 'outOfRange')
    if (!this.paper.bond) return this.refuse('placeCarbon', 'needBondPaper')
    const pose = ParabolicApparatus.poseOf(x_m, z_m, orientation)
    if (!rectOverlap(sheetRect(this.paper.bond), sheetRect(pose))) return this.refuse('placeCarbon', 'carbonNotOverBond')
    this.paper.carbon = pose
    this.emit({ type: 'carbonPlaced' })
    return { ok: true, pose }
  }
  removeCarbon(): Result {
    if (!this.paper.carbon) return this.refuse('removeCarbon', 'noPaperPlaced')
    this.paper.carbon = null
    this.emit({ type: 'carbonRemoved' })
    return { ok: true }
  }
  removeBond(): Result {
    if (!this.paper.bond) return this.refuse('removeBond', 'noPaperPlaced')
    this.paper = { ...freshPaper(), carbon: this.paper.carbon, sheetsUsed: this.paper.sheetsUsed, nextCarbonId: this.paper.nextCarbonId }
    this.emit({ type: 'bondRemoved' })
    return { ok: true }
  }
  /** Take the second sheet of bond paper (for the second ball): the old sheet and its marks are gone. */
  newBondSheet(x_m: number, z_m: number, orientation: PaperOrientation = 'alongX'): Result<{ pose: SheetPose }> {
    if (!this.items.has('bondPaper')) return this.refuse('newBondSheet', 'itemNotOnTable', 'bondPaper')
    if (this.paper.sheetsUsed >= BOND_SHEETS) return this.refuse('newBondSheet', 'noSheetsLeft')
    if (this.activeRun(this.clock_ms)) return this.refuse('newBondSheet', 'ballMoving')
    const used = this.paper.sheetsUsed + (this.paper.bond ? 1 : 0)
    this.paper = { ...freshPaper(), carbon: this.paper.carbon, sheetsUsed: used, nextCarbonId: this.paper.nextCarbonId }
    this.emit({ type: 'bondSheetReplaced', sheetsUsed: used })
    return this.placeBond(x_m, z_m, orientation)
  }
  /**
   * The edge projection: a point the student marks on the floor under the table edge (plumb line or set-square) to measure
   * ranges from. z_m is where along the edge they put it (0: under the rail axis). The point really lands within about
   * 2 mm of the aim (hidden); a range reading starts from it.
   */
  placeEdgeProjection(z_m = 0): Result {
    if (!Number.isFinite(z_m)) return this.refuse('placeEdgeProjection', 'notFinite')
    if (Math.abs(z_m) > PAPER_POS_MAX_m) return this.refuse('placeEdgeProjection', 'outOfRange')
    this.edgeProjection = {
      x_m: round6(EDGE_PROJECTION_SIGMA_m * gaussian(this.benchRng.next)),
      z_m: round6(z_m + EDGE_PROJECTION_SIGMA_m * gaussian(this.benchRng.next)),
    }
    this.emit({ type: 'edgeProjectionPlaced' })
    return { ok: true }
  }
  /** Marks on the paper that exist at now_ms (default: the latest time told); a mark appears when the ball lands. */
  paperMarks(now_ms: number = this.clock_ms): PaperMark[] {
    return this.paper.marks.filter((m) => m.visibleFrom_ms <= now_ms).map((m) => ({ ...m }))
  }
  /** Floor position of a mark, launch frame (x from the edge, z lateral), m. For drawing; the student measures with the tape. */
  markOnFloor(carbonId: string): { x_m: number; z_m: number } | null {
    const m = this.paper.marks.find((x) => x.id === carbonId)
    return m && this.paper.bond ? sheetToFloor(this.paper.bond, m.a_m, m.b_m) : null
  }
  private paperState(): PaperState {
    const p = this.paper
    return {
      bond: p.bond ? { ...p.bond } : null, carbon: p.carbon ? { ...p.carbon } : null, sheetsUsed: p.sheetsUsed,
      sheetsAvailable: this.items.has('bondPaper') ? BOND_SHEETS - p.sheetsUsed : 0, paperMovedSinceMarks: p.paperMovedSinceMarks,
      marks: p.marks.map((m) => ({ ...m })),
    }
  }

  // ---- runs --------------------------------------------------------------------------------------------------------
  /** The run whose ball is still moving at now_ms, or null. */
  private activeRun(now_ms: number): RunRecord | null {
    if (!this.ball.released || this.ball.runId === null) return null
    const r = this.runs.find((x) => x.id === this.ball.runId)
    return r && now_ms < r.releaseTime_ms + r.times.end_s * 1000 ? r : null
  }
  /**
   * Release the placed ball at now_ms (the caller's timestamp). Draws the run's variability, launches through the physics,
   * records the true event times and the carbon mark (it appears on the paper at the landing time), and starts the run.
   */
  release(now_ms: number): Result<{ runId: number }> {
    this.touch(now_ms)
    const can = this.canRelease(now_ms)
    if (!can.ok) return this.refuse('release', can.reasons[0] === 'noRail' ? 'noRail' : can.reasons[0]!)
    const geo = this.geometry()!
    const ball = this.ball.selected!
    const startS = this.ball.s_m!
    const drawn = drawRunOffsets(this.runRng.next, ball)
    const videoPhase = this.benchRng.next()
    const offsets = { ...drawn, lateralAngle_rad: drawn.lateralAngle_rad + LATERAL_DRIFT_GAIN * geo.roll_rad }
    const bench = this.benchOf(geo)
    const id = this.runs.length + 1
    const rec: RunRecord = {
      id, ball, markId: this.ball.markId, startS_m: startS, releaseS_m: startS, releaseTime_ms: now_ms, bench, offsets, outcome: 'notStarted',
      theta_rad: geo.theta_rad, a_incline_mps2: 0, v_roll_mps: 0, v_edge_mps: 0, tableDecel_mps2: 0,
      times: { tip_s: null, edge_s: null, land_s: null, end_s: 0 }, flight: null, launch: null, tableHops: 0, bounce: null, mark: { result: 'noLanding', carbonId: null }, videoPhase,
    }
    // A flat or downhill rail (the two-leg stand holds the tip up) never starts the ball: no physics call.
    if (geo.rise_m > 0) {
      const out = runLaunch(bench, ball, startS, offsets, TRAJECTORY_RATE_hz)
      const s = out.summary
      rec.outcome = s.outcome
      rec.releaseS_m = s.releaseS_m
      rec.theta_rad = s.theta_rad
      rec.a_incline_mps2 = s.a_incline_mps2
      rec.v_roll_mps = s.v_roll_mps
      rec.v_edge_mps = s.v_edge_mps
      rec.tableDecel_mps2 = s.tableDecel_mps2
      rec.flight = s.flight
      rec.launch = s.launch
      rec.tableHops = s.tableHops
      rec.bounce = s.bounce
      const tip = s.tTip_s
      if (s.outcome === 'stopped') { rec.times = { tip_s: tip, edge_s: null, land_s: null, end_s: (tip ?? 0) + (tip === null ? 0 : s.gapTime_s) } }
      else if (tip !== null) {
        const edge = tip + s.gapTime_s
        rec.times = s.flight
          ? { tip_s: tip, edge_s: edge, land_s: edge + s.flight.t_flight_s, end_s: edge + s.flight.t_flight_s }
          : { tip_s: tip, edge_s: edge, land_s: null, end_s: edge + ROLL_OVER_TAIL_s }
      }
      if (s.flight) this.trajectories.set(id, out.trajectory)
      this.paths.set(id, out.path)
    }
    if (rec.outcome === 'notStarted') rec.outcome = 'stopped'
    this.depositMark(rec)
    this.runs.push(rec)
    this.ball = { ...this.ball, placed: false, released: true, runId: id }
    this.emit({ type: 'released', runId: id, ball }, now_ms)
    return { ok: true, runId: id }
  }
  /** Carbon paper: where the first contact lands and whether it leaves a dot; adds the dot to the bond paper. */
  private depositMark(rec: RunRecord): void {
    const fl = rec.flight
    const { bond, carbon } = this.paper
    let result: MarkResult = 'noLanding'
    if (fl) {
      const bondRect = bond ? sheetRect(bond) : null
      const carbonRect = carbon ? sheetRect(carbon) : null
      const area = bondRect && carbonRect ? rectOverlap(bondRect, carbonRect) : null
      if (!bondRect) result = 'noBond'
      else if (!carbonRect) result = 'noCarbon'
      else if (!insidePaper(fl.x_land_m, fl.z_land_m, bondRect)) result = 'offPaper'
      else if (!area || !insidePaper(fl.x_land_m, fl.z_land_m, carbonRect)) result = 'noCarbon'
      else {
        const m = markOnPaper(fl.x_land_m, fl.z_land_m, rec.ball, fl.vy_impact_mps, area, rec.offsets.u_mark)
        if (m.left) {
          const at = floorToSheet(bond!, fl.x_land_m, fl.z_land_m)
          const id = `c${this.paper.nextCarbonId++}`
          this.paper.marks.push({
            id, runId: rec.id, ball: rec.ball, a_m: at.a_m, b_m: at.b_m, diameter_m: m.diameter_m, darkness: m.darkness,
            visibleFrom_ms: rec.releaseTime_ms + rec.times.land_s! * 1000,
          })
          rec.mark = { result: 'marked', carbonId: id }
          return
        }
        result = 'tooFaint'
      }
    }
    rec.mark = { result, carbonId: null }
  }
  getRuns(): RunRecord[] { return structuredClone(this.runs) }
  getRun(runId: number): RunRecord | null { const r = this.runs.find((x) => x.id === runId); return r ? structuredClone(r) : null }
  /** The bench of the current set-up as the physics sees it (beam end gap, shoe). */
  private benchOf(geo: RailGeometry): RunRecord['bench'] {
    return {
      rise_m: geo.rise_m, gap_m: geo.shoe.beamEndGap_m, lipGap_m: this.gap_m, shoe: { length_m: geo.shoe.length_m, slope_rad: geo.shoe.slope_rad },
      H_m: this.hidden.H_m, stepDrop_m: geo.stepDrop_m, roll_rad: geo.roll_rad,
    }
  }
  /** Whole path of a run that flew (1200 Hz, t from the departure at the beam end: shoe, table hops, flight), regenerated when not cached. Empty otherwise. */
  runPath(runId: number): readonly PathPoint[] {
    const r = this.runs.find((x) => x.id === runId)
    if (!r || r.times.tip_s === null) return []
    let p = this.paths.get(runId)
    if (!p) { p = runPath(r.bench, r.ball, r.startS_m, r.offsets); this.paths.set(runId, p) }
    return p
  }
  /** Flight samples (1200 Hz, from the edge to the landing) of a run, regenerated from its record when not cached. Empty if it did not fly. */
  runTrajectory(runId: number): readonly TrajectoryPoint[] {
    const r = this.runs.find((x) => x.id === runId)
    if (!r || !r.flight) return []
    let t = this.trajectories.get(runId)
    if (!t) { t = runTrajectory(r.bench, r.ball, r.startS_m, r.offsets); this.trajectories.set(runId, t) }
    return t
  }
  /** The 240 fps slow-motion reference of a run that flew (see slowmo.ts); null otherwise. */
  slowmo(runId: number): SlowmoClip | null {
    const r = this.runs.find((x) => x.id === runId)
    return r ? slowmoClip(r, this.runPath(runId)) : null
  }
  /**
   * State of the ball at now_ms, from the release time: idle on the rail, rolling (rail then table), flying, landed (or
   * stopped on the table / rolled over the edge). `pos` is the ball centre in the launch frame (y above the floor).
   */
  ballStatus(now_ms: number): BallStatus {
    this.touch(now_ms)
    const b = this.ball
    const none = { runId: null, ball: b.selected, t_s: 0, pos: null, onRail_s_m: null }
    if (b.selected === null) return { phase: 'unplaced', ...none }
    const R = this.ballRadius(b.selected)
    if (!b.released) {
      if (!b.placed || b.s_m === null) return { phase: 'unplaced', ...none }
      const g = this.geometry()
      return { phase: 'idle', runId: null, ball: b.selected, t_s: 0, pos: g ? this.railBallPos(g.theta_rad, g.stepDrop_m, g.shoe.beamEndGap_m, b.s_m, this.railRadius(b.selected)) : null, onRail_s_m: b.s_m }
    }
    const run = this.runs.find((x) => x.id === b.runId)!
    const t = Math.max(0, (now_ms - run.releaseTime_ms) / 1000)
    const base = { runId: run.id, ball: run.ball, t_s: t }
    const rail = (s: number): Vec3 => this.railBallPos(run.theta_rad, run.bench.stepDrop_m, run.bench.gap_m, s, this.railRadius(run.ball), run.bench.H_m)
    const { tip_s, edge_s, land_s } = run.times
    if (run.outcome === 'stopped' && tip_s === null) return { phase: 'stopped', ...base, pos: rail(run.releaseS_m), onRail_s_m: run.releaseS_m }
    if (tip_s !== null && t < tip_s) {
      const s = Math.max(0, run.releaseS_m - (run.offsets.pushSpeed_mps * t + 0.5 * run.a_incline_mps2 * t * t))
      return { phase: edge_s !== null && t >= edge_s ? 'flying' : 'rolling', ...base, pos: rail(s), onRail_s_m: s }
    }
    // from the beam end on, the ball follows the stored whole path: the shoe ramp, the arc and the hops on the table, the flight (physics/launch.ts)
    const trk = this.runPath(run.id)
    const tauP = t - tip_s!
    const at = (u: number): Vec3 => { const p = flightPointAt(trk, u); return { x_m: p.x_m, y_m: p.y_m, z_m: p.z_m } }
    if (run.outcome === 'stopped') return { phase: t >= run.times.end_s ? 'stopped' : 'rolling', ...base, pos: at(Math.min(tauP, run.times.end_s - tip_s!)), onRail_s_m: null }
    if (t < edge_s!) return { phase: 'rolling', ...base, pos: at(tauP), onRail_s_m: null }
    if (run.outcome === 'rolledOver') {
      const u = Math.min(t - edge_s!, ROLL_OVER_TAIL_s)
      const y = Math.max(R, run.bench.H_m + R - 0.5 * GRAVITY_mps2 * u * u)
      return { phase: 'rolledOver', ...base, pos: { x_m: run.v_edge_mps * u, y_m: y, z_m: 0 }, onRail_s_m: null }
    }
    if (t < land_s!) return { phase: 'flying', ...base, pos: at(tauP), onRail_s_m: null }
    // landed: first contact, then the hops and the roll-out (physics/settle.ts); it stays on the floor, on the paper surface where it rests on a sheet
    const path = settleAfterLanding(run.flight!, run.ball)
    const tau = t - land_s!
    const p = path.at(tau)
    const surf = paperSurfaceAt_m(p.x_m, p.z_m, this.paper.bond, this.paper.carbon)
    return { phase: 'landed', ...base, pos: { x_m: p.x_m, y_m: R + surf + p.lift_m, z_m: p.z_m }, onRail_s_m: null, atRest: tau >= path.duration_s }
  }
  /** Rest point on the floor of the ball of the current run (known from the release; null unless it lands). For framing the views. */
  ballRest(): { x_m: number; z_m: number } | null {
    if (!this.ball.released || this.ball.runId === null) return null
    const run = this.runs.find((x) => x.id === this.ball.runId)
    return run?.outcome === 'landed' && run.flight ? settleAfterLanding(run.flight, run.ball).rest : null
  }
  private ballRadius(b: BallId): number { return ballSpec(b).R_m }
  /** Radius at which the ball sits in the channel, m: the centre is this far above the rail top (the physics' r_eff). */
  private railRadius(b: BallId): number { return rollingRadius_m(b) }
  /** Ball centre on the rail at s_m from the beam end (the centre r_eff above the top surface along its normal, as the physics departs). For drawing. */
  private railBallPos(theta_rad: number, tip_m: number, gap_m: number, s_m: number, R_m: number, H_m: number = this.hidden.H_m): Vec3 {
    return {
      x_m: -gap_m - s_m * Math.cos(theta_rad) + R_m * Math.sin(theta_rad),
      y_m: H_m + tip_m + s_m * Math.sin(theta_rad) + R_m * Math.cos(theta_rad),
      z_m: 0,
    }
  }
  /** Call from the animation loop: announces (once per run) that the ball landed or stopped, and returns the status. */
  tick(now_ms: number): BallStatus {
    const st = this.ballStatus(now_ms)
    if (st.runId !== null && !this.announced.has(st.runId)) {
      const run = this.runs.find((x) => x.id === st.runId)!
      if (now_ms >= run.releaseTime_ms + run.times.end_s * 1000) {
        this.announced.add(run.id)
        if (run.outcome === 'landed') this.emit({ type: 'ballLanded', runId: run.id, mark: run.mark.result }, now_ms)
        else this.emit({ type: 'ballStopped', runId: run.id, outcome: run.outcome === 'notStarted' ? 'stopped' : run.outcome }, now_ms)
      }
    }
    return st
  }

  // ---- stopwatch ---------------------------------------------------------------------------------------------------
  /** Display in s: elapsed floored to 0.01 s (a real stopwatch truncates). */
  stopwatchDisplay_s(t_ms: number): number { return this.sw.display_s(t_ms) }
  /**
   * The single start/stop button, pressed at t_ms (the caller's event timestamp). The student starts when the ball passes
   * the edge and stops at the landing. A stop logs a StopRecord against the latest released run, with its true event times.
   */
  stopwatchStartStop(t_ms: number, opts: { trial?: number } = {}): Result<{ running: boolean; stop?: StopRecord }> {
    this.touch(t_ms)
    if (!this.items.has('stopwatch')) return this.refuse('stopwatchStartStop', 'itemNotOnTable', 'stopwatch')
    if (!this.sw.running) {
      this.sw.start(t_ms)
      this.emit({ type: 'stopwatchStart' }, t_ms)
      return { ok: true, running: true }
    }
    const run = this.ball.runId !== null ? this.runs.find((r) => r.id === this.ball.runId) ?? null : null
    const stop = this.sw.stop(t_ms, run ? { runId: run.id, releaseTime_ms: run.releaseTime_ms, crossings: eventRecords(run) } : null, opts.trial ?? null)
    this.emit({ type: 'stopwatchStop', stopId: stop.id, reading_s: stop.reading_s }, t_ms)
    return { ok: true, running: false, stop }
  }
  stopwatchReset(): Result {
    if (!this.items.has('stopwatch')) return this.refuse('stopwatchReset', 'itemNotOnTable', 'stopwatch')
    this.sw.reset()
    this.emit({ type: 'stopwatchReset' })
    return { ok: true }
  }
  stopLog(): readonly StopRecord[] { return this.sw.stops() }
  /** Stop presses logged against one run. */
  stopsForRun(runId: number): StopRecord[] { return this.sw.stops().filter((s) => s.runId === runId) }

  // ---- Tabla 2.1 ---------------------------------------------------------------------------------------------------
  private cellCheck(action: string, ball: BallId, trial: number, rep: number): Failure | null {
    if (!(BALL_IDS as readonly string[]).includes(ball)) return this.refuse(action, 'unknownBall')
    if (!Number.isInteger(trial) || !Number.isInteger(rep) || trial < 0 || trial >= TABLE_TRIALS || rep < 0 || rep >= TABLE_REPS) return this.refuse(action, 'badCell')
    return null
  }
  /** Type a flight time (s) into a cell; decimal point or comma, at most 2 decimals. */
  tableSetTime(ball: BallId, trial: number, rep: number, input: string | number): Result<{ value_s: number }> {
    const f = this.cellCheck('tableSetTime', ball, trial, rep); if (f) return f
    const p = parseTimeInput(input)
    if (!p.ok) return this.refuse('tableSetTime', p.reason)
    const c = this.tables[ball][trial]![rep]!
    c.t_s = p.value_s; c.timeRunId = null; c.timeStopId = null
    this.emit({ type: 'recorded', ball, trial, rep, column: 'time', value: p.value_s, source: 'typed', runId: null })
    return { ok: true, value_s: p.value_s }
  }
  /** Type a range (m) into a cell; decimal point or comma, at most 3 decimals (the tape is read to the millimetre). */
  tableSetRange(ball: BallId, trial: number, rep: number, input: string | number): Result<{ value_m: number }> {
    const f = this.cellCheck('tableSetRange', ball, trial, rep); if (f) return f
    const p = parseRangeInput(input)
    if (!p.ok) return this.refuse('tableSetRange', p.reason)
    const c = this.tables[ball][trial]![rep]!
    c.x_m = p.value_m; c.rangeCarbonId = null; c.rangeRunId = null
    this.emit({ type: 'recorded', ball, trial, rep, column: 'range', value: p.value_m, source: 'typed', runId: null })
    return { ok: true, value_m: p.value_m }
  }
  /** Copy the stopped stopwatch display into a cell, remembering which run and stop it came from. */
  tableCopyTime(ball: BallId, trial: number, rep: number, t_ms: number): Result<{ value_s: number }> {
    const f = this.cellCheck('tableCopyTime', ball, trial, rep); if (f) return f
    this.touch(t_ms)
    if (!this.items.has('stopwatch')) return this.refuse('tableCopyTime', 'itemNotOnTable', 'stopwatch')
    if (this.sw.running) return this.refuse('tableCopyTime', 'stopwatchRunning')
    const stop = this.sw.lastStop()
    if (!stop) return this.refuse('tableCopyTime', 'noStopwatchReading')
    const v = this.stopwatchDisplay_s(t_ms)
    const c = this.tables[ball][trial]![rep]!
    c.t_s = v; c.timeRunId = stop.runId; c.timeStopId = stop.id
    this.emit({ type: 'recorded', ball, trial, rep, column: 'time', value: v, source: 'copied', runId: stop.runId }, t_ms)
    return { ok: true, value_s: v }
  }
  /** Copy the last range read with the tape (to the millimetre) into a cell, remembering the carbon mark it came from. */
  tableCopyRange(ball: BallId, trial: number, rep: number): Result<{ value_m: number }> {
    const f = this.cellCheck('tableCopyRange', ball, trial, rep); if (f) return f
    if (!this.lastRange) return this.refuse('tableCopyRange', 'noTapeReading')
    const c = this.tables[ball][trial]![rep]!
    c.x_m = this.lastRange.reading_m; c.rangeCarbonId = this.lastRange.carbonId; c.rangeRunId = this.lastRange.runId
    this.emit({ type: 'recorded', ball, trial, rep, column: 'range', value: c.x_m, source: 'copied', runId: this.lastRange.runId })
    return { ok: true, value_m: c.x_m }
  }
  tableClearCell(ball: BallId, trial: number, rep: number): Result {
    const f = this.cellCheck('tableClearCell', ball, trial, rep); if (f) return f
    this.tables[ball][trial]![rep] = emptyRep()
    this.emit({ type: 'cellCleared', ball, trial, rep })
    return { ok: true }
  }
  /** Empty one ball's table, or both (no argument). */
  tableClear(ball?: BallId): void {
    if (ball) this.tables[ball] = emptyBallTable()
    else this.tables = freshTables()
    this.emit({ type: 'tableCleared', ball: ball ?? 'all' })
  }
  /** Plain data of Tabla 2.1 for one ball: times and ranges as [trial][rep] (null = empty) and where each came from. */
  tableData(ball: BallId): TableData { return tableData(ball, this.tables[ball]) }

  // ---- procedure and state -----------------------------------------------------------------------------------------
  procedure(): ProcedureSummary {
    const geo = this.geometry()
    const miss = this.missing()
    const fill = { marble: tableFill(this.tables.marble), pingpong: tableFill(this.tables.pingpong) }
    return {
      itemsComplete: miss.every((m) => m.kind !== 'item'),
      setupComplete: miss.length === 0,
      canRelease: this.canRelease().ok,
      // the guide's 20 cm is the rail top above the table at the high support (what the tape reads), not the rise the ball feels
      riseOk: geo !== null && Math.abs(geo.clampHeight_m - RISE_TARGET_m) <= RISE_TOLERANCE_m,
      tipLifted: geo?.tipLifted ?? false,
      gapOk: this.items.has('rail') && Math.abs(this.gap_m - GAP_TARGET_m) <= GAP_TOLERANCE_m,
      levelUsed: this.levelUsed,
      railRollCentered: Math.abs(bubbleOffset_mm(geo?.roll_rad ?? this.hidden.tableRoll_rad)) <= LEVEL_CENTERED_TOL_mm,
      marks: this.marksEvaluation(),
      measured: { ...this.measured },
      ballSelected: this.ball.selected,
      carbonOverBond: this.paper.bond !== null && this.paper.carbon !== null && rectOverlap(sheetRect(this.paper.bond), sheetRect(this.paper.carbon)) !== null,
      edgeProjectionPlaced: this.edgeProjection !== null,
      paperMovedSinceMarks: this.paper.paperMovedSinceMarks,
      runsCount: this.runs.length,
      stopsCount: this.sw.stops().length,
      tableFilled: { marble: fill.marble.filled, pingpong: fill.pingpong.filled },
      tableComplete: { marble: fill.marble.complete, pingpong: fill.pingpong.complete },
    }
  }
  /** UI-facing state (not time dependent). Use ballStatus(t_ms) and stopwatchDisplay_s(t_ms) for time. */
  getState(): ApparatusState {
    const items = Object.fromEntries(ITEM_IDS.map((i) => [i, this.items.has(i)])) as Record<ItemId, boolean>
    return {
      items, joints: { ...this.joints }, screwsUsed: this.screwsUsed(), screwsAvailable: this.screwsAvailable(),
      rack_mm: this.rack_mm, leg_mm: this.leg_mm, foot_mm: this.foot_mm, gap_mm: Math.round(this.gap_m * 1000),
      level: { placement: this.levelPlacement }, marks: this.getMarks(), ball: { ...this.ball }, paper: this.paperState(),
      edgeProjection: this.edgeProjection !== null, stopwatch: { running: this.sw.running }, geometry: this.geometry(),
      world: { ...this.hidden },
    }
  }
  /** Hidden truth for teacher mode and tests ONLY: views of the student experience must not show it. */
  hiddenTruth(): {
    H_m: number; tableRoll_rad: number; rise_m: number | null; theta_rad: number | null; roll_rad: number | null
    edgeProjection: { x_m: number; z_m: number } | null; markTrueS_m: Record<string, number>
  } {
    const geo = this.geometry()
    return {
      ...this.hidden, rise_m: geo?.rise_m ?? null, theta_rad: geo?.theta_rad ?? null, roll_rad: geo?.roll_rad ?? null,
      edgeProjection: this.edgeProjection ? { ...this.edgeProjection } : null, markTrueS_m: Object.fromEntries(this.marks.map((m) => [m.id, m.trueS_m])),
    }
  }

  // ---- snapshot, reset, presets ------------------------------------------------------------------------------------
  snapshot(): ApparatusSnapshot {
    const sw = this.sw.snapshot()
    return structuredClone({
      version: 1 as const, seed: this.seed, runRngDraws: this.runRng.draws, benchRngDraws: this.benchRng.draws, hidden: this.hidden,
      items: [...this.items], joints: this.joints, rack_mm: this.rack_mm, leg_mm: this.leg_mm, foot_mm: this.foot_mm, gap_m: this.gap_m,
      levelPlacement: this.levelPlacement, levelUsed: this.levelUsed, measured: this.measured, marks: this.marks, nextMarkId: this.nextMarkId,
      ball: this.ball, paper: this.paper, edgeProjection: this.edgeProjection, lastRange: this.lastRange, clock_ms: this.clock_ms,
      runs: this.runs, stopwatch: sw.state, stops: sw.stops, tables: this.tables, events: this.events,
    })
  }
  /** Restore a snapshot (same seed family: random streams continue exactly where they stopped). */
  load(s: ApparatusSnapshot): Result {
    if (!s || s.version !== 1 || !s.hidden || !s.paper || !s.tables || !Array.isArray(s.runs)) return this.refuse('load', 'badSnapshot')
    const c = structuredClone(s)
    this.hidden = { ...c.hidden }
    this.runRng = new CountedRng(c.seed, c.runRngDraws)
    this.benchRng = new CountedRng(c.seed ^ BENCH_STREAM, c.benchRngDraws)
    this.items = new Set(c.items.filter((i): i is ItemId => (ITEM_IDS as readonly string[]).includes(i)))
    this.joints = c.joints
    this.rack_mm = c.rack_mm; this.leg_mm = c.leg_mm; this.foot_mm = c.foot_mm; this.gap_m = c.gap_m
    this.levelPlacement = c.levelPlacement; this.levelUsed = c.levelUsed; this.levelWasCentered = this.levelReading().centered
    this.measured = c.measured
    this.marks = c.marks; this.nextMarkId = c.nextMarkId
    this.ball = c.ball
    this.paper = c.paper
    this.edgeProjection = c.edgeProjection; this.lastRange = c.lastRange; this.clock_ms = c.clock_ms
    this.runs = c.runs; this.trajectories.clear(); this.paths.clear(); this.announced = new Set(c.runs.map((r) => r.id))
    this.sw.load(c.stopwatch, c.stops)
    this.tables = c.tables
    this.events = c.events; this.seq = c.events.length ? c.events[c.events.length - 1]!.seq : 0
    this.emit({ type: 'loaded' })
    return { ok: true }
  }
  /** Back to an empty bench (same seed, same hidden values), event log cleared. Listeners stay. */
  reset(): void {
    this.runRng = new CountedRng(this.seed)
    this.benchRng = new CountedRng(this.seed ^ BENCH_STREAM)
    this.events = []; this.seq = 0; this.clock_ms = 0
    this.items = new Set(); this.joints = freshJoints()
    this.rack_mm = 0; this.leg_mm = 0; this.foot_mm = 0; this.gap_m = GAP_START_m
    this.levelPlacement = null; this.levelUsed = false; this.levelWasCentered = false
    this.measured = { launchHeight: false, gap: false, rise: false }
    this.marks = []; this.nextMarkId = 1
    this.ball = freshBall(); this.paper = freshPaper(); this.edgeProjection = null; this.lastRange = null
    this.runs = []; this.trajectories.clear(); this.paths.clear(); this.announced = new Set()
    this.sw.clear(); this.tables = freshTables()
  }
  /**
   * 'empty': nothing on the table. 'assembled': a careful student's bench, built through the real actions (so the event
   * log and procedure flags are genuine): all items, stands joined, rail rolled level with the foot, rise 20 cm, two-leg
   * stand just below the rail, tip 5 cm from the edge, marks at 0.60 to 1.00 m, heights measured, edge projection, paper
   * centred on the expected landings, the marble on the first mark. 'loose': every material lies loose on the table (all items, no
   * joint, no mark, no paper placed on the floor, no ball on the rail): the start of a fresh lab, which the student assembles.
   */
  preset(name: PresetId): Result {
    if (name !== 'empty' && name !== 'assembled' && name !== 'loose') return this.refuse('preset', 'unknownPreset')
    this.reset()
    if (name === 'assembled') this.buildAssembled()
    else if (name === 'loose') for (const i of ITEM_IDS) this.addItem(i)
    this.emit({ type: 'presetApplied', preset: name })
    return { ok: true }
  }
  private buildAssembled(): void {
    for (const i of ITEM_IDS) this.addItem(i)
    this.attach('standBase'); this.attach('rackClamp'); this.attach('twoLegStand')
    this.placeLevel('rail')
    this.setFoot_mm(-1000 * 0.2 * Math.sin(this.hidden.tableRoll_rad)) // roll = tableRoll + asin(foot / span) = 0
    this.setRackHeight_mm((RISE_TARGET_m - RACK_BASE_HEIGHT_m) * 1000)
    this.setLegHeight_mm(0) // lowest: the stand support (13 mm) is under the free rail line (about 16 mm at the stand): it does not touch and the tip rests on the table
    this.setGap_mm(GAP_TARGET_m * 1000)
    this.placeLevel('table')
    this.tapeMeasure({ kind: 'launchHeight' }); this.tapeMeasure({ kind: 'gap' }); this.tapeMeasure({ kind: 'rise' })
    const ids: string[] = []
    for (let i = 0; i < 5; i++) { const r = this.placeMark(0.6 + 0.1 * i); if (r.ok) ids.push(r.markId) }
    this.placeEdgeProjection(0)
    const geo = this.geometry()!
    const bench = this.benchOf(geo)
    const xs = [0.6, 1.0].map((s) => runLaunch(bench, 'marble', s, EXPECTED_OFFSETS).summary.flight?.x_land_m ?? 0.6)
    const xc = Math.round(((xs[0]! + xs[1]!) / 2) * 1000) / 1000
    this.placeBond(xc, 0, 'alongX')
    this.placeCarbon(xc, 0, 'alongX')
    this.selectBall('marble')
    this.placeBall({ markId: ids[0]! })
  }
}

/** Convenience: new apparatus already set to a preset. */
export function createApparatus(preset: PresetId = 'empty', opts: ApparatusOptions = {}): ParabolicApparatus {
  const a = new ParabolicApparatus(opts)
  a.preset(preset)
  return a
}
