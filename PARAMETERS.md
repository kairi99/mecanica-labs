# Model parameters

Every empirical parameter of `src/core/physics` and `src/experiments/mruv/physics`, with value, unit, source and date. **ASSUMED** means: chosen by us from
typical values and physical reasoning, not measured and not a PHYWE specification (no reliable PHYWE datasheet was
found or consulted). None was tuned to hit a target; the resulting a ~ 0.206 m/s^2 is only a consequence of these
assumed values (it lies between the frictionless 0.2115 and zero, so it is not independent evidence for them).
Date of all rows: 2026-10-22.

## Site

| Parameter | Value | Unit | Source |
|---|---|---|---|
| Latitude (`QUITO_LATITUDE_deg`) | -0.21 | deg | Approximate public coordinates of Quito/EPN. ASSUMED to ~0.01 deg (irrelevant for g at this precision). |
| Altitude (`QUITO_ALTITUDE_m`) | 2800 | m | Approximate. ASSUMED (+-50 m changes g by 1.5e-4 m/s^2). |
| g at sea level, equator | 9.780327 | m/s^2 | 1980 International Gravity Formula series (Moritz 1980); the WGS84 Somigliana closed form gives the same value at Quito to ~1e-6. |
| g(latitude) | 9.780327 (1 + 0.0053024 sin^2 phi - 0.0000058 sin^2 2phi) | m/s^2 | Same (series form). |
| Free-air gradient | 3.086e-6 | 1/s^2 | Standard value. |
| **g in Quito** (`G_QUITO_mps2`) | **9.7717** | m/s^2 | Computed: 9.78033 - 3.086e-6 x 2800. No Bouguer or local anomaly term (local value may differ by a few 1e-3). |
| Lab temperature (`LAB_TEMPERATURE_K`) | 288.15 | K | ASSUMED (15 C). |
| Air density (`RHO_AIR_QUITO_kgpm3`) | 0.869 | kg/m^3 | ISA pressure at 2800 m (71.9 kPa) with ideal gas at 288.15 K. Dry air. |

## Cart (`DEFAULT_CART`)

| Parameter | Value | Unit | Source |
|---|---|---|---|
| Incline angle | 1.30 | deg | The guide's setting (EPN guide, section 1.3.2). |
| Cart mass `m_kg` (with wheels) | 0.25 | kg | ASSUMED. Plausible for a small box cart with electronics and battery; not weighed. |
| Wheel count | 4 | - | ASSUMED. |
| Wheel mass `wheelMass_kg` | 0.006 | kg | ASSUMED. Small plastic/metal wheel. |
| Wheel radius `wheelRadius_m` | 0.011 | m | ASSUMED. Cancels from m_eff when I = f m_w r^2. |
| Wheel inertia factor | 0.5 | - | ASSUMED solid disc. Gives k = sum(I)/(m r^2) = 0.048, so m_eff = 1.048 m. |
| Rolling-resistance coefficient `c_rr` | 5e-4 | - | ASSUMED, optimistic; plausible range 5e-4 to 5e-3 (hard wheel on aluminium rail; steel on steel is ~1e-3). Rolling resistance only. |
| Bearing drag `F_bearing_N` | 3e-4 | N | ASSUMED, separate from rolling resistance: friction of the wheel bearings/axles, taken independent of load and speed. An ABSOLUTE force, so a depends on the cart mass through it (heavier cart, smaller relative effect). ~0.5 % of m g sin(theta) = 0.0556 N. |
| Breakaway (static) force `F_breakaway_N` | 5e-3 | N | ASSUMED. Used only at v = 0: the cart starts only if m g sin(theta) > c_rr m g cos(theta) + F_bearing + F_breakaway. Gives a breakaway angle of 0.153 deg (so 0.1 deg stays put, 1.30 deg rolls). Once moving it does not act. |
| Drag coefficient `Cd` | 1.0 | - | ASSUMED blunt box. |
| Frontal area `A_m2` | 1.2e-3 | m^2 | ASSUMED (about 4 cm x 3 cm). |

