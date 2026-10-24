// CSV of the analysis results (Tabla 2.1 computed columns and tasks 5 to 7). ES: ";" and decimal comma; EN: "," and decimal point.
import type { Lang } from '../../../core/i18n.ts'
import { joinCSV } from '../../../core/views/csv.ts'
import { roundWithUncertainty } from '../../../core/physics/index.ts'
import type { BallKey, FullAnalysis } from './compute.ts'

export function analysisCSV(a: FullAnalysis, lang: Lang): string {
  const dec = (s: string): string => (lang === 'es' ? s.replace('.', ',') : s)
  const pair = (v: number | null, u: number | null): [string, string] => {
    if (v === null || u === null) return ['', '']
    const q = roundWithUncertainty(v, u)
    return [dec(q.valueText), dec(q.sigmaText)]
  }
  const num = (v: number | null, d: number): string => (v === null ? '' : dec(v.toFixed(d)))
  const rows: string[][] = [['ball', 'No.', 'n_t', 't (s)', 'dt (s)', 'x (m)', 'dx (m)', 'v0 (m/s)', 'dv0 (m/s)', 'error_t (%)', 'v_final (m/s)', 'dv_final (m/s)']]
  for (const b of ['marble', 'pingpong'] as BallKey[]) {
    a.balls[b].trials.forEach((t, i) => {
      const d = a.derived[b][i]!
      rows.push([b, String(i + 1), String(t.n_t), ...pair(t.t_s, t.u_t_s), ...pair(t.x_m, t.u_x_m), ...pair(t.v0_mps, t.u_v0_mps), num(d.error?.error_pct ?? null, 1), ...pair(d.final?.v_mps ?? null, d.final?.u_v_mps ?? null)])
    })
  }
  if (a.expected) rows.push([], ['H (m)', 't_theo (s)', 'u_t_theo (s)'], [num(a.expected.H_m, 4), ...pair(a.expected.t_s, a.expected.u_t_s)])
  return joinCSV(rows, lang)
}
