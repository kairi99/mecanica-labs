# Architecture: apparatus layer (`src/experiments/mruv/apparatus`)

Device logic between the pure physics (`src/core/physics`, `src/experiments/mruv/physics`) and the views (3D scene, 2D panels). It owns **state**, **actions**
and **events**. Views render this state and call these actions; they never compute physics. No DOM, no timers, no
`Math.random`. Time is passed in by the caller (ms timestamps, for example `event.timeStamp` or `performance.now()`), so
tests are deterministic. Randomness is the injected `mulberry32` (seed from the constructor, later from the URL).

```ts
import { Apparatus, createApparatus } from './apparatus/index.ts'
const lab = createApparatus('assembled', { seed: 42 })   // or new Apparatus({ seed }) then lab.preset('empty')
```

Every action returns `Result`: `{ ok: true, ...data }` or `{ ok: false, reason: Reason, item?: ItemId }`. `reason` and
all enums are ids; the views translate them through their `{ es, en }` strings files. Every refusal also emits a `refused` event.

## Units and conventions

* SI with the unit in the name (`x_m`, `t_s`, `v_mps`, `theta_rad`, `*_ms` for caller timestamps). Exceptions carried by
  the name: `*_mm` for the rail scale, rack reading, foot and tape-measure quantities; `*_cm` for the table positions.
* **Rail scale** `railPos_mm`: the printed scale, 0..1200 mm, 0 at rail end `E1`, 1200 at `E2`. The student chooses which
  end goes into the rack-stand clamp (`attach('rackClamp', { railEnd })`). That end is the **top** of the slope.
  `geometry().scaleZeroAtHighEnd` is true for `E1`; the guide wants this (0 at the top); `procedure().scaleOk` flags it.
  The cart front, markers and crossing records always use the printed numbers; use `downSlope_m()` / `railPos_mm()` in
  `geometry.ts` to convert to a distance from the top.
* **World frame** (meters, right-handed): origin on the table top directly under the rack-stand clamp point; `x` horizontal
  from the rack stand toward the two-leg stand and receiver (down-slope is +x); `y` up, normal to the table top; `z`
  across the bench toward the viewer. This is the **table frame**: the hidden table tilt (up to 0.15 deg) is not drawn,
  but it is added to the incline the cart feels (`theta_rad`). `railAngle_rad` is the drawn geometric angle.
* Rail model: a straight line on the top-surface centre line, `pose.highEnd -> pose.lowEnd`, 1.2 m, unit vectors
  `direction` (down-slope) and `normal` (up). Supports sit 0.05 m from each end (`pose.clamp`, `pose.twoLeg`, d = 1.10 m).
  `pose.stopFace` is the point where the cart front stops (0.04 m before the low end).

## Public API (class `Apparatus`)

| Area | Methods |
|---|---|
| Events | `on(listener) -> unsubscribe`, `eventLog()` |
| Inventory | `addItem(id)`, `removeItem(id)`, `hasItem(id)`, `getState()` |
| Assembly | `attach(joint, { railEnd? })`, `detach(joint)`, `missing()`, `canRun()` |
| Geometry | `geometry()`, `looseRail()`, `railPoseNow()`, `setRackHeight_mm(n)`, `setFoot_mm(x)` |
| Level | `placeLevel('rail' \| 'table' \| null)`, `levelReading()` |
| Tape measure | `tapeMeasure(target)` |
| Markers | `placeMarker(pos)`, `moveMarker(id, pos)`, `removeMarker(id)`, `clearMarkers()`, `getMarkers()`, `evaluateMarks()` |
| Cart | `placeCart(frontPos_mm)`, `resetCart()`, `releaseCart(t_ms)`, `cartState(t_ms)`, `cartPose(t_ms)`, `getRuns()`, `getRun(id)` |
| Stopwatch | `stopwatchStartStop(t_ms, { markTarget? })`, `stopwatchReset()`, `stopwatchDisplay_s(t_ms)`, `setLinkStartToRelease(on)`, `stopLog()` |
| Table 1.1 | `tableSet(row, col, input)`, `tableCopyDisplay(row, col, t_ms)`, `tableClearCell`, `tableClear()`, `tableData()` |
| DigiCart | `digicartRecord(runId)` |
| Procedure | `procedure()` |
| Persistence | `snapshot()`, `load(snapshot)`, `reset()`, `preset('empty' \| 'assembled')`, `hiddenTruth()` (teacher/tests only) |

