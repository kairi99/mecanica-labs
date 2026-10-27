---
name: friction-reference
description: Paraphrased facts from the EPN guide "Práctica 4: Fuerza de rozamiento" (static and kinetic friction: a friction block with cloth and sandpaper faces pulled over paper with 1 N / 2 N spring scales and 50 g masses, plus wood, aluminium and iron bars sliding down a rail raised until they slip): objectives, materials, assembly, the three experiments, Tablas 4.1–4.3 and analysis tasks. Use instead of opening the copyrighted PDF.
---

# Source (paraphrased, not copied)

Escuela Politécnica Nacional (Quito), Laboratorio de Física, Newtonian-mechanics course, "Práctica 4: Fuerza de
rozamiento", 4 pages, Spanish. The PDF is in `refs/` (gitignored); never commit it or long verbatim passages.

## Context and objectives
- Motivation: friction is everywhere, sometimes a loss (energy, harder motion), sometimes essential (walking,
  braking); it depends on the surfaces in contact (roughness, material). Example question: is the tyre–road
  coefficient larger on a wet or a dry motorway?
- General objective: study the nature of friction and the difference between the static and kinetic states.
- Specific objectives: (1) measure static and kinetic friction forces for several pairs of surfaces; (2) compute the
  coefficients and compare materials; (3) interpret them through the surfaces' physical properties and discuss error
  sources.

## Preparatory work (notebook questions, summarised)
1. Difference between static and kinetic friction; which is usually larger and why.
2. What friction between two surfaces depends on, and what does not directly affect it.
3. Free-body diagram of a body pulled horizontally on a rough horizontal surface; an equation for the coefficient,
   in static and in kinetic equilibrium.

## Materials (section 4.3.1)
Aluminium bar; wooden bar; iron bar; friction block ("taco de rozamiento", one cloth face and one sandpaper face, with
a hook); 1 N dynamometer; 2 N dynamometer; metal rail 1.2 m; 3 silver 50 g masses; tape measure ("cinta métrica");
one sheet of paper. (Exp. 3 needs the rail raised at one end and a stopwatch; neither a stand nor a stopwatch is
listed. The sim offers the rack-and-pinion stand and a stopwatch and says so in the help page.)

## Assembly (section 4.3.2)
Figure 4.1: three sketches of a block on a horizontal table pulled to the right by a spring scale hooked to the
block's hook: the block on one face, the block on another face, and the block with a mass stacked on top.
1. Put one face of the friction block on the surface it will move on.
2. Hook the lower end of the dynamometer to the block's hook.

## Procedure (section 4.3.3)
At least 5 measurements per case; more are recommended for better statistics.

First experiment (kinetic, constant speed):
1. Measure the block's mass M.
2. Fix a sheet of paper to the table so it does not move.
3. Put the cloth face on the paper and measure the force F that moves the block uniformly.
4. Five force readings into Tabla 4.1.
5. Repeat with the sandpaper face.
6. Repeat adding 50 g at a time with the silver masses, up to 150 g added.

Second experiment (static, impending motion):
1. Remove the masses, cloth face on paper, and measure the force at which the block is about to move: the largest
   force needed before it leaves rest and starts moving.
2. Five readings into Tabla 4.2.
3. Repeat with the sandpaper face.

Third experiment (incline):
1. Measure 100 cm on the metal rail and mark a starting point.
2. Put the wooden bar on the rail at the starting point.
3. Raise the rail end where the body is, forming an incline, and record the height h at which the body starts to
   slide without stopping. Also record the time it takes to cover the 100 cm.
4. Five measurements into Tabla 4.3.
5. Repeat with the aluminium and iron bars.

## Tables (layout)
- Tabla 4.1 (force moving the block uniformly on paper): Material (on paper: Tela, Lija), Masa sobre el taco [g]
  (0, 50, 100, 150), Fuerza [N] (5 readings), Fuerza promedio F ± ΔF [N]. 8 rows.
- Tabla 4.2 (largest force at which the block starts moving on paper): Material (Tela, Lija), Fuerza máxima [N]
  (5 readings), Fuerza máxima promedio F ± ΔF [N]. 2 rows.
- Tabla 4.3 (rail raise height and slide time): No. 1–5; for Madera, Aluminio, Hierro: Altura [m] and Tiempo [s].

## Analysis tasks (section 4.4)
First and second experiments:
1. Free-body diagram; an expression for the applied force in terms of the coefficient and the block's weight.
2. Exp. 1: plot mean force against weight and fit a line, for each material.
3. What does the slope represent? Coefficients for each case of exp. 1.
4. Coefficient for each case of exp. 2 from the mean force and the equation of task 1.
5. Are the coefficients of tasks 3 and 4 static or kinetic?
6. Does the coefficient depend on one surface or on both surfaces in contact?
Third experiment:
1. From h, compute the rail's inclination angle.
2. Assuming MRUV, the acceleration of each trial from position and time.
3. Free-body diagram; an expression for the coefficient in terms of the angle and the acceleration.
4. The coefficient for each trial.
5. The experimental coefficient of each material as the mean with its uncertainty, µexp = µ̄ ± δµ.
6. Are these coefficients static or kinetic?
7. Look up (reliable, cited source) the static and/or kinetic coefficient of the surfaces and compare; relative error.
General:
1. Which surface pairs have the largest coefficient?
2. Was the static coefficient shown to be larger than the kinetic one?

## Physics notes for the model (not in the guide; values go in PARAMETERS.md)
- Exps. 1–2: F_k = µk (M + m) g at constant speed; F_s,max = µs M g at breakaway; µs > µk. Spring-scale readings
  fluctuate during the pull (stick-slip, uneven pulling); the peak is easy to miss by reading late, which biases the
  static reading low. A 1 N scale overranges for heavy loads on sandpaper; the 2 N scale has coarser marks.
- Exp. 3: the bar starts sliding when tan θ exceeds µs; once moving, a = g (sin θ − µk cos θ), so
  µk = tan θ − a / (g cos θ). The angle uses h and the rail geometry (sin θ = h / L between the support and the
  raised point; state the geometry in the help page). Starting just above the threshold gives small a and long,
  scattered times. Because the guide's procedure mixes the onset height (static) with the slide time (kinetic), task 6
  is a real question; the sim must keep both effects visible.
- All material coefficients (cloth, sandpaper on paper; wood, aluminium, iron on the rail) are ASSUMED or cited from
  literature with wide ranges; they are not measured lab values. Task 7 asks students to compare with literature,
  so the help page must not hand them "the right answer".
