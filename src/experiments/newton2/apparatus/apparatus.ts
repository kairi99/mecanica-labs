// Device logic of the force-acceleration bench: inventory and assembly, level, marks, string, masses, balance,
// dynamometer, cart runs, stopwatch, Tabla 3.1, DigiCart record, procedure summary, snapshot. DOM-free, timer-free, no
// Math.random. Time is always passed in (ms timestamps from the caller). Physics only from ../physics.
import {
  CountedRng, DEFAULT_DIGICART_BODY, DEFAULT_PULLEY, DEFAULT_VARIABILITY, G_QUITO_mps2, RHO_AIR_QUITO_kgpm3,
  STRING_LINEAR_DENSITY_kgpm, BENCH_HEIGHT_m, SUPPORT_BASE_HEIGHT_m, MIN_HANG_m, MASS_COUNT,
  balanceReading_kg, BALANCE_MAX_kg, buildTrajectory, crossingTime_s, deg2rad, drawPartMasses, floorTravel_m, hangAtRelease_m,
  loading, mulberry32, rad2deg, railTilt_rad, sampleRun, stringHeight_m, trajectoryAt, totalMass_kg,
  type DigiCartBody, type Loading, type MassLocation, type Newton2Params, type PartMasses, type RunGeometry, type RunTrajectory,
  type VariabilityConfig,
} from '../physics/index.ts'
import { Stopwatch } from '../../../core/instruments/stopwatch.ts'
import { quantize } from '../../../core/physics/instruments.ts'
import {
  CART_AT_START_TOL_mm, CART_LENGTH_m, DIGICART_MAX_s, DIGICART_RESOLUTION_m, DIGICART_SAMPLE_RATE_Hz, DIGICART_TAIL_s,
  DISTANCE_TARGET_m, DISTANCE_TOL_mm, FOOT_RANGE_mm, FOOT_STEP_mm, LEVEL_BUBBLE_MAX_mm, LEVEL_CENTERED_TOL_mm, LEVEL_SENSITIVITY_mm_per_deg,
  MARBLE_kg, MARK_SNAP_mm, MASS50_kg, RACK_MAX_mm, RACK_MIN_mm, RACK_STEP_mm, RAIL_LENGTH_m, RAIL_SCALE_MAX_mm, RECEIVER_STOP_FROM_END_m,
  SCREWS_PER_JOINT, SCREWS_TOTAL, STRING_DEFAULT_m, STRING_MAX_m, STRING_MIN_m, STRING_STEP_m, SUPPORT_SEPARATION_m, TABLE_COLS,
  TABLE_ROWS, TABLE_TILT_MAX_deg, TRIAL_MASSES_IN_CANISTER,
} from './constants.ts'
import { readHangingForce } from './force.ts'
import { parseForceInput, parseMassInput_g, parseTimeInput } from './table.ts'
import {
  ITEM_IDS, REQUIRED_ITEM_IDS,
  type ApparatusEvent, type ApparatusEventBody, type ApparatusSnapshot, type ApparatusState, type CanRun, type CartStatus,
  type CrossingRecord, type DigicartRecord, type Failure, type ForceCell, type ForceReading, type ItemId, type JointId,
  type LevelPlacement, type LevelReading, type MarkKind, type MarkState, type MissingEntry, type PresetId, type ProcedureSummary,
  type RailEnd, type RailGeometry, type Reason, type Result, type RunBlock, type RunOutcome, type RunRecord, type StopRecord,
  type TableCell, type TableData, type WeighTarget,
} from './types.ts'

export interface ApparatusOptions {
  /** Seeds the hidden bench tilt, the hidden part masses and the run variability. Default 1. */
  seed?: number
  variability?: VariabilityConfig
  /** Bare DigiCart (mass, wheels, resistance). */
  cart?: DigiCartBody
  /** Override the hidden values (tests, teacher mode). */
  tableTilt_rad?: number
  parts?: PartMasses
  benchHeight_m?: number
}

const MAX_EVENTS = 5000
const emptyCell = (): TableCell => ({ value_s: null, runId: null, stopId: null })
const emptyForce = (): ForceCell => ({ value_N: null, source: null })
const emptyTable = (): TableCell[][] => Array.from({ length: TABLE_ROWS }, () => Array.from({ length: TABLE_COLS }, emptyCell))
const emptyForces = (): ForceCell[] => Array.from({ length: TABLE_ROWS }, emptyForce)
const snap = (v: number, step: number): number => Math.round(v / step) * step
const fail = (reason: Reason, item?: ItemId): Failure => (item ? { ok: false, reason, item } : { ok: false, reason })
const defaultMasses = (): MassLocation[] => Array.from({ length: MASS_COUNT }, () => 'canister' as const)
const freshJoints = (): ApparatusState['joints'] => ({
  standBase: false, rackClamp: null, receiver: false, stringCart: false, stringCanister: false, stringPulley: false,
})
/** A cart that does not move: one sample at the release point. */
function staticTrajectory(s0_m: number): RunTrajectory {
  return { dt_s: 0.001, s_m: Float64Array.of(s0_m), v_mps: Float64Array.of(0), tFloor_s: null, vFloor_mps: null, tReceiver_s: null, tRest_s: 0, duration_s: 0 }
}

export class Apparatus {
  private readonly seed: number
  private readonly variability: VariabilityConfig
  private readonly cartBody: DigiCartBody
  private readonly benchHeight_m: number
  private hidden: { tableTilt_rad: number; parts: PartMasses }
  private runRng: CountedRng
  private listeners: ((e: ApparatusEvent) => void)[] = []

  private events: ApparatusEvent[] = []
  private seq = 0
  private items = new Set<ItemId>()
  private joints = freshJoints()
  private rack_mm = 0
  private foot_mm = 0
  private levelPlacement: LevelPlacement = null
  private wasCentered = false
  private marks: MarkState = { start_mm: null, end_mm: null }
  private stringLength_m = STRING_DEFAULT_m
  private masses: MassLocation[] = defaultMasses()
  private mtRecorded_g: number | null = null
  private lastForce: ForceReading | null = null
  private cart = { placed: false, startRailPos_mm: null as number | null, released: false, runId: null as number | null }
  private runs: RunRecord[] = []
  private trajectories = new Map<number, RunTrajectory>()
  private readonly sw = new Stopwatch<CrossingRecord>()
  private table: TableCell[][] = emptyTable()
  private forceCells: ForceCell[] = emptyForces()

