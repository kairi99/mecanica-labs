// Public types of the Practica 2 apparatus layer. Ids and enums only: no user-facing text (views translate them).
import type { StopRecord as CoreStopRecord } from '../../../core/instruments/stopwatch.ts'
import type { DecimalInputReason } from '../../../core/instruments/numberInput.ts'
import type { PaperOrientation, RailGeometry, SheetPose, TapeGeometry, Vec3 } from './geometry.ts'
import type { BallId, FlightSummary, LaunchKindSummary, LaunchOutcome, RunOffsets } from './model.ts'

export type { BallId, PaperOrientation, SheetPose, Vec3 }

export const ITEM_IDS = [
  'rail', 'rackStand', 'base', 'twoLeg', 'screws', 'level', 'marble', 'pingPong', 'tapeMeasure', 'stopwatch', 'bondPaper', 'carbonPaper',
] as const
export type ItemId = (typeof ITEM_IDS)[number]
/** Inventory item that is each ball. */
export const BALL_ITEM: Readonly<Record<BallId, ItemId>> = { marble: 'marble', pingpong: 'pingPong' }

/** Joints: the rack stand on its base, the rail in the rack-stand clamp (high end), the rail on the two-leg stand (near the low end). */
export const JOINT_IDS = ['standBase', 'rackClamp', 'twoLegStand'] as const
export type JointId = (typeof JOINT_IDS)[number]
export type LevelPlacement = 'rail' | 'table' | null
export type PresetId = 'empty' | 'assembled'

/** Every refusal code. Each needs an es/en string in the views; a test lists them. */
export const REASONS = [
  'unknownItem', 'itemNotOnTable', 'itemAlreadyOnTable', 'screwsInUse',
  'needStandBase', 'needRackClamp', 'alreadyAttached', 'notAttached', 'noScrews',
  'outOfRange', 'notFinite', 'badCell',
  'levelNeedsRail',
  'noRail', 'tipOverhangsEdge',
  'outOfRail', 'duplicateMark', 'tooManyMarks', 'unknownMark',
  'unknownBall', 'noBallSelected', 'noBallPlaced', 'ballOffRail', 'ballMoving',
  'needBondPaper', 'carbonNotOverBond', 'noSheetsLeft', 'noPaperPlaced',
  'notMeasurable', 'noEdgeProjection', 'unknownCarbonMark',
  'stopwatchRunning', 'noStopwatchReading', 'noTapeReading',
  'empty', 'notANumber', 'negative', 'tooLarge', 'tooManyDecimals',
  'unknownPreset', 'badSnapshot',
] as const
export type Reason = (typeof REASONS)[number]
/** Typed table input errors are a subset of Reason. */
export type TableInputReason = DecimalInputReason

export type Failure = { ok: false; reason: Reason; item?: ItemId }
export type Result<T extends object = object> = ({ ok: true } & T) | Failure

/** Reasons that block releasing the ball. */
export const RUN_BLOCKS = ['noRail', 'noBallSelected', 'noBallPlaced', 'ballMoving'] as const
export type RunBlock = (typeof RUN_BLOCKS)[number]
export interface CanRelease { ok: boolean; reasons: RunBlock[] }

export type MissingReason = 'notOnTable' | 'needsStandBase' | 'needsRackClamp' | 'notAttached'
export interface MissingEntry { kind: 'item' | 'joint'; id: ItemId | JointId; reason: MissingReason; blocksRun: boolean }

/** What the carbon paper did with a landing (a run-level code; needs es/en strings too). */
export const MARK_RESULTS = ['marked', 'noBond', 'noCarbon', 'offPaper', 'tooFaint', 'noLanding'] as const
export type MarkResult = (typeof MARK_RESULTS)[number]

// ---- Tape measure ------------------------------------------------------------------------------------------------
export type TapeTarget =
  /** Floor to table top (guide step 9). */
  | { kind: 'launchHeight' }
  /** From the student's edge-projection point on the floor to the centre of a carbon mark (straight tape on the floor). */
  | { kind: 'range'; carbonId: string }
  /** Rail low tip to the table edge. */
  | { kind: 'gap' }
  /** Table top to the rail top surface at the high support (rack-stand clamp). */
  | { kind: 'rise' }
  /** Along the rail from the low tip to a rail mark. */
  | { kind: 'markPosition'; markId: string }

export interface TapeReading {
  /** True length being measured, m (where the blade edge meets the object). The student reads it off the blade. */
  trueLength_m: number
  tape: TapeGeometry
  /** Class II maximum permissible error of the tape at this length, m. Reported, not applied (see PARAMETERS.md). */
  mpe_m: number
  /** For 'range': the Euclidean floor distance split into the part along the launch direction and the lateral part, m. */
  range?: { alongX_m: number; lateral_m: number; carbonId: string; runId: number }
}

