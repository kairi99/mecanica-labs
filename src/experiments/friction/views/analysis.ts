// Analysis step (guide 4.4): the numbers of the pure analysis layer for the student's own tables. Interpretation questions are free-text
// notes that nothing here answers. The literature value and its citation are typed by the student; the app only computes the error.
import { BAR_ORDER, FACE_ORDER, MASS_STEPS } from '../apparatus/index.ts'
import { analysisCSV, tablesCSV } from '../analysis/csv.ts'
import { compareWithLiterature, weight_N, type FrictionAnalysis } from '../analysis/compute.ts'
import { inputFromApparatus } from '../analysis/fromApparatus.ts'
import { fullAnalysis } from '../analysis/compute.ts'
import { BAR_PAIRS, FACE_PAIRS } from '../physics/constants.ts'
import { roundWithUncertainty } from '../../../core/physics/index.ts'
import { loadLiterature, loadNotes, saveLiterature, saveNotes, type LitEntry } from '../persist.ts'
import type { MountView, View } from './view.ts'
import { button, card, el, nextId, watch } from '../../../core/views/dom.ts'
import { fmt } from '../../../core/pedagogy/dom.ts'
import { formatNum } from '../../../core/views/numfmt.ts'
import { linePlot, type PlotSeries } from './plot.ts'
import { strings } from './strings/analysis.ts'

