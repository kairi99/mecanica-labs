// Device constants of the Practica 2 apparatus layer. Every number that is not from the guide is ASSUMED and listed in
// PARAMETERS.md (section "Practica 2 - Apparatus"). Unit in the name. Not manufacturer specifications.
import { deg2rad } from '../../../core/physics/angles.ts'

// ---- Rail and supports -------------------------------------------------------------------------------------------
/** Length of the metal rail, m (guide: 1.2 m). */
export const RAIL_LENGTH_m = 1.2
/** Distance from the low tip to the rack-stand clamp (high support), m. Equals the physics DEFAULT_SETUP.supportDist_m. ASSUMED. */
export const RACK_FROM_TIP_m = 1.1
/** Distance from the low tip to the two-leg stand support, m. ASSUMED. */
export const TWO_LEG_FROM_TIP_m = 0.1
/** Height of the rail top surface at the clamp when the rack reads 0 mm, m. ASSUMED. */
export const RACK_BASE_HEIGHT_m = 0.06
export const RACK_MIN_mm = 0
export const RACK_MAX_mm = 250
export const RACK_STEP_mm = 1
/** Two-leg stand height adjustment (rail top surface above the table at its support), mm. ASSUMED. */
export const LEG_MIN_mm = 0
export const LEG_MAX_mm = 150
export const LEG_STEP_mm = 1
/** Distance between the two legs of the two-leg stand across the rail, m (lever of the screw foot). ASSUMED. */
export const TWO_LEG_SPAN_m = 0.2
/** Fine screw foot of one leg of the two-leg stand: range +- mm and step. ASSUMED. */
export const FOOT_RANGE_mm = 5
export const FOOT_STEP_mm = 0.05
/** The rail tip counts as lifted off the table only above this height, m (surface roughness). ASSUMED. */
export const TIP_LIFT_TOL_m = 0.0005
/** Screws per rail joint, and in the box. ASSUMED (the guide lists no count). */
export const SCREWS_PER_JOINT = 2
export const SCREWS_TOTAL = 4

// ---- Hidden bench truth ------------------------------------------------------------------------------------------
/** Table height H range, m: uniform. ASSUMED (typical table 0.74-0.78 m). */
export const TABLE_HEIGHT_MIN_m = 0.74
export const TABLE_HEIGHT_MAX_m = 0.78
/** Hidden lateral tilt of the table (roll about the rail axis): uniform in +- this value, deg. ASSUMED. */
export const TABLE_ROLL_MAX_deg = 0.3
/** Lateral launch angle added per unit roll of the rail (ball rides one groove wall). Stylised, ASSUMED. */
export const LATERAL_DRIFT_GAIN = 4

// ---- Level -------------------------------------------------------------------------------------------------------
/** Bubble displacement per degree of tilt, mm/deg (2 mm per 0.1 deg). ASSUMED (same vial as Practica 1). */
export const LEVEL_SENSITIVITY_mm_per_deg = 20
export const LEVEL_BUBBLE_MAX_mm = 6
/** Bubble counts as centred when |offset| <= this, mm (|tilt| <= 0.025 deg). ASSUMED. */
export const LEVEL_CENTERED_TOL_mm = 0.5

// ---- Placement of the rail on the table --------------------------------------------------------------------------
/** Start position of the rail tip from the table edge when the rail is first put down, m. ASSUMED. */
export const GAP_START_m = 0.15
/** Farthest the rail tip can be set from the edge, m (the table is finite). ASSUMED. */
export const GAP_MAX_m = 0.6
export const GAP_STEP_m = 0.001

// ---- Marks on the rail -------------------------------------------------------------------------------------------
export const MARK_SNAP_m = 0.0005
export const MARK_MAX_COUNT = 10
/** Student's placement error of a rail mark, 1-sigma, m. ASSUMED. */
export const MARK_PLACEMENT_SIGMA_m = 0.001
/** The guide wants the marks in the upper half of the track: s >= L/2 from the low tip. */
export const MARK_UPPER_HALF_FROM_m = RAIL_LENGTH_m / 2
export const MARK_COUNT_EXPECTED = 5

// ---- Paper on the floor ------------------------------------------------------------------------------------------
/** A4 sheet: long and short side, m. */
export const SHEET_LONG_m = 0.297
export const SHEET_SHORT_m = 0.21
/** Bond-paper sheets in the inventory (guide: 2). */
export const BOND_SHEETS = 2
export const PAPER_SNAP_m = 0.001
export const PAPER_POS_MAX_m = 3
/** Placement error of the edge projection point on the floor (plumb line / set-square), 1-sigma per axis, m. ASSUMED. */
export const EDGE_PROJECTION_SIGMA_m = 0.002

// ---- Tape measure ------------------------------------------------------------------------------------------------
/** Blade length of the tape measure, m. ASSUMED typical 3 m pocket tape. */
export const TAPE_RANGE_m = 3

// ---- Procedure ---------------------------------------------------------------------------------------------------
export const RISE_TARGET_m = 0.2
/** Rise counts as "20 cm" within this, m. ASSUMED (tape resolution 1 mm). */
export const RISE_TOLERANCE_m = 0.005
export const GAP_TARGET_m = 0.05
/** Gap counts as "about 5 cm" within this, m. ASSUMED. */
export const GAP_TOLERANCE_m = 0.02

// ---- Run and trajectory ------------------------------------------------------------------------------------------
/** Sampling of the stored flight trajectory, Hz (linear interpolation error ~1e-6 m). Not an instrument. */
export const TRAJECTORY_RATE_hz = 1200
/** A ball that rolls over the edge instead of leaving horizontally is followed this long after the edge, s (animation only). */
export const ROLL_OVER_TAIL_s = 0.5

// ---- Slow-motion reference ---------------------------------------------------------------------------------------
/** Frame rate of the slow-motion video, Hz (typical phone slow-mo). ASSUMED. */
export const SLOWMO_FPS_hz = 240
/** Frames kept before the ball passes the edge and after it lands. */
export const SLOWMO_PRE_FRAMES = 3
export const SLOWMO_POST_FRAMES = 3

// ---- Tabla 2.1 ---------------------------------------------------------------------------------------------------
export const TABLE_TRIALS = 5
export const TABLE_REPS = 5
export const TABLE_MAX_TIME_s = 30
export const TABLE_TIME_DECIMALS = 2
export const TABLE_MAX_RANGE_m = TAPE_RANGE_m
/** Tape is read to the millimetre. */
export const TABLE_RANGE_DECIMALS = 3

export const TABLE_ROLL_MAX_rad = deg2rad(TABLE_ROLL_MAX_deg)
