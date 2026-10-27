// Device constants of the Practica 3 apparatus layer. Every number that is not from the guide is ASSUMED and listed in
// PARAMETERS.md (section Practica 3). Unit in the name. Not PHYWE specifications.

// ---- Rail and supports (same bench family as Practica 1) ------------------------------------------------------------
/** Length of the metal rail, m (guide: 1.2 m). */
export const RAIL_LENGTH_m = 1.2
export const RAIL_SCALE_MAX_mm = 1200
/** Distance of each support point from its nearest rail end, m. ASSUMED. */
export const SUPPORT_FROM_END_m = 0.05
/** Separation d of the stand clamp and the receiver support, along the rail, m. */
export const SUPPORT_SEPARATION_m = RAIL_LENGTH_m - 2 * SUPPORT_FROM_END_m
/** Rack scale range and step, mm (stand end height above its lowest position). ASSUMED. */
export const RACK_MIN_mm = 0
export const RACK_MAX_mm = 250
export const RACK_STEP_mm = 1
/** Fine range of the receiver's screw foot, +- mm, and step. ASSUMED. */
export const FOOT_RANGE_mm = 5
export const FOOT_STEP_mm = 0.05
/** Hidden bench tilt along the rail axis: uniform in +- this value, deg; positive: receiver end lower. ASSUMED. */
export const TABLE_TILT_MAX_deg = 0.15
/** Distance of the receiver end stop from its rail end (cart front stops there), m. ASSUMED. */
export const RECEIVER_STOP_FROM_END_m = 0.04
export const SCREWS_PER_JOINT = 2
export const SCREWS_TOTAL = 6

// ---- Level ---------------------------------------------------------------------------------------------------------
export const LEVEL_SENSITIVITY_mm_per_deg = 20
export const LEVEL_BUBBLE_MAX_mm = 6
export const LEVEL_CENTERED_TOL_mm = 0.5

// ---- Cart and marks ------------------------------------------------------------------------------------------------
export const CART_LENGTH_m = 0.0984
export const MARK_SNAP_mm = 0.5
/** Guide: the cart covers 90 cm between the start and the end mark. Placement tolerance ASSUMED 2 mm. */
export const DISTANCE_TARGET_m = 0.9
export const DISTANCE_TOL_mm = 2
export const CART_AT_START_TOL_mm = 1.5

// ---- String ---------------------------------------------------------------------------------------------------------
export const STRING_MIN_m = 0.3
export const STRING_MAX_m = 2
export const STRING_STEP_m = 0.001
/** Length of string the kit starts with once it is on the bench. ASSUMED (a long piece, to be cut or tied back). */
export const STRING_DEFAULT_m = 1.5

// ---- DigiCart encoder and integration ---------------------------------------------------------------------------------
export const DIGICART_SAMPLE_RATE_Hz = 50
export const DIGICART_RESOLUTION_m = 0.001
/** Seconds of the DigiCart log recorded after the end mark is crossed. */
export const DIGICART_TAIL_s = 0.5
export const DIGICART_MAX_s = 20

// ---- Instruments ------------------------------------------------------------------------------------------------------
/** Placeholder dynamometer (phase 1): resolution of the canister weight reading, N. ASSUMED. TODO phase 2: core spring scale. */
export const FORCE_RESOLUTION_N = 0.01
export const FORCE_MAX_N = 2

// ---- Distractor parts ---------------------------------------------------------------------------------------------------
/** True masses of the distractors, kg. ASSUMED. */
export const MASS50_kg = 0.05
export const MARBLE_kg = 0.0052

// ---- Tabla 3.1 -------------------------------------------------------------------------------------------------------
/** Rows: the four guide trials (4, 3, 2, 1 masses in the canister) and an optional fifth with the empty canister. */
export const TABLE_ROWS = 5
export const TABLE_COLS = 10
export const TRIAL_MASSES_IN_CANISTER: readonly number[] = [4, 3, 2, 1, 0]
export const TABLE_MAX_TIME_s = 30
/** Stopwatch shows two decimals, so typed values with more are rejected. */
export const TABLE_MAX_DECIMALS = 2
/** Typed forces: at most 2 decimals (dynamometer 0.01 N), up to FORCE_MAX_N. */
export const FORCE_MAX_DECIMALS = 2
/** Typed total mass Mt in g, one decimal (balance 0.1 g), up to the balance capacity. */
export const MT_MAX_g = 600
export const MT_MAX_DECIMALS = 1
