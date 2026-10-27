// Teacher key generator for Practica 3: a pure function from the model to Markdown (no DOM, no file access).
// scripts/teacher-key.ts writes the result to docs/teacher-key-newton2.md. Every number comes from the physics layer, the
// apparatus (a simulated careful student) and the analysis layer.
import {
  CANISTER_HANG_m, DEFAULT_PULLEY, G_QUITO_mps2, NOMINAL_PARTS, NO_VARIABILITY, PULLEY_AHEAD_OF_STOP_m, STRING_ABOVE_RAIL_m,
  BENCH_HEIGHT_m, SUPPORT_BASE_HEIGHT_m, constantAcceleration_mps2, crossingTime_s, deg2rad, effectiveMass_kg, idealAcceleration_mps2,
  linearFit, reactionBiasTypeB_s, totalMass_kg, wheelInertiaMass_kg, type Newton2Params, type RunGeometry,
} from '../physics/index.ts'
import { DISTANCE_TARGET_m, TABLE_TILT_MAX_deg, createApparatus, type RunRecord } from '../apparatus/index.ts'
import { DISTANCE_m, analyse } from '../analysis/compute.ts'
import { analysisFromApparatus } from '../analysis/fromApparatus.ts'
import { fillTableSimulated } from './simulatedReadings.ts'

const f = (x: number, d: number): string => x.toFixed(d)

interface TrialRow { n: number; run: RunRecord }

/** One noise-free release per trial of a careful student's bench (nominal masses, no variability, level rail). */
function nominalTrials(): TrialRow[] {
  const app = createApparatus('assembled', { seed: 1, tableTilt_rad: 0, parts: NOMINAL_PARTS, variability: NO_VARIABILITY })
  const out: TrialRow[] = []
  for (const n of [4, 3, 2, 1, 0]) {
    app.setTrial(n)
    if (app.getState().cart.released) app.resetCart()
    const r = app.releaseCart(1000 * (out.length + 1))
    if (r.ok) out.push({ n, run: app.getRun(r.runId)! })
  }
  return out
}

/** Time to cover d with the full model (RK4 + Brent), s. */
const tOf = (p: Newton2Params, geo: RunGeometry, d = DISTANCE_m): number => crossingTime_s(d, p, geo) ?? NaN
const aOf = (t: number, d = DISTANCE_m): number => (2 * d) / (t * t)

/** Linear fit F = M a + F0 through the model accelerations of the trials (exact data: no noise), with an optional change of parameters. */
export function modelFit(trials: readonly TrialRow[], change: (p: Newton2Params) => Newton2Params = (p) => p): { M: number; F0: number } {
  const a: number[] = [], F: number[] = []
  for (const { run } of trials.filter((x) => x.n >= 1)) {
    const p = change(run.params)
    a.push(aOf(tOf(p, run.geo)))
    F.push(p.mHang_kg * p.g_mps2)
  }
  const fit = linearFit(a, F)
  return { M: fit.slope, F0: fit.intercept }
}

