// Tablas 4.1 / 4.2 / 4.3: raw cells typed by the student or copied from the instruments. Means come from the pure analysis; nothing else
// is computed here. The active cell is where the next copied reading goes (uistate.ts).
import { BAR_ORDER, FACE_ORDER, MASS_STEPS, T43_TRIALS, T4_READINGS, type FrictionApparatus } from '../apparatus/index.ts'
import { forceRow } from '../analysis/compute.ts'
import { inputFromApparatus } from '../analysis/fromApparatus.ts'
import { tablesCSV } from '../analysis/csv.ts'
import { roundWithUncertainty } from '../../../core/physics/index.ts'
import { advanceCell, getCell, onUiState, setCell } from './uistate.ts'
import type { MountView, View } from './view.ts'
import { button, card, el, watch } from '../../../core/views/dom.ts'
import { fmt } from '../../../core/pedagogy/dom.ts'
import { formatNum } from '../../../core/views/numfmt.ts'
import { strings } from './strings/table.ts'

function download(name: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url; a.download = name
  document.body.append(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function mountForceTable(table: '4.1' | '4.2'): MountView {
  return (root, ctx): View => {
    const app: FrictionApparatus = ctx.apparatus
    const S = () => strings[ctx.lang()]
    const w = watch(app)
    const c = card(`table${table}`, '', 'card-table')
    const intro = el('p', 'muted')
    const scroll = el('div', 'table-scroll')
    const tbl = el('table', 'data-table', undefined, { 'data-table': table })
    scroll.append(tbl)
    const actions = el('div', 'table-actions')
    const clear = button('', 'btn btn-sm', () => { const a = getCell(table); app.tableClearCell(table, a.row, a.col); ctx.changed() })
    const clearAll = button('', 'btn btn-sm', () => { app.tableClear(); ctx.changed() })
    const csv = button('', 'btn btn-sm', () => download(`rozamiento-tablas-${ctx.lang()}.csv`, tablesCSV(app.tableData(), ctx.lang())))
    actions.append(clear, clearAll, csv)
    c.body.append(intro, scroll, actions)
    root.append(c.root)
    const inputs = new Map<string, HTMLInputElement>()
    const means = new Map<number, HTMLElement>()
    const rows = table === '4.1' ? FACE_ORDER.length * MASS_STEPS : FACE_ORDER.length

    function build(): void {
      const T = S()
      c.title.textContent = table === '4.1' ? T.title41 : T.title42
      intro.textContent = table === '4.1' ? T.intro41 : T.intro42
      clear.textContent = T.clear; clearAll.textContent = T.clearAll; csv.textContent = T.csv
      tbl.replaceChildren(); inputs.clear(); means.clear()
      const head = el('tr')
      head.append(el('th', 'corner', table === '4.1' ? T.massCol : T.faceCol, { scope: 'col' }))
      for (let n = 0; n < T4_READINGS; n++) head.append(el('th', 'col-head', fmt(T.reading, { n: n + 1 }), { scope: 'col' }))
      head.append(el('th', 'col-head', T.mean, { scope: 'col' }))
      const thead = el('thead'); thead.append(head); tbl.append(thead)
      const body = el('tbody')
      for (let r = 0; r < rows; r++) {
        const face = FACE_ORDER[table === '4.1' ? Math.floor(r / MASS_STEPS) : r]!
        const label = table === '4.1' ? `${T.face[face]} · ${fmt(T.massVal, { g: (r % MASS_STEPS) * 50 })}` : T.face[face]
        const tr = el('tr')
        tr.append(el('th', 'row-head', label, { scope: 'row' }))
        for (let k = 0; k < T4_READINGS; k++) {
          const td = el('td')
          const inp = el('input', 'cell', undefined, { type: 'text', inputmode: 'decimal', autocomplete: 'off', 'aria-label': fmt(T.cellAria, { t: table, row: label, n: k + 1 }) })
          inp.addEventListener('focus', () => setCell(table, r, k))
          inp.addEventListener('change', () => {
            if (inp.value.trim() === '') app.tableClearCell(table, r, k)
            else app.tableSetForce(table, r, k, inp.value)
            ctx.changed()
          })
          inputs.set(`${r}-${k}`, inp)
          td.append(inp); tr.append(td)
        }
        const m = el('td', 'calc-line')
        means.set(r, m); tr.append(m)
        body.append(tr)
      }
      tbl.append(body)
      sync(true)
    }

    function sync(force = false): void {
      const data = app.tableData()
      const src = table === '4.1' ? data.t41 : data.t42
      const inp = inputFromApparatus(app)
      const cur = getCell(table)
      for (let r = 0; r < rows; r++) {
        for (let k = 0; k < T4_READINGS; k++) {
          const i = inputs.get(`${r}-${k}`)!
          const cell = src[r]![k]!
          const txt = cell.F_N === null ? '' : formatNum(cell.F_N, 2, ctx.lang())
          if (document.activeElement !== i || force) i.value = txt
          i.classList.toggle('current-cell', cur.row === r && cur.col === k)
          i.classList.toggle('copied', cell.runId !== null)
          const expectedFace = FACE_ORDER[table === '4.1' ? Math.floor(r / MASS_STEPS) : r]!
          const expectedMass = table === '4.1' ? r % MASS_STEPS : 0
          const other = cell.setup !== null && (cell.setup.face !== expectedFace || cell.setup.addedMasses !== expectedMass)
          i.classList.toggle('warn', other)
          const note = other ? S().fromOther : cell.overRange ? S().overRange : ''
          if (note) i.title = note; else i.removeAttribute('title')
        }
        const row = forceRow((table === '4.1' ? inp.t41 : inp.t42)[r]!)
        const m = means.get(r)!
        if (!row) m.textContent = ''
        else {
          const q = roundWithUncertainty(row.mean, row.dF_N)
          m.textContent = `${ctx.lang() === 'es' ? q.valueText.replace('.', ',') : q.valueText} ± ${ctx.lang() === 'es' ? q.sigmaText.replace('.', ',') : q.sigmaText}`
        }
      }
    }
    build()
    const offUi = onUiState(() => w.touch())
    return {
      update() { if (w.dirty()) { w.clear(); sync() } },
      relabel() { build() },
      focus(targets) { c.root.classList.toggle('focus', !!targets && targets.length > 0) },
      destroy() { w.off(); offUi(); c.root.remove() },
    }
  }
}

export const mountTable43: MountView = (root, ctx): View => {
  const app = ctx.apparatus
  const S = () => strings[ctx.lang()]
  const w = watch(app)
  const c = card('table4.3', '', 'card-table')
  const intro = el('p', 'muted')
  const scroll = el('div', 'table-scroll')
  const tbl = el('table', 'data-table', undefined, { 'data-table': '4.3' })
  scroll.append(tbl)
  const actions = el('div', 'table-actions')
  const copyH = button('', 'btn btn-sm', () => { const a = getCell('4.3'); app.tableCopyHeight(a.row, a.col); ctx.changed() })
  const copyT = button('', 'btn btn-sm', () => {
    const a = getCell('4.3')
    const r = app.tableCopyTime(a.row, a.col, ctx.now())
    if (r.ok) advanceCell('4.3')
    ctx.changed()
  })
  const clear = button('', 'btn btn-sm', () => { const a = getCell('4.3'); app.tableClearCell('4.3', a.row, a.col * 2); app.tableClearCell('4.3', a.row, a.col * 2 + 1); ctx.changed() })
  const csv = button('', 'btn btn-sm', () => download(`rozamiento-tablas-${ctx.lang()}.csv`, tablesCSV(app.tableData(), ctx.lang())))
  actions.append(copyH, copyT, clear, csv)
  c.body.append(intro, scroll, actions)
  root.append(c.root)
  const hs = new Map<string, HTMLInputElement>(), ts = new Map<string, HTMLInputElement>()

  function build(): void {
    const T = S()
    c.title.textContent = T.title43
    intro.textContent = T.intro43
    copyH.textContent = T.copyH; copyT.textContent = T.copyT; clear.textContent = T.clear; csv.textContent = T.csv
    tbl.replaceChildren(); hs.clear(); ts.clear()
    const head = el('tr')
    head.append(el('th', 'corner', T.trial, { scope: 'col' }), el('th', 'col-head', T.heightCol, { scope: 'col' }), el('th', 'col-head', T.timeCol, { scope: 'col' }))
    const thead = el('thead'); thead.append(head); tbl.append(thead)
    BAR_ORDER.forEach((bar, bi) => {
      const tb = el('tbody')
      const hr = el('tr')
      hr.append(el('th', 'kind-head', T.bar[bar], { scope: 'colgroup', colspan: '3' }))
      tb.append(hr)
      for (let i = 0; i < T43_TRIALS; i++) {
        const tr = el('tr')
        tr.append(el('th', 'row-head', String(i + 1), { scope: 'row' }))
        for (const kind of ['h', 't'] as const) {
          const td = el('td')
          const inp = el('input', 'cell', undefined, { type: 'text', inputmode: 'decimal', autocomplete: 'off', 'aria-label': fmt(kind === 'h' ? T.cellAriaH : T.cellAriaT, { bar: T.bar[bar], n: i + 1 }) })
          inp.addEventListener('focus', () => setCell('4.3', bi, i))
          inp.addEventListener('change', () => {
            if (inp.value.trim() === '') app.tableClearCell('4.3', bi, i * 2 + (kind === 'h' ? 0 : 1))
            else if (kind === 'h') app.tableSetHeight(bi, i, inp.value)
            else app.tableSetTime(bi, i, inp.value)
            ctx.changed()
          })
          ;(kind === 'h' ? hs : ts).set(`${bi}-${i}`, inp)
          td.append(inp); tr.append(td)
        }
        tb.append(tr)
      }
      tbl.append(tb)
    })
    sync(true)
  }
  function sync(force = false): void {
    const data = app.tableData().t43
    const cur = getCell('4.3')
    BAR_ORDER.forEach((_, bi) => {
      for (let i = 0; i < T43_TRIALS; i++) {
        const cell = data[bi]![i]!
        const hi = hs.get(`${bi}-${i}`)!, ti = ts.get(`${bi}-${i}`)!
        if (document.activeElement !== hi || force) hi.value = cell.h_m === null ? '' : formatNum(cell.h_m, 3, ctx.lang())
        if (document.activeElement !== ti || force) ti.value = cell.t_s === null ? '' : formatNum(cell.t_s, 2, ctx.lang())
        for (const x of [hi, ti]) x.classList.toggle('current-cell', cur.row === bi && cur.col === i)
        hi.classList.toggle('copied', cell.hTrialId !== null)
        ti.classList.toggle('copied', cell.tTrialId !== null)
      }
    })
  }
  build()
  const offUi = onUiState(() => w.touch())
  return {
    update() { if (w.dirty()) { w.clear(); sync() } },
    relabel() { build() },
    focus(targets) { c.root.classList.toggle('focus', !!targets && targets.length > 0) },
    destroy() { w.off(); offUi(); c.root.remove() },
  }
}
