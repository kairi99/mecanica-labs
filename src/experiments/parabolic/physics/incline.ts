// The ball on the inclined rail. Pure, deterministic expectation. s_m runs along the rail from the LOW TIP (the table
// contact), positive up the slope: a mark at s_m = 0.60 m is at the middle of a 1.2 m rail, upper half is s_m >= 0.60 m.
//
// Model: the ball rides on two contact lines w apart (a channel), so it rolls about the effective radius
//   r_eff = sqrt(R^2 - (w/2)^2)  (ball centre height over the lines is r_eff; contact points are at distance R from the centre).
// Rolling without slipping: v = omega r_eff, so rotational energy is k_body m R^2 omega^2 / 2 = k_eff m v^2 / 2 with
//   k_eff = k_body (R / r_eff)^2   (>= k_body; w = 0 gives the textbook k_body).
//
// Forces along the rail (translation of the centre; the rolling constraint makes the inertia m (1 + k_eff)):
//   gravity            m g sin(theta)
//   rolling resistance c_rr x (sum of the two line normal forces). Each line pushes at angle phi from the perpendicular,
//                      cos(phi) = r_eff / R, and the two perpendicular components carry m g cos(theta), so
//                      sum N = m g cos(theta) R / r_eff  (>= m g cos(theta); equal for w = 0).
//   air drag           (1/2) rho C_d A v^2 = m k_d v^2,  k_d = rho C_d A / (2 m)   (acts on the translational DOF only)
// Equation of motion:  (1 + k_eff) dv/dt = g (sin(theta) - c_rr cos(theta) R / r_eff) - k_d v^2,  i.e.
//   dv/dt = a0 - kappa v^2,   a0 = g (sin(theta) - c_rr cos(theta) R / r_eff) / (1 + k_eff),  kappa = k_d / (1 + k_eff).
// With v dv/ds = dv/dt:  d(v^2)/ds = 2 a0 - 2 kappa v^2, hence from speed v0 after a distance s
//   v^2 = a0/kappa + (v0^2 - a0/kappa) exp(-2 kappa s)      (from rest: v^2 = (a0/kappa)(1 - exp(-2 kappa s))).
// kappa -> 0 gives the vacuum result v^2 = v0^2 + 2 a0 s. The time follows from the same ODE (quadraticDragMotion).
// Buoyancy and added mass are neglected on the slope (about 1 % of the ping-pong weight and 0.5 % of its inertia, opposite
// effects on a).

/** Incline angle, rad, from the rise of the high support over the table and the rail distance low tip to that support. */
export function inclineAngle_rad(rise_m: number, supportDist_m: number): number {
  if (!(supportDist_m > 0) || rise_m < 0 || rise_m > supportDist_m) throw new RangeError('inclineAngle_rad: need 0 <= rise <= supportDist')
  return Math.asin(rise_m / supportDist_m)
}

/** Effective rolling radius on two contact lines w apart, m. Throws if the ball does not fit (w >= 2R). */
export function effectiveRollingRadius_m(R_m: number, channelWidth_m: number): number {
  if (channelWidth_m < 0 || channelWidth_m >= 2 * R_m) throw new RangeError('effectiveRollingRadius_m: ball does not fit the channel (w >= 2R)')
  return Math.sqrt(R_m * R_m - (channelWidth_m / 2) ** 2)
}

/** Effective inertia factor k_eff = k_body (R/r_eff)^2 of a ball rolling on two lines (spin omega = v / r_eff). */
export function effectiveInertiaFactor(k_body: number, R_m: number, channelWidth_m: number): number {
  const r = effectiveRollingRadius_m(R_m, channelWidth_m)
  return k_body * (R_m / r) ** 2
}

/**
 * Acceleration along the incline from rest (v = 0, no air), m/s^2; negative: the ball would not start (rolling resistance wins).
 * `radiusRatio` = R / r_eff scales the rolling-resistance term (sum of the line normal forces); 1 = single line.
 */
export function inclineAcceleration_mps2(theta_rad: number, k_eff: number, c_rr: number, g_mps2: number, radiusRatio = 1): number {
  return (g_mps2 * (Math.sin(theta_rad) - c_rr * Math.cos(theta_rad) * radiusRatio)) / (1 + k_eff)
}