function download(name: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url; a.download = name
  document.body.append(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function mountAnalysis(opts: { teacher: boolean }): MountView {
  return (root, ctx): View => {
    const app = ctx.apparatus
    const S = () => strings[ctx.lang()]
    const w = watch(app)
    const c = card('analysis', S().title, 'card-analysis')
    c.root.dataset.region = 'analysis'
    const body = el('div', 'an-body')
    c.body.append(body)
    root.append(c.root)
    let lit = loadLiterature()
    let notes = loadNotes()
    let current: FrictionAnalysis | null = null

    const pm = (v: number | null, u: number | null): string => {
      if (v === null || u === null) return '–'
      const q = roundWithUncertainty(v, u)
      const t = `${q.valueText} ± ${q.sigmaText}`
      return ctx.lang() === 'es' ? t.replace(/\./g, ',') : t
    }
    const num = (v: number, d: number): string => formatNum(v, d, ctx.lang())

    function table(head: string[], rows: string[][], cap?: string): HTMLElement {
      const wrap = el('div', 'table-scroll')
      const t = el('table', 'data-table an-table')
      if (cap) t.append(el('caption', 'sr-only', cap))
      const tr = el('tr')
      for (const h of head) tr.append(el('th', 'col-head', h, { scope: 'col' }))
      const thead = el('thead'); thead.append(tr); t.append(thead)
      const tb = el('tbody')
      for (const r of rows) { const row = el('tr'); r.forEach((x, i) => row.append(i === 0 ? el('th', 'row-head', x, { scope: 'row' }) : el('td', 'calc-line', x))); tb.append(row) }
      t.append(tb); wrap.append(t)
      return wrap
    }

    function litRow(key: string, what: string, mu: number | null, sigma: number | null): HTMLElement {
      const T = S()
      const row = el('div', 'an-lit')
      row.append(el('p', 'readout-text', fmt(T.litRow, { what, mu: mu === null ? T.litNone : pm(mu, sigma) })))
      const vId = nextId('lit'), sId = nextId('src')
      const v = el('label', 'readout-label', T.litValue, { for: vId })
      const vi = el('input', 'cell', undefined, { type: 'text', inputmode: 'decimal', id: vId, autocomplete: 'off' })
      const s = el('label', 'readout-label', T.litSource, { for: sId })
      const si = el('input', 'cell cell-text', undefined, { type: 'text', id: sId, autocomplete: 'off' })
      vi.value = lit[key]?.value ?? ''; si.value = lit[key]?.source ?? ''
      const out = el('p', 'readout-text', undefined, { role: 'status', 'aria-live': 'polite' })
      const calc = (): void => {
        const L = Number(vi.value.trim().replace(',', '.'))
        const cmp = mu !== null && sigma !== null && vi.value.trim() !== '' && Number.isFinite(L) ? compareWithLiterature(mu, sigma, L) : null
        out.textContent = cmp ? `${fmt(T.litError, { e: num(cmp.relativeError_pct, 1) })} ${T.litVerdict[cmp.comparison.verdict]}` : ''
      }
      const save = (): void => { lit = { ...lit, [key]: { value: vi.value, source: si.value } as LitEntry }; saveLiterature(lit); calc() }
      vi.addEventListener('input', save); si.addEventListener('input', save)
      calc()
      row.append(v, vi, s, si, out)
      return row
    }

    function render(): void {
      const T = S()
      c.title.textContent = T.title
      const inp = inputFromApparatus(app)
      const a = fullAnalysis(inp)
      current = a
      body.replaceChildren()
      body.append(el('p', 'muted', T.intro))
      if (inp.M_kg === null) body.append(el('p', 'why', T.needM))
      // ---- exp 1
      body.append(el('h3', 'sub-title', T.s1), el('p', 'muted', T.s1intro))
      if (a.t41) {
        const rows = a.t41.rows.map((r, i) => {
          const face = FACE_ORDER[Math.floor(i / MASS_STEPS)]!
          const n = i % MASS_STEPS
          return [T.face[face], `${n * 50} g`, inp.M_kg === null ? '–' : num(weight_N(inp.M_kg, n, inp.mEach_kg).W_N, 3), r ? pm(r.mean, r.dF_N) : '–']
        })
        body.append(table([T.colFace, T.colMass, T.colW, T.colF], rows, T.s1))
        const stops = a.t41.fits.reduce((n, f) => n + f.rowsAtStop.length, 0)
        if (stops > 0) body.append(el('p', 'why', fmt(T.atStop, { n: stops })))
        const withFit = a.t41.fits.filter((f) => f.fit)
        if (withFit.length) {
          const wMax = Math.max(...a.t41.fits.flatMap((f) => f.W_N), 1)
          const fMax = Math.max(...a.t41.fits.flatMap((f) => f.F_N.map((x, i) => x + f.dF_N[i]!)), 0.1)
          const series: PlotSeries[] = []
          a.t41.fits.forEach((f, fi) => {
            series.push({ kind: 'points', cls: `plot-s${fi + 1}`, marker: fi === 0 ? 'circle' : 'square', pts: f.W_N.map((x, i) => [x, f.F_N[i]!] as [number, number]), bars: f.dF_N })
            if (f.fit) series.push({ kind: 'line', cls: `plot-s${fi + 1}`, dash: fi === 1, label: fi === 0 ? T.plotS1 : T.plotS2, pts: [[0, f.fit.intercept], [wMax, f.fit.slope * wMax + f.fit.intercept]] })
          })
          const yTop = Math.max(fMax, ...a.t41.fits.map((f) => (f.fit ? f.fit.slope * wMax + f.fit.intercept : 0))) * 1.05
          body.append(linePlot({ aria: T.plotAria, xLabel: T.axisW, yLabel: T.axisF, xMax: wMax, yMax: yTop, series, lang: ctx.lang() }))
          // error bars smaller than the 7 px marker (plot area is about 170 px high): say so, so a missing bar is not read as a missing error
          const px = (d: number): number => (d / yTop) * 170
          if (a.t41.fits.every((f) => f.dF_N.every((d) => px(d) < 7))) body.append(el('p', 'muted', T.errSmall))
          const leg = el('ul', 'an-legend')
          FACE_ORDER.forEach((f, i) => leg.append(el('li', `leg-s${i + 1}`, T.face[f])))
          body.append(leg, el('h4', 'an-h', T.fitHead))
          for (const f of a.t41.fits) {
            if (!f.fit || f.mu_k === null) continue
            const q = roundWithUncertainty(f.mu_k, f.sigma_mu_k ?? 0)
            const qb = roundWithUncertainty(f.intercept_N ?? 0, f.sigma_intercept_N ?? 0)
            const d = (s: string): string => (ctx.lang() === 'es' ? s.replace('.', ',') : s)
            body.append(el('p', 'readout-text', fmt(T.fitLine, { face: T.face[f.face], m: d(q.valueText), s: d(q.sigmaText) })), el('p', 'muted', fmt(T.fitIntercept, { b: d(qb.valueText), sb: d(qb.sigmaText) })))
            if (opts.teacher) body.append(el('p', 'muted', fmt(T.teacherLine, { what: T.face[f.face], v: num(FACE_PAIRS[f.face].mu_k, 2) })))
          }
          body.append(el('p', 'muted', T.fitNote))
        }
      } else body.append(el('p', 'muted', T.noData))
      // ---- exp 2
      body.append(el('h3', 'sub-title', T.s2), el('p', 'muted', T.s2intro))
      body.append(table([T.colFace, T.colFmax, T.colMus], a.t42.map((r, i) => [T.face[FACE_ORDER[i]!], r ? pm(r.Fmax.mean, r.Fmax.dF_N) : '–', r ? pm(r.mu_s, r.sigma_mu_s) : '–']), T.s2))
      // ---- exp 3
      body.append(el('h3', 'sub-title', T.s3), el('p', 'muted', T.s3intro))
      BAR_ORDER.forEach((bar, bi) => {
        const m = a.t43[bi]!
        const rows = m.trials.map((t, i) => [String(i + 1), t ? num(t.h_m, 3) : '–', t ? num(t.t_s, 2) : '–', t ? num((t.theta_rad * 180) / Math.PI, 1) : '–', t ? num(t.a_mps2, 3) : '–', t ? num(t.mu, 3) : '–'])
        body.append(el('h4', 'an-h', T.bar[bar]), table([T.colTrial, T.colH, T.colT, T.colTheta, T.colA, T.colMu], rows, T.bar[bar]), el('p', 'readout-text', `${T.muMean}: ${pm(m.mu, m.delta_mu)}`))
        if (opts.teacher) body.append(el('p', 'muted', fmt(T.teacherLine, { what: T.bar[bar], v: `${num(BAR_PAIRS[bar].mu_k, 2)} (μk), ${num(BAR_PAIRS[bar].mu_s, 2)} (μs)` })))
      })
      // ---- literature
      body.append(el('h3', 'sub-title', T.lit), el('p', 'muted', T.litIntro))
      a.t41?.fits.forEach((f) => body.append(litRow(`k-${f.face}`, `μ, ${T.face[f.face]} (${T.s1.split(' · ')[0]})`, f.mu_k, f.sigma_mu_k)))
      a.t42.forEach((r, i) => body.append(litRow(`s-${FACE_ORDER[i]}`, `μ, ${T.face[FACE_ORDER[i]!]} (${T.s2.split(' · ')[0]})`, r?.mu_s ?? null, r?.sigma_mu_s ?? null)))
      a.t43.forEach((m, bi) => body.append(litRow(`b-${BAR_ORDER[bi]}`, `μ, ${T.bar[BAR_ORDER[bi]!]} (${T.s3.split(' · ')[0]})`, m.mu, m.delta_mu)))
      // ---- notes
      body.append(el('h3', 'sub-title', T.tasks), el('p', 'muted', T.tasksIntro))
      for (const [k, label] of Object.entries(T.taskLabels)) {
        const id = nextId('note')
        const ta = el('textarea', 'note-area', undefined, { id, rows: '3' })
        ta.value = notes[k] ?? ''
        ta.addEventListener('input', () => { notes = { ...notes, [k]: ta.value }; saveNotes(notes) })
        body.append(el('label', 'readout-label', label, { for: id }), ta)
      }
      // ---- csv
      const acts = el('div', 'table-actions')
      acts.append(
        button(T.csvTables, 'btn btn-sm', () => download(`rozamiento-tablas-${ctx.lang()}.csv`, tablesCSV(app.tableData(), ctx.lang()))),
        button(T.csvResults, 'btn btn-sm', () => { if (current) download(`rozamiento-resultados-${ctx.lang()}.csv`, analysisCSV(current, ctx.lang())) }),
      )
      body.append(acts)
    }
    let timer = 0
    return {
      // rebuilt only when the apparatus changed and no field inside the panel has focus (typing a literature value must not lose the cursor)
      update() {
        if (!w.dirty()) return
        if (c.root.contains(document.activeElement) && document.activeElement instanceof HTMLElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return
        w.clear(); render()
      },
      relabel() { w.touch() },
      destroy() { window.clearTimeout(timer); w.off(); c.root.remove() },
    }
  }
}
