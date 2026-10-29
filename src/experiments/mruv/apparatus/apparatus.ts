// Device logic of the DigiCart MRUV bench: inventory and assembly, geometry, level, tape measure, tape marks, cart runs,
// stopwatch, Table 1.1, DigiCart record, procedure summary, snapshot. DOM-free, timer-free, no Math.random.
// Time is always passed in (ms timestamps from the caller). Physics only from ../physics. Public API: docs/architecture.md.
import {
  DEFAULT_CART, DEFAULT_VARIABILITY, CountedRng, deg2rad, inclineAngle_rad, mulberry32, tapeMaxPermissibleError_m,
  sampleRun, crossingTime_s, THETA_GUIDE_rad, type CartParams, type VariabilityConfig,
} from '../physics/index.ts'
import {
  ANGLE_TOLERANCE_rad, CART_AT_A_TOL_mm, CART_LENGTH_m, DIGICART_RESOLUTION_m,
  DIGICART_SAMPLE_RATE_Hz, FOOT_RANGE_mm, FOOT_STEP_mm,
  LEVEL_BUBBLE_MAX_mm, LEVEL_CENTERED_TOL_mm, MARK_MAX_COUNT, MARK_SNAP_mm, RACK_BASE_HEIGHT_m, RACK_MAX_mm, RACK_MIN_mm,
  RAIL_LENGTH_m, RAIL_SCALE_MAX_mm, RECEIVER_STOP_FROM_END_m, SCREWS_PER_JOINT, SCREWS_TOTAL, SUPPORT_SEPARATION_m,
  TABLE_COLS, TABLE_POSITIONS_cm, TABLE_TILT_MAX_deg, TABLE_ROWS, TWO_LEG_BASE_HEIGHT_m,
} from './constants.ts'
import {
  bubbleOffset_mm, downSlope_m, inTapeRange, looseRailPose, railPointAt, railPos_mm, railPose, tapeGeometry,
  type RailPose,
} from './geometry.ts'
import { Stopwatch } from '../../../core/instruments/stopwatch.ts'
import { evaluateMarks, type MarksEvaluation } from './markers.ts'
import { buildTrajectory, digicartSamples, trajectoryAt, type Trajectory } from './run.ts'
import { parseTimeInput } from './table.ts'
import {
  ITEM_IDS,
  type ApparatusEvent, type ApparatusEventBody, type ApparatusSnapshot, type ApparatusState, type CanRun,
  type TapeReading, type TapeTarget, type CartPose, type CartStatus, type CrossingRecord, type DigicartRecord, type Failure,
  type ItemId, type JointId, type LevelPlacement, type LevelReading, type MarkerState, type MissingEntry, type PresetId,
  type ProcedureSummary, type RailEnd, type RailGeometry, type Reason, type Result, type RunBlock, type RunRecord,
  type StopRecord, type TableCell, type TableData,
} from './types.ts'

export interface ApparatusOptions {
  /** Seeds the hidden table tilt, and the run variability. Default 1. */
  seed?: number
  variability?: VariabilityConfig
  /** Cart physics (theta_rad is replaced by the rail's true incline at each release). */
  cart?: CartParams
  /** Override the hidden values (tests, teacher mode). */
  tableTilt_rad?: number
}

const MAX_EVENTS = 5000
const emptyCell = (): TableCell => ({ value_s: null, runId: null, stopId: null })
const emptyTable = (): TableCell[][] => Array.from({ length: TABLE_ROWS }, () => Array.from({ length: TABLE_COLS }, emptyCell))
const snap = (v: number, step: number): number => Math.round(v / step) * step
const fail = (reason: Reason, item?: ItemId): Failure => (item ? { ok: false, reason, item } : { ok: false, reason })

export class Apparatus {
  private readonly seed: number
  private readonly variability: VariabilityConfig
  private readonly cartParams: CartParams
  private hidden: { tableTilt_rad: number }
  private runRng: CountedRng
  private listeners: ((e: ApparatusEvent) => void)[] = []

  private events: ApparatusEvent[] = []
  private seq = 0
  private items = new Set<ItemId>()
  private joints = { standBase: false, rackClamp: null as RailEnd | null, twoLegStand: false, receiver: false }
  private rack_mm = 0
  private foot_mm = 0
  private levelPlacement: LevelPlacement = null
  private levelledAtBase = false
  private measured = { clamp: false, twoLeg: false, separation: false }
  private markers: MarkerState[] = []
  private nextMarkerId = 1
  private cart = { placed: false, startRailPos_mm: null as number | null, released: false, runId: null as number | null }
  private runs: RunRecord[] = []
  private trajectories = new Map<number, Trajectory>()
  private readonly sw = new Stopwatch<CrossingRecord>()
  private table: TableCell[][] = emptyTable()

  constructor(opts: ApparatusOptions = {}) {
    this.seed = opts.seed ?? 1
    this.variability = opts.variability ?? DEFAULT_VARIABILITY
    this.cartParams = opts.cart ?? DEFAULT_CART
    const h = mulberry32(this.seed ^ 0x5bd1e995)
    this.hidden = {
      tableTilt_rad: opts.tableTilt_rad ?? deg2rad((h() * 2 - 1) * TABLE_TILT_MAX_deg),
    }
    this.runRng = new CountedRng(this.seed)
  }

