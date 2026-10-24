// Settings panel (step 2): rack-stand and two-leg heights, screw foot, rail position, level and its vial, rail marks, ball choice,
// paper on the floor and the edge projection. Every action goes through the apparatus; the panel only renders its state.
import {
  FOOT_RANGE_mm, FOOT_STEP_mm, GAP_MAX_m, GAP_OVERHANG_MAX_m, LEG_MAX_mm, LEG_MIN_mm, MARK_UPPER_HALF_FROM_m, RACK_MAX_mm, RACK_MIN_mm, RAIL_LENGTH_m,
  type BallId, type LevelPlacement, type PaperOrientation, type Result,
} from '../apparatus/index.ts'
import type { MountView, View } from './view.ts'
import { button, card, el, nextId, rebuild, svg, watch } from '../../../core/views/dom.ts'
import { formatNum } from '../../../core/views/numfmt.ts'
import { cmText, parseCm } from './format.ts'
import { strings } from './strings/adjust.ts'
import { setBall } from './uistate.ts'

const VIAL_PX_PER_MM = 12

/** Close-up SVG of the level vial. Positive bubble offset moves the bubble to the right. */
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
      bubble.setAttribute('cx', String(120 + (b ?? 0) * VIAL_PX_PER_MM))
      bubble.style.visibility = b === null ? 'hidden' : 'visible'
    },
  }
}

/** A readout: only the number (with its unit) in the big value style, the words of the template small above it. */
function setReadout(out: HTMLElement, tpl: string, n: string | number): void {
  const m = /^(.*?)[:\s]*\{n\}(.*)$/.exec(tpl)
  const label = m ? m[1]!.trim() : ''
  const value = `${n}${m ? m[2]! : ''}`
  const num = el('span', 'readout-num', value)
  out.replaceChildren(...(label ? [el('span', 'readout-label', label), num] : [num]))
}

const fill = (tpl: string, vars: Record<string, string | number>): string => tpl.replace(/\{(\w+)\}/g, (_m, k: string) => String(vars[k] ?? ''))

