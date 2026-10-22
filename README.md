# DigiCart MRUV virtual lab

A browser-based, physics-driven, educational simulation of the Newtonian-mechanics lab **"Práctica 1: Movimiento
Rectilíneo Uniformemente Variado (MRUV)"**: a PHYWE DigiCart rolling down a metal rail inclined at 1.30 degrees.
Spanish first (English available), mobile first, light and dark themes, keyboard accessible.

**Live:** https://kairi99.github.io/digicart-mruv-sim/

## What it is

Students assemble the setup from an inventory (rail, DigiCart, two stands, base, six screws, level, receiver, stopwatch,
caliper, marks), level the rail, set the 1.30 degree incline by measuring heights with a virtual caliper (analog vernier
or digital), release the cart, time it with a stopwatch driven by **their own key presses** (so their reaction time is in
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
  hidden values (bench tilt, caliper zero error) and run variability; `?preset=assembled|empty` starts from a careful
  student's bench or a bare one. `npm run teacher-key` regenerates [docs/teacher-key.md](docs/teacher-key.md) (geometry, model
  acceleration and its breakdown, expected times and velocities, effect of a +0.1 s stop lag, URL flags).
- The **help pages** (header "?", Spanish `help/index.html`, English `help/en.html`) cover the theory, instruments,
  uncertainty conventions and the sources of error of an incline.
- Development only: `?demo=table` fills Table 1.1 with simulated human readings (never in the published build).

## Physics model (`src/physics`)

Pure, DOM-free TypeScript in SI units. Rolling cart with effective mass m + sum(I)/r^2, rolling resistance, bearing drag
and quadratic air drag at Quito's gravity (9.7717 m/s^2); closed form for the constant-force part and RK4 for the full
model; run-to-run variability with an injected RNG; effective-variance quadratic fit; GUM-style statistics (Type A, Type B
of resolution/sqrt(12), reaction bias). Every empirical parameter is in [PARAMETERS.md](PARAMETERS.md), and most are
**assumed**, not PHYWE specifications. The model a (about 0.206 m/s^2) is a consequence of them, not independent evidence.

## Architecture

Layers, from the bottom: `src/physics` (pure model) -> `src/apparatus` (device logic, state, events; see
[docs/architecture.md](docs/architecture.md)) -> `src/analysis` (Table 1.1 to numbers, per task; calls physics) ->
`src/views` and `src/pedagogy` (rendering, checklist, coach, tour; views never compute physics) -> `src/main.ts`
(shell). Strings live next to each view as `{ es, en }` pairs with key parity tests. Styles are plain CSS on design tokens
(`src/styles/tokens.css`). Help pages are separate Vite pages in `help/`.

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
