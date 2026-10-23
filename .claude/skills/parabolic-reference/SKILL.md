---
name: parabolic-reference
description: Paraphrased facts from the EPN guide "Práctica 2: Movimiento parabólico" (horizontal launch of a marble and a ping-pong ball from a table edge after rolling down an inclined rail): objectives, materials, assembly, procedure, Tabla 2.1 layout and analysis tasks. Use instead of opening the copyrighted PDF.
---

# Source (paraphrased, not copied)

Escuela Politécnica Nacional (Quito), Laboratorio de Física, Newtonian-mechanics course, "Práctica 2: Movimiento
parabólico", 3 pages, Spanish. The PDF is in `refs/` (gitignored); never commit it or long verbatim passages.

## Context and objectives
- Motivation: everyday projectiles (throwing at a target, the "Angry Birds" game). Questions: what path do they
  follow, are they accelerated, how does gravity act, how do launch speed and angle shape the path, how does this
  differ from MRUV?
- General objective: analyse experimentally a body launched horizontally from a height near the Earth's surface and
  identify the main features of the motion.
- Specific objectives: (1) find the fall time of a body launched horizontally from a known height; (2) use the
  horizontal motion and the measured range to get the launch speed; (3) compare with the theoretical projectile
  equations and evaluate error sources.

## Preparatory work (notebook questions, summarised)
1. What parabolic motion is and why a projectile's path is a parabola.
2. How to split a horizontal launch into horizontal and vertical motions, and what kind of motion each is.
3. The position equations x(t), y(t) for a horizontal launch.
4. For a horizontal launch from height h, what the fall time depends on.
5. How to compute the horizontal range of a horizontal launch.

## Materials (section 2.3.1)
Metal rail 1.2 m; a marble and a ping-pong ball; base for the height-adjustable stand; 2 height-adjustable stands
(rack-and-pinion "con cremallera" and two-leg); level ("nivelador"); tape measure ("cinta métrica"); stopwatch;
2 sheets of bond paper; 1 sheet of carbon paper. (Screws are used in the assembly text, not listed.)

## Assembly (section 2.3.2)
1. Build the track with the stands and screws: rack-and-pinion stand at one end of the rail, two-leg stand at the
   other.
2. Raise the rack-stand end **20 cm** above the horizontal so the opposite end rests on the table (Figure 2.1: a long
   straight incline, the rack stand on its base at the high end, the two-leg stand near the low end, the rail tip on
   the table surface).
3. Place the track so its lower end is **about 5 cm from the table edge**.

## Procedure (section 2.3.3)
1. Mark 5 different positions along the **upper half** of the track.
2. Put the paper on the floor where the marble will land.
3. Put the carbon paper on top so the marble leaves a mark when it lands.
4. Place the marble at the first mark and release it without pushing.
5. When the marble reaches the table edge, start the stopwatch; stop it when it lands. This is the flight time.
6. Using the mark on the paper, measure the horizontal distance reached, measured from the table edge. Do not move
   the paper before measuring.
7. Do 5 measurements for each mark and record them in Tabla 2.1.
8. Swap the marble for the ping-pong ball and repeat steps 2 to 7.
9. Measure the launch height.

## Tabla 2.1 (layout)
Title: experimental flight times, ranges and launch speeds of the horizontal launch. Columns: No. (trial = mark,
1 to 5), Tiempo [s] and Alcance [m] (5 repetitions per trial), Tiempo promedio t ± Δt [s], Alcance promedio x ± Δx [m],
Velocidad inicial v ± Δv [m/s]. One table per ball (marble, ping-pong).

## Analysis tasks (section 2.4)
1. Sketch the experiment. What motion does the marble have after leaving the table? What is the direction of its
   velocity as it leaves the table?
2. Complete Tabla 2.1 with the mean time and mean range of each trial.
3. From the data, what happens to the flight times across trials?
4. Compute the launch speed of the bodies as they leave the table, for each trial.
5. Derive a theoretical expression for the flight time and compute the expected flight time. What does it depend on?
   Does it change with the launch speed?
6. Compare expected and experimental flight time. What is the percentage error?
7. Compute the final speed of the bodies just before they hit the floor.
8. What is the difference between the motion of the marble and of the ping-pong ball?
9. What are the conditions for ideal projectile motion? Are they met in your experiment? If not, list the factors
   that caused the deviations.

## Physics notes for the model (not in the guide; see PARAMETERS.md for values)
- Expected flight time t = √(2H/g), independent of v0; with H ≈ 0.75–0.80 m, t ≈ 0.39–0.40 s. Hand timing of
  ~0.4 s with reaction times ~0.15–0.25 s gives large relative errors: a central lesson of tasks 5–6.
- v0 = x/t; v0 comes from rolling down the incline (rolling inertia, the slope-to-table kink, the short roll on the
  table), so it is below √(2gΔh).
- Ping-pong ball (2.7 g, 40 mm, hollow): larger rolling inertia (k = 2/3), noticeable air drag, faint carbon mark and
  bounces; marble (solid, k = 2/5) is close to ideal.
- Final speed before landing: v = √(v0² + 2gH).
