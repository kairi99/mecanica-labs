# DigiCart MRUV virtual lab (EPN, Práctica 1 · Movimiento Rectilíneo Uniformemente Variado)

Browser-based, physics-driven, **educational** simulation of the Newtonian-mechanics lab "Práctica 1: MRUV" of the
Escuela Politécnica Nacional (Quito): a PHYWE DigiCart rolling down an inclined metal rail at 1.30°. The student
**assembles the setup from an inventory**, releases the cart, times it with a **virtual stopwatch driven by the
student's own presses**, measures the stand height with a **virtual caliper** (analog vernier and digital), fills
Table 1.1 and does the guide's analysis tasks. Public and **open source** (MIT code, CC BY 4.0 content). Spanish first.
Not affiliated with EPN or PHYWE.

Source documents live in `refs/` (gitignored, copyrighted). Use the `mruv-reference` skill instead of the PDF/photos.

## Commands

```bash
npm install
npm run dev      # Vite dev server
npm test         # Vitest (tests/**/*.test.ts)
npm run build    # tsc && vite build -> dist/
npm run teacher-key  # will regenerate docs/teacher-key.md from the model (placeholder for now)
```

## Non-negotiable invariants

1. **Pure physics.** `src/physics` is pure and DOM-free (no `document`, `window`, `localStorage`, timers, `Math.random`).
2. **SI units with the unit in the name:** `x_m`, `t_s`, `v_mps`, `a_mps2`, `theta_rad`, `h_m`, `m_kg`. Convert only
   locally inside a function (cm to m, deg to rad), never across an API.
3. **Views render state and never compute physics.** Physics lives in `src/physics`, device logic in `src/apparatus`.
4. **Expectation is not noise.** Model functions return the deterministic expected value. Run variability (release
   offset, initial velocity, friction scatter) lives in `variability.ts`; human timing (reaction, resolution) is a
   separate final step. Both use an injected RNG (`mulberry32`).
5. **Honest model.** Every empirical parameter is in `PARAMETERS.md` with value, unit, source or ASSUMED, and date.
   Never tune a parameter to hide a physical discrepancy. If the data are not an ideal MRUV, say so.
6. **i18n:** Spanish default (`es` first), English second, `?lang=` override and localStorage. Never hard-code
   user-facing text in views; use `src/i18n.ts`.
7. **Mobile first:** must work at 360 px width, touch targets >= 44 px, light and dark themes.

## Design of the experience

- No invented tasks: the guide's assembly, procedure (10 timings at each 10 cm mark, 0 to 90 cm) and analysis tasks
  1 to 10 are the spine. Extra help may explain, never replace them.
- Inventory assembly: rail, DigiCart, stands (rack-and-pinion and two-leg), base, screws, level, receiver with pulley,
  stopwatch. Wrong choices are possible and physically meaningful (angle not 1.30°, AB too short, cart off the track).
- Stopwatch: the student presses start/stop; the app only adds the true event times from the model plus human
  reaction and the display resolution.
- Calipers and rail scale: readings are quantised and carry Type B uncertainty (convention in `statistics.ts`).
- DigiCart reference data (mass, wheels) are ASSUMED unless a reliable PHYWE value is found; label them so.

## Style

- Code, comments, commit messages and docs: English. UI strings through the i18n dictionary (Spanish first).
- Visual design: elegant, calm, Apple-like, one accent colour, yet a real instrument. See `.claude/rules/design-system.md`.
- Open-source hygiene: `.claude/rules/open-source.md` (never commit the EPN guide or PHYWE photos).

## Project Claude config

Rules (`.claude/rules/`): `design-system`, `physics-model`, `open-source`.

Skills (`.claude/skills/`):
- `mruv-reference`: paraphrased facts from the guide (objectives, materials, assembly, procedure, tasks, equipment look).

Agents (`.claude/agents/`, read-only reviewers; call them after meaningful changes in their area):
`physics-reviewer`, `pedagogy-reviewer`, `design-reviewer`.

## Model roles

The main Opus session reviews, analyzes, plans, orchestrates and reasons. Building, coding, fixing and implementing go
to subagents dispatched with `model: "sonnet"`. Give each a self-contained brief: the goal, the files involved, the
invariants above that apply, and how to verify (which tests to run, `npm run build`). Review its diff before accepting
it. Small edits (typo, one-line fix, docs or config tweak) Opus makes directly. The read-only reviewers stay on Opus.
