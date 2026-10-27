// Adjustments panel (step 2): levelling (stand end, receiver screw, level and its vial), the 0 and 90 cm marks, the DigiCart at the
// start and the length of the string. The masses are in masses.ts.
import {
  FOOT_RANGE_mm, FOOT_STEP_mm, RACK_MAX_mm, RACK_MIN_mm, type LevelPlacement, type MarkKind, type Result,
} from '../apparatus/index.ts'
import type { MountView, View } from './view.ts'
import { button, card, el, nextId, svg, watch } from '../../../core/views/dom.ts'
import { formatNum, parseDecimal } from '../../../core/views/numfmt.ts'
import { strings } from './strings/adjust.ts'

const VIAL_PX_PER_MM = 12

/** Close-up SVG of the level vial. Bubble position follows the apparatus reading (positive = toward the stand end = left). */
function buildVial(): { svg: SVGSVGElement; set: (bubble_mm: number | null) => void } {
  const g = svg('svg', { viewBox: '0 0 240 64', class: 'vial', role: 'img' })
  g.append(
    svg('rect', { x: 20, y: 14, width: 200, height: 36, rx: 18, class: 'vial-tube' }),
    svg('line', { x1: 120 - 16, y1: 14, x2: 120 - 16, y2: 50, class: 'vial-mark' }),
    svg('line', { x1: 120 + 16, y1: 14, x2: 120 + 16, y2: 50, class: 'vial-mark' }),
  )
  const bubble = svg('ellipse', { cx: 120, cy: 32, rx: 14, ry: 10, class: 'vial-bubble' })
  g.append(bubble)
  return {
    svg: g,
    set(b) {
      bubble.setAttribute('cx', String(120 - (b ?? 0) * VIAL_PX_PER_MM))
      bubble.style.visibility = b === null ? 'hidden' : 'visible'
    },
  }
}