export const mountAdjust: MountView = (root, ctx): View => {
  const app = ctx.apparatus
  const S = () => strings[ctx.lang()]
  const L = () => ctx.lang()
  const w = watch(app)
  const c = card('adjust', S().title, 'card-adjust')
  root.append(c.root)
  const done = (_r: Result): void => { ctx.changed() }

  // ---- slider with fine buttons --------------------------------------------------------------------------------------------------
  interface SliderOpts { min: number; max: number; step: number; nudges: number[]; set: (v: number) => Result; get: () => number; label: (d: number) => string }
  function sliderBlock(o: SliderOpts) {
    const wrap = el('div', 'slider-block')
    const id = nextId('rng')
    const label = el('label', 'field-label', undefined, { for: id })
    const input = el('input', 'range', undefined, { type: 'range', id, min: String(o.min), max: String(o.max), step: String(o.step) })
    input.addEventListener('input', () => done(o.set(Number(input.value))))
    const read = el('output', 'readout', undefined, { for: id })
    const nudges = el('div', 'nudges')
    const btns: { b: HTMLButtonElement; d: number }[] = []
    for (const st of o.nudges) for (const sign of [-1, 1]) {
      const d = sign * st
      const b = button('', 'btn btn-quiet nudge', () => done(o.set(Math.max(o.min, Math.min(o.max, o.get() + d)))))
      btns.push({ b, d })
      nudges.append(b)
    }
    const why = el('p', 'why')
    wrap.append(label, input, read, nudges, why)
    return {
      wrap, label, input, read, why, btns,
      enable(on: boolean) { input.disabled = !on; for (const x of btns) x.b.disabled = !on },
      relabelButtons() { for (const x of btns) { x.b.textContent = o.label(x.d); x.b.setAttribute('aria-label', fill(x.d > 0 ? S().up : S().down, { n: o.label(Math.abs(x.d)).replace(/^[+−]/, '') })) } },
    }
  }
  const mmLabel = (d: number): string => `${d > 0 ? '+' : '−'}${formatNum(Math.abs(d), Math.abs(d) < 1 ? 2 : 0, L())}`
  const cmLabel = (d_mm: number): string => `${d_mm > 0 ? '+' : '−'}${formatNum(Math.abs(d_mm) / 10, Math.abs(d_mm) < 10 ? 1 : 0, L())}`

  const rackHead = el('h3', 'sub-title')
  const rack = sliderBlock({ min: RACK_MIN_mm, max: RACK_MAX_mm, step: 1, nudges: [1, 5], set: (v) => app.setRackHeight_mm(v), get: () => app.getState().rack_mm, label: mmLabel })
  const legHead = el('h3', 'sub-title')
  const leg = sliderBlock({ min: LEG_MIN_mm, max: LEG_MAX_mm, step: 1, nudges: [1, 5], set: (v) => app.setLegHeight_mm(v), get: () => app.getState().leg_mm, label: mmLabel })
  const foot = sliderBlock({ min: -FOOT_RANGE_mm, max: FOOT_RANGE_mm, step: FOOT_STEP_mm, nudges: [0.05, 0.5], set: (v) => app.setFoot_mm(v), get: () => app.getState().foot_mm, label: mmLabel })
  const legNote = el('p', 'muted')
  const gapHead = el('h3', 'sub-title')
  const gapNote = el('p', 'muted')
  const gap = sliderBlock({ min: -Math.round(GAP_OVERHANG_MAX_m * 1000), max: Math.round(GAP_MAX_m * 1000), step: 1, nudges: [1, 10], set: (v) => app.setGap_mm(v), get: () => app.getState().gap_mm, label: cmLabel })

  // ---- level -----------------------------------------------------------------------------------------------------------------------
  const levelHead = el('h3', 'sub-title')
  const levelSeg = el('div', 'seg', undefined, { role: 'group' })
  const levelBtns = new Map<string, HTMLButtonElement>()
  for (const k of ['rail', 'table', 'away'] as const) {
    const b = button('', 'seg-btn', () => done(app.placeLevel(k === 'away' ? null : (k as LevelPlacement))))
    levelBtns.set(k, b)
    levelSeg.append(b)
  }
  const vial = buildVial()
  const vialWrap = el('div', 'vial-wrap')
  vialWrap.append(vial.svg)
  const levelRead = el('p', 'readout-text', undefined, { 'aria-live': 'polite' })
  const levelHelp = el('p', 'muted')

  // ---- marks -----------------------------------------------------------------------------------------------------------------------
  const markHead = el('h3', 'sub-title')
  const markSummary = el('p', 'mark-summary', undefined, { 'aria-live': 'polite' })
  const markEditBtn = button('', 'btn btn-sm', () => { renderMarks(); markDialog.showModal() })
  const markSumRow = el('div', 'mark-sum-row')
  markSumRow.append(markSummary, markEditBtn)
  const markDialog = el('dialog', 'sheet-dialog')
  const markDlgHead = el('div', 'sheet-dialog-head')
  const markDlgTitle = el('h2', 'sheet-dialog-title')
  const markDoneBtn = button('', 'btn btn-primary', () => markDialog.close())
  markDlgHead.append(markDlgTitle, markDoneBtn)
  markDialog.addEventListener('click', (e) => { if (e.target === markDialog) markDialog.close() })
  const markNote = el('p', 'muted')
  const markNewHead = el('h3', 'sub-title')
  const markInputId = nextId('mk')
  const markLabel = el('label', 'field-label', undefined, { for: markInputId })
  const markInput = el('input', 'num', undefined, { type: 'text', inputmode: 'decimal', id: markInputId, autocomplete: 'off', value: '60' })
  const markRow = el('div', 'inline-row')
  const markPlaceBtn = button('', 'btn btn-primary', () => {
    const v = parseCm(markInput.value)
    if (Number.isNaN(v)) { markInput.setAttribute('aria-invalid', 'true'); app.placeMark(NaN); ctx.changed(); return }
    markInput.removeAttribute('aria-invalid')
    const r = app.placeMark(v)
    if (r.ok) markInput.value = cmText(Math.min(RAIL_LENGTH_m, r.s_m + 0.1), L())
    ctx.changed()
  })
  const markNudgeRow = el('div', 'nudges')
  const markNudges: HTMLButtonElement[] = []
  for (const d of [-10, -1, 1, 10]) {
    const b = button(`${d > 0 ? '+' : '−'}${Math.abs(d)}`, 'btn btn-quiet nudge', () => {
      const v = parseCm(markInput.value)
      markInput.value = cmText(Math.max(0, Math.min(RAIL_LENGTH_m, (Number.isNaN(v) ? 0 : v) + d / 100)), L())
    })
    markNudges.push(b)
    markNudgeRow.append(b)
  }
  markRow.append(markInput, markPlaceBtn)
  const markList = el('ul', 'mark-list')
  const markClearBtn = button('', 'btn btn-quiet', () => { app.clearMarks(); ctx.changed() })
  const markFoot = el('div', 'inline-row')
  markFoot.append(markClearBtn)
  const markWhy = el('p', 'why')

  // ---- ball ------------------------------------------------------------------------------------------------------------------------
  const ballHead = el('h3', 'sub-title')
  const ballSeg = el('div', 'seg', undefined, { role: 'group' })
  const ballBtns = new Map<BallId, HTMLButtonElement>()
  for (const k of ['marble', 'pingpong'] as const) {
    const b = button('', 'seg-btn', () => { const r = app.selectBall(k); if (r.ok) setBall(k); ctx.changed() })
    ballBtns.set(k, b)
    ballSeg.append(b)
  }
  const ballStatus = el('p', 'readout-text', undefined, { 'aria-live': 'polite' })
  const ballMarkId = nextId('bm')
  const ballMarkLabel = el('label', 'field-label', undefined, { for: ballMarkId })
  const ballMarkSel = el('select', 'select', undefined, { id: ballMarkId })
  const ballPlaceBtn = button('', 'btn btn-primary', () => { if (ballMarkSel.value) done(app.placeBall({ markId: ballMarkSel.value })) })
  const ballResetBtn = button('', 'btn btn-quiet', () => done(app.resetBall()))
  const ballRow = el('div', 'inline-row')
  ballRow.append(ballMarkSel, ballPlaceBtn)
  const ballWhy = el('p', 'why')

  // ---- paper -----------------------------------------------------------------------------------------------------------------------
  const paperHead = el('h3', 'sub-title')
  const paperIntro = el('p', 'muted')
  const pxId = nextId('px'), pzId = nextId('pz')
  const pxLabel = el('label', 'field-label', undefined, { for: pxId })
  const pxInput = el('input', 'num', undefined, { type: 'text', inputmode: 'decimal', id: pxId, autocomplete: 'off', value: '40' })
  const pzLabel = el('label', 'field-label', undefined, { for: pzId })
  const pzInput = el('input', 'num', undefined, { type: 'text', inputmode: 'decimal', id: pzId, autocomplete: 'off', value: '0' })
  const pxWrap = el('div', 'stack'); pxWrap.append(pxLabel, pxInput)
  const pzWrap = el('div', 'stack'); pzWrap.append(pzLabel, pzInput)
  const pFields = el('div', 'inline-row'); pFields.append(pxWrap, pzWrap)
  const orientLabel = el('span', 'field-label')
  const orientSeg = el('div', 'seg', undefined, { role: 'group' })
  let orientation: PaperOrientation = 'alongX'
  const orientBtns = new Map<PaperOrientation, HTMLButtonElement>()
  for (const k of ['alongX', 'alongZ'] as const) {
    const b = button('', 'seg-btn', () => { orientation = k; paintOrient() })
    orientBtns.set(k, b)
    orientSeg.append(b)
  }
  function paintOrient(): void { for (const [k, b] of orientBtns) { b.classList.toggle('active', k === orientation); b.setAttribute('aria-pressed', String(k === orientation)) } }
  const readPaper = (): { x: number; z: number } | null => {
    const x = parseCm(pxInput.value), z = parseCm(pzInput.value)
    for (const [inp, v] of [[pxInput, x], [pzInput, z]] as const) { if (Number.isNaN(v)) inp.setAttribute('aria-invalid', 'true'); else inp.removeAttribute('aria-invalid') }
    if (Number.isNaN(x) || Number.isNaN(z)) { app.placeBond(NaN, NaN); ctx.changed(); return null }
    return { x, z }
  }
  const bondBtn = button('', 'btn btn-primary', () => { const p = readPaper(); if (p) done(app.placeBond(p.x, p.z, orientation)) })
  const bondOffBtn = button('', 'btn btn-quiet', () => done(app.removeBond()))
  const carbonBtn = button('', 'btn btn-quiet', () => {
    const b = app.getState().paper.bond
    done(b ? app.placeCarbon(b.x_m, b.z_m, b.orientation) : app.placeCarbon(0, 0))
  })
  const carbonOffBtn = button('', 'btn btn-quiet', () => done(app.removeCarbon()))
  const newSheetBtn = button('', 'btn btn-quiet', () => { const p = readPaper(); if (p) done(app.newBondSheet(p.x, p.z, orientation)) })
  const paperActions = el('div', 'inline-row'); paperActions.append(bondBtn, carbonBtn)
  const paperActions2 = el('div', 'inline-row'); paperActions2.append(newSheetBtn, bondOffBtn, carbonOffBtn)
  const paperState = el('p', 'readout-text', undefined, { 'aria-live': 'polite' })
  const paperWarn = el('p', 'why')
  const paperWhy = el('p', 'why')
  const edgeHead = el('h3', 'sub-title')
  const edgeNote = el('p', 'muted')
  const edgeBtn = button('', 'btn btn-quiet', () => done(app.placeEdgeProjection(0)))
  const edgeState = el('p', 'readout-text', undefined, { 'aria-live': 'polite' })

  markDialog.append(markDlgHead, markNote, markNewHead, markLabel, markRow, markNudgeRow, markWhy, markList, markFoot)

  c.body.append(
    rackHead, rack.wrap, legHead, leg.wrap, foot.wrap, legNote,
    gapHead, gap.wrap, gapNote,
    levelHead, levelSeg, vialWrap, levelRead, levelHelp,
    markHead, markSumRow, markDialog,
    ballHead, ballSeg, ballStatus, ballMarkLabel, ballRow, ballResetBtn, ballWhy,
    paperHead, paperIntro, pFields, orientLabel, orientSeg, paperActions, paperActions2, paperState, paperWarn, paperWhy,
    edgeHead, edgeNote, edgeBtn, edgeState,
  )

  function relabelStatic(): void {
    const T = S()
    c.title.textContent = T.title
    rackHead.textContent = T.rackTitle; rack.label.textContent = T.rackLabel; rack.relabelButtons()
    legHead.textContent = T.legTitle; leg.label.textContent = T.legLabel; leg.relabelButtons()
    foot.label.textContent = T.footLabel; foot.relabelButtons()
    legNote.textContent = T.legNote
    gapHead.textContent = T.gapTitle; gap.label.textContent = T.gapLabel; gap.relabelButtons(); gapNote.textContent = T.gapNote
    levelHead.textContent = T.levelTitle
    levelSeg.setAttribute('aria-label', T.levelGroup)
    levelBtns.get('rail')!.textContent = T.levelOnRail
    levelBtns.get('table')!.textContent = T.levelOnTable
    levelBtns.get('away')!.textContent = T.levelAway
    vial.svg.setAttribute('aria-label', T.vialAria)
    markHead.textContent = T.markTitle
    markDlgTitle.textContent = T.markTitle
    markNewHead.textContent = T.markNewTitle
    markEditBtn.textContent = T.markEdit; markEditBtn.setAttribute('aria-label', T.markEditAria)
    markDoneBtn.textContent = T.markDone
    markNote.textContent = T.markNote
    markLabel.textContent = T.markPos
    markPlaceBtn.textContent = T.markPlace
    markNudges.forEach((b, i) => b.setAttribute('aria-label', fill(T.markNudge, { n: `${[-10, -1, 1, 10][i]! > 0 ? '+' : '−'}${Math.abs([-10, -1, 1, 10][i]!)}` })))
    markClearBtn.textContent = T.markClear
    ballHead.textContent = T.ballTitle
    ballSeg.setAttribute('aria-label', T.ballGroup)
    ballBtns.get('marble')!.textContent = T.marble
    ballBtns.get('pingpong')!.textContent = T.pingPong
    ballMarkLabel.textContent = T.ballOnMark
    ballPlaceBtn.textContent = T.ballPlace
    ballResetBtn.textContent = T.ballReset
    paperHead.textContent = T.paperTitle; paperIntro.textContent = T.paperIntro
    pxLabel.textContent = T.paperX; pzLabel.textContent = T.paperZ
    orientLabel.textContent = T.paperOrientation
    orientBtns.get('alongX')!.textContent = T.alongX; orientBtns.get('alongZ')!.textContent = T.alongZ
    orientSeg.setAttribute('aria-label', T.paperOrientation)
    paintOrient()
    bondBtn.textContent = T.paperPlace; bondOffBtn.textContent = T.paperRemove
    carbonBtn.textContent = T.carbonPlace; carbonOffBtn.textContent = T.carbonRemove
    newSheetBtn.textContent = T.paperNew
    edgeHead.textContent = T.edgeTitle; edgeNote.textContent = T.edgeNote; edgeBtn.textContent = T.edgePlace
  }

  const markName = (rank: number): string => fill(S().markName, { n: rank + 1 })

  function sync(): void {
    const T = S()
    const s = app.getState()
    // heights, foot, gap
    rack.input.value = String(s.rack_mm)
    setReadout(rack.read, T.rackReading, s.rack_mm)
    rack.enable(s.items.rackStand)
    rack.why.textContent = s.items.rackStand ? '' : T.rackNeed
    leg.input.value = String(s.leg_mm)
    setReadout(leg.read, T.legReading, s.leg_mm)
    leg.enable(s.items.twoLeg)
    leg.why.textContent = s.items.twoLeg ? '' : T.legNeed
    foot.input.value = String(s.foot_mm)
    setReadout(foot.read, T.footReading, `${s.foot_mm > 0 ? '+' : s.foot_mm < 0 ? '−' : ''}${formatNum(Math.abs(s.foot_mm), 2, L())}`)
    foot.enable(s.items.twoLeg)
    gap.input.value = String(s.gap_mm)
    setReadout(gap.read, s.gap_mm < 0 ? T.gapReadingBeyond : T.gapReading, formatNum(Math.abs(s.gap_mm) / 10, 1, L()))
    gap.enable(s.items.rail)
    gap.why.textContent = s.items.rail ? '' : T.gapNeed
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
    else levelRead.textContent = (lv.centered ? T.bubbleCentered : lv.bubble_mm > 0 ? T.bubbleRight : T.bubbleLeft) + (lv.saturated ? T.bubbleSaturated : '')
    levelHelp.textContent = lv.placement === 'rail' ? T.levelHelpRail : lv.placement === 'table' ? T.levelHelpTable : ''
    // marks
    const marks = [...app.getMarks()].sort((a, b) => a.s_m - b.s_m)
    const canMark = s.items.rail && s.items.tapeMeasure
    markInput.disabled = !canMark; markPlaceBtn.disabled = !canMark; for (const b of markNudges) b.disabled = !canMark
    markWhy.textContent = canMark ? '' : T.markNeed
    markSummary.textContent = marks.length === 0 ? T.markSummaryNone : marks.length === 1 ? T.markSummaryOne : fill(T.markSummary, { n: marks.length })
    markEditBtn.disabled = !canMark
    markClearBtn.hidden = marks.length === 0
    if (markDialog.open) renderMarks()
    // ball
    const bothBalls = s.items.marble && s.items.pingPong
    for (const [k, b] of ballBtns) {
      const have = s.items[k === 'marble' ? 'marble' : 'pingPong']
      b.disabled = !have
      b.classList.toggle('active', s.ball.selected === k)
      b.setAttribute('aria-pressed', String(s.ball.selected === k))
    }
    ballMarkSel.replaceChildren()
    if (marks.length === 0) ballMarkSel.append(el('option', undefined, T.ballNoMarks, { value: '' }))
    marks.forEach((m, i) => ballMarkSel.append(el('option', undefined, `${markName(i)} · ${cmText(m.s_m, L())} cm`, { value: m.id })))
    const sel = marks.findIndex((m) => m.id === s.ball.markId)
    if (sel >= 0) ballMarkSel.selectedIndex = sel
    const canPlace = s.ball.selected !== null && s.joints.rackClamp && marks.length > 0
    ballMarkSel.disabled = !canPlace; ballPlaceBtn.disabled = !canPlace
    ballResetBtn.hidden = !(s.ball.released && s.ball.s_m !== null)
    ballWhy.textContent = bothBalls ? '' : T.ballNeed
    phaseText()
    // paper
    const p = s.paper
    const canPaper = s.items.bondPaper
    bondBtn.disabled = !canPaper; pxInput.disabled = !canPaper; pzInput.disabled = !canPaper
    bondOffBtn.hidden = !p.bond
    carbonBtn.disabled = !s.items.carbonPaper || !p.bond
    carbonOffBtn.hidden = !p.carbon
    newSheetBtn.disabled = !canPaper || p.sheetsAvailable <= 0 || !p.bond
    newSheetBtn.hidden = !p.bond
    paperWhy.textContent = canPaper && s.items.carbonPaper ? '' : T.paperNeed
    paperState.textContent = p.bond
      ? `${fill(T.paperState, { x: cmText(p.bond.x_m, L()) })} ${p.carbon ? T.carbonOn : T.carbonOff} ${fill(T.sheetsLeft, { n: p.sheetsAvailable })}`
      : T.paperNone
    paperWarn.textContent = p.paperMovedSinceMarks ? T.paperMoved : ''
    edgeBtn.disabled = false
    edgeState.textContent = s.edgeProjection ? T.edgeDone : ''
  }

  function phaseText(): void {
    const T = S()
    const s = app.getState()
    const ph = app.ballStatus(ctx.now()).phase
    let key: keyof typeof T.ballStatus
    if (s.ball.selected === null) key = 'none'
    else if (ph === 'rolling' || ph === 'flying') key = 'moving'
    else if (s.ball.released) key = 'done'
    else key = s.ball.placed ? 'placed' : 'chosen'
    const txt = T.ballStatus[key]
    if (ballStatus.textContent !== txt) ballStatus.textContent = txt
  }

  function renderMarks(): void {
    const T = S()
    const marks = [...app.getMarks()].sort((a, b) => a.s_m - b.s_m)
    rebuild(markList, () => {
      if (marks.length === 0) { markList.append(el('li', 'muted', T.markNone)); return }
      marks.forEach((m, rank) => {
        const name = markName(rank)
        const li = el('li', 'mark-row')
        li.append(el('span', 'mark-name', name))
        const inp = el('input', 'num mark-pos', undefined, { type: 'text', inputmode: 'decimal', autocomplete: 'off', 'data-k': `mk-${m.id}` })
        inp.value = cmText(m.s_m, L())
        inp.setAttribute('aria-label', fill(T.markMove, { x: name }))
        const commit = (): void => {
          const v = parseCm(inp.value)
          if (Number.isNaN(v) || Math.abs(v - m.s_m) < 1e-9) { inp.value = cmText(m.s_m, L()); return }
          done(app.moveMark(m.id, v))
        }
        inp.addEventListener('change', commit)
        inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') commit() })
        const mv = (d: number): void => done(app.moveMark(m.id, m.s_m + d))
        const minus = button('−1', 'btn btn-quiet nudge', () => mv(-0.01)); minus.setAttribute('aria-label', fill(T.markNudge, { n: '−1' }))
        const plus = button('+1', 'btn btn-quiet nudge', () => mv(0.01)); plus.setAttribute('aria-label', fill(T.markNudge, { n: '+1' }))
        const rm = button('✕', 'btn btn-quiet nudge', () => done(app.removeMark(m.id))); rm.setAttribute('aria-label', fill(T.markRemove, { x: name }))
        li.append(inp, minus, plus, rm)
        if (m.s_m < MARK_UPPER_HALF_FROM_m - 1e-9) li.append(el('span', 'chip chip-need mark-lower', T.markLower))
        markList.append(li)
      })
    })
  }

  relabelStatic()
  return {
    update() { if (w.dirty()) { w.clear(); sync() } else phaseText() },
    relabel() { relabelStatic(); w.touch() },
    destroy() { w.off(); c.root.remove() },
  }
}
