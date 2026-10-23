// CSV of the analysis results. ES: ";" and decimal comma (opens directly in Spanish-locale spreadsheets). EN: "," and decimal point.
import type { Lang } from '../i18n.ts'
import { roundWithUncertainty } from '../physics/index.ts'
import { strings } from '../views/strings/analysis.ts'
import type { AnalysisResult, Comparison } from './compute.ts'
import { numText } from './format.ts'

export interface CsvOptions { lang: Lang; comparison?: Comparison | null; includeModel?: boolean }

export function analysisCSV(r: AnalysisResult, o: CsvOptions): string {
  const T = strings[o.lang]
  const sep = o.lang === 'es' ? ';' : ','
  const dec = (s: string): string => (o.lang === 'es' ? s.replace('.', ',') : s)
  const pair = (v: number, s: number): [string, string] => { const q = roundWithUncertainty(v, s); return [dec(q.valueText), dec(q.sigmaText)] }
  const rows: string[][] = []
  const blank = (): void => { rows.push([]) }

  rows.push([T.csvT1])
  rows.push([T.colX, T.colN, 't (s)', 'u_c(t) (s)', T.colSd, T.colUA, T.colURes, T.colUReact, T.colU])
  for (const m of r.marks) {
    if (m.row === 0) continue
    if (m.mean_s === null || m.u_s === null) { rows.push([String(m.x_cm), '0']); continue }
    const [t, u] = pair(m.mean_s, m.uTotal_s ?? m.u_s)
    rows.push([String(m.x_cm), String(m.n), t, u, numText(m.sd_s, 3, o.lang), numText(m.uA_s, 3, o.lang), numText(m.uRes_s, 4, o.lang), numText(m.uReact_s, 4, o.lang), numText(m.u_s, 3, o.lang)])
  }
  blank()
  rows.push([T.csvVelocity])
  rows.push([T.csvColInterval, T.csvColV, T.csvColSigma])
  const vrow = (v: { from_cm: number; to_cm: number; v_mps: number; sigma_v_mps: number } | null): void => {
    if (!v) return
    const [a, s] = pair(v.v_mps, v.sigma_v_mps)
    rows.push([`${v.from_cm}-${v.to_cm}`, a, s])
  }
  vrow(r.whole); r.d30.forEach(vrow); r.d10.forEach(vrow)
  if (r.fit) {
    const f = r.fit.fit
    blank()
    rows.push([T.csvFit])
    rows.push([T.csvColQuantity, T.csvColValue, T.csvColSigma])
    const q = (name: string, v: number, s: number): void => { const [a, b] = pair(v, s); rows.push([name, a, b]) }
    q(T.csvC0, f.c0, f.sigma_c0); q(T.csvC1, f.c1, f.sigma_c1); q(T.csvC2, f.c2, f.sigma_c2); q(T.csvA, f.a_mps2, f.sigma_a_mps2)
    rows.push([T.csvChi2, f.chi2_red === null ? '' : numText(f.chi2_red, 2, o.lang)])
    if (r.vEnd) {
      blank()
      rows.push([T.csvTask9])
      rows.push([T.csvColQuantity, T.csvColValue, T.csvColSigma])
      q(T.csvVfit, r.vEnd.fitted_mps, r.vEnd.sigma_fitted_mps)
      q(T.csvVtwice, r.vEnd.twiceMean_mps, r.vEnd.sigma_twiceMean_mps)
    }
    const c = o.comparison
    if (c && (c.reference || (o.includeModel && c.aModel_mps2 !== null))) {
      blank()
      rows.push([T.csvCompare])
      rows.push([T.csvColQuantity, T.csvColValue, T.csvColSigma])
      if (c.reference) q(T.csvRef, c.reference.a_mps2, c.reference.sigma_a_mps2)
      if (o.includeModel && c.aModel_mps2 !== null) rows.push([T.csvModel, numText(c.aModel_mps2, 4, o.lang)])
    }
  }
  return rows.map((row) => row.join(sep)).join('\n') + '\n'
}