  constructor(opts: ApparatusOptions = {}) {
    this.seed = opts.seed ?? 1
    this.variability = opts.variability ?? DEFAULT_VARIABILITY
    this.cartBody = opts.cart ?? DEFAULT_DIGICART_BODY
    this.benchHeight_m = opts.benchHeight_m ?? BENCH_HEIGHT_m
    const h = mulberry32(this.seed ^ 0x5bd1e995)
    const tilt = opts.tableTilt_rad ?? deg2rad((h() * 2 - 1) * TABLE_TILT_MAX_deg)
    this.hidden = { tableTilt_rad: tilt, parts: opts.parts ?? drawPartMasses(h) }
    this.runRng = new CountedRng(this.seed)
  }

  // ---- events ----------------------------------------------------------------------------------------------------
  /** Subscribe to events; returns the unsubscribe function. */
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
    if (id === 'plasticScrews' && this.masses.includes('cart')) return this.refuse('removeItem', 'screwsInUse', id)
    switch (id) {
      case 'rail': this.detachJoint('rackClamp'); this.marks = { start_mm: null, end_mm: null }; if (this.levelPlacement === 'rail') this.setLevel('table'); break
      case 'rackStand': case 'standBase': this.detachJoint('standBase'); if (id === 'rackStand') this.rack_mm = 0; break
      case 'receiver': this.detachJoint('receiver'); this.foot_mm = 0; break
      case 'cart': this.unplaceCart(); this.detachJoint('stringCart'); break
      case 'brassScrew': this.detachJoint('stringCart'); break
      case 'string': this.detachJoint('stringCart'); this.detachJoint('stringCanister'); this.detachJoint('stringPulley'); break
      case 'canister': this.detachJoint('stringCanister'); this.masses = this.masses.map((m) => (m === 'canister' ? 'bench' : m)); break
      case 'masses': this.masses = this.masses.map((m) => (m === 'cart' ? m : 'canister')); break
      case 'level': this.levelPlacement = null; break
      case 'stopwatch': this.sw.reset(); break
      default: break
    }
    this.items.delete(id)
    this.emit({ type: 'itemRemoved', item: id })
    return { ok: true }
  }
  private railJointCount(): number { return (this.joints.rackClamp ? 1 : 0) + (this.joints.receiver ? 1 : 0) }
  private screwsUsed(): number { return this.railJointCount() * SCREWS_PER_JOINT }
  private screwsAvailable(): number { return this.items.has('screws') ? SCREWS_TOTAL - this.screwsUsed() : 0 }
  private plasticUsed(): number { return this.masses.filter((m) => m === 'cart').length }

  /**
   * Snap an attachment. standBase: rack stand on its base. rackClamp: a rail end (`railEnd`) in the clamp (needs the base, 2
   * screws); that end is the stand end where the cart starts. receiver: the other end (needs the clamp, 2 screws).
   * stringCart: string fixed to the cart with the brass screw. stringCanister: string tied to the canister.
   * stringPulley: string over the receiver's pulley (needs the receiver).
   */
  attach(joint: JointId, opts: { railEnd?: RailEnd } = {}): Result {
    const j = this.joints
    const need = (...ids: ItemId[]): Failure | null => {
      for (const i of ids) if (!this.items.has(i)) return this.refuse('attach', 'itemNotOnTable', i)
      return null
    }
    const already = joint === 'rackClamp' ? j.rackClamp !== null : j[joint]
    let f: Failure | null
    switch (joint) {
      case 'standBase': f = need('rackStand', 'standBase'); break
      case 'rackClamp': f = need('rail', 'rackStand'); break
      case 'receiver': f = need('rail', 'receiver'); break
      case 'stringCart': f = need('string', 'cart', 'brassScrew'); break
      case 'stringCanister': f = need('string', 'canister'); break
      case 'stringPulley': f = need('string', 'receiver'); break
    }
    if (f) return f
    if (already) return this.refuse('attach', 'alreadyAttached')
    if (joint === 'rackClamp') {
      if (!j.standBase) return this.refuse('attach', 'needStandBase')
      if (opts.railEnd !== 'E1' && opts.railEnd !== 'E2') return this.refuse('attach', 'railEndRequired')
    }
    if (joint === 'receiver' && !j.rackClamp) return this.refuse('attach', 'needRackClamp')
    if (joint === 'stringPulley' && !j.receiver) return this.refuse('attach', 'needReceiver')
    if (joint === 'rackClamp' || joint === 'receiver') {
      if (!this.items.has('screws')) return this.refuse('attach', 'itemNotOnTable', 'screws')
      if (this.screwsAvailable() < SCREWS_PER_JOINT) return this.refuse('attach', 'noScrews')
    }
    if (joint === 'rackClamp') j.rackClamp = opts.railEnd!
    else j[joint] = true
    this.emit(joint === 'rackClamp' ? { type: 'attached', joint, railEnd: opts.railEnd! } : { type: 'attached', joint })
    this.updateLevelFlag()
    return { ok: true }
  }
  /** Undo a joint (and what hangs on it: base -> clamp -> receiver -> string over the pulley). Screws come back. */
  detach(joint: JointId): Result {
    const isOn = joint === 'rackClamp' ? this.joints.rackClamp !== null : this.joints[joint]
    if (!isOn) return this.refuse('detach', 'notAttached')
    this.detachJoint(joint)
    return { ok: true }
  }
  private detachJoint(joint: JointId): void {
    const j = this.joints
    if (joint === 'standBase') {
      if (!j.standBase) return
      this.detachJoint('rackClamp'); j.standBase = false
      this.emit({ type: 'detached', joint })
    } else if (joint === 'rackClamp') {
      if (!j.rackClamp) return
      this.detachJoint('receiver'); j.rackClamp = null
      this.unplaceCart()
      this.emit({ type: 'detached', joint })
    } else if (joint === 'receiver') {
      if (!j.receiver) return
      this.detachJoint('stringPulley'); j.receiver = false
      this.emit({ type: 'detached', joint })
    } else if (j[joint]) {
      j[joint] = false
      this.emit({ type: 'detached', joint })
    }
  }

  /** Everything still needed (required items and joints only: distractors are never listed). */
  missing(): MissingEntry[] {
    const out: MissingEntry[] = []
    const blocking: Partial<Record<ItemId, boolean>> = {
      rail: true, cart: true, rackStand: true, standBase: true, receiver: true, screws: true, string: true, canister: true, brassScrew: true,
    }
    for (const id of REQUIRED_ITEM_IDS) if (!this.items.has(id)) out.push({ kind: 'item', id, reason: 'notOnTable', blocksRun: blocking[id] === true })
    const has = (...ids: ItemId[]): boolean => ids.every((i) => this.items.has(i))
    const j = this.joints
    if (has('rackStand', 'standBase') && !j.standBase) out.push({ kind: 'joint', id: 'standBase', reason: 'notAttached', blocksRun: true })
    if (has('rail', 'rackStand') && j.rackClamp === null) out.push({ kind: 'joint', id: 'rackClamp', reason: j.standBase ? 'notAttached' : 'needsStandBase', blocksRun: true })
    if (has('rail', 'receiver') && !j.receiver) out.push({ kind: 'joint', id: 'receiver', reason: j.rackClamp ? 'notAttached' : 'needsRackClamp', blocksRun: true })
    if (has('string', 'cart', 'brassScrew') && !j.stringCart) out.push({ kind: 'joint', id: 'stringCart', reason: 'notAttached', blocksRun: false })
    if (has('string', 'canister') && !j.stringCanister) out.push({ kind: 'joint', id: 'stringCanister', reason: 'notAttached', blocksRun: false })
    if (has('string', 'receiver') && !j.stringPulley) out.push({ kind: 'joint', id: 'stringPulley', reason: j.receiver ? 'notAttached' : 'needsReceiver', blocksRun: false })
    return out
  }
  /** Can the cart be released safely? noReceiver: the cart would fall off the rail end. */
  canRun(): CanRun {
    const reasons: RunBlock[] = []
    if (!this.items.has('rail')) reasons.push('noRail')
    else if (this.joints.rackClamp === null) reasons.push('railNotSupported')
    if (!this.joints.receiver) reasons.push('noReceiver')
    if (!this.cart.placed) reasons.push('cartNotPlaced')
    return { ok: reasons.length === 0, reasons }
  }
  private stringConnected(): boolean { const j = this.joints; return j.stringCart && j.stringCanister && j.stringPulley }

  // ---- geometry and level ----------------------------------------------------------------------------------------
  /** Rail geometry; null until the rail is held at both ends (stand clamp and receiver). */
  geometry(): RailGeometry | null {
    const end = this.joints.rackClamp
    if (end === null || !this.joints.receiver) return null
    const hS = SUPPORT_BASE_HEIGHT_m + this.rack_mm / 1000
    const hR = SUPPORT_BASE_HEIGHT_m + this.foot_mm / 1000
    return {
      highEnd: end, standEnd: end, standHeight_m: hS, receiverHeight_m: hR,
      tilt_rad: railTilt_rad(hS, hR, SUPPORT_SEPARATION_m, this.hidden.tableTilt_rad),
    }
  }
  /** Stand-end clamp height above its lowest position, whole mm. */
  setRackHeight_mm(value_mm: number): Result<{ rack_mm: number }> {
    if (!this.items.has('rackStand')) return this.refuse('setRack', 'itemNotOnTable', 'rackStand')
    if (!Number.isFinite(value_mm)) return this.refuse('setRack', 'notFinite')
    const v = snap(value_mm, RACK_STEP_mm)
    if (v < RACK_MIN_mm || v > RACK_MAX_mm) return this.refuse('setRack', 'outOfRange')
    this.rack_mm = v
    this.emit({ type: 'heightSet', which: 'rack', value_mm: v })
    this.updateLevelFlag()
    return { ok: true, rack_mm: v }
  }
  /** Screw foot of the receiver support, mm (+up), +-5 mm in 0.05 mm steps. */
  setFoot_mm(value_mm: number): Result<{ foot_mm: number }> {
    if (!this.items.has('receiver')) return this.refuse('setFoot', 'itemNotOnTable', 'receiver')
    if (!Number.isFinite(value_mm)) return this.refuse('setFoot', 'notFinite')
    const v = Math.round(snap(value_mm, FOOT_STEP_mm) * 1e6) / 1e6
    if (Math.abs(v) > FOOT_RANGE_mm) return this.refuse('setFoot', 'outOfRange')
    this.foot_mm = v
    this.emit({ type: 'heightSet', which: 'foot', value_mm: v })
    this.updateLevelFlag()
    return { ok: true, foot_mm: v }
  }
  placeLevel(where: LevelPlacement): Result {
    if (!this.items.has('level')) return this.refuse('placeLevel', 'itemNotOnTable', 'level')
    if (where === 'rail' && !this.items.has('rail')) return this.refuse('placeLevel', 'levelNeedsRail')
    this.setLevel(where)
    return { ok: true }
  }
  private setLevel(where: LevelPlacement): void {
    this.levelPlacement = where
    this.wasCentered = false
    this.emit({ type: 'levelPlaced', placement: where })
    this.updateLevelFlag()
  }
  /** Bubble of the level: on the rail it shows the rail's true tilt (the bench tilt while the rail is not held at both ends), on the table the bench's. */
  levelReading(): LevelReading {
    const p = this.levelPlacement
    if (p === null) return { placement: null, bubble_mm: null, saturated: false, centered: false }
    const tilt = p === 'rail' ? this.geometry()?.tilt_rad ?? this.hidden.tableTilt_rad : this.hidden.tableTilt_rad
    const raw = LEVEL_SENSITIVITY_mm_per_deg * rad2deg(tilt)
    const b = Math.max(-LEVEL_BUBBLE_MAX_mm, Math.min(LEVEL_BUBBLE_MAX_mm, raw))
    return { placement: p, bubble_mm: b, saturated: Math.abs(raw) >= LEVEL_BUBBLE_MAX_mm, centered: Math.abs(b) <= LEVEL_CENTERED_TOL_mm }
  }
  private updateLevelFlag(): void {
    if (this.levelPlacement !== 'rail') return
    const c = this.levelReading().centered
    if (c && !this.wasCentered) this.emit({ type: 'leveled', bubble_mm: this.levelReading().bubble_mm! })
    this.wasCentered = c
  }

  // ---- marks and string ------------------------------------------------------------------------------------------
  /** Stick the start (0 cm) or end (90 cm) mark at a printed-scale position (snapped to 0.5 mm). */
  placeMark(kind: MarkKind, railPos_mm: number): Result<{ railPos_mm: number }> {
    if (!this.items.has('markers')) return this.refuse('placeMark', 'itemNotOnTable', 'markers')
    if (!this.items.has('rail')) return this.refuse('placeMark', 'itemNotOnTable', 'rail')
    if (!Number.isFinite(railPos_mm) || railPos_mm < 0 || railPos_mm > RAIL_SCALE_MAX_mm) return this.refuse('placeMark', 'outOfRail')
    const p = snap(railPos_mm, MARK_SNAP_mm)
    this.marks = { ...this.marks, [kind === 'start' ? 'start_mm' : 'end_mm']: p }
    this.emit({ type: 'markPlaced', mark: kind, railPos_mm: p })
    return { ok: true, railPos_mm: p }
  }
  removeMark(kind: MarkKind): Result {
    const key = kind === 'start' ? 'start_mm' : 'end_mm'
    if (this.marks[key] === null) return this.refuse('removeMark', 'notAttached')
    this.marks = { ...this.marks, [key]: null }
    this.emit({ type: 'markRemoved', mark: kind })
    return { ok: true }
  }
  getMarks(): MarkState { return { ...this.marks } }
  /** Cut or tie the string to a length, m (1 mm steps, 0.30 to 2.00 m): knot at the brass screw to knot at the canister. */
  setStringLength_m(length_m: number): Result<{ length_m: number }> {
    if (!this.items.has('string')) return this.refuse('setStringLength', 'itemNotOnTable', 'string')
    if (!Number.isFinite(length_m)) return this.refuse('setStringLength', 'notFinite')
    const v = Math.round(snap(length_m, STRING_STEP_m) * 1e6) / 1e6
    if (v < STRING_MIN_m || v > STRING_MAX_m) return this.refuse('setStringLength', 'outOfRange')
    this.stringLength_m = v
    this.emit({ type: 'stringLengthSet', length_m: v })
    return { ok: true, length_m: v }
  }

  // ---- masses, balance, dynamometer ------------------------------------------------------------------------------
  massLocations(): readonly MassLocation[] { return this.masses }
  /** Move one of the four 10 g masses (index 0..3): into the canister, onto the cart (needs a plastic screw each), or leave it on the bench (out of the system). */
  setMassLocation(index: number, to: MassLocation): Result {
    if (!Number.isInteger(index) || index < 0 || index >= MASS_COUNT || !['canister', 'cart', 'bench'].includes(to)) return this.refuse('setMass', 'badMass')
    if (!this.items.has('masses')) return this.refuse('setMass', 'itemNotOnTable', 'masses')
    if (to === 'canister' && !this.items.has('canister')) return this.refuse('setMass', 'canisterNeeded', 'canister')
    if (to === 'cart') {
      if (!this.items.has('cart')) return this.refuse('setMass', 'itemNotOnTable', 'cart')
      if (!this.items.has('plasticScrews')) return this.refuse('setMass', 'itemNotOnTable', 'plasticScrews')
      if (this.masses[index] !== 'cart' && this.plasticUsed() >= 5) return this.refuse('setMass', 'noPlasticScrews', 'plasticScrews')
    }
    this.masses[index] = to
    this.emit({ type: 'massMoved', index, to })
    return { ok: true }
  }
  /** The guide's trials: `n` masses in the canister, the other 4 - n fixed on the cart (masses 0..n-1 stay, the rest move). */
  setTrial(n: number): Result {
    if (!Number.isInteger(n) || n < 0 || n > MASS_COUNT) return this.refuse('setTrial', 'badMass')
    for (let i = 0; i < MASS_COUNT; i++) {
      const r = this.setMassLocation(i, i < n ? 'canister' : 'cart')
      if (!r.ok) return r
    }
    return { ok: true }
  }
  private loadingNow(): Loading {
    const eff = this.masses.map((m): MassLocation => (!this.items.has('masses') ? 'bench' : m === 'canister' && !this.items.has('canister') ? 'bench' : m))
    return loading(this.hidden.parts, eff, this.joints.stringCart, this.items.has('canister'))
  }
  /** Masses in the canister now (the number F depends on). */
  massesInCanister(): number { return this.items.has('canister') && this.items.has('masses') ? this.masses.filter((m) => m === 'canister').length : 0 }
  private trueKg(t: WeighTarget): number | null {
    const P = this.hidden.parts
    const needs = (id: ItemId, kg: number): number | null => (this.items.has(id) ? kg : null)
    switch (t) {
      case 'cart': return needs('cart', this.cartBody.m_kg)
      case 'brassScrew': return needs('brassScrew', P.brassScrew_kg)
      case 'plasticScrew': return needs('plasticScrews', P.plasticScrew_kg)
      case 'canister': return needs('canister', P.canister_kg)
      case 'mass50': return needs('mass50', MASS50_kg)
      case 'marble': return needs('marble', MARBLE_kg)
      case 'system': {
        if (!this.items.has('cart') || !this.items.has('canister')) return null
        const l = this.loadingNow()
        return this.cartBody.m_kg + l.mCartLoad_kg + l.mHang_kg
      }
      default: return this.items.has('masses') ? P.masses_kg[Number(t.slice(4))]! : null
    }
  }
  /** Put objects on the balance (0.1 g resolution, 600 g capacity). Each target must be on the table. */
  weigh(targets: readonly WeighTarget[]): Result<{ reading_kg: number; resolution_kg: number }> {
    if (!this.items.has('balance')) return this.refuse('weigh', 'itemNotOnTable', 'balance')
    if (targets.length === 0) return this.refuse('weigh', 'nothingToWeigh')
    let sum = 0
    for (const t of targets) {
      const k = this.trueKg(t)
      if (k === null) return this.refuse('weigh', 'nothingToWeigh')
      sum += k
    }
    if (sum > BALANCE_MAX_kg) return this.refuse('weigh', 'overload', 'balance')
    const reading_kg = balanceReading_kg(sum)
    this.emit({ type: 'weighed', targets: [...targets], reading_kg })
    return { ok: true, reading_kg, resolution_kg: 0.0001 }
  }
  /** Write down Mt (g, one decimal) as read on the balance. */
  recordMt_g(input: string | number): Result<{ value_g: number }> {
    const p = parseMassInput_g(input)
    if (!p.ok) return this.refuse('recordMt', p.reason)
    this.mtRecorded_g = p.value
    this.emit({ type: 'massRecorded', value_g: p.value })
    return { ok: true, value_g: p.value }
  }
  mtRecorded_kg(): number | null { return this.mtRecorded_g === null ? null : this.mtRecorded_g / 1000 }
  /** Hang the canister (with the masses now in it) on the dynamometer and read its weight. */
  dynamometerRead(): Result<{ reading: ForceReading }> {
    if (!this.items.has('dynamometer')) return this.refuse('dynamometerRead', 'itemNotOnTable', 'dynamometer')
    if (!this.items.has('canister')) return this.refuse('dynamometerRead', 'itemNotOnTable', 'canister')
    const l = this.loadingNow()
    const reading = readHangingForce(l.mHang_kg * G_QUITO_mps2, this.massesInCanister())
    this.lastForce = reading
    this.emit({ type: 'forceRead', reading_N: reading.reading_N, massesInCanister: reading.massesInCanister })
    return { ok: true, reading }
  }
  lastForceReading(): ForceReading | null { return this.lastForce ? { ...this.lastForce } : null }

  // ---- cart and runs ---------------------------------------------------------------------------------------------
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
  /** Distance from the stand end of the rail, m, of a printed-scale position. */
  private distFromStand_m(pos_mm: number, end: RailEnd): number { return (end === 'E1' ? pos_mm : RAIL_SCALE_MAX_mm - pos_mm) / 1000 }
  private posFromStand_mm(D_m: number, end: RailEnd): number { return end === 'E1' ? D_m * 1000 : RAIL_SCALE_MAX_mm - D_m * 1000 }
  private stopFace_m(): number { return RAIL_LENGTH_m - RECEIVER_STOP_FROM_END_m }
  /**
   * Put the cart on the rail with its FRONT (the end toward the pulley) at a printed-scale position. The whole cart must lie
   * on the rail and in front of the receiver stop: otherwise 'cartOffRail' (the cart rolls easily and could fall). Needs the clamp.
   */
  placeCart(front_railPos_mm: number): Result<{ front_railPos_mm: number }> {
    if (!this.items.has('cart')) return this.refuse('placeCart', 'itemNotOnTable', 'cart')
    if (!this.items.has('rail')) return this.refuse('placeCart', 'cartOffRail')
    const end = this.joints.rackClamp
    if (end === null) return this.refuse('placeCart', 'railNotAssembled')
    if (!Number.isFinite(front_railPos_mm)) return this.refuse('placeCart', 'notFinite')
    const p = snap(front_railPos_mm, MARK_SNAP_mm)
    const D = this.distFromStand_m(p, end)
    const max = this.joints.receiver ? this.stopFace_m() : RAIL_LENGTH_m
    if (p < 0 || p > RAIL_SCALE_MAX_mm || D < CART_LENGTH_m - 1e-9 || D > max + 1e-9) return this.refuse('placeCart', 'cartOffRail')
    this.endRun('placed')
    this.cart.placed = true
    this.cart.released = false
    this.cart.startRailPos_mm = p
    this.emit({ type: 'cartPlaced', front_railPos_mm: p })
    return { ok: true, front_railPos_mm: p }
  }
  /** Carry the cart back to where it was last placed (else to the start mark). */
  resetCart(): Result<{ front_railPos_mm: number }> {
    if (!this.items.has('cart')) return this.refuse('resetCart', 'itemNotOnTable', 'cart')
    const p = this.cart.startRailPos_mm ?? this.marks.start_mm
    if (p === null) return this.refuse('resetCart', 'noStartPosition')
    const r = this.placeCart(p)
    if (!r.ok) return r
    this.emit({ type: 'cartReset', front_railPos_mm: r.front_railPos_mm })
    return r
  }
  /** Physical plan of a release from the current set-up (hidden numbers: teacher mode, tests, run records). */
  private plan(): { end: RailEnd; D0: number; sReceiver_m: number; hang0_m: number; sFloor_m: number; sEnd_m: number | null } {
    const geo = this.geometry()!
    const end = geo.standEnd
    const D0 = this.distFromStand_m(this.cart.startRailPos_mm!, end)
    const sReceiver_m = this.stopFace_m() - D0
    const hang0_m = hangAtRelease_m(this.stringLength_m, sReceiver_m)
    const sFloor_m = floorTravel_m(stringHeight_m(this.benchHeight_m, geo.receiverHeight_m), hang0_m)
    const sEnd_m = this.marks.end_mm === null ? DISTANCE_TARGET_m : this.distFromStand_m(this.marks.end_mm, end) - D0
    return { end, D0, sReceiver_m, hang0_m, sFloor_m, sEnd_m: sEnd_m > 1e-9 ? sEnd_m : null }
  }
  private baseParams(tilt_rad: number): Newton2Params {
    const l = this.loadingNow()
    return {
      g_mps2: G_QUITO_mps2, rho_air_kgpm3: RHO_AIR_QUITO_kgpm3, cart: this.cartBody, mCartLoad_kg: l.mCartLoad_kg, mHang_kg: l.mHang_kg,
      mString_kg: this.items.has('string') ? STRING_LINEAR_DENSITY_kgpm * this.stringLength_m : 0, pulley: DEFAULT_PULLEY, tilt_rad,
    }
  }
  /** Release the placed cart from rest at time t_ms. Samples this run's variability; the outcome says what physically happens. */
  releaseCart(t_ms: number): Result<{ runId: number; outcome: RunOutcome }> {
    if (this.cart.released) {
      const st = this.cartState(t_ms)
      return this.refuse('releaseCart', st.phase === 'rolling' || st.phase === 'coasting' ? 'cartMoving' : 'cartNotAtStart')
    }
    const cr = this.canRun()
    if (!cr.ok) return this.refuse('releaseCart', cr.reasons[0]!)
    const geo = this.geometry()!
    const pl = this.plan()
    const base = this.baseParams(geo.tilt_rad)
    const cond = sampleRun(base, this.runRng.next, this.variability)
    let rgeo: RunGeometry = { sFloor_m: pl.sFloor_m, sReceiver_m: pl.sReceiver_m }
    const connected = this.stringConnected()
    const tooShort = connected && pl.hang0_m < MIN_HANG_m
    if (!connected) rgeo = { sFloor_m: -1e9, sReceiver_m: pl.sReceiver_m }
    const id = this.runs.length + 1
    const rec: RunRecord = {
      id, releaseTime_ms: t_ms, massesInCanister: this.massesInCanister(), locations: [...this.masses], startRailPos_mm: this.cart.startRailPos_mm!,
      standEnd: pl.end, tilt_rad: geo.tilt_rad,
      conditions: { releaseOffset_m: cond.init.s_m, v0_mps: cond.init.v_mps, c_rr: cond.params.cart.c_rr, F_pulley_N: cond.params.pulley.F_friction_N },
      params: cond.params, geo: rgeo, sEnd_m: pl.sEnd_m, totalMass_kg: totalMass_kg(cond.params),
      outcome: 'ok', tEnd_s: null, tFloor_s: null, tReceiver_s: null, endedBy: null,
    }
    const tr = tooShort ? staticTrajectory(cond.init.s_m) : buildTrajectory(rec.params, rec.geo, cond.init)
    rec.tEnd_s = tooShort || pl.sEnd_m === null ? null : crossingTime_s(pl.sEnd_m, rec.params, rec.geo, cond.init)
    rec.tFloor_s = connected && !tooShort ? tr.tFloor_s : null
    rec.tReceiver_s = tr.tReceiver_s
    rec.outcome = this.classify(rec, connected, tooShort, tr, pl.sFloor_m)
    this.runs.push(rec)
    this.trajectories.set(id, tr)
    this.cart.released = true
    this.cart.runId = id
    this.emit({ type: 'released', runId: id, outcome: rec.outcome }, t_ms)
    if (this.sw.linkStartToRelease && this.items.has('stopwatch')) {
      this.sw.reset()
      this.swStart(t_ms, true)
    }
    return { ok: true, runId: id, outcome: rec.outcome }
  }
  private classify(rec: RunRecord, connected: boolean, tooShort: boolean, tr: RunTrajectory, sFloor_m: number): RunOutcome {
    if (!connected) return 'stringNotAttached'
    if (tooShort) return 'stringTooShort'
    if (tr.tRest_s === 0) return 'neverStarts'
    const sEnd = rec.sEnd_m
    if (sEnd !== null && rec.tEnd_s === null) {
      if (sEnd > rec.geo.sReceiver_m) return 'receiverBlocks'
      return rec.tFloor_s !== null ? 'canisterHitsFloorCartStops' : 'neverStarts'
    }
    if (sEnd !== null && sFloor_m < sEnd) return 'canisterHitsFloor'
    return 'ok'
  }
  private trajectoryFor(rec: RunRecord): RunTrajectory {
    let tr = this.trajectories.get(rec.id)
    if (!tr) {
      const init = { s_m: rec.conditions.releaseOffset_m, v_mps: rec.conditions.v0_mps }
      tr = rec.outcome === 'stringTooShort' ? staticTrajectory(init.s_m) : buildTrajectory(rec.params, rec.geo, init)
      this.trajectories.set(rec.id, tr)
    }
    return tr
  }
  /** Cart state at time t_ms. */
  cartState(t_ms: number): CartStatus {
    const none: CartStatus = { phase: 'unplaced', runId: this.cart.runId, t_s: 0, frontRailPos_mm: null, s_m: 0, v_mps: 0, canisterDrop_m: 0, canisterOnFloor: false }
    const end = this.joints.rackClamp
    if (!this.cart.placed || end === null) return none
    const D0 = this.distFromStand_m(this.cart.startRailPos_mm!, end)
    const mk = (phase: CartStatus['phase'], t_s: number, s: number, v: number, drop = 0, floor = false): CartStatus => ({
      phase, runId: this.cart.runId, t_s, s_m: s, v_mps: v, canisterDrop_m: drop, canisterOnFloor: floor,
      frontRailPos_mm: this.posFromStand_mm(D0 + s, end),
    })
    const rec = this.cart.released ? this.runs.find((r) => r.id === this.cart.runId) : undefined
    if (!rec) return mk('atStart', 0, 0, 0)
    const t_s = Math.max(0, (t_ms - rec.releaseTime_ms) / 1000)
    const tr = this.trajectoryFor(rec)
    const st = trajectoryAt(tr, t_s)
    const pulling = rec.outcome !== 'stringNotAttached' && rec.outcome !== 'stringTooShort'
    const onFloor = rec.tFloor_s !== null && t_s >= rec.tFloor_s
    const drop = pulling ? Math.min(st.s_m, Math.max(0, rec.geo.sFloor_m)) : 0
    const atRest = tr.tRest_s !== null && t_s >= tr.tRest_s
    const phase: CartStatus['phase'] = tr.tRest_s === 0 ? 'stuck' : atRest ? 'stopped' : onFloor ? 'coasting' : 'rolling'
    return mk(phase, t_s, st.s_m, st.v_mps, drop, onFloor)
  }
  getRuns(): readonly RunRecord[] { return this.runs }
  getRun(runId: number): RunRecord | null { return this.runs.find((r) => r.id === runId) ?? null }
  /** The DigiCart's own record of a run: x(t) at 50 Hz (1 mm) from the release. */
  digicartRecord(runId: number): DigicartRecord | null {
    const rec = this.getRun(runId)
    if (!rec) return null
    const tr = this.trajectoryFor(rec)
    const end = Math.max(1, Math.min(DIGICART_MAX_s, rec.tEnd_s !== null ? rec.tEnd_s + DIGICART_TAIL_s : tr.duration_s))
    const n = Math.ceil(end * DIGICART_SAMPLE_RATE_Hz)
    const t_s: number[] = [], x_m: number[] = []
    const s0 = tr.s_m[0]!
    for (let k = 0; k <= n; k++) {
      const tk = k / DIGICART_SAMPLE_RATE_Hz
      t_s.push(tk)
      x_m.push(Math.round(quantize(trajectoryAt(tr, tk).s_m - s0, DIGICART_RESOLUTION_m) * 1e6) / 1e6)
    }
    return {
      runId, releaseTime_ms: rec.releaseTime_ms, sampleRate_Hz: DIGICART_SAMPLE_RATE_Hz, resolution_m: DIGICART_RESOLUTION_m,
      t_s, x_m, tEnd_s: rec.tEnd_s, tFloor_s: rec.tFloor_s,
    }
  }

  // ---- stopwatch -------------------------------------------------------------------------------------------------
  setLinkStartToRelease(on: boolean): void {
    this.sw.setLinkStartToRelease(on)
    this.emit({ type: 'linkStartToRelease', on })
  }
  stopwatchDisplay_s(t_ms: number): number { return this.sw.display_s(t_ms) }
  private swStart(t_ms: number, linked: boolean): void {
    this.sw.start(t_ms)
    this.emit({ type: 'stopwatchStart', linked }, t_ms)
  }
  /** The single start/stop button, pressed at t_ms. A stop logs a StopRecord whose `crossings` hold the true end-mark time of the run. */
  stopwatchStartStop(t_ms: number, opts: { markTarget?: number } = {}): Result<{ running: boolean; stop?: StopRecord }> {
    if (!this.items.has('stopwatch')) return this.refuse('stopwatchStartStop', 'itemNotOnTable', 'stopwatch')
    if (!this.sw.running) {
      this.swStart(t_ms, false)
      return { ok: true, running: true }
    }
    const run = this.cart.runId !== null ? this.runs.find((r) => r.id === this.cart.runId) ?? null : null
    const cross: CrossingRecord[] = run ? [{ markId: 'end', railPos_mm: this.marks.end_mm, trueTime_s: run.tEnd_s }] : []
    const stop = this.sw.stop(t_ms, run ? { runId: run.id, releaseTime_ms: run.releaseTime_ms, crossings: cross } : null, opts.markTarget ?? null)
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

  // ---- Tabla 3.1 -------------------------------------------------------------------------------------------------
  private rowCheck(action: string, row: number): Failure | null {
    return Number.isInteger(row) && row >= 0 && row < TABLE_ROWS ? null : this.refuse(action, 'badCell')
  }
  private cellCheck(action: string, row: number, col: number): Failure | null {
    if (!Number.isInteger(col) || col < 0 || col >= TABLE_COLS) return this.refuse(action, 'badCell')
    return this.rowCheck(action, row)
  }
  /** Type the force F of a trial row (N, decimal point or comma, at most 2 decimals). */
  tableSetForce(row: number, input: string | number): Result<{ value_N: number }> {
    const f = this.rowCheck('tableSetForce', row); if (f) return f
    const p = parseForceInput(input)
    if (!p.ok) return this.refuse('tableSetForce', p.reason)
    this.forceCells[row] = { value_N: p.value, source: 'typed' }
    this.emit({ type: 'forceRecorded', row, value_N: p.value, source: 'typed' })
    return { ok: true, value_N: p.value }
  }
  /** Copy the last dynamometer reading into the force cell of a row. */
  tableCopyForce(row: number): Result<{ value_N: number }> {
    const f = this.rowCheck('tableCopyForce', row); if (f) return f
    if (!this.lastForce) return this.refuse('tableCopyForce', 'noForceReading')
    const v = this.lastForce.reading_N
    this.forceCells[row] = { value_N: v, source: 'copied' }
    this.emit({ type: 'forceRecorded', row, value_N: v, source: 'copied' })
    return { ok: true, value_N: v }
  }
  tableClearForce(row: number): Result {
    const f = this.rowCheck('tableClearForce', row); if (f) return f
    this.forceCells[row] = emptyForce()
    this.emit({ type: 'forceCleared', row })
    return { ok: true }
  }
  /** Type a time (s) into a cell; text with decimal point or comma, at most 2 decimals. */
  tableSet(row: number, col: number, input: string | number): Result<{ value_s: number }> {
    const f = this.cellCheck('tableSet', row, col); if (f) return f
    const p = parseTimeInput(input)
    if (!p.ok) return this.refuse('tableSet', p.reason)
    this.table[row]![col] = { value_s: p.value, runId: null, stopId: null }
    this.emit({ type: 'recorded', row, col, value_s: p.value, source: 'typed', runId: null })
    return { ok: true, value_s: p.value }
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
    this.forceCells = emptyForces()
    this.emit({ type: 'tableCleared' })
  }
  tableData(): TableData {
    return {
      trialMasses: TRIAL_MASSES_IN_CANISTER,
      forces_N: this.forceCells.map((c) => c.value_N),
      values_s: this.table.map((r) => r.map((c) => c.value_s)),
      cells: this.table.map((r) => r.map((c) => ({ ...c }))),
      forceCells: this.forceCells.map((c) => ({ ...c })),
    }
  }

  // ---- procedure and state ---------------------------------------------------------------------------------------
  procedure(): ProcedureSummary {
    const geo = this.geometry()
    const miss = this.missing()
    const { start_mm, end_mm } = this.marks
    const end = this.joints.rackClamp
    const dist = start_mm !== null && end_mm !== null ? Math.abs(end_mm - start_mm) / 1000 : null
    const per = this.table.map((r) => r.filter((c) => c.value_s !== null).length)
    const outcomes: Partial<Record<RunOutcome, number>> = {}
    for (const r of this.runs) outcomes[r.outcome] = (outcomes[r.outcome] ?? 0) + 1
    const loc = (w: MassLocation): number => this.masses.filter((m) => m === w).length
    const filled = per.reduce((a, b) => a + b, 0)
    const lvl = this.levelPlacement === 'rail' ? this.levelReading().centered : geo ? Math.abs(LEVEL_SENSITIVITY_mm_per_deg * rad2deg(geo.tilt_rad)) <= LEVEL_CENTERED_TOL_mm : false
    return {
      itemsComplete: miss.every((m) => m.kind !== 'item'),
      setupComplete: miss.length === 0,
      canRun: this.canRun().ok,
      levelled: lvl,
      tilt_rad: geo?.tilt_rad ?? null,
      marksPlaced: start_mm !== null && end_mm !== null,
      distanceOk: dist !== null && Math.abs(dist - DISTANCE_TARGET_m) * 1000 <= DISTANCE_TOL_mm,
      distance_m: dist,
      cartAtStart: this.cart.placed && start_mm !== null && Math.abs(this.cart.startRailPos_mm! - start_mm) <= CART_AT_START_TOL_mm &&
        (end === null || (end === 'E1' ? end_mm === null || end_mm > start_mm : end_mm === null || end_mm < start_mm)),
      stringConnected: this.stringConnected(),
      massesIn: { canister: loc('canister'), cart: loc('cart'), bench: loc('bench') },
      massKept: loc('bench') === 0 && this.items.has('masses'),
      mtRecorded_kg: this.mtRecorded_kg(),
      runsCount: this.runs.length,
      stopsCount: this.sw.stops().length,
      outcomes,
      recordsPerRow: per,
      forcesRecorded: this.forceCells.filter((c) => c.value_N !== null).length,
      tableFilled: filled,
      tableComplete: [0, 1, 2, 3].every((r) => this.forceCells[r]!.value_N !== null && per[r] === TABLE_COLS),
    }
  }
  /** UI-facing state (not time dependent). Use cartState(t_ms) and stopwatchDisplay_s(t_ms) for time. */
  getState(): ApparatusState {
    const items = Object.fromEntries(ITEM_IDS.map((i) => [i, this.items.has(i)])) as Record<ItemId, boolean>
    return {
      items, joints: { ...this.joints }, screwsUsed: this.screwsUsed(), screwsAvailable: this.screwsAvailable(),
      rack_mm: this.rack_mm, foot_mm: this.foot_mm, level: { placement: this.levelPlacement }, marks: { ...this.marks },
      stringLength_m: this.stringLength_m, masses: [...this.masses], plasticScrewsUsed: this.plasticUsed(), cart: { ...this.cart },
      stopwatch: { running: this.sw.running, linkStartToRelease: this.sw.linkStartToRelease }, geometry: this.geometry(),
    }
  }
  /** Hidden truth for teacher mode and tests ONLY: views of the student experience must not show it. */
  hiddenTruth(): {
    tableTilt_rad: number; tilt_rad: number | null; parts: PartMasses; totalMass_kg: number
    hang0_m: number | null; sFloor_m: number | null; sReceiver_m: number | null
  } {
    const ready = this.geometry() !== null && this.cart.placed
    const pl = ready ? this.plan() : null
    const l = this.loadingNow()
    return {
      tableTilt_rad: this.hidden.tableTilt_rad, tilt_rad: this.geometry()?.tilt_rad ?? null, parts: structuredClone(this.hidden.parts),
      totalMass_kg: this.cartBody.m_kg + l.mCartLoad_kg + l.mHang_kg,
      hang0_m: pl?.hang0_m ?? null, sFloor_m: pl?.sFloor_m ?? null, sReceiver_m: pl?.sReceiver_m ?? null,
    }
  }

  // ---- snapshot, reset, presets ----------------------------------------------------------------------------------
  snapshot(): ApparatusSnapshot {
    const sw = this.sw.snapshot()
    return structuredClone({
      version: 1 as const, seed: this.seed, runRngDraws: this.runRng.draws, hidden: this.hidden, items: [...this.items],
      joints: this.joints, rack_mm: this.rack_mm, foot_mm: this.foot_mm, levelPlacement: this.levelPlacement, marks: this.marks,
      stringLength_m: this.stringLength_m, masses: this.masses, mtRecorded_g: this.mtRecorded_g, lastForce: this.lastForce,
      cart: this.cart, runs: this.runs, stopwatch: sw.state, stops: sw.stops, table: this.table, forceCells: this.forceCells, events: this.events,
    })
  }
  /** Restore a snapshot (run variability continues exactly where it stopped). */
  load(s: ApparatusSnapshot): Result {
    if (!s || s.version !== 1) return this.refuse('load', 'badSnapshot')
    const c = structuredClone(s)
    this.hidden = { tableTilt_rad: c.hidden.tableTilt_rad, parts: c.hidden.parts }
    this.runRng = new CountedRng(c.seed, c.runRngDraws)
    this.items = new Set(c.items.filter((i): i is ItemId => (ITEM_IDS as readonly string[]).includes(i)))
    this.joints = c.joints
    this.rack_mm = c.rack_mm; this.foot_mm = c.foot_mm
    this.levelPlacement = c.levelPlacement; this.wasCentered = false
    this.marks = c.marks; this.stringLength_m = c.stringLength_m; this.masses = c.masses
    this.mtRecorded_g = c.mtRecorded_g; this.lastForce = c.lastForce
    this.cart = c.cart; this.runs = c.runs; this.trajectories.clear()
    this.sw.load(c.stopwatch, c.stops); this.table = c.table; this.forceCells = c.forceCells
    this.events = c.events; this.seq = c.events.length ? c.events[c.events.length - 1]!.seq : 0
    this.emit({ type: 'loaded' })
    return { ok: true }
  }
  /** Back to an empty bench (same seed, same hidden values), event log cleared. Listeners stay. */
  reset(): void {
    this.runRng = new CountedRng(this.seed)
    this.events = []; this.seq = 0
    this.items = new Set(); this.joints = freshJoints()
    this.rack_mm = 0; this.foot_mm = 0
    this.levelPlacement = null; this.wasCentered = false
    this.marks = { start_mm: null, end_mm: null }
    this.stringLength_m = STRING_DEFAULT_m
    this.masses = defaultMasses(); this.mtRecorded_g = null; this.lastForce = null
    this.cart = { placed: false, startRailPos_mm: null, released: false, runId: null }
    this.runs = []; this.trajectories.clear()
    this.sw.clear(); this.table = emptyTable(); this.forceCells = emptyForces()
  }
  /**
   * 'empty': nothing on the table. 'assembled': a careful student's bench built through the real actions: all required items
   * (no distractors), rail E1 in the stand clamp, receiver on E2, the receiver foot trimmed until the bubble is centred, marks at
   * 100 mm and 1000 mm, string cut to leave a 2 cm hang below the pulley, string tied and over the pulley, cart on the start
   * mark, four masses in the canister, Mt weighed and recorded.
   */
  preset(name: PresetId): Result {
    if (name !== 'empty' && name !== 'assembled') return this.refuse('preset', 'unknownPreset')
    this.reset()
    if (name === 'assembled') this.buildAssembled()
    this.emit({ type: 'presetApplied', preset: name })
    return { ok: true }
  }
  private buildAssembled(): void {
    for (const i of REQUIRED_ITEM_IDS) this.addItem(i)
    this.attach('standBase'); this.attach('rackClamp', { railEnd: 'E1' }); this.attach('receiver')
    this.placeLevel('rail')
    this.setFoot_mm(1000 * SUPPORT_SEPARATION_m * Math.sin(this.hidden.tableTilt_rad)) // asin((0 - f)/d) + tilt = 0
    this.placeLevel('table')
    this.placeMark('start', 100); this.placeMark('end', 1000)
    const sReceiver = this.stopFace_m() - 0.1
    this.setStringLength_m(sReceiver + 0.015 + 0.02)
    this.attach('stringCart'); this.attach('stringCanister'); this.attach('stringPulley')
    this.placeCart(100)
    this.setTrial(4)
    const w = this.weigh(['system'])
    if (w.ok) this.recordMt_g(Math.round(w.reading_kg * 10000) / 10)
  }
}

/** Convenience: new apparatus already set to a preset. */
export function createApparatus(preset: PresetId = 'empty', opts: ApparatusOptions = {}): Apparatus {
  const a = new Apparatus(opts)
  a.preset(preset)
  return a
}
