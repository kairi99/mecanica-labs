# Drag-and-drop assembly (shared core, per-experiment adapter)

The student arranges the setup by dragging parts. Every material starts **loose on the table** (the `loose` preset); a **tray** under
the stage only holds parts the student took off the table. MRUV is the reference implementation; parabolic, newton2 and friction
follow this page. No rules live in the views: a drop calls the same Apparatus methods the inventory buttons call, and the Apparatus
refuses with a reason when the order is wrong.

## What is in core (do not copy it, import it)

| File | Exports |
| --- | --- |
| `src/core/dragdrop/snap.ts` (pure, tested) | `Zone` (id, kind `area`/`point`/`band`, cx/cy/cz, hx/hz, snap_cm, priority, ready, tilt_rad), `Probe`, `ZoneTarget`, `distanceToZone`, `nearestZone`, `resolveDrop` |
| `src/core/dragdrop/controller.ts` | `createDragDrop(deps)`, `DragDropModel` (what the experiment supplies), `StageAdapter` (what each stage supplies), `DropOutcome`, `DragSource` |
| `src/core/dragdrop/strings.ts` | generic es/en strings: tray, hint, empty state, aria labels, "Colocar en / Place at", "Elegir una pieza de la mesa (n)", status line, `disclosure` ("Montar con botones") |
| `src/core/scene3d/dragdrop3d.ts` | `createDragLayer(deps)`: zone rings/bands/outline with DOM labels, preview block, `probe` (pointer to plane), shared raycaster |
| `src/core/styles/dragdrop.css` | tray, chip, zone buttons, 3D labels, 2D zone classes (`.s2d-zone*`, `.s2d-part`), `.inv-manual` (folded buttons). Import it in `main.ts`. |

The controller gives: tray strip with a compact empty state, floating chip, pick-then-place (click a part, then a highlighted spot or a
button in the "Place at" list), keyboard flow (Enter picks, arrows move through the list, Esc cancels), the "Pick a part on the table (n)"
list for parts already on the bench, touch rules (a vertical gesture starts a tray drag, a horizontal one scrolls the strip; a part on
the table needs a 240 ms hold, a quick swipe still orbits the camera), a live region, and fly-back animation when a drop is refused.

## Units and frames

Zones are in **scene centimetres** on horizontal planes, in whatever frame the experiment's 3D scene and 2D view share (MRUV: x
down-slope, y up, z toward the viewer). Core never converts physics units. 2D side views pass `z_cm: null` in the probe (depth ignored).

## Steps to adopt it in an experiment

1. **Apparatus**: add a `'loose'` preset: every item on the table (`items` all true), nothing attached or placed, no run. Fresh state and
   "Start over" use it; `?preset=empty|assembled|loose` keep working (MRUV: `apparatus/apparatus.ts` `preset()`, `main.ts` `createApp()` and `reset()`).
   Needed methods: `addItem`, `removeItem`, `hasItem`, plus one call per joint or placement. The parts that cannot be lifted
   again (a clamped rail) are excluded by `benchDraggable`.
2. **Zones** (`views/dragdrop/snap.ts`, pure, tested in `tests/<id>/dragdrop.test.ts`): `type Zone = CoreZone & { id: YourZoneId; action: YourAction }`.
   `zonesFor(part, state)` returns the table (`kind: 'area'`, `snap_cm: 0`, `priority: 0`, always `ready`) plus the spots the part belongs to
   (`kind: 'point'` with `snap_cm`, or `'band'` along a rail with `tilt_rad`). Set `ready` from the Apparatus rules, but still return
   not-ready zones: the refusal teaches. If the target needs extra fields (MRUV: position on the printed scale), write `resolveDrop`
   with core `nearestZone` and decorate its hit, and pass it as `model.resolve`.
3. **Drop sequencing** (`views/dragdrop/drop.ts`): `executeDrop(app, part, source, target)`. From the tray: `addItem` first, then the
   zone's call, and `removeItem` again if the call is refused. From the bench onto the table: undo the joint (`detach`). From the bench onto
   the tray: `removeItem`. Return the Apparatus `Result`; the adapter maps a failure to text with the experiment's `reasonText`.
