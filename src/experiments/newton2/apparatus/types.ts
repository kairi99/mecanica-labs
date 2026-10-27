// Public types of the Practica 3 apparatus layer. Ids and enums only: no user-facing text (views translate them).
import type { StopRecord as CoreStopRecord } from '../../../core/instruments/stopwatch.ts'
import type { MassLocation } from '../physics/index.ts'

/** Required items first, then the distractors (marble, 50 g mass, two-leg stand: not needed for this practice). */
export const REQUIRED_ITEM_IDS = [
  'rail', 'cart', 'rackStand', 'standBase', 'receiver', 'screws', 'level', 'string', 'canister', 'brassScrew', 'plasticScrews',
  'masses', 'balance', 'dynamometer', 'stopwatch', 'markers',
] as const
export const DISTRACTOR_ITEM_IDS = ['mass50', 'marble', 'twoLegStand'] as const
export const ITEM_IDS = [...REQUIRED_ITEM_IDS, ...DISTRACTOR_ITEM_IDS] as const
export type ItemId = (typeof ITEM_IDS)[number]

/**
 * Joints. standBase: rack stand on its base. rackClamp: a rail end in the clamp (2 screws). receiver: the other end (2 screws).
 * stringCart: string fixed to the cart with the brass screw. stringCanister: string tied to the canister.
 * stringPulley: string laid over the receiver's pulley.
 */
export const JOINT_IDS = ['standBase', 'rackClamp', 'receiver', 'stringCart', 'stringCanister', 'stringPulley'] as const
export type JointId = (typeof JOINT_IDS)[number]
export type RailEnd = 'E1' | 'E2'
export type LevelPlacement = 'rail' | 'table' | null
export type PresetId = 'empty' | 'assembled'
export type MarkKind = 'start' | 'end'

export type Reason =
  | 'unknownItem' | 'itemNotOnTable' | 'itemAlreadyOnTable' | 'screwsInUse'
  | 'needStandBase' | 'needRackClamp' | 'needReceiver' | 'alreadyAttached' | 'notAttached' | 'noScrews' | 'railEndRequired'
  | 'outOfRange' | 'notFinite' | 'levelNeedsRail'
  | 'railNotAssembled' | 'noRail' | 'noCart' | 'cartOffRail' | 'cartNotAtStart' | 'cartMoving' | 'noStartPosition'
  | 'noReceiver' | 'railNotSupported' | 'cartNotPlaced'
  | 'outOfRail' | 'badMass' | 'noPlasticScrews' | 'canisterNeeded' | 'nothingToWeigh' | 'overload' | 'noForceReading'
  | 'stopwatchRunning' | 'noStopwatchReading' | 'badCell'
  | 'empty' | 'notANumber' | 'negative' | 'tooLarge' | 'tooManyDecimals'
  | 'unknownPreset' | 'badSnapshot'

export type Failure = { ok: false; reason: Reason; item?: ItemId }
export type Result<T extends object = object> = ({ ok: true } & T) | Failure

export type RunBlock = 'noRail' | 'railNotSupported' | 'noReceiver' | 'cartNotPlaced'
export interface CanRun { ok: boolean; reasons: RunBlock[] }

export type MissingReason = 'notOnTable' | 'needsStandBase' | 'needsRackClamp' | 'needsReceiver' | 'notAttached'
export interface MissingEntry {
  kind: 'item' | 'joint'
  id: ItemId | JointId
  reason: MissingReason
  blocksRun: boolean
}

/** Things you can put on the balance. `mass0`..`mass3` are the four 10 g masses. */
export type WeighTarget =
  | 'cart' | 'brassScrew' | 'plasticScrew' | 'canister' | 'mass0' | 'mass1' | 'mass2' | 'mass3' | 'mass50' | 'marble'
  /** Everything of the experiment at once: cart with its load plus canister with its masses (guide step 1, plus any plastic screws already on the cart). */
  | 'system'

/** A force reading of the hanging canister. Local interface of phase 1; TODO phase 2: replaced by the core spring scale. */
export interface ForceReading {
  /** What the instrument shows, N (quantised). */
  reading_N: number
  resolution_N: number
  /** Type B standard uncertainty, N: resolution / sqrt(12). */
  uB_N: number
  /** Masses that were in the canister at the reading. */
  massesInCanister: number
}

