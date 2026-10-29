// Analysis panel (guide section 1.4, tasks 1 to 10). Reads Table 1.1 through the analysis layer (which calls the physics layer); this view only
// lays the numbers out and draws them. Updates live as the table fills. Hidden by the shell with ?analysis=0.
import type { MountView, View } from './view.ts'
import { button, card, el, nextId, watch } from '../../../core/views/dom.ts'
import { strings } from './strings/analysis.ts'
import { analysisFromApparatus } from '../analysis/fromApparatus.ts'
import { residualsMm, tangentAt, vtCurve, xtCurve, type AnalysisResult, type Comparison, type Velocity } from '../analysis/compute.ts'
import { analysisCSV } from '../analysis/csv.ts'
import { numText, pmText } from '../../../core/views/format.ts'
import { plotResiduals, plotVt, plotXt, readPalette, type PlotHandle } from '../../../core/views/analysisPlots.ts'
import { fmt } from '../../../core/pedagogy/dom.ts'
import { mountTaskPanel } from '../../../core/views/taskPanel.ts'
import { MRUV_TASK_IDS, mruvCompletion } from '../analysis/tasks.ts'
import { strings as taskStrings } from './strings/tasks.ts'
import { tasks } from '../persist.ts'

export interface AnalysisOptions {
  /** Help link to the theory section by language (shown once the theory is unlocked). */
  helpTheory: Record<'es' | 'en', string>
  /** Teacher mode (?teacher): also show the model's expected a. */
  teacher: boolean
}

/** Signed number with a real minus sign and the language's decimal mark. */
function signed(v: number, dec: number, lang: 'es' | 'en'): string {
  const t = numText(Math.abs(v), dec, lang)
  return (v < 0 ? '−' : '+') + t
}

function table(headers: string[], rows: string[][], cls = 'data-table an-table'): HTMLElement {
  const wrap = el('div', 'table-scroll', undefined, { tabindex: '0' })
  const t = el('table', cls)
  const thead = el('thead'), hr = el('tr')
  headers.forEach((h) => hr.append(el('th', undefined, h, { scope: 'col' })))
  thead.append(hr)
  const tb = el('tbody')
  for (const r of rows) {
    const tr = el('tr')
    r.forEach((c, i) => tr.append(i === 0 ? el('th', undefined, c, { scope: 'row' }) : el('td', undefined, c)))
    tb.append(tr)
  }
  t.append(thead, tb)
  wrap.append(t)
  return wrap
}

