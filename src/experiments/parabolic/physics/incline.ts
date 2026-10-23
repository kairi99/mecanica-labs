// The ball on the inclined rail. Pure, deterministic expectation. s_m runs along the rail from the LOW TIP (the table
// contact), positive up the slope: a mark at s_m = 0.60 m is at the middle of a 1.2 m rail, upper half is s_m >= 0.60 m.
//
// Model: the ball rides on two contact lines w apart (a channel), so it rolls about the effective radius
//   r_eff = sqrt(R^2 - (w/2)^2)  (ball centre height over the lines is r_eff; contact points are at distance R from the centre).
// Rolling without slipping: v = omega r_eff, so rotational energy is k_body m R^2 omega^2 / 2 = k_eff m v^2 / 2 with
//   k_eff = k_body (R / r_eff)^2   (>= k_body; w = 0 gives the textbook k_body).
// Constant force along the rail (Halliday-Resnick rolling-down-an-incline result with a rolling-resistance term):
//   a = g (sin(theta) - c_rr cos(theta)) / (1 + k_eff),    v^2 = v0^2 + 2 a s,    t = sqrt(2 s / a) from rest.

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

/** Acceleration along the incline, m/s^2 (negative: the ball would not start; rolling resistance wins). */
export function inclineAcceleration_mps2(theta_rad: number, k_eff: number, c_rr: number, g_mps2: number): number {
  return (g_mps2 * (Math.sin(theta_rad) - c_rr * Math.cos(theta_rad))) / (1 + k_eff)
}

/** Speed at the tip after rolling s_m down from release speed v0_mps (default rest), m/s. 0 if the ball stops before the tip. */
export function speedAtTip_mps(s_m: number, a_mps2: number, v0_mps = 0): number {
  const v2 = v0_mps * v0_mps + 2 * a_mps2 * s_m
  return v2 > 0 ? Math.sqrt(v2) : 0
}

/** Time to roll from s_m to the tip, s (constant acceleration), from release speed v0_mps. Infinity if it never gets there. */
export function rollDownTime_s(s_m: number, a_mps2: number, v0_mps = 0): number {
  if (s_m <= 0) return 0
  const disc = v0_mps * v0_mps + 2 * a_mps2 * s_m
  if (disc <= 0) return Infinity
  if (a_mps2 === 0) return v0_mps > 0 ? s_m / v0_mps : Infinity
  return (Math.sqrt(disc) - v0_mps) / a_mps2
}
