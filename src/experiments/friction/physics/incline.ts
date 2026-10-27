// Exp. 3: a bar on the rail raised at one end. Pure, DOM-free.
//
// Geometry (documented in PARAMETERS.md and on the help page): the rail pivots on the lower edge of its low end, which touches the table;
// the rack-and-pinion stand holds it at a clamp RAIL_SUPPORT_DIST_m = L along the rail from that contact point. h is the height of the rail
// underside at the clamp above the table, so sin(theta) = h / L.
// Physics (rigid-body statics and dynamics on an incline with Coulomb friction, Amontons laws):
//   at rest the bar holds while tan(theta) <= mu_s;  sliding: a = g (sin theta - mu_k cos theta) along the rail.
// During the slide theta follows the student's h(t) history (they may still be turning the crank); if they stop, theta is frozen.
import { COURSE_m, RACK_H_MAX_m, RAIL_SUPPORT_DIST_m, SLIDE_DT_s, SLIDE_TAIL_m } from './constants.ts'

/** theta = asin(h / L). h in m (clamped to [0, L]). */
export function inclineAngle_rad(h_m: number, L_m: number = RAIL_SUPPORT_DIST_m): number {
  return Math.asin(Math.min(1, Math.max(0, h_m / L_m)))
}
/** Inverse: h = L sin(theta). */
export function inclineHeight_m(theta_rad: number, L_m: number = RAIL_SUPPORT_DIST_m): number {
  return L_m * Math.sin(theta_rad)
}
/** Onset of slipping: theta = atan(mu_s) (static friction limit, f <= mu_s N with N = m g cos theta). */
export function onsetAngle_rad(mu_s: number): number { return Math.atan(mu_s) }
/** Height h at which a bar with this static coefficient starts to slip. */
export function onsetHeight_m(mu_s: number, L_m: number = RAIL_SUPPORT_DIST_m): number { return inclineHeight_m(onsetAngle_rad(mu_s), L_m) }
/** Acceleration down the rail while sliding, m/s^2: g (sin theta - mu_k cos theta). Negative: it decelerates. */
export function slideAcceleration_mps2(theta_rad: number, mu_k: number, g_mps2: number): number {
  return g_mps2 * (Math.sin(theta_rad) - mu_k * Math.cos(theta_rad))
}
/** MRUV time to cover d from rest at constant a: t = sqrt(2 d / a); Infinity if a <= 0. */
export function slideTime_s(d_m: number, a_mps2: number): number { return a_mps2 > 0 ? Math.sqrt((2 * d_m) / a_mps2) : Infinity }
/** The coefficient the student computes from theta and a (task 3 of exp. 3): mu = tan theta - a / (g cos theta). */
export function muFromSlide(theta_rad: number, a_mps2: number, g_mps2: number): number { return Math.tan(theta_rad) - a_mps2 / (g_mps2 * Math.cos(theta_rad)) }

/** Student's raising of the rack: h0 and rate segments (rate_mps from t_s on; negative lowers). Time counted from the first turn of the crank. */
export interface RaiseProfile { h0_m: number; segments: readonly { t_s: number; rate_mps: number }[] }

/** h(t) of the profile, clamped to [0, RACK_H_MAX_m]. */
export function heightAt_m(p: RaiseProfile, t_s: number): number {
  let h = p.h0_m
  const segs = p.segments
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i]!
    if (t_s <= s.t_s) break
    const end = Math.min(t_s, segs[i + 1]?.t_s ?? Infinity)
    h = Math.min(RACK_H_MAX_m, Math.max(0, h + s.rate_mps * (end - s.t_s)))
  }
  return h
}

/** First time h(t) reaches target_m (from below), or null if it never does. Exact per linear segment. */
export function timeToReach_s(p: RaiseProfile, target_m: number): number | null {
  if (p.h0_m >= target_m) return 0
  let h = p.h0_m
  const segs = p.segments
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i]!
    const end = segs[i + 1]?.t_s ?? Infinity
    if (s.rate_mps > 0) {
      const tt = s.t_s + (target_m - h) / s.rate_mps
      if (tt <= end && target_m <= RACK_H_MAX_m) return tt
    }
    if (Number.isFinite(end)) h = Math.min(RACK_H_MAX_m, Math.max(0, h + s.rate_mps * (end - s.t_s)))
  }
  return null
}