Free helpers (pure): `railPose`, `railPointAt`, `downSlope_m`, `railPos_mm`, `bubbleOffset_mm`, `tapeGeometry`, `evaluateMarks`,
`parseTimeInput`, `buildTrajectory`, `digicartSamples`; constants in `constants.ts`.

### Items, joints, attachment points

Items: `rail, cart, rackStand, standBase, twoLegStand, receiver, screws, level, stopwatch, tape, markers`.
Joints: `standBase` (rack stand on its base, no screws), `rackClamp` (a rail end in the clamp; needs `standBase`; 2 screws),
`twoLegStand` and `receiver` (the opposite end; need `rackClamp` first; 2 screws each). Three rail joints use all 6 screws.
Detaching or removing something undoes what hangs on it (events `detached`). Removing the rail also removes the cart
and the marks. Anchor points for the 3D scene (all from `geometry().pose` or `railPointAt`): the **rack stand** base at
`(0, 0, 0)` with its rod to `clamp` height (`clampHeight_m`); the **two-leg stand** on the table under `pose.twoLeg`
with its screw foot (`foot_mm`) at the floor; the **receiver** at `pose.lowEnd`, stop face `pose.stopFace`; the
**cart** `cartPose(t_ms)` front/rear on the rail top surface with `normal`. Items not mounted have no anchor: lay them
out on the bench by your own slots; the loose rail is `looseRail()` (z = 0.25 m, top surface at 0.02 m).

### State shape

`getState()` returns `ApparatusState`: `items` (booleans), `joints`, `screwsUsed`, `screwsAvailable`, `rack_mm`, `foot_mm`,
`level.placement`, `markers [{id, railPos_mm}]`, `cart {placed, startRailPos_mm,
released, runId}`, `stopwatch {running, linkStartToRelease}`, `geometry` (`RailGeometry` or `null` until the clamp is
fastened: `supportedBothEnds`, `scaleZeroAtHighEnd`, `clampHeight_m`, `twoLegHeight_m`, `railAngle_rad`, `theta_rad`, `pose`).
Time-dependent values come from methods that take `t_ms`: `cartState(t_ms)` (`phase` `unplaced | atStart | rolling |
stopped | stuck`, `frontRailPos_mm`, `rearRailPos_mm`, `s_m`, `v_mps`, `t_s`, `runId`), `stopwatchDisplay_s(t_ms)`.
The views redraw on `on(listener)` events and per frame with their own clock for the cart and the stopwatch.

The hidden table tilt exists only inside; `hiddenTruth()` reveals them for teacher mode and tests.

### Level, heights, angle

`levelReading()`: `bubble_mm` is +positive toward the top of the slope; 2 mm per 0.1 deg, saturating at 6 mm. On the rail
it shows the true incline, on the table only the table tilt. The intended workflow: level the rail with the foot while the
rack reads 0 mm (sets the `leveled` event and `procedure().levelledBeforeRaise`), then raise the rack (about 25 mm) and
trim with the foot. `sin(theta_rail) = (h_clamp - h_twoLeg) / d`, `theta = theta_rail + tableTilt` (`physics/incline.ts`).

### Tape measure

`tapeMeasure(target)`; targets: `{kind:'railHeight', at:'clamp' | 'twoLeg' | {railPos_mm}}`, `{kind:'cartLength'}`,
`{kind:'supportSeparation'}` (the distance d of the two supports along the rail, needs both supports). Returns
`reading {trueLength_m, tape, mpe_m}`. The tape is analog: no number is shown to the student. `tape` (`TapeGeometry`:
`division_mm` 1, `edge_mm`, `idealReading_m`) is what the view draws on the blade; the student reads the mm graduation.
`mpe_m` is the class II tolerance 0.3 mm + 0.2 mm/m x L (MID 2014/32/EU, MI-008), reported and not applied (see
`PARAMETERS.md`). Type B uncertainty of one reading: `typeBAnalog(0.001)` = 0.29 mm. Range 0..3 m. `procedure().heightsMeasured`
has `clamp`, `twoLeg` and `separation`. Older snapshots (item `caliper`, a `caliper` state, a zero error) still load: the item becomes `tape` and the rest is ignored.

### Runs and records