export const mountAdjust: MountView = (root, ctx): View => {
  const app = ctx.apparatus
  const S = () => strings[ctx.lang()]
  const L = () => ctx.lang()
  const w = watch(app)
  const c = card('adjust', S().title, 'card-adjust')
  root.append(c.root)
  const fill = (tpl: string, vars: Record<string, string | number>): string => tpl.replace(/\{(\w+)\}/g, (_m, k: string) => String(vars[k] ?? ''))
  const done = (r: Result): void => { ctx.changed(); void r }
  const num = (mm: number, dec = 1): string => formatNum(mm, dec, L()).replace(/[.,]0$/, '')

  // ---- slider with fine buttons ----
  function sliderBlock(opts: { min: number; max: number; step: number; steps: number[]; set: (v: number) => Result; get: () => number; dec: number }) {
    const wrap = el('div', 'slider-block')
    const id = nextId('rng')
    const label = el('label', 'field-label', undefined, { for: id })
    const input = el('input', 'range', undefined, { type: 'range', id, min: String(opts.min), max: String(opts.max), step: String(opts.step) })
    input.addEventListener('input', () => done(opts.set(Number(input.value))))
    const read = el('output', 'readout', undefined, { for: id })
    const nudges = el('div', 'nudges')
    const btns: HTMLButtonElement[] = []
    for (const st of opts.steps) for (const sign of [-1, 1]) {
      const d = sign * st
      const b = button(`${d > 0 ? '+' : '−'}${formatNum(st, st < 1 ? 2 : 0, L())}`, 'btn btn-quiet nudge', () => done(opts.set(opts.get() + d)))
      btns.push(b)
      nudges.append(b)
    }
    const why = el('p', 'why')
    wrap.append(label, input, read, nudges, why)
    return { wrap, label, input, read, why, btns, enable(on: boolean) { input.disabled = !on; for (const x of btns) x.disabled = !on } }
  }

  // ---- level ----
  const levelHead = el('h3', 'sub-title')
  const levelIntro = el('p', 'muted')
  const rack = sliderBlock({
    min: RACK_MIN_mm, max: RACK_MAX_mm, step: 1, steps: [1, 5], dec: 0,
    set: (v) => app.setRackHeight_mm(Math.max(RACK_MIN_mm, Math.min(RACK_MAX_mm, v))), get: () => app.getState().rack_mm,
  })
  const foot = sliderBlock({
    min: -FOOT_RANGE_mm, max: FOOT_RANGE_mm, step: FOOT_STEP_mm, steps: [0.05, 0.5], dec: 2,
    set: (v) => app.setFoot_mm(Math.max(-FOOT_RANGE_mm, Math.min(FOOT_RANGE_mm, v))), get: () => app.getState().foot_mm,
  })
  const levelPlaceLabel = el('p', 'field-label')
  const levelSeg = el('div', 'seg', undefined, { role: 'group' })
  const levelBtns = new Map<string, HTMLButtonElement>()
  for (const k of ['rail', 'table', 'away'] as const) {
    const b = button('', 'seg-btn', () => done(app.placeLevel(k === 'away' ? null : (k as LevelPlacement))))
    levelBtns.set(k, b)
    levelSeg.append(b)
  }
  const vial = buildVial()
  const vialEnds = el('div', 'vial-ends')
  const vialHigh = el('span'), vialLow = el('span')
  vialEnds.append(vialHigh, vialLow)
  const vialWrap = el('div', 'vial-wrap')
  vialWrap.append(vial.svg, vialEnds)
  const levelRead = el('p', 'readout-text', undefined, { 'aria-live': 'polite' })
  const levelHelp = el('p', 'muted')

  // ---- marks ----
  const markHead = el('h3', 'sub-title')
  const markIntro = el('p', 'muted')
  const markWhy = el('p', 'why')
  const markRows = (['start', 'end'] as const).map((kind) => {
    const id = nextId('mk')
    const row = el('div', 'inline-row')
    const label = el('label', 'field-label', undefined, { for: id })
    const input = el('input', 'num', undefined, { type: 'text', inputmode: 'decimal', id, autocomplete: 'off', value: kind === 'start' ? '100' : '1000' })
    const put = button('', 'btn btn-primary btn-sm', () => {
      const v = parseDecimal(input.value)
      if (Number.isNaN(v)) { input.setAttribute('aria-invalid', 'true'); markWhy.textContent = S().invalidNumber; return }
      input.removeAttribute('aria-invalid'); markWhy.textContent = ''
      done(app.placeMark(kind as MarkKind, v))
    })
    const off = button('', 'btn btn-quiet btn-sm', () => done(app.removeMark(kind as MarkKind)))
    const wrap = el('div', 'mark-field')
    wrap.append(label, row)
    row.append(input, put, off)
    return { kind, wrap, label, input, put, off }
  })
  const markSummary = el('p', 'mark-summary', undefined, { 'aria-live': 'polite' })
  const markDistance = el('p', 'readout-text', undefined, { 'aria-live': 'polite' })

  // ---- cart ----
  const cartHead = el('h3', 'sub-title')
  const cartIntro = el('p', 'muted')
  const cartId = nextId('ct')
  const cartLabel = el('label', 'field-label', undefined, { for: cartId })
  const cartInput = el('input', 'num', undefined, { type: 'text', inputmode: 'decimal', id: cartId, autocomplete: 'off', value: '100' })
  const cartRow = el('div', 'inline-row')
  const cartPlace = button('', 'btn btn-primary btn-sm', () => {
    const v = parseDecimal(cartInput.value)
    if (Number.isNaN(v)) { cartInput.setAttribute('aria-invalid', 'true'); cartWhy.textContent = S().invalidNumber; return }
    cartInput.removeAttribute('aria-invalid'); cartWhy.textContent = ''
    done(app.placeCart(v))
  })
  const cartBack = button('', 'btn btn-quiet btn-sm', () => done(app.resetCart()))
  cartRow.append(cartInput, cartPlace, cartBack)
  const cartRead = el('p', 'readout-text', undefined, { 'aria-live': 'polite' })
  const cartWarn = el('p', 'note')
  const cartWhy = el('p', 'why')

  // ---- string ----
  const strHead = el('h3', 'sub-title')
  const strIntro = el('p', 'muted')
  const strId = nextId('st')
  const strLabel = el('label', 'field-label', undefined, { for: strId })
  const strInput = el('input', 'num', undefined, { type: 'text', inputmode: 'decimal', id: strId, autocomplete: 'off', value: '150' })
  const strRow = el('div', 'inline-row')
  const strSet = button('', 'btn btn-primary btn-sm', () => {
    const v = parseDecimal(strInput.value)
    if (Number.isNaN(v)) { strInput.setAttribute('aria-invalid', 'true'); strWhy.textContent = S().invalidNumber; return }
    strInput.removeAttribute('aria-invalid'); strWhy.textContent = ''
    done(app.setStringLength_m(v / 100))
  })
  strRow.append(strInput, strSet)
  const strRead = el('p', 'readout-text', undefined, { 'aria-live': 'polite' })
  const strHang = el('p', 'readout-text', undefined, { 'aria-live': 'polite' })
  const strWhy = el('p', 'why')

  const sect = (head: HTMLElement, ...kids: HTMLElement[]): HTMLElement => { const s = el('section', 'adj-sec'); s.append(head, ...kids); return s }
  c.body.append(
    sect(levelHead, levelIntro, rack.wrap, foot.wrap, levelPlaceLabel, levelSeg, vialWrap, levelRead, levelHelp),
    sect(markHead, markIntro, ...markRows.map((r) => r.wrap), markSummary, markDistance, markWhy),
    sect(cartHead, cartIntro, cartLabel, cartRow, cartRead, cartWarn, cartWhy),
    sect(strHead, strIntro, strLabel, strRow, strRead, strHang, strWhy),
  )

  function labels(): void {
    const T = S()
    c.title.textContent = T.title
    levelHead.textContent = T.levelTitle; levelIntro.textContent = T.levelIntro
    rack.label.textContent = T.rackLabel; foot.label.textContent = T.footLabel
    levelPlaceLabel.textContent = T.levelPlace
    levelSeg.setAttribute('aria-label', T.levelPlace)
    levelBtns.get('rail')!.textContent = T.levelRail; levelBtns.get('table')!.textContent = T.levelTable; levelBtns.get('away')!.textContent = T.levelAway
    vial.svg.setAttribute('aria-label', T.vialAria)
    vialHigh.textContent = T.vialHigh; vialLow.textContent = T.vialLow
    levelHelp.textContent = T.levelHelp
    markHead.textContent = T.marksTitle; markIntro.textContent = T.marksIntro
    for (const r of markRows) {
      r.label.textContent = r.kind === 'start' ? T.startLabel : T.endLabel
      r.put.textContent = T.place; r.off.textContent = T.remove
    }
    cartHead.textContent = T.cartTitle; cartIntro.textContent = T.cartIntro; cartLabel.textContent = T.cartLabel
    cartPlace.textContent = T.cartPlace; cartBack.textContent = T.cartBack; cartWarn.textContent = T.cartWarn
    strHead.textContent = T.stringTitle; strIntro.textContent = T.stringIntro; strLabel.textContent = T.stringLabel; strSet.textContent = T.stringSet
  }
  function sync(): void {
    const T = S()
    const s = app.getState()
    // level
    rack.input.value = String(s.rack_mm)
    rack.read.textContent = `${num(s.rack_mm, 0)} mm`
    foot.input.value = String(s.foot_mm)
    foot.read.textContent = `${formatNum(s.foot_mm, 2, L())} mm`
    rack.enable(s.items.rackStand && s.joints.rackClamp !== null)
    foot.enable(s.items.receiver)
    rack.why.textContent = s.joints.rackClamp === null ? T.needClamp : ''
    foot.why.textContent = s.items.receiver ? '' : T.needReceiverFoot
    for (const [k, b] of levelBtns) {
      const on = k === 'away' ? s.level.placement === null : s.level.placement === k
      b.setAttribute('aria-pressed', String(on))
      b.classList.toggle('active', on)
    }
    const lv = app.levelReading()
    vial.set(lv.bubble_mm)
    vialWrap.hidden = lv.bubble_mm === null
    levelRead.textContent = lv.bubble_mm === null ? T.levelNone : lv.centered ? T.levelCentered : lv.saturated ? T.levelSaturated : fill(T.levelOff, { mm: formatNum(Math.abs(lv.bubble_mm), 1, L()) })
    // marks
    const mk = s.marks
    markSummary.textContent = fill(T.markSummary, { s: mk.start_mm === null ? T.markNone : num(mk.start_mm), e: mk.end_mm === null ? T.markNone : num(mk.end_mm) })
    const pr = app.procedure()
    markDistance.textContent = pr.distance_m === null ? '' : `${fill(T.distanceLine, { d: formatNum(pr.distance_m * 100, 1, L()) })} ${pr.distanceOk ? T.distanceOk : T.distanceOff}`
    markWhy.textContent = s.items.markers && s.items.rail ? markWhy.textContent : T.needRailMarks
    // cart
    cartRead.textContent = s.cart.placed && s.cart.startRailPos_mm !== null ? fill(T.cartAt, { x: num(s.cart.startRailPos_mm) }) : T.cartNone
    // string
    strRead.textContent = fill(T.stringNow, { x: num(s.stringLength_m * 100) })
    const hang = app.hangBelowPulley_m()
    strHang.textContent = hang === null ? '' : fill(T.stringHang, { x: formatNum(hang * 100, 1, L()) })
  }
  labels()
  return {
    update() { if (w.dirty()) { w.clear(); sync() } },
    relabel() { labels(); w.touch() },
    destroy() { w.off(); c.root.remove() },
  }
}

