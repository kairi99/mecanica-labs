// DigiCart log (step 4, hidden with ?reference=0): the reference record of a run (x(t) at 50 Hz, the true time to the end mark, the floor
// impact) next to the student's own stopwatch readings. The real DigiCart measures this with its own sensor; labelled as such.
import uPlot from 'uplot'
import 'uplot/dist/uPlot.min.css'
import type { DigicartRecord, RunRecord } from '../apparatus/index.ts'
import type { MountView, View } from './view.ts'
import { card, el, nextId, watch } from '../../../core/views/dom.ts'
import { formatNum } from '../../../core/views/numfmt.ts'
import { strings } from './strings/log.ts'
import { strings as reasonStrings } from './strings/reasons.ts'
import '../styles/tablet.css'

const REFRESH_ms = 100

export const mountLog: MountView = (root, ctx): View => {
  const app = ctx.apparatus
  const S = () => strings[ctx.lang()]
  const L = () => ctx.lang()
  const w = watch(app)
  const c = card('log', S().title, 'card-tablet')
  c.root.dataset.region = 'log'
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
  const factsTitle = el('h3', 'tablet-sub')
  const facts = el('ul', 'tablet-marks')
  const cmpTitle = el('h3', 'tablet-sub')
  const cmpWrap = el('div', 'tablet-table-wrap', undefined, { tabindex: '0' })
  const cmpNote = el('p', 'tablet-note')
  const sensor = el('p', 'tablet-note')
  screen.append(empty, plotHost, rolling, factsTitle, facts, cmpTitle, cmpWrap, cmpNote, sensor)
  device.append(bar, screen)
  const disclaimer = el('p', 'note')
  c.body.append(disclaimer, device)

  let plot: uPlot | null = null
  let selected: number | null = null
  let userPicked = false
  let lastRunCount = 0
  let builtKey = ''
  let truncated = false
  const recCache = new Map<number, DigicartRecord | null>()
  const recFor = (id: number): DigicartRecord | null => {
    if (!recCache.has(id)) recCache.set(id, app.digicartRecord(id))
    return recCache.get(id) ?? null
  }
  const offEv = app.on((e) => { if (e.type === 'loaded' || e.type === 'presetApplied') recCache.clear() })
  sel.addEventListener('change', () => { selected = Number(sel.value); userPicked = true; builtKey = ''; w.touch() })

  const elapsed_s = (run: RunRecord): number => {
    const e = (ctx.now() - run.releaseTime_ms) / 1000
    return e < 0 ? Infinity : e // a record loaded from a previous session is complete
  }
  const themeColor = (name: string): string => getComputedStyle(plotHost).getPropertyValue(name).trim() || '#fff'

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
          const g = u.ctx
          g.save()
          g.font = font
          g.textBaseline = 'bottom'
          const e = elapsed_s(run)
          const dot = (t: number, x: number, label: string): void => {
            if (t > e) return
            const px = u.valToPos(t, 'x', true), py = u.valToPos(x, 'y', true)
            g.fillStyle = mark
            g.beginPath(); g.arc(px, py, 4 * devicePixelRatio, 0, Math.PI * 2); g.fill()
            g.fillStyle = ink
            g.fillText(label, px + 6 * devicePixelRatio, py - 4 * devicePixelRatio)
          }
          if (rec.tEnd_s !== null && run.sEnd_m !== null) dot(rec.tEnd_s, run.sEnd_m, T.endLabel)
          if (rec.tFloor_s !== null) {
            const i = rec.t_s.findIndex((t) => t >= rec.tFloor_s!)
            if (i >= 0) dot(rec.tFloor_s, rec.x_m[i]!, T.floorLabel)
          }
          g.restore()
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
    truncated = n < rec.t_s.length
    rolling.textContent = truncated ? S().rolling : ''
  }
  function renderLists(rec: DigicartRecord, run: RunRecord): void {
    const T = S()
    factsTitle.textContent = T.facts
    facts.replaceChildren()
    const add = (t: string): void => { facts.append(el('li', undefined, t)) }
    add(T.factMasses.replace('{m}', String(run.massesInCanister)))
    add(rec.tEnd_s !== null ? T.factEnd.replace('{d}', formatNum((run.sEnd_m ?? 0) * 100, 0, L())).replace('{t}', formatNum(rec.tEnd_s, 3, L())) : T.factNoEnd)
    if (rec.tFloor_s !== null && run.outcome !== 'ok') add(T.factFloor.replace('{t}', formatNum(rec.tFloor_s, 2, L())))
    add(T.factOutcome.replace('{x}', reasonStrings[L()].outcomes[run.outcome]))
    cmpTitle.textContent = T.compare
    cmpWrap.replaceChildren()
    const stops = app.stopLog().filter((s) => s.runId === run.id)
    if (stops.length === 0) { cmpWrap.append(el('p', 'tablet-note', T.noStops)); cmpNote.textContent = ''; return }
    const tbl = el('table', 'tablet-table')
    const head = el('tr')
    for (const h of [T.colTrial, T.colYou, T.colCart, T.colDiff, T.colStart]) head.append(el('th', undefined, h, { scope: 'col' }))
    const thead = el('thead'); thead.append(head)
    const tb = el('tbody')
    const sgn = (v: number): string => (v > 0 ? '+' : v < 0 ? '−' : '') + formatNum(Math.abs(v), 2, L())
    for (const s of stops) {
      const tr = el('tr')
      const truth = s.crossings[0]?.trueTime_s ?? null
      const diff = truth === null ? null : s.reading_s - truth
      tr.append(
        el('th', undefined, s.markTarget === null ? '—' : T.trialOf.replace('{n}', String(s.markTarget + 1)), { scope: 'row' }),
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
    for (const x of [factsTitle, facts, cmpTitle, cmpWrap, cmpNote, sensor]) x.hidden = rec === null
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
