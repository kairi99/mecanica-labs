// Carbon-paper mark of the first contact, and the bounce (for the animation only). Pure; the random part is a uniform
// draw passed in (RunOffsets.u_mark), so the result is deterministic given the inputs. All numbers ASSUMED (PARAMETERS.md).
import type { BallSpec } from './constants.ts'

/** Carbon sheet on the floor: axis-aligned rectangle in the launch frame (x from the edge, z lateral), m. */
export interface PaperRect {
  xMin_m: number
  xMax_m: number
  zMin_m: number
  zMax_m: number
}

export const insidePaper = (x_m: number, z_m: number, p: PaperRect): boolean => x_m >= p.xMin_m && x_m <= p.xMax_m && z_m >= p.zMin_m && z_m <= p.zMax_m

export interface MarkParams {
  /** Median impact momentum (m |vy|) below which no mark is left, kg m/s. 0 = always marks. */
  thresholdImpulse_kgmps: number
  /** Threshold scatter: the threshold is median * (1 + spread * (2u - 1)), u uniform [0,1). */
  thresholdSpread: number
  /** Mark diameter at the reference impact momentum, m. */
  refDiameter_m: number
  /** Reference impact momentum, kg m/s (marble landing from H ~ 0.76 m). */
  refImpulse_kgmps: number
  minDiameter_m: number
  maxDiameter_m: number
}
/**
 * Marble always marks, 2-4 mm dot. Ping-pong (light): faint, may fail below the threshold. ASSUMED. The ping-pong median
 * threshold 0.009 kg m/s (+-30 %, i.e. 0.0063-0.0117) brackets its landing momentum at H = 0.76 m (~0.0100), so a faint or
 * missing mark happens sometimes.
 */
export const MARBLE_MARK: MarkParams = { thresholdImpulse_kgmps: 0, thresholdSpread: 0, refDiameter_m: 0.003, refImpulse_kgmps: 0.021, minDiameter_m: 0.002, maxDiameter_m: 0.004 }
export const PING_PONG_MARK: MarkParams = { thresholdImpulse_kgmps: 0.009, thresholdSpread: 0.3, refDiameter_m: 0.003, refImpulse_kgmps: 0.021, minDiameter_m: 0.0015, maxDiameter_m: 0.004 }
export const markParamsFor = (ball: BallSpec): MarkParams => (ball.id === 'marble' ? MARBLE_MARK : PING_PONG_MARK)

export interface CarbonMark {
  /** True if a visible mark is left (inside the paper and above the threshold). */
  left: boolean
  insidePaper: boolean
  x_m: number
  z_m: number
  /** Mark diameter, m (0 if none). */
  diameter_m: number
  /** Darkness 0..1 (0 none, 1 full): grows with impact momentum above the threshold. */
  darkness: number
}

/**
 * Mark of the FIRST contact only. Impact momentum p = m |vy|; diameter = ref * sqrt(p / p_ref) clamped to [min, max];
 * darkness = p / (p + p_ref) (ASSUMED saturating shape; marble ~0.5, ping-pong ~0.33). Contact point (x, z) is where the
 * ball's lowest point touches the paper.
 */
export function carbonMark(x_m: number, z_m: number, ball: BallSpec, vyImpact_mps: number, paper: PaperRect, u: number, mp: MarkParams = markParamsFor(ball)): CarbonMark {
  const inside = insidePaper(x_m, z_m, paper)
  const p = ball.m_kg * Math.abs(vyImpact_mps)
  const threshold = mp.thresholdImpulse_kgmps * (1 + mp.thresholdSpread * (2 * u - 1))
  const left = inside && p > threshold && p > 0
  const d = Math.min(mp.maxDiameter_m, Math.max(mp.minDiameter_m, mp.refDiameter_m * Math.sqrt(p / mp.refImpulse_kgmps)))
  return { left, insidePaper: inside, x_m, z_m, diameter_m: left ? d : 0, darkness: left ? p / (p + mp.refImpulse_kgmps) : 0 }
}

export interface Bounce {
  /** Rebound speed (vertical), m/s. */
  vUp_mps: number
  /** Apex height above the paper, m (vacuum, vy only; animation). */
  apex_m: number
  /** Horizontal distance of the second contact from the edge, m (vx kept, ASSUMED no friction loss; animation). */
  xNext_m: number
  /** Time from first to second contact, s. */
  tNext_s: number
}

/** First bounce: vertical speed times restitution e, vx unchanged. For the animation only, not the measured quantity. */
export function firstBounce(x_m: number, vxImpact_mps: number, vyImpact_mps: number, ball: BallSpec, g_mps2: number): Bounce {
  const vUp = ball.restitution * Math.abs(vyImpact_mps)
  const tNext = (2 * vUp) / g_mps2
  return { vUp_mps: vUp, apex_m: (vUp * vUp) / (2 * g_mps2), xNext_m: x_m + vxImpact_mps * tNext, tNext_s: tNext }
}
