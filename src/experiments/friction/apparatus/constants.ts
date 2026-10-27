// Constants of the Practica 4 bench (device layer). ASSUMED unless noted; PARAMETERS.md, section Practica 4.
import type { BarId, FaceId } from '../physics/constants.ts'
import { BAR_LENGTH_m, RAIL_LENGTH_m } from '../physics/constants.ts'

/**
 * Inventory. The guide lists the bars, block, scales, rail, masses, tape and paper. It does NOT list the rack-and-pinion stand and its base
 * or the stopwatch (exp. 3 needs them) nor a balance (the procedure needs M): the simulator offers them and the help page says so.
 * Distractors: 10 g masses (wrong masses for the 50 g steps) and a marble.
 */
export const ITEM_IDS = [
  'alBar', 'woodBar', 'ironBar', 'block', 'scale1N', 'scale2N', 'rail', 'masses50', 'tape', 'paper',
  'rackStand', 'standBase', 'stopwatch', 'balance', 'masses10', 'marble',
] as const
export type ItemId = (typeof ITEM_IDS)[number]
export const DISTRACTOR_ITEMS: readonly ItemId[] = ['masses10', 'marble']
/** Items that appear in the guide's list. */
export const GUIDE_LISTED_ITEMS: readonly ItemId[] = ['alBar', 'woodBar', 'ironBar', 'block', 'scale1N', 'scale2N', 'rail', 'masses50', 'tape', 'paper']
/** Items the simulator adds because the procedure needs them but the guide's list omits them. */
export const UNLISTED_NEEDED_ITEMS: readonly ItemId[] = ['rackStand', 'standBase', 'stopwatch', 'balance']
export const BAR_ITEM: Readonly<Record<BarId, ItemId>> = { wood: 'woodBar', aluminium: 'alBar', iron: 'ironBar' }
export const SCALE_ITEM = { '1N': 'scale1N', '2N': 'scale2N' } as const

/** Tabla 4.1: rows are face x added mass (0, 50, 100, 150 g); 5 readings each. */
export const FACE_ORDER: readonly FaceId[] = ['cloth', 'sandpaper']
export const MASS_STEPS = 4
export const T41_ROWS = FACE_ORDER.length * MASS_STEPS
export const T42_ROWS = FACE_ORDER.length
export const T4_READINGS = 5
/** Tabla 4.3: bars x 5 trials of h and t. */
export const BAR_ORDER: readonly BarId[] = ['wood', 'aluminium', 'iron']
export const T43_TRIALS = 5
export const FORCE_DECIMALS = 3
export const FORCE_MAX_N = 10
export const HEIGHT_DECIMALS = 3
export const HEIGHT_MAX_m = 1.2
export const TIME_DECIMALS = 2
export const TIME_MAX_s = 60

/** Balance: smallest digit 0.1 g, repeatability sigma 0.05 g. ASSUMED. */
export const BALANCE_RESOLUTION_kg = 0.0001
export const BALANCE_SIGMA_kg = 0.00005

/** Slide course: bar front edge on the start mark 0.10 m below the rail's high end (the 0.10 m bar behind it ends at the rail end). */
export const START_FRONT_m = RAIL_LENGTH_m - BAR_LENGTH_m
/** Longest course the rail allows (finish mark at least 2 cm from the low end). */
export const COURSE_MAX_m = START_FRONT_m - 0.02
export const COURSE_MIN_m = 0.3
/** Mark placement: the student's requested length snaps to 1 mm and the real mark lands with this sigma. ASSUMED. */
export const COURSE_SIGMA_m = 0.001
export const COURSE_SNAP_m = 0.001
/** Tape measure division for reading h, m. */
export const HEIGHT_READ_STEP_m = 0.001

/** Sampling of the reference force trace, s. */
export const REFERENCE_DT_s = 0.01
export const MAX_EVENTS = 5000