// ---- Events ------------------------------------------------------------------------------------------------------
export type ApparatusEventBody =
  | { type: 'itemAdded'; item: ItemId }
  | { type: 'itemRemoved'; item: ItemId }
  | { type: 'attached'; joint: JointId }
  | { type: 'detached'; joint: JointId }
  | { type: 'levelPlaced'; placement: LevelPlacement }
  | { type: 'leveled'; bubble_mm: number }
  | { type: 'heightSet'; which: 'rack' | 'leg' | 'foot'; value_mm: number }
  | { type: 'gapSet'; gap_mm: number }
  | { type: 'measured'; target: TapeTarget; value_m: number }
  | { type: 'markPlaced'; markId: string; s_m: number }
  | { type: 'markMoved'; markId: string; s_m: number }
  | { type: 'markRemoved'; markId: string }
  | { type: 'ballSelected'; ball: BallId }
  | { type: 'ballPlaced'; ball: BallId; s_m: number; markId: string | null }
  | { type: 'ballReset'; ball: BallId }
  | { type: 'bondPlaced'; moved: boolean }
  | { type: 'bondRemoved' }
  | { type: 'bondSheetReplaced'; sheetsUsed: number }
  | { type: 'carbonPlaced' }
  | { type: 'carbonRemoved' }
  | { type: 'edgeProjectionPlaced' }
  | { type: 'released'; runId: number; ball: BallId }
  | { type: 'ballStopped'; runId: number; outcome: LaunchOutcome }
  | { type: 'ballLanded'; runId: number; mark: MarkResult }
  | { type: 'stopwatchStart' }
  | { type: 'stopwatchStop'; stopId: number; reading_s: number }
  | { type: 'stopwatchReset' }
  /** `runId`: the launch a copied stop or range came from (null when typed or when the stop had no run). */
  | { type: 'recorded'; ball: BallId; trial: number; rep: number; column: 'time' | 'range'; value: number; source: 'typed' | 'copied'; runId: number | null }
  | { type: 'cellCleared'; ball: BallId; trial: number; rep: number }
  | { type: 'tableCleared'; ball: BallId | 'all' }
  | { type: 'refused'; action: string; reason: Reason }
  | { type: 'presetApplied'; preset: PresetId }
  | { type: 'loaded' }
export type ApparatusEvent = ApparatusEventBody & { seq: number; t_ms: number | null }

// ---- State -------------------------------------------------------------------------------------------------------
/** A tape-measured mark on the rail, s_m from the low tip. `s_m` is where the student aimed (snapped to 0.5 mm); the true position differs by the placement error and is only measurable. */
export interface RailMark { id: string; s_m: number }

export interface MarksEvaluation {
  count: number
  /** Aimed positions, ascending, m from the low tip. */
  positions_m: number[]
  fiveMarks: boolean
  upperHalfCount: number
  /** Every mark is in the upper half of the track (s >= 0.60 m) and there is at least one: the guide's wish. */
  marksInUpperHalf: boolean
}

/** Mark left by the ball on the bond paper. Stored in the sheet's own frame so it travels with the paper. */
export interface PaperMark {
  id: string
  runId: number
  ball: BallId
  /** Position from the sheet centre: along the long side / along the short side, m. */
  a_m: number
  b_m: number
  diameter_m: number
  darkness: number
  /** Landing instant, ms on the caller's clock: the mark exists on the paper from then on. */
  visibleFrom_ms: number
}

export interface PaperState {
  bond: SheetPose | null
  carbon: SheetPose | null
  /** Bond sheets laid down so far (0..2). */
  sheetsUsed: number
  sheetsAvailable: number
  /** The bond paper was moved or turned while it carried marks (they no longer match the edge projection). */
  paperMovedSinceMarks: boolean
  marks: PaperMark[]
}

export interface LevelReading {
  placement: LevelPlacement
  /** Bubble displacement from the vial centre, mm; null when the level is not placed. */
  bubble_mm: number | null
  saturated: boolean
  centered: boolean
}

export interface BallStatus {
  phase: 'unplaced' | 'idle' | 'rolling' | 'flying' | 'landed' | 'stopped' | 'rolledOver'
  runId: number | null
  ball: BallId | null
  /** Seconds since release, 0 before. */
  t_s: number
  /** Centre of the ball in the launch frame with y above the FLOOR; null when unplaced. */
  pos: Vec3 | null
  /** While on the rail: distance from the low tip, m. */
  onRail_s_m: number | null
  /** Landed and come to rest on the floor (or on the paper): it stays there, visible, until the student returns the ball. */
  atRest?: boolean
}

export interface RunTimes {
  /** From the release instant, s: ball at the rail tip (null: never), at the table edge (launch t0), at landing; end = when it stops moving. */
  tip_s: number | null
  edge_s: number | null
  land_s: number | null
  end_s: number
}

