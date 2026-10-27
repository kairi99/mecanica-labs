// Constant-acceleration kinematics along a line. Pure. Unit in the name.

/** Position and velocity along a line, SI. */
export interface KinematicState {
  s_m: number
  v_mps: number
}

/** Closed form x(t) = s0 + v0 t + a t^2/2 and v(t) = v0 + a t for constant a. */
export function closedFormState(t_s: number, a_mps2: number, init: KinematicState = { s_m: 0, v_mps: 0 }): KinematicState {
  return { s_m: init.s_m + init.v_mps * t_s + 0.5 * a_mps2 * t_s * t_s, v_mps: init.v_mps + a_mps2 * t_s }
}

/** Closed-form crossing time, s, of position s_m for constant a (smallest t >= 0), or null if never reached. */
export function closedFormCrossing_s(s_m: number, a_mps2: number, init: KinematicState = { s_m: 0, v_mps: 0 }): number | null {
  const d = s_m - init.s_m
  if (d <= 0) return 0
  if (a_mps2 === 0) return init.v_mps > 0 ? d / init.v_mps : null
  const disc = init.v_mps * init.v_mps + 2 * a_mps2 * d
  if (disc < 0) return null
  const t = (-init.v_mps + Math.sqrt(disc)) / a_mps2
  return t >= 0 ? t : null
}
