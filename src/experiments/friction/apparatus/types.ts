// Public types of the Practica 4 apparatus layer. Ids and enums only: no user-facing text (views translate them).
import type { DecimalInputReason } from '../../../core/instruments/numberInput.ts'
import type { StopRecord as CoreStopRecord, StopwatchSnapshot } from '../../../core/instruments/stopwatch.ts'
import type { ScaleReading, SpringScaleId } from '../../../core/instruments/springScale.ts'
import type { BarId, FaceId, HandParams, PullCommand, PullSummary } from '../physics/index.ts'
import type { ItemId } from './constants.ts'

export type { BarId, FaceId, ItemId, SpringScaleId }

export type PaperState = 'none' | 'loose' | 'fixed'
export type PresetId = 'empty' | 'exp12' | 'exp3' | 'loose'

export const REASONS = [
  'unknownItem', 'itemNotOnTable', 'itemAlreadyOnTable',
  'needBlock', 'needScale', 'needPaper', 'needBalance', 'needMasses', 'needFace', 'needTape', 'needStopwatch', 'needRail', 'needRack', 'needBar', 'needCourse',
  'unknownFace', 'unknownBar', 'unknownScale', 'badMassCount', 'badSpeed', 'badTarget',
  'pulling', 'notPulling', 'noReading', 'noStopwatchReading', 'stopwatchRunning',
  'raising', 'notRaising', 'stillRaising', 'courseTooLong', 'courseTooShort',
  'badCell', 'empty', 'notANumber', 'negative', 'tooLarge', 'tooManyDecimals',
  'unknownPreset', 'badSnapshot',
] as const
export type Reason = (typeof REASONS)[number]
export type TableInputReason = DecimalInputReason
export type Failure = { ok: false; reason: Reason; item?: ItemId }
export type Result<T extends object = object> = ({ ok: true } & T) | Failure

// ---- exps. 1 and 2 -------------------------------------------------------------------------------------------------------
/** Everything that decides a pull (chosen by the student), kept in the run so a table cell can show where its number came from. */
export interface PullSetup {
  face: FaceId
  addedMasses: number
  scale: SpringScaleId
  paper: PaperState
  /** Zero screw turned with the scale lying horizontally. */
  scaleZeroed: boolean
}

export interface PullRunRecord {
  id: number
  setup: PullSetup
  /** Hidden truth of the run: total sliding mass, coefficients of this trial, hand. */
  mass_kg: number
  mu_s: number
  mu_k: number
  hand: HandParams
  zeroError_N: number
  start_ms: number
  end_ms: number | null
  /** Speed commands (t_s counted from the start of the pull). */
  commands: PullCommand[]
}

export interface PullStatus {
  phase: 'idle' | 'pulling' | 'ended'
  runId: number | null
  /** Seconds since the start of the pull (frozen at the end). */
  t_s: number
  /** Needle, reading and flags for the true spring force now; null before the first pull. */
  scale: ScaleReading | null
  x_block_m: number
  x_pull_m: number
  v_block_mps: number
  sliding: boolean
  /** The block has gone off the end of the paper onto the bare table. */
  offPaper: boolean
}

export interface PullReference {
  runId: number
  /** True spring force F(t) sampled every REFERENCE_DT_s, as a force sensor would record it. */
  t_s: number[]
  F_N: number[]
  summary: PullSummary
  mu_s: number
  mu_k: number
  /** mu_k N and mu_s N of this trial, N. */
  Fk_N: number
  Fs_N: number
  setup: PullSetup
}

export interface ReadingRecord {
  value_N: number
  scale: SpringScaleId
  runId: number
  t_s: number
  overRange: boolean
  belowZero: boolean
}

// ---- exp. 3 ---------------------------------------------------------------------------------------------------------------
export interface InclineTrialRecord {
  id: number
  bar: BarId
  /** Hidden truth: this trial's coefficients and the real course length. */
  mu_s: number
  mu_k: number
  course_m: number
  h0_m: number
  start_ms: number
  end_ms: number | null
  /** Crank rate commands (t_s counted from the first turn). */
  segments: { t_s: number; rate_mps: number }[]
}

export interface InclineStatus {
  phase: 'idle' | 'raising' | 'holding' | 'sliding' | 'finished' | 'stopped'
  trialId: number | null
  /** True height of the rail underside at the clamp, m (the tape reads this to the mm when the crank is still). */
  h_m: number
  theta_rad: number
  /** Distance slid from the start mark, m. */
  s_m: number
  v_mps: number
  slipped: boolean
  /** The crank is turning now (a non-zero rate that is not stopped by the rack limit). */
  cranking: boolean
}

export interface InclineReference {
  trialId: number
  bar: BarId
  /** True h and time of the onset, true slide time over the course, mu_s and mu_k of the trial. */
  onsetH_m: number | null
  onsetTheta_rad: number | null
  slideTime_s: number | null
  mu_s: number
  mu_k: number
  course_m: number
}