  // ---- events ----------------------------------------------------------------------------------------------------
  /** Subscribe to events; returns the unsubscribe function. */
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

  // ---- inventory and assembly ------------------------------------------------------------------------------------
  hasItem(id: ItemId): boolean { return this.items.has(id) }
  addItem(id: ItemId): Result {
    if (!(ITEM_IDS as readonly string[]).includes(id)) return this.refuse('addItem', 'unknownItem')
    if (this.items.has(id)) return this.refuse('addItem', 'itemAlreadyOnTable', id)
    this.items.add(id)
    this.emit({ type: 'itemAdded', item: id })
    return { ok: true }
  }
  /** Take an item off the table. Joints that depend on it are undone first (events detached). Screws in use cannot be removed. */
  removeItem(id: ItemId): Result {
    if (!this.items.has(id)) return this.refuse('removeItem', 'itemNotOnTable', id)
    if (id === 'screws' && this.screwsUsed() > 0) return this.refuse('removeItem', 'screwsInUse', id)
    switch (id) {
      case 'rail': this.detachJoint('rackClamp'); this.markers = []; if (this.levelPlacement === 'rail') this.setLevel('table'); break
      case 'rackStand': case 'standBase': this.detachJoint('standBase'); if (id === 'rackStand') this.rack_mm = 0; break
      case 'twoLegStand': this.detachJoint('twoLegStand'); this.foot_mm = 0; break
      case 'receiver': this.detachJoint('receiver'); break
      case 'cart': this.unplaceCart(); break
      case 'level': this.levelPlacement = null; break
      case 'stopwatch': this.sw.reset(); break
      default: break
    }
    this.items.delete(id)
    this.emit({ type: 'itemRemoved', item: id })
    return { ok: true }
  }
  private railJointCount(): number {
    return (this.joints.rackClamp ? 1 : 0) + (this.joints.twoLegStand ? 1 : 0) + (this.joints.receiver ? 1 : 0)
  }
  private screwsUsed(): number { return this.railJointCount() * SCREWS_PER_JOINT }
  private screwsAvailable(): number { return this.items.has('screws') ? SCREWS_TOTAL - this.screwsUsed() : 0 }

  /**
   * Snap an attachment. standBase: rack stand on its base. rackClamp: a rail end (`railEnd`) into the rack-stand clamp
   * (needs the base joint, 2 screws). twoLegStand / receiver: the other end (need the clamp first, 2 screws each).
   */
  attach(joint: JointId, opts: { railEnd?: RailEnd } = {}): Result {
    const j = this.joints
    const need = (...ids: ItemId[]): Failure | null => {
      for (const i of ids) if (!this.items.has(i)) return this.refuse('attach', 'itemNotOnTable', i)
      return null
    }
    const alreadyDone = joint === 'standBase' ? j.standBase : joint === 'rackClamp' ? j.rackClamp !== null : j[joint]
    if (joint === 'standBase') {
      const f = need('rackStand', 'standBase'); if (f) return f
      if (alreadyDone) return this.refuse('attach', 'alreadyAttached')
      j.standBase = true
      this.emit({ type: 'attached', joint })
      return { ok: true }
    }
    const f = need('rail', joint === 'rackClamp' ? 'rackStand' : joint === 'twoLegStand' ? 'twoLegStand' : 'receiver')
    if (f) return f
    if (alreadyDone) return this.refuse('attach', 'alreadyAttached')
    if (joint === 'rackClamp') {
      if (!j.standBase) return this.refuse('attach', 'needStandBase')
      if (opts.railEnd !== 'E1' && opts.railEnd !== 'E2') return this.refuse('attach', 'railEndRequired')
    } else if (!j.rackClamp) return this.refuse('attach', 'needRackClamp')
    if (!this.items.has('screws')) return this.refuse('attach', 'itemNotOnTable', 'screws')
    if (this.screwsAvailable() < SCREWS_PER_JOINT) return this.refuse('attach', 'noScrews')
    if (joint === 'rackClamp') j.rackClamp = opts.railEnd!
    else j[joint] = true
    this.emit(joint === 'rackClamp' ? { type: 'attached', joint, railEnd: opts.railEnd! } : { type: 'attached', joint })
    this.updateLevelFlag()
    return { ok: true }
  }
  /** Undo a joint (and everything that hangs on it: base -> clamp -> two-leg and receiver). Screws come back. */
  detach(joint: JointId): Result {
    const isOn = joint === 'rackClamp' ? this.joints.rackClamp !== null : this.joints[joint]
    if (!isOn) return this.refuse('detach', 'notAttached')
    this.detachJoint(joint)
    return { ok: true }
  }
  private detachJoint(joint: JointId): void {
    if (joint === 'standBase') {
      if (!this.joints.standBase) return
      this.detachJoint('rackClamp')
      this.joints.standBase = false
      this.emit({ type: 'detached', joint })
    } else if (joint === 'rackClamp') {
      if (!this.joints.rackClamp) return
      this.detachJoint('twoLegStand'); this.detachJoint('receiver')
      this.joints.rackClamp = null
      this.unplaceCart()
      this.emit({ type: 'detached', joint })
    } else if (this.joints[joint]) {
      this.joints[joint] = false
      this.emit({ type: 'detached', joint })
    }
  }

