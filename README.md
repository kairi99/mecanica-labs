# Mecánica labs: Newtonian-mechanics virtual lab

Browser-based, physics-driven, educational simulations of Newtonian-mechanics lab practices: **Práctica 1, MRUV**
(a PHYWE DigiCart rolling down a metal rail inclined at 1.30 degrees) and **Práctica 2, projectile motion** (a marble
and a ping-pong ball launched horizontally from a table edge). Spanish first (English available), mobile first, light
and dark themes, keyboard accessible.

**Live:** https://kairi99.github.io/mecanica-labs/ (the old address https://kairi99.github.io/digicart-mruv-sim/
redirects to the MRUV practice here).

## Experiments

The site is a small **multi-experiment lab**. It opens on a landing page where students pick a practice (`?exp=mruv` or
`?exp=parabolic` jumps straight into one and keeps the other query parameters). Each experiment is its own page and its own
JavaScript chunk; three.js is loaded lazily by the 3D stage, so a page only downloads what it uses.

| Guide | Experiment | Path | Code | Status |
| --- | --- | --- | --- | --- |
| Práctica 1 | MRUV: a DigiCart rolls down an inclined rail | `/mruv/` | `src/experiments/mruv` | ready |
| Práctica 2 | Projectile motion: a marble and a ping-pong ball leave the table edge after rolling down an inclined rail | `/parabolico/` | `src/experiments/parabolic` | ready |

Both follow the same flow: assemble the setup from an inventory, set it up (heights, level, marks), take your own
measurements with virtual instruments (stopwatch driven by your own presses, tape measure), fill the guide's table and do its
analysis tasks. Help pages: `/mruv/help/` and `/parabolico/help/` (Spanish, with `en.html` in English). The teacher keys
are generated: [docs/teacher-key.md](docs/teacher-key.md) (MRUV) and [docs/teacher-key-parabolic.md](docs/teacher-key-parabolic.md)
(projectile), both by `npm run teacher-key`.

### Add an experiment

1. Folder `src/experiments/<id>/` with `physics/` (pure), `apparatus/`, `analysis/`, `views/`, `pedagogy/`, `styles/` and `main.ts`
   (see [docs/architecture.md](docs/architecture.md), "Multi-experiment layout"; shared code lives in `src/core`).
2. Manifest `src/experiments/<id>/experiment.ts` (`id`, `slug`, `guide`, `title`, `summary`, `page`, `help`, `thumb`, `status`).
3. Registry entry in `src/experiments/registry.ts` (this drives the landing cards and the Vite inputs), and a thumbnail
   drawing in `src/landing/thumbs.ts` if it needs a new one.
4. HTML entries: `<slug>/index.html` (a `#app` div and the script of `main.ts`) plus `<slug>/help/index.html` and `en.html`.
5. Tests in `tests/<id>/`, and its rows in `PARAMETERS.md`.

The rest of this README describes the MRUV experiment in detail; the projectile experiment follows the same pattern
(see its help pages and `docs/architecture.md`).

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

Both experiments are based on lab guides of the Laboratorio de Física, Escuela Politécnica Nacional (EPN), Quito:
"Práctica 1: MRUV" and "Práctica 2: Movimiento parabólico". The guides are **paraphrased** (objectives, assembly,
procedure, table layouts, analysis tasks); their text, figures and the equipment photos are copyrighted and are not included.
This free educational project is **not affiliated with, sponsored or endorsed by PHYWE**. PHYWE and DigiCart are trademarks of
their respective owners, mentioned only to identify the real lab equipment. The 3D and 2D models are our own drawings (no
logos, product photos or manual text), and the cart parameters are model assumptions, not manufacturer data.

Literature values behind the model (each cited in [PARAMETERS.md](PARAMETERS.md) next to its number, otherwise marked
ASSUMED): ITTF Handbook (ping-pong ball size and mass), White, *Fluid Mechanics* (smooth-sphere drag curve), Tanaka et al.
(1990) and Oesterle & Bui Dinh (1998) (Magnus lift of spheres), Moritz (1980) gravity formula and WGS84 for g in Quito, GUM
(JCGM 100), J. R. Taylor, *An Introduction to Error Analysis*, Orear (1982) effective variance.

Licences: code MIT ([LICENSE](LICENSE)); educational content CC BY 4.0 ([LICENSE-CONTENT](LICENSE-CONTENT)). Dependencies:
three.js (MIT), uPlot (MIT), Vite, Vitest, TypeScript. The notices of the shipped libraries are in
[public/THIRD-PARTY-NOTICES.txt](public/THIRD-PARTY-NOTICES.txt) (served with the site).

Parts of the code and documentation were written with the help of AI tools (Claude) and reviewed by the author.

Privacy: the app stores progress only in the browser (`localStorage`); it sends nothing to any server and has no analytics.
