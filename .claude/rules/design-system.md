---
paths:
  - "src/views/**"
  - "src/styles/**"
  - "src/pedagogy/**"
  - "src/main.ts"
  - "index.html"
---

# UI design rules

- **Feel:** elegant, simple, calm, Apple-like. Also precise: a lab instrument, not a toy.
- Use only the design tokens (CSS custom properties) from `src/styles/tokens.css`. No ad-hoc colours, font sizes,
  radii, shadows or durations.
- One accent colour. Colour never carries meaning alone: add a label, marker shape or text (for example the data
  series for position, velocity and acceleration, and the pass/fail state of a check).
- Motion only when it carries meaning (the cart rolling, stopwatch digits, a point appearing on the chart). Ease-out,
  150 to 350 ms for UI. Always honour `prefers-reduced-motion`.
- Light and dark themes both work: `prefers-color-scheme` plus the manual toggle. The 3D stage may stay dark in both.
- Mobile first: works at 360 px width, touch targets >= 44 px, no hover-only affordances. Canvas is sized with
  `devicePixelRatio`.
- Accessibility: WCAG AA contrast, full keyboard operation (assembly, stopwatch, tape measure), ARIA labels from the i18n
  dictionary, never colour alone.
- All user-facing text comes from the i18n dictionary (es default, en).
- Views render state; they do not compute physics.
- After a visible change, ask the `design-reviewer` agent for a critique at 390 / 820 / 1440 px.
