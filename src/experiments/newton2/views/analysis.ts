// Analysis panel (guide tasks 1 to 8). Reads Tabla 3.1 through the analysis layer (which calls the physics layer); this view only lays
// the numbers out and draws them. Updates live as the table fills. The explanation questions (1, 4, what the slope means, 7, 8) are
// shown as prompts for the student: nothing here answers them. Hidden by the shell with ?analysis=0.
import uPlot from 'uplot'
import 'uplot/dist/uPlot.min.css'
import type { MountView, View } from './view.ts'
import { button, card, el, watch } from '../../../core/views/dom.ts'
import { strings } from './strings/analysis.ts'
import { analysisFromApparatus } from '../analysis/fromApparatus.ts'
import { analysisCSV } from '../analysis/csv.ts'
import type { AnalysisResult } from '../analysis/compute.ts'
import { numText, pmText } from '../../../core/views/format.ts'
import { readPalette, type Palette } from '../../../core/views/analysisPlots.ts'
import { fmt } from '../../../core/pedagogy/dom.ts'

export interface AnalysisOptions {
  /** Teacher mode (?teacher): point to the teacher key. */
  teacher: boolean
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
    const L = () => ctx.lang()
    const w = watch(app)
    const c = card('analysis', S().title, 'card-analysis')
    c.root.dataset.region = 'analysis'
    root.append(c.root)

    const section = (cls: string): { root: HTMLElement; h: HTMLElement; body: HTMLElement } => {
      const s = el('section', `an-sec ${cls}`)
      const h = el('h3', 'sub-title')
      const body = el('div', 'an-body')
      s.append(h, body)
      return { root: s, h, body }
    }
    const intro = el('p', 'muted')
    const status = el('p', 'readout-text', undefined, { 'aria-live': 'polite' })
    const s1 = section('an-t1'), s23 = section('an-t23'), s4 = section('an-t4'), s5 = section('an-t5'), s6 = section('an-t6'), s78 = section('an-t78')
    const t1Body = el('p', 'note'), t4Body = el('p', 'note'), t78Body = el('p', 'note')
    s1.body.append(t1Body); s4.body.append(t4Body); s78.body.append(t78Body)
    const t23Intro = el('p', 'muted'), t23Host = el('div'), uncNote = el('p', 'muted'), reactNote = el('p', 'muted')
    s23.body.append(t23Intro, t23Host, uncNote, reactNote)
    const gate5 = el('p', 'note'), t5Intro = el('p', 'muted'), plotHost = el('div', 'plot')
    const fitPair = el('div', 'an-pair an-fit')
    const fitCard = (): { root: HTMLElement; cap: HTMLElement; val: HTMLElement } => {
      const root = el('p', 'fit-card'), cap = el('span', 'fit-cap'), val = el('span', 'fit-val')
      root.append(cap, val)
      return { root, cap, val }
    }
    const slopeC = fitCard(), interC = fitCard()
    fitPair.append(slopeC.root, interC.root)
    const errNote = el('p', 'muted')
    const legend2 = el('ul', 'an-legend an-legend-keys')
    const legPts = el('li'), legFit = el('li')
    legend2.append(legPts, legFit)
    const chi2 = el('p', 'readout-text'), chi2Hint = el('p', 'muted'), t5Prompt = el('p', 'note')
    s5.body.append(gate5, t5Intro, plotHost, errNote, legend2, fitPair, chi2, chi2Hint, t5Prompt)
    const gate6 = el('p', 'note'), mFit = el('p', 'readout-text'), mMeas = el('p', 'readout-text'), errP = el('p', 'readout-value')
    const agree = el('p', 'readout-text'), t6Note = el('p', 'muted'), plasticNote = el('p', 'muted'), reactEff = el('p', 'muted')
    s6.body.append(gate6, mFit, mMeas, errP, agree, t6Note, plasticNote, reactEff)
    const teacherBox = el('div', 'note'), teacherTitle = el('strong'), teacherBody = el('span')
    teacherBox.append(teacherTitle, document.createTextNode(' '), teacherBody)
    teacherBox.hidden = !opts.teacher
    const exportBtn = button('', 'btn btn-quiet', () => download())
    const actions = el('div', 'table-actions')
    actions.append(exportBtn)
    c.body.append(intro, status, s1.root, s23.root, s4.root, s5.root, s6.root, s78.root, teacherBox, actions)

    let plot: uPlot | null = null
    let sig = ''
    let last: AnalysisResult | null = null
    let errSmall = false

