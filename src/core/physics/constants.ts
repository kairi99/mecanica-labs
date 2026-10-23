// Physical constants and site parameters for the lab in Quito. Pure, DOM-free. Unit in the name.

/** Equatorial gravity, m/s^2: coefficient of the 1980 International Gravity Formula series (Moritz 1980, GRS80). */
export const G_EQUATOR_mps2 = 9.780327
/** Free-air gradient of gravity, m/s^2 per metre of altitude (standard value, -3.086e-6 s^-2). */
export const FREE_AIR_GRADIENT_s2 = 3.086e-6

/** Latitude of Quito (EPN), degrees. Approximate, -0.21 deg (0.21 S). Sourced from public coordinates; not surveyed. */
export const QUITO_LATITUDE_deg = -0.21
/** Altitude of Quito (EPN), m above sea level. Approximate (~2800 m). */
export const QUITO_ALTITUDE_m = 2800

/**
 * Normal gravity at sea level for a geodetic latitude, m/s^2, from the 1980 International Gravity Formula series
 * g0 = 9.780327 (1 + 0.0053024 sin^2 phi - 0.0000058 sin^2 2phi). This is the series form, not the WGS84 Somigliana
 * closed form; the two agree to ~1e-6 m/s^2 at Quito's latitude.
 */
export function gravitySeaLevel_mps2(latitude_deg: number): number {
  const phi_rad = (latitude_deg * Math.PI) / 180
  const s1 = Math.sin(phi_rad)
  const s2 = Math.sin(2 * phi_rad)
  return G_EQUATOR_mps2 * (1 + 0.0053024 * s1 * s1 - 0.0000058 * s2 * s2)
}

/**
 * Gravity at altitude, m/s^2: sea-level normal gravity minus the free-air correction 3.086e-6 * h.
 * No Bouguer (plateau mass) or local anomaly term: real local gravity can differ by a few 1e-3 m/s^2.
 */
export function gravity_mps2(latitude_deg: number, altitude_m: number): number {
  return gravitySeaLevel_mps2(latitude_deg) - FREE_AIR_GRADIENT_s2 * altitude_m
}

/** g in Quito, m/s^2 (about 9.7717). */
export const G_QUITO_mps2 = gravity_mps2(QUITO_LATITUDE_deg, QUITO_ALTITUDE_m)

/** Specific gas constant of dry air, J/(kg K). */
export const R_AIR_JpkgK = 287.05

/**
 * Air density, kg/m^3, from the ISA barometric formula p = 101325 (1 - 2.25577e-5 h)^5.25588 Pa and the ideal gas
 * law with a chosen air temperature (dry air, no humidity correction).
 */
export function airDensity_kgpm3(altitude_m: number, temperature_K: number): number {
  const p_Pa = 101325 * (1 - 2.25577e-5 * altitude_m) ** 5.25588
  return p_Pa / (R_AIR_JpkgK * temperature_K)
}

/** ASSUMED. Room temperature in the lab, K (15 C): a cool Quito room. */
export const LAB_TEMPERATURE_K = 288.15
/** Air density in the Quito lab, kg/m^3 (about 0.87). */
export const RHO_AIR_QUITO_kgpm3 = airDensity_kgpm3(QUITO_ALTITUDE_m, LAB_TEMPERATURE_K)