Derived: breakaway angle 0.153 deg (`breakawayAngle_rad`); ideal a = g sin(theta)/(1+k) = 0.2115 m/s^2; with friction and bearing a = 0.2057 m/s^2 (constant-force
part). Air drag at v = 0.6 m/s is ~0.3 % of the driving force and lengthens t(0.9 m) by ~1 ms.

## Run variability (`DEFAULT_VARIABILITY`, separate from the expectation)

| Parameter | Value | Unit | Source |
|---|---|---|---|
| Release offset sigma | 1.0 | mm | ASSUMED. Placing the cart front on a mm mark by eye. |
| Initial velocity sigma | 1 | mm/s | ASSUMED. Finger lift or release jolt, drawn HALF-normal: v0 = sigma |N(0,1)| >= 0 (a lift cannot push the cart uphill), so mean v0 = 0.8 mm/s and times run EARLY on average by E[v0]/a = 3.9 ms (all marks); zeroed when static friction holds the cart. Time scatter per mark (sd of the true crossing time, 4000 runs each, with the 1 mm release offset and 5 % c_rr): 0.1 m 5.8, 0.2 m 4.7, 0.3 m 4.0, 0.4 m 4.0, 0.5 m 3.7, 0.9 m 3.7 ms (earlier draft with 4 mm/s symmetric: ~19 ms). |
| c_rr run-to-run sigma | 5 | % of c_rr | ASSUMED. Dust or film on the track; its effect on t is below 1 ms. |

## Instruments (`instruments.ts`)

| Parameter | Value | Source |
|---|---|---|
| Stopwatch resolution | 0.01 s | ASSUMED typical digital stopwatch. Human reaction time is added by the apparatus layer (phase 2), not here. |
| Rail scale division | 1 mm | From the photos: millimetre scale. ASSUMED 1 mm. |
| Tape measure division (`TAPE_DIVISION_m`) | 1 mm | Steel blade graduated in mm, numbers every cm; standard for a workshop tape. Analog, read by eye: Type B u = (d/2)/sqrt(3) = 0.29 mm. |

**Tape measure tolerance: reported, not applied.** The class II maximum permissible error is a bound on the tape's systematic error, not a measured error of this tape. The model keeps the tape ideal (a reading is the true length quantised by the student's own reading of the 1 mm blade) and only reports the bound next to the reading (`TapeReading.mpe_m`, `tapeMaxPermissibleError_m`). Reason: the bound (0.3-0.5 mm) is no larger than the student's reading half-width (0.5 mm), a seeded hidden scale error would be invisible next to it and would only shift Delta h by a few tenths of a mm; stating it is the honest minimum. The teacher key gives its effect on the incline.

Type B convention: digital display, u = resolution/sqrt(12). Analog scale: read to the nearest division d, half-width a = d/2, u = a/sqrt(3) = d/sqrt(12) (same number). The commonly taught "maximum error" d/2 is the half-width a, not the standard uncertainty u.

**Stopwatch timing uncertainty.** uA = s/sqrt(n) of the n presses at a mark captures only the scatter of the reaction delays. A mean reaction bias (stop delay minus start delay) is common to all presses and does not average out. `reactionBiasTypeB_s(halfWidth_s = 0.1)` = halfWidth/sqrt(3) = 0.058 s with ASSUMED half-width 0.1 s (a typical range of human visual reaction-time asymmetry between start and stop; not measured). The combined time uncertainty of the mean at a mark is uA (+) resolution/sqrt(12) (+) reaction bias, in quadrature; this is the sigma_t of the effective-variance fit (`fit.ts`). The (t = 0, x = 0) origin has sigma_t = 0 and sigma_x = release-offset sigma (1 mm), or is excluded (`exclude: [0]`).

## Model times at 1.30 deg (DEFAULT_CART, no run variability)

