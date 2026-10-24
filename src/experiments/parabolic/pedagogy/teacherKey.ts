// Teacher key generator for Practica 2: a pure function from the model to Markdown (no DOM, no file access).
// scripts/teacher-key.ts writes the result to docs/teacher-key-parabolic.md. Every number comes from the physics layer, the
// apparatus (for the simulated careful student) and the analysis layer.
import {
  BALLS, DEFAULT_SETUP as PHYSICS_DEFAULT, G_QUITO_mps2, VACUUM_EFFECTS, effectiveInertiaFactor, mean, mulberry32, reactionBiasTypeB_s, sampleRun, sampleSd, simulateLaunch, ZERO_RUN, type BallSpec,
} from '../physics/index.ts'
import { SLOWMO_FPS_hz, TABLE_HEIGHT_MAX_m, TABLE_HEIGHT_MIN_m, createApparatus } from '../apparatus/index.ts'
import { G_UNCERTAINTY_mps2, SIGMA_H_m, expectedFlightTime, fullAnalysis } from '../analysis/compute.ts'
import { fillTableSimulated } from './simulatedReadings.ts'

const f = (x: number, d: number): string => x.toFixed(d)
/** The assembled preset's real contact geometry: 20 cm at the clamp, the 2 cm thick rail resting on the table at its tip (rise 18 cm, tip top 2 cm above the table). */
const ASSEMBLED_GEO = createApparatus('assembled').geometry()!
const DEFAULT_SETUP = { ...PHYSICS_DEFAULT, rise_m: ASSEMBLED_GEO.rise_m, stepDrop_m: ASSEMBLED_GEO.stepDrop_m }
const MARKS_m = [0.6, 0.7, 0.8, 0.9, 1.0]
const BALL_NAMES: Record<BallSpec['id'], string> = { marble: 'Marble', pingpong: 'Ping-pong ball' }
const N_MC = 1000

interface Row { s_m: number; v: number; t: number; x: number }
function expectation(ball: BallSpec, s_m: number, H_m = DEFAULT_SETUP.H_m): Row | null {
  const r = simulateLaunch({ ...DEFAULT_SETUP, H_m }, ball, s_m, ZERO_RUN)
  return r.flight ? { s_m, v: r.v_edge_mps, t: r.flight.t_flight_s, x: r.flight.x_land_m } : null
}

/** Run-to-run spread of one mark: mean and sample sd of v_edge, flight time and range over N seeded draws (landed runs only). */
export function spread(ball: BallSpec, s_m: number, seed = 1, n = N_MC): { v: [number, number]; t: [number, number]; x: [number, number]; landed: number } {
  const rng = mulberry32(seed)
  const v: number[] = [], t: number[] = [], x: number[] = []
  for (let i = 0; i < n; i++) {
    const r = simulateLaunch(DEFAULT_SETUP, ball, s_m, sampleRun(rng, ball))
    if (r.flight) { v.push(r.v_edge_mps); t.push(r.flight.t_flight_s); x.push(r.flight.x_land_m) }
  }
  return { v: [mean(v), sampleSd(v)], t: [mean(t), sampleSd(t)], x: [mean(x), sampleSd(x)], landed: v.length }
}

