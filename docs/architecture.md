# Architecture: apparatus layer (`src/apparatus`)

Device logic between the pure physics (`src/physics`) and the views (3D scene, 2D panels). It owns **state**, **actions**
and **events**. Views render this state and call these actions; they never compute physics. No DOM, no timers, no
`Math.random`. Time is passed in by the caller (ms timestamps, for example `event.timeStamp` or `performance.now()`), so
tests are deterministic. Randomness is the injected `mulberry32` (seed from the constructor, later from the URL).

```ts
import { Apparatus, createApparatus } from './apparatus/index.ts'
const lab = createApparatus('assembled', { seed: 42 })   // or new Apparatus({ seed }) then lab.preset('empty')
```

Every action returns `Result`: `{ ok: true, ...data }` or `{ ok: false, reason: Reason, item?: ItemId }`. `reason` and
all enums are ids; the views translate them through `src/i18n.ts`. Every refusal also emits a `refused` event.

## Units and conventions

* SI with the unit in the name (`x_m`, `t_s`, `v_mps`, `theta_rad`, `*_ms` for caller timestamps). Exceptions carried by
  the name: `*_mm` for the rail scale, rack reading, foot and caliper-friendly quantities; `*_cm` for the table positions.
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
| Caliper | `setCaliperVariant`, `setCaliperJaws(closed)`, `caliperZero()`, `caliperClosedDisplay_m()`, `caliperMeasure(target)` |
| Markers | `placeMarker(pos)`, `moveMarker(id, pos)`, `removeMarker(id)`, `clearMarkers()`, `getMarkers()`, `evaluateMarks()` |
| Cart | `placeCart(frontPos_mm)`, `resetCart()`, `releaseCart(t_ms)`, `cartState(t_ms)`, `cartPose(t_ms)`, `getRuns()`, `getRun(id)` |
| Stopwatch | `stopwatchStartStop(t_ms, { markTarget? })`, `stopwatchReset()`, `stopwatchDisplay_s(t_ms)`, `setLinkStartToRelease(on)`, `stopLog()` |
| Table 1.1 | `tableSet(row, col, input)`, `tableCopyDisplay(row, col, t_ms)`, `tableClearCell`, `tableClear()`, `tableData()` |
| DigiCart | `digicartRecord(runId)` |
| Procedure | `procedure()` |
| Persistence | `snapshot()`, `load(snapshot)`, `reset()`, `preset('empty' \| 'assembled')`, `hiddenTruth()` (teacher/tests only) |

Free helpers (pure): `railPose`, `railPointAt`, `downSlope_m`, `railPos_mm`, `bubbleOffset_mm`, `vernierGeometry`, `evaluateMarks`,
`parseTimeInput`, `buildTrajectory`, `digicartSamples`; constants in `constants.ts`.

### Items, joints, attachment points

Items: `rail, cart, rackStand, standBase, twoLegStand, receiver, screws, level, stopwatch, caliper, markers`.
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
`level.placement`, `caliper {variant, jawsClosed, zeroed}`, `markers [{id, railPos_mm}]`, `cart {placed, startRailPos_mm,
released, runId}`, `stopwatch {running, linkStartToRelease}`, `geometry` (`RailGeometry` or `null` until the clamp is
fastened: `supportedBothEnds`, `scaleZeroAtHighEnd`, `clampHeight_m`, `twoLegHeight_m`, `railAngle_rad`, `theta_rad`, `pose`).
Time-dependent values come from methods that take `t_ms`: `cartState(t_ms)` (`phase` `unplaced | atStart | rolling |
stopped | stuck`, `frontRailPos_mm`, `rearRailPos_mm`, `s_m`, `v_mps`, `t_s`, `runId`), `stopwatchDisplay_s(t_ms)`.
The views redraw on `on(listener)` events and per frame with their own clock for the cart and the stopwatch.

The hidden table tilt and the digital zero error exist only inside; `hiddenTruth()` reveals them for teacher mode and tests.

### Level, heights, angle

`levelReading()`: `bubble_mm` is +positive toward the top of the slope; 2 mm per 0.1 deg, saturating at 6 mm. On the rail
it shows the true incline, on the table only the table tilt. The intended workflow: level the rail with the foot while the
rack reads 0 mm (sets the `leveled` event and `procedure().levelledBeforeRaise`), then raise the rack (about 25 mm) and
trim with the foot. `sin(theta_rail) = (h_clamp - h_twoLeg) / d`, `theta = theta_rail + tableTilt` (`physics/incline.ts`).

### Caliper

`caliperMeasure(target)`; targets: `{kind:'railHeight', at:'clamp' | 'twoLeg' | {railPos_mm}}`, `{kind:'cartLength'}`,
`{kind:'frontReferenceOffset'}`. Returns `reading {variant, trueLength_m, display_m, vernier}`. Vernier: `display_m` is null;
draw `vernier` (`mainScaleReading_mm`, `coincidentDivision` of 20, `leastCount_mm` 0.05) and let the student read. Digital:
`display_m = quantize(true + zeroError unless zeroed, 0.01 mm)`; `setCaliperJaws(true)` then `caliperZero()`. Range 0..150 mm
(`outOfRange`; a rack above 90 mm leaves it).

### Runs and records

`releaseCart(t_ms)` draws the run's conditions (release offset, initial velocity, c_rr) with `physics/variability.ts`, stores a
`RunRecord` (`conditions`, `theta_rad`, `marks[]` with the **true** crossing time of every mark in seconds from release, `tStop_s`)
and builds a 1 ms trajectory. Marks behind the start, beyond the stop or never reached have `trueTime_s: null`. The cart stops at
the receiver end stop (printed position `stopRailPos_mm`). A flat or uphill rail does not move the cart. After a run call
`resetCart()` (back to the last start) before the next release (`cartMoving` / `cartNotAtStart`). `digicartRecord(runId)`:
`t_s[]`, `x_m[]` (50 Hz, 1 mm, displacement from release) and the true mark times. A stop of the stopwatch is logged in `stopLog()`:
`{runId, markTarget, reading_s, startOffset_s, stopOffset_s, crossings}`; Table 1.1 cells keep `{value_s, runId, stopId}`.

### Events

`ApparatusEvent = { seq, t_ms | null, type, ... }`: `itemAdded, itemRemoved, attached, detached, levelPlaced, leveled, heightSet,
caliperVariant, caliperJaws, caliperZeroed, measuredHeight, markPlaced, markMoved, markRemoved, cartPlaced, cartReset, released,
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
