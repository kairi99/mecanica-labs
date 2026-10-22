// Caliper close-up panel: vernier drawn from the true length (the student reads it) and a digital LCD with ZERO.
import type { CaliperReading, CaliperTarget } from '../apparatus/index.ts'
import type { MountView, View } from './view.ts'
import { button, card, el, nextId, svg, watch } from './dom.ts'
import { formatNum, parseDecimal } from './numfmt.ts'
import { strings } from './strings/caliper.ts'

const PX_BASE = 11
const WIN_BEFORE_MM = 4
const WIN_AFTER_MM = 24
const CLEARING = new Set(['heightSet', 'attached', 'detached', 'itemRemoved', 'itemAdded', 'caliperVariant', 'caliperJaws', 'presetApplied', 'loaded'])

/** Vernier close-up from the true jaw opening. Pure drawing: no reading is printed. */
export function drawVernier(L_mm: number, zoom: number): SVGSVGElement {
  const px = PX_BASE * zoom
  const main = Math.floor(L_mm + 1e-9)
  const x0 = main - WIN_BEFORE_MM
  const X = (mm: number): number => (mm - x0) * px
  const width = (WIN_BEFORE_MM + WIN_AFTER_MM) * px
  const H = 156
  const Y = 78 // border between the two scales
  const g = svg('svg', { viewBox: `0 0 ${width} ${H}`, width, height: H, class: 'vernier', role: 'img', preserveAspectRatio: 'xMinYMid meet' })
  // beam (main scale) above the border, slider (vernier) below
  g.append(svg('rect', { x: 0, y: 8, width, height: Y - 8, class: 'vn-beam' }))
  const sliderX0 = X(L_mm - 1.8)
  const sliderW = X(L_mm + 19 + 2.2) - sliderX0
  g.append(svg('rect', { x: sliderX0, y: Y, width: sliderW, height: H - Y - 8, class: 'vn-slider' }))
  g.append(svg('line', { x1: 0, y1: Y, x2: width, y2: Y, class: 'vn-border' }))
  // main scale: ticks hang up from the border; mm, 5 mm and cm lengths; numerals in cm
  for (let m = x0; m <= x0 + WIN_BEFORE_MM + WIN_AFTER_MM; m++) {
    if (m < 0) continue
    const len = m % 10 === 0 ? 30 : m % 5 === 0 ? 20 : 12
    g.append(svg('line', { x1: X(m), y1: Y, x2: X(m), y2: Y - len, class: m % 10 === 0 ? 'vn-tick vn-tick-cm' : 'vn-tick' }))
    if (m % 10 === 0) g.append(svg('text', { x: X(m), y: Y - 38, class: 'vn-num', 'text-anchor': 'middle' }, String(m / 10)))
  }
  // vernier: 20 divisions spanning 19 mm; ticks hang down from the border; numerals 0..10 every 2 divisions
  for (let i = 0; i <= 20; i++) {
    const x = X(L_mm + 0.95 * i)
    const len = i % 10 === 0 ? 30 : i % 2 === 0 ? 20 : 12
    g.append(svg('line', { x1: x, y1: Y, x2: x, y2: Y + len, class: i === 0 || i === 20 ? 'vn-tick vn-tick-cm' : 'vn-tick' }))
    if (i % 2 === 0) g.append(svg('text', { x, y: Y + 46, class: 'vn-num vn-num-small', 'text-anchor': 'middle' }, String(i / 2)))
  }
  g.append(svg('text', { x: X(L_mm + 19) + 12 * zoom, y: Y + 46, class: 'vn-num vn-num-small' }, 'mm'))
  return g
}

/** Small overview: beam, fixed jaw, sliding jaw at the true opening (0..150 mm over 300 px). */
export function drawOverview(L_mm: number): SVGSVGElement {
  const k = 2
  const g = svg('svg', { viewBox: '0 0 330 62', class: 'cal-overview', role: 'img' })
  g.append(
    svg('rect', { x: 10, y: 8, width: 310, height: 14, rx: 3, class: 'ov-beam' }),
    svg('rect', { x: 10, y: 8, width: 8, height: 46, rx: 2, class: 'ov-jaw' }),
    svg('rect', { x: 18 + L_mm * k, y: 8, width: 8, height: 46, rx: 2, class: 'ov-jaw' }),
    svg('rect', { x: 18 + L_mm * k, y: 8, width: 36, height: 22, rx: 3, class: 'ov-slider' }),
  )
  return g
}

