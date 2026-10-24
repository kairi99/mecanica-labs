// Copy the stopped stopwatch reading (or the last tape range) into the active cell of Tabla 2.1. Shared by the timing bar and the
// table panel so both give the same result and the same message. The apparatus decides (and refuses with a reason); this only words it.
import type { ViewContext } from './view.ts'
import { formatRange, formatTime } from './format.ts'
import { reasonText } from './reasons.ts'
import { getBall, getRep, getTrial, nextEmptyTimeCell, setCell, setNote } from './uistate.ts'
import { strings as tableStrings } from './strings/table.ts'

const fill = (tpl: string, vars: Record<string, string>): string => tpl.replace(/\{(\w+)\}/g, (_m, k: string) => vars[k] ?? '')

/** Stopwatch -> time cell of the active cell; on success the active cell moves to the next one without a time. */
export function copyTime(ctx: ViewContext, t_ms: number): { ok: boolean; message: string } {
  const lang = ctx.lang()
  const app = ctx.apparatus
  const ball = getBall(), trial = getTrial(), rep = getRep()
  const res = app.tableCopyTime(ball, trial, rep, t_ms)
  ctx.changed()
  let message: string
  if (!res.ok) message = reasonText(lang, res.reason, res.item)
  else {
    message = fill(tableStrings[lang].copiedTime, { t: formatTime(res.value_s, lang), n: String(trial + 1), r: String(rep + 1) })
    const next = nextEmptyTimeCell(app.tableData(ball).t_s, { trial, rep })
    setCell(next.trial, next.rep)
  }
  setNote(message)
  return { ok: res.ok, message }
}

/** Last tape range -> range cell of the active cell. */
export function copyRange(ctx: ViewContext): { ok: boolean; message: string } {
  const lang = ctx.lang()
  const ball = getBall(), trial = getTrial(), rep = getRep()
  const res = ctx.apparatus.tableCopyRange(ball, trial, rep)
  ctx.changed()
  const message = res.ok
    ? fill(tableStrings[lang].copiedRange, { x: formatRange(res.value_m, lang), n: String(trial + 1), r: String(rep + 1) })
    : reasonText(lang, res.reason, res.item)
  setNote(message)
  return { ok: res.ok, message }
}
