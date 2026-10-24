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
| Drag coefficient `Cd` | 0.45 (marble), 0.42 (ping-pong) | - | Standard smooth-sphere curve (White, Fluid Mechanics, Fig. 7.16): C_d ~ 0.47 at Re = 1e3, ~ 0.40 at Re = 3e3 to 1e4. Reynolds number Re = v 2R rho/mu with rho = 0.869 kg/m^3 and dynamic viscosity of air 1.8e-5 Pa s (ASSUMED), i.e. nu = 2.07e-5 m^2/s: marble Re ~ 930 (v = 1.2 m/s at the edge) to ~ 3200 (impact, 4.1 m/s); ping-pong Re ~ 2100 (1.1 m/s) to ~ 7500 (impact, 3.9 m/s), 2.5e3 at 1.3 m/s. One constant value per ball, picked in the middle of each range (the curve is flat to about 10 % there); held constant along slope, gap and flight. |
| Restitution `e` on paper over the floor | 0.5 (marble), 0.8 (ping-pong) | - | ASSUMED. Only used for the animation of the first bounce, never for measured quantities. Context: the ITTF bounce rule (23-25 cm rebound from 30.5 cm onto steel, impact 2.4 m/s) gives e = 0.87-0.91 at low speed; the ball lands at ~3.7 m/s on paper over a floor, where e is lower, so 0.8 is kept as ASSUMED. |

## Balls (`MARBLE`, `PING_PONG`, Practica 2)

Date of all rows in this section: 2026-10-24 (values unchanged since the model was written; the rows were missing). Cd and restitution are in the Cart table above (they carry both balls).

| Parameter | Marble | Ping-pong | Unit | Source |
|---|---|---|---|---|
| Radius `R_m` | 8 | 20 | mm | Marble: d = 16 mm, a common size, ASSUMED (the guide does not give it). Ping-pong: d = 40 mm (ITTF Handbook, Laws 2.3.1). |
| Mass `m_kg` | 5.5 | 2.7 | g | Marble: glass 2.5 g/cm^3 gives 5.4 g, taken as 5.5 g, ASSUMED (not weighed). Ping-pong: 2.7 g (ITTF Handbook, Laws 2.3.2; leaflet T3 allows 2.67-2.77 g). |
| Inertia factor `k_body` = I/(m R^2) | 0.4 | 0.6535 | - | Marble: solid sphere. Ping-pong: hollow shell, `hollowShellInertiaFactor(R, t)` = 0.4 (1 - q^5)/(1 - q^3), q = (R - t)/R, with t below. |
| Ping-pong shell thickness `PING_PONG_SHELL_THICKNESS_m` | - | 0.4 | mm | ASSUMED (regulation balls are about 0.35-0.45 mm; not measured). |
| Rolling-resistance coefficient `c_rr` | 1.5e-3 | 5e-3 | - | ASSUMED. Hard sphere on hard surface 1e-3 to 2e-3; larger for the soft, light, large ball. |
| Kinetic friction on the table `mu_k` | 0.30 | 0.35 | - | ASSUMED (glass, and celluloid/ABS, on laminate). Used only while the ball slips after the rail tip. |

## Rail, supports and table (`DEFAULT_SETUP`)

| Parameter | Value | Unit | Source |
|---|---|---|---|
| Rail length `L_rail_m` | 1.20 | m | Guide (metal rail 1.2 m). |
| Rise of the high support `rise_m` | 0.20 | m | Guide (20 cm). |
| Rail distance low tip to the high support `supportDist_m` | 1.10 | m | ASSUMED, support near the high end. Gives theta = asin(0.20/1.10) = 10.48 deg. The guide gives the rise, not this distance. |
| Gap rail tip to table edge `gap_m` | 0.05 | m | Guide (about 5 cm). |
| Table height `H_m` | 0.76 | m | ASSUMED default (typical table 0.74-0.78 m); seeded per bench elsewhere. |
| Channel width `channelWidth_m` (distance between the two contact lines) | 10 | mm | ASSUMED, top groove of the metal rail. r_eff = sqrt(R^2 - (w/2)^2): marble 6.2 mm, ping-pong 19.36 mm (= sqrt(20^2 - 5^2)). w >= 2R: the ball does not fit (error). w = 0 is a single line. |
| Rail-top step to the table `stepDrop_m` | 0 | m | ASSUMED (rail thickness neglected); parameter kept. Geometry note: the ball's lowest point sits R - r_eff below the contact lines (1.75 mm for the marble, 0.64 mm for the ping-pong ball), so whether it touches the table inside the groove, and the true drop, depend on the rail profile, which we do not know. |
| Paper height `paperHeight_m` | 0 | m | Floor reference; the ball bottom lands at this height. |
| g, air density | 9.7717, 0.869 | m/s^2, kg/m^3 | Site constants (see Site above). 0.869 kg/m^3 is for 15 °C; 20 °C gives 0.855 (-1.6 %), well inside the other uncertainties. |