export const mountCaliper: MountView = (root, ctx): View => {
  const app = ctx.apparatus
  const S = () => strings[ctx.lang()]
  const L = () => ctx.lang()
  const w = watch(app)
  const c = card('caliper', S().title, 'card-caliper')
  root.append(c.root)

  let reading: CaliperReading | null = null
  let readingLabel = ''
  let zoom = 1
  let digitalOn = true
  let drawnKey = ''
  const off = app.on((e) => { if (CLEARING.has(e.type)) { if (e.type !== 'caliperJaws' || e.closed) reading = null } })

  const seg = el('div', 'seg', undefined, { role: 'group' })
  const segBtns = new Map<string, HTMLButtonElement>()
  for (const v of ['vernier', 'digital'] as const) {
    const b = button('', 'seg-btn', () => { app.setCaliperVariant(v); ctx.changed() })
    segBtns.set(v, b); seg.append(b)
  }
  const tSelId = nextId('ct')
  const tLabel = el('label', 'field-label', undefined, { for: tSelId })
  const tSel = el('select', 'select', undefined, { id: tSelId })
  for (const k of ['clamp', 'twoLeg', 'railAt', 'cart']) tSel.append(el('option', undefined, undefined, { value: k }))
  const posId = nextId('cr')
  const posLabel = el('label', 'field-label', undefined, { for: posId })
  const posInput = el('input', 'num', undefined, { type: 'text', inputmode: 'decimal', id: posId, autocomplete: 'off', value: '600' })
  const posWrap = el('div', 'stack')
  posWrap.append(posLabel, posInput)
  const measureBtn = button('', 'btn btn-primary')
  const closeBtn = button('', 'btn btn-quiet')
  const btnRow = el('div', 'inline-row')
  btnRow.append(measureBtn, closeBtn)
  const why = el('p', 'why')
  const status = el('p', 'readout-text', undefined, { 'aria-live': 'polite' })

  const overviewHost = el('div', 'cal-ov-host')
  const vWrap = el('div', 'vernier-wrap')
  const vScroll = el('div', 'vernier-scroll', undefined, { tabindex: '0' })
  const zoomRow = el('div', 'zoom-row')
  const zoomLabel = el('span', 'muted')
  const zOut = button('−', 'btn btn-quiet nudge', () => { zoom = Math.max(1, zoom / 2); drawnKey = '' })
  const zIn = button('+', 'btn btn-quiet nudge', () => { zoom = Math.min(4, zoom * 2); drawnKey = '' })
  const zVal = el('span', 'zoom-val')
  zoomRow.append(zoomLabel, zOut, zVal, zIn)
  const noNum = el('p', 'muted')
  vWrap.append(vScroll, zoomRow, noNum)

  const dWrap = el('div', 'digital-wrap')
  const lcd = el('div', 'lcd lcd-cal', undefined, { role: 'img' })
  const lcdTxt = el('span', 'lcd-digits')
  const lcdUnit = el('span', 'lcd-unit')
  lcd.append(lcdTxt, lcdUnit)
  const dBtns = el('div', 'inline-row')
  const onBtn = button('', 'btn btn-quiet', () => { digitalOn = !digitalOn; w.touch() })
  const zeroBtn = button('', 'btn btn-primary', () => { app.caliperZero(); ctx.changed() })
  dBtns.append(onBtn, zeroBtn)
  const zeroNote = el('p', 'muted')
  dWrap.append(lcd, dBtns, zeroNote)

  const how = el('details', 'help-box')
  const howSum = el('summary')
  const howList = el('ol')
  const depthTitle = el('h3', 'sub-title')
  const depthText = el('p', 'muted')
  how.append(howSum, howList, depthTitle, depthText)

  c.body.append(seg, tLabel, tSel, posWrap, btnRow, why, status, overviewHost, vWrap, dWrap, how)

  tSel.addEventListener('change', () => { reading = null; w.touch() })
  measureBtn.addEventListener('click', () => {
    let target: CaliperTarget
    const k = tSel.value
    if (k === 'clamp') target = { kind: 'railHeight', at: 'clamp' }
    else if (k === 'twoLeg') target = { kind: 'railHeight', at: 'twoLeg' }
    else if (k === 'cart') target = { kind: 'cartLength' }
    else target = { kind: 'railHeight', at: { railPos_mm: parseDecimal(posInput.value) } }
    const r = app.caliperMeasure(target)
    if (r.ok) { reading = r.reading; readingLabel = tSel.selectedOptions[0]?.textContent ?? ''; drawnKey = '' }
    ctx.changed()
  })
  closeBtn.addEventListener('click', () => { app.setCaliperJaws(true); reading = null; drawnKey = ''; ctx.changed() })

  function labels(): void {
    const T = S()
    c.title.textContent = T.title
    seg.setAttribute('aria-label', T.variant)
    segBtns.get('vernier')!.textContent = T.vernier
    segBtns.get('digital')!.textContent = T.digital
    tLabel.textContent = T.target
    const names = [T.tClamp, T.tTwoLeg, T.tRailAt, T.tCart]
    ;[...tSel.options].forEach((o, i) => { o.textContent = names[i]! })
    posLabel.textContent = T.railPos
    measureBtn.textContent = T.measure
    closeBtn.textContent = T.close
    zoomLabel.textContent = T.zoom
    zIn.setAttribute('aria-label', T.zoomIn)
    zOut.setAttribute('aria-label', T.zoomOut)
    vScroll.setAttribute('aria-label', T.vernierAria)
    noNum.textContent = T.noNumeric
    lcd.setAttribute('aria-label', T.lcdAria)
    lcdUnit.textContent = T.unit
    onBtn.textContent = T.onOff
    zeroBtn.textContent = T.zero
    zeroNote.textContent = T.zeroNote
    howSum.textContent = T.how
    depthTitle.textContent = T.depth
    depthText.textContent = T.depthText
    drawnKey = ''
  }

  function sync(): void {
    const T = S()
    const s = app.getState()
    const has = s.items.caliper
    const variant = s.caliper.variant
    for (const [k, b] of segBtns) { b.classList.toggle('active', k === variant); b.setAttribute('aria-pressed', String(k === variant)); b.disabled = !has }
    for (const x of [tSel, posInput, measureBtn, closeBtn, zeroBtn, onBtn, zIn, zOut]) (x as HTMLButtonElement).disabled = !has
    posWrap.hidden = tSel.value !== 'railAt'
    why.textContent = has ? '' : T.needCaliper
    vWrap.hidden = variant !== 'vernier'
    dWrap.hidden = variant !== 'digital'
    overviewHost.hidden = !has
    howList.replaceChildren(...(variant === 'vernier' ? T.howVernier : T.howDigital).map((x) => el('li', undefined, x)))
    zeroBtn.disabled = !has || !s.caliper.jawsClosed
    status.textContent = !has ? '' : reading ? T.measuring.replace('{x}', readingLabel) : s.caliper.jawsClosed ? T.closedNote : T.prompt
    zVal.textContent = `×${zoom}`
    // digital LCD
    let text = '-.--'
    if (has && digitalOn) {
      if (reading && reading.display_m !== null) text = formatNum(reading.display_m * 1000, 2, L())
      else if (s.caliper.jawsClosed) text = formatNum(app.caliperClosedDisplay_m() * 1000, 2, L())
    } else text = ''
    lcdTxt.textContent = text
    lcd.classList.toggle('off', !digitalOn || !has)
    // vernier drawing
    const closed = s.caliper.jawsClosed && !reading
    const L_mm = reading ? reading.trueLength_m * 1000 : closed ? 0 : null
    const key = `${variant}|${L_mm}|${zoom}`
    if (key !== drawnKey) {
      drawnKey = key
      vScroll.replaceChildren()
      overviewHost.replaceChildren()
      if (has && L_mm !== null) {
        vScroll.append(drawVernier(L_mm, zoom))
        overviewHost.append(drawOverview(L_mm))
        vScroll.scrollLeft = Math.max(0, (WIN_BEFORE_MM - 1.5) * PX_BASE * zoom)
      } else if (has) vScroll.append(el('p', 'muted pad', T.prompt))
    }
  }

  labels()
  return {
    update() { if (w.dirty()) { w.clear(); sync() } else if (drawnKey === '') w.touch() },
    relabel() { labels(); w.touch() },
    destroy() { off(); w.off(); c.root.remove() },
  }
}
