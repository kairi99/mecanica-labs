---
name: newton2-reference
description: Paraphrased facts from the EPN guide "Práctica 3: Relación Fuerza - Aceleración" (Newton's second law with a DigiCart on a level rail pulled by a hanging film canister over a pulley, total mass kept constant by moving 10 g masses from the canister to the cart): objectives, materials, assembly, procedure, Tabla 3.1 layout and analysis tasks. Use instead of opening the copyrighted PDF.
---

# Source (paraphrased, not copied)

Escuela Politécnica Nacional (Quito), Laboratorio de Física, Newtonian-mechanics course, "Práctica 3: Relación
Fuerza - Aceleración", 3 pages, Spanish. The PDF is in `refs/` (gitignored); never commit it or long verbatim passages.

## Context and objectives
- Motivation: kinematics describes motion (position, velocity, acceleration) but not its causes; what makes a body
  leave rest or uniform motion?
- General objective: check experimentally the relation between force, mass and acceleration of Newton's second law.
- Specific objectives: (1) find the system's acceleration from time and distance measurements of the DigiCart on the
  track; (2) compute the net force from the weight of the hanging mass; (3) study how the accelerations of a
  fixed-mass system depend on the applied force and compare with Newton's second law.

## Preparatory work (notebook questions, summarised)
1. State Newton's second law and how net force, mass and acceleration relate.
2. How does acceleration change if the net force grows at constant mass?
3. How does a larger mass change the acceleration produced by the same force?
4. Which experimental factors could make results differ from the prediction?

## Materials (section 3.3.1)
Metal rail 1.2 m; DigiCart; height-adjustable stand and its metal base; DigiCart receiver with pulley; level
("nivelador"); 6 screws; 5 plastic screws; 1 brass screw ("tornillo de latón"); film canister ("contenedor de
película", with lid); balance ("balanza"); stopwatch; 4 silver 10 g masses.
Note: the procedure (step 3) measures the canister's weight with a **dynamometer**, which the materials list does not
include. The sim offers a dynamometer and the balance; say so in the help page instead of hiding the mismatch.

## Assembly (section 3.3.2)
1. Build the track with the stands and level it so it is completely horizontal.
2. Define a 90 cm distance and mark start and end, so the DigiCart starts at the 0 cm mark and runs to the 90 cm mark.
3. Tie the film canister to the DigiCart with a piece of string and the brass screw fixed to the cart's sensor. The
   string goes over the pulley and the canister hangs past the end of the track. The string must be long enough for
   the cart to cover 90 cm but short enough that the canister does not hit the floor.
4. Check the setup against Figure 3.1: a level rail on two supports (the height-adjustable stand on its base at one
   end), the DigiCart on the rail near the stand end, the receiver with pulley clamped at the other end, the string
   running from the cart over the pulley to the canister hanging below the rail end.
- Warning in the guide: the DigiCart must never be off the track; it rolls easily on any surface and could fall.

## Procedure (section 3.3.3)
1. With the balance, measure the total system mass Mt: DigiCart with the brass screw, the canister with lid and the
   four 10 g masses. Record it.
2. Put the four 10 g masses in the canister and close the lid.
3. Measure the force F (weight) of the canister with its masses using the dynamometer; record it in Tabla 3.1.
4. Let the canister hang freely over the table edge, holding the DigiCart at the height-adjustable-stand end.
5. Release the DigiCart from rest at the 0 cm mark.
6. Measure 10 times the time the DigiCart takes to cover the 90 cm; record them in Tabla 3.1.
7. Take one 10 g mass out of the canister, fix it on the DigiCart with a plastic screw, and repeat steps 3 to 6. This
   keeps the total mass of the system constant.
(So the trials are 4, 3, 2, 1 masses in the canister; whether a trial with the empty canister is done is not stated.
The sim does the four stated trials and allows the empty-canister trial as optional.)

## Tabla 3.1 (layout)
Title: experimental data of the canister's force and the DigiCart's run times. Columns: Fuerza [N] and Tiempo [s]
(10 timings per force). One row per force.

## Analysis tasks (section 3.4)
1. Does the DigiCart undergo MRU or MRUV in this experiment? Justify.
2. Mean run time for each distance interval, for each trial, with its uncertainty.
3. From the mean times and the distance, compute the system's acceleration for each trial.
4. For a body of mass M sliding without friction on a horizontal surface, tied by an ideal string to a hanging mass m
   over the table edge (Figure 3.2), write Newton's second law for the system.
5. Plot force against the measured acceleration and fit a straight line. What does the slope represent?
6. Compare the total mass obtained from the fit with the measured Mt and give the experimental error.
7. Can Newton's second law be checked with this experiment?
8. Possible error sources and how to reduce them.

## Physics notes for the model (not in the guide; values go in PARAMETERS.md)
- Ideal: m g = Mt a, with Mt = M_cart + m_screw + m_canister + 4 × 10 g, so F = Mt a and the slope of F(a) is Mt.
- Real: wheel rotational inertia adds an effective mass (Σ I / r² of the wheels and the pulley), and rolling
  resistance, bearing and pulley friction give a force offset. F(a) is then a line with slope a little above Mt and a
  positive intercept (the friction force). Residual tilt of a "level" rail adds ± M g sinθ to that intercept. These are
  the teachable error sources of task 8; never tune them away.
- a from one distance and time: a = 2 d / t² (start from rest). With d = 0.90 m, Mt ≈ 0.25–0.3 kg and F ≈ 0.1–0.4 N,
  a ≈ 0.3–1.5 m/s² and t ≈ 1–2.5 s: hand timing errors matter.
- The canister falls by d too; the string must leave it above the floor after 90 cm (string length is a setup choice
  with physical consequences).
