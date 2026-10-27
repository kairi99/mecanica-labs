// Body of the PHYWE-style DigiCart shared by the experiments that use it (inclined rail, level rail pulled by a hanging
// mass): mass, wheels (rotational inertia) and the resistance model. Pure; every number is ASSUMED, see PARAMETERS.md ("Cart").

export interface DigiCartBody {
  /** Total mass of the cart including wheels, kg. */
  m_kg: number
  wheelCount: number
  /** Mass of one wheel, kg. */
  wheelMass_kg: number
  /** Wheel radius, m. */
  wheelRadius_m: number
  /** Moment of inertia of a wheel as a fraction of m_w r^2 (0.5 = solid disc). */
  wheelInertiaFactor: number
  /** Rolling-resistance coefficient c_rr (dimensionless), multiplies the normal force. ASSUMED, optimistic. */
  c_rr: number
  /**
   * Velocity-independent bearing drag, N. An ABSOLUTE force (not a fraction of the weight), so the resulting
   * acceleration depends on the cart mass through it.
   */
  F_bearing_N: number
  /**
   * Extra static (breakaway) force, N, that must be exceeded by the driving force minus the kinetic resistances for a
   * cart AT REST to start. Used only when v = 0. ASSUMED (PARAMETERS.md).
   */
  F_breakaway_N: number
  /** Drag coefficient of the cart front (dimensionless). */
  Cd: number
  /** Frontal area, m^2. */
  A_m2: number
}

/** Defaults of the cart body. ASSUMED, not PHYWE specifications (PARAMETERS.md, section Cart). */
export const DEFAULT_DIGICART_BODY: DigiCartBody = {
  m_kg: 0.25,
  wheelCount: 4,
  wheelMass_kg: 0.006,
  wheelRadius_m: 0.011,
  wheelInertiaFactor: 0.5,
  c_rr: 0.0005,
  F_bearing_N: 0.0003,
  F_breakaway_N: 0.005,
  Cd: 1.0,
  A_m2: 0.0012,
}

/** Equivalent translational mass of the wheels, kg: sum(I_w) / r^2 = count * factor * m_w (the radius cancels). */
export function wheelInertiaMass_kg(b: DigiCartBody): number {
  return b.wheelCount * b.wheelInertiaFactor * b.wheelMass_kg
}
