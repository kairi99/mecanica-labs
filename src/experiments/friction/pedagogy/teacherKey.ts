// Teacher key generator for Practica 4: a pure function from the model to Markdown (no DOM, no file access).
// scripts/teacher-key.ts writes the result to docs/teacher-key-friction.md. Every number comes from the physics layer and the analysis layer.
// It states what this virtual lab produces; it never answers the guide's qualitative questions for the student's report in the app.
import {
  BAR_IDS, BAR_PAIRS, BAR_SCATTER, BLOCK_MASS_NOMINAL_kg, CONTACT_BETA_spm, COURSE_m, FACE_IDS, FACE_PAIRS, FACE_SCATTER, G_QUITO_mps2, MASS_NOMINAL_kg, PAPER_TRAVEL_m,
  PullSimulator, RAIL_SUPPORT_DIST_m, STEADY_HAND, inclineAngle_rad, mean, mulberry32, muFromSlide, onsetHeight_m, sampleSd, sampleTrialCoefficients,
  simulateIncline, slideAcceleration_mps2, slideTime_s, type BarId, type FaceId, type PullParams,
} from '../physics/index.ts'
import { SPRING_SCALES, type SpringScaleId } from '../../../core/instruments/springScale.ts'
import { inclineTrial, slideTimeUncertainty_s } from '../analysis/compute.ts'

const f = (x: number, d: number): string => x.toFixed(d)
const g = G_QUITO_mps2
const N_MC = 300
const FACE_NAME: Record<FaceId, string> = { cloth: 'Cloth (tela)', sandpaper: 'Sandpaper (lija)' }
const BAR_NAME: Record<BarId, string> = { wood: 'Wood (madera)', aluminium: 'Aluminium (aluminio)', iron: 'Iron (hierro)' }

/** Nominal pull of a bench with the given face, added masses and scale; steady hand (no wobble) at speed v. */
function pullParams(face: FaceId, masses: number, scale: SpringScaleId): PullParams {
  const spec = SPRING_SCALES[scale]
  return {
    k_Npm: spec.k_Npm, c_Nspm: spec.damping_Nspm, mass_kg: BLOCK_MASS_NOMINAL_kg + masses * MASS_NOMINAL_kg, mu_s: FACE_PAIRS[face].mu_s, mu_k: FACE_PAIRS[face].mu_k,
    beta_spm: CONTACT_BETA_spm, g_mps2: g, paperTravel_m: PAPER_TRAVEL_m, hand: STEADY_HAND,
  }
}
const ADVISED_mps = 0.04
/** Lowest speed on a 0.005 m/s grid (up to 0.1 m/s) above which a steady-hand pull never re-sticks after the breakaway. */
function minSteadySpeed(face: FaceId, masses: number, scale: SpringScaleId): number {
  let vmin = 0.1
  for (let v = 0.1; v >= 0.005 - 1e-9; v -= 0.005) {
    const p = { ...pullParams(face, masses, scale), paperTravel_m: Infinity }
    const peak = (p.mu_s * p.mass_kg * g) / p.k_Npm
    const sim = pullTrace(p, v, peak / v + 0.4 / v + 3)
    if (sim.summary().restickCount > 0) break
    vmin = v
  }
  return vmin
}
function pullTrace(p: PullParams, v_mps: number, T_s: number): PullSimulator {
  const sim = new PullSimulator(p)
  sim.setSpeed(0, v_mps)
  sim.advanceTo(T_s)
  return sim
}