| x (m) | t (s) | v (m/s) |
|---|---|---|
| 0.1 | 0.9860 | 0.2028 |
| 0.2 | 1.3945 | 0.2868 |
| 0.3 | 1.7079 | 0.3512 |
| 0.4 | 1.9722 | 0.4055 |
| 0.5 | 2.2051 | 0.4534 |
| 0.6 | 2.4156 | 0.4966 |
| 0.7 | 2.6092 | 0.5363 |
| 0.8 | 2.7895 | 0.5733 |
| 0.9 | 2.9588 | 0.6080 |

## Known simplifications

Rolling without slipping; rail perfectly straight and rigid; no sag of the 1.2 m rail; no sensor or cable on the
cart; no Bouguer correction; no air humidity. The mean velocity over the whole path equals v(end)/2 only for ideal MRUV.

## Apparatus (`src/experiments/mruv/apparatus/constants.ts`)

All rows ASSUMED unless a source is given; none is a PHYWE specification. Date of all rows: 2026-10-22, except the tape rows (2026-10-23).

| Parameter | Value | Unit | Source |
|---|---|---|---|
| Rail length / printed scale | 1.2 / 0..1200 | m / mm | EPN guide (1.2 m rail); mm scale from the photos (ASSUMED 1 mm division). |
| Support points from nearest rail end | 0.05 | m | ASSUMED. |
| Support separation d (clamp to two-leg stand) | 1.10 | m | ASSUMED = 1.2 - 2 x 0.05. Needed rise for 1.30 deg: d sin(1.30 deg) = 24.95 mm. |
| Rack clamp height at rack reading 0 | 0.060 | m | ASSUMED. |
| Rack range / resolution | 0..250 / 1 | mm | ASSUMED. 1 mm = 0.052 deg at d = 1.10 m, so the foot is needed to trim to +-0.05 deg. |
| Two-leg stand height with foot at 0 | 0.060 | m | ASSUMED (equal to the rack base, so the rail is flat at rack 0 and foot 0). |
| Screw foot range / step | +-5 / 0.05 | mm | ASSUMED (fine screw). Covers a table tilt of 0.15 deg (2.9 mm). |
| Hidden table tilt along the rail | uniform +-0.15 | deg | ASSUMED. Seeded; revealed only by the level. |
| Receiver end stop from low rail end | 0.040 | m | ASSUMED. Cart front stops there (no bounce). |
| Level sensitivity | 20 (2 per 0.1 deg) | mm/deg | ASSUMED. Saturates at +-6 mm (0.3 deg); centred when |offset| <= 0.5 mm (|tilt| <= 0.025 deg). |
| Cart length | 0.0984 | m | ASSUMED. |
| Tape measure range (`TAPE_RANGE_m`) | 3 | m | ASSUMED typical workshop tape; every measurable length (heights ~0.06-0.2 m, cart 0.098 m, d 1.10 m) is far inside it. |
| Tape accuracy, EU class II: maximum permissible error | +-(0.3 + 0.2 L/m) | mm | Directive 2014/32/EU (MID), Annex MI-008 (measuring tapes), class II. At L = 0.1 m: +-0.32 mm; at d = 1.10 m: +-0.52 mm. Date 2026-10-23. |
| Mark snap / max marks | 0.5 / 30 | mm / - | ASSUMED. |
| Mark check tolerance (spacing, position vs A + 100 i) | 2 | mm | ASSUMED (tape placement). AB >= 900 mm - 2 mm. |
| Target angle / tolerance | 1.30 / 0.05 | deg | Guide angle; tolerance ASSUMED (pedagogical). |
| Cart "at 0 cm" tolerance | 1.5 | mm | ASSUMED. |
| DigiCart encoder | 50 Hz, 1 mm | - | ASSUMED. x(t) is displacement from the release instant. |
| Stored trajectory step | 1 | ms | Same step as physics crossing time (RK4). |
| Table 1.1 | 10 positions x 10 repetitions; max 30 s; 2 decimals | - | Guide layout; limits ASSUMED (stopwatch resolution 0.01 s). |