    function download(): void {
      if (!last) return
      const csv = (L() === 'es' ? '﻿' : '') + analysisCSV(last, L())
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
      const a = el('a', undefined, undefined, { href: url, download: S().fileName })
      document.body.append(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    }

    function drawPlot(r: AnalysisResult): void {
      plot?.destroy(); plot = null; errSmall = false
      plotHost.replaceChildren()
      const f = r.fit
      const pts = r.points
      const width = Math.floor(plotHost.clientWidth)
      if (!f || pts.length < 2 || width < 120) return
      const T = S()
      const p: Palette = readPalette()
      const xs = [...pts].sort((a, b) => a.a_mps2 - b.a_mps2)
      const xMax = Math.max(...pts.map((q) => q.a_mps2 + q.u_a_mps2)) * 1.08
      const xv = [0, ...xs.map((q) => q.a_mps2), xMax]
      const yPts = [null, ...xs.map((q) => q.F_N), null]
      const yFit = xv.map((x) => f.M_kg * x + f.F0_N)
      const ink = getComputedStyle(plotHost).color // --label: hollow circles and bars read as data, the fit line is the accent
      const font = `12px ${p.font}`
      const axis = (label: string, size: number): uPlot.Axis => ({ stroke: p.text, grid: { stroke: p.grid, width: 1 }, ticks: { stroke: p.grid, width: 1 }, font, labelFont: font, labelSize: 18, label, size })
      plot = new uPlot({
        width, height: width < 480 ? 260 : 320, legend: { show: false }, cursor: { show: false }, select: { show: false, left: 0, top: 0, width: 0, height: 0 },
        scales: { x: { time: false, range: (_u, min, max) => [Math.min(0, min), max] }, y: { range: (_u, min, max) => [Math.min(0, min), max * 1.1] } },
        axes: [axis(T.axisA, 36), axis(T.axisF, 52)],
        series: [
          {},
          { label: T.legendPoints, stroke: ink, paths: () => null, points: { show: true, size: 8, width: 1.5, fill: 'transparent', stroke: ink }, spanGaps: false },
          { label: T.fitLine, stroke: p.accent, width: 2, points: { show: false } },
        ],
        hooks: {
          draw: [(u) => {
            const g = u.ctx
            g.save()
            const dpr = typeof devicePixelRatio === 'number' ? devicePixelRatio : 1
            const cap = 4 * dpr
            g.strokeStyle = ink
            g.lineWidth = 1.5 * dpr
            for (const q of xs) {
              const cx = u.valToPos(q.a_mps2, 'x', true), cy = u.valToPos(q.F_N, 'y', true)
              const x0 = u.valToPos(q.a_mps2 - q.u_a_mps2, 'x', true), x1 = u.valToPos(q.a_mps2 + q.u_a_mps2, 'x', true)
              const y0 = u.valToPos(q.F_N - q.u_F_N, 'y', true), y1 = u.valToPos(q.F_N + q.u_F_N, 'y', true)
              g.beginPath(); g.moveTo(x0, cy); g.lineTo(x1, cy); g.moveTo(cx, y0); g.lineTo(cx, y1)
              g.moveTo(x0, cy - cap); g.lineTo(x0, cy + cap); g.moveTo(x1, cy - cap); g.lineTo(x1, cy + cap)
              g.moveTo(cx - cap, y0); g.lineTo(cx + cap, y0); g.moveTo(cx - cap, y1); g.lineTo(cx + cap, y1); g.stroke()
            }
            g.restore()
          }],
        },
      }, [xv, yPts, yFit] as uPlot.AlignedData, plotHost)
      // bars shorter than the 4 px marker radius are hidden behind the circle: say so
      const pl = plot
      errSmall = xs.every((q) => Math.abs(pl.valToPos(q.F_N + q.u_F_N, 'y') - pl.valToPos(q.F_N, 'y')) < 4 && Math.abs(pl.valToPos(q.a_mps2 + q.u_a_mps2, 'x') - pl.valToPos(q.a_mps2, 'x')) < 4)
      plotHost.setAttribute('role', 'img')
      plotHost.setAttribute('aria-label', T.plotAria)
    }

    function labels(): void {
      const T = S()
      c.title.textContent = T.title
      intro.textContent = T.intro
      s1.h.textContent = T.t1; t1Body.textContent = T.t1Body
      s23.h.textContent = T.t23; t23Intro.textContent = T.t23Intro; uncNote.textContent = T.uncertaintyNote
      s4.h.textContent = T.t4; t4Body.textContent = T.t4Body
      s5.h.textContent = T.t5; t5Intro.textContent = T.t5Intro; gate5.textContent = T.gate5; t5Prompt.textContent = T.t5Prompt
      slopeC.cap.textContent = T.slopeCaption; interC.cap.textContent = T.interceptCaption
      errNote.textContent = T.errSmall
      legPts.replaceChildren(el('span', 'leg-mark leg-pt', undefined, { 'aria-hidden': 'true' }), document.createTextNode(T.legendPoints))
      legFit.replaceChildren(el('span', 'leg-mark leg-line', undefined, { 'aria-hidden': 'true' }), document.createTextNode(T.legendFit))
      chi2Hint.textContent = T.chi2Hint
      s6.h.textContent = T.t6; gate6.textContent = T.gate6; t6Note.textContent = T.t6Note; plasticNote.textContent = T.plasticNote
      s78.h.textContent = T.t78; t78Body.textContent = T.t78Body
      teacherTitle.textContent = T.teacherTitle; teacherBody.textContent = T.teacherBody
      exportBtn.textContent = T.exportCsv
    }

    function sync(): void {
      const T = S()
      const r = analysisFromApparatus(app)
      last = r
      const ready = r.trials.filter((t) => t.a_mps2 !== null && t.F_N !== null)
      status.textContent = fmt(T.status, { n: ready.length })
      // tasks 2 and 3
      t23Host.replaceChildren()
      const rows = r.trials.filter((t) => t.n > 0 || t.F_N !== null).map((t) => [
        String(t.row + 1),
        t.F_N === null ? '—' : numText(t.F_N, 2, L()),
        String(t.n),
        t.mean_s === null || t.uTotal_s === null ? (t.mean_s === null ? '—' : numText(t.mean_s, 2, L())) : pmText(t.mean_s, t.uTotal_s, L()),
        t.a_mps2 === null || t.u_a_mps2 === null ? '—' : pmText(t.a_mps2, t.u_a_mps2, L()),
      ])
      if (rows.length === 0) t23Host.append(el('p', 'note', T.gateTable))
      else t23Host.append(table([T.colTrial, T.colF, T.colN, T.colT, T.colA], rows))
      const re = r.reactionEffect
      reactNote.textContent = re ? fmt(T.reactionNote, { s: numText(re.shift_s, 3, L()), m: numText(re.dM_pct, 1, L()), f: numText(re.dF0_N, 3, L()) }) : ''
      reactNote.hidden = !re
      // task 5
      const f = r.fit
      gate5.hidden = f !== null
      for (const x of [t5Intro, plotHost, legend2, fitPair, chi2, chi2Hint, t5Prompt]) x.hidden = f === null
      if (f) {
        slopeC.val.textContent = fmt(T.slopeValue, { m: pmText(f.M_kg, f.sigma_M_kg, L()) })
        interC.val.textContent = fmt(T.interceptValue, { f: pmText(f.F0_N, f.sigma_F0_N, L()) })
        chi2.textContent = fmt(T.chi2, { c: f.fit.chi2_red === null ? '—' : numText(f.fit.chi2_red, 2, L()) })
      }
      // task 6
      const mc = r.massComparison
      gate6.hidden = mc !== null
      for (const x of [mFit, mMeas, errP, agree, t6Note, plasticNote]) x.hidden = mc === null
      reactEff.hidden = mc === null || re === null
      if (mc && f) {
        mFit.textContent = fmt(T.mFit, { m: pmText(f.M_kg, f.sigma_M_kg, L()) })
        mMeas.textContent = fmt(T.mMeasured, { m: pmText(mc.Mt_kg, mc.uMt_kg, L()) })
        errP.textContent = fmt(T.errorPct, { e: `${mc.error_pct < 0 ? '−' : '+'}${numText(Math.abs(mc.error_pct), 1, L())}` })
        agree.textContent = T.agreement[mc.comparison.verdict]
        if (re) reactEff.textContent = fmt(T.reactionEffect, { s: numText(re.shift_s, 3, L()), m: numText(re.dM_pct, 1, L()) })
      }
      exportBtn.disabled = r.trials.every((t) => t.n === 0)
      const key = `${L()}|${plotHost.clientWidth}|${JSON.stringify(r.points)}`
      if (key !== sig) { sig = key; drawPlot(r) }
      errNote.hidden = f === null || !errSmall
    }

    const ro = new ResizeObserver(() => { if (plotHost.clientWidth > 0 && plot && Math.abs(plot.width - plotHost.clientWidth) > 2) { sig = ''; w.touch() } })
    ro.observe(plotHost)
    labels()
    return {
      update() { if (w.dirty()) { w.clear(); sync() } },
      relabel() { labels(); sig = ''; w.touch() },
      destroy() { ro.disconnect(); plot?.destroy(); w.off(); c.root.remove() },
    }
  }
}
