# DigiCart MRUV virtual lab

A browser-based, physics-driven, educational simulation of the Newtonian-mechanics lab **"Práctica 1: Movimiento
Rectilíneo Uniformemente Variado (MRUV)"**: a PHYWE DigiCart rolling down a metal rail inclined at 1.30 degrees.
Spanish first (English available), mobile first, light and dark themes, keyboard accessible.

**Live:** https://kairi99.github.io/digicart-mruv-sim/

## Experiments

The site opens on a **landing page** where students pick an experiment (`?exp=mruv` jumps straight into one). Each
experiment is its own page and JavaScript chunk.

| Guide | Experiment | Page | Status |
| --- | --- | --- | --- |
| Práctica 1 | MRUV: DigiCart on an inclined rail | `mruv/` | ready |
| Práctica 2 | Projectile motion: a marble and a ping-pong ball leave the table edge | `parabolico/` | coming soon |

The rest of this README describes the MRUV experiment.

## What it is

Students assemble the setup from an inventory (rail, DigiCart, two stands, base, six screws, level, receiver, stopwatch,
tape measure, marks), level the rail, set the 1.30 degree incline by measuring heights with a virtual tape measure (analog flexómetro,
read by eye in millimetres), release the cart, time it with a stopwatch driven by **their own key presses** (so their reaction time is in
every reading), fill Table 1.1 (10 timings at each 10 cm mark, 0 to 90 cm) and do the guide's analysis tasks 1 to 10.
The 3D table (three.js) has a 2D side view fallback. The guide is the spine: the app explains and checks, it does not
invent new tasks.

## Using it in class

- Share the link. Progress is kept in the browser (`localStorage`); "Start over" clears it. `?lang=es|en`, `?theme=light|dark`.
- The **checklist** follows the guide's assembly and procedure; each step has a short "why" and a "show me" that
  highlights the part in 3D and opens the panel. The **coach** gives rate-limited, dismissible hints for typical slips
  (cart off the rail, no receiver, scale reversed, raising before levelling, angle off, wrong start/stop, implausible values).
  A **tour** runs on the first visit and can be replayed from the checklist (`?tour=0` never, `?tour=1` always).
- **Analysis panel** (guide section 1.4) computes live from Table 1.1: mean times with uncertainty, mean velocities (whole
  path, 30 cm and 10 cm intervals), x(t) plot with the quadratic fit and a tangent, v(t) with its band, a, final velocity,
  residuals, and a collapsible comparison with what the DigiCart really logged (your reaction offset per mark). It never
  answers the guide's questions (tasks 5, 6 tangent, 9, 10); students do. Results export as CSV.
- **Teacher notes.** `?analysis=0` hides the analysis panel (for a graded run without it). `?teacher` shows the target
  height difference in the checklist and the model's expected acceleration in the comparison block. `?seed=N` fixes the
  hidden values (bench tilt) and run variability; `?preset=assembled|empty` starts from a careful
  student's bench or a bare one. `npm run teacher-key` regenerates [docs/teacher-key.md](docs/teacher-key.md) (geometry, model
  acceleration and its breakdown, expected times and velocities, effect of a +0.1 s stop lag, URL flags).
- The **help pages** (header "?", Spanish `mruv/help/index.html`, English `mruv/help/en.html`) cover the theory, instruments,
  uncertainty conventions and the sources of error of an incline.
- Development only: `?demo=table` fills Table 1.1 with simulated human readings (never in the published build).

## Physics model (`src/core/physics`, `src/experiments/mruv/physics`)

Pure, DOM-free TypeScript in SI units. Rolling cart with effective mass m + sum(I)/r^2, rolling resistance, bearing drag
and quadratic air drag at Quito's gravity (9.7717 m/s^2); closed form for the constant-force part and RK4 for the full
model; run-to-run variability with an injected RNG; effective-variance quadratic fit; GUM-style statistics (Type A, Type B
of resolution/sqrt(12), reaction bias). Every empirical parameter is in [PARAMETERS.md](PARAMETERS.md), and most are
**assumed**, not PHYWE specifications. The model a (about 0.206 m/s^2) is a consequence of them, not independent evidence.

## Architecture

Shared code is in `src/core` (physics helpers, instruments, views, the experiment shell, tour and coach mechanisms, 3D
models, styles); each experiment lives in `src/experiments/<id>` and the landing page in `src/landing`. Inside an
experiment, from the bottom: `physics` (pure model) -> `apparatus` (device logic, state, events; see
[docs/architecture.md](docs/architecture.md)) -> `analysis` (Table 1.1 to numbers, per task; calls physics) ->
`views` and `pedagogy` (rendering, checklist, coach, tour; views never compute physics) -> `main.ts` (hands the pieces to
the shared shell). Strings live next to each view as `{ es, en }` pairs with key parity tests. Styles are plain CSS on
design tokens (`src/core/styles/tokens.css`). Help pages are separate Vite pages in `mruv/help/`. See "Multi-experiment
layout" in [docs/architecture.md](docs/architecture.md) to add an experiment.

## Develop

```bash
npm install
npm run dev           # Vite dev server
npm test              # Vitest
npm run build         # tsc && vite build -> dist/
npm run teacher-key   # regenerate docs/teacher-key.md from the model
```

## Credits and licence

Based on the lab guide "Práctica 1: MRUV" of the Laboratorio de Física, Escuela Politécnica Nacional (EPN), Quito. This is
an independent project and is **not affiliated with EPN or PHYWE**; DigiCart and PHYWE are trademarks of their owners and are
used descriptively. The guide and the equipment photos are copyrighted and are not included here, and no guide text is
copied (facts are paraphrased). Code: MIT ([LICENSE](LICENSE)). Educational content: CC BY 4.0 ([LICENSE-CONTENT](LICENSE-CONTENT)).
Dependencies: three.js (MIT), uPlot (MIT), Vite, Vitest, TypeScript. Method references: GUM (JCGM 100), J. R. Taylor,
*An Introduction to Error Analysis*, Orear (1982) effective variance, WGS84 gravity formula.