4. **Model + controller** (`views/dragdrop/controller.ts`, ~40 lines): build a `DragDropModel` (`parts` in guide order, `name`, `icon`, `onBench`,
   `benchDraggable`, `zonesFor`, `zoneLabel`, `defaultTarget` for keyboard/button choice, `executeDrop` returning
   `{ ok: true, added?, removed? } | { ok: false, message }`, `changes: apparatus`) and call core `createDragDrop({ model, lang, reducedMotion, changed, stage, mount })`.
   Mount the tray **under the stage** (`mount` = the stage wrapper, which gets class `has-tray`). Item icons: one 24 px line icon per
   part (`views/itemIcons.ts`, class `icon inv-icon`).
5. **3D stage** (`views/scene3d/dragdrop3d.ts`): `createDragLayer({ scene, container, canvas, camera, M, lang, reducedMotion, requestRender, zoneLabel })`
   then add: preview size per part (`DIMS`) and where the block sits when snapped, `pickBenchPart` (raycast the scene's pickables, map mesh ids to parts, return null for
   handles that adjust a mounted part), `lift(part)` (hide the bench copy while carried), `lockCamera`, `refuse`, `placed`. Call `layer.tick(now)`
   from the render loop (returns true while it animates) and `layer.relabel()` on language change. Hand the controller `busy`, `overTray`, `removeFromTray` so the
   scene's own pointer handlers (orbit, cart handle) stay out while a part is carried (MRUV: `scene3d/index.ts`, `scene.ts` `dd` option, `interaction.ts`).
6. **2D stage** (optional, MRUV `views/side2d.ts`): tag draggable SVG parts with `data-part` and class `s2d-part`; implement `StageAdapter`
   with a probe returning `{ x_cm, z_cm: null }`, and draw zones with `.s2d-zone` (`.ready`, `.early`, `.on`).
7. **Strings**: zone names and the inventory intro in `views/strings/dragdrop.ts` (es first, same keys in en, `Record<ZoneId, string>`); the
   generic ones come from core. The 3D labels and the "Place at" buttons both use `zoneLabel`.
8. **Keep the button path**: the inventory's buttons go in a collapsed `<details class="inv-manual">` whose summary is
   `core/dragdrop/strings.ts` `disclosure` (WCAG 2.5.7: every drag has a non-dragging equivalent). The intro line says the parts are loose and
   can be dragged (MRUV `views/inventory.ts`).
9. **Remove the old "put the materials on the table" step**: from the checklist, the tour (`pedagogy/strings/tour.ts`, `pedagogy/*`),
   the inventory suggestions and the help page wording. The first step is now arranging the setup by dragging.
10. **Tests**: `tests/<id>/dragdrop.test.ts` for the zones (offered per part, ready flags, default targets accepted by the Apparatus) and
   `executeDrop` (order, refusals, sequencing). Generic snap behaviour is already covered in `tests/core/dragdrop.test.ts`.

Design tokens only in CSS; touch targets >= 44 px (`--touch`); keep Spanish first.

## MRUV worked example

- Pure: `src/experiments/mruv/views/dragdrop/snap.ts` (zones, `defaultTarget`, `nominalPose`, rail position mapping), `drop.ts` (`executeDrop`).
- Adapter: `views/dragdrop/controller.ts` (model + `createDragDrop`), `views/itemIcons.ts`, `views/strings/dragdrop.ts`.
- 3D: `views/scene3d/dragdrop3d.ts` (on top of the core layer), glue in `scene3d/index.ts`, `scene.ts`, `interaction.ts`.
- 2D: `views/side2d.ts`. Inventory: `views/inventory.ts`. Preset and start: `apparatus/apparatus.ts`, `main.ts`.
- Tests: `tests/mruv/dragdrop.test.ts`, `tests/core/dragdrop.test.ts`.
