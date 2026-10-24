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
  // Each trial is a block of three rows, so time, range and the computed values all fit a narrow column without sideways scroll:
  // a row of five times, a row of five ranges and a summary line (t, x and v0 with their uncertainties).
  const hr = el('tr')
  const corner = el('th', 'corner', undefined, { scope: 'col' })
  const kindCorner = el('th', 'col-head', undefined, { scope: 'col' })
  const repHeads: HTMLElement[] = []
  hr.append(corner, kindCorner)
  for (let k = 0; k < TABLE_REPS; k++) { const h = el('th', 'col-head', undefined, { scope: 'col' }); repHeads.push(h); hr.append(h) }
  thead.append(hr)
  const colgroup = el('colgroup')
  colgroup.append(el('col', 'col-no'), el('col', 'col-kind'))
  for (let k = 0; k < TABLE_REPS; k++) colgroup.append(el('col'))
  const inputs: HTMLInputElement[][] = [] // [trial][col 0..9]: 0..4 times, 5..9 ranges
  const calcCells: HTMLElement[][] = [] // [trial][t_bar, x_bar, v0] (value spans)
  const calcKeys: HTMLElement[][] = [] // their labels
  const rowEls: HTMLElement[] = [] // one tbody per trial
  const kindHeads: HTMLElement[][] = [] // [trial][time, range]
  const bodies: HTMLElement[] = []
  const colOf = (j: number): { col: Col; rep: number } => (j < TABLE_REPS ? { col: 'time', rep: j } : { col: 'range', rep: j - TABLE_REPS })
  for (let r = 0; r < TABLE_TRIALS; r++) {
    const body = el('tbody', 'trial', undefined, { 'data-row': String(r) })
    rowEls[r] = body
    bodies.push(body)
    const trT = el('tr', 'row-time'), trX = el('tr', 'row-range'), trC = el('tr', 'row-calc')
    trT.append(el('th', 'row-head', String(r + 1), { scope: 'rowgroup', rowspan: '3' }))
    const kt = el('th', 'kind-head', undefined, { scope: 'row' }), kx = el('th', 'kind-head', undefined, { scope: 'row' })
    kindHeads[r] = [kt, kx]
    trT.append(kt); trX.append(kx)
    inputs[r] = []
    for (let j = 0; j < 2 * TABLE_REPS; j++) {
      const tr = j < TABLE_REPS ? trT : trX
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
    calcCells[r] = []; calcKeys[r] = []
    const sum = el('td', 'calc-line', undefined, { colspan: String(TABLE_REPS + 1) })
    const flex = el('div', 'calc-flex')
    sum.append(flex)
    for (let k = 0; k < 3; k++) {
      const item = el('span', 'calc-item'), key = el('span', 'calc-k'), val = el('span', 'calc-v', '—')
      item.append(key, val); flex.append(item)
      calcKeys[r]![k] = key; calcCells[r]![k] = val
    }
    trC.append(sum)
    body.append(trT, trX, trC)
  }
  table.append(caption, colgroup, thead, ...bodies)
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
    rowEls.forEach((tb, r) => { tb.classList.toggle('current', r === getTrial()); if (r === getTrial()) tb.setAttribute('aria-current', 'true'); else tb.removeAttribute('aria-current') })
    for (const [b, t] of tabBtns) { t.classList.toggle('active', b === getBall()); t.setAttribute('aria-pressed', String(b === getBall())) }
    // roving tab stop: Tab enters the table at the active cell only (50 stops would trap the keyboard); the arrow keys and Enter move inside it
    for (let r = 0; r < TABLE_TRIALS; r++) for (let j = 0; j < 2 * TABLE_REPS; j++) {
      const cur = r === getTrial() && colOf(j).rep === getRep()
      inputs[r]![j]!.classList.toggle('current-cell', cur)
      inputs[r]![j]!.tabIndex = cur && j < TABLE_REPS ? 0 : -1
    }
  }
  const offUi = onUiState(() => { paintActive(); w.touch() })

  function labels(): void {
    const T = S()
    c.title.textContent = T.title
    tabs.setAttribute('aria-label', T.tabs)
    for (const [b, t] of tabBtns) t.textContent = T.balls[b]
    caption.textContent = T.caption
    corner.textContent = T.colTrial
    kindCorner.textContent = T.kindHead
    for (const [kt, kx] of kindHeads) { kt!.textContent = T.kindTime; kt!.title = T.groupTime; kx!.textContent = T.kindRange; kx!.title = T.groupRange }
    for (const keys of calcKeys) { keys[0]!.textContent = T.calcTime; keys[1]!.textContent = T.calcRange; keys[2]!.textContent = T.calcSpeed }
    repHeads.forEach((h, k) => { h.textContent = fill(T.repHead, { n: k + 1 }) })
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
