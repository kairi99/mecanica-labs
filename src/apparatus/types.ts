// Public types of the apparatus layer. Ids and enums only: no user-facing text (views translate them).
import type { MarksEvaluation } from './markers.ts'
import type { RailPose, Vec3 } from './geometry.ts'

export const ITEM_IDS = [
  'rail', 'cart', 'rackStand', 'standBase', 'twoLegStand', 'receiver', 'screws', 'level', 'stopwatch', 'tape', 'markers',
] as const
export type ItemId = (typeof ITEM_IDS)[number]

/** Joints (attachments). standBase: rack stand on its base. Others fasten a rail end with 2 screws each. */
export const JOINT_IDS = ['standBase', 'rackClamp', 'twoLegStand', 'receiver'] as const
export type JointId = (typeof JOINT_IDS)[number]
/** Rail ends as printed: the scale 0 mm is at E1 and 1200 mm at E2. */
export type RailEnd = 'E1' | 'E2'
export type LevelPlacement = 'rail' | 'table' | null
export type PresetId = 'empty' | 'assembled'

export type Reason =
  | 'unknownItem' | 'itemNotOnTable' | 'itemAlreadyOnTable' | 'screwsInUse'
  | 'needStandBase' | 'needRackClamp' | 'alreadyAttached' | 'notAttached' | 'noScrews' | 'railEndRequired'
  | 'outOfRange' | 'notFinite'
  | 'levelNeedsRail'
  | 'railNotAssembled' | 'noRail' | 'noCart' | 'cartOffRail' | 'cartNotAtStart' | 'cartMoving' | 'noStartPosition'
  | 'noReceiver' | 'railNotSupported' | 'cartNotPlaced'
  | 'notMeasurable'
  | 'outOfRail' | 'duplicateMark' | 'tooManyMarks' | 'unknownMark'
  | 'stopwatchRunning' | 'noStopwatchReading' | 'badCell'
  | 'empty' | 'notANumber' | 'negative' | 'tooLarge' | 'tooManyDecimals'
  | 'unknownPreset' | 'badSnapshot'

export type Failure = { ok: false; reason: Reason; item?: ItemId }
export type Result<T extends object = object> = ({ ok: true } & T) | Failure

/** Reasons that block releasing the cart (subset of Reason). */
export type RunBlock = 'noRail' | 'railNotSupported' | 'noReceiver' | 'cartNotPlaced'
export interface CanRun { ok: boolean; reasons: RunBlock[] }

export type MissingReason = 'notOnTable' | 'needsStandBase' | 'needsRackClamp' | 'notAttached'
export interface MissingEntry {
  kind: 'item' | 'joint'
  id: ItemId | JointId
  reason: MissingReason
  /** True when the cart cannot run safely without it. */
  blocksRun: boolean
}

// ---- Events ------------------------------------------------------------------------------------------------------
export type TapeTarget =
  | { kind: 'railHeight'; at: 'clamp' | 'twoLeg' | { railPos_mm: number } }
  | { kind: 'cartLength' }
  /** Separation d of the two supports, measured along the rail. */
  | { kind: 'supportSeparation' }

export type ApparatusEventBody =
  | { type: 'itemAdded'; item: ItemId }
  | { type: 'itemRemoved'; item: ItemId }
  | { type: 'attached'; joint: JointId; railEnd?: RailEnd }
  | { type: 'detached'; joint: JointId }
  | { type: 'levelPlaced'; placement: LevelPlacement }
  | { type: 'leveled'; bubble_mm: number }
  | { type: 'heightSet'; which: 'rack' | 'foot'; value_mm: number }
  | { type: 'measuredHeight'; target: TapeTarget; value_m: number }
  | { type: 'markPlaced'; markId: string; railPos_mm: number }
  | { type: 'markMoved'; markId: string; railPos_mm: number }
  | { type: 'markRemoved'; markId: string }
  | { type: 'cartPlaced'; front_railPos_mm: number }
  | { type: 'cartReset'; front_railPos_mm: number }
  | { type: 'released'; runId: number }
  | { type: 'stopwatchStart'; linked: boolean }
  | { type: 'stopwatchStop'; stopId: number; reading_s: number }
  | { type: 'stopwatchReset' }
  | { type: 'recorded'; row: number; col: number; value_s: number; source: 'typed' | 'copied'; runId: number | null }
  | { type: 'cellCleared'; row: number; col: number }
  | { type: 'tableCleared' }
  | { type: 'linkStartToRelease'; on: boolean }
  | { type: 'refused'; action: string; reason: Reason }
  | { type: 'presetApplied'; preset: PresetId }
  | { type: 'loaded' }
export type ApparatusEvent = ApparatusEventBody & { seq: number; t_ms: number | null }

// ---- State -------------------------------------------------------------------------------------------------------
export interface MarkerState { id: string; railPos_mm: number }

export interface RailGeometry {
  /** Rack-stand clamp is on a rail end. */
  mounted: boolean
  /** Both supports hold the rail (clamp and two-leg stand). */
  supportedBothEnds: boolean
  highEnd: RailEnd | null
  /** True when the printed 0 mm is at the high end (the guide's wish). null while the orientation is undecided. */
  scaleZeroAtHighEnd: boolean | null
  separation_m: number
  /** Rail top-surface height above the table at the clamp / at the two-leg stand, m. */
  clampHeight_m: number
  twoLegHeight_m: number
  /** Geometric angle from the two heights (table tilt excluded), rad. */
  railAngle_rad: number
  /** True incline angle of the rail to the horizontal, rad = railAngle + hidden table tilt. THE angle the cart feels. */
  theta_rad: number
  /** Pose in the world frame (table frame). */
  pose: RailPose
}

