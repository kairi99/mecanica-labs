// CSV export of the raw tables and the analysis. ES: ";" and decimal comma. EN: "," and decimal point.
import type { Lang } from '../../../core/i18n.ts'
import { joinCSV } from '../../../core/views/csv.ts'
import { roundWithUncertainty } from '../../../core/physics/index.ts'
import { BAR_ORDER, FACE_ORDER, MASS_STEPS } from '../apparatus/constants.ts'
import type { TableData } from '../apparatus/types.ts'
import type { FrictionAnalysis } from './compute.ts'

const LABEL = {
  es: { face: { cloth: 'Tela', sandpaper: 'Lija' }, bar: { wood: 'Madera', aluminium: 'Aluminio', iron: 'Hierro' } },
  en: { face: { cloth: 'Cloth', sandpaper: 'Sandpaper' }, bar: { wood: 'Wood', aluminium: 'Aluminium', iron: 'Iron' } },
} as const
const dec = (s: string, lang: Lang): string => (lang === 'es' ? s.replace('.', ',') : s)
const num = (v: number | null, d: number, lang: Lang): string => (v === null ? '' : dec(v.toFixed(d), lang))
const pair = (v: number | null, u: number | null, lang: Lang): [string, string] => {
  if (v === null || u === null) return ['', '']
  const q = roundWithUncertainty(v, u)
  return [dec(q.valueText, lang), dec(q.sigmaText, lang)]
}

/** Raw tables 4.1, 4.2 and 4.3 as the student filled them. */
export function tablesCSV(t: TableData, lang: Lang): string {
  const L = LABEL[lang]
  const reps = Array.from({ length: t.t41[0]?.length ?? 5 }, (_, i) => `F${i + 1} (N)`)
  const rows: string[][] = [['Tabla 4.1'], ['face', 'm_added (g)', ...reps]]
  t.t41.forEach((r, i) => rows.push([L.face[FACE_ORDER[Math.floor(i / MASS_STEPS)]!], String((i % MASS_STEPS) * 50), ...r.map((c) => num(c.F_N, 3, lang))]))
  rows.push([], ['Tabla 4.2'], ['face', ...reps.map((x) => x.replace('F', 'Fmax'))])
  t.t42.forEach((r, i) => rows.push([L.face[FACE_ORDER[i]!], ...r.map((c) => num(c.F_N, 3, lang))]))
  rows.push([], ['Tabla 4.3'], ['bar', 'No.', 'h (m)', 't (s)'])
  t.t43.forEach((bar, bi) => bar.forEach((c, i) => rows.push([L.bar[BAR_ORDER[bi]!], String(i + 1), num(c.h_m, 3, lang), num(c.t_s, 2, lang)])))
  return joinCSV(rows, lang)
}

/** Results of the analysis (means, fits, coefficients). */
export function analysisCSV(a: FrictionAnalysis, lang: Lang): string {
  const L = LABEL[lang]
  const rows: string[][] = [['Tabla 4.1', 'row', 'F (N)', 'dF (N)']]
  a.t41?.rows.forEach((r, i) => {
    const [v, u] = r ? pair(r.mean, r.dF_N, lang) : ['', '']
    rows.push([L.face[FACE_ORDER[Math.floor(i / MASS_STEPS)]!], String((i % MASS_STEPS) * 50), v, u])
  })
  rows.push([], ['fit', 'mu', 'dmu', 'F0 (N)', 'dF0 (N)'])
  a.t41?.fits.forEach((f) => {
    const [m, dm] = pair(f.mu_k, f.sigma_mu_k, lang)
    const [b, db] = pair(f.intercept_N, f.sigma_intercept_N, lang)
    rows.push([L.face[f.face], m, dm, b, db])
  })
  rows.push([], ['Tabla 4.2', 'Fmax (N)', 'dF (N)', 'mu', 'dmu'])
  a.t42.forEach((c, i) => {
    const [f, df] = c ? pair(c.Fmax.mean, c.Fmax.dF_N, lang) : ['', '']
    const [m, dm] = c ? pair(c.mu_s, c.sigma_mu_s, lang) : ['', '']
    rows.push([L.face[FACE_ORDER[i]!], f, df, m, dm])
  })
  rows.push([], ['Tabla 4.3', 'No.', 'theta (deg)', 'a (m/s2)', 'mu', 'n', 'mu mean', 'dmu'])
  a.t43.forEach((m, bi) => {
    const [mm, dm] = pair(m.mu, m.delta_mu, lang)
    m.trials.forEach((t, i) => rows.push([L.bar[BAR_ORDER[bi]!], String(i + 1), t ? num((t.theta_rad * 180) / Math.PI, 1, lang) : '', t ? num(t.a_mps2, 3, lang) : '', t ? num(t.mu, 3, lang) : '', i === 0 ? String(m.n) : '', i === 0 ? mm : '', i === 0 ? dm : '']))
  })
  return joinCSV(rows, lang)
}