`releaseCart(t_ms)` draws the run's conditions (release offset, half-normal initial velocity, c_rr; breakaway `F_breakaway_N` holds a cart that static friction would keep at rest) with `physics/variability.ts`, stores a
`RunRecord` (`conditions`, `theta_rad`, `marks[]` with the **true** crossing time of every mark in seconds from release, `tStop_s`)
and builds a 1 ms trajectory. Marks behind the start, beyond the stop or never reached have `trueTime_s: null`. The cart stops at
the receiver end stop (printed position `stopRailPos_mm`). A flat or uphill rail does not move the cart. After a run call
`resetCart()` (back to the last start) before the next release (`cartMoving` / `cartNotAtStart`). `digicartRecord(runId)`:
`t_s[]`, `x_m[]` (50 Hz, 1 mm, displacement from release) and the true mark times. A stop of the stopwatch is logged in `stopLog()`:
`{runId, markTarget, reading_s, startOffset_s, stopOffset_s, crossings}`; Table 1.1 cells keep `{value_s, runId, stopId}`.

### Events

`ApparatusEvent = { seq, t_ms | null, type, ... }`: `itemAdded, itemRemoved, attached, detached, levelPlaced, leveled, heightSet,
measuredHeight, markPlaced, markMoved, markRemoved, cartPlaced, cartReset, released,
stopwatchStart, stopwatchStop, stopwatchReset, recorded, cellCleared, tableCleared, linkStartToRelease, refused, presetApplied, loaded`.
Payloads: see `types.ts`.

### `procedure()`

Derived from state, no text: `setupComplete`, `canRun`, `scaleOk`, `levelledBeforeRaise`, `theta_rad`, `angleError_rad`, `angleOk`
(1.30 deg +- 0.05 deg), `heightsMeasured`, `marks` (`MarksEvaluation`), `marksOk`, `cart {onRail, atZero}`, `runsCount`,
`stopsCount`, `recordsPerPosition[10]`, `tableFilled`, `tableComplete`.

### Snapshot and presets

`snapshot()` is plain JSON (`version: 1`, includes the run RNG position, hidden values, runs, stops, table and event log);
`load()` restores it and the run variability continues identically. `preset('assembled')` builds a careful student's bench through the
real actions (marks A..+900 mm at 200..1100 mm, cart on A, theta within 0.005 deg of 1.30 deg); `preset('empty')` is a bare bench.
The seed fixes the hidden values; a different seed gives a different table tilt, so the foot offset of the preset changes.

# Shell layout (`src/core/shell/mountShell.ts`, `src/core/styles/layout.css`)

Five lab steps, one panel each: 1 Setup (inventory) · 2 Adjustments and height (adjust, tape measure) · 3 Timing and Table 1.1
(table, timing notes) · 4 DigiCart (tablet) · 5 Analysis. The header holds the step tracker (done checks come from the
procedure checklist through `ChecklistHooks.onProgress`); the checklist itself is a drawer bar above the panel. The step is
remembered (`src/core/persist.ts`) and `?step=1..5` deep-links to it. `?view=2d|3d` and `?cam=` choose the stage view.

* Desktop (>= 1080 px): sticky stage on the left, the active step panel on the right (scrolls on its own).
* Tablet (820 to 1079 px): stage and timing bar fill the screen, the panel is a bottom sheet (30 % / 60 %, drag or toggle).
* Phone (< 820 px): sticky stage (46 svh), step menu in the header, timing bar fixed to the bottom in step 3.
* The timing bar (`experiments/mruv/views/timingbar.ts`) is the only stopwatch UI: one LCD, mark target, start/stop, release, copy to the table.
  Global keys (`core/views/stopwatchkeys.ts`) never fire on buttons, links, checkboxes, ranges, selects or text fields.
* Statistics: the reaction-time Type B is a common systematic; it is not a per-point fit weight (see `experiments/mruv/analysis/compute.ts`).

# Multi-experiment layout

```
index.html                 landing page (src/landing): experiment picker, ?exp=<id> redirect
mruv/index.html            MRUV page; mruv/help/ its help pages
src/core/                  shared code, never imports src/experiments (tests/core/boundary.test.ts)
  physics/                 noise (mulberry32, CountedRng), roots, statistics, fit, uncertainty, constants, instruments, angles
  instruments/stopwatch.ts Stopwatch (press timestamps, StopRecord); Apparatus composes it
  views/                   dom, view contract (ViewContext<A>, MountView<A>), press, numfmt, csv, menu, theme, blade, plots
  shell/                   mountShell(config), readShellParams(), ShellConfig types
  pedagogy/                tour, coach gate and toast, checklist panel (experiment injects ids, strings, rules)
  scene3d/                 framing, menu, materials palette, shared models (rail, stands, base, level, stopwatch, tape measure)
  styles/                  tokens, app, layout, panels, pedagogy, analysis
  persist.ts, i18n.ts      storage keys (mecanica:*), migration from the old keys, Lang
src/experiments/<id>/      experiment.ts (manifest) and everything specific: physics, apparatus, analysis, views, pedagogy, styles, main.ts
src/experiments/registry.ts  manifests of all experiments (data only); drives the landing page and the Vite inputs
```

