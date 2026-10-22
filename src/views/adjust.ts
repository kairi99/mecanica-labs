// Adjustments panel: rack-stand height, screw foot, level and its vial, tape marks, cart placement.
import {
  FOOT_RANGE_mm, FOOT_STEP_mm, LEVEL_BUBBLE_MAX_mm, RACK_MAX_mm, RACK_MIN_mm, RAIL_SCALE_MAX_mm, type LevelPlacement, type Result,
} from '../apparatus/index.ts'
import type { MountView, View } from './view.ts'
import { button, card, el, nextId, rebuild, svg, watch } from './dom.ts'
import { formatNum, parseDecimal } from './numfmt.ts'
import { strings } from './strings/adjust.ts'

const VIAL_PX_PER_MM = 12

/** Close-up SVG of the level vial. Bubble position follows the apparatus reading (positive = toward the high end = left). */
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
  const fill = (tpl: string, n: string | number): string => tpl.replace('{n}', String(n)).replace('{x}', String(n))
  const fail = (r: Result): void => { ctx.changed(); void r }

  // ---- generic slider with fine buttons ----
  function sliderBlock(opts: { min: number; max: number; step: number; steps: number[]; set: (v: number) => Result; get: () => number; dec: number }) {
    const wrap = el('div', 'slider-block')
    const id = nextId('rng')
    const label = el('label', 'field-label', undefined, { for: id })
    const input = el('input', 'range', undefined, { type: 'range', id, min: String(opts.min), max: String(opts.max), step: String(opts.step) })
    input.addEventListener('input', () => fail(opts.set(Number(input.value))))
    const read = el('output', 'readout', undefined, { for: id })
    const nudges = el('div', 'nudges')
    const btns: { b: HTMLButtonElement; d: number }[] = []
    for (const st of opts.steps) for (const sign of [-1, 1]) {
      const d = sign * st
      const b = button(`${d > 0 ? '+' : '−'}${formatNum(st, opts.dec > 0 && st < 1 ? 2 : 0, 'en').replace(/\.00$/, '')}`, 'btn btn-quiet nudge', () => fail(opts.set(opts.get() + d)))
      btns.push({ b, d })
      nudges.append(b)
    }
    const why = el('p', 'why')
    wrap.append(label, input, read, nudges, why)
    return {
      wrap, label, input, read, why, btns,
      enable(on: boolean) { input.disabled = !on; for (const x of btns) x.b.disabled = !on },
    }
  }

  const rackHead = el('h3', 'sub-title')
  const rack = sliderBlock({
    min: RACK_MIN_mm, max: RACK_MAX_mm, step: 1, steps: [1, 5], dec: 0,
    set: (v) => app.setRackHeight_mm(Math.max(RACK_MIN_mm, Math.min(RACK_MAX_mm, v))), get: () => app.getState().rack_mm,
  })
  const footHead = el('h3', 'sub-title')
  const foot = sliderBlock({
    min: -FOOT_RANGE_mm, max: FOOT_RANGE_mm, step: FOOT_STEP_mm, steps: [0.05, 0.5], dec: 2,
    set: (v) => app.setFoot_mm(Math.max(-FOOT_RANGE_mm, Math.min(FOOT_RANGE_mm, v))), get: () => app.getState().foot_mm,
  })
  for (const x of foot.btns) { const st = Math.abs(x.d); x.b.textContent = `${x.d > 0 ? '+' : '−'}${formatNum(st, 2, 'en')}` }

  // ---- level ----
  const levelHead = el('h3', 'sub-title')
  const levelSeg = el('div', 'seg', undefined, { role: 'group' })
  const levelBtns = new Map<string, HTMLButtonElement>()
  for (const k of ['rail', 'table', 'away'] as const) {
    const b = button('', 'seg-btn', () => fail(app.placeLevel(k === 'away' ? null : (k as LevelPlacement))))
    levelBtns.set(k, b)
    levelSeg.append(b)
  }
  const vial = buildVial()
  const vialEnds = el('div', 'vial-ends')
  const vialHigh = el('span'), vialLow = el('span')
  vialEnds.append(vialHigh, vialLow)
  const levelRead = el('p', 'readout-text', undefined, { 'aria-live': 'polite' })
  const levelHelp = el('p', 'muted')
  const vialWrap = el('div', 'vial-wrap')
  vialWrap.append(vial.svg, vialEnds)

  // ---- markers ----
  const markHead = el('h3', 'sub-title')
  const markNote = el('p', 'muted')
  const markInputId = nextId('mk')
  const markLabel = el('label', 'field-label', undefined, { for: markInputId })
  const markInput = el('input', 'num', undefined, { type: 'text', inputmode: 'decimal', id: markInputId, autocomplete: 'off', value: '200' })
  const markRow = el('div', 'inline-row')
  const markPlaceBtn = button('', 'btn btn-primary', () => {
    const v = parseDecimal(markInput.value)
    if (Number.isNaN(v)) { markInput.setAttribute('aria-invalid', 'true'); app.placeMarker(NaN); ctx.changed(); return }
    markInput.removeAttribute('aria-invalid')
    const r = app.placeMarker(v)
    if (r.ok) markInput.value = formatNum(Math.min(RAIL_SCALE_MAX_mm, r.railPos_mm + 100), 1, L()).replace(/[.,]0$/, '')
    ctx.changed()
  })
  const nudgeRow = el('div', 'nudges')
  const markNudges: HTMLButtonElement[] = []
  for (const d of [-10, -1, 1, 10]) {
    const b = button(`${d > 0 ? '+' : '−'}${Math.abs(d)}`, 'btn btn-quiet nudge', () => {
      const v = parseDecimal(markInput.value)
      markInput.value = formatNum(Math.max(0, Math.min(RAIL_SCALE_MAX_mm, (Number.isNaN(v) ? 0 : v) + d)), 1, L()).replace(/[.,]0$/, '')
    })
    markNudges.push(b)
    nudgeRow.append(b)
  }
  markRow.append(markInput, markPlaceBtn)
  const markList = el('ul', 'mark-list')
  const markFoot = el('div', 'inline-row')
  const markClearBtn = button('', 'btn btn-quiet', () => { app.clearMarkers(); ctx.changed() })
  markFoot.append(markClearBtn)
  const markWhy = el('p', 'why')

  // ---- cart ----
  const cartHead = el('h3', 'sub-title')
  const cartPhase = el('p', 'readout-text', undefined, { 'aria-live': 'polite' })
  const cartMarkLabelId = nextId('cm')
  const cartMarkLabel = el('label', 'field-label', undefined, { for: cartMarkLabelId })
  const cartMarkSel = el('select', 'select', undefined, { id: cartMarkLabelId })
  const cartMarkBtn = button('', 'btn btn-primary', () => {
    const v = Number(cartMarkSel.value)
    if (Number.isFinite(v)) fail(app.placeCart(v))
  })
  const cartMarkRow = el('div', 'inline-row')
  cartMarkRow.append(cartMarkSel, cartMarkBtn)
  const cartPosId = nextId('cp')
  const cartPosLabel = el('label', 'field-label', undefined, { for: cartPosId })
  const cartPosInput = el('input', 'num', undefined, { type: 'text', inputmode: 'decimal', id: cartPosId, autocomplete: 'off', value: '200' })
  const cartPosBtn = button('', 'btn btn-primary', () => {
    const v = parseDecimal(cartPosInput.value)
    fail(app.placeCart(Number.isNaN(v) ? NaN : v))
  })
  const cartPosRow = el('div', 'inline-row')
  cartPosRow.append(cartPosInput, cartPosBtn)
  const cartResetBtn = button('', 'btn btn-quiet', () => fail(app.resetCart()))
  const cartNote = el('p', 'muted')
  const cartWhy = el('p', 'why')

  c.body.append(
    rackHead, rack.wrap, footHead, foot.wrap,
    levelHead, levelSeg, vialWrap, levelRead, levelHelp,
    markHead, markNote, markLabel, markRow, nudgeRow, markWhy, markList, markFoot,
    cartHead, cartPhase, cartMarkLabel, cartMarkRow, cartPosLabel, cartPosRow, cartResetBtn, cartNote, cartWhy,
  )

  function relabelStatic(): void {
    const T = S()
    c.title.textContent = T.title
    rackHead.textContent = T.rackTitle
    rack.label.textContent = T.rackLabel
    footHead.textContent = T.footTitle
    foot.label.textContent = T.footLabel
    for (const x of rack.btns) x.b.setAttribute('aria-label', fill(x.d > 0 ? T.up : T.down, Math.abs(x.d)))
    for (const x of foot.btns) x.b.setAttribute('aria-label', fill(x.d > 0 ? T.up : T.down, formatNum(Math.abs(x.d), 2, L())))
    levelHead.textContent = T.levelTitle
    levelSeg.setAttribute('aria-label', T.levelGroup)
    levelBtns.get('rail')!.textContent = T.levelOnRail
    levelBtns.get('table')!.textContent = T.levelOnTable
    levelBtns.get('away')!.textContent = T.levelAway
    vial.svg.setAttribute('aria-label', T.vialAria)
    vialHigh.textContent = `◂ ${T.highEnd}`
    vialLow.textContent = `${T.lowEnd} ▸`
    levelHelp.textContent = T.levelHelp
    markHead.textContent = T.markTitle
    markNote.textContent = T.markFromA
    markLabel.textContent = `${T.markPos} (${T.markUnit})`
    markInput.setAttribute('aria-label', `${T.markPos} (${T.markUnit})`)
    markPlaceBtn.textContent = T.markPlace
    markNudges.forEach((b, i) => b.setAttribute('aria-label', fill(T.nudge, [-10, -1, 1, 10][i]!)))
    markClearBtn.textContent = T.markClear
    cartHead.textContent = T.cartTitle
    cartMarkLabel.textContent = T.cartAtMark
    cartMarkBtn.textContent = T.cartAtMarkBtn
    cartPosLabel.textContent = T.cartAtPos
    cartPosBtn.textContent = T.cartAtPosBtn
    cartResetBtn.textContent = T.cartReset
    cartNote.textContent = T.cartFront
  }

  function phaseText(): void {
    const T = S()
    const ph = app.cartState(ctx.now()).phase
    const txt = { unplaced: T.cartPhaseUnplaced, atStart: T.cartPhaseAtStart, rolling: T.cartPhaseRolling, stopped: T.cartPhaseStopped, stuck: T.cartPhaseStuck }[ph]
    if (cartPhase.textContent !== txt) cartPhase.textContent = txt
  }

  function sync(): void {
    const T = S()
    const s = app.getState()
    // rack and foot
    rack.input.value = String(s.rack_mm)
    rack.read.textContent = fill(T.rackReading, s.rack_mm)
    rack.enable(s.items.rackStand)
    rack.why.textContent = s.items.rackStand ? '' : T.rackNeed
    foot.input.value = String(s.foot_mm)
    foot.read.textContent = fill(T.footReading, (s.foot_mm > 0 ? '+' : s.foot_mm < 0 ? '−' : '') + formatNum(Math.abs(s.foot_mm), 2, L()))
    foot.enable(s.items.twoLegStand)
    foot.why.textContent = s.items.twoLegStand ? '' : T.footNeed
    // level
    const lv = app.levelReading()
    for (const [k, b] of levelBtns) {
      const active = k === 'away' ? lv.placement === null : lv.placement === k
      b.classList.toggle('active', active)
      b.setAttribute('aria-pressed', String(active))
      b.disabled = !s.items.level || (k === 'rail' && !s.items.rail)
    }
    vial.set(lv.bubble_mm)
    if (!s.items.level) levelRead.textContent = T.levelNeed
    else if (lv.bubble_mm === null) levelRead.textContent = T.levelIdle
    else {
      const base = lv.centered ? T.bubbleCentered : lv.bubble_mm > 0 ? T.bubbleHigh : T.bubbleLow
      levelRead.textContent = base + (lv.saturated && Math.abs(lv.bubble_mm) >= LEVEL_BUBBLE_MAX_mm ? T.bubbleSaturated : '')
    }
    // markers
    const canMark = s.items.markers && s.items.rail
    markInput.disabled = !canMark; markPlaceBtn.disabled = !canMark; markNudges.forEach((b) => { b.disabled = !canMark })
    markWhy.textContent = canMark ? '' : T.markNeed
    const ev = app.evaluateMarks()
    const marks = app.getMarkers()
    markClearBtn.hidden = marks.length === 0
    rebuild(markList, () => {
      if (marks.length === 0) { markList.append(el('li', 'muted', T.markNone)); return }
      const order = [...marks].sort((a, b) => ev.orderedRailPos_mm.indexOf(a.railPos_mm) - ev.orderedRailPos_mm.indexOf(b.railPos_mm))
      order.forEach((m) => {
        const idx = ev.orderedRailPos_mm.indexOf(m.railPos_mm)
        const rel = ev.fromA_mm[idx]! / 10
        const name = idx === 0 ? T.markA : fill(T.markRel, formatNum(rel, 1, L()).replace(/[.,]0$/, ''))
        const li = el('li', 'mark-row')
        li.append(el('span', 'mark-name', name))
        const inp = el('input', 'num mark-pos', undefined, { type: 'text', inputmode: 'decimal', autocomplete: 'off', 'data-k': `mk-${m.id}` })
        inp.value = formatNum(m.railPos_mm, 1, L()).replace(/[.,]0$/, '')
        inp.setAttribute('aria-label', fill(T.markMove, name))
        const commit = (): void => {
          const v = parseDecimal(inp.value)
          if (Number.isNaN(v) || v === m.railPos_mm) { inp.value = formatNum(m.railPos_mm, 1, L()).replace(/[.,]0$/, ''); return }
          fail(app.moveMarker(m.id, v))
        }
        inp.addEventListener('change', commit)
        inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') commit() })
        const mv = (d: number): void => fail(app.moveMarker(m.id, m.railPos_mm + d))
        const minus = button('−1', 'btn btn-quiet nudge', () => mv(-1)); minus.setAttribute('aria-label', fill(T.nudge, -1))
        const plus = button('+1', 'btn btn-quiet nudge', () => mv(1)); plus.setAttribute('aria-label', fill(T.nudge, 1))
        const rm = button('✕', 'btn btn-quiet nudge', () => fail(app.removeMarker(m.id))); rm.setAttribute('aria-label', fill(T.markRemove, name))
        li.append(inp, minus, plus, rm)
        markList.append(li)
      })
    })
    // cart
    phaseText()
    const canCart = s.items.cart && s.geometry !== null
    cartMarkSel.replaceChildren()
    if (marks.length === 0) cartMarkSel.append(el('option', undefined, T.noMarks, { value: '' }))
    ev.orderedRailPos_mm.forEach((p, i) => {
      const nm = i === 0 ? T.markA : fill(T.markRel, formatNum(ev.fromA_mm[i]! / 10, 1, L()).replace(/[.,]0$/, ''))
      cartMarkSel.append(el('option', undefined, `${nm} · ${formatNum(p, 1, L()).replace(/[.,]0$/, '')} mm`, { value: String(p) }))
    })
    for (const x of [cartMarkSel, cartMarkBtn, cartPosInput, cartPosBtn, cartResetBtn]) (x as HTMLButtonElement).disabled = !canCart
    cartMarkBtn.disabled = !canCart || marks.length === 0
    cartMarkSel.disabled = !canCart || marks.length === 0
    cartWhy.textContent = canCart ? '' : T.cartNeed
  }

  relabelStatic()
  return {
    update() { if (w.dirty()) { w.clear(); sync() } else phaseText() },
    relabel() { relabelStatic(); w.touch() },
    destroy() { w.off(); c.root.remove() },
  }
}