export interface SlideSample { t_s: number; s_m: number; v_mps: number; theta_rad: number }
export interface InclineRun {
  /** Time (from the first crank turn) the bar starts to slip, s; null if the rack range ends before. */
  onset_t_s: number | null
  /** h at that instant, m. */
  onset_h_m: number | null
  /** Slide samples every SLIDE_DT_s from the onset (empty if no onset). */
  slide: readonly SlideSample[]
  /** Time after the onset at which the bar has covered course_m, s; null if it stopped or the run ended first. */
  slideTime_s: number | null
  /** The bar stopped again before the course (kinetic friction won because the rail was lowered). */
  stopped: boolean
}

/**
 * Onset and slide for one trial. mu_s and mu_k are this trial's coefficients (variability.ts). The bar starts when tan(theta(t)) first
 * exceeds mu_s (exact per segment), then s'' = a(theta(t)) is integrated with RK4 at SLIDE_DT_s; theta(t) comes from the h(t) history.
 * If the bar decelerates to rest (rail lowered), it sticks again while tan(theta) <= mu_s and restarts if the rail is raised again.
 * Integration stops once the course plus SLIDE_TAIL_m is covered or after maxSlide_s.
 */
export function simulateIncline(p: RaiseProfile, mu_s: number, mu_k: number, g_mps2: number, course_m: number = COURSE_m, maxSlide_s = 15): InclineRun {
  const tOn = timeToReach_s(p, onsetHeight_m(mu_s) + 1e-12)
  if (tOn === null) return { onset_t_s: null, onset_h_m: null, slide: [], slideTime_s: null, stopped: false }
  const acc = (t: number, s: number, v: number): number => {
    void s; void v
    return slideAcceleration_mps2(inclineAngle_rad(heightAt_m(p, t)), mu_k, g_mps2)
  }
  const out: SlideSample[] = []
  let s = 0, v = 0
  let moving = true
  let slideTime: number | null = null
  let stopped = false
  const n = Math.round(maxSlide_s / SLIDE_DT_s)
  out.push({ t_s: 0, s_m: 0, v_mps: 0, theta_rad: inclineAngle_rad(heightAt_m(p, tOn)) })
  for (let i = 0; i < n; i++) {
    const t = tOn + i * SLIDE_DT_s
    const h = SLIDE_DT_s
    if (!moving) {
      // at rest: restart when tan(theta) exceeds mu_s
      if (Math.tan(inclineAngle_rad(heightAt_m(p, t))) > mu_s) { moving = true; stopped = false } else { out.push({ t_s: (i + 1) * h, s_m: s, v_mps: 0, theta_rad: inclineAngle_rad(heightAt_m(p, t + h)) }); continue }
    }
    // RK4 on (s, v)
    const k1v = acc(t, s, v), k1s = v
    const k2v = acc(t + h / 2, s + (h / 2) * k1s, v + (h / 2) * k1v), k2s = v + (h / 2) * k1v
    const k3v = acc(t + h / 2, s + (h / 2) * k2s, v + (h / 2) * k2v), k3s = v + (h / 2) * k2v
    const k4v = acc(t + h, s + h * k3s, v + h * k3v), k4s = v + h * k3v
    let vn = v + (h / 6) * (k1v + 2 * k2v + 2 * k3v + k4v)
    let sn = s + (h / 6) * (k1s + 2 * k2s + 2 * k3s + k4s)
    if (vn <= 0) { vn = 0; sn = Math.max(s, sn); moving = false; stopped = true }
    if (slideTime === null && sn >= course_m) {
      // linear interpolation inside the step
      slideTime = (i + (course_m - s) / Math.max(1e-12, sn - s)) * h
    }
    s = sn; v = vn
    out.push({ t_s: (i + 1) * h, s_m: s, v_mps: v, theta_rad: inclineAngle_rad(heightAt_m(p, t + h)) })
    if (s >= course_m + SLIDE_TAIL_m) break
  }
  return { onset_t_s: tOn, onset_h_m: heightAt_m(p, tOn), slide: out, slideTime_s: slideTime, stopped: stopped && slideTime === null }
}
