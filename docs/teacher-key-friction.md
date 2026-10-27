# Teacher key: Practica 4, friction force

_Generated from the model by `npm run teacher-key`. Do not edit by hand; change the model (and PARAMETERS.md) instead._

Every friction coefficient, mass and scale constant is **ASSUMED** (see PARAMETERS.md, section Practica 4). The numbers are what this virtual lab produces, not measured data of the real bench, and not literature values: the student looks up their own (task 7).

## Bench the numbers refer to

- Local g (Quito, 2800 m) = 9.7717 m/s^2. Block mass 100 g (each bench draws it within +-6 g; the student weighs it), silver masses 50 g.
- Scales: 1 N (division 0.02 N, k = 10 N/m) and 2 N (division 0.05 N, k = 20 N/m).
- Rail 1.2 m resting on the table at its low end, raised by the rack-and-pinion stand at 1.10 m from the contact point: sin(theta) = h / 1.10 m, h = height of the rail underside at the clamp. Course 1.00 m.
- Trial-to-trial scatter (seeded per bench): static coefficient 5 % and kinetic 3 % (faces); 6 % and 4 % (bars).

## Experiment 1: force at constant speed (Tabla 4.1)

F_k = mu_k (M + m) g (1 + beta v), with the ASSUMED velocity strengthening beta = 1.5 s/m (the parameter that lets the stick-slip settle into a plateau): at the advised pull speed 4 cm/s the plateau is 6.0 % above mu_k W. "Min. steady speed" is the lowest pull speed on a 0.005 m/s grid above which no run shows a re-stick (stick-slip) with a steady hand and no travel limit; below it the needle oscillates between about mu_k N and mu_s N. "Readable" is how long the needle stays within 3 % of its final value while the block is still on the 0.20 m of paper, at 4 cm/s.

| Face | Added mass (g) | W = (M+m) g (N) | Expected F_k at 4 cm/s (N) | Plateau, sim (N) | Min. steady speed, 1 N (cm/s) | Min. steady speed, 2 N (cm/s) | Readable at 4 cm/s, 2 N (s) | 1 N scale |
|---|---|---|---|---|---|---|---|---|
| Cloth (tela) | 0 | 0.977 | 0.311 | 0.311 | 2.5 | 2.5 | 4.1 | fits |
| Cloth (tela) | 50 | 1.466 | 0.466 | 0.466 | 2.5 | 3.0 | 4.2 | fits |
| Cloth (tela) | 100 | 1.954 | 0.621 | 0.621 | 2.5 | 3.0 | 4.0 | fits |
| Cloth (tela) | 150 | 2.443 | 0.777 | 0.776 | 2.5 | 3.0 | 3.9 | fits |
| Sandpaper (lija) | 0 | 0.977 | 0.570 | 0.570 | 2.0 | 2.5 | 4.5 | fits |
| Sandpaper (lija) | 50 | 1.466 | 0.855 | 0.855 | 1.5 | 2.5 | 4.3 | fits |
| Sandpaper (lija) | 100 | 1.954 | 1.139 | 1.140 | 1.0 | 2.0 | 4.2 | overranges or nearly (use 2 N) |
| Sandpaper (lija) | 150 | 2.443 | 1.424 | 1.425 | 1.0 | 2.0 | 4.1 | overranges or nearly (use 2 N) |

Advice for the help page: pull at 4 to 5 cm/s or faster for every load (all the minimum steady speeds above are below 4 cm/s); the first part of the pull is spent stretching the spring (the block does not move), so the 0.20 m of paper is used only after the breakaway. Pulls below the minimum steady speed show stick-slip with the soft 1 N spring.

### Expected fits (weighted straight line of mean force against weight)

| Face | Expected slope mu_k (1 + beta v), v = 4 cm/s | Expected intercept (N) |
|---|---|---|
| Cloth (tela) | 0.318 (assumed mu_k 0.30) | 0 (a non-zero intercept means a zero error: a scale not zeroed horizontally gives about -0.020 N on the 1 N scale) |
| Sandpaper (lija) | 0.583 (assumed mu_k 0.55) | 0 (a non-zero intercept means a zero error: a scale not zeroed horizontally gives about -0.020 N on the 1 N scale) |

### Static peak against pull speed

The needle shows the spring force k e; the barrel damping (c = 0.15 N s/m) makes it read c v below mu_s N during the build-up. Cloth and sandpaper, no added mass, 2 N scale.

| Face | mu_s M g (N) | Peak at 1 cm/s (N) | at 5 cm/s (N) | at 10 cm/s (N) |
|---|---|---|---|---|
| Cloth (tela) | 0.391 | 0.389 | 0.383 | 0.376 |
| Sandpaper (lija) | 0.704 | 0.702 | 0.696 | 0.689 |

## Experiment 2: peak force before breakaway (Tabla 4.2)

F_max = mu_s M g (no added mass). The "reading" columns are the needle at the peak and when the student presses 0.2 s and 0.5 s after it (pull at 5 mm/s, nominal bench, 1 N scale for the cloth face, 2 N for the sandpaper face).

| Face | Expected peak mu_s M g (N) | Peak, sim (N) | Press +0.2 s (N) | Press +0.5 s (N) | mu_s from a +0.2 s press |
|---|---|---|---|---|---|
| Cloth (tela) | 0.391 | 0.390 | 0.296 | 0.267 | 0.303 (true 0.400) |
| Sandpaper (lija) | 0.704 | 0.703 | 0.498 | 0.515 | 0.510 (true 0.720) |

A late press catches the dropped (kinetic-like) force, so the static coefficient comes out too low and may even fall below mu_k: the human-reaction point of the lab.

### Trial scatter (300 seeded draws)

| Face | mean mu_s | sd mu_s | mean mu_k | sd mu_k | sd of a single peak reading (N, M g = 0.977 N) |
|---|---|---|---|---|---|
| Cloth (tela) | 0.399 | 0.020 | 0.300 | 0.009 | 0.019 |
| Sandpaper (lija) | 0.718 | 0.036 | 0.549 | 0.017 | 0.035 |

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
| Wood (madera) | 1.490 | 0.134 | 0.301 | 0.013 |
| Aluminium (aluminio) | 1.526 | 0.177 | 0.401 | 0.017 |
| Iron (hierro) | 1.415 | 0.155 | 0.461 | 0.019 |

## Notes for the discussion (not shown to the student)

- The coefficients from exp. 1 (slope) are kinetic; from exp. 2 static; from exp. 3 the onset height is static information while the slide time gives a kinetic coefficient, so the guide's task 6 is a real question: the sim keeps both effects visible (onset height h and time t).
- The coefficient does not depend on the weight (the fit is a straight line through the origin) nor, in this model, on the contact area; it depends on BOTH surfaces (a different face gives a different value on the same paper; a different bar a different value on the same rail).
- Which pair has the largest coefficient and whether mu_s > mu_k was shown are for the student to conclude from their own data; with the ASSUMED values above and the default scatter the static values exceed the kinetic ones, but a late press, an unzeroed scale or a loose paper can hide it.
