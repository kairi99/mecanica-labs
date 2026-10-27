// Instruments of step 3: the balance (Mt and the parts) and the dynamometer (weight of the canister, the force F). The stopwatch is the
// timing bar; its notes are in stopwatch.ts. Readings come from the apparatus (quantised, with their division); this view only shows them.
import type { WeighTarget } from '../apparatus/index.ts'
import type { SpringScaleId } from '../../../core/instruments/springScale.ts'
import { SPRING_SCALES } from '../../../core/instruments/springScale.ts'
import type { MountView, View } from './view.ts'
import { button, card, el, nextId, watch } from '../../../core/views/dom.ts'
import { formatNum, parseDecimal } from '../../../core/views/numfmt.ts'
import { reasonText } from './reasons.ts'
import { strings } from './strings/measure.ts'
import { getTrialRow } from './uistate.ts'

const TARGETS: WeighTarget[] = ['system', 'cart', 'canister', 'brassScrew', 'plasticScrew', 'mass0', 'mass1', 'mass2', 'mass3']

export const mountMeasure: MountView = (root, ctx): View => {
  const app = ctx.apparatus
  const S = () => strings[ctx.lang()]
  const L = () => ctx.lang()
  const w = watch(app)
  const c = card('instruments', S().title, 'card-instruments')
  root.append(c.root)
  const fill = (tpl: string, vars: Record<string, string | number>): string => tpl.replace(/\{(\w+)\}/g, (_m, k: string) => String(vars[k] ?? ''))

  // ---- balance ----
  const balHead = el('h3', 'sub-title')
  const balIntro = el('p', 'muted')
  const chips = el('div', 'chip-row', undefined, { role: 'group' })
  const picked = new Set<WeighTarget>(['system'])
  const chipBtns = TARGETS.map((t) => {
    const b = button('', 'seg-btn chip-toggle', () => {
      if (t === 'system') { picked.clear(); picked.add('system') } else { picked.delete('system'); if (picked.has(t)) picked.delete(t); else picked.add(t) }
      w.touch()
    })
    chips.append(b)
    return { t, b }
  })
  const weighBtn = button('', 'btn btn-primary', () => {
    const r = app.weigh([...picked])
    ctx.changed()
    if (r.ok) { lastReading_kg = r.reading_kg; balWhy.textContent = '' } else balWhy.textContent = reasonText(L(), r.reason, r.item)
    w.touch()
  })
  const clearBtn = button('', 'btn btn-quiet', () => { picked.clear(); lastReading_kg = null; w.touch() })
  const pan = el('div', 'inline-row')
  pan.append(weighBtn, clearBtn)
  const lcd = el('div', 'lcd-mini', undefined, { role: 'status', 'aria-live': 'polite' })
  const balRes = el('p', 'muted')
  const balWhy = el('p', 'why')
  const mtId = nextId('mt')
  const mtLabel = el('label', 'field-label', undefined, { for: mtId })
  const mtInput = el('input', 'num', undefined, { type: 'text', inputmode: 'decimal', id: mtId, autocomplete: 'off' })
  const mtRecord = button('', 'btn btn-sm', () => {
    const r = app.recordMt_g(mtInput.value)
    ctx.changed()
    if (r.ok) { mtInput.removeAttribute('aria-invalid'); mtWhy.textContent = '' } else { mtInput.setAttribute('aria-invalid', 'true'); mtWhy.textContent = reasonText(L(), r.reason) }
  })
  const mtCopy = button('', 'btn btn-quiet btn-sm', () => { if (lastReading_kg !== null) mtInput.value = formatNum(lastReading_kg * 1000, 1, L()) })
  const mtRow = el('div', 'inline-row')
  mtRow.append(mtInput, mtRecord, mtCopy)
  const mtNow = el('p', 'readout-text', undefined, { 'aria-live': 'polite' })
  const mtWhy = el('p', 'why')
  let lastReading_kg: number | null = null

  // ---- dynamometer ----
  const dynHead = el('h3', 'sub-title')
  const dynIntro = el('p', 'muted')
  const scaleSeg = el('div', 'seg', undefined, { role: 'group' })
  let chosen: SpringScaleId = '1N'
  const scaleBtns = (['1N', '2N'] as const).map((id) => {
    const b = button('', 'seg-btn', () => { chosen = id; w.touch() })
    scaleSeg.append(b)
    return { id, b }
  })
  const readBtn = button('', 'btn btn-primary', () => {
    const r = app.dynamometerRead(chosen)
    ctx.changed()
    dynWhy.textContent = r.ok ? '' : reasonText(L(), r.reason, r.item)
  })
  const needle = el('div', 'needle-bar', undefined, { role: 'img' })
  const needleFill = el('div', 'needle-fill')
  needle.append(needleFill)
  const dynRead = el('p', 'readout-value', undefined, { 'aria-live': 'polite' })
  const dynDiv = el('p', 'muted')
  const dynStale = el('p', 'note')
  const copyForce = button('', 'btn btn-sm', () => {
    const row = getTrialRow()
    const r = app.tableCopyForce(row)
    ctx.changed()
    dynWhy.textContent = r.ok ? fill(S().forceCopied, { f: formatNum(r.value_N, 2, L()), n: row + 1 }) : reasonText(L(), r.reason)
  })
  const dynWhy = el('p', 'why')

  const sect = (...kids: HTMLElement[]): HTMLElement => { const s = el('section', 'adj-sec'); s.append(...kids); return s }
  c.body.append(
    sect(balHead, balIntro, chips, pan, lcd, balRes, balWhy, mtLabel, mtRow, mtNow, mtWhy),
    sect(dynHead, dynIntro, scaleSeg, readBtn, needle, dynRead, dynDiv, dynStale, copyForce, dynWhy),
  )

  function labels(): void {
    const T = S()
    c.title.textContent = T.title
    balHead.textContent = T.balanceTitle; balIntro.textContent = T.balanceIntro
    chips.setAttribute('aria-label', T.balanceTitle)
    for (const { t, b } of chipBtns) b.textContent = T.targets[t as keyof typeof T.targets]
    weighBtn.textContent = T.weigh; clearBtn.textContent = T.clearPan
    balRes.textContent = T.resolution
    mtLabel.textContent = T.mtLabel; mtRecord.textContent = T.mtRecord; mtCopy.textContent = T.mtCopy
    dynHead.textContent = T.forceTitle; dynIntro.textContent = T.forceIntro
    scaleSeg.setAttribute('aria-label', T.scaleLabel)
    scaleBtns[0]!.b.textContent = T.scale1; scaleBtns[1]!.b.textContent = T.scale2
    readBtn.textContent = T.read; copyForce.textContent = T.copyForce
  }
  function sync(): void {
    const T = S()
    const s = app.getState()
    for (const { t, b } of chipBtns) { b.setAttribute('aria-pressed', String(picked.has(t))); b.classList.toggle('active', picked.has(t)) }
    lcd.textContent = lastReading_kg === null ? T.readingNone : fill(T.reading, { m: formatNum(lastReading_kg * 1000, 1, L()) })
    const mt = app.mtRecorded_kg()
    mtNow.textContent = mt === null ? T.mtNone : fill(T.mtNow, { m: formatNum(mt * 1000, 1, L()) })
    // scales on the table
    const have = { '1N': s.items.dynamometer, '2N': s.items.dynamometer2N }
    if (!have[chosen]) chosen = have['1N'] ? '1N' : '2N'
    scaleBtns.forEach(({ id, b }) => { b.hidden = !have[id]; b.setAttribute('aria-pressed', String(chosen === id)); b.classList.toggle('active', chosen === id) })
    scaleSeg.hidden = !(have['1N'] && have['2N'])
    const last = app.lastForceReading()
    if (!have['1N'] && !have['2N']) dynWhy.textContent = T.needScale
    else if (!s.items.canister) dynWhy.textContent = T.needCanister
    if (last) {
      dynRead.textContent = fill(T.forceReading, { f: formatNum(last.reading_N, 2, L()), c: last.massesInCanister })
      dynDiv.textContent = fill(T.forceDiv, { d: formatNum(last.resolution_N, 2, L()) })
      needle.style.setProperty('--needle', `${Math.min(1, last.indicated_N / SPRING_SCALES[last.scaleId].range_N) * 100}%`)
      needle.setAttribute('aria-label', fill(T.forceReading, { f: formatNum(last.reading_N, 2, L()), c: last.massesInCanister }))
      dynStale.textContent = last.massesInCanister !== app.massesInCanister() ? T.stale : ''
    } else { dynRead.textContent = T.forceNone; dynDiv.textContent = ''; dynStale.textContent = ''; needle.style.setProperty('--needle', '0%'); needle.setAttribute('aria-label', T.forceNone) }
    dynStale.hidden = dynStale.textContent === ''
    copyForce.hidden = last === null
    void parseDecimal
  }
  labels()
  return {
    update() { if (w.dirty()) { w.clear(); sync() } },
    relabel() { labels(); w.touch() },
    destroy() { w.off(); c.root.remove() },
  }
}