## Mechanics model assumptions

| Item | Value | Source |
|---|---|---|
| Rolling on the slope | no slipping on two lines, k_eff = k_body (R/r_eff)^2, (1 + k_eff) dv/dt = g (sin theta - c_rr cos theta R/r_eff) - k_d v^2 | Rigid-body result. Rolling resistance: F_rr = c_rr x (sum of the two line normal forces) = c_rr m g cos theta R/r_eff (each line: N = m g cos theta/(2 cos phi), cos phi = r_eff/R), so the marble's effective c_rr is 1.28 times larger on the rail (ASSUMED form; c_rr itself ASSUMED). |
| Air drag on the slope and the gap | k_d = rho C_d A/(2 m); slope kappa = k_d/(1 + k_eff), v^2 = (a0/kappa)(1 - exp(-2 kappa s)), a0 = g (sin theta - c_rr cos theta R/r_eff)/(1 + k_eff); table kappa = k_d/(1 + k_body) | Derived: drag acts on the translational DOF, the rolling constraint makes the inertia (1 + k). Vacuum limit (kappa -> 0) is v^2 = 2 a0 s (tested). Effect: -2.7 % on v_tip for the ping-pong ball at s = 1.10 m, -0.24 % for the marble. Buoyancy and added mass are neglected on the slope (about 1 % and 0.5 % of the ping-pong ball; opposite effects on a). |
| Corner impact | normal velocity destroyed (perfectly inelastic, no rebound), tangential v cos theta kept; Coulomb friction impulse during the impact dv = min(mu_k v_n, sticking value), v_n^2 = (v sin theta)^2 + 2 g stepDrop; spin omega0 = v/r_eff from the channel | ASSUMED idealisation. The impact friction can be switched off (`impactFriction: false`): it is the largest unknown of the slip length (marble slip distance 1.4-2.5 cm with it, ~ 4-5 cm without it; ping-pong sticks within the impact with it, ~ 0.7-1.2 cm without it). |
| Slip on the table | dv/dt = + mu_k g sgn(R omega - v), d(R omega)/dt = - mu_k g sgn(R omega - v)/k, closed form; rolling starts after Delta t = abs(v_roll - v1)/(mu_k g) at v_roll = (v cos theta + k R omega0)/(1 + k); if the edge comes first the ball leaves slipping with the actual v and omega | Derived (Coulomb friction, angular momentum about the contact line). For the narrow-groove marble R/r_eff = 1.28, so R omega0 > v cos theta and friction SPEEDS the ball up (v_roll > v_tip). Rolling resistance and drag are neglected during the slip. Energy lost up to rolling: 1/2 m (v sin theta)^2 + m g stepDrop + 1/2 m k/(1 + k) (v cos theta - R omega0)^2 (tested to 1e-12). |
| Table roll | (1 + k_body) dv/dt = - c_rr m g - k_d v^2 over the rest of the gap (flat table, one contact: F_rr = c_rr m g); stops if v^2 <= 0 | Model choice with the same c_rr. |
| Leaves horizontally | v_edge^2 >= g R | Centripetal condition at the edge; below it the ball rolls over the edge. |
| Launch spin | omega at the edge (v_edge/R if rolling, the actual slipping value otherwise), constant in flight | Spin decay in 0.4 s neglected (viscous torque << inertia). ASSUMED. |
| Added mass (~ rho V/2) | included in the flight, together with buoyancy: a = [(m - rho V) g + F_air]/(m + rho V/2) | 0.5 % of the ping-pong inertia, 0.02 % of the marble. One `buoyancy` switch turns both on (same displaced-air physics). |
| Buoyancy | weight (m - rho V) g | Archimedes: 1.1 % (ping-pong), 0.05 % (marble). Net g_eff = g (1 - 1.1 %)/(1 + 0.5 %) for the ping-pong ball. |
| Magnus lift `C_L(S) = S/(2.022 S + 0.981)`, S = R omega/v | topspin pushes the ball DOWN | ASSUMED saturating form, no source claimed (an earlier attribution to a baseball fit could not be verified). C_L ~ S at small S, 0.33 at S = 1: inside the 0.2-0.35 that measurements on smooth spheres at Re ~ 10^3 give near S ~ 1 (Tanaka et al. 1990; Oesterle & Bui Dinh 1998), which show positive lift there; inverse Magnus appears only near the drag crisis (far from these Re). S = 1 at launch, ~0.3 at landing. Sign verified. |
| RK4 step | 0.5 ms | Convergence tested (halving changes x by < 1e-6 m). Landing found by Brent on the last step. |

