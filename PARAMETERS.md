# Model parameters

Every empirical parameter of `src/physics`, with value, unit, source and date. **ASSUMED** means: chosen by us from
typical values and physical reasoning, not measured and not a PHYWE specification (no reliable PHYWE datasheet was
found or consulted). None was tuned to hit a target; the resulting a ~ 0.206 m/s^2 is a consequence, and it is
consistent with the ~0.21 m/s^2 expected for the guide's 1.30 deg. Date of all rows: 2026-10-22.

## Site

| Parameter | Value | Unit | Source |
|---|---|---|---|
| Latitude (`QUITO_LATITUDE_deg`) | -0.21 | deg | Approximate public coordinates of Quito/EPN. ASSUMED to ~0.01 deg (irrelevant for g at this precision). |
| Altitude (`QUITO_ALTITUDE_m`) | 2800 | m | Approximate. ASSUMED (+-50 m changes g by 1.5e-4 m/s^2). |
| g at sea level, equator | 9.780327 | m/s^2 | International gravity formula, WGS84 form (NIMA TR8350.2). |
| g(latitude) | 9.780327 (1 + 0.0053024 sin^2 phi - 0.0000058 sin^2 2phi) | m/s^2 | Same. |
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
| Rolling-resistance coefficient `c_rr` | 5e-4 | - | ASSUMED. Hard wheel on aluminium rail with ball bearings; literature range 1e-3 (steel on steel) and lower for good bearings. |
| Bearing drag `F_bearing_N` | 3e-4 | N | ASSUMED. ~0.5 % of the driving force m g sin(theta) = 0.0556 N. |
| Drag coefficient `Cd` | 1.0 | - | ASSUMED blunt box. |
| Frontal area `A_m2` | 1.2e-3 | m^2 | ASSUMED (about 4 cm x 3 cm). |

Derived: ideal a = g sin(theta)/(1+k) = 0.2115 m/s^2; with friction and bearing a = 0.2057 m/s^2 (constant-force
part). Air drag at v = 0.6 m/s is ~0.3 % of the driving force and lengthens t(0.9 m) by ~1 ms.

## Run variability (`DEFAULT_VARIABILITY`, separate from the expectation)

| Parameter | Value | Unit | Source |
|---|---|---|---|
| Release offset sigma | 1.0 | mm | ASSUMED. Placing the cart front on a mm mark by eye. |
| Initial velocity sigma | 4 | mm/s | ASSUMED. Finger lift or release jolt. Dominates the time scatter: sigma_t ~ 0.019 s (0.1 m: 0.0195, 0.5 m: 0.0189, 0.9 m: 0.0193 s, 2000 simulated runs each). |
| c_rr run-to-run sigma | 5 | % of c_rr | ASSUMED. Dust or film on the track; its effect on t is below 1 ms. |

## Instruments (`instruments.ts`)

| Parameter | Value | Source |
|---|---|---|
| Stopwatch resolution | 0.01 s | ASSUMED typical digital stopwatch. Human reaction time is added by the apparatus layer (phase 2), not here. |
| Rail scale division | 1 mm | From the photos: millimetre scale. ASSUMED 1 mm. |
| Vernier least count | 0.05 mm | ASSUMED typical analog caliper. |
| Digital caliper resolution | 0.01 mm | ASSUMED typical. |

Type B convention: u = resolution/sqrt(12) (rectangular, half-width = resolution/2), identical to half-division/sqrt(3).

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

All rows ASSUMED unless a source is given; none is a PHYWE specification. Date of all rows: 2026-10-22.

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
| Cart front reference offset | 0.0035 | m | ASSUMED (measurable item only). |
| Caliper range | 0..150 | mm | ASSUMED typical. |
| Vernier | main 1 mm, 20 divisions | - | ASSUMED; least count 0.05 mm (physics/instruments.ts). |
| Digital caliper zero error | uniform +-0.05 | mm | ASSUMED, seeded; removed by the zero button with the jaws closed. Display quantised 0.01 mm. |
| Mark snap / max marks | 0.5 / 30 | mm / - | ASSUMED. |
| Mark check tolerance (spacing, position vs A + 100 i) | 2 | mm | ASSUMED (tape placement). AB >= 900 mm - 2 mm. |
| Target angle / tolerance | 1.30 / 0.05 | deg | Guide angle; tolerance ASSUMED (pedagogical). |
| Cart "at 0 cm" tolerance | 1.5 | mm | ASSUMED. |
| DigiCart encoder | 50 Hz, 1 mm | - | ASSUMED. x(t) is displacement from the release instant. |
| Stored trajectory step | 1 | ms | Same step as physics crossing time (RK4). |
| Table 1.1 | 10 positions x 10 repetitions; max 30 s; 2 decimals | - | Guide layout; limits ASSUMED (stopwatch resolution 0.01 s). |

Simplifications: no sag of the rail; the table tilt is not drawn (world frame = table frame) but is added to the incline; a flat or uphill rail does not move the cart (static friction / no uphill model); the cart stops at the receiver (no bounce); the release offset is applied at release (cart jumps by about 1 mm).
