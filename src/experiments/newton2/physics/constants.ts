// Parts and bench values of the force-acceleration set-up. Every number is ASSUMED (PARAMETERS.md, section Practica 3)
// unless noted. Unit in the name. Not PHYWE specifications.

/** Nominal mass of one of the four silver masses, kg (guide: 10 g). */
export const MASS_NOMINAL_kg = 0.01
export const MASS_COUNT = 4
/** Hidden manufacturing tolerance of each mass: actual = nominal + uniform(+-tol), kg. ASSUMED. */
export const MASS_TOLERANCE_kg = 0.0001
/** Film canister with its lid, kg, and its hidden per-bench tolerance (uniform +-). ASSUMED. */
export const CANISTER_kg = 0.0095
export const CANISTER_TOLERANCE_kg = 0.0003
/** Brass screw that fixes the string to the cart, kg. ASSUMED. */
export const BRASS_SCREW_kg = 0.005
/** One plastic screw that fixes a mass to the cart, kg, and how many the kit has (guide: 5). ASSUMED mass. */
export const PLASTIC_SCREW_kg = 0.0008
export const PLASTIC_SCREW_COUNT = 5
/** Linear density of the string, kg/m (a thin thread): its inertia and the weight of the hanging part are both counted. ASSUMED. */
export const STRING_LINEAR_DENSITY_kgpm = 0.0002

/** Pulley of the receiver: mass, radius, inertia factor (0.5 = solid disc) and the friction force at its axle. ASSUMED. */
export const PULLEY_MASS_kg = 0.004
export const PULLEY_RADIUS_m = 0.0125
export const PULLEY_INERTIA_FACTOR = 0.5
export const PULLEY_FRICTION_N = 0.001

/** Height of the laboratory bench top above the floor, m. ASSUMED (typical 0.90 to 0.95 m; Practica 2 uses a 0.76 m table). */
export const BENCH_HEIGHT_m = 0.92
/** Height of the rail top above the bench top at a support with its screw at 0, m. ASSUMED (as Practica 1 RACK_BASE_HEIGHT_m). */
export const SUPPORT_BASE_HEIGHT_m = 0.06
/** Height of the string above the rail top surface (the brass screw on the cart), m. ASSUMED. */
export const STRING_ABOVE_RAIL_m = 0.03
/** Distance from the canister bottom up to the string knot on the lid (canister 51 mm + loop), m. ASSUMED. */
export const CANISTER_HANG_m = 0.06
/** Distance from the receiver stop face (cart front stops there) to the string contact on the pulley, m. ASSUMED. */
export const PULLEY_AHEAD_OF_STOP_m = 0.015
/** Shortest hanging string below the pulley at the release, m: the knot cannot sit in the pulley groove. ASSUMED. */
export const MIN_HANG_m = 0.015

// ---- Falling cart (receiver not fitted) -------------------------------------------------------------------------------------
/** Sag of the rail's free end below the clamp level when the receiver is not holding it, m. ASSUMED: a 1.2 m rail clamped at one end droops under its own weight and the cart's. */
export const RAIL_FREE_END_SAG_m = 0.03
/** Height of the cart's centre of mass above the rail top, m. ASSUMED. */
export const CART_COM_ABOVE_RAIL_m = 0.025
/** Coefficient of restitution of the cart on the floor (vertical speed kept after an impact). ASSUMED. */
export const FLOOR_RESTITUTION = 0.25
/** Kinetic friction coefficient of the cart sliding on the floor after it lands. ASSUMED. */
export const FLOOR_FRICTION_COEFF = 0.35
/** Bounces whose take-off speed is below this stop (the cart lies on the floor), m/s. Numerical. */
export const BOUNCE_MIN_mps = 0.05
