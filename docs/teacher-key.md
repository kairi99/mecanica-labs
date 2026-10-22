# Teacher key

_Generated from the model by `npm run teacher-key`. Do not edit by hand; change the model (and PARAMETERS.md) instead._

All cart parameters are **ASSUMED** (see PARAMETERS.md); none is a PHYWE specification. Treat the numbers as what this virtual lab produces, not as DigiCart data.

## Geometry

- Guide incline: 1.30 deg (tolerance accepted by the lab: +-0.05 deg).
- Support separation d = 1.100 m (clamp point to two-leg point, measured along the rail).
- Height difference for 1.30 deg: dh = d sin(theta) = **24.96 mm** (24.00 to 25.92 mm for the tolerance).
- Hidden bench tilt: uniform in +-0.15 deg, worth up to +-2.9 mm of dh. The student levels first, so the incline they create is the *change* of the height difference from the levelled state.
- Rack reading: with both stands at the same base height the rack reads about dh when the bench is level (for a tilted bench: d(sin tilt + sin(theta - tilt)) with the foot at 0, then trimmed with the foot). The preset `assembled` builds exactly this.
- Marks: every 100 mm from A (0 cm) to 900 mm; AB >= 90 cm; cart front on the 0 cm mark.

## Model acceleration

Local g (Quito, 2800 m) = 9.7717 m/s^2. Wheel inertia ratio k = sum(I)/(m r^2) = 0.0480; m_eff = m(1+k) = 0.2620 kg.

| Term | a (m/s^2) |
|---|---|
| Point mass g sin(theta) | 0.2217 |
| With rolling wheels g sin(theta)/(1+k) (ideal, frictionless) | 0.2115 |
| Rolling resistance (c_rr = 0.0005) | -0.00466 |
| Bearing drag (0.0003 N) | -0.00115 |
| **Model a (constant-force part)** | **0.2057** |
| Air drag at v = 0.6 m/s (extra, grows with v^2) | -0.00072 |

The model a is **7.2 % below g sin(theta)**: rotational inertia of the wheels and friction. A student fit that equals g sin(theta) would be suspicious; one near the model a is expected. Static (breakaway) friction only decides whether the cart starts: it starts above 0.153 deg and is not subtracted once rolling. Instantaneous a at v = 0 is 0.2057 m/s^2.

## Expected times and velocities (no run variability, no human timing)

| x (cm) | t (s) | mean v from 0 (m/s) | v in this 10 cm step (m/s) |
|---|---|---|---|
| 10 | 0.986 | 0.1014 | 0.1014 |
| 20 | 1.394 | 0.1434 | 0.2448 |
| 30 | 1.708 | 0.1757 | 0.3190 |
| 40 | 1.972 | 0.2028 | 0.3784 |
| 50 | 2.205 | 0.2268 | 0.4294 |
| 60 | 2.416 | 0.2484 | 0.4750 |
| 70 | 2.609 | 0.2683 | 0.5164 |
| 80 | 2.789 | 0.2868 | 0.5548 |
| 90 | 2.959 | 0.3042 | 0.5906 |

30 cm intervals (task 3):

| Interval (cm) | v (m/s) |
|---|---|
| 0 to 30 | 0.1757 |
| 30 to 60 | 0.4239 |
| 60 to 90 | 0.5523 |

Whole path (task 2): 0.3042 m/s. Each shorter interval gives a different mean velocity because v grows with time; the 10 cm values bracket the instantaneous velocity at the middle of the interval (task 5 asks the student to compare the three sets).

## From-rest relation (task 9)

For constant a from rest, v(t) = 2 x / t. Model: v(2.959 s) = 0.6080 m/s against 2 x mean v(0..90 cm) = 0.6084 m/s. The 0.4 mm/s gap is the air drag (the model is not exactly constant-a).

## Typical reaction-time effects

The analysis assumes a Type B reaction bias of +-0.1 s (u = 0.0577 s, ASSUMED). Averaging 10 readings reduces the random part but **not** a constant bias between start and stop. Effect on the fit of a constant shift added to every mark time (two identical readings per mark, origin kept):

| Constant shift (s) | fitted a (m/s^2) | change vs 0 | c1 (m/s) | v at t90 from the fit | mean v 0..90 (m/s) |
|---|---|---|---|---|---|
| +0.00 | 0.2056 | 0.0000 (0.0 %) | 0.0001 | 0.6083 | 0.3042 |
| +0.05 | 0.2054 | -0.0001 (-0.1 %) | -0.0099 | 0.6081 | 0.2991 |
| +0.10 | 0.2050 | -0.0006 (-0.3 %) | -0.0193 | 0.6077 | 0.2942 |
| +0.20 | 0.2035 | -0.0021 (-1.0 %) | -0.0367 | 0.6061 | 0.2849 |
| -0.10 | 0.2048 | -0.0007 (-0.4 %) | 0.0220 | 0.6075 | 0.3148 |

A constant late stop (positive shift) lengthens every t, so the mean velocities come out low (+0.10 s: -3.3 % on the 0..90 cm mean velocity). The quadratic fit has a free c1, which absorbs most of the shift: a barely moves (-0.3 % for +0.10 s), but c1 becomes clearly non-zero (about -2 a x shift, softened by the pinned origin), even though the cart starts from rest. So a c1 well away from 0 is the footprint of a systematic time offset, and the offset per mark in the app's comparison block (your readings minus the DigiCart true times) makes it visible. A random reaction (zero-mean) does not bias these results; it only scatters them.

## A simulated careful student

Preset `assembled` (seed 1), 90 simulated readings (start press 0.20 s late, stop press 0.25 s late, 0.05 s reaction scatter): fitted a = 0.2051 +- 0.0135 m/s^2, reduced chi^2 = 0.16 (the Type B reaction term is generous, so chi^2 below 1 is normal), reference a from the DigiCart true times = 0.2055 +- 0.0005, model a = 0.2057 m/s^2.

## URL flags

| Flag | Effect |
|---|---|
| `?teacher` | Shows the target dh in the checklist and the model's expected a in the analysis comparison block. |
| `?analysis=0` | Hides the analysis panel (the region stays in the DOM, hidden). |
| `?seed=N` | Fixes the hidden values (bench tilt, caliper zero error) and the run variability. |
| `?preset=assembled` or `?preset=empty` | Starts from a careful student's bench or a bare one (ignores saved progress). |
| `?tour=0` or `?tour=1` | Never or always start the first-visit tour. |
| `?lang=es` or `?lang=en` | Language. |
| `?theme=light` or `?theme=dark` | Theme. |
| `?demo=table` | Development builds only: fills Table 1.1 with simulated readings. |