export interface SlideCrossing { event: 'slip' | 'finish'; trueTime_s: number | null }
export type StopRecord = CoreStopRecord<SlideCrossing>

// ---- tables ---------------------------------------------------------------------------------------------------------------
export interface ForceCell {
  F_N: number | null
  /** Where it came from: the run and setup of the copied reading (null when typed). */
  runId: number | null
  setup: PullSetup | null
  overRange: boolean
}
export interface T43Cell {
  h_m: number | null
  t_s: number | null
  /** Trial the height / time came from (null when typed). */
  hTrialId: number | null
  tTrialId: number | null
  tStopId: number | null
}
export interface TableData {
  /** Tabla 4.1: [row][rep], row = face index * 4 + added masses / 50 g. */
  t41: ForceCell[][]
  /** Tabla 4.2: [face][rep]. */
  t42: ForceCell[][]
  /** Tabla 4.3: [bar][trial]. */
  t43: T43Cell[][]
}

// ---- events ---------------------------------------------------------------------------------------------------------------
export type ApparatusEventBody =
  | { type: 'itemAdded'; item: ItemId }
  | { type: 'itemRemoved'; item: ItemId }
  | { type: 'faceSet'; face: FaceId }
  | { type: 'massesSet'; count: number }
  | { type: 'scaleChosen'; scale: SpringScaleId }
  | { type: 'paperPlaced'; state: PaperState }
  | { type: 'scaleZeroed'; scale: SpringScaleId }
  | { type: 'weighed'; target: string; value_kg: number }
  | { type: 'pullStarted'; runId: number; speed_mps: number }
  | { type: 'pullSpeed'; runId: number; speed_mps: number }
  | { type: 'pullEnded'; runId: number }
  | { type: 'breakaway'; runId: number; t_s: number }
  | { type: 'offPaper'; runId: number }
  | { type: 'read'; runId: number; value_N: number; overRange: boolean }
  | { type: 'courseMarked'; course_m: number }
  | { type: 'barPlaced'; bar: BarId }
  | { type: 'raiseStarted'; trialId: number; rate_mps: number }
  | { type: 'raiseRate'; trialId: number; rate_mps: number }
  | { type: 'barSlips'; trialId: number; h_m: number }
  | { type: 'barFinished'; trialId: number }
  | { type: 'railLowered'; trialId: number | null }
  | { type: 'heightMeasured'; h_m: number }
  | { type: 'stopwatchStart' }
  | { type: 'stopwatchStop'; stopId: number; reading_s: number }
  | { type: 'stopwatchReset' }
  | { type: 'recorded'; table: '4.1' | '4.2' | '4.3'; row: number; col: number; value: number; source: 'typed' | 'copied' }
  | { type: 'cellCleared'; table: '4.1' | '4.2' | '4.3'; row: number; col: number }
  | { type: 'tableCleared' }
  | { type: 'refused'; action: string; reason: Reason }
  | { type: 'presetApplied'; preset: PresetId }
  | { type: 'loaded' }
export type ApparatusEvent = ApparatusEventBody & { seq: number; t_ms: number | null }

export interface ApparatusState {
  items: Record<ItemId, boolean>
  face: FaceId | null
  addedMasses: number
  scale: SpringScaleId | null
  paper: PaperState
  /** Zero screw turned horizontally, per scale. */
  zeroed: Record<SpringScaleId, boolean>
  /** Student's weighings (balance readings, kg): block and each silver mass tried. */
  measuredBlock_kg: number | null
  course_mark: boolean
  bar: BarId | null
  pulling: boolean
  raising: boolean
  stopwatch: { running: boolean }
}

export interface ProcedureSummary {
  /** Guide-listed items for each experiment are on the table. */
  itemsExp12: boolean
  itemsExp3: boolean
  /** Items the guide omits but the procedure needs are present (balance for exps. 1 and 2; stand, base and stopwatch for exp. 3). */
  unlistedNeededPresent: boolean
  blockWeighed: boolean
  paperFixed: boolean
  scaleZeroed: boolean
  courseMarked: boolean
  pullsCount: number
  trialsCount: number
  filled: { t41: number; t42: number; t43: number }
  complete: { t41: boolean; t42: boolean; t43: boolean }
}

export interface ApparatusSnapshot {
  version: 1
  seed: number
  runRngDraws: number
  readRngDraws: number
  hidden: { block_kg: number; masses_kg: number[] }
  items: ItemId[]
  face: FaceId | null
  addedMasses: number
  scale: SpringScaleId | null
  paper: PaperState
  zeroed: Record<SpringScaleId, boolean>
  measuredBlock_kg: number | null
  course_true_m: number | null
  bar: BarId | null
  rackH_m: number
  pullRuns: PullRunRecord[]
  activePull: number | null
  trials: InclineTrialRecord[]
  activeTrial: number | null
  lastReading: ReadingRecord | null
  lastHeight_m: number | null
  clock_ms: number
  stopwatch: StopwatchSnapshot
  stops: StopRecord[]
  tables: TableData
  events: ApparatusEvent[]
}
