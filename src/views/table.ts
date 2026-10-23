// Table 1.1 panel: 10 positions x 10 timings. Cells are inputs; values go through Apparatus.tableSet.
import { TABLE_COLS, TABLE_POSITIONS_cm, TABLE_ROWS } from '../apparatus/index.ts'
import type { MountView, View } from './view.ts'
import { button, card, el, watch } from './dom.ts'
import { toCSV } from './csv.ts'
import { formatCell } from './numfmt.ts'
import { reasonText } from './reasons.ts'
import { copyReading } from './copyReading.ts'
import { onPress } from './press.ts'
import { getMarkRow, onMarkRow, setMarkRow } from './uistate.ts'
import { strings } from './strings/table.ts'

export const mountTable: MountView = (root, ctx): View => {
  const app = ctx.apparatus
  const S = () => strings[ctx.lang()]
  const L = () => ctx.lang()
  const w = watch(app)
  const c = card('table', S().title, 'card-table')
  root.append(c.root)

  const tools = el('div', 'table-tools')
  const copyBtn = button('', 'btn btn-primary')
  const copyHint = el('p', 'muted')
  tools.append(copyBtn)
  const msg = el('p', 'readout-text msg', undefined, { 'aria-live': 'polite' })
  const filled = el('p', 'muted')

  const scroll = el('div', 'table-scroll', undefined, { tabindex: '-1' })
  const table = el('table', 'data-table')
  const caption = el('caption', 'visually-hidden')
  const thead = el('thead')
  const hr = el('tr')
  const corner = el('th', 'corner', undefined, { scope: 'col' })
  hr.append(corner)
  for (let j = 0; j < TABLE_COLS; j++) hr.append(el('th', 'col-head', `t${j + 1}`, { scope: 'col' }))
  thead.append(hr)
  const tbody = el('tbody')
  const inputs: HTMLInputElement[][] = []
  const rowEls: HTMLElement[] = []
  for (let r = 0; r < TABLE_ROWS; r++) {
    const tr = el('tr', undefined, undefined, { 'data-row': String(r) })
    rowEls[r] = tr
    tr.append(el('th', 'row-head', String(TABLE_POSITIONS_cm[r]), { scope: 'row' }))
    inputs[r] = []
    for (let j = 0; j < TABLE_COLS; j++) {
      const td = el('td')
      const inp = el('input', 'cell', undefined, { type: 'text', inputmode: 'decimal', autocomplete: 'off', spellcheck: 'false', 'data-r': String(r), 'data-c': String(j) })
      inp.addEventListener('input', () => { inp.dataset.dirty = '1'; inp.removeAttribute('aria-invalid') })
      inp.addEventListener('change', () => commit(r, j))
      inp.addEventListener('focus', () => { lastFocus = [r, j]; clearBtn.disabled = false; if (r > 0) setMarkRow(r) })
      inp.addEventListener('keydown', (e) => onKey(e, r, j))
      td.append(inp)
      tr.append(td)
      inputs[r]![j] = inp
    }
    tbody.append(tr)
  }
  table.append(caption, thead, tbody)
  scroll.append(table)

  const actions = el('div', 'table-actions')
  const clearBtn = button('', 'btn btn-quiet', () => {
    if (!lastFocus) return
    const [r, j] = lastFocus
    app.tableClearCell(r, j); inputs[r]![j]!.dataset.dirty = ''; ctx.changed()
  })
  clearBtn.disabled = true
  const clearAllBtn = button('', 'btn btn-quiet', () => { confirmBox.hidden = false; yesBtn.focus() })
  const exportBtn = button('', 'btn btn-quiet', () => download())
  actions.append(clearBtn, clearAllBtn, exportBtn)
  const confirmBox = el('div', 'confirm', undefined, { role: 'alertdialog' })
  confirmBox.hidden = true
  const confirmText = el('p')
  const yesBtn = button('', 'btn btn-danger', () => { app.tableClear(); confirmBox.hidden = true; for (const row of inputs) for (const i of row) i.dataset.dirty = ''; msg.textContent = S().cleared; ctx.changed() })
  const noBtn = button('', 'btn btn-quiet', () => { confirmBox.hidden = true; clearAllBtn.focus() })
  confirmBox.append(confirmText, yesBtn, noBtn)
  confirmBox.addEventListener('keydown', (e) => { if (e.key === 'Escape') noBtn.click() })
  const kb = el('p', 'muted')
  c.body.append(tools, copyHint, msg, filled, scroll, actions, confirmBox, kb)

  let lastFocus: [number, number] | null = null

  function commit(r: number, j: number): void {
    const inp = inputs[r]![j]!
    const text = inp.value.trim()
    const had = app.tableData().values_s[r]![j] !== null
    inp.dataset.dirty = ''
    if (text === '') {
      if (had) app.tableClearCell(r, j)
      msg.textContent = ''
      ctx.changed(); w.touch()
      return
    }
    const res = app.tableSet(r, j, text)
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
    const rr = Math.max(0, Math.min(TABLE_ROWS - 1, r)), jj = Math.max(0, Math.min(TABLE_COLS - 1, j))
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

  onPress(copyBtn, (t) => {
    const res = copyReading(ctx, t)
    msg.textContent = res.message
    if (res.ok) w.touch()
  })

  function download(): void {
    const d = app.tableData()
    const csv = (L() === 'es' ? '﻿' : '') + toCSV(d.positions_cm, d.values_s, L())
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = el('a', undefined, undefined, { href: url, download: S().fileName })
    document.body.append(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const markRows = (): void => {
    const cur = getMarkRow()
    rowEls.forEach((tr, r) => { tr.classList.toggle('current', r === cur); if (r === cur) tr.setAttribute('aria-current', 'true'); else tr.removeAttribute('aria-current') })
  }
  const offMark = onMarkRow(markRows)

  function labels(): void {
    const T = S()
    c.title.textContent = T.title
    caption.textContent = T.caption
    corner.textContent = T.corner
    markRows()
    copyBtn.textContent = T.copy
    copyHint.textContent = T.copyHint
    clearBtn.textContent = T.clearCell
    clearAllBtn.textContent = T.clearAll
    exportBtn.textContent = T.export
    confirmText.textContent = T.clearAllAsk
    yesBtn.textContent = T.clearAllYes
    noBtn.textContent = T.cancel
    kb.textContent = T.keyboard
    for (let r = 0; r < TABLE_ROWS; r++) for (let j = 0; j < TABLE_COLS; j++) {
      inputs[r]![j]!.setAttribute('aria-label', T.cellAria.replace('{c}', String(j + 1)).replace('{x}', String(TABLE_POSITIONS_cm[r])))
    }
  }

  function sync(): void {
    const T = S()
    const d = app.tableData()
    let n = 0
    for (let r = 0; r < TABLE_ROWS; r++) for (let j = 0; j < TABLE_COLS; j++) {
      const inp = inputs[r]![j]!
      const v = d.values_s[r]![j]!
      if (v !== null) n++
      if (inp.dataset.dirty !== '1') inp.value = formatCell(v, L())
      const fromWatch = d.cells[r]![j]!.stopId !== null
      inp.classList.toggle('copied', fromWatch)
      if (fromWatch) inp.title = T.copiedMark; else inp.removeAttribute('title')
    }
    filled.textContent = T.filled.replace('{n}', String(n))
    markRows()
  }

  labels()
  return {
    update() { if (w.dirty()) { w.clear(); sync() } },
    relabel() { labels(); for (const row of inputs) for (const i of row) i.dataset.dirty = ''; w.touch() },
    destroy() { offMark(); w.off(); c.root.remove() },
  }
}
