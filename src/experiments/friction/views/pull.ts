// Pull panel (exps. 1 and 2): the hand's speed, start/stop/release, the spring scale's needle drawn from pullStatus(now) and the "Read"
// button. The Read press is the student's own timing: it takes the timestamp of the pointerdown / keydown (core/views/press.ts), and the
// apparatus returns what the needle shows at that instant, quantised to the scale division. The view never computes physics.
import { SPRING_SCALES, type SpringScaleSpec } from '../../../core/instruments/springScale.ts'
import type { TableKey } from './uistate.ts'
import { advanceCell, getCell, getPullSpeed, onUiState, setPullSpeed } from './uistate.ts'
import type { MountView, View } from './view.ts'
import { button, card, el, nextId, svg, watch } from '../../../core/views/dom.ts'
import { fmt } from '../../../core/pedagogy/dom.ts'
import { formatNum } from '../../../core/views/numfmt.ts'
import { onPress } from '../../../core/views/press.ts'
import { strings } from './strings/pull.ts'

const VB_W = 320, VB_H = 76, X0 = 26, X1 = 296

export function mountPull(table: TableKey): MountView {
  return (root, ctx): View => {
    const app = ctx.apparatus
    const S = () => strings[ctx.lang()]
    const w = watch(app)
    const c = card(`pull${table}`, S().title1, 'card-pull')
    const hint = el('p', 'muted')
    const gauge = svg('svg', { viewBox: `0 0 ${VB_W} ${VB_H}`, class: 'gauge', role: 'img', preserveAspectRatio: 'xMidYMid meet' })
    const ticks = svg('g', { class: 'gauge-ticks' })
    const needle = svg('line', { class: 'gauge-needle', x1: X0, x2: X0, y1: 8, y2: 52 })
    gauge.append(svg('rect', { class: 'gauge-body', x: 6, y: 12, width: VB_W - 12, height: 36, rx: 6 }), ticks, needle)

    const speedId = nextId('spd')
    const speedRow = el('div', 'pull-speed')
    const speedLabel = el('label', 'readout-label', undefined, { for: speedId })
    const slider = el('input', 'range', undefined, { type: 'range', id: speedId, min: '0.5', max: '10', step: '0.5' })
    slider.value = String(getPullSpeed())
    const speedOut = el('output', 'readout-num', undefined, { for: speedId })
    speedRow.append(speedLabel, slider, speedOut)
    const presets = el('div', 'seg-row')
    const presetBtns = ([['slow', 1], ['medium', 4], ['fast', 8]] as const).map(([k, v]) => {
      const b = button('', 'seg-btn', () => { slider.value = String(v); apply() })
      b.dataset.k = `preset-${k}`
      presets.append(b)
      return { b, k, v }
    })
    const actions = el('div', 'pull-actions')
    const start = button('', 'btn', () => { app.pullStart(ctx.now(), getPullSpeed() / 100); ctx.changed() })
    const stopHand = button('', 'btn', () => { app.pullStop(ctx.now()); ctx.changed() })
    const release = button('', 'btn', () => { app.pullEnd(ctx.now()); ctx.changed() })
    start.dataset.k = 'start'; stopHand.dataset.k = 'stop'; release.dataset.k = 'release'
    actions.append(start, stopHand, release)
    const read = el('button', 'btn btn-primary pull-read', undefined, { type: 'button' })
    read.dataset.k = 'read'
    onPress(read, (t) => { app.readScale(t); ctx.changed() })
    const status = el('p', 'readout-text', undefined, { role: 'status' })
    const last = el('p', 'readout-text', undefined, { role: 'status', 'aria-live': 'polite' })
    const warn = el('p', 'why', undefined, { role: 'status' })
    const copy = button('', 'btn btn-sm', () => {
      const cell = getCell(table)
      const r = app.tableCopyForce(table === '4.1' ? '4.1' : '4.2', cell.row, cell.col)
      if (r.ok) advanceCell(table)
      ctx.changed()
    })
    copy.dataset.k = 'copy'
    const copyTo = el('span', 'muted')
    const keys = el('p', 'muted')
    // the gauge sits right above "Read" so the needle and the button are on screen together on a phone
    c.body.append(hint, speedRow, presets, actions, gauge, read, status, last, warn, copy, copyTo, keys)
    root.append(c.root)

    function apply(): void {
      setPullSpeed(Number(slider.value))
      const s = app.getState()
      if (s.pulling) app.pullSetSpeed(ctx.now(), getPullSpeed() / 100)
      ctx.changed()
    }
    slider.addEventListener('input', apply)

    let drawnScale = ''
    function drawTicks(spec: SpringScaleSpec): void {
      ticks.replaceChildren()
      const nDiv = Math.round(spec.range_N / spec.division_N)
      for (let i = 0; i <= nDiv; i++) {
        const F = i * spec.division_N
        const x = X0 + (F / spec.range_N) * (X1 - X0)
        const label = Math.abs(F / spec.labelStep_N - Math.round(F / spec.labelStep_N)) < 1e-6
        ticks.append(svg('line', { class: 'gauge-tick', x1: x, x2: x, y1: 12, y2: label ? 32 : i % 5 === 0 ? 26 : 21 }))
        if (label) ticks.append(svg('text', { class: 'gauge-num', x, y: 46, 'text-anchor': 'middle' }, formatNum(F, F % 1 === 0 ? 0 : 1, ctx.lang())))
      }
      ticks.append(svg('text', { class: 'gauge-num gauge-unit', x: X1 + 14, y: 70, 'text-anchor': 'end' }, 'N'))
    }
    function label(): void {
      const T = S()
      const d = getPullSpeed()
      c.title.textContent = table === '4.1' ? T.title1 : T.title2
      hint.textContent = table === '4.1' ? T.hint1 : T.hint2
      speedLabel.textContent = T.speed
      speedOut.textContent = fmt(T.speedValue, { v: formatNum(d, 1, ctx.lang()) })
      for (const p of presetBtns) { p.b.textContent = `${T.presets[p.k]} · ${p.v}`; p.b.setAttribute('aria-pressed', String(Math.abs(d - p.v) < 0.01)) }
      start.textContent = T.start; stopHand.textContent = T.stopHand; release.textContent = T.release
      read.textContent = T.read
      read.setAttribute('aria-label', `${T.read}: ${T.readHint}`)
      copy.textContent = T.copy
      const cell = getCell(table)
      copyTo.textContent = fmt(T.copyTo, { t: table, r: cell.row + 1, n: cell.col + 1 })
      keys.textContent = T.keys
      drawnScale = ''
    }
    label()
    const offUi = onUiState(() => { slider.value = String(getPullSpeed()); label() })

    let lastText = ''
    function frame(): void {
      const T = S()
      const spec = (app.currentScale()?.spec ?? SPRING_SCALES['1N'])
      if (drawnScale !== spec.id + ctx.lang()) {
        drawnScale = spec.id + ctx.lang()
        drawTicks(spec)
        gauge.setAttribute('aria-label', `${T.gauge}: ${fmt(T.gaugeAria, { r: spec.range_N, d: formatNum(spec.division_N, 2, ctx.lang()) })}`)
      }
      const st = app.pullStatus(ctx.now())
      const F = st.scale?.indicated_N ?? 0
      const x = X0 + (F / spec.range_N) * (X1 - X0)
      needle.setAttribute('x1', String(x)); needle.setAttribute('x2', String(x))
      const phase = st.phase === 'idle' ? T.status.idle : st.phase === 'ended' ? T.status.ended : st.offPaper ? T.status.offPaper : st.sliding ? T.status.sliding : T.status.stuck
      if (phase !== lastText) { lastText = phase; status.textContent = phase }
      const lr = app.lastScaleReading()
      const lt = lr ? fmt(T.last, { f: formatNum(lr.value_N, 2, ctx.lang()) }) : T.noLast
      if (last.textContent !== lt) last.textContent = lt
      const wtxt = lr && lr.overRange ? T.over : lr && lr.belowZero ? T.low : ''
      if (warn.textContent !== wtxt) warn.textContent = wtxt
      const s = app.getState()
      start.hidden = s.pulling
      stopHand.hidden = !s.pulling
      release.hidden = !s.pulling
      read.setAttribute('aria-disabled', String(!s.pulling))
    }
    return {
      update() { if (w.dirty()) { w.clear(); label() } frame() },
      relabel() { w.touch(); label() },
      focus(targets) { c.root.classList.toggle('focus', !!targets && targets.length > 0) },
      destroy() { w.off(); offUi(); c.root.remove() },
    }
  }
}
