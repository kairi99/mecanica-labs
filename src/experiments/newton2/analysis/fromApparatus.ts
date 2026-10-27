// Adapter from the apparatus to the pure analysis inputs. No physics here.
import type { Apparatus } from '../apparatus/index.ts'
import { SPRING_SCALES, springScaleUncertainty_N } from '../../../core/instruments/springScale.ts'
import { analyse, type AnalysisResult } from './compute.ts'

export function analysisFromApparatus(app: Apparatus): AnalysisResult {
  const d = app.tableData()
  const uF = d.forceCells.map((c) => springScaleUncertainty_N(SPRING_SCALES[c.scaleId ?? app.defaultScale() ?? '1N']))
  return analyse({ forces_N: d.forces_N, values_s: d.values_s, Mt_kg: app.mtRecorded_kg(), uF_N: uF })
}