export interface RunRecord {
  id: number
  ball: BallId
  /** Rail mark the ball was released from, if it was placed by mark. */
  markId: string | null
  /** True position of the ball before the run's release offset, m from the low tip. */
  startS_m: number
  /** Release position after the run's offset, m from the low tip. */
  releaseS_m: number
  releaseTime_ms: number
  /** The bench at release (enough to regenerate the trajectory from `offsets`). */
  bench: { rise_m: number; gap_m: number; lipGap_m: number; shoe: { length_m: number; slope_rad: number }; H_m: number; stepDrop_m: number; roll_rad: number }
  /** Offsets drawn for this run; lateralAngle_rad already includes the rail-roll drift. */
  offsets: RunOffsets
  outcome: LaunchOutcome | 'notStarted'
  theta_rad: number
  a_incline_mps2: number
  v_roll_mps: number
  v_edge_mps: number
  tableDecel_mps2: number
  times: RunTimes
  flight: FlightSummary | null
  /** Launch at the edge crossing (hops, angle, kind); null if the ball did not fly. */
  launch: LaunchKindSummary | null
  /** Bounces between the rail end and the edge. */
  tableHops: number
  bounce: { vUp_mps: number; tNext_s: number } | null
  mark: { result: MarkResult; carbonId: string | null }
  /** Video frame phase, frames: the first slow-mo frame at/after the edge is this fraction of a frame late. */
  videoPhase: number
}

/** True event times of a run (what a perfect timer would show); attached to every stop press. */
export interface EventRecord { event: 'tip' | 'edge' | 'landing'; trueTime_s: number | null }
export type StopRecord = CoreStopRecord<EventRecord>

export interface StopwatchState { running: boolean }

// ---- Tabla 2.1 ---------------------------------------------------------------------------------------------------
export interface TableRep {
  t_s: number | null
  x_m: number | null
  /** Provenance of the time: run and stop it was copied from (null when typed). */
  timeRunId: number | null
  timeStopId: number | null
  /** Provenance of the range: carbon mark and run it was copied from (null when typed). */
  rangeCarbonId: string | null
  rangeRunId: number | null
}
/** [trial][rep] for one ball. */
export type BallTable = TableRep[][]
export interface TableData {
  ball: BallId
  trials: number
  reps: number
  t_s: (number | null)[][]
  x_m: (number | null)[][]
  cells: BallTable
}

export interface ProcedureSummary {
  itemsComplete: boolean
  setupComplete: boolean
  canRelease: boolean
  /** The rack-stand end is raised to 20 cm within tolerance (the rise the ball feels, not the clamp height). */
  riseOk: boolean
  tipLifted: boolean
  gapOk: boolean
  /** The level was put on the rail at least once, and the bubble is centred now. */
  levelUsed: boolean
  railRollCentered: boolean
  marks: MarksEvaluation
  measured: { launchHeight: boolean; gap: boolean; rise: boolean }
  ballSelected: BallId | null
  carbonOverBond: boolean
  edgeProjectionPlaced: boolean
  paperMovedSinceMarks: boolean
  runsCount: number
  stopsCount: number
  /** Filled cells (time and range counted separately) per ball. */
  tableFilled: Record<BallId, number>
  tableComplete: Record<BallId, boolean>
}

export interface ApparatusState {
  items: Record<ItemId, boolean>
  joints: Record<JointId, boolean>
  screwsUsed: number
  screwsAvailable: number
  rack_mm: number
  leg_mm: number
  foot_mm: number
  /** Rail tip to table edge as set, mm (the slider; the student verifies it with the tape). */
  gap_mm: number
  level: { placement: LevelPlacement }
  marks: RailMark[]
  ball: { selected: BallId | null; placed: boolean; s_m: number | null; markId: string | null; released: boolean; runId: number | null }
  paper: PaperState
  /** The student's edge projection point exists (its position is hidden). */
  edgeProjection: boolean
  stopwatch: StopwatchState
  /** Rail geometry for DRAWING (3D / 2D views). Student-facing numbers must come from tape readings. */
  geometry: RailGeometry | null
  /** Hidden bench values needed to draw the scene (floor depth, table tilt). Same rule: for drawing only. */
  world: { H_m: number; tableRoll_rad: number }
}

export interface ApparatusSnapshot {
  version: 1
  seed: number
  runRngDraws: number
  benchRngDraws: number
  hidden: { H_m: number; tableRoll_rad: number }
  items: ItemId[]
  joints: Record<JointId, boolean>
  rack_mm: number
  leg_mm: number
  foot_mm: number
  gap_m: number
  levelPlacement: LevelPlacement
  levelUsed: boolean
  measured: { launchHeight: boolean; gap: boolean; rise: boolean }
  marks: (RailMark & { trueS_m: number })[]
  nextMarkId: number
  ball: { selected: BallId | null; placed: boolean; s_m: number | null; markId: string | null; released: boolean; runId: number | null }
  paper: { bond: SheetPose | null; carbon: SheetPose | null; sheetsUsed: number; paperMovedSinceMarks: boolean; marks: PaperMark[]; nextCarbonId: number }
  edgeProjection: { x_m: number; z_m: number } | null
  lastRange: { carbonId: string; runId: number; reading_m: number } | null
  clock_ms: number
  /** Run summaries: no trajectories (regenerated from `bench`, `startS_m` and `offsets`). */
  runs: RunRecord[]
  stopwatch: { running: boolean; linkStartToRelease: boolean; accumulated_ms: number; runningSince_ms: number | null; firstStart_ms: number | null; lastStopId: number | null }
  stops: StopRecord[]
  tables: Record<BallId, BallTable>
  events: ApparatusEvent[]
}
