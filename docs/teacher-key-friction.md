# Teacher key: Practica 4, friction force

_Generated from the model by `npm run teacher-key`. Do not edit by hand; change the model (and PARAMETERS.md) instead._

Every friction coefficient, mass and scale constant is **ASSUMED** (see PARAMETERS.md, section Practica 4). The numbers are what this virtual lab produces, not measured data of the real bench, and not literature values: the student looks up their own (task 7).

## Bench the numbers refer to

- Local g (Quito, 2800 m) = 9.7717 m/s^2. Block mass 100 g (each bench draws it within +-6 g; the student weighs it), silver masses 50 g.
- Scales: 1 N (division 0.02 N, k = 10 N/m) and 2 N (division 0.05 N, k = 20 N/m).
- Rail 1.2 m resting on the table at its low end, raised by the rack-and-pinion stand at 1.10 m from the contact point: sin(theta) = h / 1.10 m, h = height of the rail underside at the clamp. Course 1.00 m.
- Trial-to-trial scatter (seeded per bench): static coefficient 5 % and kinetic 3 % (faces); 6 % and 4 % (bars).

## Experiment 1: force at constant speed (Tabla 4.1)

F_k = mu_k (M + m) g. The "steady" column is the mean needle reading 4 to 6 s into a pull at 0.10 m/s with a steady hand on a paper long enough to hold the plateau (the real A4 sheet allows less travel: see the note).

| Face | Added mass (g) | W = (M+m) g (N) | Expected F_k (N) | Steady plateau, sim (N) | 1 N scale |
|---|---|---|---|---|---|
| Cloth (tela) | 0 | 0.977 | 0.293 | 0.293 | fits |
| Cloth (tela) | 50 | 1.466 | 0.440 | 0.440 | fits |
| Cloth (tela) | 100 | 1.954 | 0.586 | 0.586 | fits |
| Cloth (tela) | 150 | 2.443 | 0.733 | 0.733 | fits |
| Sandpaper (lija) | 0 | 0.977 | 0.537 | 0.537 | fits |
| Sandpaper (lija) | 50 | 1.466 | 0.806 | 0.806 | fits |
| Sandpaper (lija) | 100 | 1.954 | 1.075 | 1.075 | overranges or nearly (use 2 N) |
| Sandpaper (lija) | 150 | 2.443 | 1.344 | 1.344 | overranges or nearly (use 2 N) |

Note: a real pull that stays on the A4 sheet (0.20 m of travel) at 0.10 m/s lasts only 2 s; at 0.03 to 0.05 m/s it lasts 4 to 7 s and the plateau is shorter but readable. Slower pulls with the soft 1 N spring show stick-slip (needle oscillating between roughly mu_k N and mu_s N).

### Expected fits (weighted straight line of mean force against weight)

| Face | Expected slope = mu_k | Expected intercept (N) |
|---|---|---|
| Cloth (tela) | 0.300 | 0 (a non-zero intercept means a zero error: scale not zeroed horizontally gives about -0.020 N on the 1 N scale) |
| Sandpaper (lija) | 0.550 | 0 (a non-zero intercept means a zero error: scale not zeroed horizontally gives about -0.020 N on the 1 N scale) |

## Experiment 2: peak force before breakaway (Tabla 4.2)

F_max = mu_s M g (no added mass). The "reading" columns are the needle at the peak and when the student presses 0.2 s and 0.5 s after it (pull at 5 mm/s, nominal bench, 1 N scale for the cloth face, 2 N for the sandpaper face).

| Face | Expected peak mu_s M g (N) | Peak, sim (N) | Press +0.2 s (N) | Press +0.5 s (N) | mu_s from a +0.2 s press |
|---|---|---|---|---|---|
| Cloth (tela) | 0.391 | 0.386 | 0.309 | 0.284 | 0.316 (true 0.400) |
| Sandpaper (lija) | 0.704 | 0.699 | 0.497 | 0.514 | 0.509 (true 0.720) |

A late press catches the dropped (kinetic-like) force, so the static coefficient comes out too low and may even fall below mu_k: the human-reaction point of the lab.

### Trial scatter (300 seeded draws)

| Face | mean mu_s | sd mu_s | mean mu_k | sd mu_k | sd of a single peak reading (N, M g = 0.977 N) |
|---|---|---|---|---|---|
| Cloth (tela) | 0.401 | 0.019 | 0.300 | 0.009 | 0.019 |
| Sandpaper (lija) | 0.721 | 0.035 | 0.550 | 0.017 | 0.034 |

## Experiment 3: bars on the raised rail (Tabla 4.3)

Onset: tan(theta) = mu_s. After it, a = g (sin theta - mu_k cos theta); t = sqrt(2 d / a) for d = 1.00 m at constant angle; the student recovers mu = tan theta - a / (g cos theta). "Crank stopped at the onset" is the ideal; "+0.3 s" is a student who stops the crank (5 mm/s) 0.3 s after the bar starts, so h is read a little above the onset.

| Bar | mu_s | mu_k | Onset h (m) | Onset theta (deg) | a at onset (m/s^2) | t over 1 m, crank stopped at onset (s) | t, crank stopped +0.3 s (s) | h at +0.3 s (m) |
|---|---|---|---|---|---|---|---|---|
| Wood (madera) | 0.40 | 0.30 | 0.409 | 21.8 | 0.907 | 1.48 | 1.47 | 0.410 |
| Aluminium (aluminio) | 0.50 | 0.40 | 0.492 | 26.6 | 0.874 | 1.51 | 1.50 | 0.493 |
| Iron (hierro) | 0.58 | 0.46 | 0.552 | 30.1 | 1.014 | 1.40 | 1.39 | 0.553 |

### What a +0.1 s stop lag does to the coefficient

Hand timing uncertainty used by the analysis: 0.058 s (display 0.01 s and reaction-bias half-width 0.1 s in quadrature). The student reads h at the onset (ideal) and times 0.1 s too long.

| Bar | True mu_k | mu from ideal t | mu from t + 0.1 s | Shift |
|---|---|---|---|---|
| Wood (madera) | 0.300 | 0.300 | 0.312 | 0.012 |
| Aluminium (aluminio) | 0.400 | 0.400 | 0.412 | 0.012 |
| Iron (hierro) | 0.460 | 0.460 | 0.475 | 0.015 |

### Trial scatter of the slide time (300 seeded draws, crank stopped at the onset)

| Bar | mean t (s) | sd t (s) | mean mu from (h, t) | sd mu |
|---|---|---|---|---|
| Wood (madera) | 1.526 | 0.262 | 0.300 | 0.012 |
| Aluminium (aluminio) | 1.598 | 0.434 | 0.400 | 0.017 |
| Iron (hierro) | 1.475 | 0.373 | 0.460 | 0.019 |

## Notes for the discussion (not shown to the student)

- The coefficients from exp. 1 (slope) are kinetic; from exp. 2 static; from exp. 3 the onset height is static information while the slide time gives a kinetic coefficient, so the guide's task 6 is a real question: the sim keeps both effects visible (onset height h and time t).
- The coefficient does not depend on the weight (the fit is a straight line through the origin) nor, in this model, on the contact area; it depends on BOTH surfaces (a different face gives a different value on the same paper; a different bar a different value on the same rail).
- Which pair has the largest coefficient and whether mu_s > mu_k was shown are for the student to conclude from their own data; with the ASSUMED values above and the default scatter the static values exceed the kinetic ones, but a late press, an unzeroed scale or a loose paper can hide it.