export function teacherKey(): string {
  const out: string[] = []
  const push = (...l: string[]): void => { out.push(...l) }
  const g = G_QUITO_mps2
  const tTheo = (H: number): number => Math.sqrt((2 * H) / g)
  push(
    '# Teacher key: Practica 2, parabolic motion',
    '',
    '_Generated from the model by `npm run teacher-key`. Do not edit by hand; change the model (and PARAMETERS.md) instead._',
    '',
    'All ball parameters are **ASSUMED** (see PARAMETERS.md, section Practica 2). Treat the numbers as what this virtual lab produces, not as measured data of the real bench.',
    '',
    '## Setup the numbers refer to',
    '',
    `- Rail 1.2 m and 2 cm thick, rack-stand clamp 20 cm above the table (the tape reading; the rail rests on the table at its tip, so the ball feels a rise of ${f(DEFAULT_SETUP.rise_m * 100, 1)} cm and leaves the tip ${f(DEFAULT_SETUP.stepDrop_m * 100, 1)} cm above the table), high support ${f(DEFAULT_SETUP.supportDist_m, 2)} m from the low tip, tip ${f(DEFAULT_SETUP.gap_m * 100, 0)} cm from the edge, marks at 60, 70, 80, 90 and 100 cm from the low tip (the \`assembled\` preset).`,
    `- Table height H is hidden and drawn per bench seed between ${f(TABLE_HEIGHT_MIN_m, 2)} and ${f(TABLE_HEIGHT_MAX_m, 2)} m; the tables below use H = ${f(DEFAULT_SETUP.H_m, 2)} m unless stated.`,
    `- Local g (Quito, 2800 m) = ${f(g, 4)} m/s^2.`,
    '',
    '## Expected flight time (task 5)',
    '',
    't = sqrt(2H/g), independent of v0. With drag and spin the model flight is a little longer (ping-pong more).',
    '',
    '| H (m) | sqrt(2H/g) (s) | model t, marble, mark 80 cm (s) | model t, ping-pong, mark 80 cm (s) |',
    '|---|---|---|---|',
  )
  for (const H of [TABLE_HEIGHT_MIN_m, DEFAULT_SETUP.H_m, TABLE_HEIGHT_MAX_m]) {
    push(`| ${f(H, 2)} | ${f(tTheo(H), 4)} | ${f(expectation(BALLS.marble, 0.8, H)!.t, 4)} | ${f(expectation(BALLS.pingpong, 0.8, H)!.t, 4)} |`)
  }
  push(
    '',
    '## Expected launch speed, time and range per mark (no run variability)',
    '',
    'v0 is the speed at the table edge, from the model (incline, corner loss, roll over the gap, air). It is below sqrt(2 g dh) because of rolling inertia (the marble keeps 5/7 of the energy as translation, the hollow ping-pong ball about 0.6), the junction and rolling resistance. Spread columns: mean and sd over ' + N_MC + ' seeded runs with the run variability on.',
    '',
  )
  for (const id of ['marble', 'pingpong'] as const) {
    const ball = BALLS[id]
    push(`### ${BALL_NAMES[id]}`, '', '| Mark (cm) | v0 (m/s) | t (s) | x (m) | v0 mean +- sd (m/s) | t mean +- sd (s) | x mean +- sd (m) |', '|---|---|---|---|---|---|---|')
    for (const s of MARKS_m) {
      const e = expectation(ball, s)
      const sp = spread(ball, s)
      if (!e) { push(`| ${f(s * 100, 0)} | does not leave horizontally | | | | | |`); continue }
      push(`| ${f(s * 100, 0)} | ${f(e.v, 3)} | ${f(e.t, 4)} | ${f(e.x, 3)} | ${f(sp.v[0], 3)} +- ${f(sp.v[1], 3)} | ${f(sp.t[0], 4)} +- ${f(sp.t[1], 4)} | ${f(sp.x[0], 3)} +- ${f(sp.x[1], 3)} |`)
    }
    push('')
  }
  push(
    'The flight time hardly changes with the mark (it depends on H, not on v0): the range grows with v0, the time does not. This is the expected answer to tasks 3 and 5. The ping-pong ball is slower at the same mark (larger rolling inertia, more air drag and more corner loss) and its range is shorter.',
    '',
    '## Why the hand-timed flight has a large relative error (task 6)',
    '',
    `A flight of about 0.4 s is timed with two presses. If the stop press lags the start press by a constant bias b, every reading is t + b. The analysis assumes a Type B bias of +-0.1 s (u = ${f(reactionBiasTypeB_s(), 4)} s, ASSUMED), common to all readings, so it does not average down. Effect on the percent error against t = ${f(tTheo(DEFAULT_SETUP.H_m), 3)} s (H = ${f(DEFAULT_SETUP.H_m, 2)} m):`,
    '',
    '| Bias b (s) | reading (s) | error (%) |',
    '|---|---|---|',
  )
  const t0 = tTheo(DEFAULT_SETUP.H_m)
  for (const b of [-0.1, -0.05, 0, 0.05, 0.1, 0.2]) push(`| ${b >= 0 ? '+' : ''}${f(b, 2)} | ${f(t0 + b, 2)} | ${b >= 0 ? '+' : ''}${f((b / t0) * 100, 0)} |`)
  push(
    '',
    'Typical student errors the coach looks for: starting the watch at the release adds the roll down the rail and over the gap (about 1 s), a clear outlier near 1.4 s; starting 0.3 s late misses three quarters of the fall. The slow-motion step gives a reference counted in frames at ' + SLOWMO_FPS_hz + ' fps (+-1 frame = +-' + f(1000 / SLOWMO_FPS_hz, 1) + ' ms, u about ' + f(1000 / SLOWMO_FPS_hz / Math.sqrt(6), 1) + ' ms).',
    '',
    '## Uncertainty conventions of the analysis panel',
    '',
    '- Time of a mark: mean of 5 readings; Delta t = sqrt(uA^2 + uRes^2 + uReact^2) with uA = s/sqrt(5), uRes = 0.01 s/sqrt(12), uReact = 0.1 s/sqrt(3) (ASSUMED half-width 0.1 s).',
    `- Range of a mark: mean of 5; Delta x = sqrt(uA^2 + uTape^2 + uProj^2) with uTape = 1 mm/sqrt(12) and the edge-projection placement 2 mm (ASSUMED, the same sigma the bench draws).`,
    '- v0 = x/t; Delta v = v0 sqrt((Dx/x)^2 + (Dt/t)^2) (GUM 5.1.2). The reaction bias is shared by all marks, so the v0 of different marks are correlated; the panel says so. Comparisons between marks or between balls (task 3 bars and spread, task 8) use the scatter-only uncertainty (Type A + resolution, no reaction bias, and the v0 uncertainty built from it): the same hand and the same lag shift every time equally, so the bias cancels in a difference. Task 6 keeps the full Delta t.',
    `- Expected time: u_t = t/2 sqrt((u_H/H)^2 + (u_g/g)^2) with u_H = sqrt(2) x 1 mm/sqrt(12) = ${f(SIGMA_H_m * 1000, 2)} mm (two tape ends) and u_g = ${G_UNCERTAINTY_mps2} m/s^2 (ASSUMED).`,
    '- Final speed: v = sqrt(v0^2 + 2 g H), u_v = sqrt((v0 u_v0)^2 + (g u_H)^2 + (H u_g)^2)/v.',
    '- Verdicts compare |t - t_theo| with the combined standard uncertainty (within 1 sigma, 1 to 2 sigma, beyond 2 sigma).',
    '',
    '## A simulated careful student',
    '',
  )
  const app = createApparatus('assembled', { seed: 1 })
  const written = fillTableSimulated(app, { seed: 1 })
  const Htrue = app.hiddenTruth().H_m
  const Hread = Math.round(Htrue * 1000) / 1000
  const a = fullAnalysis({ tables: { marble: app.tableData('marble'), pingpong: app.tableData('pingpong') }, H_m: Hread })
  const exp = expectedFlightTime(Hread)!
  const runs = app.getRuns()
  const marked = (b: string): string => `${runs.filter((r) => r.ball === b && r.mark.result === 'marked').length} of ${runs.filter((r) => r.ball === b).length}`
  push(
    `Preset \`assembled\` (seed 1), ${written} simulated launches with both ranges and times (start press ${f(0.2, 2)} s after the edge, stop press ${f(0.22, 2)} s after the landing, 0.05 s reaction scatter, so the net bias is about +0.02 s). Hidden H = ${f(Htrue, 4)} m, tape reading ${f(Hread, 3)} m, t_theo = **${f(exp.t_s, 4)} +- ${f(exp.u_t_s, 4)} s**. Launches that left a readable carbon dot: marble ${marked('marble')}, ping-pong ${marked('pingpong')} (the others were repeated).`,
    '',
    '| Ball | Mark | t +- Dt (s) | x (m) | v0 +- Dv (m/s) | error of t (%) | final v (m/s) |',
    '|---|---|---|---|---|---|---|',
  )
  for (const id of ['marble', 'pingpong'] as const) {
    a.balls[id].trials.forEach((t, i) => {
      const d = a.derived[id][i]!
      push(`| ${BALL_NAMES[id]} | ${i + 1} | ${f(t.t_s!, 3)} +- ${f(t.u_t_s!, 3)} | ${f(t.x_m!, 3)} +- ${f(t.u_x_m!, 3)} | ${f(t.v0_mps!, 2)} +- ${f(t.u_v0_mps!, 2)} | ${f(d.error!.error_pct, 1)} | ${f(d.final!.v_mps, 2)} +- ${f(d.final!.u_v_mps, 2)} |`)
    })
  }
  push(
    '',
    ...(['marble', 'pingpong'] as const).map((id) => `- ${BALL_NAMES[id]}, all 25 readings: t = ${f(a.balls[id].pooled!.t_s, 3)} s, error ${f(a.pooledError[id]!.error_pct, 1)} % (${a.pooledError[id]!.comparison.verdict}).`),
  )
  // ---- expected answers and common mistakes (tasks 1, 4, 7, 8, 9), all from the model -----------------------------------
  const H0 = DEFAULT_SETUP.H_m
  const mid = 0.8
  const em = expectation(BALLS.marble, mid)!, ep = expectation(BALLS.pingpong, mid)!
  const vac = (b: BallSpec): number => simulateLaunch(DEFAULT_SETUP, b, mid, ZERO_RUN, { effects: VACUUM_EFFECTS }).flight!.t_flight_s
  const dragPct = (b: BallSpec, e: Row): number => ((e.t - vac(b)) / vac(b)) * 100
  const kEff = (b: BallSpec): number => effectiveInertiaFactor(b.k_body, b.R_m, DEFAULT_SETUP.channelWidth_m)
  const idealRatio = Math.sqrt((1 + kEff(BALLS.pingpong)) / (1 + kEff(BALLS.marble)))
  push(
    '',
    '## Expected answers and common mistakes, tasks 1, 4, 7, 8 and 9',
    '',
    `Numbers use H = ${f(H0, 2)} m and the model without run variability.`,
    '',
    '### Task 1, the motion',
    '',
    `After the edge only gravity (and a little air) acts. Horizontally the motion is uniform (constant velocity, no horizontal force); vertically it is free fall from rest (uniform acceleration g = ${f(g, 2)} m/s^2). The path is a parabola. The velocity at the edge is horizontal, along the rail direction on the table. Common mistake: drawing a force "of the launch" that keeps pushing the ball forward.`,
    '',
    '### Task 4, launch speed per mark',
    '',
    '| Mark (cm) | v0 marble (m/s) | v0 ping-pong (m/s) |',
    '|---|---|---|',
  )
  for (const sm of MARKS_m) {
    const a1 = expectation(BALLS.marble, sm), a2 = expectation(BALLS.pingpong, sm)
    push(`| ${f(sm * 100, 0)} | ${a1 ? f(a1.v, 2) : '-'} | ${a2 ? f(a2.v, 2) : '-'} |`)
  }
  push(
    '',
    'v0 = x/t with the range from the edge projection and the flight time. Common mistakes: v0 = sqrt(2 g dh) from the height drop of the rail (it ignores the rotation, the corner and the table roll, so it is too large); range measured from the rail tip instead of the edge projection; timing from the release instead of from the edge (the flight time becomes about 1 s and v0 about 0.4 of its value).',
    '',
    '### Task 7, final speed and angle',
    '',
    '| Ball | Mark (cm) | v final (m/s) | angle below horizontal (deg) |',
    '|---|---|---|---|',
  )
  const vy0 = Math.sqrt(2 * g * H0)
  for (const id of ['marble', 'pingpong'] as const) {
    for (const sm of MARKS_m) {
      const e = expectation(BALLS[id], sm)
      if (e) push(`| ${BALL_NAMES[id]} | ${f(sm * 100, 0)} | ${f(Math.hypot(e.v, vy0), 2)} | ${f((Math.atan2(vy0, e.v) * 180) / Math.PI, 0)} |`)
    }
  }
  push(
    '',
    `v = sqrt(v0^2 + 2 g H); the vertical part is ${f(vy0, 2)} m/s whatever the mark, so the final speed is set mostly by H and changes little between marks (v0 only adds in quadrature). Common mistakes: adding v0 and g t as numbers instead of as perpendicular components; taking the final speed equal to v0.`,
    '',
    '### Task 8, marble and ping-pong ball',
    '',
    `At mark ${f(mid * 100, 0)} cm: v0 marble ${f(em.v, 3)} m/s, ping-pong ${f(ep.v, 3)} m/s, ratio ${f(em.v / ep.v, 3)}. Ideal rolling without losses gives v proportional to 1/sqrt(1 + k_eff) (k_eff includes the channel of width ${f(DEFAULT_SETUP.channelWidth_m * 1000, 0)} mm), so the ratio marble/ping-pong would be sqrt((1 + k_pp)/(1 + k_marble)) = ${f(idealRatio, 3)} (k_marble = ${f(kEff(BALLS.marble), 3)}, k_pp = ${f(kEff(BALLS.pingpong), 3)}); the model value differs from it by the rolling resistance, the corner loss and the air, which hit the light ball more. The ping-pong ball therefore leaves slower and its range is shorter (${f(ep.x, 3)} m against ${f(em.x, 3)} m). The flight times are the same within hand timing (${f(em.t, 3)} s against ${f(ep.t, 3)} s, a difference far below the 0.1 s reaction uncertainty); air drag lengthens the flight by ${f(dragPct(BALLS.marble, em), 2)} % for the marble and ${f(dragPct(BALLS.pingpong, ep), 2)} % for the ping-pong ball. Common mistakes: saying the lighter ball falls slower in vacuum; explaining the range difference by mass alone (it is the rotational inertia and the losses); calling a difference real when it is below 1 sigma (the panel compares with the scatter-only uncertainty).`,
    '',
    '### Task 9, ideal projectile',
    '',
    'Conditions of the ideal model: no air drag and no Magnus lift (the model includes both, small); constant g over the fall; launch velocity exactly horizontal; the ball treated as a point (it is a sphere with spin and size); the ball leaves exactly at the table edge, with no contact with it. Expected factors of deviation: reaction bias (raises or lowers t), edge projection placement (shifts every x), drag (lengthens t and shortens x slightly, more for the ping-pong ball), a launch that is not exactly horizontal (changes t). Common mistake: listing only "human error" without saying which quantity it shifts and in which direction.',
  )
  push(
    '',
    '## URL flags',
    '',
    '| Flag | Effect |',
    '|---|---|',
    '| `?reference=0` | Hides the slow-motion step and its reference time in the analysis (steps renumber). |',
    '| `?analysis=0` | Hides the analysis step (steps renumber). |',
    '| `?seed=N` | Fixes the hidden values (table height, tilt) and the run variability. |',
    '| `?preset=assembled` or `?preset=empty` | Starts from a careful student\'s bench or a bare one (ignores saved progress). |',
    '| `?tour=0` or `?tour=1` | Never or always start the first-visit tour. |',
    '| `?lang=es` or `?lang=en` | Language. |',
    '| `?theme=light` or `?theme=dark` | Theme. |',
    '| `?cam=overview`, `edge`, ... | Fixes the 3D camera preset. |',
  )
  return out.join('\n')
}