  /** Everything still needed, with the reason. Empty when the whole bench (all items, all joints) is ready. */
  missing(): MissingEntry[] {
    const out: MissingEntry[] = []
    const blocking: Record<ItemId, boolean> = {
      rail: true, cart: true, rackStand: true, standBase: true, twoLegStand: true, receiver: true, screws: true,
      level: false, stopwatch: false, tape: false, markers: false,
    }
    for (const id of ITEM_IDS) if (!this.items.has(id)) out.push({ kind: 'item', id, reason: 'notOnTable', blocksRun: blocking[id] })
    const has = (...ids: ItemId[]): boolean => ids.every((i) => this.items.has(i))
    const j = this.joints
    if (has('rackStand', 'standBase') && !j.standBase) out.push({ kind: 'joint', id: 'standBase', reason: 'notAttached', blocksRun: true })
    if (has('rail', 'rackStand') && j.rackClamp === null) {
      out.push({ kind: 'joint', id: 'rackClamp', reason: j.standBase ? 'notAttached' : 'needsStandBase', blocksRun: true })
    }
    for (const id of ['twoLegStand', 'receiver'] as const) {
      if (has('rail', id) && !j[id]) out.push({ kind: 'joint', id, reason: j.rackClamp ? 'notAttached' : 'needsRackClamp', blocksRun: true })
    }
    return out
  }
  /** Can the cart be released safely? Reasons are ids (noReceiver: the cart would fall off the low end). */
  canRun(): CanRun {
    const reasons: RunBlock[] = []
    if (!this.items.has('rail')) reasons.push('noRail')
    else if (this.joints.rackClamp === null || !this.joints.twoLegStand) reasons.push('railNotSupported')
    if (!this.joints.receiver) reasons.push('noReceiver')
    if (!this.cart.placed) reasons.push('cartNotPlaced')
    return { ok: reasons.length === 0, reasons }
  }

  // ---- geometry ----------------------------------------------------------------------------------------------------
  /** Rail geometry in the world frame; null while the rail is not held by the rack-stand clamp (see looseRail()). */
  geometry(): RailGeometry | null {
    const end = this.joints.rackClamp
    if (end === null) return null
    const hHigh = RACK_BASE_HEIGHT_m + this.rack_mm / 1000
    const both = this.joints.twoLegStand
    const hLow = both ? TWO_LEG_BASE_HEIGHT_m + this.foot_mm / 1000 : hHigh
    const pose = railPose(hHigh, hLow)
    return {
      mounted: true, supportedBothEnds: both, highEnd: end, scaleZeroAtHighEnd: end === 'E1', separation_m: SUPPORT_SEPARATION_m,
      clampHeight_m: hHigh, twoLegHeight_m: hLow, railAngle_rad: pose.railAngle_rad,
      theta_rad: inclineAngle_rad(hHigh, hLow, SUPPORT_SEPARATION_m, this.hidden.tableTilt_rad), pose,
    }
  }
  /** Pose of a rail lying loose on the table (before it is mounted). */
  looseRail(): RailPose { return looseRailPose() }
  /** Rail pose: mounted pose when held by the clamp, loose pose otherwise. */
  railPoseNow(): RailPose { return this.geometry()?.pose ?? looseRailPose() }
  /** Rack-stand clamp height above its lowest position, whole mm (rack scale reading). */
  setRackHeight_mm(value_mm: number): Result<{ rack_mm: number }> {
    if (!this.items.has('rackStand')) return this.refuse('setRack', 'itemNotOnTable', 'rackStand')
    if (!Number.isFinite(value_mm)) return this.refuse('setRack', 'notFinite')
    const v = Math.round(value_mm)
    if (v < RACK_MIN_mm || v > RACK_MAX_mm) return this.refuse('setRack', 'outOfRange')
    this.rack_mm = v
    this.emit({ type: 'heightSet', which: 'rack', value_mm: v })
    this.updateLevelFlag()
    return { ok: true, rack_mm: v }
  }
  /** Screw foot of the two-leg stand, mm (+up), +-5 mm in 0.05 mm steps. */
  setFoot_mm(value_mm: number): Result<{ foot_mm: number }> {
    if (!this.items.has('twoLegStand')) return this.refuse('setFoot', 'itemNotOnTable', 'twoLegStand')
    if (!Number.isFinite(value_mm)) return this.refuse('setFoot', 'notFinite')
    const v = Math.round(snap(value_mm, FOOT_STEP_mm) * 1e6) / 1e6
    if (Math.abs(v) > FOOT_RANGE_mm) return this.refuse('setFoot', 'outOfRange')
    this.foot_mm = v
    this.emit({ type: 'heightSet', which: 'foot', value_mm: v })
    this.updateLevelFlag()
    return { ok: true, foot_mm: v }
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
    this.emit({ type: 'levelPlaced', placement: where })
    this.updateLevelFlag()
  }
  /** Bubble of the level where it sits: on the rail it shows the rail's true tilt, on the table the table's. */
  levelReading(): LevelReading {
    const p = this.levelPlacement
    if (p === null) return { placement: null, bubble_mm: null, saturated: false, centered: false }
    const geo = this.geometry()
    const tilt = p === 'rail' && geo ? geo.theta_rad : this.hidden.tableTilt_rad
    const b = bubbleOffset_mm(tilt)
    return { placement: p, bubble_mm: b, saturated: Math.abs(b) >= LEVEL_BUBBLE_MAX_mm, centered: Math.abs(b) <= LEVEL_CENTERED_TOL_mm }
  }
  private updateLevelFlag(): void {
    if (this.levelledAtBase || this.levelPlacement !== 'rail' || this.rack_mm !== 0) return
    if (!this.geometry()?.supportedBothEnds) return
    const r = this.levelReading()
    if (r.centered) {
      this.levelledAtBase = true
      this.emit({ type: 'leveled', bubble_mm: r.bubble_mm! })
    }
  }

