// CSV of Tabla 3.1 and of the analysis results. ES: ";" and decimal comma (opens directly in Spanish-locale spreadsheets).
// EN: "," and decimal point. Headers are data here (no DOM); phase 2 may move them to the views' strings.
import type { Lang } from '../../../core/i18n.ts'
import { joinCSV } from '../../../core/views/csv.ts'
import { numText, pmText } from '../../../core/views/format.ts'
import { formatNum } from '../../../core/views/numfmt.ts'
import type { TableData } from '../apparatus/types.ts'
import type { AnalysisResult } from './compute.ts'

const H = {
  es: { trial: 'Prueba', masses: 'Masas en el contenedor', F: 'F (N)', t: 'Tiempo', n: 'n', tbar: 't medio (s)', dt: 'Δt (s)', sd: 's (s)', a: 'a (m/s²)', da: 'Δa (m/s²)', fit: 'Ajuste F = M a + F0', M: 'M_ajuste (kg)', F0: 'F0 (N)', Mt: 'Mt balanza (kg)', err: 'Error (%)', chi: 'chi² reducido' },
  en: { trial: 'Trial', masses: 'Masses in canister', F: 'F (N)', t: 'Time', n: 'n', tbar: 'mean t (s)', dt: 'Δt (s)', sd: 's (s)', a: 'a (m/s²)', da: 'Δa (m/s²)', fit: 'Fit F = M a + F0', M: 'M_fit (kg)', F0: 'F0 (N)', Mt: 'Mt balance (kg)', err: 'Error (%)', chi: 'reduced chi²' },
} as const

/** Tabla 3.1 as the student filled it: one row per force, ten timings. */
export function tableCSV(t: TableData, lang: Lang): string {
  const h = H[lang]
  const cols = t.values_s[0]?.length ?? 0
  const rows: string[][] = [[h.trial, h.masses, h.F, ...Array.from({ length: cols }, (_, i) => `${h.t}${i + 1} (s)`)]]
  t.values_s.forEach((r, i) => {
    const F = t.forces_N[i]
    rows.push([String(i + 1), String(t.trialMasses[i] ?? ''), F === null || F === undefined ? '' : formatNum(F, 2, lang), ...r.map((v) => (v === null ? '' : formatNum(v, 2, lang)))])
  })
  return joinCSV(rows, lang)
}

/** Per-trial means, accelerations and the fit. */
export function analysisCSV(r: AnalysisResult, lang: Lang): string {
  const h = H[lang]
  const rows: string[][] = [[h.trial, h.F, h.n, h.tbar, h.dt, h.sd, h.a, h.da]]
  for (const t of r.trials) {
    if (t.n === 0) continue
    rows.push([
      String(t.row + 1), t.F_N === null ? '' : numText(t.F_N, 2, lang), String(t.n),
      t.mean_s === null ? '' : numText(t.mean_s, 3, lang), t.uTotal_s === null ? '' : numText(t.uTotal_s, 3, lang), numText(t.sd_s, 3, lang),
      t.a_mps2 === null ? '' : numText(t.a_mps2, 4, lang), t.u_a_mps2 === null ? '' : numText(t.u_a_mps2, 4, lang),
    ])
  }
  if (r.fit) {
    rows.push([], [h.fit], [h.M, pmText(r.fit.M_kg, r.fit.sigma_M_kg, lang)], [h.F0, pmText(r.fit.F0_N, r.fit.sigma_F0_N, lang)])
    rows.push([h.chi, r.fit.fit.chi2_red === null ? '' : numText(r.fit.fit.chi2_red, 2, lang)])
    if (r.massComparison) rows.push([h.Mt, numText(r.massComparison.Mt_kg, 4, lang)], [h.err, numText(r.massComparison.error_pct, 1, lang)])
  }
  return joinCSV(rows, lang)
}
