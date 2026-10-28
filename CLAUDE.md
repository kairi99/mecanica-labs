# Mecánica labs (EPN Newtonian-mechanics practices: Práctica 1 MRUV, Práctica 2 Movimiento parabólico, Práctica 3 Fuerza–aceleración, Práctica 4 Rozamiento)

Repo `kairi99/mecanica-labs` (formerly `digicart-mruv-sim`), live at https://kairi99.github.io/mecanica-labs/.
The first experiment, described here, is a browser-based, physics-driven, **educational** simulation of the Newtonian-mechanics lab "Práctica 1: MRUV" of the
Escuela Politécnica Nacional (Quito): a PHYWE DigiCart rolling down an inclined metal rail at 1.30°. The student
**assembles the setup from an inventory**, releases the cart, times it with a **virtual stopwatch driven by the
student's own presses**, measures the stand heights and their separation with a **virtual tape measure** (flexómetro, analog), fills
Table 1.1 and does the guide's analysis tasks. Public and **open source** (MIT code, CC BY 4.0 content). Spanish first.
Not affiliated with PHYWE. Make no statement about EPN affiliation either way (no "affiliated", no "not affiliated").

Source documents live in `refs/` (gitignored, copyrighted). Use the `mruv-reference`, `parabolic-reference`, `newton2-reference` and `friction-reference` skills instead of the PDFs/photos.

The repo is a **multi-experiment app**: a landing page (`index.html`, `src/landing`) lists the experiments; each one is its
own page and chunk (`mruv/index.html` and `src/experiments/mruv`; `parabolico/index.html` and `src/experiments/parabolic`,
Práctica 2; `segunda-ley/index.html` and `src/experiments/newton2`, Práctica 3; `rozamiento/index.html` and
`src/experiments/friction`, Práctica 4; all status `ready`). Shared code is in `src/core` (no imports from `src/experiments`; a test enforces it). The second
guide has its own skill, `parabolic-reference` (paraphrased facts from "Práctica 2: Movimiento parabólico"); use it instead of the PDF.
A new experiment is a folder, a manifest, a registry entry and an html entry (README, "Add an experiment").

## Theory unlock

The help pages' theory sections (`<section data-locked="theory" hidden>`) open only when the student ticks every analysis task
("Hecha / Done" list in each analysis panel) and the computed tasks have data. Generic code: `src/core/theory.ts` (completion, tick
tracker, `mecanica:<id>:theoryUnlocked`, `?theory=1` override), `src/core/views/taskPanel.ts`, `src/core/helpTheory.ts` (help pages).
Per experiment: `analysis/tasks.ts` (pure task list and completion, tested in `tests/<id>/tasks.test.ts`) and `views/strings/tasks.ts`.
A help page's `<body data-experiment>` must equal the experiment's store id.

## Commands

```bash
npm install
npm run dev      # Vite dev server
npm test         # Vitest (tests/**/*.test.ts: tests/core and one folder per experiment)
npm run build    # tsc && vite build -> dist/
npm run teacher-key  # regenerates docs/teacher-key*.md (one per experiment) from the models
```

## Non-negotiable invariants

1. **Pure physics.** `src/core/physics` and `src/experiments/*/physics` are pure and DOM-free (no `document`, `window`, `localStorage`, timers, `Math.random`).
2. **SI units with the unit in the name:** `x_m`, `t_s`, `v_mps`, `a_mps2`, `theta_rad`, `h_m`, `m_kg`. Convert only
   locally inside a function (cm to m, deg to rad), never across an API.
3. **Views render state and never compute physics.** Physics lives in `physics/` (core and per experiment), device logic in
   `src/experiments/*/apparatus` (generic instruments in `src/core/instruments`).
4. **Expectation is not noise.** Model functions return the deterministic expected value. Run variability (release
   offset, initial velocity, friction scatter) lives in `variability.ts`; human timing (reaction, resolution) is a
   separate final step. Both use an injected RNG (`mulberry32`).
5. **Honest model.** Every empirical parameter is in `PARAMETERS.md` with value, unit, source or ASSUMED, and date.
   Never tune a parameter to hide a physical discrepancy. If the data are not an ideal MRUV, say so.
6. **i18n:** Spanish default (`es` first), English second, `?lang=` override and localStorage. Never hard-code
   user-facing text in views; use the `{ es, en }` strings files next to each view (`Lang` and storage in `src/core/i18n.ts`).
7. **Mobile first:** must work at 360 px width, touch targets >= 44 px, light and dark themes.

## Design of the experience

- No invented tasks: the guide's assembly, procedure (10 timings at each 10 cm mark, 0 to 90 cm) and analysis tasks
  1 to 10 are the spine. Extra help may explain, never replace them.
- Inventory assembly: rail, DigiCart, stands (rack-and-pinion and two-leg), base, screws, level, receiver with pulley,
  stopwatch. Wrong choices are possible and physically meaningful (angle not 1.30°, AB too short, cart off the track).
- Stopwatch: the student presses start/stop; the app only adds the true event times from the model plus human
  reaction and the display resolution.
- Tape measure and rail scale (analog) and stopwatch (digital): readings are quantised and carry Type B uncertainty (convention in `statistics.ts`).
- DigiCart reference data (mass, wheels) are ASSUMED unless a reliable PHYWE value is found; label them so.

## Style

- Code, comments, commit messages and docs: English. UI strings through the `{ es, en }` strings files (Spanish first).
- Visual design: elegant, calm, Apple-like, one accent colour, yet a real instrument. See `.claude/rules/design-system.md`.
- Open-source hygiene: `.claude/rules/open-source.md` (never commit the EPN guide or PHYWE photos).

## Project Claude config

Rules (`.claude/rules/`): `design-system`, `physics-model`, `open-source`.

Skills (`.claude/skills/`):
- `mruv-reference`: paraphrased facts from the Práctica 1 guide (objectives, materials, assembly, procedure, tasks, equipment look).
- `parabolic-reference`: paraphrased facts from the Práctica 2 guide (marble and ping-pong ball launched horizontally from a table edge, Tabla 2.1, tasks).
- `newton2-reference`: paraphrased facts from the Práctica 3 guide (DigiCart pulled by a hanging canister over a pulley, Tabla 3.1, F(a) fit, tasks).
- `friction-reference`: paraphrased facts from the Práctica 4 guide (friction block and spring scales, bars on a raised rail, Tablas 4.1–4.3, tasks).

Agents (`.claude/agents/`, read-only reviewers; call them after meaningful changes in their area):
`physics-reviewer`, `pedagogy-reviewer`, `design-reviewer`.

## Model roles

The main Opus session reviews, analyzes, plans, orchestrates and reasons. Building, coding, fixing and implementing go
to subagents dispatched with `model: "sonnet"`. Give each a self-contained brief: the goal, the files involved, the
invariants above that apply, and how to verify (which tests to run, `npm run build`). Review its diff before accepting
it. Small edits (typo, one-line fix, docs or config tweak) Opus makes directly. The read-only reviewers stay on Opus.
