// Constants of Practica 4 (friction). Every value is ASSUMED unless a source is named; PARAMETERS.md, section Practica 4.
// Unit in the name. Friction coefficients are ASSUMED within literature ranges (not measured lab values).

/** Friction block faces on the paper (exps. 1 and 2). */
export type FaceId = 'cloth' | 'sandpaper'
export const FACE_IDS: readonly FaceId[] = ['cloth', 'sandpaper']
/** Bars sliding on the aluminium rail (exp. 3). */
export type BarId = 'wood' | 'aluminium' | 'iron'
export const BAR_IDS: readonly BarId[] = ['wood', 'aluminium', 'iron']

/** A pair of surfaces: static and kinetic coefficients (mu_s > mu_k), ASSUMED, plus the plausible literature range for the help page / tests. */
export interface SurfacePair {
  mu_s: number
  mu_k: number
  /** Plausible literature range for the static coefficient [low, high]. */
  muSRange: readonly [number, number]
}

/**
 * Cloth and sandpaper on paper. ASSUMED. Textile on paper is of order 0.3 to 0.5 and abrasive paper on paper 0.5 to 1.0 in
 * common tables of friction coefficients (engineering handbooks); no measurement of the real block exists.
 */
export const FACE_PAIRS: Readonly<Record<FaceId, SurfacePair>> = {
  cloth: { mu_s: 0.4, mu_k: 0.3, muSRange: [0.3, 0.5] },
  sandpaper: { mu_s: 0.72, mu_k: 0.55, muSRange: [0.5, 1.0] },
}
/** Paper sheet sliding on the bare table (paper not fixed): the load is carried by this pair instead. ASSUMED. */
export const PAPER_ON_TABLE: SurfacePair = { mu_s: 0.35, mu_k: 0.28, muSRange: [0.25, 0.5] }
/** Block pulled off the end of the paper onto the bare table top (same for both faces). ASSUMED. */
export const BLOCK_ON_TABLE: SurfacePair = { mu_s: 0.35, mu_k: 0.28, muSRange: [0.25, 0.5] }

/**
 * Bars on the aluminium rail (rail material ASSUMED aluminium, lightly anodised). Wood on metal 0.2 to 0.6, steel on aluminium about
 * 0.6 static and 0.5 kinetic, aluminium on anodised aluminium about 0.5 (engineering handbooks); ASSUMED within those ranges.
 */
export const BAR_PAIRS: Readonly<Record<BarId, SurfacePair>> = {
  wood: { mu_s: 0.4, mu_k: 0.3, muSRange: [0.2, 0.6] },
  aluminium: { mu_s: 0.5, mu_k: 0.4, muSRange: [0.4, 0.7] },
  iron: { mu_s: 0.58, mu_k: 0.46, muSRange: [0.4, 0.7] },
}

// ---- masses ----------------------------------------------------------------------------------------------------------
/** Mean mass of the friction block with its hook, kg. ASSUMED (a small wooden block). */
export const BLOCK_MASS_NOMINAL_kg = 0.1
/** Per-bench spread of the block mass: uniform +- this, kg. ASSUMED. */
export const BLOCK_MASS_SPREAD_kg = 0.006
/** Nominal mass of each silver mass, kg (guide). */
export const MASS_NOMINAL_kg = 0.05
/** Relative sigma of each 50 g mass about its label, per bench. ASSUMED (cheap slotted masses, ~0.5 %). */
export const MASS_SIGMA_REL = 0.005
/** Number of silver masses in the box (guide). */
export const MASS_COUNT = 3
/** Bar masses (ASSUMED from a 10 x 2.5 x 1.5 cm bar and handbook densities; the bar mass does not enter mu). */
export const BAR_MASS_kg: Readonly<Record<BarId, number>> = { wood: 0.026, aluminium: 0.1, iron: 0.3 }
/** Bar length along the rail, m (ASSUMED; the 100 cm course plus the bar must fit the 1.2 m rail). */
export const BAR_LENGTH_m = 0.1

// ---- exps. 1 and 2: spring-block model ----------------------------------------------------------------------------------
/** Fixed integration step of the spring-block model, s (exact damped-oscillator update inside each step, events solved by bisection). */
export const PULL_DT_s = 0.001
/** Sampling interval of the stored series, s. */
export const PULL_SAMPLE_s = 0.005
/** Time constant with which the hand reaches a new commanded pull speed, s. ASSUMED. */
export const HAND_TAU_s = 0.15
/** Usable travel of the block on the A4 sheet along the pull (297 mm sheet minus the block length and margins), m. ASSUMED. */
export const PAPER_TRAVEL_m = 0.2
/** Pull speeds the control offers, m/s. */
export const PULL_SPEED_MIN_mps = 0.002
export const PULL_SPEED_MAX_mps = 0.2

// ---- exp. 3: rail --------------------------------------------------------------------------------------------------------
/**
 * Geometry. The 1.2 m rail rests with the lower edge of its low end on the table and is raised by the rack-and-pinion stand
 * at a clamp RAIL_SUPPORT_DIST_m along the rail from that contact point. h is the height of the rail UNDERSIDE at the clamp above the table
 * (what a tape reads from the table to the lower edge of the rail there). sin(theta) = h / L, L = RAIL_SUPPORT_DIST_m. ASSUMED 1.10 m (as Practica 1/2).
 */
export const RAIL_LENGTH_m = 1.2
export const RAIL_SUPPORT_DIST_m = 1.1
/** Slide course measured on the rail, m (guide: 100 cm). */
export const COURSE_m = 1.0
/** Highest the taller rack stand can hold the underside of the rail at the clamp, m. ASSUMED. */
export const RACK_H_MAX_m = 0.7
/** Rack-and-pinion crank speeds the control offers (rate of change of h), m/s. */
export const RAISE_RATE_MIN_mps = 0.0005
export const RAISE_RATE_MAX_mps = 0.02
/** Integration step of the slide, s (RK4). */
export const SLIDE_DT_s = 0.001
/** Distance the bar is followed beyond the course before the simulation stops, m. */
export const SLIDE_TAIL_m = 0.05
