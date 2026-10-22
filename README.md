# DigiCart MRUV virtual lab

A browser-based, physics-driven, educational simulation of the Newtonian-mechanics lab **"Práctica 1: Movimiento
Rectilíneo Uniformemente Variado (MRUV)"**: a PHYWE DigiCart rolling down a metal rail inclined at 1.30 degrees.
Spanish first (English available), mobile first, light and dark themes.

> Status: phase 0 (scaffold) and phase 1 (physics model) done. The 3D bench, assembly inventory, stopwatch, calipers
> and analysis panel are the next phases. The page shows a placeholder for now.

## What it will be

Students assemble the setup from an inventory of parts, release the cart, time it with a virtual stopwatch driven by
their own presses, read the stand height with a virtual caliper (analog vernier and digital), fill Table 1.1 (10
timings at each 10 cm mark, 0 to 90 cm) and carry out the guide's analysis tasks: mean times with uncertainty, mean
velocities, a position-time fit, v(t), a, final velocity and the MRUV conclusion.

## Physics model (`src/physics`)

Pure, DOM-free TypeScript in SI units. Rolling cart with effective mass m + sum(I)/r^2, rolling resistance, bearing
drag and quadratic air drag at Quito's gravity (9.7717 m/s^2) and air density (0.87 kg/m^3); closed form for the
constant-force part and RK4 for the full model; crossing times by root finding; run-to-run variability with an injected
RNG; weighted quadratic fit and effective-variance fit for noisy times; GUM-style statistics. Every empirical parameter
is listed in [PARAMETERS.md](PARAMETERS.md), and most are **assumed**, not PHYWE specifications.

## Develop

```bash
npm install
npm run dev
npm test
npm run build
```

## Credits and licence

Based on the lab guide of the Escuela Politécnica Nacional (EPN), Quito. This is an independent project and is **not
affiliated with EPN or PHYWE**. The guide and the equipment photos are copyrighted and are not included in this
repository. Code: MIT ([LICENSE](LICENSE)). Educational content: CC BY 4.0 ([LICENSE-CONTENT](LICENSE-CONTENT)).
Method references: GUM (JCGM 100), J. R. Taylor, *An Introduction to Error Analysis*, WGS84 gravity formula.
