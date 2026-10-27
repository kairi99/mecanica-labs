// Copy the stopped stopwatch reading into the first empty time cell of the selected Tabla 3.1 row. Shared by the timing bar and the
// table panel so both give the same result and the same message. The apparatus decides (and refuses with a reason); this only words it.
import type { ViewContext } from './view.ts'
import { formatNum } from '../../../core/views/numfmt.ts'
import { reasonText } from './reasons.ts'
import { getTrialRow } from './uistate.ts'
import { strings } from './strings/timing.ts'

export function copyReading(ctx: ViewContext, t_ms: number): { ok: boolean; message: string } {
  const lang = ctx.lang()
  const T = strings[lang]
  const app = ctx.apparatus
  const row = getTrialRow()
  const vals = app.tableData().values_s[row]!
  const col = vals.findIndex((v) => v === null)
  if (col < 0) return { ok: false, message: T.rowFull }
  const stop = app.stopLog().at(-1)
  const run = stop && stop.runId !== null ? app.getRun(stop.runId) : null
  const res = app.tableCopyDisplay(row, col, t_ms)
  ctx.changed()
  if (!res.ok) return { ok: false, message: reasonText(lang, res.reason) }
  const base = T.copied.replace('{t}', formatNum(res.value_s, 2, lang)).replace('{n}', String(row + 1)).replace('{c}', String(col + 1))
  // The apparatus lets the student file a reading under any row; a different mass split is worth a word.
  const mismatch = run !== null && run.massesInCanister !== app.tableData().trialMasses[row]
  return { ok: true, message: mismatch ? `${base} ${T.wrongTrial}` : base }
}
