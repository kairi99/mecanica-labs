---
paths:
  - "src/core/physics/**"
  - "src/core/instruments/**"
  - "src/experiments/*/physics/**"
  - "src/experiments/*/apparatus/**"
  - "tests/**"
  - "PARAMETERS.md"
---

# Physics model rules

- `src/core/physics` and `src/experiments/*/physics` are pure and DOM-free: no DOM, storage, timers or hidden randomness. Functions take and return numbers
  or plain data.
- SI units with the unit in the name (`x_m`, `t_s`, `v_mps`, `a_mps2`, `theta_rad`, `h_m`, `m_kg`). State units in the
  doc comment when a name cannot carry them. Convert cm and degrees only locally inside a function.
- Every function's doc comment cites where its physics comes from: the guide's task, a kinematics or rigid-body
  result, the GUM or Taylor. Facts from the guide come from the `mruv-reference` skill.
- Model functions return the deterministic expectation. Variability and human timing are separate steps with an
  injected RNG (no `Math.random`, no global seeds).
- Every empirical parameter (mass, wheel inertia, rolling resistance, bearing drag, drag coefficient, variability
  sigmas, instrument resolutions) is a named constant with a row in `PARAMETERS.md`: value, unit, source or ASSUMED,
  date. Never tune one to hide a physical discrepancy.
- Handle edge cases explicitly: slope too small for the cart to start (static friction), release offset, initial
  velocity, mark behind the start, cart that never reaches a mark, two data points for a three-parameter fit.
- Do not teach that the fitted acceleration must equal g sin(theta): rolling inertia and friction lower it, and say so.
- Uncertainty follows the GUM: Type A s/sqrt(n), Type B from resolution/sqrt(12), combined in quadrature. Times are
  the noisy variable, so position-time fits use the effective-variance method.
- Tests assert physics (frictionless limit, energy balance, closed form vs RK4, fit coverage near 68 %), not snapshot
  numbers. Give tolerances and justify them. Name each test for the physics it checks.
