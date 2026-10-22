---
name: mruv-reference
description: Paraphrased facts from the EPN guide "Práctica 1: MRUV" (DigiCart on an inclined rail): objectives, materials, assembly, procedure, Table 1.1 layout, analysis tasks and the look of the equipment. Use instead of opening the copyrighted PDF or photos.
---

# Source (paraphrased, not copied)

Escuela Politécnica Nacional (Quito), Laboratorio de Física, Newtonian-mechanics course, "Práctica 1: Movimiento
Rectilíneo Uniformemente Variado (MRUV)", 3 pages, Spanish. The PDF and photos are in `refs/` (gitignored); never
commit them or long verbatim passages.

## Context and objectives
- Motivation: everyday MRUV (a car pulling away, a falling object). Questions: what does acceleration mean, is it
  constant, how do mean and instantaneous velocity differ?
- General objective: study experimentally a cart (DigiCart) moving on a straight path with constant acceleration.
- Specific objectives: (1) get v(t) and the acceleration from position and time data; (2) tell mean velocity from
  instantaneous velocity; (3) compare the data with the MRUV model and discuss agreement, differences and error sources.

## Preparatory work (notebook questions, summarised)
1. Characteristics of MRUV and the x(t), v(t), a(t) graphs.
2. The kinematic equations linking position, velocity, acceleration and time.
3. Starting from rest with constant a: relate velocity to distance and time with an expression that does not contain a
   (hint: v = 2x/t for ideal MRUV from rest, i.e. the final velocity is twice the mean velocity).
4. Experimental factors that would make an inclined-plane motion not perfectly uniformly accelerated (friction,
   rolling inertia, air drag, track not straight or not level, release technique, timing).

## Materials (section 1.3.1)
Metal rail 1.2 m; DigiCart; 2 height-adjustable stands (one rack-and-pinion "con cremallera", one two-leg); metal base
for the stand; 6 screws; level ("nivelador"); DigiCart receiver with pulley; stopwatch ("cronómetro").

## Assembly (section 1.3.2)
1. Build the track with the stands and screws: at one end of the rail fit the rack-and-pinion stand; at the opposite
   end fit the DigiCart receiver and the two-leg stand (guide Figure 1.1).
2. Travel distance AB of at least 90 cm.
3. Mark positions every 10 cm inside AB (the positions of Table 1.1). The cart starts from the highest part of the
   track.
4. Raise the rack-and-pinion end by a height h so the incline is **1.30 degrees** to the horizontal. The highest point
   (point A) carries the **0 cm** mark.
- Warning: the DigiCart must never be off the track; it rolls easily on any surface and may fall.

## Procedure (section 1.3.3)
- The cart sits at the top of the track; the **front of the cart** is the reference point for distance travelled.
1. Place the cart on the first mark (0 cm) and let it roll freely from rest.
2. Measure **10 times** the time to cover the distance from 0 cm to each position spaced 10 cm.

## Table 1.1 (layout)
Title: experimental travel times of the DigiCart on an incline of 1.30 degrees. Rows 1 to 10: x = 0, 10, 20, ..., 90 cm.
Columns: t1 ... t10 in seconds. (The 0 cm row is the start, so t = 0.)

## Analysis tasks (section 1.4, summarised)
1. Mean time of each position with its uncertainty.
2. Mean velocity over the whole path (0 to 90 cm).
3. Mean velocity over intervals of 30 cm starting at 0 cm.
4. Mean velocity over intervals of 10 cm starting at 0 cm.
5. Difference between the velocities of tasks 2, 3 and 4.
6. Position-time diagram with all measured points (every 10 cm); fit a function, overlay the curve; what does the
   slope of the tangent represent?
7. Velocity as a function of time v(t), analytically from the regression of task 6.
8. Acceleration from the function of task 7.
9. Final velocity of the cart; compare with the mean velocity of task 2 and relate them.
10. Can we conclude the motion is MRUV? Justify.

## Expected physics (our model, not in the guide)
- Ideal rolling cart: a = g sin(theta)/(1+k), k = sum(I)/(m r^2). At 1.30 degrees g sin(theta) = 0.2217 m/s^2 (g = 9.7717).
- Model with ASSUMED parameters: a ~ 0.206 m/s^2, t(0.1 m) = 0.99 s, t(0.9 m) = 2.96 s (see PARAMETERS.md).
- Resistances are ASSUMED: c_rr = 5e-4 (optimistic; plausible 5e-4 to 5e-3, rolling resistance only), bearing drag 3e-4 N (separate, absolute force) and a static breakaway force 5e-3 N (breakaway angle ~0.15 deg). The value of a follows from them; it is not independent evidence for them.
- Stopwatch: uA = s/sqrt(n) captures only scatter; a mean reaction bias (stop minus start delay, ASSUMED half-width 0.1 s) does not average out.
- Mean velocity over 0..t is half the final velocity in ideal MRUV from rest.

## Equipment look (from the reference photos, described in our own words)
- Aluminium rail with a millimetre scale along the side.
- DigiCart: a white box on small wheels.
- Receiver at the low end: blue body with a black pulley wheel; an adjustable screw foot.
- High end: a vertical rod stand on a black rectangular base, with a blue clamp knob to set the height.
Use these only to draw our own 3D models; do not trace the photos.