## Run variability (`MARBLE_VARIABILITY`, `PING_PONG_VARIABILITY`)

| Parameter | Marble | Ping-pong | Unit | Source |
|---|---|---|---|---|
| Release offset sigma | 2 | 2 | mm | ASSUMED. Finger placement against the mark, along the rail. |
| Release push sigma (half-normal, >= 0) | 5 | 10 | mm/s | ASSUMED. "Release without pushing" but a finger lift always adds a little. |
| Junction extra loss sigma | 1.5 | 3 | % | ASSUMED. Junction factor = 1 - sigma abs(N(0,1)) on the post-impact state (one-sided: scatter can only add loss, never create energy; mean extra loss 0.8 sigma, floor 0.5). Larger for the soft light ball. |
| Lateral launch angle sigma | 1.0 | 1.5 | deg | ASSUMED. Gives z drift of ~1 cm at x = 0.55 m. |

## Carbon mark and bounce (`MARBLE_MARK`, `PING_PONG_MARK`)

| Parameter | Marble | Ping-pong | Unit | Source |
|---|---|---|---|---|
| Median no-mark impact momentum | 0 (always marks) | 0.009 | kg m/s | ASSUMED. Landing p = m vy at H = 0.76 m: marble ~0.021, ping-pong ~0.0100; with the +-30 % draw the ping-pong threshold spans 0.0063-0.0117, so a faint or missing mark happens for the upper part of the draws (about 30 % of the draws). |
| Threshold scatter | - | +-30 | % (uniform draw) | ASSUMED. |
| Dot diameter | 3 x sqrt(p/0.021), clamped 2-4 | same, clamped 1.5-4 | mm | ASSUMED. |
| Darkness | p/(p + 0.021) | same | - | ASSUMED saturating shape; marble ~0.51, ping-pong ~0.33. |

## Apparatus (`src/experiments/parabolic/apparatus/constants.ts`)

Device and bench values of the Practica 2 apparatus layer. Date of all rows: 2026-10-23. **ASSUMED** = chosen by us, not measured; the guide gives only the rail length, the 20 cm rise, the 5 cm gap, the upper half, the A4 sheets and the counts.

