# Teacher key: Practica 3, force and acceleration

_Generated from the model by `npm run teacher-key`. Do not edit by hand; change the model (and PARAMETERS.md) instead._

All masses, resistances and bench heights are **ASSUMED** (see PARAMETERS.md, section Practica 3); none is a PHYWE specification. Treat the numbers as what this virtual lab produces, not as DigiCart data.

## Geometry

- Rail 1.2 m, stand end at one end (rack stand), receiver with pulley at the other, supports 1.10 m apart. The cart front starts at the 0 cm mark (100 mm on the printed scale in the `assembled` preset) and runs 90 cm to the end mark; the receiver stop is 106.0 cm from the start (16.0 cm of free travel after the end mark).
- Level: the bench tilt is hidden, uniform in +-0.15 deg. A centred bubble allows up to about +-0.025 deg (0.5 mm of bubble); the receiver foot (0.05 mm steps) trims it.
- String: from the brass screw over the pulley to the canister knot. The pulley contact is 1.5 cm beyond the stop face, so the hanging length at the release is hang0 = L - 107.5 cm. Too short (hang0 < 0): the string does not reach the pulley from the start mark. Too long: the canister (bottom 6 cm below the knot; string 101 cm above the floor) meets the floor after 93.0 cm of travel with hang0 = 2.0 cm; it must be farther than 90 cm, so hang0 must lie between 0 and 5.0 cm.
- After the canister hits the floor the string goes slack and the cart coasts and decelerates (rolling resistance, bearings, air): its timing is no longer a constant-force run. The run record says so (`canisterHitsFloor`).
- Local g (Quito, 2800 m) = 9.7717 m/s^2.

## Masses

Nominal: bare cart 250.0 g, brass screw 5.0 g, canister with lid 9.5 g, four masses 4 x 10.0 g, plastic screw 0.8 g each. Hidden per-bench tolerance: masses +-0.1 g, canister +-0.3 g (so the balance, 0.1 g, shows about the nominal values).
- Mt as the guide defines it (cart with brass screw, canister with lid, four masses) = **304.5 g**.
- Each mass moved to the cart needs a plastic screw (0.8 g): trial with k masses on the cart has a total mass Mt + k x 0.8 g. This real effect is kept; it is 0.8 % of Mt after three moves and explains a small part of any mass discrepancy.
- Rotational inertia: the four wheels add 12.0 g and the pulley 2.0 g to the inertia, string 0.7 g (all ASSUMED): M_eff = Mt + 14.7 g.

## Expected values per trial (task 2 and 3 reference)

| Masses in canister | F = m g (N) | Total mass (g) | a ideal F/Mt (m/s^2) | a model (m/s^2) | t ideal (s) | t model (s) |
|---|---|---|---|---|---|---|
| 4 | 0.484 | 304.5 | 1.589 | 1.507 | 1.06 | 1.09 |
| 3 | 0.386 | 305.3 | 1.264 | 1.198 | 1.19 | 1.23 |
| 2 | 0.288 | 306.1 | 0.942 | 0.890 | 1.38 | 1.42 |
| 1 | 0.191 | 306.9 | 0.621 | 0.584 | 1.70 | 1.76 |
| 0 | 0.093 | 307.7 | 0.302 | 0.279 | 2.44 | 2.54 |

Constant-force acceleration of the full model without air drag for the first trial: 1.5076 m/s^2.

## Fit F = M_fit a + F0 (task 5 and 6, noise-free model data, trials 4 to 1)

| Case | M_fit (g) | M_fit - Mt (g) | F0 (mN) |
|---|---|---|---|
| No friction, no rotational inertia, level | 303.0 | -1.5 | 2.70 |
| Full model, level rail | 317.6 | 13.1 | 5.34 |
| Full model, tilt +0.025 deg (slopes toward the pulley) | 317.8 | 13.3 | 4.05 |
| Full model, tilt -0.025 deg | 317.5 | 13.0 | 6.63 |
| Full model, unlevelled bench 0.15 deg | 318.5 | 14.0 | -2.43 |

With no resistance the slope of F(a) is close to the total mass Mt: slightly below it and with a small positive intercept, because each force step adds a plastic screw to the cart (the total mass grows as F falls). With the model the slope is larger than Mt (wheel, pulley and string inertia) and the intercept F0 is positive: it is the friction force the canister has to overcome. A tilt toward the pulley lowers F0 (the cart's weight helps), a tilt away raises it; the slope barely changes.

## Effect of a stop lag on the timings

A constant +0.1 s added to every time (the stop press later than the start press by that much) gives M_fit = 394.3 g (24.1 % from the model value) and F0 = -16.7 mN. The analysis lists the effect of one standard uncertainty of that bias (0.058 s) separately; it never enters the fit weights.

## A simulated careful student

Trials 4 to 1, 40 timings, start lag 0.20 s and stop lag 0.25 s (sd 0.05 s), seeded run variability. Mt recorded from the balance: 304.5 g.

| Masses | F (N) | t mean (s) | Delta t (s) | a (m/s^2) | Delta a (m/s^2) |
|---|---|---|---|---|---|
| 4 | 0.48 | 1.127 | 0.064 | 1.417 | 0.068 |
| 3 | 0.39 | 1.273 | 0.059 | 1.111 | 0.025 |
| 2 | 0.29 | 1.464 | 0.065 | 0.840 | 0.033 |
| 1 | 0.19 | 1.831 | 0.059 | 0.537 | 0.008 |

Fit: M_fit = 342.1 +- 14.5 g, F0 = 6.3 +- 10.2 mN, reduced chi^2 = 0.2; error against Mt 12.3 %. The weights hold only the random part of the timings; the lag of the stop press relative to the start press is common to all readings, a systematic the fit does not see (it is listed in the analysis as a separate effect).

## Guide tasks: what to look for

- Task 1 (MRU or MRUV): the DigiCart log (x(t)) is a parabola from rest: uniform acceleration while the string is taut.
- Task 4 (Newton for the ideal system): m g = (M + m) a. The app does not write it for the student.
- Task 5/7/8: the slope of F(a) is the mass the force accelerates; friction, rotational inertia, a tilted rail, the plastic screws, the mass tolerance, reaction time and the floor are the error sources the simulation contains.
- Common mistakes the model produces: a string too long (canister on the floor before 90 cm), masses removed instead of moved (Mt changes: the points no longer lie on one line), rail not levelled (intercept shifts), timing a coast after the floor impact.
