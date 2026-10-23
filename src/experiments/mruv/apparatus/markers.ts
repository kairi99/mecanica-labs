// Evaluation of the student's tape marks against the guide (marks every 10 cm from A at the top, AB >= 90 cm).
import {
  MARK_AB_MIN_mm, MARK_COUNT_EXPECTED, MARK_SPACING_mm, MARK_TOLERANCE_mm,
} from './constants.ts'

export interface MarksEvaluation {
  count: number
  /** Positions (printed-scale mm) ordered from the top of the slope; the first one is A. */
  orderedRailPos_mm: number[]
  /** Printed-scale position of A (the highest mark), or null. */
  aRailPos_mm: number | null
  /** Distance of each ordered mark from A, mm. */
  fromA_mm: number[]
  /** Consecutive spacings, mm. */
  spacings_mm: number[]
  /** Largest |spacing - 100 mm|, or null with fewer than 2 marks. */
  maxSpacingError_mm: number | null
  spacingOk: boolean
  /** Distance from A to the lowest mark, mm. */
  ab_mm: number
  /** AB >= 90 cm (within tolerance). */
  abOk: boolean
  /** For each of the 10 table positions (0..90 cm): a mark exists within tolerance of A + 100 i mm. */
  matched: boolean[]
  allPositionsMatched: boolean
  ok: boolean
}

/** Evaluate marks (printed-scale mm). `scaleZeroAtHighEnd` decides which direction is "down the slope". */
export function evaluateMarks(railPos_mm: readonly number[], scaleZeroAtHighEnd: boolean): MarksEvaluation {
  const ordered = [...railPos_mm].sort((a, b) => (scaleZeroAtHighEnd ? a - b : b - a))
  const a = ordered.length > 0 ? ordered[0]! : null
  const fromA = ordered.map((p) => Math.abs(p - (a as number)))
  const spacings = fromA.slice(1).map((v, i) => v - fromA[i]!)
  const maxErr = spacings.length > 0 ? Math.max(...spacings.map((s) => Math.abs(s - MARK_SPACING_mm))) : null
  const matched = Array.from({ length: MARK_COUNT_EXPECTED }, (_, i) =>
    a !== null && fromA.some((f) => Math.abs(f - i * MARK_SPACING_mm) <= MARK_TOLERANCE_mm))
  const ab = fromA.length > 0 ? fromA[fromA.length - 1]! : 0
  const spacingOk = maxErr !== null && maxErr <= MARK_TOLERANCE_mm
  const allMatched = matched.every(Boolean)
  return {
    count: ordered.length, orderedRailPos_mm: ordered, aRailPos_mm: a, fromA_mm: fromA, spacings_mm: spacings,
    maxSpacingError_mm: maxErr, spacingOk, ab_mm: ab, abOk: ab >= MARK_AB_MIN_mm - MARK_TOLERANCE_mm,
    matched, allPositionsMatched: allMatched, ok: allMatched && spacingOk,
  }
}