| Parameter | Value | Unit | Source |
|---|---|---|---|
| Rail length `RAIL_LENGTH_m` | 1.2 | m | Guide. |
| Rack clamp from the low tip `RACK_FROM_TIP_m` | 1.10 | m | ASSUMED (same as `supportDist_m` of the physics). |
| Two-leg support from the low tip `TWO_LEG_FROM_TIP_m` | 0.10 | m | ASSUMED ("near the low end"). |
| Rail top height at the clamp with the rack at 0 `RACK_BASE_HEIGHT_m` | 0.06 | m | ASSUMED. Rack reading 0 to 250 mm in 1 mm steps (ASSUMED). The 20 cm rise needs 140 mm. |
| Two-leg stand height range | 0 to 150, 1 mm steps | mm | ASSUMED. |
| Two-leg span `TWO_LEG_SPAN_m` (lever of the screw foot) | 0.20 | m | ASSUMED. |
| Screw foot range / step | +-5 / 0.05 | mm | ASSUMED (same as Practica 1). |
| Tip counted as lifted above `TIP_LIFT_TOL_m` | 0.5 | mm | ASSUMED. |
| Screws | 2 per rail joint, 4 in the box | - | ASSUMED (the guide lists no count). |
| Table height `H_m` (hidden, per bench) | uniform 0.74 to 0.78 | m | ASSUMED (typical lab table). |
| Table lateral tilt (hidden, per bench) | uniform +-0.3 | deg | ASSUMED. |
| Lateral launch angle per rad of rail roll `LATERAL_DRIFT_GAIN` | 4 | - | ASSUMED, stylised: the ball rides one wall of the groove. Not derived; it only makes the level matter (0.3 deg of roll adds 1.2 deg of launch angle, comparable to the 1 deg run scatter). |
| Level sensitivity / bubble end / centred tolerance | 20 / 6 / 0.5 | mm/deg, mm, mm | ASSUMED (same vial as Practica 1). |
| Rail tip to edge when first put down / maximum | 0.15 / 0.60 | m | ASSUMED. 1 mm slider steps. A tip at or past the edge is refused. |
| Rail mark: snap / student's placement error sigma / max count | 0.5 / 1 / 10 | mm, mm, - | ASSUMED. Guide: 5 marks in the upper half (s >= 0.60 m from the low tip). |
| Paper and projection placement limit `PAPER_POS_MAX_m` | 3 | m | ASSUMED (the tape reaches 3 m; a sheet or the edge projection farther away is refused). Row added 2026-10-24. |
| A4 sheet | 0.297 x 0.210 | m | Standard A4. 2 bond sheets, 1 carbon sheet (guide). Position snap 1 mm. |
| Edge projection placement error sigma | 2 (per axis) | mm | ASSUMED (plumb line or set-square on the floor). |
| Tape measure reach / division / MPE | 3 / 1 / 0.3 + 0.2 L | m, mm, mm and mm/m | Reach ASSUMED (3 m pocket tape); division and class II MPE as in Instruments above. The range reading is the Euclidean floor distance (tape laid straight). |
| Rise and gap tolerances for the checklist | 20 cm +-5 mm, 5 cm +-20 mm | - | ASSUMED ("20 cm" and "about 5 cm" in the guide). |
| Stored trajectory rate | 1200 | Hz | Numerical (linear interpolation error ~1e-6 m); not an instrument. |
| Slow-motion video | 240 fps, 3 frames before launch and after landing | - | ASSUMED (typical phone slow motion). Frame positions carry no tracker noise (sub-pixel centre). Video phase of each run is a seeded draw in [0, 1) frame. |
| Tabla 2.1 | 5 trials x 5 repetitions per ball; times <= 30 s, 2 decimals; ranges <= 3 m, 3 decimals | - | Guide layout; limits ASSUMED (stopwatch 0.01 s, tape 1 mm). |
| Roll-over tail | 0.5 | s | Animation only: a ball that rolls over the edge instead of leaving horizontally is followed this long. |
| Analysis: reaction bias half-width | 0.1 (u = 0.1/sqrt(3) = 0.058) | s | ASSUMED, as in Practica 1 (`reactionBiasTypeB_s`). Common to all readings of Tabla 2.1; included in Delta t. |
| Analysis: uncertainty of local g | 0.005 | m/s^2 | ASSUMED: the free-air formula has no Bouguer or anomaly term (a few 1e-3 m/s^2). Only enters the uncertainty of the expected time and the final speed. |
| Analysis: uncertainty of the typed launch height | sqrt(2) x 1 mm / sqrt(12) = 0.41 | mm | Two tape ends to place (floor and table top), tape division 1 mm; the tape MPE (0.3 + 0.2 L mm) is reported, not applied. |
| Analysis: edge-projection term of Delta x | 2 | mm | ASSUMED, the same sigma the bench draws for the projection point (`EDGE_PROJECTION_SIGMA_m`); common to every range. |
| Analysis: slow-motion reference uncertainty | frame / sqrt(6) = 1.7 | ms | Launch and landing frames each fall uniformly within one 1/240 s frame. |
| Analysis: valid typed launch height `H_MIN_m`, `H_MAX_m` | 0.2 to 2 | m | ASSUMED plausibility window for a lab table; outside it the analysis ignores the typed value. Row added 2026-10-24. |
| Coach: typed range counted "from the rail tip" `TIP_MATCH_m` | 0.02 | m | ASSUMED teaching tolerance (see the coach thresholds row). Not physics. Row added 2026-10-24. |
| Coach thresholds (timing) | start press < 0.3 s before or > 0.45 s after the edge; reading > 0.3 s from 0.39 s | s | ASSUMED teaching thresholds, not physics. Typed range within 2 cm of (true range + gap) counts as measured from the rail tip. |

Simplifications: no longitudinal table tilt; the table is long enough for any rail position; heights are vertical and distances along the rail (small-angle bookkeeping for the two-leg lift); after the first bounce the ball is not followed; marks are the first contact only. With the physics rolling resistance (`c_rr` 1.5e-3 and 5e-3) a ball does not stop on a 0.6 m gap: only a nearly flat rail stops it.
