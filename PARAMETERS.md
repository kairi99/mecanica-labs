# Model parameters

Every empirical parameter of `src/physics`, with value, unit, source and date. **ASSUMED** means: chosen by us from
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

## Apparatus (`src/apparatus/constants.ts`)

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
