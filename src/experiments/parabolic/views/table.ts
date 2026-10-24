// Tabla 2.1 panel: one table per ball, 5 trials (No. = rail mark) x 5 repetitions of time t [s] and range x [m]. Cells are inputs;
// values go through the apparatus table methods. The mean / error / speed columns come from the pure analysis layer (analysis/compute.ts).
import { BALL_IDS, TABLE_REPS, TABLE_TRIALS, type BallId } from '../apparatus/index.ts'
import type { MountView, View } from './view.ts'
import { button, card, el, watch } from '../../../core/views/dom.ts'
import { onPress } from '../../../core/views/press.ts'
import { copyRange, copyTime } from './copyReading.ts'
import { formatRange, formatTime, tableCsv } from './format.ts'
import { reasonText } from './reasons.ts'
import { getBall, getRep, getTrial, onUiState, setBall, setCell } from './uistate.ts'
import { strings } from './strings/table.ts'
import { ballAnalysis } from '../analysis/fromApparatus.ts'
import { pmText } from '../../../core/views/format.ts'

type Col = 'time' | 'range'
const fill = (tpl: string, vars: Record<string, string | number>): string => tpl.replace(/\{(\w+)\}/g, (_m, k: string) => String(vars[k] ?? ''))

export const mountTable: MountView = (root, ctx): View => {
  const app = ctx.apparatus
  const S = () => strings[ctx.lang()]
  const L = () => ctx.lang()
  const w = watch(app)
  const c = card('table', S().title, 'card-table')
  root.append(c.root)

  // ball tabs
  const tabs = el('div', 'seg', undefined, { role: 'group' })
  const tabBtns = new Map<BallId, HTMLButtonElement>()
  for (const b of BALL_IDS) {
    const t = button('', 'seg-btn', () => setBall(b))
    tabBtns.set(b, t)
    tabs.append(t)
  }
  // active cell and copy helpers
  const active = el('p', 'readout-text', undefined, { 'aria-live': 'polite' })
  const copyRow = el('div', 'inline-row')
  const copyTimeBtn = button('', 'btn btn-primary')
  const copyRangeBtn = button('', 'btn btn-quiet', () => { msg.textContent = copyRange(ctx).message; w.touch() })
  copyRow.append(copyTimeBtn, copyRangeBtn)
  const copyHint = el('p', 'muted')
  const msg = el('p', 'readout-text msg', undefined, { 'aria-live': 'polite' })
  const filled = el('p', 'muted')

  // the grid: rows = trials, columns = 5 times then 5 ranges
  const scroll = el('div', 'table-scroll', undefined, { tabindex: '-1' })
  const table = el('table', 'data-table data-table-p2')
  const caption = el('caption', 'visually-hidden')
  const thead = el('thead')
  const hr1 = el('tr'), hr2 = el('tr')
  const corner = el('th', 'corner', undefined, { scope: 'col', rowspan: '2' })
  const gTime = el('th', 'col-head col-group', undefined, { scope: 'colgroup', colspan: String(TABLE_REPS) })
  const gRange = el('th', 'col-head col-group', undefined, { scope: 'colgroup', colspan: String(TABLE_REPS) })
  const calcHeads = [el('th', 'col-head col-calc', undefined, { scope: 'col', rowspan: '2' }), el('th', 'col-head col-calc', undefined, { scope: 'col', rowspan: '2' }), el('th', 'col-head col-calc', undefined, { scope: 'col', rowspan: '2' })]
  hr1.append(corner, gTime, gRange, ...calcHeads)
  const repHeads: HTMLElement[] = []
  for (let k = 0; k < 2 * TABLE_REPS; k++) { const h = el('th', 'col-head', undefined, { scope: 'col' }); repHeads.push(h); hr2.append(h) }
  thead.append(hr1, hr2)
  const tbody = el('tbody')
  const inputs: HTMLInputElement[][] = [] // [trial][col 0..9]
  const calcCells: HTMLElement[][] = [] // [trial][t_bar, x_bar, v0]
  const rowEls: HTMLElement[] = []
  const rowHeads: HTMLElement[] = []
  const colOf = (j: number): { col: Col; rep: number } => (j < TABLE_REPS ? { col: 'time', rep: j } : { col: 'range', rep: j - TABLE_REPS })
  for (let r = 0; r < TABLE_TRIALS; r++) {
    const tr = el('tr', undefined, undefined, { 'data-row': String(r) })
    rowEls[r] = tr
    const rh = el('th', 'row-head', String(r + 1), { scope: 'row' })
    rowHeads[r] = rh
    tr.append(rh)
    inputs[r] = []
    for (let j = 0; j < 2 * TABLE_REPS; j++) {
      const td = el('td')
      const inp = el('input', 'cell', undefined, { type: 'text', inputmode: 'decimal', autocomplete: 'off', spellcheck: 'false', 'data-r': String(r), 'data-c': String(j) })
      inp.addEventListener('input', () => { inp.dataset.dirty = '1'; inp.removeAttribute('aria-invalid') })
      inp.addEventListener('change', () => commit(r, j))
      inp.addEventListener('focus', () => { setCell(r, colOf(j).rep); clearBtn.disabled = false })
      inp.addEventListener('keydown', (e) => onKey(e, r, j))
      td.append(inp)
      tr.append(td)
      inputs[r]![j] = inp
    }
    calcCells[r] = []
    for (let k = 0; k < 3; k++) { const td = el('td', 'calc-cell', '—'); calcCells[r]![k] = td; tr.append(td) }
    tbody.append(tr)
  }
  table.append(caption, thead, tbody)
  scroll.append(table)
  const calcNote = el('p', 'muted')

  const actions = el('div', 'table-actions')
  const clearBtn = button('', 'btn btn-quiet', () => {
    app.tableClearCell(getBall(), getTrial(), getRep())
    for (const j of [getRep(), getRep() + TABLE_REPS]) inputs[getTrial()]![j]!.dataset.dirty = ''
    ctx.changed(); w.touch()
  })
  clearBtn.disabled = true
  const clearAllBtn = button('', 'btn btn-quiet', () => { confirmBox.hidden = false; yesBtn.focus() })
  const exportBtn = button('', 'btn btn-quiet', () => download())
  actions.append(clearBtn, clearAllBtn, exportBtn)
  const confirmBox = el('div', 'confirm', undefined, { role: 'alertdialog' })
  confirmBox.hidden = true
  const confirmText = el('p')
  const yesBtn = button('', 'btn btn-danger', () => {
    app.tableClear(getBall()); confirmBox.hidden = true
    for (const row of inputs) for (const i of row) i.dataset.dirty = ''
    msg.textContent = S().cleared; ctx.changed(); w.touch()
  })
  const noBtn = button('', 'btn btn-quiet', () => { confirmBox.hidden = true; clearAllBtn.focus() })
  confirmBox.append(confirmText, yesBtn, noBtn)
  confirmBox.addEventListener('keydown', (e) => { if (e.key === 'Escape') noBtn.click() })
  const kb = el('p', 'muted')
  c.body.append(tabs, active, copyRow, copyHint, msg, filled, scroll, calcNote, actions, confirmBox, kb)

  onPress(copyTimeBtn, (t) => { msg.textContent = copyTime(ctx, t).message; w.touch() })

  /** Type a value into a cell. An emptied cell clears that column only (the other one is written back). */
  function commit(r: number, j: number): void {
    const inp = inputs[r]![j]!
    const text = inp.value.trim()
    const { col, rep } = colOf(j)
    const ball = getBall()
    const d = app.tableData(ball)
    inp.dataset.dirty = ''
    if (text === '') {
      const had = (col === 'time' ? d.t_s : d.x_m)[r]![rep] !== null
      if (had) {
        const other = col === 'time' ? d.x_m[r]![rep]! : d.t_s[r]![rep]!
        app.tableClearCell(ball, r, rep)
        if (other !== null) { if (col === 'time') app.tableSetRange(ball, r, rep, other); else app.tableSetTime(ball, r, rep, other) }
      }
      msg.textContent = ''
      ctx.changed(); w.touch()
      return
    }
    const res = col === 'time' ? app.tableSetTime(ball, r, rep, text) : app.tableSetRange(ball, r, rep, text)
    if (!res.ok) {
      inp.setAttribute('aria-invalid', 'true')
      inp.dataset.dirty = '1'
      msg.textContent = reasonText(L(), res.reason)
    } else {
      inp.removeAttribute('aria-invalid')
      msg.textContent = ''
    }
    ctx.changed(); w.touch()
  }

  function focusCell(r: number, j: number): void {
    const rr = Math.max(0, Math.min(TABLE_TRIALS - 1, r)), jj = Math.max(0, Math.min(2 * TABLE_REPS - 1, j))
    const t = inputs[rr]![jj]!
    t.focus(); t.select()
  }
  function onKey(e: KeyboardEvent, r: number, j: number): void {
    const inp = inputs[r]![j]!
    if (e.key === 'Enter') { e.preventDefault(); commit(r, j); focusCell(r + (e.shiftKey ? -1 : 1), j) }
    else if (e.key === 'ArrowDown') { e.preventDefault(); focusCell(r + 1, j) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); focusCell(r - 1, j) }
    else if (e.key === 'ArrowRight' && inp.selectionStart === inp.value.length && inp.selectionEnd === inp.value.length) { e.preventDefault(); focusCell(r, j + 1) }
    else if (e.key === 'ArrowLeft' && inp.selectionStart === 0 && inp.selectionEnd === 0) { e.preventDefault(); focusCell(r, j - 1) }
    else if (e.key === 'Escape') { inp.dataset.dirty = ''; inp.removeAttribute('aria-invalid'); msg.textContent = ''; w.touch() }
  }

  function download(): void {
    const ball = getBall()
    const csv = (L() === 'es' ? '﻿' : '') + tableCsv(app.tableData(ball), L())
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = el('a', undefined, undefined, { href: url, download: fill(S().fileName, { ball: S().balls[ball].toLowerCase().replace(/[^a-z]+/g, '-').replace(/-$/, '') }) })
    document.body.append(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const paintActive = (): void => {
    const T = S()
    active.textContent = fill(T.active, { ball: T.balls[getBall()], t: getTrial() + 1, r: getRep() + 1 })
    rowEls.forEach((tr, r) => { tr.classList.toggle('current', r === getTrial()); if (r === getTrial()) tr.setAttribute('aria-current', 'true'); else tr.removeAttribute('aria-current') })
    for (const [b, t] of tabBtns) { t.classList.toggle('active', b === getBall()); t.setAttribute('aria-pressed', String(b === getBall())) }
    for (let r = 0; r < TABLE_TRIALS; r++) for (let j = 0; j < 2 * TABLE_REPS; j++) inputs[r]![j]!.classList.toggle('current-cell', r === getTrial() && colOf(j).rep === getRep())
  }
  const offUi = onUiState(() => { paintActive(); w.touch() })

  function labels(): void {
    const T = S()
    c.title.textContent = T.title
    tabs.setAttribute('aria-label', T.tabs)
    for (const [b, t] of tabBtns) t.textContent = T.balls[b]
    caption.textContent = T.caption
    corner.textContent = T.colTrial
    gTime.textContent = T.groupTime; gRange.textContent = T.groupRange
    calcHeads[0]!.textContent = T.calcTime; calcHeads[1]!.textContent = T.calcRange; calcHeads[2]!.textContent = T.calcSpeed
    repHeads.forEach((h, k) => { h.textContent = fill(T.repHead, { n: (k % TABLE_REPS) + 1 }) })
    calcNote.textContent = T.calcNote
    copyTimeBtn.textContent = T.copyTime
    copyRangeBtn.textContent = T.copyRange
    copyHint.textContent = T.copyHint
    clearBtn.textContent = T.clearCell
    clearAllBtn.textContent = T.clearTable
    exportBtn.textContent = T.exportCsv
    confirmText.textContent = T.clearAsk
    yesBtn.textContent = T.clearYes
    noBtn.textContent = T.cancel
    kb.textContent = T.keyboard
    paintActive()
  }
  function cellAria(): void {
    const T = S()
    for (let r = 0; r < TABLE_TRIALS; r++) for (let j = 0; j < 2 * TABLE_REPS; j++) {
      const { col, rep } = colOf(j)
      inputs[r]![j]!.setAttribute('aria-label', fill(T.cellAria, { what: col === 'time' ? T.groupTime : T.groupRange, ball: T.balls[getBall()], t: r + 1, r: rep + 1 }))
    }
  }

  function sync(): void {
    const T = S()
    const d = app.tableData(getBall())
    let n = 0
    for (let r = 0; r < TABLE_TRIALS; r++) for (let j = 0; j < 2 * TABLE_REPS; j++) {
      const inp = inputs[r]![j]!
      const { col, rep } = colOf(j)
      const v = col === 'time' ? d.t_s[r]![rep]! : d.x_m[r]![rep]!
      if (v !== null) n++
      if (inp.dataset.dirty !== '1') inp.value = col === 'time' ? formatTime(v, L()) : formatRange(v, L())
      const cellData = d.cells[r]![rep]!
      const copied = col === 'time' ? cellData.timeStopId !== null : cellData.rangeCarbonId !== null
      inp.classList.toggle('copied', copied)
      if (copied) inp.title = T.copiedMark; else inp.removeAttribute('title')
    }
    const an = ballAnalysis(app, getBall())
    an.trials.forEach((t, r) => {
      const set = (k: number, text: string | null): void => { calcCells[r]![k]!.textContent = text ?? '—' }
      set(0, t.t_s !== null && t.u_t_s !== null ? pmText(t.t_s, t.u_t_s, L()) : null)
      set(1, t.x_m !== null && t.u_x_m !== null ? pmText(t.x_m, t.u_x_m, L()) : null)
      set(2, t.v0_mps !== null && t.u_v0_mps !== null ? pmText(t.v0_mps, t.u_v0_mps, L()) : null)
    })
    filled.textContent = fill(T.filled, { n, total: TABLE_TRIALS * TABLE_REPS * 2 })
    cellAria()
    paintActive()
  }

  labels()
  return {
    update() { if (w.dirty()) { w.clear(); sync() } },
    relabel() { labels(); for (const row of inputs) for (const i of row) i.dataset.dirty = ''; w.touch() },
    destroy() { offUi(); w.off(); c.root.remove() },
  }
}
