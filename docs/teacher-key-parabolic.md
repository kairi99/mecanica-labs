# Teacher key: Practica 2, parabolic motion

_Generated from the model by `npm run teacher-key`. Do not edit by hand; change the model (and PARAMETERS.md) instead._

All ball parameters are **ASSUMED** (see PARAMETERS.md, section Practica 2). Treat the numbers as what this virtual lab produces, not as measured data of the real bench.

## Setup the numbers refer to

- Rail 1.2 m and 2 cm thick, rack-stand clamp 20 cm above the table (the tape reading; the rail rests on the table at its tip, so the ball feels a rise of 18.0 cm and the beam end is 2.0 cm above the table), high support 1.10 m from the low tip, the rail ends in a sloped shoe (6 cm, 6 deg steeper than the rail) whose lip is 3.8 mm above the table and 5 cm from the edge, marks at 60, 70, 80, 90 and 100 cm from the low tip (the `assembled` preset).
- Table height H is hidden and drawn per bench seed between 0.74 and 0.78 m; the tables below use H = 0.76 m unless stated.
- Local g (Quito, 2800 m) = 9.7717 m/s^2.

## Expected flight time (task 5)

t = sqrt(2H/g), independent of v0. With drag and spin the model flight is a little longer (ping-pong more).

| H (m) | sqrt(2H/g) (s) | model t, marble, mark 80 cm (s) | model t, ping-pong, mark 80 cm (s) |
|---|---|---|---|
| 0.74 | 0.3892 | 0.3837 | 0.3989 |
| 0.76 | 0.3944 | 0.3890 | 0.4043 |
| 0.78 | 0.3996 | 0.3941 | 0.4096 |

## Expected launch speed, time and range per mark (no run variability)

v0 is the horizontal speed of the ball centre as it crosses the table edge, from the model (incline, flight off the rail end, touches on the shoe ramp and the table, hops, slip and roll, air). It is below sqrt(2 g dh) because of rolling inertia (the marble keeps 5/7 of the energy as translation, the hollow ping-pong ball about 0.6), the energy lost in the touches and rolling resistance. Spread columns: mean and sd over 1000 seeded runs with the run variability on.

### Marble

| Mark (cm) | v0 (m/s) | t (s) | x (m) | v0 mean +- sd (m/s) | t mean +- sd (s) | x mean +- sd (m) |
|---|---|---|---|---|---|---|
| 60 | 1.214 | 0.3825 | 0.462 | 1.201 +- 0.010 | 0.3819 +- 0.0004 | 0.457 +- 0.004 |
| 70 | 1.298 | 0.3859 | 0.498 | 1.284 +- 0.010 | 0.3854 +- 0.0004 | 0.492 +- 0.004 |
| 80 | 1.379 | 0.3890 | 0.534 | 1.362 +- 0.013 | 0.3888 +- 0.0001 | 0.527 +- 0.005 |
| 90 | 1.440 | 0.3953 | 0.566 | 1.428 +- 0.008 | 0.3934 +- 0.0027 | 0.559 +- 0.005 |
| 100 | 1.517 | 0.3967 | 0.599 | 1.498 +- 0.014 | 0.3964 +- 0.0002 | 0.591 +- 0.006 |

### Ping-pong ball

| Mark (cm) | v0 (m/s) | t (s) | x (m) | v0 mean +- sd (m/s) | t mean +- sd (s) | x mean +- sd (m) |
|---|---|---|---|---|---|---|
| 60 | 1.098 | 0.4055 | 0.421 | 1.081 +- 0.012 | 0.4019 +- 0.0037 | 0.411 +- 0.007 |
| 70 | 1.183 | 0.4060 | 0.454 | 1.153 +- 0.021 | 0.4060 +- 0.0001 | 0.443 +- 0.008 |
| 80 | 1.261 | 0.4043 | 0.482 | 1.230 +- 0.023 | 0.4051 +- 0.0005 | 0.471 +- 0.008 |
| 90 | 1.300 | 0.4176 | 0.513 | 1.273 +- 0.016 | 0.4150 +- 0.0047 | 0.499 +- 0.010 |
| 100 | 1.367 | 0.4187 | 0.541 | 1.333 +- 0.025 | 0.4182 +- 0.0004 | 0.527 +- 0.010 |

The flight time hardly changes with the mark (it depends on H, not on v0): the range grows with v0, the time does not. This is the expected answer to tasks 3 and 5. The ping-pong ball is slower at the same mark (larger rolling inertia, more air drag and more corner loss) and its range is shorter. In this model the launch is not exactly horizontal (next section), so the times below differ from sqrt(2H/g) by a few percent; that difference is a property of the model, not a student error.

## How the ball leaves the table (diagonal launches)

The rail ends in a sloped shoe; the ball leaves the end of the rail as a projectile (it does not follow the change of slope at these speeds), can touch the ramp and the table, bounces (marble e = 0.60, ping-pong e = 0.868, the latter from the table-tennis bounce rule), and leaves the edge either rolling (horizontal launch) or in the air (mid-hop: a launch at a few degrees up or down). Launch angle: above the horizontal, negative = downward. Per mark, default set-up, no run variability:

| Ball | Mark (cm) | touches (ramp/table) | leaves | angle (deg) | speed (m/s) | t (s) | x (m) |
|---|---|---|---|---|---|---|---|
| Marble | 60 | 3/1 | in the air | -5.9 | 1.22 | 0.382 | 0.462 |
| Marble | 70 | 3/1 | in the air | -4.1 | 1.30 | 0.386 | 0.498 |
| Marble | 80 | 2/1 | in the air | -2.6 | 1.38 | 0.389 | 0.534 |
| Marble | 90 | 1/1 | in the air | -0.2 | 1.44 | 0.395 | 0.566 |
| Marble | 100 | 1/1 | in the air | 0.4 | 1.52 | 0.397 | 0.599 |
| Ping-pong ball | 60 | 2/1 | in the air | 1.6 | 1.10 | 0.406 | 0.421 |
| Ping-pong ball | 70 | 2/1 | in the air | 2.0 | 1.18 | 0.406 | 0.454 |
| Ping-pong ball | 80 | 2/1 | in the air | 1.3 | 1.26 | 0.404 | 0.482 |
| Ping-pong ball | 90 | 1/1 | in the air | 6.5 | 1.31 | 0.418 | 0.513 |
| Ping-pong ball | 100 | 1/1 | in the air | 6.7 | 1.38 | 0.419 | 0.541 |

Set-ups that make the launch clearly diagonal (mark 80 cm, no run variability). The time is measured from the edge crossing, as the guide asks:

| Set-up | Ball | angle (deg) | leaves | t (s) | x (m) |
|---|---|---|---|---|---|
| rail end 3 cm beyond the edge (overhang) | Marble | -18.9 | on the rail or shoe | 0.388 | 0.488 |
| rail end 3 cm beyond the edge (overhang) | Ping-pong ball | -18.9 | on the rail or shoe | 0.405 | 0.473 |
| rail end 9 cm beyond the edge (beam on the table corner) | Marble | -10.1 | on the rail or shoe | 0.435 | 0.543 |
| rail end 9 cm beyond the edge (beam on the table corner) | Ping-pong ball | -10.1 | on the rail or shoe | 0.446 | 0.512 |
| two-leg stand raised, 60 mm (tip lifted, ball falls on the table) | Marble | -33.2 | in the air | 0.343 | 0.355 |
| two-leg stand raised, 60 mm (tip lifted, ball falls on the table) | Ping-pong ball | -33.9 | in the air | 0.350 | 0.329 |
| gap 1 cm | Marble | 9.1 | in the air | 0.418 | 0.574 |
| gap 1 cm | Ping-pong ball | -13.4 | in the air | 0.371 | 0.433 |
| gap 7 cm | Marble | -8.5 | in the air | 0.374 | 0.514 |
| gap 7 cm | Ping-pong ball | -5.7 | in the air | 0.388 | 0.463 |

Reading: a downward launch (overhang, a raised tip, a hop that leaves downward) shortens the flight below sqrt(2H/g) and lengthens the range for the same speed; an upward launch (a hop that leaves rising) does the opposite. Range is not monotonic in the mark where the first touch on the table falls close to the edge. The analysis panel tells the student, neutrally, when some launches were not horizontal; it never answers the guide's questions.

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

Preset `assembled` (seed 1), 50 simulated launches with both ranges and times (start press 0.20 s after the edge, stop press 0.22 s after the landing, 0.05 s reaction scatter, so the net bias is about +0.02 s). Hidden H = 0.7541 m, tape reading 0.754 m, t_theo = **0.3928 +- 0.0001 s**. Launches that left a readable carbon dot: marble 25 of 25, ping-pong 25 of 29 (the others were repeated).

| Ball | Mark | t +- Dt (s) | x (m) | v0 +- Dv (m/s) | error of t (%) | final v (m/s) |
|---|---|---|---|---|---|---|
| Marble | 1 | 0.386 +- 0.071 | 0.458 +- 0.004 | 1.19 +- 0.22 | -1.7 | 4.02 +- 0.06 |
| Marble | 2 | 0.388 +- 0.070 | 0.494 +- 0.003 | 1.27 +- 0.23 | -1.2 | 4.04 +- 0.07 |
| Marble | 3 | 0.422 +- 0.059 | 0.526 +- 0.004 | 1.25 +- 0.17 | 7.4 | 4.04 +- 0.05 |
| Marble | 4 | 0.394 +- 0.063 | 0.560 +- 0.002 | 1.42 +- 0.23 | 0.3 | 4.09 +- 0.08 |
| Marble | 5 | 0.426 +- 0.072 | 0.586 +- 0.004 | 1.38 +- 0.23 | 8.4 | 4.08 +- 0.08 |
| Ping-pong ball | 1 | 0.422 +- 0.071 | 0.410 +- 0.002 | 0.97 +- 0.16 | 7.4 | 3.96 +- 0.04 |
| Ping-pong ball | 2 | 0.434 +- 0.061 | 0.449 +- 0.003 | 1.04 +- 0.15 | 10.5 | 3.98 +- 0.04 |
| Ping-pong ball | 3 | 0.448 +- 0.067 | 0.466 +- 0.003 | 1.04 +- 0.15 | 14.0 | 3.98 +- 0.04 |
| Ping-pong ball | 4 | 0.406 +- 0.073 | 0.500 +- 0.004 | 1.23 +- 0.22 | 3.3 | 4.03 +- 0.07 |
| Ping-pong ball | 5 | 0.396 +- 0.069 | 0.522 +- 0.004 | 1.32 +- 0.23 | 0.8 | 4.06 +- 0.07 |