Simplifications: no sag of the rail; the table tilt is not drawn (world frame = table frame) but is added to the incline; a flat or uphill rail does not move the cart (static friction / no uphill model); the cart stops at the receiver (no bounce); the release offset is applied at release (cart jumps by about 1 mm).

# Práctica 2 · Movimiento parabólico (`src/experiments/parabolic/physics`)

A ball rolls from rest down a 1.2 m rail (high end raised 20 cm, low tip on the table), crosses a ~5 cm gap on the table, leaves the edge horizontally and lands on carbon paper. Values below are inputs of the model; none was tuned to a target number. **ASSUMED** = chosen by us from typical values and physical reasoning, not measured. Date of all rows: 2026-10-23.

## Balls (`MARBLE`, `PING_PONG`)

| Parameter | Value | Unit | Source |
|---|---|---|---|
| Marble diameter / radius `R_m` | 16 / 0.008 | mm / m | Typical glass marble. ASSUMED (guide gives none). |
| Marble mass `m_kg` | 5.5 | g | Glass 2.5 g/cm^3 x 2.145 cm^3 = 5.4 g; taken 5.5 g (common glass 2.5-2.6 g/cm^3). ASSUMED, not weighed. |
| Marble inertia factor `k_body` | 2/5 | - | Solid sphere (rigid-body result). |
| Marble `c_rr` | 1.5e-3 | - | ASSUMED. Hard glass on aluminium / laminate; typical hard-on-hard range 1e-3 to 2e-3. One value for rail and table. |
| Ping-pong diameter / radius | 40 / 0.020 | mm / m | ITTF regulation ball (40 mm). |
| Ping-pong mass | 2.7 | g | ITTF regulation (2.7 g). |
| Ping-pong inertia factor `k_body` | 2/3 | - | Thin hollow shell. The real shell is ~0.4 mm thick (t/R = 0.02), which gives ~0.66; the thin-shell 2/3 is used. |
| Ping-pong `c_rr` | 5e-3 | - | ASSUMED. Larger than the marble (soft, large, light shell); plausible 3e-3 to 1e-2. |
| Drag coefficient `Cd` | 0.5 | - | Smooth sphere at Re ~ 10^3 to 10^4 (textbook value 0.4-0.5; White, Fluid Mechanics, drag of a sphere). Re ~ 1.0e3 (marble) to 3.5e3 (ping-pong) at v ~ 1.3 m/s with dynamic viscosity of air 1.8e-5 Pa s (ASSUMED). Held constant along the flight. |
| Restitution `e` on paper over the floor | 0.5 (marble), 0.8 (ping-pong) | - | ASSUMED. Only used for the animation of the first bounce, never for measured quantities. |

## Rail, supports and table (`DEFAULT_SETUP`)

| Parameter | Value | Unit | Source |
|---|---|---|---|
| Rail length `L_rail_m` | 1.20 | m | Guide (metal rail 1.2 m). |
| Rise of the high support `rise_m` | 0.20 | m | Guide (20 cm). |
| Rail distance low tip to the high support `supportDist_m` | 1.10 | m | ASSUMED, support near the high end. Gives theta = asin(0.20/1.10) = 10.48 deg. The guide gives the rise, not this distance. |
| Gap rail tip to table edge `gap_m` | 0.05 | m | Guide (about 5 cm). |
| Table height `H_m` | 0.76 | m | ASSUMED default (typical table 0.74-0.78 m); seeded per bench elsewhere. |
| Channel width `channelWidth_m` (distance between the two contact lines) | 10 | mm | ASSUMED, top groove of the metal rail. r_eff = sqrt(R^2 - (w/2)^2): marble 6.2 mm, ping-pong 17.3 mm. w >= 2R: the ball does not fit (error). w = 0 is a single line. |
| Rail-top step to the table `stepDrop_m` | 0 | m | ASSUMED (rail thickness neglected); parameter kept. |
| Paper height `paperHeight_m` | 0 | m | Floor reference; the ball bottom lands at this height. |
| g, air density | 9.7717, 0.869 | m/s^2, kg/m^3 | Site constants (see Site above). |