Storage: `mecanica:lang`, `mecanica:theme`, `mecanica:last` are shared; each experiment keeps
`mecanica:<id>:state|view|step|automark|tour-done`. `migrateKeys()` copies the old `digicart-*` values once and never
deletes them.

**Add an experiment in 5 steps**

1. Create `src/experiments/<id>/` with `experiment.ts` exporting the manifest (`id`, `slug`, `guide`, `title`, `summary`,
   `page`, `help`, `status`). Add it to `src/experiments/registry.ts`. Set `status: 'ready'` when the page exists (a `soon`
   entry is listed on the landing page but not built).
2. Build the model: `physics/` (pure, uses `src/core/physics`), `apparatus/` (state, events, `on(listener)`; compose
   `Stopwatch` and `CountedRng` from core) and `analysis/`.
3. Write the views as `MountView<YourApparatus>` with `{ es, en }` strings and key-parity tests; reuse the core views and
   the shared 3D models (pass your dimensions in the option objects; defaults are the MRUV values).
4. Add `<slug>/index.html` (a `#app` div and a script pointing at `src/experiments/<id>/main.ts`) and the help pages
   `<slug>/help/index.html` and `en.html`; they link back with `../index.html`.
5. In `main.ts` import the style sheets in cascade order, build the apparatus (migrate old keys with `migrateKeys` if
   there are any, restore from `createExperimentStore(id)`), and call `mountShell(config)`: store, strings, steps
   (`stepCount`, `panelStep`, `slots`), `procedure`, `timingBar`, `stage.mount2d` / `stage.load3d`, `refusalText`, `reset`,
   `save`, `tour`, `coach`, `help`, `landingUrl`. `?lang ?theme ?step ?tour ?view ?teacher` are parsed by the shell.

# Parabolic physics (`src/experiments/parabolic/physics`)

Pure model of Práctica 2 (no apparatus or views yet). Pipeline for one release:
incline (`incline.ts`) -> tip junction and roll over the gap (`junction.ts`) -> projectile flight (`flight.ts`) -> carbon mark (`marks.ts`), composed by `simulateLaunch(setup, ball, releaseS_m, run?, opts?)` in `launch.ts`.

- `constants.ts`: ball presets (`MARBLE`, `PING_PONG`, now with `mu_k`), `hollowShellInertiaFactor` (ping-pong k = 0.6535 for a 0.4 mm shell), `DEFAULT_SETUP`, Magnus `C_L(S)` (ASSUMED form); all empirical values are in PARAMETERS.md.
- `incline.ts`: theta = asin(rise / supportDist); mark positions `s_m` run along the rail from the LOW tip (upper half is s >= 0.60 m). Two-line channel: r_eff, k_eff = k_body (R/r_eff)^2. Rolling resistance acts on the sum of the line normals (m g cos theta R/r_eff). Air drag on the slope: (1 + k_eff) dv/dt = F - k_d v^2, so v^2 = (a0/kappa)(1 - exp(-2 kappa s)), kappa = k_d/(1 + k_eff); `quadraticDragMotion` gives speed and time in closed form (tanh, tan and constant-a laws; kappa = 0 is the vacuum formula).
- `junction.ts`: corner impact (normal part destroyed, Coulomb friction impulse), closed-form slip phase on the table (dv/dt = + mu_k g sgn(R omega - v); rolling after Delta t = |v_roll - v1|/(mu_k g), or the ball leaves still slipping if the slip is longer than the gap), `tableRoll` (slip then rolling with rolling resistance and drag over the rest of the gap, can stop), `leavesHorizontally` (v^2 >= gR). Exact energy loss up to rolling: 1/2 m (v sin th)^2 + m g step + 1/2 m k/(1 + k)(v cos th - R omega0)^2. `mu_k = Infinity` is the old instant-rolling model. `simulateLaunch` returns `slipDistance_m`, `rollingAtEdge`, `omega_edge_radps`; the flight gets that omega.
- `flight.ts`: RK4 (0.5 ms) with buoyancy and added mass (a = [(m - rho V) g + F_air]/(m + rho V/2)), quadratic drag and Magnus (topspin pushes down); landing by Brent on the last step; optional sampled trajectory (e.g. 240 fps); `idealFlight` closed form (vacuum run matches it to < 1e-6).
- `variability.ts`: `sampleRun(rng, ball)` returns `RunOffsets` (release, push, junction factor = 1 - sigma |N(0,1)| one-sided so scatter cannot create energy, lateral angle, mark draw). `ZERO_RUN` is the expectation; noise is injected, never `Math.random`.
- `marks.ts`: `carbonMark` (inside the paper, impact-momentum threshold, size, darkness) and `firstBounce` (animation only).

