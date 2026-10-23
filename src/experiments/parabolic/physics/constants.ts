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
  /** Moment of inertia about the centre as a fraction of m R^2 (solid sphere 2/5, hollow shell of finite thickness ~0.65). */
  k_body: number
  /**
   * Rolling-resistance coefficient: F_rr = c_rr x (sum of the normal-force magnitudes on the contact lines), dimensionless.
   * Flat table: F = c_rr m g, decel = c_rr g / (1 + k). Slope on two lines: F = c_rr m g cos(theta) R / r_eff. ASSUMED.
   */
  c_rr: number
  /** Kinetic (sliding) friction coefficient ball on the table laminate, used while the ball slips after the rail tip. ASSUMED. */
  mu_k: number
  /** Drag coefficient of the smooth sphere (held constant; see PARAMETERS.md for the Re range). */
  Cd: number
  /** Coefficient of restitution on carbon paper over the floor (animation of the bounce only). ASSUMED. */
  restitution: number
}

/**
 * Thickness of the ping-pong shell, m. ASSUMED 0.4 mm (regulation balls are about 0.35-0.45 mm; not measured).
 */
export const PING_PONG_SHELL_THICKNESS_m = 0.0004

/**
 * Moment of inertia factor k = I / (m R^2) of a uniform hollow sphere (outer radius R, wall thickness t):
 * I = (2/5) m (R^5 - r^5)/(R^3 - r^3), r = R - t, so k = 0.4 (1 - q^5)/(1 - q^3), q = r/R. t -> 0 gives 2/3, t = R gives 2/5.
 */
export function hollowShellInertiaFactor(R_m: number, thickness_m: number): number {
  if (!(thickness_m > 0) || thickness_m > R_m) throw new RangeError('hollowShellInertiaFactor: need 0 < thickness <= R')
  const q = (R_m - thickness_m) / R_m
  return (0.4 * (1 - q ** 5)) / (1 - q ** 3)
}

/**
 * Glass marble: d = 16 mm, glass 2.5 g/cm^3 gives 5.4 g, taken as 5.5 g (density 2.5-2.6 g/cm^3 for common glass).
 * Solid sphere k = 2/5. c_rr on aluminium ASSUMED 1.5e-3 (hard sphere on hard surface, typically 1e-3 to 2e-3).
 * mu_k glass on laminate ASSUMED 0.30. Cd 0.45: standard sphere curve at Re 1e3-3e3 (White, Fluid Mechanics, Fig. 7.16).
 */
export const MARBLE: BallSpec = { id: 'marble', R_m: 0.008, m_kg: 0.0055, k_body: 2 / 5, c_rr: 0.0015, mu_k: 0.3, Cd: 0.45, restitution: 0.5 }

/**
 * Ping-pong ball: d = 40 mm, m = 2.7 g (ITTF Handbook, Laws 2.3.1-2.3.2; Technical Leaflet T3 allows 2.67-2.77 g).
 * Hollow shell, t = 0.4 mm ASSUMED, k = 0.4 (1 - q^5)/(1 - q^3) = 0.653 (not the thin-shell 2/3). c_rr ASSUMED 5e-3
 * (larger: soft, large, light ball). mu_k celluloid/ABS on laminate ASSUMED 0.35. Cd 0.42 (White, Re 2e3-8e3).
 * Restitution 0.8 on paper over the floor ASSUMED (ITTF bounce rule, 23-25 cm from 30.5 cm on steel, gives e = 0.87-0.91 at
 * 2.4 m/s; the ball lands at ~3.9 m/s on paper, where it is lower).
 */
export const PING_PONG: BallSpec = {
  id: 'pingpong', R_m: 0.02, m_kg: 0.0027, k_body: hollowShellInertiaFactor(0.02, PING_PONG_SHELL_THICKNESS_m), c_rr: 0.005, mu_k: 0.35, Cd: 0.42, restitution: 0.8,
}

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
  /**
   * Drop from the rail top surface to the table at the tip, m. ASSUMED ~0 (rail thickness ignored). Geometry note: the ball's
   * lowest point sits R - r_eff below the contact lines (1.75 mm for the marble in a 10 mm groove), so whether it touches the
   * table inside the groove, and how large the true drop is, depends on the rail profile.
   */
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
 * ASSUMED saturating form, no source claimed for the numbers (an earlier attribution to a baseball fit could not be
 * verified). It gives C_L ~ S at small S and 0.33 at S = 1, inside the 0.2-0.35 that smooth-sphere measurements at
 * Re ~ 10^3 show at S ~ 1 (Tanaka et al. 1990; Oesterle & Bui Dinh 1998). Those data show positive (not inverse) lift
 * there; inverse Magnus appears only near the drag crisis. Sign: topspin pushes the ball down (tested).
 */
export const magnusLiftCoefficient = (S: number): number => (S > 0 ? S / (2.022 * S + 0.981) : 0)

/** Spin decay in the ~0.4 s flight is negligible (viscous torque on a smooth sphere << inertia), so omega is held constant. */
export const SPIN_DECAY_NEGLIGIBLE = true

/** Fixed RK4 step, s (convergence tested: halving changes the range by < 1e-6 m). */
export const DEFAULT_DT_s = 0.0005