export interface LevelReading {
  placement: LevelPlacement
  /** Bubble displacement from the vial centre, mm (positive toward the high end); null when the level is not placed. */
  bubble_mm: number | null
  saturated: boolean
  centered: boolean
}

export interface TapeReading {
  /** True length being measured, m (where the blade edge meets the object). The student reads it off the blade. */
  trueLength_m: number
  /** Blade geometry for the view to draw (the student reads it; no numeric value is shown to the student). */
  tape: import('./geometry.ts').TapeGeometry
  /** Class II maximum permissible error of the tape at this length, m. Reported, not applied (see PARAMETERS.md). */
  mpe_m: number
}

export interface CartStatus {
  phase: 'unplaced' | 'atStart' | 'rolling' | 'stopped' | 'stuck'
  runId: number | null
  /** Seconds since release, 0 before. */
  t_s: number
  /** Cart front on the printed rail scale, mm. null if unplaced. */
  frontRailPos_mm: number | null
  rearRailPos_mm: number | null
  /** Front, down-slope distance from the high rail end, m. */
  frontDownSlope_m: number | null
  /** Displacement from the placed start (down-slope positive), m. */
  s_m: number
  /** Velocity down-slope, m/s (positive down the slope). */
  v_mps: number
}

export interface CartPose {
  front: Vec3
  rear: Vec3
  direction: Vec3
  normal: Vec3
}

export interface CrossingRecord { markId: string; railPos_mm: number; trueTime_s: number | null }

export interface RunRecord {
  id: number
  releaseTime_ms: number
  scaleZeroAtHighEnd: boolean
  startRailPos_mm: number
  theta_rad: number
  /** Sampled per-run conditions (physics/variability.ts). */
  conditions: { releaseOffset_m: number; v0_mps: number; c_rr: number }
  /** Receiver stop position as printed-scale mm, and the time the front hits it (null if never). */
  stopRailPos_mm: number
  tStop_s: number | null
  /** True crossing time of every mark, s from release, ordered from the top of the slope. null: behind, beyond the stop, never reached. */
  marks: CrossingRecord[]
  endedBy: 'reset' | 'placed' | null
}

export interface DigicartRecord {
  runId: number
  releaseTime_ms: number
  sampleRate_Hz: number
  resolution_m: number
  /** Sample times from release, s; displacement from the release point, m. */
  t_s: number[]
  x_m: number[]
  marks: CrossingRecord[]
}

export interface StopwatchState {
  running: boolean
  linkStartToRelease: boolean
}

export interface StopRecord {
  id: number
  /** Run current at the stop (last released), or null. */
  runId: number | null
  /** Table row (0..9) the student was timing, if said. */
  markTarget: number | null
  /** Display at the stop, s (floor to 0.01 s). */
  reading_s: number
  startTime_ms: number
  stopTime_ms: number
  /** Stopwatch first start minus release, s (positive: late). null without a run. */
  startOffset_s: number | null
  stopOffset_s: number | null
  /** True crossing times of the run's marks (what a perfect timer would show). */
  crossings: CrossingRecord[]
}

export interface TableCell { value_s: number | null; runId: number | null; stopId: number | null }
export interface TableData {
  positions_cm: readonly number[]
  /** [row][col], null for empty cells. */
  values_s: (number | null)[][]
  cells: TableCell[][]
}

export interface ProcedureSummary {
  itemsComplete: boolean
  setupComplete: boolean
  canRun: boolean
  scaleZeroAtHighEnd: boolean | null
  /** Scale 0 at the top as the guide asks. */
  scaleOk: boolean
  /** Rail was leveled with the level on it while the rack stand read 0 mm. */
  levelledBeforeRaise: boolean
  theta_rad: number | null
  /** theta - 1.30 deg, rad. */
  angleError_rad: number | null
  angleOk: boolean
  heightsMeasured: { clamp: boolean; twoLeg: boolean; separation: boolean }
  marks: MarksEvaluation
  marksOk: boolean
  cart: { onRail: boolean; atZero: boolean }
  runsCount: number
  stopsCount: number
  /** Non-empty cells per table row. */
  recordsPerPosition: number[]
  tableFilled: number
  tableComplete: boolean
}

export interface ApparatusState {
  items: Record<ItemId, boolean>
  joints: { standBase: boolean; rackClamp: RailEnd | null; twoLegStand: boolean; receiver: boolean }
  screwsUsed: number
  screwsAvailable: number
  /** Rack scale reading (clamp height above its lowest position), mm, integer. */
  rack_mm: number
  /** Two-leg screw foot offset, mm. */
  foot_mm: number
  level: { placement: LevelPlacement }
  markers: MarkerState[]
  cart: { placed: boolean; startRailPos_mm: number | null; released: boolean; runId: number | null }
  stopwatch: StopwatchState
  geometry: RailGeometry | null
}

export interface ApparatusSnapshot {
  version: 1
  seed: number
  runRngDraws: number
  hidden: { tableTilt_rad: number }
  items: ItemId[]
  joints: { standBase: boolean; rackClamp: RailEnd | null; twoLegStand: boolean; receiver: boolean }
  rack_mm: number
  foot_mm: number
  levelPlacement: LevelPlacement
  levelledAtBase: boolean
  measured: { clamp: boolean; twoLeg: boolean; separation: boolean }
  markers: MarkerState[]
  nextMarkerId: number
  cart: { placed: boolean; startRailPos_mm: number | null; released: boolean; runId: number | null }
  runs: RunRecord[]
  stopwatch: {
    running: boolean; linkStartToRelease: boolean; accumulated_ms: number; runningSince_ms: number | null
    firstStart_ms: number | null; lastStopId: number | null
  }
  stops: StopRecord[]
  table: TableCell[][]
  events: ApparatusEvent[]
}