  // ---- tape measure ------------------------------------------------------------------------------------------------
  /**
   * Hold the tape against a length. Targets: rail top-surface height above the table at a support or at any rail-scale
   * position, the cart length, the separation d of the supports along the rail. Returns the geometry of the blade for
   * the view to draw; the student reads it (1 mm graduation) and enters the number. The class II tolerance of the tape
   * is reported as `mpe_m`, not applied to the reading. Range 0..3 m.
   */
  tapeMeasure(target: TapeTarget): Result<{ reading: TapeReading }> {
    if (!this.items.has('tape')) return this.refuse('tapeMeasure', 'itemNotOnTable', 'tape')
    let L: number
    if (target.kind === 'railHeight') {
      const geo = this.geometry()
      if (!geo) return this.refuse('tapeMeasure', this.items.has('rail') ? 'railNotAssembled' : 'noRail')
      if (target.at === 'clamp') L = geo.clampHeight_m
      else if (target.at === 'twoLeg') {
        if (!geo.supportedBothEnds) return this.refuse('tapeMeasure', 'notMeasurable')
        L = geo.twoLegHeight_m
      } else {
        const pos = target.at.railPos_mm
        if (!Number.isFinite(pos) || pos < 0 || pos > RAIL_SCALE_MAX_mm) return this.refuse('tapeMeasure', 'outOfRail')
        L = railPointAt(geo.pose, downSlope_m(pos, geo.scaleZeroAtHighEnd!)).y_m
      }
    } else if (target.kind === 'cartLength') {
      if (!this.items.has('cart')) return this.refuse('tapeMeasure', 'itemNotOnTable', 'cart')
      L = CART_LENGTH_m
    } else {
      const geo = this.geometry()
      if (!geo) return this.refuse('tapeMeasure', this.items.has('rail') ? 'railNotAssembled' : 'noRail')
      if (!geo.supportedBothEnds) return this.refuse('tapeMeasure', 'notMeasurable')
      L = geo.separation_m
    }
    if (!inTapeRange(L)) return this.refuse('tapeMeasure', 'outOfRange')
    if (target.kind === 'railHeight') {
      if (target.at === 'clamp') this.measured.clamp = true
      else if (target.at === 'twoLeg') this.measured.twoLeg = true
    } else if (target.kind === 'supportSeparation') this.measured.separation = true
    const reading: TapeReading = { trueLength_m: L, tape: tapeGeometry(L), mpe_m: tapeMaxPermissibleError_m(L) }
    this.emit({ type: 'measuredHeight', target, value_m: L })
    return { ok: true, reading }
  }

  // ---- markers -----------------------------------------------------------------------------------------------------
  private markCheck(action: string, railPos: number): Failure | null {
    if (!this.items.has('markers')) return this.refuse(action, 'itemNotOnTable', 'markers')
    if (!this.items.has('rail')) return this.refuse(action, 'itemNotOnTable', 'rail')
    if (!Number.isFinite(railPos) || railPos < 0 || railPos > RAIL_SCALE_MAX_mm) return this.refuse(action, 'outOfRail')
    return null
  }
  /** Stick a tape mark at a printed-scale position (snapped to 0.5 mm). */
  placeMarker(railPos_mm_: number): Result<{ markId: string; railPos_mm: number }> {
    const f = this.markCheck('placeMarker', railPos_mm_); if (f) return f
    const p = snap(railPos_mm_, MARK_SNAP_mm)
    if (this.markers.length >= MARK_MAX_COUNT) return this.refuse('placeMarker', 'tooManyMarks')
    if (this.markers.some((m) => m.railPos_mm === p)) return this.refuse('placeMarker', 'duplicateMark')
    const id = `m${this.nextMarkerId++}`
    this.markers.push({ id, railPos_mm: p })
    this.emit({ type: 'markPlaced', markId: id, railPos_mm: p })
    return { ok: true, markId: id, railPos_mm: p }
  }
  moveMarker(markId: string, railPos_mm_: number): Result<{ railPos_mm: number }> {
    const m = this.markers.find((x) => x.id === markId)
    if (!m) return this.refuse('moveMarker', 'unknownMark')
    const f = this.markCheck('moveMarker', railPos_mm_); if (f) return f
    const p = snap(railPos_mm_, MARK_SNAP_mm)
    if (this.markers.some((x) => x.id !== markId && x.railPos_mm === p)) return this.refuse('moveMarker', 'duplicateMark')
    m.railPos_mm = p
    this.emit({ type: 'markMoved', markId, railPos_mm: p })
    return { ok: true, railPos_mm: p }
  }
  removeMarker(markId: string): Result {
    if (!this.markers.some((x) => x.id === markId)) return this.refuse('removeMarker', 'unknownMark')
    this.markers = this.markers.filter((x) => x.id !== markId)
    this.emit({ type: 'markRemoved', markId })
    return { ok: true }
  }
  clearMarkers(): void { for (const m of [...this.markers]) this.removeMarker(m.id) }
  getMarkers(): MarkerState[] { return this.markers.map((m) => ({ ...m })) }
  /** Marks against the guide (spacing 10 cm, AB >= 90 cm, A at the top). */
  evaluateMarks(): MarksEvaluation {
    return evaluateMarks(this.markers.map((m) => m.railPos_mm), this.geometry()?.scaleZeroAtHighEnd ?? true)
  }