// ---- Events ------------------------------------------------------------------------------------------------------
export type ApparatusEventBody =
  | { type: 'itemAdded'; item: ItemId }
  | { type: 'itemRemoved'; item: ItemId }
  | { type: 'attached'; joint: JointId; railEnd?: RailEnd }
  | { type: 'detached'; joint: JointId }
  | { type: 'levelPlaced'; placement: LevelPlacement }
  | { type: 'leveled'; bubble_mm: number }
  | { type: 'heightSet'; which: 'rack' | 'foot'; value_mm: number }
  | { type: 'markPlaced'; mark: MarkKind; railPos_mm: number }
  | { type: 'markRemoved'; mark: MarkKind }
  | { type: 'stringLengthSet'; length_m: number }
  | { type: 'massMoved'; index: number; to: MassLocation }
  | { type: 'weighed'; targets: WeighTarget[]; reading_kg: number }
  | { type: 'massRecorded'; value_g: number }
  | { type: 'forceRead'; reading_N: number; massesInCanister: number }
  | { type: 'cartPlaced'; front_railPos_mm: number }
  | { type: 'cartReset'; front_railPos_mm: number }
  | { type: 'released'; runId: number; outcome: RunOutcome }
  | { type: 'stopwatchStart'; linked: boolean }
  | { type: 'stopwatchStop'; stopId: number; reading_s: number }
  | { type: 'stopwatchReset' }
  | { type: 'recorded'; row: number; col: number; value_s: number; source: 'typed' | 'copied'; runId: number | null }
  | { type: 'forceRecorded'; row: number; value_N: number; source: 'typed' | 'copied' }
  | { type: 'cellCleared'; row: number; col: number }
  | { type: 'forceCleared'; row: number }
  | { type: 'tableCleared' }
  | { type: 'linkStartToRelease'; on: boolean }
  | { type: 'refused'; action: string; reason: Reason }
  | { type: 'presetApplied'; preset: PresetId }
  | { type: 'loaded' }
export type ApparatusEvent = ApparatusEventBody & { seq: number; t_ms: number | null }

// ---- Runs ---------------------------------------------------------------------------------------------------------
/**
 * What happened physically. ok: the cart covered the marked distance under the pull of the canister.
 * stringNotAttached: no brass screw / no tie: nothing pulls the cart. stringTooShort: the string does not reach the pulley
 * from the start mark, the canister is held at the pulley and the cart cannot be released from there.
 * neverStarts: the pull cannot overcome static friction. receiverBlocks: the cart front hits the receiver before the end mark.
 * canisterHitsFloor: the canister met the floor before the end mark, the cart coasted on (and slowed) to the end mark.
 * canisterHitsFloorCartStops: same, and the cart came to rest before the end mark.
 */
export type RunOutcome =
  | 'ok' | 'stringNotAttached' | 'stringTooShort' | 'neverStarts' | 'receiverBlocks' | 'canisterHitsFloor' | 'canisterHitsFloorCartStops'

export interface CrossingRecord { markId: 'end'; railPos_mm: number | null; trueTime_s: number | null }

export interface RunRecord {
  id: number
  releaseTime_ms: number
  /** Masses in the canister at the release, and where each of the four sat. */
  massesInCanister: number
  locations: MassLocation[]
  startRailPos_mm: number
  standEnd: RailEnd
  tilt_rad: number
  /** Sampled per-run conditions (physics/variability.ts). */
  conditions: { releaseOffset_m: number; v0_mps: number; c_rr: number; F_pulley_N: number }
  /** Frozen physics inputs of the run (plain data: the trajectory is rebuilt from them after a load). */
  params: import('../physics/index.ts').Newton2Params
  geo: import('../physics/index.ts').RunGeometry
  /** Cart travel from the release to the end mark, m (null: no end mark placed behind the cart). */
  sEnd_m: number | null
  /** Total mass of cart side plus canister at the release, kg (truth, for the teacher key). */
  totalMass_kg: number
  outcome: RunOutcome
  /** True time from release to the cart front reaching the end mark, s; null if it never does. */
  tEnd_s: number | null
  tFloor_s: number | null
  tReceiver_s: number | null
  endedBy: 'reset' | 'placed' | null
}

