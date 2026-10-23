// Copy the stopped stopwatch reading into the first empty cell of the selected Table 1.1 row. Shared by the timing bar and the
// table panel so both give the same result and the same message. The apparatus decides (and refuses with a reason); this only words it.
import { TABLE_POSITIONS_cm } from '../apparatus/index.ts'
import type { ViewContext } from './view.ts'
import { formatNum } from '../../../core/views/numfmt.ts'
import { reasonText } from './reasons.ts'
import { getMarkRow } from './uistate.ts'
import { strings as tableStrings } from './strings/table.ts'

export function copyReading(ctx: ViewContext, t_ms: number): { ok: boolean; message: string } {
  const lang = ctx.lang()
  const T = tableStrings[lang]
  const app = ctx.apparatus
  const row = getMarkRow()
  const vals = app.tableData().values_s[row]!
  const col = vals.findIndex((v) => v === null)
  if (col < 0) return { ok: false, message: T.rowFull }
  const res = app.tableCopyDisplay(row, col, t_ms)
  ctx.changed()
  if (!res.ok) return { ok: false, message: reasonText(lang, res.reason) }
  return { ok: true, message: T.copied.replace('{t}', formatNum(res.value_s, 2, lang)).replace('{c}', String(col + 1)).replace('{x}', String(TABLE_POSITIONS_cm[row])) }
}