  // ---- cart and runs -----------------------------------------------------------------------------------------------
  private unplaceCart(): void {
    this.endRun('placed')
    this.cart.placed = false
    this.cart.startRailPos_mm = null
    this.cart.released = false
  }
  private endRun(by: 'reset' | 'placed'): void {
    const r = this.cart.released && this.cart.runId !== null ? this.runs.find((x) => x.id === this.cart.runId) : undefined
    if (r && r.endedBy === null) r.endedBy = by
  }
  private frontLimits_m(): { min: number; max: number } {
    return { min: CART_LENGTH_m, max: RAIL_LENGTH_m - (this.joints.receiver ? RECEIVER_STOP_FROM_END_m : 0) }
  }
  /**
   * Put the cart on the rail with its FRONT at a printed-scale position (snapped to 0.5 mm). The whole cart must lie
   * on the rail (and in front of the receiver stop): otherwise 'cartOffRail'. Needs the rack-stand clamp (it fixes
   * which end is the top). Picks the cart up if it was rolling.
   */
  placeCart(front_railPos_mm: number): Result<{ front_railPos_mm: number }> {
    if (!this.items.has('cart')) return this.refuse('placeCart', 'itemNotOnTable', 'cart')
    if (!this.items.has('rail')) return this.refuse('placeCart', 'cartOffRail')
    const geo = this.geometry()
    if (!geo) return this.refuse('placeCart', 'railNotAssembled')
    if (!Number.isFinite(front_railPos_mm)) return this.refuse('placeCart', 'notFinite')
    const p = snap(front_railPos_mm, MARK_SNAP_mm)
    const D = downSlope_m(p, geo.scaleZeroAtHighEnd!)
    const lim = this.frontLimits_m()
    if (p < 0 || p > RAIL_SCALE_MAX_mm || D < lim.min - 1e-9 || D > lim.max + 1e-9) return this.refuse('placeCart', 'cartOffRail')
    this.endRun('placed')
    this.cart.placed = true
    this.cart.released = false
    this.cart.startRailPos_mm = p
    this.emit({ type: 'cartPlaced', front_railPos_mm: p })
    return { ok: true, front_railPos_mm: p }
  }
  /** Carry the cart back to its start position (where it was last placed; else mark A if the cart fits there). */
  resetCart(): Result<{ front_railPos_mm: number }> {
    if (!this.items.has('cart')) return this.refuse('resetCart', 'itemNotOnTable', 'cart')
    let p = this.cart.startRailPos_mm
    if (p === null) {
      const a = this.evaluateMarks().aRailPos_mm
      if (a === null) return this.refuse('resetCart', 'noStartPosition')
      p = a
    }
    const r = this.placeCart(p)
    if (!r.ok) return r
    this.emit({ type: 'cartReset', front_railPos_mm: r.front_railPos_mm })
    return r
  }
  /** Release the placed cart from rest at time t_ms (one action; no hold). Samples this run's variability. */
  releaseCart(t_ms: number): Result<{ runId: number }> {
    if (this.cart.released) {
      const st = this.cartState(t_ms)
      return this.refuse('releaseCart', st.phase === 'rolling' ? 'cartMoving' : 'cartNotAtStart')
    }
    const cr = this.canRun()
    if (!cr.ok) return this.refuse('releaseCart', cr.reasons[0]!)
    const geo = this.geometry()!
    const zeroHigh = geo.scaleZeroAtHighEnd!
    const start = this.cart.startRailPos_mm!
    const D0 = downSlope_m(start, zeroHigh)
    const base: CartParams = { ...this.cartParams, theta_rad: geo.theta_rad }
    const cond = sampleRun(base, this.runRng.next, this.variability)
    const sStop = RAIL_LENGTH_m - RECEIVER_STOP_FROM_END_m - D0
    const id = this.runs.length + 1
    const tr = buildTrajectory(cond.params, cond.init, sStop)
    const marks = this.markers
      .map((m) => ({ m, D: downSlope_m(m.railPos_mm, zeroHigh) }))
      .sort((a, b) => a.D - b.D)
      .map(({ m, D }): CrossingRecord => {
        const s = D - D0
        const behind = s < -1e-4
        const t = behind || s > sStop ? null : crossingTime_s(s, cond.params, cond.init)
        return { markId: m.id, railPos_mm: m.railPos_mm, trueTime_s: t }
      })
    const rec: RunRecord = {
      id, releaseTime_ms: t_ms, scaleZeroAtHighEnd: zeroHigh, startRailPos_mm: start, theta_rad: geo.theta_rad,
      conditions: { releaseOffset_m: cond.init.s_m, v0_mps: cond.init.v_mps, c_rr: cond.params.c_rr },
      stopRailPos_mm: railPos_mm(RAIL_LENGTH_m - RECEIVER_STOP_FROM_END_m, zeroHigh), tStop_s: tr.tStop_s, marks, endedBy: null,
    }
    this.runs.push(rec)
    this.trajectories.set(id, tr)
    this.cart.released = true
    this.cart.runId = id
    this.emit({ type: 'released', runId: id }, t_ms)
    if (this.sw.linkStartToRelease && this.items.has('stopwatch')) {
      this.sw.reset()
      this.swStart(t_ms, true)
    }
    return { ok: true, runId: id }
  }
  private trajectoryFor(rec: RunRecord): Trajectory {
    let tr = this.trajectories.get(rec.id)
    if (!tr) {
      const params: CartParams = { ...this.cartParams, theta_rad: rec.theta_rad, c_rr: rec.conditions.c_rr }
      const D0 = downSlope_m(rec.startRailPos_mm, rec.scaleZeroAtHighEnd)
      tr = buildTrajectory(params, { s_m: rec.conditions.releaseOffset_m, v_mps: rec.conditions.v0_mps }, RAIL_LENGTH_m - RECEIVER_STOP_FROM_END_m - D0)
      this.trajectories.set(rec.id, tr)
    }
    return tr
  }
  /** Cart state at time t_ms: position of the front on the printed scale, velocity down-slope, phase. */
  cartState(t_ms: number): CartStatus {
    const none: CartStatus = {
      phase: 'unplaced', runId: this.cart.runId, t_s: 0, frontRailPos_mm: null, rearRailPos_mm: null, frontDownSlope_m: null, s_m: 0, v_mps: 0,
    }
    const geo = this.geometry()
    if (!this.cart.placed || !geo) return none
    const zeroHigh = geo.scaleZeroAtHighEnd!
    const start = this.cart.startRailPos_mm!
    const D0 = downSlope_m(start, zeroHigh)
    const mk = (phase: CartStatus['phase'], t_s: number, s: number, v: number): CartStatus => ({
      phase, runId: this.cart.runId, t_s, s_m: s, v_mps: v, frontDownSlope_m: D0 + s,
      frontRailPos_mm: railPos_mm(D0 + s, zeroHigh), rearRailPos_mm: railPos_mm(D0 + s - CART_LENGTH_m, zeroHigh),
    })
    const rec = this.cart.released ? this.runs.find((r) => r.id === this.cart.runId) : undefined
    if (!rec) return mk('atStart', 0, 0, 0)
    const t_s = Math.max(0, (t_ms - rec.releaseTime_ms) / 1000)
    const tr = this.trajectoryFor(rec)
    const st = trajectoryAt(tr, t_s)
    const phase = st.stopped ? 'stopped' : tr.tStop_s === null && t_s >= tr.duration_s ? 'stuck' : 'rolling'
    return mk(phase, t_s, st.s_m, st.v_mps)
  }
  /** Cart front and rear points on the rail top surface (world frame) at t_ms; null if unplaced. */
  cartPose(t_ms: number): CartPose | null {
    const geo = this.geometry()
    const st = this.cartState(t_ms)
    if (!geo || st.frontDownSlope_m === null) return null
    return {
      front: railPointAt(geo.pose, st.frontDownSlope_m), rear: railPointAt(geo.pose, st.frontDownSlope_m - CART_LENGTH_m),
      direction: geo.pose.direction, normal: geo.pose.normal,
    }
  }
  getRuns(): readonly RunRecord[] { return this.runs }
  getRun(runId: number): RunRecord | null { return this.runs.find((r) => r.id === runId) ?? null }
  /** The DigiCart's own record of a run: x(t) at 50 Hz (1 mm) from release plus the true crossing times of the marks. */
  digicartRecord(runId: number): DigicartRecord | null {
    const rec = this.getRun(runId)
    if (!rec) return null
    const s = digicartSamples(this.trajectoryFor(rec))
    return {
      runId, releaseTime_ms: rec.releaseTime_ms, sampleRate_Hz: DIGICART_SAMPLE_RATE_Hz, resolution_m: DIGICART_RESOLUTION_m,
      t_s: s.t_s, x_m: s.x_m, marks: rec.marks.map((m) => ({ ...m })),
    }
  }

