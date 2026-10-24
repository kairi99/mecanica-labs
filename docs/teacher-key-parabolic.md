# Teacher key: Practica 2, parabolic motion

_Generated from the model by `npm run teacher-key`. Do not edit by hand; change the model (and PARAMETERS.md) instead._

All ball parameters are **ASSUMED** (see PARAMETERS.md, section Practica 2). Treat the numbers as what this virtual lab produces, not as measured data of the real bench.

## Setup the numbers refer to

- Rail 1.2 m and 2 cm thick, rack-stand clamp 20 cm above the table (the tape reading; the rail rests on the table at its tip, so the ball feels a rise of 18.0 cm and leaves the tip 2.0 cm above the table), high support 1.10 m from the low tip, tip 5 cm from the edge, marks at 60, 70, 80, 90 and 100 cm from the low tip (the `assembled` preset).
- Table height H is hidden and drawn per bench seed between 0.74 and 0.78 m; the tables below use H = 0.76 m unless stated.
- Local g (Quito, 2800 m) = 9.7717 m/s^2.

## Expected flight time (task 5)

t = sqrt(2H/g), independent of v0. With drag and spin the model flight is a little longer (ping-pong more).

| H (m) | sqrt(2H/g) (s) | model t, marble, mark 80 cm (s) | model t, ping-pong, mark 80 cm (s) |
|---|---|---|---|
| 0.74 | 0.3892 | 0.3338 | 0.3400 |
| 0.76 | 0.3944 | 0.3390 | 0.3454 |
| 0.78 | 0.3996 | 0.3441 | 0.3507 |

## Expected launch speed, time and range per mark (no run variability)

v0 is the speed at the table edge, from the model (incline, corner loss, roll over the gap, air). It is below sqrt(2 g dh) because of rolling inertia (the marble keeps 5/7 of the energy as translation, the hollow ping-pong ball about 0.6), the junction and rolling resistance. Spread columns: mean and sd over 1000 seeded runs with the run variability on.

### Marble

| Mark (cm) | v0 (m/s) | t (s) | x (m) | v0 mean +- sd (m/s) | t mean +- sd (s) | x mean +- sd (m) |
|---|---|---|---|---|---|---|
| 60 | 1.145 | 0.4333 | 0.494 | 1.131 +- 0.010 | 0.4328 +- 0.0003 | 0.487 +- 0.005 |
| 70 | 1.139 | 0.3375 | 0.383 | 1.126 +- 0.012 | 0.3380 +- 0.0092 | 0.379 +- 0.013 |
| 80 | 1.218 | 0.3390 | 0.411 | 1.203 +- 0.011 | 0.3387 +- 0.0002 | 0.405 +- 0.004 |
| 90 | 1.291 | 0.3401 | 0.437 | 1.275 +- 0.012 | 0.3398 +- 0.0002 | 0.431 +- 0.004 |
| 100 | 1.361 | 0.3409 | 0.461 | 1.344 +- 0.012 | 0.3407 +- 0.0001 | 0.455 +- 0.004 |

### Ping-pong ball

| Mark (cm) | v0 (m/s) | t (s) | x (m) | v0 mean +- sd (m/s) | t mean +- sd (s) | x mean +- sd (m) |
|---|---|---|---|---|---|---|
| 60 | 1.018 | 0.3421 | 0.328 | 0.998 +- 0.013 | 0.3765 +- 0.0542 | 0.354 +- 0.050 |
| 70 | 1.097 | 0.3440 | 0.355 | 1.070 +- 0.020 | 0.3434 +- 0.0005 | 0.346 +- 0.007 |
| 80 | 1.170 | 0.3454 | 0.380 | 1.141 +- 0.021 | 0.3449 +- 0.0004 | 0.370 +- 0.007 |
| 90 | 1.238 | 0.3464 | 0.404 | 1.207 +- 0.022 | 0.3459 +- 0.0003 | 0.393 +- 0.008 |
| 100 | 1.301 | 0.3471 | 0.425 | 1.269 +- 0.023 | 0.3468 +- 0.0003 | 0.414 +- 0.008 |

The flight time hardly changes with the mark (it depends on H, not on v0): the range grows with v0, the time does not. This is the expected answer to tasks 3 and 5. The ping-pong ball is slower at the same mark (larger rolling inertia, more air drag and more corner loss) and its range is shorter.

## Why the hand-timed flight has a large relative error (task 6)

A flight of about 0.4 s is timed with two presses. If the stop press lags the start press by a constant bias b, every reading is t + b. The analysis assumes a Type B bias of +-0.1 s (u = 0.0577 s, ASSUMED), common to all readings, so it does not average down. Effect on the percent error against t = 0.394 s (H = 0.76 m):

