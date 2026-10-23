// Ball presets and setup defaults of Practica 2 (horizontal launch). Pure data, SI units, unit in the name.
// Every empirical value here has a row in PARAMETERS.md ("Practica 2"): value, unit, source or ASSUMED, date.
import { G_QUITO_mps2, RHO_AIR_QUITO_kgpm3 } from '../../../core/physics/constants.ts'

export interface BallSpec {
  /** Stable id, used as key for variability and marks. */
  id: 'marble' | 'pingpong'
  /** Ball radius R, m. */
  R_m: number
  /** Mass, kg. */
  m_kg: number
  /** Moment of inertia about the centre as a fraction of m R^2 (solid sphere 2/5, thin shell 2/3). */
  k_body: number
  /** Rolling-resistance coefficient (dimensionless; decel = c_rr g / (1 + k) on the flat). ASSUMED. */
  c_rr: number
  /** Drag coefficient of the smooth sphere. */
  Cd: number
  /** Coefficient of restitution on carbon paper over the floor (animation of the bounce only). ASSUMED. */
  restitution: number
}

/**
 * Glass marble: d = 16 mm, glass 2.5 g/cm^3 gives 5.4 g, taken as 5.5 g (density 2.5-2.6 g/cm^3 for common glass).
 * Solid sphere k = 2/5. c_rr on aluminium ASSUMED 1.5e-3 (hard sphere on hard surface, typically 1e-3 to 2e-3).
 */
export const MARBLE: BallSpec = { id: 'marble', R_m: 0.008, m_kg: 0.0055, k_body: 2 / 5, c_rr: 0.0015, Cd: 0.5, restitution: 0.5 }

/**
 * Ping-pong ball: d = 40 mm, m = 2.7 g (ITTF regulation). Hollow shell: thin-shell k = 2/3. The real celluloid/plastic
 * shell is ~0.4 mm thick (t/R = 0.02), which makes k ~0.66; the thin-shell value is used. c_rr ASSUMED 5e-3 (larger:
 * soft, large, light ball). Restitution 0.8 on paper over the floor ASSUMED.
 */
export const PING_PONG: BallSpec = { id: 'pingpong', R_m: 0.02, m_kg: 0.0027, k_body: 2 / 3, c_rr: 0.005, Cd: 0.5, restitution: 0.8 }

export const BALLS: Readonly<Record<BallSpec['id'], BallSpec>> = { marble: MARBLE, pingpong: PING_PONG }

/** Geometry of the set-up (rail, supports, table, paper). */
export interface LaunchSetup {
  /** Rail length, m (guide: 1.2 m). */
  L_rail_m: number
  /** Rise of the high support above the table, m (guide: 20 cm). */
  rise_m: number
  /** Distance along the rail from the low tip (table contact) to the high support, m. ASSUMED. */
  supportDist_m: number
  /** Distance from the rail's low tip to the table edge, m (guide: about 5 cm). */
  gap_m: number
  /** Table height H, m (edge to the floor/paper top). ASSUMED default; seeded per bench elsewhere. */
  H_m: number
  /** Distance between the two contact lines of the ball on the rail, m (channel width). ASSUMED. 0 = single line. */
  channelWidth_m: number
  /** Drop from the rail top surface to the table at the tip, m. ASSUMED ~0 (rail thickness ignored). */
  stepDrop_m: number
  /** Height of the paper top above the floor reference, m (ball bottom lands at this height). */
  paperHeight_m: number
  g_mps2: number
  rho_air_kgpm3: number
}

/** Defaults (PARAMETERS.md). */
export const DEFAULT_SETUP: LaunchSetup = {
  L_rail_m: 1.2,
  rise_m: 0.2,
  supportDist_m: 1.1,
  gap_m: 0.05,
  H_m: 0.76,
  channelWidth_m: 0.01,
  stepDrop_m: 0,
  paperHeight_m: 0,
  g_mps2: G_QUITO_mps2,
  rho_air_kgpm3: RHO_AIR_QUITO_kgpm3,
}

/**
 * Magnus lift coefficient C_L(S) for topspin with spin parameter S = R omega / v:  C_L = S / (2.022 S + 0.981).
 * Fit commonly quoted for baseball-type balls (Sawicki, Hubbard & Stronge 2003 lineage; coefficients as quoted in the
 * ball-flight literature, not re-derived here). ASSUMED to carry over to a marble and a ping-pong ball at
 * Re ~ 10^3-10^4 (the ping-pong value is an extrapolation; real low-Re lift can differ).
 */
export const magnusLiftCoefficient = (S: number): number => (S > 0 ? S / (2.022 * S + 0.981) : 0)

/** Spin decay in the ~0.4 s flight is negligible (viscous torque on a smooth sphere << inertia), so omega is held constant. */
export const SPIN_DECAY_NEGLIGIBLE = true

/** Fixed RK4 step, s (convergence tested: halving changes the range by < 1e-6 m). */
export const DEFAULT_DT_s = 0.0005
