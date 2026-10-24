// Impact of a rigid sphere on a flat horizontal surface (the table). Pure, deterministic, one instant (impulsive model).
//
// Ball: mass m, radius R, moment of inertia k m R^2 about its centre (solid sphere k = 2/5, thin shell k -> 2/3). Planar motion in the
// vertical plane of the heading: horizontal velocity vx (+ forward), vertical velocity vy (+ up), spin omega (rad/s, +: forward rolling,
// "topspin": the contact point moves backwards relative to the centre, so omega = vx / R is rolling without slipping). u = R omega.
//
// Normal direction: Newton's restitution law, vy' = -e_n vy (vy < 0 before), normal impulse per unit mass  j_n = (1 + e_n) |vy|.
// Tangential direction: Coulomb friction acts for the whole contact (ASSUMED: the impact is short and the contact slips throughout),
// impulse per unit mass  j_t = min(mu j_n, |d0| k / (1 + k))  where d0 = u - vx is the slip speed of the contact point (reversed sign)
// before the impact; the second term is the value that exactly reaches rolling (d = 0), so the friction can never reverse the slip.
// Direction s = sgn(d0): when R omega > vx the contact point slides backwards, friction pushes the centre forward. The impulse changes
//      vx' = vx + s j_t,     u' = u - s j_t / k,
// so vx + k u (angular momentum about the contact point, per m R, with the normal force through it) is conserved by the friction and
// the sticking cap reaches d' = d0 - s j_t (1 + k)/k = 0. Same algebra as the corner impact in junction.ts.
//
// Energy (kinetic, translation + rotation; the impact happens at constant height so there is no potential term):
//      lost = (1/2) m (1 - e_n^2) vy^2  +  (work of the friction impulse, = (1/2) m k/(1 + k) (d0^2 - d'^2) when it acts alone),
// both terms are >= 0 for 0 <= e_n <= 1 and a friction impulse that never overshoots rolling. Tested for random states.
//
// Limits (tested): e_n = 1 and mu = 0 is perfectly elastic (nothing lost, only vy flips); mu = Infinity reaches rolling in the impact
// ("sticks") whenever it can; e_n = 0 is the corner impact of junction.ts.
//
// Neglected: contact compliance, rolling resistance during the impact, the dependence of e_n and mu on the impact speed.

export interface ImpactInput {
  /** Horizontal centre velocity before the impact, m/s (+ forward). */
  vx_mps: number
  /** Vertical centre velocity before the impact, m/s, must be < 0 (moving into the surface). */
  vy_mps: number
  /** Spin before the impact, rad/s (+ forward rolling). */
  omega_radps: number
  R_m: number
  m_kg: number
  /** Inertia factor I / (m R^2). */
  k_body: number
  /** Normal coefficient of restitution, in [0, 1]. */
  e_n: number
  /** Kinetic friction coefficient ball-surface (Infinity = always reach rolling when it can). */
  mu: number
}

export interface ImpactResult {
  vx_mps: number
  /** Rebound velocity, m/s, >= 0 (up). */
  vy_mps: number
  omega_radps: number
  energyBefore_J: number
  energyAfter_J: number
  /** Kinetic energy dissipated in the impact, J (>= 0 up to rounding). */
  energyLost_J: number
  /** Normal impulse, N s. */
  normalImpulse_Ns: number
  /** True if the friction cap was reached: the contact point does not slip after the impact (rolling). */
  sticking: boolean
}

const kineticEnergy_J = (m: number, k: number, R: number, vx: number, vy: number, omega: number): number =>
  0.5 * m * (vx * vx + vy * vy) + 0.5 * m * k * R * R * omega * omega

/** Impact of the sphere on the flat surface; see the file header. Throws if the ball is not moving into the surface or e_n is outside [0, 1]. */
export function impactSphere(inp: ImpactInput): ImpactResult {
  const { vx_mps: vx, vy_mps: vy, omega_radps: omega, R_m: R, m_kg: m, k_body: k, e_n: e, mu } = inp
  if (!(e >= 0 && e <= 1)) throw new RangeError('impactSphere: restitution must be in [0, 1]')
  if (!(vy <= 0)) throw new RangeError('impactSphere: the ball must move into the surface (vy <= 0)')
  if (!(mu >= 0)) throw new RangeError('impactSphere: friction coefficient must be >= 0')
  const vn = -vy
  const jn = (1 + e) * vn // per unit mass
  const u0 = R * omega
  const d0 = u0 - vx
  const s = d0 > 0 ? 1 : d0 < 0 ? -1 : 0
  const cap = (Math.abs(d0) * k) / (1 + k)
  const free = mu * jn
  const jt = Math.min(free, cap)
  const sticking = s !== 0 && free >= cap
  const vx1 = vx + s * jt
  const u1 = u0 - (s * jt) / k
  const vy1 = e * vn
  const before = kineticEnergy_J(m, k, R, vx, vy, omega)
  const after = kineticEnergy_J(m, k, R, vx1, vy1, u1 / R)
  return { vx_mps: vx1, vy_mps: vy1, omega_radps: u1 / R, energyBefore_J: before, energyAfter_J: after, energyLost_J: before - after, normalImpulse_Ns: m * jn, sticking }
}