| Bias b (s) | reading (s) | error (%) |
|---|---|---|
| -0.10 | 0.29 | -25 |
| -0.05 | 0.34 | -13 |
| +0.00 | 0.39 | +0 |
| +0.05 | 0.44 | +13 |
| +0.10 | 0.49 | +25 |
| +0.20 | 0.59 | +51 |

Typical student errors the coach looks for: starting the watch at the release adds the roll down the rail and over the gap (about 1 s), a clear outlier near 1.4 s; starting 0.3 s late misses three quarters of the fall. The slow-motion step gives a reference counted in frames at 240 fps (+-1 frame = +-4.2 ms, u about 1.7 ms).

## Uncertainty conventions of the analysis panel

- Time of a mark: mean of 5 readings; Delta t = sqrt(uA^2 + uRes^2 + uReact^2) with uA = s/sqrt(5), uRes = 0.01 s/sqrt(12), uReact = 0.1 s/sqrt(3) (ASSUMED half-width 0.1 s).
- Range of a mark: mean of 5; Delta x = sqrt(uA^2 + uTape^2 + uProj^2) with uTape = 1 mm/sqrt(12) and the edge-projection placement 2 mm (ASSUMED, the same sigma the bench draws).
- v0 = x/t; Delta v = v0 sqrt((Dx/x)^2 + (Dt/t)^2) (GUM 5.1.2). The reaction bias is shared by all marks, so the v0 of different marks are correlated; the panel says so. Comparisons between marks or between balls (task 3 bars and spread, task 8) use the scatter-only uncertainty (Type A + resolution, no reaction bias, and the v0 uncertainty built from it): the same hand and the same lag shift every time equally, so the bias cancels in a difference. Task 6 keeps the full Delta t.
- Expected time: u_t = t/2 sqrt((u_H/H)^2 + (u_g/g)^2) with u_H = sqrt(2) x 1 mm/sqrt(12) = 0.41 mm (two tape ends) and u_g = 0.005 m/s^2 (ASSUMED).
- Final speed: v = sqrt(v0^2 + 2 g H), u_v = sqrt((v0 u_v0)^2 + (g u_H)^2 + (H u_g)^2)/v.
- Verdicts compare |t - t_theo| with the combined standard uncertainty (within 1 sigma, 1 to 2 sigma, beyond 2 sigma).

## A simulated careful student

Preset `assembled` (seed 1), 49 simulated launches with both ranges and times (start press 0.20 s after the edge, stop press 0.22 s after the landing, 0.05 s reaction scatter, so the net bias is about +0.02 s). Hidden H = 0.7541 m, tape reading 0.754 m, t_theo = **0.3928 +- 0.0001 s**. Launches that left a readable carbon dot: marble 25 of 25, ping-pong 24 of 46 (the others were repeated).

| Ball | Mark | t +- Dt (s) | x (m) | v0 +- Dv (m/s) | error of t (%) | final v (m/s) |
|---|---|---|---|---|---|---|
| Marble | 1 | 0.438 +- 0.072 | 0.489 +- 0.004 | 1.12 +- 0.18 | 11.5 | 4.00 +- 0.05 |
| Marble | 2 | 0.342 +- 0.070 | 0.379 +- 0.002 | 1.11 +- 0.23 | -12.9 | 4.00 +- 0.06 |
| Marble | 3 | 0.372 +- 0.059 | 0.405 +- 0.004 | 1.09 +- 0.17 | -5.3 | 3.99 +- 0.05 |
| Marble | 4 | 0.342 +- 0.063 | 0.433 +- 0.002 | 1.27 +- 0.23 | -12.9 | 4.04 +- 0.07 |
| Marble | 5 | 0.370 +- 0.071 | 0.452 +- 0.003 | 1.22 +- 0.23 | -5.8 | 4.03 +- 0.07 |
| Ping-pong ball | 1 | 0.455 +- 0.084 | 0.433 +- 0.003 | 0.95 +- 0.18 | 15.8 | 3.96 +- 0.04 |
| Ping-pong ball | 2 | 0.380 +- 0.061 | 0.348 +- 0.003 | 0.92 +- 0.15 | -3.3 | 3.95 +- 0.03 |
| Ping-pong ball | 3 | 0.300 +- 0.067 | 0.366 +- 0.003 | 1.22 +- 0.27 | -23.6 | 4.03 +- 0.08 |
| Ping-pong ball | 4 | 0.352 +- 0.076 | 0.388 +- 0.005 | 1.10 +- 0.24 | -10.4 | 3.99 +- 0.07 |
| Ping-pong ball | 5 | 0.308 +- 0.070 | 0.410 +- 0.006 | 1.33 +- 0.30 | -21.6 | 4.06 +- 0.10 |