/** Quadratic-drag constant k_d = rho C_d A / (2 m), 1/m (decel of the translational DOF = k_d v^2). */
export function airDragK_pm(rho_kgpm3: number, Cd: number, R_m: number, m_kg: number): number {
  return (rho_kgpm3 * Cd * Math.PI * R_m * R_m) / (2 * m_kg)
}

export interface DragMotion {
  /** Speed after the distance (0 if the ball stopped first), m/s. */
  v_mps: number
  /** Time to cover the distance, or to stop if it stopped first, s. */
  t_s: number
  /** True if the speed reached 0 before the distance was covered. */
  stopped: boolean
  /** Distance actually covered (the stopping distance if stopped), m. */
  s_used_m: number
}

/**
 * Closed-form 1-D motion with dv/dt = a - kappa v^2 (a signed: + speeds up, - slows down; kappa >= 0 in 1/m) from speed
 * v0 >= 0 over a distance s. Speed: v^2 = a/kappa + (v0^2 - a/kappa) e^(-2 kappa s). Time (kappa > 0):
 *   a > 0:  t = [L(v) - L(v0)] / (2 sqrt(a kappa)),  L(x) = ln|(u + x)/(u - x)|,  u = sqrt(a/kappa)   (tanh law)
 *   a = 0:  t = (e^(kappa s) - 1) / (kappa v0)
 *   a < 0:  t = [atan(v0/w) - atan(v/w)] / sqrt(|a| kappa),  w = sqrt(|a|/kappa)                       (tan law)
 * kappa = 0 is the constant-acceleration case.
 */
export function quadraticDragMotion(v0_mps: number, a_mps2: number, kappa_pm: number, s_m: number): DragMotion {
  const k = kappa_pm
  const a = a_mps2
  if (s_m <= 0) return { v_mps: v0_mps, t_s: 0, stopped: false, s_used_m: 0 }
  const x = 2 * k * s_m
  const phi = x === 0 ? 1 : -Math.expm1(-x) / x // (1 - e^-x)/x
  const v2 = v0_mps * v0_mps * Math.exp(-x) + 2 * a * s_m * phi
  if (v2 <= 0) {
    // stopped: stopping distance and time (a < 0), or never moved (v0 = 0, a <= 0)
    if (!(a < 0) || v0_mps === 0) return { v_mps: 0, t_s: 0, stopped: true, s_used_m: 0 }
    const sStop = k > 0 ? Math.log1p((k * v0_mps * v0_mps) / -a) / (2 * k) : (v0_mps * v0_mps) / (2 * -a)
    const tStop = k > 0 ? Math.atan(v0_mps / Math.sqrt(-a / k)) / Math.sqrt(-a * k) : v0_mps / -a
    return { v_mps: 0, t_s: tStop, stopped: true, s_used_m: sStop }
  }
  const v = Math.sqrt(v2)
  let t: number
  if (k === 0) t = a === 0 ? s_m / v0_mps : (v - v0_mps) / a
  else if (a > 0) {
    const u = Math.sqrt(a / k)
    const om = Math.sqrt(a * k)
    const L = (y: number): number => Math.log(Math.abs((u + y) / (u - y)))
    t = Math.abs(u - v0_mps) < 1e-14 * u ? s_m / u : (L(v) - L(v0_mps)) / (2 * om)
  } else if (a === 0) t = Math.expm1(k * s_m) / (k * v0_mps)
  else {
    const w = Math.sqrt(-a / k)
    t = (Math.atan(v0_mps / w) - Math.atan(v / w)) / Math.sqrt(-a * k)
  }
  return { v_mps: v, t_s: t, stopped: false, s_used_m: s_m }
}

/** Speed at the tip after rolling s_m down from release speed v0_mps (default rest), m/s. 0 if the ball stops before the tip. kappa_pm = k_d / (1 + k_eff) (0 = no air). */
export function speedAtTip_mps(s_m: number, a_mps2: number, v0_mps = 0, kappa_pm = 0): number {
  return quadraticDragMotion(v0_mps, a_mps2, kappa_pm, s_m).v_mps
}

/** Time to roll from s_m to the tip, s, from release speed v0_mps. Infinity if it never gets there. */
export function rollDownTime_s(s_m: number, a_mps2: number, v0_mps = 0, kappa_pm = 0): number {
  if (s_m <= 0) return 0
  const m = quadraticDragMotion(v0_mps, a_mps2, kappa_pm, s_m)
  return m.stopped ? Infinity : m.t_s
}