Expected values (default set-up, H = 0.76 m, air on, `mu_k` 0.30 / 0.35) and the ideal projectile (vacuum, c_rr = 0, single line, lossless corner with v_roll = v_tip). Regenerated 2026-10-23 after the slip-phase, air-on-slope and Cd changes:

| ball | s (m) | v_edge (m/s) | t (s) | x (m) | ideal v / t / x |
|---|---|---|---|---|---|
| marble | 0.60 | 1.204 | 0.3947 | 0.4730 | 1.234 / 0.3944 / 0.4867 |
| marble | 0.725 | 1.323 | 0.3947 | 0.5197 | 1.357 / 0.3944 / 0.5350 |
| marble | 0.85 | 1.432 | 0.3947 | 0.5626 | 1.469 / 0.3944 / 0.5793 |
| marble | 0.975 | 1.533 | 0.3947 | 0.6023 | 1.573 / 0.3944 / 0.6204 |
| marble | 1.10 | 1.628 | 0.3946 | 0.6395 | 1.671 / 0.3944 / 0.6590 |
| ping-pong | 0.60 | 1.088 | 0.4005 | 0.4121 | 1.136 / 0.3944 / 0.4478 |
| ping-pong | 0.725 | 1.192 | 0.4003 | 0.4512 | 1.248 / 0.3944 / 0.4923 |
| ping-pong | 0.85 | 1.287 | 0.4001 | 0.4866 | 1.352 / 0.3944 / 0.5330 |
| ping-pong | 0.975 | 1.374 | 0.3998 | 0.5191 | 1.447 / 0.3944 / 0.5709 |
| ping-pong | 1.10 | 1.455 | 0.3996 | 0.5491 | 1.537 / 0.3944 / 0.6064 |

Effect size on x at s = 0.85 m (full model: marble 0.5626 m, ping-pong 0.4866 m). Each row switches ONE effect off; dx = x(off) - x(full), so positive means the effect shortens the range:

| effect switched off | marble dx (mm) | ping-pong dx (mm) |
|---|---|---|
| rolling resistance (c_rr = 0, slope and gap) | +3.0 (0.5 %) | +7.3 (1.5 %) |
| air drag (slope, gap and flight) | +2.1 (0.4 %) | +21.2 (4.4 %) |
| Magnus (topspin) | +1.4 (0.25 %) | +15.5 (3.2 %) |
| buoyancy and added mass | -0.1 (-0.03 %) | -4.0 (-0.8 %) |
| all air terms (vacuum) | +3.4 (0.6 %) | +33.2 (6.8 %) |
| slip phase (mu_k = Infinity, instant rolling) | -0.1 | 0.0 |
| impact friction (`impactFriction: false`, more slip on the table) | -2.7 | +0.3 |
| channel (single line, w = 0) | +3.7 (0.7 %) | 0.0 |

Reading: for the marble the corner/slip and the air each move x by a few mm; for the ping-pong ball air (drag + Magnus) is 7 % of x, buoyancy and added mass work the other way. The ping-pong flight time is ~1.5 % longer than the ideal 0.394 s (drag and buoyancy outweigh the Magnus pull-down). At s = 1.10 m air cuts v_tip by 2.7 % (ping-pong) and 0.24 % (marble). With the default `mu_k` the marble slips 1.4-2.5 cm (rolling before the edge); without the impact friction impulse it slips 4-5 cm and at s = 1.10 m leaves the table still slipping. All of these depend on assumed coefficients (PARAMETERS.md).