## Mechanics model assumptions

| Item | Value | Source |
|---|---|---|
| Rolling on the slope | no slipping on two lines, k_eff = k_body (R/r_eff)^2, a = g (sin theta - c_rr cos theta)/(1 + k_eff) | Rigid-body result; the c_rr term with the same (1 + k_eff) inertia is a model choice (ASSUMED form). |
| Tip transition | normal velocity component destroyed (inelastic, no rebound), tangential kept, angular momentum about the contact point conserved: v_roll = (v cos theta + k_body R omega)/(1 + k_body), omega = v/r_eff | ASSUMED idealisation. Energy lost >= 0 is tested. For the narrow-groove marble (R/r_eff = 1.28) the channel spin exceeds flat rolling, so friction SPEEDS the ball up (v_roll > v_tip); this is a consequence of the assumed w. |
| Table roll | decel c_rr g/(1 + k_body) over the gap; stops if v^2 <= 0 | Model choice with the same c_rr. |
| Leaves horizontally | v_edge^2 >= g R | Centripetal condition at the edge; below it the ball rolls over the edge. |
| Launch spin | omega = v_edge/R (topspin), constant in flight | Spin decay in 0.4 s neglected (viscous torque << inertia). ASSUMED. |
| Added mass (~ rho V/2) | neglected | ~0.5 % of the ping-pong mass, ~0.02 % of the marble. |
| Buoyancy | g_eff = g (1 - rho V/m) | Archimedes: 1.1 % (ping-pong), 0.05 % (marble). |
| Magnus lift `C_L(S) = S/(2.022 S + 0.981)`, S = R omega/v | topspin pushes the ball DOWN | Fit as commonly quoted for baseball-type balls (Sawicki, Hubbard & Stronge 2003 lineage; coefficients not re-derived here). ASSUMED to carry over to the marble and, even more so, to the ping-pong ball (extrapolation at Re ~ 10^3-10^4). S = 1 at launch and falls to ~0.3 at landing. |
| RK4 step | 0.5 ms | Convergence tested (halving changes x by < 1e-6 m). Landing found by Brent on the last step. |

## Run variability (`MARBLE_VARIABILITY`, `PING_PONG_VARIABILITY`)

| Parameter | Marble | Ping-pong | Unit | Source |
|---|---|---|---|---|
| Release offset sigma | 2 | 2 | mm | ASSUMED. Finger placement against the mark, along the rail. |
| Release push sigma (half-normal, >= 0) | 5 | 10 | mm/s | ASSUMED. "Release without pushing" but a finger lift always adds a little. |
| Junction scatter (relative on v_roll) | 1.5 | 3 | % | ASSUMED. Larger for the soft light ball. Floor 0.5 of the mean. |
| Lateral launch angle sigma | 1.0 | 1.5 | deg | ASSUMED. Gives z drift of ~1 cm at x = 0.55 m. |

## Carbon mark and bounce (`MARBLE_MARK`, `PING_PONG_MARK`)

| Parameter | Marble | Ping-pong | Unit | Source |
|---|---|---|---|---|
| Median no-mark impact momentum | 0 (always marks) | 0.006 | kg m/s | ASSUMED. Landing p = m vy: marble ~0.022, ping-pong ~0.010. |
| Threshold scatter | - | +-30 | % (uniform draw) | ASSUMED. |
| Dot diameter | 3 x sqrt(p/0.021), clamped 2-4 | same, clamped 1.5-4 | mm | ASSUMED. |
| Darkness | p/(p + 0.021) | same | - | ASSUMED saturating shape; marble ~0.51, ping-pong ~0.33. |