- Marble, all 25 readings: t = 0.403 s, error 2.6 % (within1).
- Ping-pong ball, all 25 readings: t = 0.421 s, error 7.2 % (within1).

## Expected answers and common mistakes, tasks 1, 4, 7, 8 and 9

Numbers use H = 0.76 m and the model without run variability.

### Task 1, the motion

After the edge only gravity (and a little air) acts. Horizontally the motion is uniform (constant velocity, no horizontal force); vertically it is free fall from rest (uniform acceleration g = 9.77 m/s^2). The path is a parabola. The velocity at the edge is horizontal in the idealisation of the guide; in this virtual lab it is within a few degrees of horizontal for the guide's set-up (see the diagonal launches table). Common mistake: drawing a force "of the launch" that keeps pushing the ball forward.

### Task 4, launch speed per mark

| Mark (cm) | v0 marble (m/s) | v0 ping-pong (m/s) |
|---|---|---|
| 60 | 1.21 | 1.10 |
| 70 | 1.30 | 1.18 |
| 80 | 1.38 | 1.26 |
| 90 | 1.44 | 1.30 |
| 100 | 1.52 | 1.37 |

v0 = x/t with the range from the edge projection and the flight time. Common mistakes: v0 = sqrt(2 g dh) from the height drop of the rail (it ignores the rotation, the corner and the table roll, so it is too large); range measured from the rail tip instead of the edge projection; timing from the release instead of from the edge (the flight time becomes about 1 s and v0 about 0.4 of its value).

### Task 7, final speed and angle

| Ball | Mark (cm) | v final (m/s) | angle below horizontal (deg) |
|---|---|---|---|
| Marble | 60 | 4.04 | 73 |
| Marble | 70 | 4.07 | 71 |
| Marble | 80 | 4.09 | 70 |
| Marble | 90 | 4.11 | 70 |
| Marble | 100 | 4.14 | 69 |
| Ping-pong ball | 60 | 4.01 | 74 |
| Ping-pong ball | 70 | 4.03 | 73 |
| Ping-pong ball | 80 | 4.06 | 72 |
| Ping-pong ball | 90 | 4.07 | 71 |
| Ping-pong ball | 100 | 4.09 | 70 |

v = sqrt(v0^2 + 2 g H); the vertical part is 3.85 m/s whatever the mark, so the final speed is set mostly by H and changes little between marks (v0 only adds in quadrature). Common mistakes: adding v0 and g t as numbers instead of as perpendicular components; taking the final speed equal to v0.

### Task 8, marble and ping-pong ball

At mark 80 cm: v0 marble 1.379 m/s, ping-pong 1.261 m/s, ratio 1.093. Ideal rolling without losses gives v proportional to 1/sqrt(1 + k_eff) (k_eff includes the channel of width 10 mm), so the ratio marble/ping-pong would be sqrt((1 + k_pp)/(1 + k_marble)) = 1.012 (k_marble = 0.656, k_pp = 0.697); the model value differs from it by the rolling resistance, the corner loss and the air, which hit the light ball more. The ping-pong ball therefore leaves slower and its range is shorter (0.482 m against 0.534 m). The flight times are the same within hand timing (0.389 s against 0.404 s, a difference far below the 0.1 s reaction uncertainty); air drag lengthens the flight by 0.08 % for the marble and -1.54 % for the ping-pong ball. Common mistakes: saying the lighter ball falls slower in vacuum; explaining the range difference by mass alone (it is the rotational inertia and the losses); calling a difference real when it is below 1 sigma (the panel compares with the scatter-only uncertainty).

### Task 9, ideal projectile

Conditions of the ideal model: no air drag and no Magnus lift (the model includes both, small); constant g over the fall; launch velocity exactly horizontal (here it is a few degrees off, see above); the ball treated as a point (it is a sphere with spin and size); the ball leaves exactly at the table edge, with no contact with it. Expected factors of deviation: reaction bias (raises or lowers t), edge projection placement (shifts every x), drag (lengthens t and shortens x slightly, more for the ping-pong ball), a launch that is not exactly horizontal (changes t). Common mistake: listing only "human error" without saying which quantity it shifts and in which direction.

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
