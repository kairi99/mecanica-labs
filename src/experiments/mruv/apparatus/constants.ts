// Device constants of the apparatus layer. Every number that is not from the guide is ASSUMED and listed in
// PARAMETERS.md (section "Apparatus"). Unit in the name. Not PHYWE specifications.
import { deg2rad } from '../physics/index.ts'

// ---- Rail and supports -------------------------------------------------------------------------------------------
/** Length of the metal rail, m (guide: 1.2 m). */
export const RAIL_LENGTH_m = 1.2
/** Printed scale length, mm (0 .. 1200 along the rail). */
export const RAIL_SCALE_MAX_mm = 1200
/** Distance of each support point from its nearest rail end, m. ASSUMED. */
export const SUPPORT_FROM_END_m = 0.05
/** Separation d of the clamp point and the two-leg stand point, measured along the rail, m. ASSUMED = L - 2 x 0.05. */
export const SUPPORT_SEPARATION_m = RAIL_LENGTH_m - 2 * SUPPORT_FROM_END_m
/** Height of the rail top surface at the rack-stand clamp when the rack reads 0 mm, m. ASSUMED. */
export const RACK_BASE_HEIGHT_m = 0.06
export const RACK_MIN_mm = 0
export const RACK_MAX_mm = 250
/** Rack scale resolution, mm (whole-millimetre ticks). ASSUMED. */
export const RACK_STEP_mm = 1
/** Height of the rail top surface at the two-leg stand when the foot screw is at 0, m. ASSUMED (= rack base). */
export const TWO_LEG_BASE_HEIGHT_m = 0.06
/** Fine range of the two-leg stand screw foot, +- mm, and its step. ASSUMED. */
export const FOOT_RANGE_mm = 5
export const FOOT_STEP_mm = 0.05
/** Hidden table tilt along the rail axis: uniform in +- this value, deg. ASSUMED. */
export const TABLE_TILT_MAX_deg = 0.15
/** Distance of the receiver end stop from the low rail end (cart front stops there), m. ASSUMED. */
export const RECEIVER_STOP_FROM_END_m = 0.04
/** Screws consumed by each of the three rail joints. */
export const SCREWS_PER_JOINT = 2
export const SCREWS_TOTAL = 6

// ---- Level -------------------------------------------------------------------------------------------------------
/** Bubble displacement per degree of tilt, mm/deg (2 mm per 0.1 deg). ASSUMED. */
export const LEVEL_SENSITIVITY_mm_per_deg = 20
/** Bubble saturates at this offset from the centre, mm (ends of the vial). ASSUMED. */
export const LEVEL_BUBBLE_MAX_mm = 6
/** Bubble counts as centred between the vial marks when |offset| <= this, mm (|tilt| <= 0.025 deg). ASSUMED. */
export const LEVEL_CENTERED_TOL_mm = 0.5

// ---- Cart --------------------------------------------------------------------------------------------------------
/** Cart length (front to rear), m. ASSUMED. Whole cart must lie on the rail. */
export const CART_LENGTH_m = 0.0984

// ---- Tape measure (flexometro) -----------------------------------------------------------------------------------
/** Blade length of the tape measure, m. ASSUMED typical 3 m workshop tape. */
export const TAPE_RANGE_m = 3

// ---- Markers (tape marks) ----------------------------------------------------------------------------------------
export const MARK_SNAP_mm = 0.5
export const MARK_MAX_COUNT = 30
/** Guide: marks every 10 cm, AB >= 90 cm. Check tolerances (tape placement) ASSUMED 2 mm. */
export const MARK_SPACING_mm = 100
export const MARK_TOLERANCE_mm = 2
export const MARK_AB_MIN_mm = 900
export const MARK_COUNT_EXPECTED = 10

// ---- Procedure ---------------------------------------------------------------------------------------------------
export const ANGLE_TARGET_deg = 1.3
export const ANGLE_TOLERANCE_deg = 0.05
export const ANGLE_TOLERANCE_rad = deg2rad(ANGLE_TOLERANCE_deg)
/** Cart front within this of mark A counts as "at 0 cm", mm. ASSUMED. */
export const CART_AT_A_TOL_mm = 1.5

// ---- DigiCart encoder and integration ----------------------------------------------------------------------------
export const DIGICART_SAMPLE_RATE_Hz = 50
export const DIGICART_RESOLUTION_m = 0.001
/** Step of the stored trajectory, s (same as the physics crossing-time search). */
export const TRAJECTORY_DT_s = 0.001
export const TRAJECTORY_MAX_s = 40

// ---- Table 1.1 ---------------------------------------------------------------------------------------------------
export const TABLE_ROWS = 10
export const TABLE_COLS = 10
export const TABLE_POSITIONS_cm: readonly number[] = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90]
export const TABLE_MAX_TIME_s = 30
/** Stopwatch shows two decimals, so typed values with more are rejected. */
export const TABLE_MAX_DECIMALS = 2

// ---- World frame (see docs/architecture.md) ----------------------------------------------------------------------
/** Half-width of the rail, m (for 3D models; z extent). ASSUMED. */
export const RAIL_HALF_WIDTH_m = 0.0125
