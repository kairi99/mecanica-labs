// Mass bookkeeping of the parts: hidden actual masses and where each 10 g mass sits. Pure.
// Real effect kept on purpose: every mass moved to the cart needs a plastic screw, so Mt grows by one screw per move.
import {
  BRASS_SCREW_kg, CANISTER_TOLERANCE_kg, CANISTER_kg, MASS_COUNT, MASS_NOMINAL_kg, MASS_TOLERANCE_kg, PLASTIC_SCREW_COUNT, PLASTIC_SCREW_kg,
} from './constants.ts'

/** Hidden actual masses of one bench (kg). */
export interface PartMasses {
  masses_kg: number[]
  canister_kg: number
  brassScrew_kg: number
  plasticScrew_kg: number
}

/** Draw the hidden actual masses: nominal + uniform tolerance (injected RNG). Tolerances ASSUMED (PARAMETERS.md). */
export function drawPartMasses(rng: () => number): PartMasses {
  const u = (tol: number): number => (rng() * 2 - 1) * tol
  return {
    masses_kg: Array.from({ length: MASS_COUNT }, () => MASS_NOMINAL_kg + u(MASS_TOLERANCE_kg)),
    canister_kg: CANISTER_kg + u(CANISTER_TOLERANCE_kg),
    brassScrew_kg: BRASS_SCREW_kg,
    plasticScrew_kg: PLASTIC_SCREW_kg,
  }
}
/** Nominal masses (no tolerance): for tests and the expectation. */
export const NOMINAL_PARTS: PartMasses = {
  masses_kg: Array.from({ length: MASS_COUNT }, () => MASS_NOMINAL_kg),
  canister_kg: CANISTER_kg, brassScrew_kg: BRASS_SCREW_kg, plasticScrew_kg: PLASTIC_SCREW_kg,
}

export type MassLocation = 'canister' | 'cart' | 'bench'

export interface Loading {
  /** Canister with lid and the masses in it, kg. */
  mHang_kg: number
  /** Brass screw (if the string is fixed with it), plastic screws and masses on the cart, kg. */
  mCartLoad_kg: number
  /** Masses left on the bench (taken out of the system), kg. */
  mLeftOut_kg: number
  /** Plastic screws used (one per mass on the cart). */
  plasticUsed: number
}

/**
 * Split the masses between canister, cart and bench. One plastic screw per mass on the cart (at most
 * PLASTIC_SCREW_COUNT); `brassOnCart` adds the brass screw to the cart load.
 */
export function loading(parts: PartMasses, locations: readonly MassLocation[], brassOnCart: boolean, canisterOnString = true): Loading {
  let hang = canisterOnString ? parts.canister_kg : 0
  let load = brassOnCart ? parts.brassScrew_kg : 0
  let left = 0
  let screws = 0
  locations.forEach((loc, i) => {
    const m = parts.masses_kg[i]!
    if (loc === 'canister') hang += m
    else if (loc === 'cart') {
      load += m
      screws = Math.min(PLASTIC_SCREW_COUNT, screws + 1)
    } else left += m
  })
  load += screws * parts.plasticScrew_kg
  return { mHang_kg: hang, mCartLoad_kg: load, mLeftOut_kg: left, plasticUsed: screws }
}