export interface CartStatus {
  phase: 'unplaced' | 'atStart' | 'rolling' | 'coasting' | 'stopped' | 'stuck'
  runId: number | null
  t_s: number
  /** Cart front on the printed rail scale, mm. null if unplaced. */
  frontRailPos_mm: number | null
  /** Travel from the start, m, and speed toward the receiver, m/s. */
  s_m: number
  v_mps: number
  /** Canister drop since the release, m, and whether it sits on the floor (string slack). */
  canisterDrop_m: number
  canisterOnFloor: boolean
}

/** The DigiCart's own record of a run: x(t) at 50 Hz (1 mm) from release. Views may hide it (`?reference=0`). */
export interface DigicartRecord {
  runId: number
  releaseTime_ms: number
  sampleRate_Hz: number
  resolution_m: number
  t_s: number[]
  x_m: number[]
  tEnd_s: number | null
  tFloor_s: number | null
}

export type StopRecord = CoreStopRecord<CrossingRecord>

export interface TableCell { value_s: number | null; runId: number | null; stopId: number | null }
export interface ForceCell { value_N: number | null; source: 'typed' | 'copied' | null }
export interface TableData {
  /** Masses in the canister of each trial row: 4, 3, 2, 1, 0 (the last row is optional). */
  trialMasses: readonly number[]
  forces_N: (number | null)[]
  /** [row][col], null for empty cells. */
  values_s: (number | null)[][]
  cells: TableCell[][]
  forceCells: ForceCell[]
}

export interface RailGeometry {
  highEnd: RailEnd
  /** Rail end at the stand (the cart starts near it). */
  standEnd: RailEnd
  standHeight_m: number
  receiverHeight_m: number
  /** True tilt of the rail, rad; positive: slopes down toward the receiver. THE angle the cart feels. */
  tilt_rad: number
}

export interface LevelReading {
  placement: LevelPlacement
  bubble_mm: number | null
  saturated: boolean
  centered: boolean
}

export interface MarkState { start_mm: number | null; end_mm: number | null }

export interface ProcedureSummary {
  itemsComplete: boolean
  setupComplete: boolean
  canRun: boolean
  /** Rail level: the bubble reads centred with the level on the rail. */
  levelled: boolean
  tilt_rad: number | null
  marksPlaced: boolean
  /** Distance between the marks within tolerance of 90 cm. */
  distanceOk: boolean
  distance_m: number | null
  cartAtStart: boolean
  stringConnected: boolean
  /** Masses in the canister now, on the cart, left on the bench. */
  massesIn: { canister: number; cart: number; bench: number }
  /** True when no mass is on the bench: the guide's trials keep the total mass constant. */
  massKept: boolean
  mtRecorded_kg: number | null
  runsCount: number
  stopsCount: number
  outcomes: Partial<Record<RunOutcome, number>>
  /** Non-empty time cells per trial row; forces typed per row. */
  recordsPerRow: number[]
  forcesRecorded: number
  tableFilled: number
  /** The four guide rows (4, 3, 2, 1) each have a force and 10 times. */
  tableComplete: boolean
}

export interface ApparatusState {
  items: Record<ItemId, boolean>
  joints: { standBase: boolean; rackClamp: RailEnd | null; receiver: boolean; stringCart: boolean; stringCanister: boolean; stringPulley: boolean }
  screwsUsed: number
  screwsAvailable: number
  rack_mm: number
  foot_mm: number
  level: { placement: LevelPlacement }
  marks: MarkState
  stringLength_m: number
  masses: MassLocation[]
  plasticScrewsUsed: number
  cart: { placed: boolean; startRailPos_mm: number | null; released: boolean; runId: number | null }
  stopwatch: { running: boolean; linkStartToRelease: boolean }
  geometry: RailGeometry | null
}

export interface ApparatusSnapshot {
  version: 1
  seed: number
  runRngDraws: number
  hidden: { tableTilt_rad: number; parts: import('../physics/index.ts').PartMasses }
  items: ItemId[]
  joints: ApparatusState['joints']
  rack_mm: number
  foot_mm: number
  levelPlacement: LevelPlacement
  marks: MarkState
  stringLength_m: number
  masses: MassLocation[]
  mtRecorded_g: number | null
  lastForce: ForceReading | null
  cart: ApparatusState['cart']
  runs: RunRecord[]
  stopwatch: {
    running: boolean; linkStartToRelease: boolean; accumulated_ms: number; runningSince_ms: number | null
    firstStart_ms: number | null; lastStopId: number | null
  }
  stops: StopRecord[]
  table: TableCell[][]
  forceCells: ForceCell[]
  events: ApparatusEvent[]
}
