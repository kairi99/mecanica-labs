// Teacher key generator: a pure function from the model to Markdown (no DOM, no file access).
// scripts/teacher-key.ts writes the result to docs/teacher-key.md. Every number comes from src/physics and src/analysis.
import { ANGLE_TARGET_deg, ANGLE_TOLERANCE_deg, SUPPORT_SEPARATION_m, TABLE_TILT_MAX_deg, createApparatus } from '../apparatus/index.ts'
import {
  DEFAULT_CART, G_QUITO_mps2, THETA_GUIDE_rad, acceleration_mps2, breakawayAngle_rad, constantAcceleration_mps2, crossingTime_s, deg2rad,
  effectiveMass_kg, heightDifferenceForAngle_m, idealAcceleration_mps2, inertiaRatio, rad2deg, reactionBiasTypeB_s, stateAt,
} from '../physics/index.ts'
import { TABLE_POSITIONS_CM, analyse, compare } from '../analysis/compute.ts'
import { comparisonInput } from '../analysis/fromApparatus.ts'
import { fillTableSimulated } from './simulatedReadings.ts'

const f = (x: number, d: number): string => x.toFixed(d)
const P = DEFAULT_CART

/** Model times (s) at 10..90 cm for the nominal cart (no run variability, no human timing). */
export function expectedTimes_s(): number[] {
  return TABLE_POSITIONS_CM.map((x) => (x === 0 ? 0 : crossingTime_s(x / 100, P) ?? NaN))
}

/** The fitted a, c0, c1 of the analysis machinery when every time is shifted by a constant `shift_s` (two identical readings per mark). */
export function biasedFit(shift_s: number): { a: number; sigma: number; c0: number; c1: number; vEnd: number; whole: number } {
  const t = expectedTimes_s()
  const values = TABLE_POSITIONS_CM.map((_, i) => (i === 0 ? [] : [t[i]! + shift_s, t[i]! + shift_s]))
  const r = analyse(values)
  const q = r.fit!.fit
  return { a: q.a_mps2, sigma: q.sigma_a_mps2, c0: q.c0, c1: q.c1, vEnd: r.vEnd!.fitted_mps, whole: r.whole!.v_mps }
}

