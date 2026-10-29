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
| Kinetic friction on the table `mu_k` | 0.30 | 0.35 | - | ASSUMED (glass, and celluloid/ABS, on laminate). Used while the ball slips on the table and as the Coulomb coefficient of the ball-table impact (`impact.ts`). |
| Normal restitution on the table `e_table` | 0.6 | 0.868 | - | Date 2026-10-24. Ping-pong: ITTF bounce rule (ITTF Handbook, ball specification: a ball dropped 30.5 cm must rebound about 23 cm; the test is on a steel block) gives e = sqrt(23/30.5) = 0.868; taken as the table value ASSUMED equal (a wooden/laminate table is a little softer and e of a thin shell falls with impact speed; the first impact here is at 0.2 to 0.6 m/s). Marble: ASSUMED 0.6 (glass on wood is typically 0.5 to 0.7; no measurement). Separate from the floor `restitution` above, which is kept (0.5, 0.8) for the animation of the landing only. |

## Rail, supports and table (`DEFAULT_SETUP`)

| Parameter | Value | Unit | Source |
|---|---|---|---|
| Rail length `L_rail_m` | 1.20 | m | Guide (metal rail 1.2 m). |
| Rise of the high support `rise_m` | 0.20 | m | Guide (20 cm). |
| Rail distance low tip to the high support `supportDist_m` | 1.10 | m | ASSUMED, support near the high end. Gives theta = asin(0.20/1.10) = 10.48 deg. The guide gives the rise, not this distance. |
| Gap rail tip to table edge `gap_m` | 0.05 | m | Guide (about 5 cm). |
| Table height `H_m` | 0.76 | m | ASSUMED default (typical table 0.74-0.78 m); seeded per bench elsewhere. |
| Channel width `channelWidth_m` (distance between the two contact lines) | 10 | mm | ASSUMED, top groove of the metal rail. r_eff = sqrt(R^2 - (w/2)^2): marble 6.2 mm, ping-pong 19.36 mm (= sqrt(20^2 - 5^2)). w >= 2R: the ball does not fit (error). w = 0 is a single line. |
| Rail-top step to the table `stepDrop_m` | 0 (physics default; NEGATIVE for an overhanging tip that hangs below the tabletop level); the apparatus passes the real value, `RAIL_HEIGHT_m cos(theta)` = 19.7 mm in the assembled preset | m | Physics default ASSUMED 0 (rail thickness neglected); since 2026-10-24 the apparatus uses the contact geometry of the 2 cm thick rail resting on the table (the old thin-line model put the rail body through the tabletop). Effect on the assembled preset: rise felt 18.0 instead of 20.0 cm (the tape still reads 20 cm at the clamp), v0 about 5 % lower. Geometry note: the ball's lowest point sits R - r_eff below the contact lines (1.75 mm for the marble, 0.64 mm for the ping-pong ball), so whether it touches the table inside the groove, and the true drop, depend on the rail profile, which we do not know. |
| Paper height `paperHeight_m` | 0 | m | Floor reference; the ball bottom lands at this height. |
| g, air density | 9.7717, 0.869 | m/s^2, kg/m^3 | Site constants (see Site above). 0.869 kg/m^3 is for 15 °C; 20 °C gives 0.855 (-1.6 %), well inside the other uncertainties. |

## Mechanics model assumptions

