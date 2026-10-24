// Tape measure panel: the steel blade drawn from the true length (the student reads it; no number is printed). Mounted twice
// (step 2 for the bench lengths, step 3 for the ranges); both share the chosen target (uistate) with the 3D scene.
import type { TapeReading, TapeTarget } from '../apparatus/index.ts'
import type { MountView, View } from './view.ts'
import { button, card, el, nextId, watch } from '../../../core/views/dom.ts'
import { PX_BASE, WIN_BEFORE_MM, drawBlade } from '../../../core/views/blade.ts'
import { formatNum } from '../../../core/views/numfmt.ts'
import { strings } from './strings/tape.ts'
import { getTape, onUiState, setTape, tapeFromKey, tapeKey } from './uistate.ts'

const CLEARING = new Set([
  'heightSet', 'gapSet', 'attached', 'detached', 'itemRemoved', 'itemAdded', 'presetApplied', 'loaded', 'markMoved', 'markRemoved',
  'bondPlaced', 'bondRemoved', 'bondSheetReplaced', 'edgeProjectionPlaced',
])

/** `panel` is the data-panel id of this instance ('tape' in step 2, 'tapeRange' in step 3). */
export function mountTape(panel: string): MountView {
  return (root, ctx): View => {
    const app = ctx.apparatus
    const S = () => strings[ctx.lang()]
    const L = () => ctx.lang()
    const w = watch(app)
    const c = card(panel, S().title, 'card-tape')
    root.append(c.root)

    let reading: TapeReading | null = null
    let readingLabel = ''
    let zoom = 1
    let drawnKey = ''
    let optionsKey = ''
    const off = app.on((e) => { if (CLEARING.has(e.type)) reading = null })

    const tSelId = nextId('ct')
    const tLabel = el('label', 'field-label', undefined, { for: tSelId })
    const tSel = el('select', 'select', undefined, { id: tSelId })
    const measureBtn = button('', 'btn btn-primary')
    const why = el('p', 'why')
    const status = el('p', 'readout-text', undefined, { 'aria-live': 'polite' })
    const hint = el('p', 'muted')

    const bWrap = el('div', 'blade-wrap')
    const bScroll = el('div', 'blade-scroll', undefined, { tabindex: '0', role: 'group' })
    const zoomRow = el('div', 'zoom-row')
    const zoomLabel = el('span', 'muted')
    const zOut = button('−', 'btn btn-quiet nudge', () => { zoom = Math.max(1, zoom / 2); drawnKey = ''; w.touch() })
    const zIn = button('+', 'btn btn-quiet nudge', () => { zoom = Math.min(4, zoom * 2); drawnKey = ''; w.touch() })
    const zVal = el('span', 'zoom-val')
    zoomRow.append(zoomLabel, zOut, zVal, zIn)
    const noNum = el('p', 'muted')
    const tolerance = el('p', 'muted')
    bWrap.append(bScroll, zoomRow, noNum, tolerance)

    const how = el('details', 'help-box')
    const howSum = el('summary')
    const howList = el('ol')
    how.append(howSum, howList)

    c.body.append(tLabel, tSel, measureBtn, why, status, hint, bWrap, how)

    tSel.addEventListener('change', () => { const t = tapeFromKey(tSel.value); if (t) { reading = null; setTape(t) } })
    measureBtn.addEventListener('click', () => {
      const r = app.tapeMeasure(getTape())
      if (r.ok) { reading = r.reading; readingLabel = tSel.selectedOptions[0]?.textContent ?? ''; drawnKey = '' }
      ctx.changed()
    })
    let lastKey = tapeKey(getTape())
    const offUi = onUiState(() => {
      const k = tapeKey(getTape())
      if (k !== lastKey) { lastKey = k; reading = null }
      w.touch()
    })

    /** Targets on offer: the bench lengths, the rail marks (by rank) and the carbon marks that exist now. */
    function targets(): Array<{ key: string; target: TapeTarget; text: string }> {
      const T = S()
      const out: Array<{ key: string; target: TapeTarget; text: string }> = []
      const add = (target: TapeTarget, text: string): void => { out.push({ key: tapeKey(target), target, text }) }
      add({ kind: 'launchHeight' }, T.tLaunchHeight)
      add({ kind: 'gap' }, T.tGap)
      add({ kind: 'rise' }, T.tRise)
      ;[...app.getMarks()].sort((a, b) => a.s_m - b.s_m).forEach((m, i) => add({ kind: 'markPosition', markId: m.id }, T.tMark.replace('{n}', String(i + 1))))
      app.paperMarks(ctx.now()).forEach((m, i) => add({ kind: 'range', carbonId: m.id }, T.tRange.replace('{n}', String(i + 1)).replace('{ball}', T.balls[m.ball]).replace('{run}', String(m.runId))))
      return out
    }

    function labels(): void {
      const T = S()
      c.title.textContent = T.title
      tLabel.textContent = T.target
      measureBtn.textContent = T.measure
      zoomLabel.textContent = T.zoom
      zIn.setAttribute('aria-label', T.zoomIn)
      zOut.setAttribute('aria-label', T.zoomOut)
      bScroll.setAttribute('aria-label', T.bladeAria)
      noNum.textContent = T.noNumeric
      howSum.textContent = T.how
      howList.replaceChildren(...T.howSteps.map((x) => el('li', undefined, x)))
      optionsKey = ''
      drawnKey = ''
    }

    function sync(): void {
      const T = S()
      const s = app.getState()
      const has = s.items.tapeMeasure
      const list = targets()
      const key = `${L()}|${list.map((x) => `${x.key}=${x.text}`).join('|')}`
      if (key !== optionsKey) {
        optionsKey = key
        tSel.replaceChildren(...list.map((x) => el('option', undefined, x.text, { value: x.key })))
      }
      const want = tapeKey(getTape())
      if (list.some((x) => x.key === want)) tSel.value = want
      else if (list[0]) { tSel.value = list[0].key; setTape(list[0].target) } // the chosen mark is gone: fall back to the first target
      for (const x of [tSel, measureBtn, zIn, zOut]) (x as HTMLButtonElement).disabled = !has
      why.textContent = has ? '' : T.needTape
      bWrap.hidden = !has || !reading // nothing to read or zoom until the student has measured
      status.textContent = !has ? '' : reading ? T.measuring.replace('{x}', readingLabel) : T.prompt
      hint.textContent = has && getTape().kind === 'range' ? T.rangeHint : ''
      tolerance.textContent = reading ? T.tolerance.replace('{x}', formatNum(reading.mpe_m * 1000, 1, L())) : ''
      zVal.textContent = `×${zoom}`
      const L_mm = reading ? reading.tape.edge_mm : null
      const dk = `${L_mm}|${zoom}|${has}`
      if (dk !== drawnKey) {
        drawnKey = dk
        bScroll.replaceChildren()
        if (has && L_mm !== null) {
          bScroll.append(drawBlade(L_mm, zoom))
          // centre the measured edge in the visible strip
          bScroll.scrollLeft = Math.max(0, (WIN_BEFORE_MM + (L_mm - Math.floor(L_mm))) * PX_BASE * zoom - (bScroll.clientWidth || 300) / 2)
        }
      }
    }

    labels()
    return {
      update() { if (w.dirty()) { w.clear(); sync() } },
      relabel() { labels(); w.touch() },
      destroy() { off(); offUi(); w.off(); c.root.remove() },
    }
  }
}
