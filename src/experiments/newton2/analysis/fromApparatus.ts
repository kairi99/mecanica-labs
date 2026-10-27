// Adapter from the apparatus to the pure analysis inputs. No physics here.
import type { Apparatus } from '../apparatus/index.ts'
import { analyse, type AnalysisResult } from './compute.ts'

export function analysisFromApparatus(app: Apparatus): AnalysisResult {
  const d = app.tableData()
  return analyse({ forces_N: d.forces_N, values_s: d.values_s, Mt_kg: app.mtRecorded_kg() })
}
