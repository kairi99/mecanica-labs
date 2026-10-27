// Pure geometry of the level rail, the string and the floor. SI units, unit in the name.
import { CANISTER_HANG_m, PULLEY_AHEAD_OF_STOP_m, STRING_ABOVE_RAIL_m } from './constants.ts'

/**
 * Tilt of the rail, rad, from the support heights (above the bench) at the stand end and the receiver end and their
 * separation d along the rail: sin(tilt) = (h_stand - h_receiver)/d, plus the hidden bench tilt. Positive: the rail
 * slopes down toward the receiver, so the weight of the cart helps the canister.
 */
export function railTilt_rad(hStand_m: number, hReceiver_m: number, d_m: number, benchTilt_rad = 0): number {
  if (!(d_m > 0)) throw new Error('railTilt_rad needs d_m > 0')
  const r = (hStand_m - hReceiver_m) / d_m
  if (Math.abs(r) > 1) throw new Error('railTilt_rad: height difference exceeds the separation')
  return Math.asin(r) + benchTilt_rad
}

/** Distance from the brass screw on the cart (at the start) to the string contact on the pulley, m. */
export const stringRun_m = (sReceiver_m: number): number => sReceiver_m + PULLEY_AHEAD_OF_STOP_m

/** Hanging length of string below the pulley at the release, m (negative: the string does not reach the pulley). */
export const hangAtRelease_m = (stringLength_m: number, sReceiver_m: number): number => stringLength_m - stringRun_m(sReceiver_m)

/** Height of the string above the floor at the pulley, m. */
export const stringHeight_m = (benchHeight_m: number, receiverRailTop_m: number): number =>
  benchHeight_m + receiverRailTop_m + STRING_ABOVE_RAIL_m

/**
 * Cart travel, m, at which the canister bottom reaches the floor: the canister falls as far as the cart travels, so
 * s_floor = h_string - canister hang - hanging length at the release.
 */
export function floorTravel_m(stringHeight: number, hang0_m: number): number {
  return stringHeight - CANISTER_HANG_m - hang0_m
}