export function teacherKey(): string {
  const out: string[] = []
  const push = (...l: string[]): void => { out.push(...l) }
  const g = G_QUITO_mps2
  const trials = nominalTrials()
  const first = trials[0]!.run
  const P0 = first.params
  const four = trials.filter((x) => x.n >= 1)
  const Mt = totalMass_kg(P0) // trial with all four masses in the canister: no plastic screw yet
  const mWheel = wheelInertiaMass_kg(P0.cart)
  const base = modelFit(four)
  const fitTilt = (deg: number) => modelFit(four, (p) => ({ ...p, tilt_rad: deg2rad(deg) }))
  const tiltSmall = fitTilt(0.025)
  const tiltBig = fitTilt(TABLE_TILT_MAX_deg)
  const tiltNeg = fitTilt(-0.025)
  const noFriction = modelFit(four, (p) => ({
    ...p, cart: { ...p.cart, c_rr: 0, F_bearing_N: 0, Cd: 0, F_breakaway_N: 0, wheelMass_kg: 0 }, pulley: { inertiaMass_kg: 0, F_friction_N: 0 }, mString_kg: 0,
  }))
  const sReceiver = first.geo.sReceiver_m
  const hang0 = BENCH_HEIGHT_m + SUPPORT_BASE_HEIGHT_m + STRING_ABOVE_RAIL_m - CANISTER_HANG_m - first.geo.sFloor_m
  const hangMax = BENCH_HEIGHT_m + SUPPORT_BASE_HEIGHT_m + STRING_ABOVE_RAIL_m - CANISTER_HANG_m - DISTANCE_TARGET_m

  push(
    '# Teacher key: Practica 3, force and acceleration',
    '',
    '_Generated from the model by `npm run teacher-key`. Do not edit by hand; change the model (and PARAMETERS.md) instead._',
    '',
    'All masses, resistances and bench heights are **ASSUMED** (see PARAMETERS.md, section Practica 3); none is a PHYWE specification. Treat the numbers as what this virtual lab produces, not as DigiCart data.',
    '',
    '## Geometry',
    '',
    `- Rail 1.2 m, stand end at one end (rack stand), receiver with pulley at the other, supports ${f(1.1, 2)} m apart. The cart front starts at the 0 cm mark (100 mm on the printed scale in the \`assembled\` preset) and runs ${f(DISTANCE_TARGET_m * 100, 0)} cm to the end mark; the receiver stop is ${f(sReceiver * 100, 1)} cm from the start (${f((sReceiver - DISTANCE_TARGET_m) * 100, 1)} cm of free travel after the end mark).`,
    `- Level: the bench tilt is hidden, uniform in +-${f(TABLE_TILT_MAX_deg, 2)} deg. A centred bubble allows up to about +-0.025 deg (0.5 mm of bubble); the receiver foot (0.05 mm steps) trims it.`,
    `- String: from the brass screw over the pulley to the canister knot. The pulley contact is ${f(PULLEY_AHEAD_OF_STOP_m * 100, 1)} cm beyond the stop face, so the hanging length at the release is hang0 = L - ${f((sReceiver + PULLEY_AHEAD_OF_STOP_m) * 100, 1)} cm. Too short (hang0 < 0): the string does not reach the pulley from the start mark. Too long: the canister (bottom ${f(CANISTER_HANG_m * 100, 0)} cm below the knot; string ${f((BENCH_HEIGHT_m + SUPPORT_BASE_HEIGHT_m + STRING_ABOVE_RAIL_m) * 100, 0)} cm above the floor) meets the floor after ${f(first.geo.sFloor_m * 100, 1)} cm of travel with hang0 = ${f(hang0 * 100, 1)} cm; it must be farther than ${f(DISTANCE_TARGET_m * 100, 0)} cm, so hang0 must lie between 0 and ${f(hangMax * 100, 1)} cm.`,
    `- After the canister hits the floor the string goes slack and the cart coasts and decelerates (rolling resistance, bearings, air): its timing is no longer a constant-force run. The run record says so (\`canisterHitsFloor\`).`,
    `- Local g (Quito, 2800 m) = ${f(g, 4)} m/s^2.`,
    '',
    '## Masses',
    '',
    `Nominal: bare cart ${f(P0.cart.m_kg * 1000, 1)} g, brass screw ${f(NOMINAL_PARTS.brassScrew_kg * 1000, 1)} g, canister with lid ${f(NOMINAL_PARTS.canister_kg * 1000, 1)} g, four masses 4 x 10.0 g, plastic screw ${f(NOMINAL_PARTS.plasticScrew_kg * 1000, 1)} g each. Hidden per-bench tolerance: masses +-0.1 g, canister +-0.3 g (so the balance, 0.1 g, shows about the nominal values).`,
    `- Mt as the guide defines it (cart with brass screw, canister with lid, four masses) = **${f(Mt * 1000, 1)} g**.`,
    `- Each mass moved to the cart needs a plastic screw (${f(NOMINAL_PARTS.plasticScrew_kg * 1000, 1)} g): trial with k masses on the cart has a total mass Mt + k x ${f(NOMINAL_PARTS.plasticScrew_kg * 1000, 1)} g. This real effect is kept; it is 0.8 % of Mt after three moves and explains a small part of any mass discrepancy.`,
    `- Rotational inertia: the four wheels add ${f(mWheel * 1000, 1)} g and the pulley ${f(DEFAULT_PULLEY.inertiaMass_kg * 1000, 1)} g to the inertia, string ${f(P0.mString_kg * 1000, 1)} g (all ASSUMED): M_eff = Mt + ${f((effectiveMass_kg(P0) - totalMass_kg(P0)) * 1000, 1)} g.`,
    '',
    '## Expected values per trial (task 2 and 3 reference)',
    '',
    '| Masses in canister | F = m g (N) | Total mass (g) | a ideal F/Mt (m/s^2) | a model (m/s^2) | t ideal (s) | t model (s) |',
    '|---|---|---|---|---|---|---|',
  )
  for (const { n, run } of trials) {
    const p = run.params
    const t = tOf(p, run.geo)
    const aIdeal = idealAcceleration_mps2(p)
    push(`| ${n} | ${f(p.mHang_kg * g, 3)} | ${f(totalMass_kg(p) * 1000, 1)} | ${f(aIdeal, 3)} | ${f(aOf(t), 3)} | ${f(Math.sqrt((2 * DISTANCE_m) / aIdeal), 2)} | ${f(t, 2)} |`)
  }
  push(
    '',
    `Constant-force acceleration of the full model without air drag for the first trial: ${f(constantAcceleration_mps2(P0), 4)} m/s^2.`,
    '',
    '## Fit F = M_fit a + F0 (task 5 and 6, noise-free model data, trials 4 to 1)',
    '',
    '| Case | M_fit (g) | M_fit - Mt (g) | F0 (mN) |',
    '|---|---|---|---|',
    `| No friction, no rotational inertia, level | ${f(noFriction.M * 1000, 1)} | ${f((noFriction.M - Mt) * 1000, 1)} | ${f(noFriction.F0 * 1000, 2)} |`,
    `| Full model, level rail | ${f(base.M * 1000, 1)} | ${f((base.M - Mt) * 1000, 1)} | ${f(base.F0 * 1000, 2)} |`,
    `| Full model, tilt +0.025 deg (slopes toward the pulley) | ${f(tiltSmall.M * 1000, 1)} | ${f((tiltSmall.M - Mt) * 1000, 1)} | ${f(tiltSmall.F0 * 1000, 2)} |`,
    `| Full model, tilt -0.025 deg | ${f(tiltNeg.M * 1000, 1)} | ${f((tiltNeg.M - Mt) * 1000, 1)} | ${f(tiltNeg.F0 * 1000, 2)} |`,
    `| Full model, unlevelled bench ${f(TABLE_TILT_MAX_deg, 2)} deg | ${f(tiltBig.M * 1000, 1)} | ${f((tiltBig.M - Mt) * 1000, 1)} | ${f(tiltBig.F0 * 1000, 2)} |`,
    '',
    `With no resistance the slope of F(a) is close to the total mass Mt: slightly below it and with a small positive intercept, because each force step adds a plastic screw to the cart (the total mass grows as F falls). With the model the slope is larger than Mt (wheel, pulley and string inertia) and the intercept F0 is positive: it is the friction force the canister has to overcome. A tilt toward the pulley lowers F0 (the cart's weight helps), a tilt away raises it; the slope barely changes.`,
    '',
    '## Effect of a stop lag on the timings',
    '',
  )
  const shiftFit = (shift: number): { M: number; F0: number } => {
    const values = trials.filter((x) => x.n >= 1).map(({ run }) => { const t = tOf(run.params, run.geo) + shift; return [t, t] })
    const forces = trials.filter((x) => x.n >= 1).map(({ run }) => run.params.mHang_kg * g)
    const r = analyse({ forces_N: forces, values_s: values, Mt_kg: Mt })
    return { M: r.fit!.M_kg, F0: r.fit!.F0_N }
  }
  const lag = shiftFit(0.1)
  const bias = reactionBiasTypeB_s()
  push(
    `A constant +0.1 s added to every time (the stop press later than the start press by that much) gives M_fit = ${f(lag.M * 1000, 1)} g (${f(((lag.M - base.M) / base.M) * 100, 1)} % from the model value) and F0 = ${f(lag.F0 * 1000, 1)} mN. The analysis lists the effect of one standard uncertainty of that bias (${f(bias, 3)} s) separately; it never enters the fit weights.`,
    '',
    '## A simulated careful student',
    '',
  )
  const app = createApparatus('assembled', { seed: 1 })
  const n = fillTableSimulated(app, { seed: 1 })
  const res = analysisFromApparatus(app)
  push(`Trials 4 to 1, ${n} timings, start lag 0.20 s and stop lag 0.25 s (sd 0.05 s), seeded run variability. Mt recorded from the balance: ${f(res.massComparison!.Mt_kg * 1000, 1)} g.`, '', '| Masses | F (N) | t mean (s) | Delta t (s) | a (m/s^2) | Delta a (m/s^2) |', '|---|---|---|---|---|---|')
  for (const t of res.trials.filter((x) => x.n > 0)) push(`| ${t.massesInCanister} | ${f(t.F_N ?? NaN, 2)} | ${f(t.mean_s!, 3)} | ${f(t.uTotal_s!, 3)} | ${f(t.a_mps2!, 3)} | ${f(t.u_a_mps2!, 3)} |`)
  const fit = res.fit!
  push(
    '',
    `Fit: M_fit = ${f(fit.M_kg * 1000, 1)} +- ${f(fit.sigma_M_kg * 1000, 1)} g, F0 = ${f(fit.F0_N * 1000, 1)} +- ${f(fit.sigma_F0_N * 1000, 1)} mN, reduced chi^2 = ${f(fit.fit.chi2_red ?? NaN, 1)}; error against Mt ${f(res.massComparison!.error_pct, 1)} %. The weights hold only the random part of the timings; the lag of the stop press relative to the start press is common to all readings, a systematic the fit does not see (it is listed in the analysis as a separate effect).`,
    '',
    '## Guide tasks: what to look for',
    '',
    '- Task 1 (MRU or MRUV): the DigiCart log (x(t)) is a parabola from rest: uniform acceleration while the string is taut.',
    '- Task 4 (Newton for the ideal system): m g = (M + m) a. The app does not write it for the student.',
    '- Task 5/7/8: the slope of F(a) is the mass the force accelerates; friction, rotational inertia, a tilted rail, the plastic screws, the mass tolerance, reaction time and the floor are the error sources the simulation contains.',
    '- Common mistakes the model produces: a string too long (canister on the floor before 90 cm), masses removed instead of moved (Mt changes: the points no longer lie on one line), rail not levelled (intercept shifts), timing a coast after the floor impact.',
  )
  return out.join('\n')
}
