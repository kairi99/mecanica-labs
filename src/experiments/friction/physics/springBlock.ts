// Spring-block model of exps. 1 and 2: a block on paper pulled by a spring scale whose far end the student moves. Pure, DOM-free.
//
// Physics (Newton's second law with Coulomb friction, Amontons-Coulomb laws; Hooke's law; a dashpot in parallel with the spring for the
// scale's internal damping):
//   e = x_pull - x_block      extension of the spring (natural length absorbed in x_block), m
//   F_spring = k e            what the needle shows, N
//   stuck (u = 0):  e' = v_pull; the block stays at rest while |k e + c v_pull| <= mu_s N
//   sliding (sign s): M u' = k e + c e' - s mu_k N,  e' = v_pull - u,   N = M g (horizontal pull on a level table)
// With y = e - s mu_k N / k the sliding equation is a damped oscillator, y'' + 2a y' + w0^2 y = 0 (a = c / 2M, w0^2 = k / M), solved EXACTLY
// over each step while v_pull is held constant inside it. The fixed step is PULL_DT_s; events (breakaway: stick to slip, arrest: u crosses
// zero, then stick or reverse slip) are located inside a step by bisection on the exact solution, so the result does not depend on the step.
// This reproduces the static peak mu_s N, the drop after breakaway, the plateau mu_k N at steady speed and stick-slip for slow pulls with
// a soft spring. The scale's needle is the spring extension only (the dashpot force acts on the block, it is not displayed).
import { PAPER_TRAVEL_m, PULL_DT_s, PULL_SAMPLE_s, type SurfacePair } from './constants.ts'

/** The student's hand: reaches a commanded speed with a first-order lag and pulls a little unevenly (variability.ts draws these). */
export interface HandParams {
  tau_s: number
  /** Relative amplitude of the speed wobble (0.08: +-8 %). */
  wobbleRel: number
  wobbleFreq_hz: number
  wobblePhase_rad: number
}
export const STEADY_HAND: HandParams = { tau_s: 0, wobbleRel: 0, wobbleFreq_hz: 1, wobblePhase_rad: 0 }

export interface PullParams {
  k_Npm: number
  c_Nspm: number
  /** Total sliding mass (block + masses on it), kg. */
  mass_kg: number
  mu_s: number
  mu_k: number
  g_mps2: number
  /** Block travel on the paper, m; beyond it the coefficients switch to `off` (bare table). Infinity: never leaves. */
  paperTravel_m?: number
  off?: SurfacePair
  hand: HandParams
}

/** Commanded pull speed from time t_s on, m/s (>= 0). */
export interface PullCommand { t_s: number; speed_mps: number }

export interface PullSample {
  t_s: number
  /** Spring force (needle), N. */
  F_N: number
  x_block_m: number
  v_block_mps: number
  x_pull_m: number
  sliding: boolean
}

export interface PullSummary {
  /** Time of the first breakaway (stick to slip), s; null if the block never moved. */
  breakaway_t_s: number | null
  /** Spring force at the first breakaway (the static peak), N. */
  F_breakaway_N: number | null
  /** Largest spring force in the run, N. */
  F_max_N: number
  /** Number of times the sliding block came to rest again (stick-slip). */
  restickCount: number
  /** Time the block left the paper, s, or null. */
  leftPaper_t_s: number | null
}

/** Exact damped-oscillator update y'' + 2a y' + w0^2 y = 0 over h (underdamped). */
function dampedStep(y0: number, yp0: number, w0sq: number, a: number, h: number): [number, number] {
  const wd2 = w0sq - a * a
  if (!(wd2 > 0)) throw new Error('spring-block model needs an underdamped scale (c < 2 sqrt(k M))')
  const wd = Math.sqrt(wd2)
  const B = (yp0 + a * y0) / wd
  const d = Math.exp(-a * h)
  const cs = Math.cos(wd * h), sn = Math.sin(wd * h)
  return [d * (y0 * cs + B * sn), d * ((-a * y0 + wd * B) * cs + (-a * B - wd * y0) * sn)]
}