  // ---- stopwatch ---------------------------------------------------------------------------------------------------
  setLinkStartToRelease(on: boolean): void {
    this.sw.setLinkStartToRelease(on)
    this.emit({ type: 'linkStartToRelease', on })
  }
  /** Display in s: elapsed floored to 0.01 s (a real stopwatch truncates). */
  stopwatchDisplay_s(t_ms: number): number { return this.sw.display_s(t_ms) }
  private swStart(t_ms: number, linked: boolean): void {
    this.sw.start(t_ms)
    this.emit({ type: 'stopwatchStart', linked }, t_ms)
  }
  /** The single start/stop button, pressed at t_ms (the caller's event timestamp). A stop logs a StopRecord. */
  stopwatchStartStop(t_ms: number, opts: { markTarget?: number } = {}): Result<{ running: boolean; stop?: StopRecord }> {
    if (!this.items.has('stopwatch')) return this.refuse('stopwatchStartStop', 'itemNotOnTable', 'stopwatch')
    if (!this.sw.running) {
      this.swStart(t_ms, false)
      return { ok: true, running: true }
    }
    const run = this.cart.runId !== null ? this.runs.find((r) => r.id === this.cart.runId) ?? null : null
    const stop = this.sw.stop(t_ms, run ? { runId: run.id, releaseTime_ms: run.releaseTime_ms, crossings: run.marks } : null, opts.markTarget ?? null)
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

  // ---- Table 1.1 ---------------------------------------------------------------------------------------------------
  private cellCheck(action: string, row: number, col: number): Failure | null {
    if (!Number.isInteger(row) || !Number.isInteger(col) || row < 0 || row >= TABLE_ROWS || col < 0 || col >= TABLE_COLS) {
      return this.refuse(action, 'badCell')
    }
    return null
  }
  /** Type a value (s) into a cell; text with decimal point or comma, at most 2 decimals. */
  tableSet(row: number, col: number, input: string | number): Result<{ value_s: number }> {
    const f = this.cellCheck('tableSet', row, col); if (f) return f
    const p = parseTimeInput(input)
    if (!p.ok) return this.refuse('tableSet', p.reason)
    this.table[row]![col] = { value_s: p.value_s, runId: null, stopId: null }
    this.emit({ type: 'recorded', row, col, value_s: p.value_s, source: 'typed', runId: null })
    return { ok: true, value_s: p.value_s }
  }
  /** Copy the stopped stopwatch display into a cell, remembering which run it came from. */
  tableCopyDisplay(row: number, col: number, t_ms: number): Result<{ value_s: number }> {
    const f = this.cellCheck('tableCopyDisplay', row, col); if (f) return f
    if (!this.items.has('stopwatch')) return this.refuse('tableCopyDisplay', 'itemNotOnTable', 'stopwatch')
    if (this.sw.running) return this.refuse('tableCopyDisplay', 'stopwatchRunning')
    const stop = this.sw.lastStop()
    if (!stop) return this.refuse('tableCopyDisplay', 'noStopwatchReading')
    const v = this.stopwatchDisplay_s(t_ms)
    this.table[row]![col] = { value_s: v, runId: stop.runId, stopId: stop.id }
    this.emit({ type: 'recorded', row, col, value_s: v, source: 'copied', runId: stop.runId }, t_ms)
    return { ok: true, value_s: v }
  }
  tableClearCell(row: number, col: number): Result {
    const f = this.cellCheck('tableClearCell', row, col); if (f) return f
    this.table[row]![col] = emptyCell()
    this.emit({ type: 'cellCleared', row, col })
    return { ok: true }
  }
  tableClear(): void {
    this.table = emptyTable()
    this.emit({ type: 'tableCleared' })
  }
  /** Plain data of Table 1.1: positions (cm), values [row][col] in s (null = empty) and where each came from. */
  tableData(): TableData {
    return {
      positions_cm: TABLE_POSITIONS_cm,
      values_s: this.table.map((r) => r.map((c) => c.value_s)),
      cells: this.table.map((r) => r.map((c) => ({ ...c }))),
    }
  }

  // ---- procedure and state -----------------------------------------------------------------------------------------
  procedure(): ProcedureSummary {
    const geo = this.geometry()
    const marks = this.evaluateMarks()
    const theta = geo && geo.supportedBothEnds ? geo.theta_rad : null
    const err = theta === null ? null : theta - THETA_GUIDE_rad
    const per = this.table.map((r) => r.filter((c) => c.value_s !== null).length)
    const filled = per.reduce((a, b) => a + b, 0)
    const a = marks.aRailPos_mm
    const miss = this.missing()
    return {
      itemsComplete: miss.every((m) => m.kind !== 'item'),
      setupComplete: miss.length === 0,
      canRun: this.canRun().ok,
      scaleZeroAtHighEnd: geo?.scaleZeroAtHighEnd ?? null,
      scaleOk: geo?.scaleZeroAtHighEnd === true,
      levelledBeforeRaise: this.levelledAtBase,
      theta_rad: theta,
      angleError_rad: err,
      angleOk: err !== null && Math.abs(err) <= ANGLE_TOLERANCE_rad,
      heightsMeasured: { ...this.measured },
      marks,
      marksOk: marks.ok,
      cart: {
        onRail: this.cart.placed,
        atZero: this.cart.placed && a !== null && Math.abs(this.cart.startRailPos_mm! - a) <= CART_AT_A_TOL_mm,
      },
      runsCount: this.runs.length,
      stopsCount: this.sw.stops().length,
      recordsPerPosition: per,
      tableFilled: filled,
      tableComplete: filled === TABLE_ROWS * TABLE_COLS,
    }
  }
  /** UI-facing state (not time dependent). Use cartState(t_ms) and stopwatchDisplay_s(t_ms) for time. */
  getState(): ApparatusState {
    const items = Object.fromEntries(ITEM_IDS.map((i) => [i, this.items.has(i)])) as Record<ItemId, boolean>
    return {
      items, joints: { ...this.joints }, screwsUsed: this.screwsUsed(), screwsAvailable: this.screwsAvailable(),
      rack_mm: this.rack_mm, foot_mm: this.foot_mm, level: { placement: this.levelPlacement },
      markers: this.getMarkers(), cart: { ...this.cart },
      stopwatch: { running: this.sw.running, linkStartToRelease: this.sw.linkStartToRelease },
      geometry: this.geometry(),
    }
  }
  /**
   * Hidden truth for teacher mode and tests ONLY: views of the student experience must not show it.
   */
  hiddenTruth(): { tableTilt_rad: number; theta_rad: number | null } {
    return { ...this.hidden, theta_rad: this.geometry()?.theta_rad ?? null }
  }

  // ---- snapshot, reset, presets ------------------------------------------------------------------------------------
  snapshot(): ApparatusSnapshot {
    const sw = this.sw.snapshot()
    return structuredClone({
      version: 1 as const, seed: this.seed, runRngDraws: this.runRng.draws, hidden: this.hidden, items: [...this.items],
      joints: this.joints, rack_mm: this.rack_mm, foot_mm: this.foot_mm, levelPlacement: this.levelPlacement,
      levelledAtBase: this.levelledAtBase, measured: this.measured, markers: this.markers,
      nextMarkerId: this.nextMarkerId, cart: this.cart, runs: this.runs, stopwatch: sw.state, stops: sw.stops,
      table: this.table, events: this.events,
    })
  }
  /** Restore a snapshot (same seed family: run variability continues exactly where it stopped). */
  load(s: ApparatusSnapshot): Result {
    if (!s || s.version !== 1) return this.refuse('load', 'badSnapshot')
    const c = structuredClone(s)
    this.hidden = { tableTilt_rad: c.hidden.tableTilt_rad } // older saves also carry a retired zero error: dropped
    this.runRng = new CountedRng(c.seed, c.runRngDraws)
    // Older saves list the retired instrument as 'caliper' (now the tape measure) and carry its state: map the id, ignore the state.
    const saved = (c.items as string[]).map((i) => (i === 'caliper' ? 'tape' : i))
    this.items = new Set(saved.filter((i): i is ItemId => (ITEM_IDS as readonly string[]).includes(i)))
    this.joints = c.joints
    this.rack_mm = c.rack_mm; this.foot_mm = c.foot_mm
    this.levelPlacement = c.levelPlacement; this.levelledAtBase = c.levelledAtBase
    this.measured = { ...c.measured, separation: c.measured.separation ?? false }
    this.markers = c.markers; this.nextMarkerId = c.nextMarkerId
    this.cart = c.cart; this.runs = c.runs; this.trajectories.clear()
    this.sw.load(c.stopwatch, c.stops); this.table = c.table
    this.events = c.events; this.seq = c.events.length ? c.events[c.events.length - 1]!.seq : 0
    this.emit({ type: 'loaded' })
    return { ok: true }
  }
  /** Back to an empty bench (same seed, same hidden values), event log cleared. Listeners stay. */
  reset(): void {
    this.runRng = new CountedRng(this.seed)
    this.events = []; this.seq = 0
    this.items = new Set()
    this.joints = { standBase: false, rackClamp: null, twoLegStand: false, receiver: false }
    this.rack_mm = 0; this.foot_mm = 0
    this.levelPlacement = null; this.levelledAtBase = false
    this.measured = { clamp: false, twoLeg: false, separation: false }
    this.markers = []; this.nextMarkerId = 1
    this.cart = { placed: false, startRailPos_mm: null, released: false, runId: null }
    this.runs = []; this.trajectories.clear()
    this.sw.clear(); this.table = emptyTable()
  }
  /**
   * URL-like setup. 'empty': nothing on the table. 'loose': every item lying on the table, nothing attached, cart off the rail, no
   * marks, level not placed (the fresh lab: the student only arranges the setup). 'assembled': a careful student's bench, built through the real
   * actions (so the event log and procedure flags are genuine): all items, rail E1 in the clamp (scale 0 at the top),
   * levelled with the foot at rack 0, rack raised, foot trimmed to 1.30 deg, marks at 200..1100 mm every 100 mm, both
   * support heights measured with the tape, cart on mark A (200 mm).
   */
  preset(name: PresetId): Result {
    if (name !== 'empty' && name !== 'loose' && name !== 'assembled') return this.refuse('preset', 'unknownPreset')
    this.reset()
    if (name === 'loose') this.items = new Set(ITEM_IDS)
    if (name === 'assembled') this.buildAssembled()
    this.emit({ type: 'presetApplied', preset: name })
    return { ok: true }
  }
  private buildAssembled(): void {
    for (const i of ITEM_IDS) this.addItem(i)
    this.attach('standBase'); this.attach('rackClamp', { railEnd: 'E1' }); this.attach('twoLegStand'); this.attach('receiver')
    this.placeLevel('rail')
    const d = SUPPORT_SEPARATION_m
    const tilt = this.hidden.tableTilt_rad
    this.setFoot_mm(1000 * d * Math.sin(tilt)) // level at rack 0: asin(-f/d) + tilt = 0
    const R = Math.round(1000 * d * (Math.sin(tilt) + Math.sin(THETA_GUIDE_rad - tilt)))
    this.setRackHeight_mm(R)
    this.setFoot_mm(R - 1000 * d * Math.sin(THETA_GUIDE_rad - tilt)) // trim: asin((R - f)/d) + tilt = 1.30 deg
    this.placeLevel('table')
    for (let i = 0; i < 10; i++) this.placeMarker(200 + 100 * i)
    this.tapeMeasure({ kind: 'railHeight', at: 'clamp' })
    this.tapeMeasure({ kind: 'railHeight', at: 'twoLeg' })
    this.tapeMeasure({ kind: 'supportSeparation' })
    this.placeCart(200)
  }
}

/** Convenience: new apparatus already set to a preset. */
export function createApparatus(preset: PresetId = 'empty', opts: ApparatusOptions = {}): Apparatus {
  const a = new Apparatus(opts)
  a.preset(preset)
  return a
}
