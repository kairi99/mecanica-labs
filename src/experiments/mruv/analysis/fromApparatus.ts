// Adapters from the apparatus to the pure analysis inputs. No physics here.
import type { Apparatus } from '../apparatus/index.ts'
import { analyse, compare, modelAcceleration_mps2, type AnalysisResult, type Comparison, type ComparisonInput } from './compute.ts'

export function comparisonInput(app: Apparatus): ComparisonInput {
  const runTimes_s = app.getRuns().map((r) => r.marks.map((m) => m.trueTime_s))
  const stops = new Map(app.stopLog().map((s) => [s.id, s]))
  const d = app.tableData()
  const pairs: ComparisonInput['pairs'] = []
  d.cells.forEach((rowCells, row) => rowCells.forEach((c) => {
    if (c.stopId === null || c.value_s === null) return
    const t = stops.get(c.stopId)?.crossings[row]?.trueTime_s
    if (t !== null && t !== undefined) pairs.push({ row, reading_s: c.value_s, true_s: t })
  }))
  const theta = app.hiddenTruth().theta_rad
  return { runTimes_s, pairs, aModel_mps2: theta === null ? null : modelAcceleration_mps2(theta) }
}

export function analysisFromApparatus(app: Apparatus): { result: AnalysisResult; comparison: Comparison } {
  return { result: analyse(app.tableData().values_s), comparison: compare(comparisonInput(app)) }
}