/** Incremental simulator: append speed commands in time order and advance. Deterministic given the parameters and commands. */
export class PullSimulator {
  readonly p: PullParams
  private t = 0
  private e = 0
  private u = 0
  private xp = 0
  private vh = 0
  private vcmd = 0
  private mode: 'stick' | 'slip' = 'stick'
  private dir = 1
  private w0sq: number
  private a: number
  private out: PullSample[] = []
  private nextSample = 0
  private breakaway_t: number | null = null
  private F_break: number | null = null
  private F_max = 0
  private resticks = 0
  private left_t: number | null = null

  constructor(p: PullParams) {
    this.p = p
    this.w0sq = p.k_Npm / p.mass_kg
    this.a = p.c_Nspm / (2 * p.mass_kg)
    this.record()
  }

  get time_s(): number { return this.t }
  /** Stored series (every PULL_SAMPLE_s plus the final instant). */
  samples(): readonly PullSample[] { return this.out }
  /** Exact state at the current time. */
  now(): PullSample {
    return { t_s: this.t, F_N: this.p.k_Npm * this.e, x_block_m: this.xp - this.e, v_block_mps: this.mode === 'stick' ? 0 : this.u, x_pull_m: this.xp, sliding: this.mode === 'slip' }
  }
  /** State at an earlier (or the current) time: the exact current state, or a linear interpolation of the stored samples. */
  stateAt(t_s: number): PullSample {
    if (t_s >= this.t - 1e-12) return this.now()
    const xs = this.out
    let lo = 0, hi = xs.length - 1
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (xs[mid]!.t_s <= t_s) lo = mid; else hi = mid }
    const a = xs[lo]!, b = xs[hi]!
    const w = b.t_s > a.t_s ? Math.min(1, Math.max(0, (t_s - a.t_s) / (b.t_s - a.t_s))) : 0
    const L = (x: number, y: number): number => x + (y - x) * w
    return { t_s, F_N: L(a.F_N, b.F_N), x_block_m: L(a.x_block_m, b.x_block_m), v_block_mps: L(a.v_block_mps, b.v_block_mps), x_pull_m: L(a.x_pull_m, b.x_pull_m), sliding: w < 0.5 ? a.sliding : b.sliding }
  }
  summary(): PullSummary {
    return { breakaway_t_s: this.breakaway_t, F_breakaway_N: this.F_break, F_max_N: this.F_max, restickCount: this.resticks, leftPaper_t_s: this.left_t }
  }

  /** Change the commanded speed at t_s (>= current time). The simulation is advanced to t_s first. */
  setSpeed(t_s: number, speed_mps: number): void {
    this.advanceTo(t_s)
    this.vcmd = Math.max(0, speed_mps)
  }

  private coeffs(): { mu_s: number; mu_k: number } {
    const travel = this.p.paperTravel_m ?? PAPER_TRAVEL_m
    return this.p.off && this.xp - this.e > travel ? this.p.off : this.p
  }
  private record(): void {
    const s = this.now()
    this.F_max = Math.max(this.F_max, s.F_N)
    this.out.push(s)
  }
  /** Pull speed over the step starting at t of length h (hand lag evaluated at the midpoint, wobble at the midpoint). */
  private pullSpeed(h: number): number {
    const { tau_s, wobbleRel, wobbleFreq_hz, wobblePhase_rad } = this.p.hand
    const mid = h / 2
    const base = tau_s > 0 ? this.vcmd + (this.vh - this.vcmd) * Math.exp(-mid / tau_s) : this.vcmd
    const w = base > 0 && wobbleRel > 0 ? 1 + wobbleRel * Math.sin(2 * Math.PI * wobbleFreq_hz * (this.t + mid) + wobblePhase_rad) : 1
    return base * w
  }

  /** Advance to time t_s with fixed steps of PULL_DT_s (last one shorter). */
  advanceTo(t_s: number): void {
    while (this.t < t_s - 1e-12) {
      const h = Math.min(PULL_DT_s, t_s - this.t)
      this.step(h)
      if (this.t >= this.nextSample - 1e-12) { this.record(); this.nextSample += PULL_SAMPLE_s }
    }
    const last = this.out[this.out.length - 1]!
    if (last.t_s < this.t - 1e-12) this.record()
  }

  private step(h: number): void {
    const { k_Npm: k, c_Nspm: c, mass_kg: M, g_mps2: g } = this.p
    const N = M * g
    const vp = this.pullSpeed(h)
    const t0 = this.t
    let rem = h
    for (let guard = 0; rem > 1e-15 && guard < 40; guard++) {
      const co = this.coeffs()
      const muS = co.mu_s * N, muK = co.mu_k * N
      if (this.mode === 'stick') {
        const Ftot = k * this.e + c * vp
        if (Math.abs(Ftot) >= muS) { this.startSlip(Math.sign(Ftot) || 1, t0 + (h - rem), k * this.e); continue }
        let tt = Infinity
        if (vp > 0) tt = ((muS - c * vp) / k - this.e) / vp
        else if (vp < 0) tt = ((-muS - c * vp) / k - this.e) / vp
        if (tt <= rem) { this.e += vp * tt; this.xp += vp * tt; rem -= tt; this.startSlip(vp > 0 ? 1 : -1, t0 + (h - rem), k * this.e) } else { this.e += vp * rem; this.xp += vp * rem; rem = 0 }
      } else {
        const s = this.dir
        const ek = (s * muK) / k
        const y0 = this.e - ek, yp0 = vp - this.u
        const [y1, yp1] = dampedStep(y0, yp0, this.w0sq, this.a, rem)
        const u1 = vp - yp1
        if (s * u1 >= 0) {
          this.xp += vp * rem; this.e = y1 + ek; this.u = u1; rem = 0
        } else {
          // arrest inside the step: bisection on the exact u(tau) = vp - y'(tau), s u > 0 at 0 and < 0 at rem
          let lo = 0, hi = rem
          for (let i = 0; i < 60; i++) {
            const mid = (lo + hi) / 2
            const [, ypm] = dampedStep(y0, yp0, this.w0sq, this.a, mid)
            if (s * (vp - ypm) > 0) lo = mid
            else hi = mid
          }
          const tau = hi
          const [yt] = dampedStep(y0, yp0, this.w0sq, this.a, tau)
          this.xp += vp * tau; this.e = yt + ek; this.u = 0; rem -= tau
          const Ftot = k * this.e + c * vp
          if (Math.abs(Ftot) <= muS) { this.mode = 'stick'; this.resticks++ } else this.dir = Math.sign(Ftot) || 1
          if (tau <= 1e-15 && rem > 0) { this.mode = 'stick'; this.resticks++ } // numerical grazing: treat as arrested
        }
      }
    }
    this.vh = this.p.hand.tau_s > 0 ? this.vcmd + (this.vh - this.vcmd) * Math.exp(-h / this.p.hand.tau_s) : this.vcmd
    this.t = t0 + h
    if (this.left_t === null && this.xp - this.e > (this.p.paperTravel_m ?? PAPER_TRAVEL_m)) this.left_t = this.t
    this.F_max = Math.max(this.F_max, k * this.e)
  }

  private startSlip(dir: number, t_s: number, F_N: number): void {
    this.mode = 'slip'
    this.dir = dir
    this.u = 0
    if (this.breakaway_t === null) { this.breakaway_t = t_s; this.F_break = F_N }
  }
}

/** Run a whole pull: commands sorted by time, simulated to duration_s. */
export function simulatePull(p: PullParams, commands: readonly PullCommand[], duration_s: number): { samples: readonly PullSample[]; summary: PullSummary } {
  const sim = new PullSimulator(p)
  for (const c of [...commands].sort((a, b) => a.t_s - b.t_s)) { if (c.t_s > duration_s) break; sim.setSpeed(c.t_s, c.speed_mps) }
  sim.advanceTo(duration_s)
  return { samples: sim.samples(), summary: sim.summary() }
}

/** Mean spring force over samples in [t0, t1], N (plateau of the constant-speed part). */
export function meanForce_N(samples: readonly PullSample[], t0_s: number, t1_s: number): number {
  const xs = samples.filter((s) => s.t_s >= t0_s && s.t_s <= t1_s)
  return xs.length ? xs.reduce((a, s) => a + s.F_N, 0) / xs.length : NaN
}
