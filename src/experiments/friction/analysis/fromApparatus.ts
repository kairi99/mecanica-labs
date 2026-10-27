// Bridge between the apparatus tables and the pure analysis: what the student wrote in Tablas 4.1 to 4.3 becomes the analysis input.
import { SPRING_SCALES } from '../../../core/instruments/springScale.ts'
import type { FrictionApparatus } from '../apparatus/apparatus.ts'
import type { ForceCell } from '../apparatus/types.ts'
import { DEFAULT_DIVISION_N, fullAnalysis, type ForceRowInput, type FrictionAnalysis, type FrictionAnalysisInput, type InclineOptions } from './compute.ts'

/** Division of the scale the copied cells came from (the coarsest in the row); typed cells assume the 1 N scale. */
function rowOf(cells: readonly ForceCell[]): ForceRowInput {
  let div = 0
  for (const c of cells) div = Math.max(div, c.setup ? SPRING_SCALES[c.setup.scale].division_N : DEFAULT_DIVISION_N)
  return { readings_N: cells.map((c) => c.F_N), division_N: div > 0 ? div : DEFAULT_DIVISION_N }
}

/** Analysis input from the apparatus. `M_kg` defaults to the student's last balance reading of the block. */
export function inputFromApparatus(lab: FrictionApparatus, o: { M_kg?: number | null; mEach_kg?: number; options?: InclineOptions } = {}): FrictionAnalysisInput {
  const t = lab.tableData()
  const M = o.M_kg !== undefined ? o.M_kg : lab.getState().measuredBlock_kg
  return {
    M_kg: M,
    ...(o.mEach_kg !== undefined ? { mEach_kg: o.mEach_kg } : {}),
    t41: t.t41.map(rowOf),
    t42: t.t42.map(rowOf),
    t43: t.t43.map((bar) => bar.map((c) => ({ h_m: c.h_m, t_s: c.t_s }))),
    ...(o.options ? { options: o.options } : {}),
  }
}
export function analysisFromApparatus(lab: FrictionApparatus, o: Parameters<typeof inputFromApparatus>[1] = {}): FrictionAnalysis {
  return fullAnalysis(inputFromApparatus(lab, o))
}