export function mountAnalysis(opts: AnalysisOptions): MountView {
  return (root, ctx): View => {
    const app = ctx.apparatus
    const S = () => strings[ctx.lang()]
    const w = watch(app)
    const c = card('analysis', S().title, 'card-analysis')
    c.root.dataset.region = 'analysis'
    root.append(c.root)

    // ---- skeleton (built once) -------------------------------------------------------------------------------------------
    const intro = el('p', 'muted')
    const status = el('p', 'readout-text', undefined, { 'aria-live': 'polite' })
    const exportBtn = button('', 'btn btn-quiet', () => download())
    const taskPanel = mountTaskPanel({ tracker: tasks, ids: MRUV_TASK_IDS, labels: (l) => taskStrings[l].labels, lang: () => ctx.lang(), helpTheory: opts.helpTheory })
    const section = (cls: string): { root: HTMLElement; h: HTMLElement; body: HTMLElement } => {
      const s = el('section', `an-sec ${cls}`)
      const h = el('h3', 'sub-title')
      const body = el('div', 'an-body')
      s.append(h, body)
      return { root: s, h, body }
    }
    const s1 = section('an-t1'), s25 = section('an-t25'), s6 = section('an-t6'), s78 = section('an-t78'), s9 = section('an-t9'), s10 = section('an-t10')
    const t1Host = el('div'), t1Note = el('p', 'muted'), t1One = el('p', 'muted')
    s1.body.append(t1Host, t1Note, t1One)
    const gridHost = el('div', 'an-grid'), vNote = el('p', 'muted'), t5 = el('div', 'note'), tip = el('p', 'muted')
    tip.hidden = true
    const tipBtn = button('ⓘ', 'info-btn', () => { tip.hidden = !tip.hidden; tipBtn.setAttribute('aria-expanded', String(!tip.hidden)) })
    tipBtn.setAttribute('aria-expanded', 'false')
    const t5h = el('strong'), t5b = el('span')
    t5.append(t5h, document.createTextNode(' '), t5b)
    const vNoteRow = el('div', 'inline-row')
    vNoteRow.append(tipBtn, vNote)
    s25.body.append(gridHost, vNoteRow, tip, t5)

    const gate6 = el('p', 'note'), gate78 = el('p', 'note'), gate9 = el('p', 'note'), gate10 = el('p', 'note')
    /** A chart is an image for assistive technology: it gets a name and the text next to it carries the numbers. */
    const setImg = (h: HTMLElement, label: string): void => { h.setAttribute('role', 'img'); h.setAttribute('aria-label', label) }
    const t6Note = el('p', 'muted'), xtHost = el('div', 'plot'), legend6 = el('p', 'muted an-legend')
    const coefHost = el('div'), chi2 = el('p', 'readout-text'), chi2Hint = el('p', 'muted')
    const slId = nextId('tg')
    const tgLabel = el('label', 'field-label', undefined, { for: slId })
    const slider = el('input', 'range', undefined, { type: 'range', id: slId, min: '0', max: '1', step: '0.01', value: '0.5' })
    const tgRead = el('p', 'readout-text', undefined, { 'aria-live': 'off' })
    const tgQ = el('p', 'muted')
    const body6 = el('div', 'an-body')
    body6.append(t6Note, xtHost, legend6, coefHost, chi2, chi2Hint, tgLabel, slider, tgRead, tgQ)
    s6.body.append(gate6, body6)

    const t78Note = el('p', 'muted'), vtHost = el('div', 'plot'), legend78 = el('p', 'muted an-legend')
    const vOfT = el('p', 'readout-text'), aRes = el('p', 'readout-value'), aNote = el('p', 'muted')
    const reactBox = el('div', 'note'), reactTitle = el('strong'), reactBody = el('p')
    reactBox.append(reactTitle, reactBody)
    const body78 = el('div', 'an-body')
    body78.append(t78Note, vtHost, legend78, vOfT, aRes, aNote, reactBox)
    s78.body.append(gate78, body78)

    const t9Fit = el('p', 'readout-text'), t9Twice = el('p', 'readout-text'), t9Note = el('p', 'muted')
    const body9 = el('div', 'an-body an-pair')
    body9.append(t9Fit, t9Twice)
    const wrap9 = el('div', 'an-body')
    wrap9.append(body9, t9Note)
    s9.body.append(gate9, wrap9)

    const t10Body = el('p', 'muted'), resHost = el('div', 'plot'), legend10 = el('p', 'muted an-legend')
    const body10 = el('div', 'an-body')
    body10.append(t10Body, resHost, legend10)
    s10.body.append(gate10, body10)

    const cmp = el('details', 'an-compare')
    const cmpSum = el('summary')
    const cmpBody = el('div', 'an-body')
    cmp.append(cmpSum, cmpBody)

    const actions = el('div', 'table-actions')
    actions.append(exportBtn)
    c.body.append(intro, status, taskPanel.root, s1.root, s25.root, s6.root, s78.root, s9.root, s10.root, cmp, actions)

    // ---- state ---------------------------------------------------------------------------------------------------------
    let handles: PlotHandle[] = []
    let sig = ''
    let tangentFrac = 0.5
    let last: { result: AnalysisResult; comparison: Comparison } | null = null
    let dirty = true
    const L = () => ctx.lang()
    /** Tick state and data availability -> completion -> checklist, progress, unlock. */
    function refreshTasks(): void {
      const r = last?.result
      const some = (vs: Array<Velocity | null>): boolean => vs.some((v) => v !== null)
      taskPanel.update(mruvCompletion(tasks.ticks(), {
        marks: !!r && r.marksWithData > 0,
        whole: !!r && r.whole !== null, d30: !!r && some(r.d30), d10: !!r && some(r.d10),
        fit: !!r && r.fit !== null, vEnd: !!r && r.vEnd !== null,
      }))
    }
    const offTasks = tasks.onChange(refreshTasks)

    slider.addEventListener('input', () => { tangentFrac = Number(slider.value); dirty = true })
    const themeObserver = new MutationObserver(() => { dirty = true; sig = '' })
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    const dark = window.matchMedia('(prefers-color-scheme: dark)')
    const onScheme = (): void => { dirty = true; sig = '' }
    dark.addEventListener('change', onScheme)
    let lastWidth = 0
    const ro = new ResizeObserver(() => {
      const wpx = Math.floor(c.body.clientWidth)
      if (wpx !== lastWidth) { lastWidth = wpx; sig = ''; dirty = true }
    })
    ro.observe(c.body)

    function vTable(vs: Array<Velocity | null>, T: ReturnType<typeof S>): HTMLElement {
      const lang = L()
      return table([T.colInterval, T.colV], vs.map((v) => v
        ? [fmt(T.intervalFmt, { a: v.from_cm, b: v.to_cm }), pmText(v.v_mps, v.sigma_v_mps, lang)]
        : ['–', T.noData]), 'data-table an-table an-narrow')
    }

    function render(): void {
      const T = S(), lang = L()
      const { result: r, comparison: cmpData } = analysisFromApparatus(app)
      last = { result: r, comparison: cmpData }
      c.title.textContent = T.title
      intro.textContent = T.intro
      exportBtn.textContent = T.exportCsv
      exportBtn.disabled = r.readingsTotal === 0
      status.textContent = r.readingsTotal === 0 ? T.statusEmpty
        : r.fit ? fmt(T.statusFit, { k: r.marksWithData, n: r.readingsTotal })
          : fmt(T.statusPartial, { k: r.marksWithData, n: r.readingsTotal })

      // task 1
      s1.h.textContent = T.t1Title
      t1Host.replaceChildren(table(
        [T.colX, T.colN, T.colMean, T.colSd, T.colUA, T.colURes, T.colUReact, T.colU],
        r.marks.filter((m) => m.row > 0).map((m) => m.mean_s === null || m.u_s === null || m.uTotal_s === null
          ? [String(m.x_cm), '0', T.noData, '', '', '', '', '']
          : [String(m.x_cm), String(m.n), pmText(m.mean_s, m.uTotal_s, lang), numText(m.sd_s, 3, lang), numText(m.uA_s, 3, lang), numText(m.uRes_s, 4, lang), numText(m.uReact_s, 4, lang), numText(m.u_s, 3, lang)]),
      ))
      t1Note.textContent = T.t1Note
      t1One.textContent = T.t1OneReading
      t1One.hidden = !r.marks.some((m) => m.row > 0 && m.n === 1)

      // tasks 2 to 5
      s25.h.textContent = T.t25Title
      const col = (title: string, vs: Array<Velocity | null>): HTMLElement => {
        const d = el('div', 'an-col'); d.append(el('h4', 'an-col-title', title), vTable(vs, T)); return d
      }
      gridHost.replaceChildren(col(T.t2Title, [r.whole]), col(T.t3Title, r.d30), col(T.t4Title, r.d10))
      vNote.textContent = T.vNote
      tipBtn.setAttribute('aria-label', T.info); tipBtn.title = T.correlationTip
      tip.textContent = T.correlationTip
      t5h.textContent = T.t5Title
      t5b.textContent = T.t5Body

      // gates and tasks 6 to 10
      const gateText = fmt(T.needFit, { k: r.marksForFit })
      const f = r.fit
      for (const [g, b, s, title] of [[gate6, body6, s6, T.t6Title], [gate78, body78, s78, T.t78Title], [gate9, wrap9, s9, T.t9Title], [gate10, body10, s10, T.t10Title]] as const) {
        s.h.textContent = title
        g.textContent = gateText
        g.hidden = f !== null
        b.hidden = f === null
      }
      for (const h of handles) h.destroy()
      handles = []
      if (f) {
        const pal = readPalette()
        const hPush = (h: PlotHandle | null): void => { if (h) handles.push(h) }
        // task 6
        t6Note.textContent = T.t6Note
        setImg(xtHost, T.xtAria)
        const tMax = f.tMax_s
        const t0 = tangentFrac * tMax
        const tan = tangentAt(f, t0)
        hPush(plotXt(xtHost, {
          readings: r.marks.flatMap((m) => m.readings_s.map((t) => ({ t, x: m.x_m }))),
          means: r.marks.filter((m) => m.row > 0 && m.mean_s !== null && m.u_s !== null).map((m) => ({ t: m.mean_s!, x: m.x_m, u: m.u_s! })),
          curve: xtCurve(f), tangent: tan.segment,
        }, pal, { t: T.axisT, x: T.axisXm }))
        legend6.textContent = [T.legReadings, T.legMeans, T.legFit, T.legTangent].join('  ·  ')
        const q = f.fit
        coefHost.replaceChildren(table([T.coefTitle, ''], [
          [T.coefC0, pmText(q.c0, q.sigma_c0, lang)], [T.coefC1, pmText(q.c1, q.sigma_c1, lang)], [T.coefC2, pmText(q.c2, q.sigma_c2, lang)],
        ], 'data-table an-table an-narrow'))
        chi2.textContent = q.chi2_red === null ? '' : fmt(T.chi2, { x: numText(q.chi2_red, 2, lang), dof: q.dof })
        chi2Hint.textContent = q.chi2_red === null ? '' : T.chi2Hint
        tgLabel.textContent = T.tangentLabel
        slider.value = String(tangentFrac)
        slider.setAttribute('aria-valuetext', `${numText(t0, 2, lang)} s`)
        tgRead.textContent = fmt(T.tangentRead, { t: numText(t0, 2, lang), x: numText(tan.x_m, 3, lang), v: pmText(tan.v_mps, tan.sigma_v_mps, lang) })
        tgQ.textContent = T.tangentQuestion
        // tasks 7 and 8
        t78Note.textContent = T.t78Note
        setImg(vtHost, T.vtAria)
        hPush(plotVt(vtHost, { curve: vtCurve(f) }, pal, { t: T.axisT, v: T.axisV }))
        legend78.textContent = [T.legV, T.legBand].join('  ·  ')
        vOfT.textContent = fmt(T.vOfT, { c1: pmText(q.c1, q.sigma_c1, lang), c2: pmText(q.c2, q.sigma_c2, lang) })
        aRes.textContent = fmt(T.aResult, { a: pmText(q.a_mps2, q.sigma_a_mps2, lang) })
        aNote.textContent = T.aNote
        reactTitle.textContent = T.reactTitle
        const re = r.reaction
        reactBody.textContent = re ? fmt(T.reactBody, { s: numText(re.shift_s, 1, lang), a: signed(re.da_pct, 1, lang), c1: signed(re.dc1_mps, 3, lang), v: re.dvWhole_pct === null ? '–' : signed(re.dvWhole_pct, 1, lang) }) : T.reactNone
        // task 9
        if (r.vEnd) {
          t9Fit.textContent = fmt(T.t9Fitted, { v: pmText(r.vEnd.fitted_mps, r.vEnd.sigma_fitted_mps, lang) })
          t9Twice.textContent = fmt(T.t9Twice, { v: pmText(r.vEnd.twiceMean_mps, r.vEnd.sigma_twiceMean_mps, lang) })
          t9Note.textContent = T.t9Note
        } else {
          t9Fit.textContent = ''; t9Twice.textContent = ''; t9Note.textContent = T.needFitShort.replace('{k}', String(r.marksForFit))
        }
        // task 10
        t10Body.textContent = T.t10Body
        setImg(resHost, T.resAria)
        hPush(plotResiduals(resHost, { points: residualsMm(f), tMax }, pal, { t: T.axisT, r: T.axisRes }))
        legend10.textContent = [T.legRes, T.legZero].join('  ·  ')
      }
      refreshTasks()

      // comparison
      cmpSum.textContent = T.cmpTitle
      cmpBody.replaceChildren()
      cmpBody.append(el('p', 'muted', T.cmpIntro))
      if (f) cmpBody.append(el('p', 'readout-text', fmt(T.cmpYours, { a: pmText(f.fit.a_mps2, f.fit.sigma_a_mps2, lang) })))
      cmpBody.append(el('p', 'readout-text', cmpData.reference
        ? fmt(T.cmpRef, { n: cmpData.reference.runs, a: pmText(cmpData.reference.a_mps2, cmpData.reference.sigma_a_mps2, lang) }) : T.cmpRefNone))
      if (opts.teacher && cmpData.aModel_mps2 !== null) {
        cmpBody.append(el('p', 'readout-text', fmt(T.cmpModel, { a: numText(cmpData.aModel_mps2, 4, lang) })), el('p', 'muted', T.cmpModelNote))
      }
      cmpBody.append(el('h4', 'an-col-title', T.cmpOffsetsTitle))
      const offs = cmpData.offsets.filter((o): o is NonNullable<typeof o> => o !== null)
      if (offs.length === 0) cmpBody.append(el('p', 'muted', T.cmpNoOffsets))
      else {
        cmpBody.append(table([T.cmpColMark, T.cmpColN, T.cmpColOffset], offs.map((o) => [String(o.x_cm), String(o.n), pmText(o.mean_s, o.sem_s, lang)]), 'data-table an-table an-narrow'))
        cmpBody.append(el('p', 'muted', T.cmpOffsetsNote))
      }
    }

    function download(): void {
      if (!last) return
      const csv = (L() === 'es' ? '﻿' : '') + analysisCSV(last.result, { lang: L(), comparison: last.comparison, includeModel: opts.teacher })
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
      const a = el('a', undefined, undefined, { href: url, download: S().fileName })
      document.body.append(a); a.click(); a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    }

    return {
      update() {
        if (w.dirty()) { w.clear(); dirty = true }
        if (!dirty) return
        const d = app.tableData()
        const next = `${JSON.stringify(d.values_s)}|${app.getRuns().length}|${app.stopLog().length}|${L()}|${tangentFrac}`
        dirty = false
        if (next === sig) return
        sig = next
        render()
      },
      relabel() { sig = ''; dirty = true; taskPanel.relabel() },
      destroy() {
        for (const h of handles) h.destroy()
        offTasks(); taskPanel.destroy(); themeObserver.disconnect(); dark.removeEventListener('change', onScheme); ro.disconnect(); w.off(); c.root.remove()
      },
    }
  }
}
