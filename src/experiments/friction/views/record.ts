// Reference record (step "Registro"): the true force trace of each pull as a sensor would log it, and the true onset height and slide time
// of each bar trial. Hidden with ?reference=0 (main.ts does not mount it). The view draws numbers the apparatus returns.
import type { MountView, View } from './view.ts'
import { card, el, nextId, watch } from '../../../core/views/dom.ts'
import { fmt } from '../../../core/pedagogy/dom.ts'
import { formatNum } from '../../../core/views/numfmt.ts'
import { linePlot } from './plot.ts'
import { strings } from './strings/record.ts'

export const mountRecord: MountView = (root, ctx): View => {
  const app = ctx.apparatus
  const S = () => strings[ctx.lang()]
  const w = watch(app)
  const c = card('record', S().title, 'card-record')
  c.root.dataset.region = 'record'
  const intro = el('p', 'muted')
  const selId = nextId('rec')
  const selRow = el('div', 'rec-sel')
  const selLabel = el('label', 'readout-label', undefined, { for: selId })
  const sel = el('select', 'tb-select', undefined, { id: selId })
  selRow.append(selLabel, sel)
  const setup = el('p', 'readout-text')
  const plot = el('div', 'plot-wrap')
  const peak = el('p', 'readout-text')
  const trialsHead = el('h3', 'sub-title')
  const trials = el('div', 'table-scroll')
  c.body.append(intro, selRow, setup, plot, peak, trialsHead, trials)
  root.append(c.root)
  let selected = 0

  sel.addEventListener('change', () => { selected = Number(sel.value); w.touch() })

  function render(): void {
    const T = S()
    const lang = ctx.lang()
    c.title.textContent = T.title
    intro.textContent = T.intro
    selLabel.textContent = T.pullSel
    const runs = app.getPullRuns()
    sel.replaceChildren()
    runs.forEach((r) => sel.append(el('option', undefined, fmt(T.pullOpt, { n: r.id, face: T.face[r.setup.face], g: r.setup.addedMasses * 50, s: r.setup.scale === '1N' ? 1 : 2 }), { value: String(r.id) })))
    if (runs.length && !runs.some((r) => r.id === selected)) selected = runs[runs.length - 1]!.id
    sel.value = String(selected)
    sel.hidden = runs.length === 0
    plot.replaceChildren(); setup.textContent = ''; peak.textContent = runs.length ? '' : T.noPulls
    const ref = runs.length ? app.referencePull(selected) : null
    const rec = runs.find((r) => r.id === selected)
    if (ref && rec) {
      setup.textContent = fmt(T.setup, { face: T.face[ref.setup.face], g: ref.setup.addedMasses * 50, paper: T.paper[ref.setup.paper], zero: ref.setup.scaleZeroed ? T.scaleZeroed : T.scaleNotZeroed })
      const fmax = Math.max(...ref.F_N, ref.Fs_N, 0.1)
      plot.append(linePlot({
        aria: T.plotAria, xLabel: T.axisT, yLabel: T.axisF, lang, xMax: Math.max(ref.t_s[ref.t_s.length - 1] ?? 1, 1), yMax: fmax * 1.1,
        series: [{ kind: 'line', cls: 'plot-s1', pts: ref.t_s.map((t, i) => [t, ref.F_N[i]!] as [number, number]) }],
        hlines: [{ y: ref.Fs_N, cls: 'plot-h1', label: T.lineFs }, { y: ref.Fk_N, cls: 'plot-h2', label: T.lineFk }],
      }))
      peak.textContent = ref.summary.F_breakaway_N === null ? T.noBreak : fmt(T.peak, { f: formatNum(ref.summary.F_breakaway_N, 3, lang) })
    }
    // trials
    trialsHead.textContent = T.trialsHead
    trials.replaceChildren()
    const ts = app.getTrials()
    if (!ts.length) { trials.append(el('p', 'muted', T.noTrials)); return }
    const tbl = el('table', 'data-table')
    const head = el('tr')
    for (const h of [T.colBar, T.colTrial, T.colH, T.colT, T.colMus, T.colMuk]) head.append(el('th', 'col-head', h, { scope: 'col' }))
    const thead = el('thead'); thead.append(head); tbl.append(thead)
    const body = el('tbody')
    for (const t of ts) {
      const r = app.referenceTrial(t.id)!
      const tr = el('tr')
      tr.append(el('th', 'row-head', T.bar[t.bar], { scope: 'row' }), el('td', 'calc-line', String(t.id)),
        el('td', 'calc-line', r.onsetH_m === null ? T.noSlip : formatNum(r.onsetH_m, 3, lang)), el('td', 'calc-line', r.slideTime_s === null ? '–' : formatNum(r.slideTime_s, 2, lang)),
        el('td', 'calc-line', formatNum(r.mu_s, 3, lang)), el('td', 'calc-line', formatNum(r.mu_k, 3, lang)))
      body.append(tr)
    }
    tbl.append(body); trials.append(tbl)
  }
  return {
    update() { if (w.dirty()) { w.clear(); render() } },
    relabel() { w.touch() },
    destroy() { w.off(); c.root.remove() },
  }
}
