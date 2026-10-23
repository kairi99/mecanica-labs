// Tape measure close-up panel: the steel blade drawn from the true length (the student reads it, no number is printed).
import type { TapeReading, TapeTarget } from '../apparatus/index.ts'
import type { MountView, View } from './view.ts'
import { button, card, el, nextId, svg, watch } from './dom.ts'
import { formatNum, parseDecimal } from './numfmt.ts'
import { strings } from './strings/tape.ts'

const PX_BASE = 11
const WIN_BEFORE_MM = 14
const WIN_AFTER_MM = 14
const CLEARING = new Set(['heightSet', 'attached', 'detached', 'itemRemoved', 'itemAdded', 'presetApplied', 'loaded'])

/**
 * Close-up of the blade where the measured edge (the underside of the rail, the cart front) meets it. mm ticks, 5 mm
 * ticks longer, numerals every cm. Pure drawing from the true length: no reading is printed.
 */
export function drawBlade(L_mm: number, zoom: number): SVGSVGElement {
  const px = PX_BASE * zoom
  const x0 = Math.floor(L_mm) - WIN_BEFORE_MM
  const X = (mm: number): number => (mm - x0) * px
  const width = (WIN_BEFORE_MM + WIN_AFTER_MM + 1) * px
  const H = 132
  const Y0 = 22 // top edge of the blade
  const g = svg('svg', { viewBox: `0 0 ${width} ${H}`, width, height: H, class: 'blade', role: 'img', preserveAspectRatio: 'xMinYMid meet' })
  g.append(svg('rect', { x: 0, y: Y0, width, height: 86, class: 'bl-blade' }))
  // graduations hang down from the blade's top edge; numerals in cm every 10 mm
  for (let m = x0; m <= x0 + WIN_BEFORE_MM + WIN_AFTER_MM + 1; m++) {
    if (m < 0) continue
    const len = m % 10 === 0 ? 38 : m % 5 === 0 ? 26 : 16
    g.append(svg('line', { x1: X(m), y1: Y0, x2: X(m), y2: Y0 + len, class: m % 10 === 0 ? 'bl-tick bl-tick-cm' : 'bl-tick' }))
    if (m % 10 === 0) g.append(svg('text', { x: X(m), y: Y0 + 64, class: 'bl-num', 'text-anchor': 'middle' }, String(m / 10)))
  }
  g.append(svg('text', { x: width - 8, y: Y0 + 80, class: 'bl-num bl-num-small', 'text-anchor': 'end' }, 'cm'))
  // the object: everything beyond the measured edge, drawn over the blade's upper strip
  g.append(svg('rect', { x: X(L_mm), y: 0, width: Math.max(0, width - X(L_mm)), height: Y0, class: 'bl-object' }))
  g.append(svg('line', { x1: X(L_mm), y1: 0, x2: X(L_mm), y2: Y0, class: 'bl-edge' }))
  return g
}

