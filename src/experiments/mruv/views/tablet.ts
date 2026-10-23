// DigiCart "tablet" panel: reference data for a run (encoder x(t), true crossing times of the marks) and a comparison
// with the student's own stopwatch stops. The real DigiCart measures this with its own sensor; labelled as such.
import uPlot from 'uplot'
import 'uplot/dist/uPlot.min.css'
import { TABLE_POSITIONS_cm } from '../apparatus/index.ts'
import type { DigicartRecord, RunRecord } from '../apparatus/index.ts'
import type { MountView, View } from './view.ts'
import { card, el, nextId, watch } from '../../../core/views/dom.ts'
import { formatNum } from '../../../core/views/numfmt.ts'
import { strings } from './strings/tablet.ts'
import '../styles/tablet.css'

const REFRESH_ms = 100
const MARK_MATCH_mm = 2

/** Distance of a mark from the run's start position along the rail, mm. Pure. */
export function markDistance_mm(run: RunRecord, railPos_mm: number): number {
  return Math.abs(railPos_mm - run.startRailPos_mm)
}

export const mountTablet: MountView = (root, ctx): View => {
  const app = ctx.apparatus
  const S = () => strings[ctx.lang()]
  const L = () => ctx.lang()
  const w = watch(app)
  const c = card('tablet', S().title, 'card-tablet')
  root.append(c.root)

  const device = el('div', 'tablet')
  const bar = el('div', 'tablet-bar')
  const appName = el('span', 'tablet-app')
  const selId = nextId('run')
  const selLabel = el('label', 'visually-hidden', undefined, { for: selId })
  const sel = el('select', 'tablet-select', undefined, { id: selId })
  bar.append(appName, selLabel, sel)
  const screen = el('div', 'tablet-screen')
  const empty = el('div', 'tablet-empty')
  const emptyA = el('strong'), emptyB = el('span')
  empty.append(emptyA, emptyB)
  const plotHost = el('div', 'plot-host', undefined, { role: 'img' })
  const rolling = el('p', 'tablet-note')
  const marksTitle = el('h3', 'tablet-sub')
  const marksList = el('ul', 'tablet-marks')
  const cmpTitle = el('h3', 'tablet-sub')
  const cmpWrap = el('div', 'tablet-table-wrap')
  const cmpNote = el('p', 'tablet-note')
  const sensor = el('p', 'tablet-note')
  screen.append(empty, plotHost, rolling, marksTitle, marksList, cmpTitle, cmpWrap, cmpNote, sensor)
  device.append(bar, screen)
  const disclaimer = el('p', 'note')
  c.body.append(disclaimer, device)

  let plot: uPlot | null = null
  let selected: number | null = null
  let userPicked = false
  let lastRunCount = 0
  let builtKey = ''
  let truncated = ''
  const recCache = new Map<number, DigicartRecord | null>()
  const recFor = (id: number): DigicartRecord | null => {
    if (!recCache.has(id)) recCache.set(id, app.digicartRecord(id))
    return recCache.get(id) ?? null
  }
  const offEv = app.on((e) => { if (e.type === 'loaded' || e.type === 'presetApplied') recCache.clear() })

  sel.addEventListener('change', () => { selected = Number(sel.value); userPicked = true; builtKey = ''; w.touch() })

  function elapsed_s(run: RunRecord): number {
    const e = (ctx.now() - run.releaseTime_ms) / 1000
    return e < 0 ? Infinity : e // a record loaded from a previous session is complete
  }

  function themeColor(name: string): string {
    return getComputedStyle(plotHost).getPropertyValue(name).trim() || '#fff'
  }

  function buildPlot(rec: DigicartRecord, run: RunRecord): void {
    plot?.destroy()
    plot = null
    plotHost.replaceChildren()
    const T = S()
    const ink = themeColor('--stage-ink'), ink2 = themeColor('--stage-ink-2'), line = themeColor('--stage-blue'), mark = themeColor('--stage-yellow')
    const grid = { stroke: themeColor('--stage-metal'), width: 1 }
    const width = Math.max(240, plotHost.clientWidth || 300)
    const font = '12px ' + getComputedStyle(plotHost).getPropertyValue('--font')
    plot = new uPlot({
      width, height: 220, legend: { show: false }, cursor: { show: false }, select: { show: false, left: 0, top: 0, width: 0, height: 0 },
      scales: { x: { time: false }, y: {} },
      axes: [
        { stroke: ink2, grid, ticks: grid, label: T.axisT, labelFont: font, font, labelSize: 18, size: 36 },
        { stroke: ink2, grid, ticks: grid, label: T.axisX, labelFont: font, font, labelSize: 18, size: 52, values: (_u, v) => v.map((x) => formatNum(x, 2, L())) },
      ],
      series: [{}, { label: T.seriesX, stroke: line, width: 2, points: { show: false } }],
      hooks: {
        draw: [(u) => {
          const ctx2 = u.ctx
          ctx2.save()
          ctx2.font = font
          ctx2.textBaseline = 'bottom'
          const e = elapsed_s(run)
          for (const m of rec.marks) {
            if (m.trueTime_s === null || m.trueTime_s > e) continue
            const x = u.valToPos(m.trueTime_s, 'x', true)
            const y = u.valToPos(markDistance_mm(run, m.railPos_mm) / 1000, 'y', true)
            ctx2.fillStyle = mark
            ctx2.beginPath(); ctx2.arc(x, y, 4 * devicePixelRatio, 0, Math.PI * 2); ctx2.fill()
            ctx2.fillStyle = ink
            const cm = Math.round(markDistance_mm(run, m.railPos_mm) / 10)
            if (cm % 20 === 0 && cm > 0) ctx2.fillText(T.markLabel.replace('{x}', String(cm)), x + 6 * devicePixelRatio, y - 4 * devicePixelRatio)
          }
          ctx2.restore()
        }],
      },
    }, [[0], [0]], plotHost)
    plotHost.setAttribute('aria-label', T.plotAria)
  }

  function fillPlot(rec: DigicartRecord, run: RunRecord): void {
    if (!plot) return
    const e = elapsed_s(run)
    let n = rec.t_s.length
    if (e !== Infinity) { n = rec.t_s.findIndex((t) => t > e); if (n < 0) n = rec.t_s.length }
    n = Math.max(1, n)
    plot.setData([rec.t_s.slice(0, n), rec.x_m.slice(0, n)])
    truncated = n < rec.t_s.length ? 'y' : ''
    rolling.textContent = truncated ? S().rolling : ''
  }

  function renderLists(rec: DigicartRecord, run: RunRecord): void {
    const T = S()
    marksTitle.textContent = T.marks
    marksList.replaceChildren()
    for (const m of rec.marks) {
      const cm = Math.round(markDistance_mm(run, m.railPos_mm) / 10)
      const li = el('li', undefined, `${T.markLabel.replace('{x}', String(cm))}: ${m.trueTime_s === null ? T.markNone : T.markTime.replace('{t}', formatNum(m.trueTime_s, 3, L()))}`)
      marksList.append(li)
    }
    cmpTitle.textContent = T.compare
    cmpWrap.replaceChildren()
    const stops = app.stopLog().filter((s) => s.runId === run.id)
    if (stops.length === 0) { cmpWrap.append(el('p', 'tablet-note', T.noStops)); cmpNote.textContent = ''; return }
    const tbl = el('table', 'tablet-table')
    const head = el('tr')
    for (const h of [T.colMark, T.colYou, T.colCart, T.colDiff, T.colStart]) head.append(el('th', undefined, h, { scope: 'col' }))
    const thead = el('thead'); thead.append(head)
    const tb = el('tbody')
    for (const s of stops) {
      const tr = el('tr')
      const xcm = s.markTarget !== null ? TABLE_POSITIONS_cm[s.markTarget] ?? null : null
      const m = xcm === null ? null : rec.marks.find((k) => Math.abs(markDistance_mm(run, k.railPos_mm) - xcm * 10) <= MARK_MATCH_mm) ?? null
      const truth = m?.trueTime_s ?? null
      const diff = truth === null ? null : s.reading_s - truth
      const sgn = (v: number): string => (v > 0 ? '+' : v < 0 ? '−' : '') + formatNum(Math.abs(v), 2, L())
      tr.append(
        el('th', undefined, xcm === null ? T.noMarkTarget : T.cartCm.replace('{x}', String(xcm)), { scope: 'row' }),
        el('td', undefined, formatNum(s.reading_s, 2, L())),
        el('td', undefined, truth === null ? '—' : formatNum(truth, 3, L())),
        el('td', undefined, diff === null ? '—' : sgn(diff)),
        el('td', undefined, s.startOffset_s === null ? '—' : (s.startOffset_s >= 0 ? T.startLate : T.startEarly).replace('{t}', formatNum(Math.abs(s.startOffset_s), 2, L()))),
      )
      tb.append(tr)
    }
    tbl.append(thead, tb)
    cmpWrap.append(tbl)
    cmpNote.textContent = T.hintDiff
  }

  function sync(): void {
    const T = S()
    appName.textContent = T.appName
    selLabel.textContent = T.run
    disclaimer.textContent = T.disclaimer
    sensor.textContent = T.sensor
    const runs = app.getRuns()
    if (runs.length !== lastRunCount) {
      if (!userPicked || selected === null || runs.length > lastRunCount) { selected = runs.at(-1)?.id ?? null; userPicked = false }
      lastRunCount = runs.length
    }
    sel.replaceChildren(...runs.map((r) => el('option', undefined, T.runOption.replace('{n}', String(r.id)), { value: String(r.id) })))
    if (selected !== null) sel.value = String(selected)
    sel.hidden = runs.length === 0
    const run = selected === null ? null : app.getRun(selected)
    const rec = run ? recFor(run.id) : null
    empty.hidden = rec !== null
    plotHost.hidden = rec === null
    for (const x of [marksTitle, marksList, cmpTitle, cmpWrap, cmpNote, sensor]) x.hidden = rec === null
    emptyA.textContent = T.noRuns
    emptyB.textContent = T.noRunsHelp
    if (!rec || !run) { rolling.textContent = ''; builtKey = ''; plot?.destroy(); plot = null; return }
    const key = `${run.id}|${L()}|${plotHost.clientWidth}`
    if (key !== builtKey) { builtKey = key; buildPlot(rec, run) }
    fillPlot(rec, run)
    renderLists(rec, run)
  }

  const ro = new ResizeObserver(() => { if (plot && plotHost.clientWidth > 0 && Math.abs(plot.width - plotHost.clientWidth) > 2) { builtKey = ''; w.touch() } })
  ro.observe(plotHost)

  let lastTick = 0
  return {
    update() {
      const now = ctx.now()
      if (w.dirty()) { w.clear(); sync(); lastTick = now; return }
      if (truncated && now - lastTick > REFRESH_ms) {
        lastTick = now
        const run = selected === null ? null : app.getRun(selected)
        const rec = run ? recFor(run.id) : null
        if (run && rec) fillPlot(rec, run)
        if (!truncated) w.touch()
      }
    },
    relabel() { builtKey = ''; w.touch() },
    destroy() { offEv(); ro.disconnect(); plot?.destroy(); w.off(); c.root.remove() },
  }
}