export function teacherKey(): string {
  const out: string[] = []
  const push = (...l: string[]): void => { out.push(...l) }
  push(
    '# Teacher key: Practica 4, friction force',
    '',
    '_Generated from the model by `npm run teacher-key`. Do not edit by hand; change the model (and PARAMETERS.md) instead._',
    '',
    'Every friction coefficient, mass and scale constant is **ASSUMED** (see PARAMETERS.md, section Practica 4). The numbers are what this virtual lab produces, not measured data of the real bench, and not literature values: the student looks up their own (task 7).',
    '',
    '## Bench the numbers refer to',
    '',
    `- Local g (Quito, 2800 m) = ${f(g, 4)} m/s^2. Block mass ${f(BLOCK_MASS_NOMINAL_kg * 1000, 0)} g (each bench draws it within +-6 g; the student weighs it), silver masses ${f(MASS_NOMINAL_kg * 1000, 0)} g.`,
    `- Scales: 1 N (division ${SPRING_SCALES['1N'].division_N} N, k = ${SPRING_SCALES['1N'].k_Npm} N/m) and 2 N (division ${SPRING_SCALES['2N'].division_N} N, k = ${SPRING_SCALES['2N'].k_Npm} N/m).`,
    `- Rail 1.2 m resting on the table at its low end, raised by the rack-and-pinion stand at ${f(RAIL_SUPPORT_DIST_m, 2)} m from the contact point: sin(theta) = h / ${f(RAIL_SUPPORT_DIST_m, 2)} m, h = height of the rail underside at the clamp. Course ${f(COURSE_m, 2)} m.`,
    '- Trial-to-trial scatter (seeded per bench): static coefficient ' + `${f(FACE_SCATTER.sigma_mu_s_rel * 100, 0)} % and kinetic ${f(FACE_SCATTER.sigma_mu_k_rel * 100, 0)} % (faces); ${f(BAR_SCATTER.sigma_mu_s_rel * 100, 0)} % and ${f(BAR_SCATTER.sigma_mu_k_rel * 100, 0)} % (bars).`,
    '',
    '## Experiment 1: force at constant speed (Tabla 4.1)',
    '',
    `F_k = mu_k (M + m) g (1 + beta v), with the ASSUMED velocity strengthening beta = ${CONTACT_BETA_spm} s/m (the parameter that lets the stick-slip settle into a plateau): at the advised pull speed ${ADVISED_mps * 100} cm/s the plateau is ${f(CONTACT_BETA_spm * ADVISED_mps * 100, 1)} % above mu_k W. "Min. steady speed" is the lowest pull speed on a 0.005 m/s grid above which no run shows a re-stick (stick-slip) with a steady hand and no travel limit; below it the needle oscillates between about mu_k N and mu_s N. "Readable" is how long the needle stays within 3 % of its final value while the block is still on the ${f(PAPER_TRAVEL_m, 2)} m of paper, at ${ADVISED_mps * 100} cm/s.`,
    '',
  )
  push('| Face | Added mass (g) | W = (M+m) g (N) | Expected F_k at 4 cm/s (N) | Plateau, sim (N) | Min. steady speed, 1 N (cm/s) | Min. steady speed, 2 N (cm/s) | Readable at 4 cm/s, 2 N (s) | 1 N scale |', '|---|---|---|---|---|---|---|---|---|')
  for (const face of FACE_IDS) {
    for (let k = 0; k < 4; k++) {
      const W = (BLOCK_MASS_NOMINAL_kg + k * MASS_NOMINAL_kg) * g
      const Fk = FACE_PAIRS[face].mu_k * W * (1 + CONTACT_BETA_spm * ADVISED_mps)
      const sim = pullTrace(pullParams(face, k, '2N'), ADVISED_mps, 3 + 0.3 / ADVISED_mps)
      const left = sim.summary().leftPaper_t_s ?? sim.time_s
      const on = sim.samples().filter((s) => s.t_s <= left)
      let settled = 0
      for (const sm of on) if (Math.abs(sm.F_N - Fk) > 0.03 * Fk) settled = sm.t_s
      const plateau = mean(on.filter((s) => s.t_s >= settled + 0.2 && s.t_s <= left).map((s) => s.F_N))
      const v1 = minSteadySpeed(face, k, '1N'), v2 = minSteadySpeed(face, k, '2N')
      push(`| ${FACE_NAME[face]} | ${k * 50} | ${f(W, 3)} | ${f(Fk, 3)} | ${f(plateau, 3)} | ${f(v1 * 100, 1)} | ${f(v2 * 100, 1)} | ${f(Math.max(0, left - settled), 1)} | ${Fk > 0.9 ? 'overranges or nearly (use 2 N)' : 'fits'} |`)
    }
  }
  push(
    '',
    `Advice for the help page: pull at 4 to 5 cm/s or faster for every load (all the minimum steady speeds above are below 4 cm/s); the first part of the pull is spent stretching the spring (the block does not move), so the ${f(PAPER_TRAVEL_m, 2)} m of paper is used only after the breakaway. Pulls below the minimum steady speed show stick-slip with the soft 1 N spring.`,
    '',
    '### Expected fits (weighted straight line of mean force against weight)',
    '',
    '| Face | Expected slope mu_k (1 + beta v), v = 4 cm/s | Expected intercept (N) |', '|---|---|---|',
  )
  for (const face of FACE_IDS) push(`| ${FACE_NAME[face]} | ${f(FACE_PAIRS[face].mu_k * (1 + CONTACT_BETA_spm * ADVISED_mps), 3)} (assumed mu_k ${f(FACE_PAIRS[face].mu_k, 2)}) | 0 (a non-zero intercept means a zero error: a scale not zeroed horizontally gives about ${f(-SPRING_SCALES['1N'].movingMass_kg * g, 3)} N on the 1 N scale) |`)
  push('', '### Static peak against pull speed', '', 'The needle shows the spring force k e; the barrel damping (c = ' + SPRING_SCALES['1N'].damping_Nspm + ' N s/m) makes it read c v below mu_s N during the build-up. Cloth and sandpaper, no added mass, 2 N scale.', '', '| Face | mu_s M g (N) | Peak at 1 cm/s (N) | at 5 cm/s (N) | at 10 cm/s (N) |', '|---|---|---|---|---|')
  for (const face of FACE_IDS) {
    const pk = (v: number): number => { const sim = pullTrace(pullParams(face, 0, '2N'), v, 5 + 3 / v); return sim.summary().F_breakaway_N! }
    push(`| ${FACE_NAME[face]} | ${f(FACE_PAIRS[face].mu_s * BLOCK_MASS_NOMINAL_kg * g, 3)} | ${f(pk(0.01), 3)} | ${f(pk(0.05), 3)} | ${f(pk(0.1), 3)} |`)
  }
  push('', '## Experiment 2: peak force before breakaway (Tabla 4.2)', '', 'F_max = mu_s M g (no added mass). The "reading" columns are the needle at the peak and when the student presses 0.2 s and 0.5 s after it (pull at 5 mm/s, nominal bench, 1 N scale for the cloth face, 2 N for the sandpaper face).', '')
  push('| Face | Expected peak mu_s M g (N) | Peak, sim (N) | Press +0.2 s (N) | Press +0.5 s (N) | mu_s from a +0.2 s press |', '|---|---|---|---|---|---|')
  for (const face of FACE_IDS) {
    const scale: SpringScaleId = face === 'cloth' ? '1N' : '2N'
    const p = pullParams(face, 0, scale)
    const sim = new PullSimulator(p)
    sim.setSpeed(0, 0.005)
    sim.advanceTo(40)
    const s = sim.summary()
    const tb = s.breakaway_t_s!
    const at = (t: number): number => sim.stateAt(t).F_N
    const Mg = BLOCK_MASS_NOMINAL_kg * g
    push(`| ${FACE_NAME[face]} | ${f(FACE_PAIRS[face].mu_s * Mg, 3)} | ${f(s.F_breakaway_N!, 3)} | ${f(at(tb + 0.2), 3)} | ${f(at(tb + 0.5), 3)} | ${f(at(tb + 0.2) / Mg, 3)} (true ${f(FACE_PAIRS[face].mu_s, 3)}) |`)
  }
  push('', 'A late press catches the dropped (kinetic-like) force, so the static coefficient comes out too low and may even fall below mu_k: the human-reaction point of the lab.', '')
  // scatter MC
  push(`### Trial scatter (${N_MC} seeded draws)`, '', '| Face | mean mu_s | sd mu_s | mean mu_k | sd mu_k | sd of a single peak reading (N, M g = ' + f(BLOCK_MASS_NOMINAL_kg * g, 3) + ' N) |', '|---|---|---|---|---|---|')
  for (const face of FACE_IDS) {
    const rng = mulberry32(1)
    const xs = Array.from({ length: N_MC }, () => sampleTrialCoefficients(rng, FACE_PAIRS[face], FACE_SCATTER))
    const ms = xs.map((x) => x.mu_s), mk = xs.map((x) => x.mu_k)
    push(`| ${FACE_NAME[face]} | ${f(mean(ms), 3)} | ${f(sampleSd(ms), 3)} | ${f(mean(mk), 3)} | ${f(sampleSd(mk), 3)} | ${f(sampleSd(ms) * BLOCK_MASS_NOMINAL_kg * g, 3)} |`)
  }
  push('', '## Experiment 3: bars on the raised rail (Tabla 4.3)', '', 'Onset: tan(theta) = mu_s. After it, a = g (sin theta - mu_k cos theta); t = sqrt(2 d / a) for d = ' + f(COURSE_m, 2) + ' m at constant angle; the student recovers mu = tan theta - a / (g cos theta). "Crank stopped at the onset" is the ideal; "+0.3 s" is a student who stops the crank (5 mm/s) 0.3 s after the bar starts, so h is read a little above the onset.', '')
  push('| Bar | mu_s | mu_k | Onset h (m) | Onset theta (deg) | a at onset (m/s^2) | t over 1 m, crank stopped at onset (s) | t, crank stopped +0.3 s (s) | h at +0.3 s (m) |', '|---|---|---|---|---|---|---|---|---|')
  for (const bar of BAR_IDS) {
    const { mu_s, mu_k } = BAR_PAIRS[bar]
    const hOn = onsetHeight_m(mu_s)
    const th = inclineAngle_rad(hOn)
    const a = slideAcceleration_mps2(th, mu_k, g)
    const rate = 0.005
    const tOn = hOn / rate
    const late = simulateIncline({ h0_m: 0, segments: [{ t_s: 0, rate_mps: rate }, { t_s: tOn + 0.3, rate_mps: 0 }] }, mu_s, mu_k, g)
    push(`| ${BAR_NAME[bar]} | ${f(mu_s, 2)} | ${f(mu_k, 2)} | ${f(hOn, 3)} | ${f((th * 180) / Math.PI, 1)} | ${f(a, 3)} | ${f(slideTime_s(COURSE_m, a), 2)} | ${f(late.slideTime_s!, 2)} | ${f(rate * (tOn + 0.3), 3)} |`)
  }
  push('', '### What a +0.1 s stop lag does to the coefficient', '', `Hand timing uncertainty used by the analysis: ${f(slideTimeUncertainty_s(), 3)} s (display 0.01 s and reaction-bias half-width 0.1 s in quadrature). The student reads h at the onset (ideal) and times 0.1 s too long.`, '')
  push('| Bar | True mu_k | mu from ideal t | mu from t + 0.1 s | Shift |', '|---|---|---|---|---|')
  for (const bar of BAR_IDS) {
    const { mu_s, mu_k } = BAR_PAIRS[bar]
    const hOn = onsetHeight_m(mu_s)
    const th = inclineAngle_rad(hOn)
    const t0 = slideTime_s(COURSE_m, slideAcceleration_mps2(th, mu_k, g))
    const m0 = inclineTrial(hOn, t0)!.mu
    const m1 = inclineTrial(hOn, t0 + 0.1)!.mu
    push(`| ${BAR_NAME[bar]} | ${f(mu_k, 3)} | ${f(m0, 3)} | ${f(m1, 3)} | ${f(m1 - m0, 3)} |`)
  }
  push('', `### Trial scatter of the slide time (${N_MC} seeded draws, crank stopped at the onset)`, '', '| Bar | mean t (s) | sd t (s) | mean mu from (h, t) | sd mu |', '|---|---|---|---|---|')
  for (const bar of BAR_IDS) {
    const rng = mulberry32(2)
    const ts: number[] = [], mus: number[] = []
    for (let i = 0; i < N_MC; i++) {
      const c = sampleTrialCoefficients(rng, BAR_PAIRS[bar], BAR_SCATTER)
      const hOn = onsetHeight_m(c.mu_s)
      const th = inclineAngle_rad(hOn)
      const t = slideTime_s(COURSE_m, slideAcceleration_mps2(th, c.mu_k, g))
      ts.push(t); mus.push(muFromSlide(th, (2 * COURSE_m) / (t * t), g))
    }
    push(`| ${BAR_NAME[bar]} | ${f(mean(ts), 3)} | ${f(sampleSd(ts), 3)} | ${f(mean(mus), 3)} | ${f(sampleSd(mus), 3)} |`)
  }
  push(
    '',
    '## Notes for the discussion (not shown to the student)',
    '',
    '- The coefficients from exp. 1 (slope) are kinetic; from exp. 2 static; from exp. 3 the onset height is static information while the slide time gives a kinetic coefficient, so the guide\'s task 6 is a real question: the sim keeps both effects visible (onset height h and time t).',
    '- The coefficient does not depend on the weight (the fit is a straight line through the origin) nor, in this model, on the contact area; it depends on BOTH surfaces (a different face gives a different value on the same paper; a different bar a different value on the same rail).',
    '- Which pair has the largest coefficient and whether mu_s > mu_k was shown are for the student to conclude from their own data; with the ASSUMED values above and the default scatter the static values exceed the kinetic ones, but a late press, an unzeroed scale or a loose paper can hide it.',
  )
  return out.join('\n')
}