export function teacherKey(): string {
  const out: string[] = []
  const push = (...l: string[]): void => { out.push(...l) }
  const th = THETA_GUIDE_rad
  const d = SUPPORT_SEPARATION_m
  const dh = heightDifferenceForAngle_m(th, d)
  const dhHi = heightDifferenceForAngle_m(deg2rad(ANGLE_TARGET_deg + ANGLE_TOLERANCE_deg), d)
  const dhLo = heightDifferenceForAngle_m(deg2rad(ANGLE_TARGET_deg - ANGLE_TOLERANCE_deg), d)
  const tiltDh = d * Math.sin(deg2rad(TABLE_TILT_MAX_deg))
  const k = inertiaRatio(P)
  const meff = effectiveMass_kg(P)
  const aIdealRigid = idealAcceleration_mps2(P)
  const aPoint = (P.g_mps2 * Math.sin(th))
  const aRoll = (P.c_rr * P.m_kg * P.g_mps2 * Math.cos(th)) / meff
  const aBear = P.F_bearing_N / meff
  const aModel = constantAcceleration_mps2(P)
  const t = expectedTimes_s()
  const aTop = acceleration_mps2(1e-9, P)

  push(
    '# Teacher key',
    '',
    '_Generated from the model by `npm run teacher-key`. Do not edit by hand; change the model (and PARAMETERS.md) instead._',
    '',
    'All cart parameters are **ASSUMED** (see PARAMETERS.md); none is a PHYWE specification. Treat the numbers as what this virtual lab produces, not as DigiCart data.',
    '',
    '## Geometry',
    '',
    `- Guide incline: ${f(ANGLE_TARGET_deg, 2)} deg (tolerance accepted by the lab: +-${f(ANGLE_TOLERANCE_deg, 2)} deg).`,
    `- Support separation d = ${f(d, 3)} m (clamp point to two-leg point, measured along the rail).`,
    `- Height difference for 1.30 deg: dh = d sin(theta) = **${f(dh * 1000, 2)} mm** (${f(dhLo * 1000, 2)} to ${f(dhHi * 1000, 2)} mm for the tolerance).`,
    `- Hidden bench tilt: uniform in +-${f(TABLE_TILT_MAX_deg, 2)} deg, worth up to +-${f(tiltDh * 1000, 1)} mm of dh. The student levels first, so the incline they create is the *change* of the height difference from the levelled state.`,
    '- Rack reading: with both stands at the same base height the rack reads about dh when the bench is level (for a tilted bench: d(sin tilt + sin(theta - tilt)) with the foot at 0, then trimmed with the foot). The preset `assembled` builds exactly this.',
    '- Marks: every 100 mm from A (0 cm) to 900 mm; AB >= 90 cm; cart front on the 0 cm mark.',
    '',
    '## Model acceleration',
    '',
    `Local g (Quito, 2800 m) = ${f(G_QUITO_mps2, 4)} m/s^2. Wheel inertia ratio k = sum(I)/(m r^2) = ${f(k, 4)}; m_eff = m(1+k) = ${f(meff, 4)} kg.`,
    '',
    '| Term | a (m/s^2) |',
    '|---|---|',
    `| Point mass g sin(theta) | ${f(aPoint, 4)} |`,
    `| With rolling wheels g sin(theta)/(1+k) (ideal, frictionless) | ${f(aIdealRigid, 4)} |`,
    `| Rolling resistance (c_rr = ${P.c_rr}) | -${f(aRoll, 5)} |`,
    `| Bearing drag (${P.F_bearing_N} N) | -${f(aBear, 5)} |`,
    `| **Model a (constant-force part)** | **${f(aModel, 4)}** |`,
    `| Air drag at v = 0.6 m/s (extra, grows with v^2) | -${f(aModel - acceleration_mps2(0.6, P), 5)} |`,
    '',
    `The model a is **${f((1 - aModel / aPoint) * 100, 1)} % below g sin(theta)**: rotational inertia of the wheels and friction. A student fit that equals g sin(theta) would be suspicious; one near the model a is expected. Static (breakaway) friction only decides whether the cart starts: it starts above ${f(rad2deg(breakawayAngle_rad(P)), 3)} deg and is not subtracted once rolling. Instantaneous a at v = 0 is ${f(aTop, 4)} m/s^2.`,
    '',
    '## Expected times and velocities (no run variability, no human timing)',
    '',
    '| x (cm) | t (s) | mean v from 0 (m/s) | v in this 10 cm step (m/s) |',
    '|---|---|---|---|',
  )
  for (let i = 1; i < t.length; i++) {
    const x = TABLE_POSITIONS_CM[i]! / 100
    push(`| ${TABLE_POSITIONS_CM[i]} | ${f(t[i]!, 3)} | ${f(x / t[i]!, 4)} | ${f(0.1 / (t[i]! - t[i - 1]!), 4)} |`)
  }
  push('', '30 cm intervals (task 3):', '')
  push('| Interval (cm) | v (m/s) |', '|---|---|')
  for (const [a, b] of [[0, 3], [3, 6], [6, 9]] as const) {
    push(`| ${TABLE_POSITIONS_CM[a]} to ${TABLE_POSITIONS_CM[b]} | ${f(0.3 / (t[b]! - t[a]!), 4)} |`)
  }
  push(
    '',
    `Whole path (task 2): ${f(0.9 / t[9]!, 4)} m/s. Each shorter interval gives a different mean velocity because v grows with time; the 10 cm values bracket the instantaneous velocity at the middle of the interval (task 5 asks the student to compare the three sets).`,
    '',
    '## From-rest relation (task 9)',
    '',
  )
  const vEndModel = stateAt(t[9]!, P).v_mps
  push(
    `For constant a from rest, v(t) = 2 x / t. Model: v(${f(t[9]!, 3)} s) = ${f(vEndModel, 4)} m/s against 2 x mean v(0..90 cm) = ${f(2 * 0.9 / t[9]!, 4)} m/s. The ${f(Math.abs(vEndModel - 1.8 / t[9]!) * 1000, 1)} mm/s gap is the air drag (the model is not exactly constant-a).`,
    '',
    '## Typical reaction-time effects',
    '',
    `The analysis assumes a Type B reaction bias of +-0.1 s (u = ${f(reactionBiasTypeB_s(), 4)} s, ASSUMED). It is common to all marks (fully correlated), so it is not part of the per-point fit weights (those use u_A and the display resolution only); the app reports its effect separately and shows it in the combined u of each mean time. Averaging 10 readings reduces the random part but **not** a constant bias between start and stop. Effect on the fit of a constant shift added to every mark time (two identical readings per mark, origin kept):`,
    '',
    '| Constant shift (s) | fitted a (m/s^2) | change vs 0 | c1 (m/s) | v at t90 from the fit | mean v 0..90 (m/s) |',
    '|---|---|---|---|---|---|',
  )
  const base = biasedFit(0)
  for (const s of [0, 0.05, 0.1, 0.2, -0.1]) {
    const b = biasedFit(s)
    push(`| ${s >= 0 ? '+' : ''}${f(s, 2)} | ${f(b.a, 4)} | ${f(b.a - base.a, 4)} (${f(((b.a - base.a) / base.a) * 100, 1)} %) | ${f(b.c1, 4)} | ${f(b.vEnd, 4)} | ${f(b.whole, 4)} |`)
  }
  push(
    '',
    `A constant late stop (positive shift) lengthens every t, so the mean velocities come out low (+0.10 s: ${f(((biasedFit(0.1).whole - base.whole) / base.whole) * 100, 1)} % on the 0..90 cm mean velocity). The quadratic fit has a free c1, which absorbs most of the shift: a barely moves (${f(((biasedFit(0.1).a - base.a) / base.a) * 100, 1)} % for +0.10 s), but c1 becomes clearly non-zero (about -2 a x shift, softened by the pinned origin), even though the cart starts from rest. So a c1 well away from 0 is the footprint of a systematic time offset, and the offset per mark in the app's comparison block (your readings minus the DigiCart true times) makes it visible. A random reaction (zero-mean) does not bias these results; it only scatters them.`,
    '',
    '## A simulated careful student',
    '',
  )
  const app = createApparatus('assembled', { seed: 1 })
  fillTableSimulated(app, { seed: 1 })
  const r = analyse(app.tableData().values_s)
  const cmp = compare(comparisonInput(app))
  const q = r.fit!.fit
  push(
    `Preset \`assembled\` (seed 1), 90 simulated readings (start press 0.20 s late, stop press 0.25 s late, 0.05 s reaction scatter): fitted a = ${f(q.a_mps2, 4)} +- ${f(q.sigma_a_mps2, 4)} m/s^2, reduced chi^2 = ${f(q.chi2_red ?? NaN, 2)}, reference a from the DigiCart true times = ${f(cmp.reference!.a_mps2, 4)} +- ${f(cmp.reference!.sigma_a_mps2, 4)}, model a = ${f(aModel, 4)} m/s^2.`,
    '',
    '## URL flags',
    '',
    '| Flag | Effect |',
    '|---|---|',
    '| `?teacher` | Shows the target dh in the checklist and the model\'s expected a in the analysis comparison block. |',
    '| `?analysis=0` | Hides the analysis panel (the region stays in the DOM, hidden). |',
    '| `?seed=N` | Fixes the hidden values (bench tilt, caliper zero error) and the run variability. |',
    '| `?preset=assembled` or `?preset=empty` | Starts from a careful student\'s bench or a bare one (ignores saved progress). |',
    '| `?tour=0` or `?tour=1` | Never or always start the first-visit tour. |',
    '| `?lang=es` or `?lang=en` | Language. |',
    '| `?theme=light` or `?theme=dark` | Theme. |',
    '| `?demo=table` | Development builds only: fills Table 1.1 with simulated readings. |',
  )
  return out.join('\n')
}