- Marble, all 25 readings: t = 0.373 s, error -5.1 % (within1).
- Ping-pong ball, all 25 readings: t = 0.355 s, error -9.6 % (within1).

## Expected answers and common mistakes, tasks 1, 4, 7, 8 and 9

Numbers use H = 0.76 m and the model without run variability.

### Task 1, the motion

After the edge only gravity (and a little air) acts. Horizontally the motion is uniform (constant velocity, no horizontal force); vertically it is free fall from rest (uniform acceleration g = 9.77 m/s^2). The path is a parabola. The velocity at the edge is horizontal, along the rail direction on the table. Common mistake: drawing a force "of the launch" that keeps pushing the ball forward.

### Task 4, launch speed per mark

| Mark (cm) | v0 marble (m/s) | v0 ping-pong (m/s) |
|---|---|---|
| 60 | 1.15 | 1.02 |
| 70 | 1.14 | 1.10 |
| 80 | 1.22 | 1.17 |
| 90 | 1.29 | 1.24 |
| 100 | 1.36 | 1.30 |

v0 = x/t with the range from the edge projection and the flight time. Common mistakes: v0 = sqrt(2 g dh) from the height drop of the rail (it ignores the rotation, the corner and the table roll, so it is too large); range measured from the rail tip instead of the edge projection; timing from the release instead of from the edge (the flight time becomes about 1 s and v0 about 0.4 of its value).

### Task 7, final speed and angle

| Ball | Mark (cm) | v final (m/s) | angle below horizontal (deg) |
|---|---|---|---|
| Marble | 60 | 4.02 | 73 |
| Marble | 70 | 4.02 | 74 |
| Marble | 80 | 4.04 | 72 |
| Marble | 90 | 4.06 | 71 |
| Marble | 100 | 4.09 | 71 |
| Ping-pong ball | 60 | 3.99 | 75 |
| Ping-pong ball | 70 | 4.01 | 74 |
| Ping-pong ball | 80 | 4.03 | 73 |
| Ping-pong ball | 90 | 4.05 | 72 |
| Ping-pong ball | 100 | 4.07 | 71 |

v = sqrt(v0^2 + 2 g H); the vertical part is 3.85 m/s whatever the mark, so the final speed is set mostly by H and changes little between marks (v0 only adds in quadrature). Common mistakes: adding v0 and g t as numbers instead of as perpendicular components; taking the final speed equal to v0.

### Task 8, marble and ping-pong ball

At mark 80 cm: v0 marble 1.218 m/s, ping-pong 1.170 m/s, ratio 1.041. Ideal rolling without losses gives v proportional to 1/sqrt(1 + k_eff) (k_eff includes the channel of width 10 mm), so the ratio marble/ping-pong would be sqrt((1 + k_pp)/(1 + k_marble)) = 1.012 (k_marble = 0.656, k_pp = 0.697); the model value differs from it by the rolling resistance, the corner loss and the air, which hit the light ball more. The ping-pong ball therefore leaves slower and its range is shorter (0.380 m against 0.411 m). The flight times are the same within hand timing (0.339 s against 0.345 s, a difference far below the 0.1 s reaction uncertainty); air drag lengthens the flight by 0.09 % for the marble and 1.51 % for the ping-pong ball. Common mistakes: saying the lighter ball falls slower in vacuum; explaining the range difference by mass alone (it is the rotational inertia and the losses); calling a difference real when it is below 1 sigma (the panel compares with the scatter-only uncertainty).

### Task 9, ideal projectile

Conditions of the ideal model: no air drag and no Magnus lift (the model includes both, small); constant g over the fall; launch velocity exactly horizontal; the ball treated as a point (it is a sphere with spin and size); the ball leaves exactly at the table edge, with no contact with it. Expected factors of deviation: reaction bias (raises or lowers t), edge projection placement (shifts every x), drag (lengthens t and shortens x slightly, more for the ping-pong ball), a launch that is not exactly horizontal (changes t). Common mistake: listing only "human error" without saying which quantity it shifts and in which direction.

## URL flags

| Flag | Effect |
|---|---|
| `?reference=0` | Hides the slow-motion step and its reference time in the analysis (steps renumber). |
| `?analysis=0` | Hides the analysis step (steps renumber). |
| `?seed=N` | Fixes the hidden values (table height, tilt) and the run variability. |
| `?preset=assembled` or `?preset=empty` | Starts from a careful student's bench or a bare one (ignores saved progress). |
| `?tour=0` or `?tour=1` | Never or always start the first-visit tour. |
| `?lang=es` or `?lang=en` | Language. |
| `?theme=light` or `?theme=dark` | Theme. |
| `?cam=overview`, `edge`, ... | Fixes the 3D camera preset. |