export const mountTape: MountView = (root, ctx): View => {
  const app = ctx.apparatus
  const S = () => strings[ctx.lang()]
  const L = () => ctx.lang()
  const w = watch(app)
  const c = card('tape', S().title, 'card-tape')
  root.append(c.root)

  let reading: TapeReading | null = null
  let readingLabel = ''
  let zoom = 1
  let drawnKey = ''
  const off = app.on((e) => { if (CLEARING.has(e.type)) reading = null })

  const tSelId = nextId('ct')
  const tLabel = el('label', 'field-label', undefined, { for: tSelId })
  const tSel = el('select', 'select', undefined, { id: tSelId })
  for (const k of ['clamp', 'twoLeg', 'railAt', 'cart', 'separation']) tSel.append(el('option', undefined, undefined, { value: k }))
  const posId = nextId('cr')
  const posLabel = el('label', 'field-label', undefined, { for: posId })
  const posInput = el('input', 'num', undefined, { type: 'text', inputmode: 'decimal', id: posId, autocomplete: 'off', value: '600' })
  const posWrap = el('div', 'stack')
  posWrap.append(posLabel, posInput)
  const measureBtn = button('', 'btn btn-primary')
  const why = el('p', 'why')
  const status = el('p', 'readout-text', undefined, { 'aria-live': 'polite' })

  const bWrap = el('div', 'blade-wrap')
  const bScroll = el('div', 'blade-scroll', undefined, { tabindex: '0' })
  const zoomRow = el('div', 'zoom-row')
  const zoomLabel = el('span', 'muted')
  const zOut = button('−', 'btn btn-quiet nudge', () => { zoom = Math.max(1, zoom / 2); drawnKey = '' })
  const zIn = button('+', 'btn btn-quiet nudge', () => { zoom = Math.min(4, zoom * 2); drawnKey = '' })
  const zVal = el('span', 'zoom-val')
  zoomRow.append(zoomLabel, zOut, zVal, zIn)
  const noNum = el('p', 'muted')
  const tolerance = el('p', 'muted')
  bWrap.append(bScroll, zoomRow, noNum, tolerance)

  const how = el('details', 'help-box')
  const howSum = el('summary')
  const howList = el('ol')
  const techTitle = el('h3', 'sub-title')
  const techText = el('p', 'muted')
  how.append(howSum, howList, techTitle, techText)

  c.body.append(tLabel, tSel, posWrap, measureBtn, why, status, bWrap, how)

  tSel.addEventListener('change', () => { reading = null; w.touch() })
  measureBtn.addEventListener('click', () => {
    let target: TapeTarget
    const k = tSel.value
    if (k === 'clamp') target = { kind: 'railHeight', at: 'clamp' }
    else if (k === 'twoLeg') target = { kind: 'railHeight', at: 'twoLeg' }
    else if (k === 'cart') target = { kind: 'cartLength' }
    else if (k === 'separation') target = { kind: 'supportSeparation' }
    else target = { kind: 'railHeight', at: { railPos_mm: parseDecimal(posInput.value) } }
    const r = app.tapeMeasure(target)
    if (r.ok) { reading = r.reading; readingLabel = tSel.selectedOptions[0]?.textContent ?? ''; drawnKey = '' }
    ctx.changed()
  })

  function labels(): void {
    const T = S()
    c.title.textContent = T.title
    tLabel.textContent = T.target
    const names = [T.tClamp, T.tTwoLeg, T.tRailAt, T.tCart, T.tSeparation]
    ;[...tSel.options].forEach((o, i) => { o.textContent = names[i]! })
    posLabel.textContent = T.railPos
    measureBtn.textContent = T.measure
    zoomLabel.textContent = T.zoom
    zIn.setAttribute('aria-label', T.zoomIn)
    zOut.setAttribute('aria-label', T.zoomOut)
    bScroll.setAttribute('aria-label', T.bladeAria)
    noNum.textContent = T.noNumeric
    howSum.textContent = T.how
    howList.replaceChildren(...T.howSteps.map((x) => el('li', undefined, x)))
    techTitle.textContent = T.technique
    techText.textContent = T.techniqueText
    drawnKey = ''
  }

  function sync(): void {
    const T = S()
    const s = app.getState()
    const has = s.items.tape
    for (const x of [tSel, posInput, measureBtn, zIn, zOut]) (x as HTMLButtonElement).disabled = !has
    posWrap.hidden = tSel.value !== 'railAt'
    why.textContent = has ? '' : T.needTape
    bWrap.hidden = !has
    status.textContent = !has ? '' : reading ? T.measuring.replace('{x}', readingLabel) : T.prompt
    tolerance.textContent = reading ? T.tolerance.replace('{x}', formatNum(reading.mpe_m * 1000, 2, L())) : ''
    zVal.textContent = `×${zoom}`
    const L_mm = reading ? reading.tape.edge_mm : null
    const key = `${L_mm}|${zoom}`
    if (key !== drawnKey) {
      drawnKey = key
      bScroll.replaceChildren()
      if (has && L_mm !== null) {
        bScroll.append(drawBlade(L_mm, zoom))
        // centre the measured edge in the visible strip
        bScroll.scrollLeft = Math.max(0, (WIN_BEFORE_MM + (L_mm - Math.floor(L_mm))) * PX_BASE * zoom - (bScroll.clientWidth || 300) / 2)
      } else if (has) bScroll.append(el('p', 'muted pad', T.prompt))
    }
  }

  labels()
  return {
    update() { if (w.dirty()) { w.clear(); sync() } else if (drawnKey === '') w.touch() },
    relabel() { labels(); w.touch() },
    destroy() { off(); w.off(); c.root.remove() },
  }
}