| Item | Value | Source |
|---|---|---|
| Rolling on the slope | no slipping on two lines, k_eff = k_body (R/r_eff)^2, (1 + k_eff) dv/dt = g (sin theta - c_rr cos theta R/r_eff) - k_d v^2 | Rigid-body result. Rolling resistance: F_rr = c_rr x (sum of the two line normal forces) = c_rr m g cos theta R/r_eff (each line: N = m g cos theta/(2 cos phi), cos phi = r_eff/R), so the marble's effective c_rr is 1.28 times larger on the rail (ASSUMED form; c_rr itself ASSUMED). |
| Air drag on the slope and the gap | k_d = rho C_d A/(2 m); slope kappa = k_d/(1 + k_eff), v^2 = (a0/kappa)(1 - exp(-2 kappa s)), a0 = g (sin theta - c_rr cos theta R/r_eff)/(1 + k_eff); table kappa = k_d/(1 + k_body) | Derived: drag acts on the translational DOF, the rolling constraint makes the inertia (1 + k). Vacuum limit (kappa -> 0) is v^2 = 2 a0 s (tested). Effect: -2.7 % on v_tip for the ping-pong ball at s = 1.10 m, -0.24 % for the marble. Buoyancy and added mass are neglected on the slope (about 1 % and 0.5 % of the ping-pong ball; opposite effects on a). |
| Rail-tip departure (default model, 2026-10-24) | The ball leaves the rail tip as a PROJECTILE with the slope velocity: speed v_tip, angle theta BELOW the horizontal, spin omega = v_tip/r_eff; centre r_eff above the rail top along its normal at the tip (x_tip + r_eff sin theta, tipHeight + r_eff cos theta). Pivoting about the rail end is neglected when v_tip^2 >= g cos(theta) r_eff (centripetal condition about the end edge, r_eff from the centre; 0.06 m^2/s^2 for the marble, v < 0.25 m/s: far below the 0.9 to 1.5 m/s of the marks), otherwise flagged (`tipPivot`) and still launched as a projectile | Rigid-body kinematics. The run extra-loss factor (junction factor) now scales (vx, vy, omega) at the departure. The original perfectly inelastic corner (next row) is available as `tipModel: 'corner'`. |
| Ball-table impact and hops (2026-10-24) | Rigid sphere, normal restitution `e_table`, Coulomb tangential impulse mu_k J_n capped where rolling is reached (angular momentum about the contact point conserved under the cap), energy lost >= 0 (tested). Hops are ballistic with gravity only (air drag, buoyancy, Magnus neglected on the table phase: the ping-pong drag on the first arc is ~0.2 m/s^2, 2 % of g). Hopping ends when the rebound speed is below `TABLE_HOP_MIN_vUp_mps` = 0.04 m/s (apex 0.08 mm; ASSUMED, geometric sequence so the value hardly matters) or after `TABLE_MAX_IMPACTS` = 200 (safety cap, never reached); then slip and roll (closed forms) to the edge. If the ball centre crosses the edge in the air it launches there with (vx, vy) (diagonal launch); in contact it launches horizontally if v^2 >= g R. Impacts on the corner of the edge are neglected | Rigid-body impact (Newton restitution + Coulomb friction). Thresholds ASSUMED. The measured range now depends on the hop at which the ball crosses the edge: it is NOT monotonic in the release mark (a mark whose first arc just lands before the edge leaves upward, the next mark just clears the edge and leaves downward). |
| Corner impact (original model, `tipModel: 'corner'`) | normal velocity destroyed (perfectly inelastic, no rebound), tangential v cos theta kept; Coulomb friction impulse during the impact dv = min(mu_k v_n, sticking value), v_n^2 = (v sin theta)^2 + 2 g stepDrop; spin omega0 = v/r_eff from the channel | ASSUMED idealisation. The impact friction can be switched off (`impactFriction: false`): it is the largest unknown of the slip length (marble slip distance 1.4-2.5 cm with it, ~ 4-5 cm without it; ping-pong sticks within the impact with it, ~ 0.7-1.2 cm without it). |
| Slip on the table | dv/dt = + mu_k g sgn(R omega - v), d(R omega)/dt = - mu_k g sgn(R omega - v)/k, closed form; rolling starts after Delta t = abs(v_roll - v1)/(mu_k g) at v_roll = (v cos theta + k R omega0)/(1 + k); if the edge comes first the ball leaves slipping with the actual v and omega | Derived (Coulomb friction, angular momentum about the contact line). For the narrow-groove marble R/r_eff = 1.28, so R omega0 > v cos theta and friction SPEEDS the ball up (v_roll > v_tip). Rolling resistance and drag are neglected during the slip. Energy lost up to rolling: 1/2 m (v sin theta)^2 + m g stepDrop + 1/2 m k/(1 + k) (v cos theta - R omega0)^2 (tested to 1e-12). |
| Table roll | (1 + k_body) dv/dt = - c_rr m g - k_d v^2 over the rest of the gap (flat table, one contact: F_rr = c_rr m g); stops if v^2 <= 0 | Model choice with the same c_rr. |
| Overhanging rail (2026-10-24) | Rigid beam resting on the table EDGE corner when the tip is beyond the edge: n . tip = t, i.e. h cos(theta) - Dc sin(theta) cos(theta) + x_tip sin(theta) = t (solved with Brent). The ball leaves the tip already past the edge; the edge crossing is on the rail with angle exactly -theta; flight time from the edge = time on the rail after the edge + flight from the tip | Rigid-body statics. The ball-edge corner contact after leaving the tip is neglected (clearance of the 40 mm ball from the corner at the smallest settable overhang ~ 1.6 mm). |
| Leaves horizontally (ball in contact at the edge) | v_edge^2 >= g R | Centripetal condition at the edge; below it the ball rolls over the edge. |
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
| Rail profile height `RAIL_HEIGHT_m` | 0.02 | m | ASSUMED (the drawn aluminium profile, 2 cm). The rail is a rigid beam this thick: resting on its low end, its top surface at the tip is `RAIL_HEIGHT_m cos(theta)` above the table (the rail can never go below the tabletop). Date 2026-10-24. |
| Two-leg stand support at scale 0 `LEG_BASE_HEIGHT_m` | 0.013 | m | ASSUMED (pads 5 mm plus bridge 8 mm). The support (bridge top, where the rail underside rests) is at `LEG_BASE_HEIGHT_m` + scale reading. It touches the rail only if higher than the free rack-and-table line at its distance. Date 2026-10-24. |
| Two-leg stand scale range | 0 to 150, 1 mm steps | mm | ASSUMED. |
| Two-leg span `TWO_LEG_SPAN_m` (lever of the screw foot) | 0.20 | m | ASSUMED. |
| Screw foot range / step | +-5 / 0.05 | mm | ASSUMED (same as Practica 1). |
| Tip counted as lifted above `TIP_LIFT_TOL_m` | 0.5 | mm | ASSUMED. |
| Screws | 2 per rail joint, 4 in the box | - | ASSUMED (the guide lists no count). |
| Table height `H_m` (hidden, per bench) | uniform 0.74 to 0.78 | m | ASSUMED (typical lab table). |
| Table lateral tilt (hidden, per bench) | uniform +-0.3 | deg | ASSUMED. |
| Lateral launch angle per rad of rail roll `LATERAL_DRIFT_GAIN` | 4 | - | ASSUMED, stylised: the ball rides one wall of the groove. Not derived; it only makes the level matter (0.3 deg of roll adds 1.2 deg of launch angle, comparable to the 1 deg run scatter). |
| Level sensitivity / bubble end / centred tolerance | 20 / 6 / 0.5 | mm/deg, mm, mm | ASSUMED (same vial as Practica 1). |
| Rail tip to edge when first put down / minimum / maximum | 0.15 / 0.004 / 0.60 | m | ASSUMED. 1 mm slider steps. The black end cap of the rail (`RAIL_END_CAP_m` 3.5 mm) sticks out beyond the tip, so a tip nearer than 4 mm to the edge, or past it, is refused. Date 2026-10-24. |
| Shoe (sloped end piece) `SHOE_LENGTH_m`, `SHOE_KINK_deg`, `SHOE_LIP_MIN_m` | 0.06, 6, 0.0025 | m, deg, m | ASSUMED, 2026-10-24. The 2 cm thick rail ends in a short tapered piece: a straight ramp 6 cm long, 6 deg steeper than the rail (a small convex kink), coming down to a lip at least 2.5 mm above the table top (3.8 mm at the assembled preset: 9.4 deg rail, ramp 15.4 deg). Geometry chosen first (a plausible machined end piece that removes most of the 2 cm step), results reported after, NOT tuned to give a horizontal launch. The ramp is shortened where the beam is low so the lip never goes below 2.5 mm (never clips the table); with the tip lifted by the two-leg stand the lip rises with it (7 cm at 60 mm of stand). The gap the student sets and the tape reads is the distance from the LIP to the edge; the rail marks (s) are measured from the beam end (where the shoe is attached; the shoe is not counted in the 1.2 m). The physics' tip gap is gap + the horizontal length of the ramp (5.8 cm at the preset). |
| Shoe contact model | ball centre cannot go below the ramp line (surface offset r_eff along the normal); the kink is convex, so at the speeds of the marks (>= 1 m/s) the ball leaves the rail end as a projectile and meets the ramp near its lower part; ramp impact with `e_table` and `mu_k` of the ball reused (ASSUMED: shoe surface behaves like the table), then hops, or rolls down the rest of the ramp (slip closed at once conserving angular momentum about the contact line) | ASSUMED, 2026-10-24. Effect at the assembled preset: 1 to 3 ramp touches and 0 to 1 touches on the table; the ball crosses the edge in the air in all cases of the procedure, within about 7 deg of the horizontal, with t from the edge 0.38 to 0.42 s (sqrt(2H/g) = 0.394 s). |
| Overhang range `GAP_OVERHANG_MIN_m` / `GAP_OVERHANG_MAX_m` | 0.010 / 0.090 | m | ASSUMED, 2026-10-24. Lip (rail's lower end) beyond the edge by 10 to 90 mm (the beam rests on the edge corner only when its own end is past the edge, about 6 cm or more of overhang). The band from 10 mm overhang to 4 mm gap (end corner at the table corner, end cap of 3.5 mm: the rail would balance on a mm-sized corner) is refused as before; 10 mm = RAIL_HEIGHT_m sin(17 deg) + end cap, rounded. 90 mm so that the two-leg stand (0.10 m from the tip) stays on the table. |
| Rail mark: snap / student's placement error sigma / max count | 0.5 / 1 / 10 | mm, mm, - | ASSUMED. Guide: 5 marks in the upper half (s >= 0.60 m from the low tip). |
| Paper and projection placement limit `PAPER_POS_MAX_m` | 3 | m | ASSUMED (the tape reaches 3 m; a sheet or the edge projection farther away is refused). Row added 2026-10-24. |
| Sheet thickness `PAPER_THICKNESS_m` | 0.4 | mm | ASSUMED, drawn exaggerated (a real sheet is ~0.1 mm) so it reads. A ball resting on the paper has its centre R above the sheet top; the carbon sheet lies on the bond paper where they overlap, on the floor otherwise. Date 2026-10-24. |
| Landed ball: hops and roll-out `FLOOR_TANGENT_KEEP`, `HOP_MIN_vUp_mps`, `FLOOR_ROLL_DECEL_mps2`, `MAX_HOPS` | 0.5, 0.3, 3, 6 | -, m/s, m/s^2, - | ASSUMED, animation of where the ball comes to rest only (the measured range is the first contact). Each impact multiplies the vertical speed by the restitution (0.5 marble, 0.8 ping-pong, ASSUMED) and the horizontal speed by 0.5; hopping ends below a take-off speed of 0.3 m/s; then a constant-deceleration roll-out. The ball stays on the floor (on the paper where it rests on a sheet) until the student returns it. Date 2026-10-24. |
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

Simplifications: no longitudinal table tilt; the table is long enough for any rail position; the rail is a rigid beam on its contacts (rack clamp, tabletop at the low end, two-leg stand when higher than the free line), exact in the angle; after the first bounce the ball follows the hop and roll-out model above; marks are the first contact only. With the physics rolling resistance (`c_rr` 1.5e-3 and 5e-3) a ball does not stop on a 0.6 m gap: only a nearly flat rail stops it.

## Práctica 3 (`src/experiments/newton2`)

Force and acceleration: a DigiCart on a (nearly) level rail pulled by a hanging film canister over the receiver's pulley. Date of all rows: 2026-10-27. **ASSUMED** = chosen by us from typical values and physical reasoning, not measured, not PHYWE specifications; none was tuned to a target. The cart body (mass, wheels, `c_rr`, bearing drag, breakaway, drag) is the one in the Cart table above (`DEFAULT_DIGICART_BODY`, now in `src/core/physics/digicart.ts`, shared with Práctica 1; no value changed). Local g and air density: Site table.

Model: m_hang g + M_cart g sin(tilt) - F_resist(v) = M_eff a, with M_eff = M_cart + m_hang + sum(I_w)/r_w^2 + I_p/r_p^2 + m_string and F_resist = c_rr M_cart g cos(tilt) + F_bearing + F_pulley + 1/2 rho Cd A v^2 (rigid-body result for rolling wheels and a pulley; string inextensible; the string's inertia counted, and the weight of its hanging part lambda g (hang0 + s) added to the driving force in the full RK4 model; the closed form and `constantAcceleration_mps2` leave that term out and are the ideal / constant-force reference). After the canister meets the floor the string is slack and the cart coasts: M_cart g sin(tilt) - F_resist = (M_cart + sum(I_w)/r_w^2) a; the canister stops at once and the cart keeps its speed (ASSUMED perfectly inelastic canister). The cart stops at the receiver stop (ASSUMED inelastic) or when static friction holds it. The static-breakaway force acts only for a cart AT REST (v = 0). The cart cannot roll back (v is clamped at 0, a held cart stays held): exact in the levelling range (a centred bubble, |tilt| <= 0.025 deg: tilt force 1.1 mN, below kinetic + breakaway); a coasting cart on a rail tilted away from the pulley by more than about 0.1 deg (after a floor impact) would in reality roll back.

| Parameter | Value | Unit | Source |
|---|---|---|---|
| Mass of each of the four masses `MASS_NOMINAL_kg` | 0.010 | kg | Guide (10 g masses). |
| Mass tolerance `MASS_TOLERANCE_kg` (hidden, per bench, uniform +-) | 0.0001 | kg | ASSUMED (typical class M1 turned weights of 10 g: +-0.5 mg are better; these are plain silver masses, so 0.1 g). |
| Canister with lid `CANISTER_kg`, tolerance | 0.0095, +-0.0003 | kg | ASSUMED (a plastic 35 mm film canister is about 8 to 10 g). |
| Brass screw `BRASS_SCREW_kg` | 0.005 | kg | ASSUMED (a long brass screw with its nut). Counted in Mt and on the cart. |
| Plastic screw `PLASTIC_SCREW_kg`, kit count | 0.0008, 5 | kg, - | Count from the guide (5 plastic screws), mass ASSUMED. One screw goes with every mass moved to the cart, so Mt grows by 0.8 g per move (real effect, kept). |
| String linear density `STRING_LINEAR_DENSITY_kgpm` | 0.0002 | kg/m | ASSUMED (thin nylon thread, about 0.2 g per metre). Inertia counted; weight of the hanging part counted in the full model: 0.2 g/m x g x (hang0 + s) grows from 0.04 mN to 1.8 mN over the 90 cm (about 0.3 % of F on average, as large as the bearing drag at the end of the run). |
| Pulley mass / radius / inertia factor | 0.004, 0.0125, 0.5 | kg, m, - | ASSUMED (small plastic disc, I = m r^2/2): equivalent mass I/r^2 = 2 g. |
| Pulley axle friction `PULLEY_FRICTION_N` | 0.001 | N | ASSUMED, small, velocity independent; run-to-run relative sigma 0.2 (below). |
| Bench height above the floor `BENCH_HEIGHT_m` | 0.92 | m | ASSUMED, a laboratory bench (0.90 to 0.95 m). Práctica 2 uses a 0.76 m table (`H_m`); that is too low here: the canister falls 0.90 m and would reach the floor before the end mark, so the guide's warning would leave no valid string length. |
| Shortest hang at the release `MIN_HANG_m` | 0.015 | m | ASSUMED: the string knot cannot sit in the pulley groove. A string shorter than this does not reach the pulley from the start mark (`stringTooShort`). |
| Rail top above the bench `SUPPORT_BASE_HEIGHT_m` | 0.06 | m | ASSUMED, as `RACK_BASE_HEIGHT_m` of Práctica 1. |
| String above the rail top `STRING_ABOVE_RAIL_m` | 0.03 | m | ASSUMED (height of the brass screw on the cart). |
| Canister bottom to its knot `CANISTER_HANG_m` | 0.06 | m | ASSUMED (51 mm canister plus a loop). |
| Pulley contact beyond the stop face `PULLEY_AHEAD_OF_STOP_m` | 0.015 | m | ASSUMED. |
| Allowed hang below the pulley at the release | 0.015 to (string height - canister hang - 0.90) = 0.015 to 0.05 | m | Consequence of the rows above: between a string that does not reach the pulley and a canister that meets the floor before the end mark. |
| Support separation / supports from the ends | 1.10 / 0.05 | m | As Práctica 1 (ASSUMED). The stand end is raised by the rack (1 mm steps, 0 to 250 mm), the receiver end has a screw foot (+-5 mm, 0.05 mm). |
| Hidden bench tilt `TABLE_TILT_MAX_deg` | uniform +-0.15 | deg | ASSUMED (as Práctica 1). Positive: receiver end lower. |
| Level sensitivity / bubble end / centred tolerance | 20 / 6 / 0.5 | mm/deg, mm, mm | ASSUMED (same vial as Práctica 1). A centred bubble allows up to +-0.025 deg. |
| Receiver stop from the rail end / cart length | 0.04 / 0.0984 | m | ASSUMED (as Práctica 1). |
| Marks: snap / distance tolerance / cart-at-start tolerance | 0.5 / 2 / 1.5 | mm | ASSUMED. Guide distance 90 cm. |
| String length range / step / initial length | 0.30 to 2.00 / 1 / 1.50 | m, mm, m | ASSUMED. |
| Run variability: release offset sigma | 1 | mm | ASSUMED (as Práctica 1). |
| Run variability: push at release (half-normal) | 1 | mm/s | ASSUMED (as Práctica 1); zeroed when static friction holds the cart. |
| Run variability: relative sigma of `c_rr` / of pulley friction | 0.05 / 0.2 | - | ASSUMED (`c_rr` as Práctica 1). |
| Fit coverage (test) | 63 % of 120 seeded benches have |M_fit - M_true| <= sigma_M, 69 % for F0; mean reduced chi^2 1.2 | - | Ensemble with canister weights spread over the scale divisions (a single nominal bench freezes the rounding of the reading and of the 0.01 s display, which is why the nominal bench of the teacher key shows a reduced chi^2 of 0.2). Slightly below 68 % because the truncating display adds a -0.005 s common bias that the Type B term treats as random. |
| Balance resolution / capacity | 0.1 g / 600 g | g | ASSUMED (typical teaching-lab digital balance). Type B u = 0.1 g / sqrt(12) = 0.029 g. No zero error or scatter modelled. |
| Dynamometer (shared core spring scale, `core/instruments/springScale.ts`) | 1 N scale (default, 0.02 N divisions) or 2 N scale (0.05 N divisions); used hanging, zeroed hanging: no zero error | N | Values of the scales in the core table (ASSUMED). Type B u = division / sqrt(12) = 0.0058 N (1 N) or 0.0144 N (2 N) (`springScaleUncertainty_N`). The reading is the true weight of the canister, quantised to a division. |
| Distractor masses: 50 g mass, marble | 0.050, 0.0052 | kg | ASSUMED (only weighable; they do nothing in the dynamics). |
| DigiCart log | 50 Hz, 1 mm | Hz, mm | ASSUMED (as Práctica 1), until 0.5 s after the end mark. |
| Tabla 3.1 | 5 rows (4, 3, 2, 1 masses in the canister, plus an optional empty canister) x 10 times; times <= 30 s, 2 decimals; forces <= 2 N, 2 decimals; Mt in g, 1 decimal | - | Guide layout (four trials); the optional fifth row, the limits and the decimals are ASSUMED. |
| Analysis: distance uncertainty | sqrt(2) x 1 mm / sqrt(12) = 0.41 | mm | Two scale readings on the millimetre rail scale. |
| Analysis: stopwatch resolution, reaction bias | 0.01 s (u = 0.0029 s), half-width 0.1 s (u = 0.058 s) | s | As Práctica 1 (`reactionBiasTypeB_s`): the bias is common to all readings and enters only as a separate effect on the fit. |
| Falling cart: sag of the rail's free end `RAIL_FREE_END_SAG_m` | 0.03 | m | ASSUMED (2026-10-29). With no receiver the rail is held only by the stand clamp; a 1.2 m aluminium rail droops at its free end. It gives a slope of asin(0.03 / 1.10) = 1.6 deg toward the open end, enough to start the cart for any load (drive M g sin about 0.07 N against about 0.006 N of resistance and breakaway). The release then runs the cart down that slope with the same cart model as the coasting phase and no string pull. The 3D and 2D views draw the sag. |
| Falling cart: centre of mass above the rail top `CART_COM_ABOVE_RAIL_m` | 0.025 | m | ASSUMED. The cart leaves the rail when its centre reaches the rail end (it tips off). |
| Falling cart: restitution `FLOOR_RESTITUTION`, floor friction `FLOOR_FRICTION_COEFF` | 0.25, 0.35 | -, - | ASSUMED (a plastic cart on a hard floor: low bounce; it slides and its wheels drag). Landing loses no horizontal speed at the impact (impulsive friction neglected); bounces whose take-off speed is below 0.05 m/s stop (`BOUNCE_MIN_mps`, numerical); the cart then slides to rest with Coulomb friction. Flight is ballistic with the Quito g (`G_QUITO_mps2`), no air drag, no rotation: a point mass. The fall is deterministic given the run's sampled conditions (`fall.ts`, tested). A run that ends in a fall is outcome `fell`: no end-mark time, no DigiCart record, it never counts for Table 3.1. |

Simplifications: the string is inextensible and stays taut while the canister is driven; the canister does not swing or spin; the wheels roll without slipping; the canister hits the floor inelastically; the rail is rigid; no friction between the string and the pulley rim other than the axle term. The string weight is neglected. A string too short to reach the pulley from the start mark (hang < 0) holds the cart in place in this model (the guide's cart "cannot be released from the 0 cm mark").

## Práctica 4 (`src/experiments/friction`)

Date of every row: 2026-10-27. **ASSUMED** = chosen by us from typical values and physical reasoning, not measured; no friction coefficient here is a lab measurement, and none was tuned to reach a target. Literature ranges are those of common engineering handbook tables (order of magnitude only; the student looks up and cites their own value in task 7, the app never supplies one).

### Spring scales (`src/core/instruments/springScale.ts`, shared)

| Parameter | Value | Unit | Source |
|---|---|---|---|
| 1 N scale: range / smallest division / printed length / `k_Npm` | 1 / 0.02 / 0.10 / 10 | N, N, m, N/m | ASSUMED (a plausible 10 cm barrel, 50 divisions 2 mm apart; k = range / length by Hooke). |
| 2 N scale: range / smallest division / printed length / `k_Npm` | 2 / 0.05 / 0.10 / 20 | N, N, m, N/m | ASSUMED (40 divisions 2.5 mm apart). |
| Reading convention | nearest division by eye; Type B u = d / sqrt(12) | - | `statistics.ts` `typeBAnalog` (GUM 4.3.7), same as the tape measure. |
| Barrel damping `damping_Nspm` (dashpot in parallel with the spring) | 0.15 | N s/m | ASSUMED. A real tube dynamometer rings (damping ratio of order 0.02 to 0.05); this gives 0.05 to 0.1 with the block alone. ANY barrel damping makes the needle read c v low during the build-up (0.0015 N at 1 cm/s, 0.015 N at 10 cm/s): the static peak is mu_s N - c v. It does NOT make the plateau possible; see `CONTACT_BETA_spm`. The needle shows the spring force k e only. |
| Moving mass (rod, hook, needle) `movingMass_kg` | 2 (1 N), 3 (2 N) | g | ASSUMED. A scale zeroed hanging and used horizontally reads low by m g (0.020 N and 0.029 N). The zero screw, turned horizontally, removes it. |
| Over-range | needle held at the full-scale stop, flagged | - | The model keeps the spring linear past the stop (the real scale becomes rigid); only the displayed value is clamped. |

### Block, masses, balance (`physics/constants.ts`, `apparatus/constants.ts`)

| Parameter | Value | Unit | Source |
|---|---|---|---|
| Friction block mass `BLOCK_MASS_NOMINAL_kg` / per-bench spread | 0.100 / uniform +-0.006 | kg | ASSUMED (a small wooden block with hook; the real block was not weighed). The student weighs it. |
| Silver masses `MASS_NOMINAL_kg`, count / per-mass sigma | 0.050, 3 / 0.5 % | kg, -, - | Nominal and count from the guide; the 0.5 % scatter ASSUMED (slotted masses). The student uses the nominal value unless weighed. |
| Balance (omitted from the guide's list; the procedure needs M) | digit 0.1 g, repeatability sigma 0.05 g | g | ASSUMED. |
| Bar mass `BAR_MASS_kg` wood / aluminium / iron | 0.026 / 0.100 / 0.300 | kg | ASSUMED from a 10 x 2.5 x 1.5 cm bar and handbook densities (700, 2700, 7870 kg/m^3). The bar mass does not enter mu (m cancels). |
| Bar length `BAR_LENGTH_m` | 0.10 | m | ASSUMED. With the front edge on the start mark (1.10 m from the low end) the rear edge is at the end of the 1.2 m rail. |

### Friction coefficients (`FACE_PAIRS`, `BAR_PAIRS`, `PAPER_ON_TABLE`, `BLOCK_ON_TABLE`)

| Pair | mu_s / mu_k | Literature range of mu_s | Source |
|---|---|---|---|
| Cloth on paper | 0.40 / 0.30 | 0.3 to 0.5 | ASSUMED (textile on paper in handbook tables). |
| Sandpaper on paper | 0.72 / 0.55 | 0.5 to 1.0 | ASSUMED (abrasive paper on paper; wide range). |
| Paper on the bare table (paper not fixed) | 0.35 / 0.28 | 0.25 to 0.5 | ASSUMED. The loaded paper carries the block with it and this pair sets the reading. |
| Block on the bare table (after leaving the A4 sheet) | 0.35 / 0.28 | 0.25 to 0.5 | ASSUMED. |
| Wood bar on the aluminium rail | 0.40 / 0.30 | 0.2 to 0.6 | ASSUMED (wood on metal). |
| Aluminium bar on the aluminium rail | 0.50 / 0.40 | 0.4 to 0.7 | ASSUMED (lightly anodised/oxidised; clean bare aluminium on aluminium is much higher). |
| Iron bar on the aluminium rail | 0.58 / 0.46 | 0.4 to 0.7 | ASSUMED (steel on aluminium about 0.6 static). |
| Rail material | aluminium | - | ASSUMED (the profile of the shared rail). |

In every pair mu_s > mu_k. The coefficients do not depend on weight or contact area (Amontons-Coulomb laws); the model has no velocity dependence of mu except the scale damping above.

### Run variability (`FACE_SCATTER`, `BAR_SCATTER`, `LOOSE_PAPER_SCATTER`, `sampleHand`)

| Parameter | Value | Unit | Source |
|---|---|---|---|
| Face on paper: relative sigma of mu_s / mu_k per trial | 5 / 3 | % | ASSUMED (patch of surface under the block, dust, fibres). |
| Correlation of the mu_s and mu_k deviations of a trial `MU_CORRELATION` | 0.7 | - | ASSUMED: one shared surface-patch factor plus independent parts (the same dust or oxide acts on both). Keeps a = g (sin theta - mu_k cos theta) from scattering as if mu_s - mu_k were independent: slide-time scatter is about 10 % (it was 18 to 27 % with independent draws). |
| Bar on rail: relative sigma of mu_s / mu_k per trial | 6 / 4 | % | ASSUMED (oxide film, handling). With a ratio mu_s / mu_k of only 1.25 the acceleration (proportional to mu_s - mu_k) scatters by about 20 to 30 %: slide times at the onset scatter that much (teacher key). |
| Loose paper | 15 / 10 | % | ASSUMED (erratic, three times the face scatter). |
| Guard `MIN_MU_RATIO` | 1.02 | - | Numerical: a draw cannot make mu_s smaller than 1.02 mu_k (static friction is the larger one). One-sided; it acts in under 1 % of draws. |
| Hand: lag `HAND_TAU_s` (x 0.7 to 1.3), speed wobble amplitude, wobble frequency | 0.15, 4 to 10 %, 1 to 2.5 | s, %, Hz | ASSUMED (uneven pulling). |

### Spring-block model (exps. 1 and 2)

| Parameter | Value | Unit | Source |
|---|---|---|---|
| `CONTACT_BETA_spm` (THE parameter that makes a steady plateau possible) | 1.5 | s/m | ASSUMED. Velocity strengthening of the kinetic friction at the block-paper contact, mu_k(u) = mu_k (1 + beta u): zero force while stuck (the static peak stays at mu_s N), it damps the stick-slip ring. Consequence: the steady needle reading is mu_k N (1 + beta v), +6 % at the advised 4 cm/s, so the fitted slope of F against W is mu_k (1 + beta v), not mu_k. Without it (beta = 0) the sliding block oscillates forever around mu_k N with amplitude (mu_s - mu_k) N. |
| Equations | stuck: breaks away when abs(k e + c_b v) >= mu_s N; sliding: M u' = k e + c_b e' - mu_k N (1 + beta u), e' = v_pull - u, N = M g | - | Coulomb friction with a dashpot-in-parallel spring. Exact damped-oscillator update per step, events (breakaway, arrest, re-stick or reverse slip) found by bisection. |
| Step `PULL_DT_s`, stored sample `PULL_SAMPLE_s` | 1, 5 | ms | Numerical. The result does not depend on the step (test: split vs single advance). |
| Pull speeds offered | 2 to 200 | mm/s | ASSUMED (hand pulling). |
| Paper travel `PAPER_TRAVEL_m` | 0.20 | m | ASSUMED: A4 sheet 297 mm along the pull, minus a block about 60 mm long (ASSUMED), minus about 20 mm of margin at each end for the tape that fixes it; conservative (0.237 m would fit). The spring stretches before the block moves, so the travel is used only after the breakaway; at the advised 4 cm/s it gives about 4 s of readable plateau for every load (teacher key). Past it the block is on the bare table (above). |
| Pull angle | 0 (horizontal) | - | Simplification: no cosine factor. |

### Exp. 3: rail geometry (`RAIL_SUPPORT_DIST_m` etc.)

| Parameter | Value | Unit | Source |
|---|---|---|---|
| Geometry definition | the rail pivots on the lower edge of its low end on the table; the rack stand clamps it at `RAIL_SUPPORT_DIST_m` along the rail; h = height of the rail underside at the clamp above the table; sin(theta) = h / L | - | Rigid beam. The help page states this. |
| `RAIL_SUPPORT_DIST_m` (L) | 1.10 | m | ASSUMED (same as Practica 1 and 2). |
| Rail length | 1.2 | m | Guide. |
| Course `COURSE_m` | 1.00 | m | Guide (100 cm). Start mark: bar front edge 1.10 m from the low end; longest course allowed `COURSE_MAX_m` = 1.08 m. |
| Mark placement | snap 1 mm, sigma 1 mm | mm | ASSUMED. |
| Rack stand reach `RACK_H_MAX_m` | 0.70 | m | ASSUMED (a taller rod than Practica 1 and 2, so that tan(theta) up to 0.82 is reachable; the iron bar needs h = 0.55 m). |
| Crank rate offered / default | 0.5 to 60 / 20 | mm/s | ASSUMED (a fast crank reaches the onset of the iron bar, h = 0.55 m, in 28 s; slowing down near the onset reduces the overshoot of h when the crank is stopped about 0.3 to 0.5 s after the slip). |
| theta(t) during the slide | follows h(t): if the student keeps cranking the angle keeps increasing; if the crank stops, theta is frozen | - | Choice, documented. RK4 step 1 ms; closed form a t^2 / 2 at constant angle (tested). |
| Tape reading of h | 1 mm division, placement sigma 0.5 mm | mm | ASSUMED (tape model of core; MPE reported not applied). Refused while the crank is turning. |
| u(h) as recorded, u(L), u(d) of the analysis | tape 1 mm and onset judgment 3 mm in quadrature; 2 mm; 1 mm mark placement and 1 mm tape | mm | ASSUMED (the onset judgment is a few mm of crank at 5 mm/s). Enter delta mu with the time term. |
| Slide uncertainty of t | display 0.01 s and reaction-bias half-width 0.1 s in quadrature (0.058 s) | s | As Practica 1 and 2 (`reactionBiasTypeB_s`). |

### Simplifications

No speed dependence of mu; no rolling or tipping of the bar or block; no friction in the rack stand; the block cannot tip. The 1 N scale's stop is not a rigid wall in the dynamics. Gravity is the Quito value. The guide's list omits the rack-and-pinion stand and its base, a stopwatch and a balance; the app offers them and the help page says so.
