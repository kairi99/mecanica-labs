// Slow motion (step 4): a 240 fps viewer of one launch. The clip comes from apparatus.slowmo(runId); this view only draws its frames
// (a side-view canvas with a cm scale, the table edge, the launch and landing frames) and words the numbers the apparatus gives.
import { BALL_IDS, type BallId, type RunRecord, type SlowmoClip } from '../apparatus/index.ts'
import type { MountView, View } from './view.ts'
import { button, card, el, nextId, watch } from '../../../core/views/dom.ts'
import { formatNum } from '../../../core/views/numfmt.ts'
import { compareReading, formatFrameTime, formatTime, signedText } from './format.ts'
import { strings } from './strings/slowmo.ts'

/** Playback speed: real time slowed by this factor (the clip is 240 fps, so 30 frames per second on screen). */
const PLAY_SLOWDOWN = 8
/** Radius used to DRAW each ball, m (marble 16 mm, ping-pong ball 40 mm diameter). */
const DRAW_RADIUS_m: Record<BallId, number> = { marble: 0.008, pingpong: 0.02 }
const VIEW_LEFT_m = 0.22
const VIEW_RIGHT_PAD_m = 0.1

interface RunRow { run: RunRecord; mark: number | null; trial: number | null; rep: number | null; reading_s: number | null }

export const mountSlowmo: MountView = (root, ctx): View => {
  const app = ctx.apparatus
  const S = () => strings[ctx.lang()]
  const L = () => ctx.lang()
  const w = watch(app)
  const c = card('slowmo', S().title, 'card-slowmo')
  c.root.dataset.region = 'slowmo'
  root.append(c.root)

  const intro = el('p', 'muted')
  const selId = nextId('sm')
  const selLabel = el('label', 'field-label', undefined, { for: selId })
  const sel = el('select', 'select', undefined, { id: selId })
  const empty = el('p', 'readout-text')

  const stageBox = el('div', 'sm-stage')
  const canvas = el('canvas', 'slowmo-canvas', undefined, { role: 'img' })
  stageBox.append(canvas)
  const frameText = el('p', 'sm-frame readout', undefined, { 'aria-live': 'off' })

  const sliderId = nextId('smf')
  const sliderLabel = el('label', 'field-label', undefined, { for: sliderId })
  const slider = el('input', 'range', undefined, { type: 'range', id: sliderId, min: '0', max: '0', step: '1', value: '0' })
  const marks = el('div', 'sm-marks')
  const markLaunch = el('span', 'sm-mark sm-mark-launch')
  const markLanding = el('span', 'sm-mark sm-mark-landing')
  marks.append(markLaunch, markLanding)

  const controls = el('div', 'inline-row sm-controls')
  const prevBtn = button('◀', 'btn btn-quiet nudge', () => stepBy(-1))
  const nextBtn = button('▶', 'btn btn-quiet nudge', () => stepBy(1))
  const playBtn = button('', 'btn btn-primary', () => togglePlay())
  const toLaunch = button('', 'btn btn-quiet', () => { pause(); setFrame(clip?.launchFrameIndex ?? 0) })
  const toLanding = button('', 'btn btn-quiet', () => { pause(); setFrame(clip?.landingFrameIndex ?? 0) })
  controls.append(prevBtn, nextBtn, playBtn, toLaunch, toLanding)
  const playNote = el('p', 'muted')

  const results = el('div', 'sm-results')
  const resTitle = el('h3', 'sub-title')
  const resFrames = el('p', 'readout-text')
  const resFlight = el('p', 'readout')
  const resSpeed = el('p', 'readout')
  const resSpeedNote = el('p', 'muted')
  const resYour = el('p', 'readout-text')
  const resCompare = el('p', 'readout-text')
  const resNote = el('p', 'muted')
  results.append(resTitle, resFlight, resFrames, resSpeed, resSpeedNote, resYour, resCompare, resNote)

  slider.addEventListener('input', () => { pause(); setFrame(Number(slider.value)) })
  c.body.append(intro, selLabel, sel, empty, stageBox, frameText, sliderLabel, slider, marks, controls, playNote, results)

  // ---- state ---------------------------------------------------------------------------------------------------------------------
  let rows: RunRow[] = []
  let runId: number | null = null
  let clip: SlowmoClip | null = null
  let frame = 0
  let playing = false
  let acc = 0
  let lastNow = 0
  let optionsKey = ''
  let drawKey = ''
  let lastCount = 0
  const reduced = (): boolean => ctx.reducedMotion()

  function buildRows(): RunRow[] {
    const marks = [...app.getMarks()].sort((a, b) => a.s_m - b.s_m)
    const cells = new Map<number, { trial: number; rep: number }>()
    for (const b of BALL_IDS) {
      const d = app.tableData(b)
      d.cells.forEach((row, t) => row.forEach((cell, r) => { if (cell.timeRunId !== null) cells.set(cell.timeRunId, { trial: t, rep: r }) }))
    }
    return app.getRuns().map((run) => {
      const idx = run.markId === null ? -1 : marks.findIndex((m) => m.id === run.markId)
      const cell = cells.get(run.id)
      return { run, mark: idx >= 0 ? idx + 1 : null, trial: cell?.trial ?? null, rep: cell ? cell.rep + 1 : null, reading_s: app.stopsForRun(run.id).at(-1)?.reading_s ?? null }
    }).reverse()
  }
  function optionText(row: RunRow): string {
    const T = S()
    return T.runOption
      .replace('{n}', String(row.run.id))
      .replace('{ball}', T.balls[row.run.ball])
      .replace('{mark}', row.mark === null ? T.runNoMark : `${L() === 'es' ? 'marca' : 'mark'} ${row.mark}`)
      .replace('{rep}', row.rep === null ? T.runNoRep : `${L() === 'es' ? 'rep.' : 'rep.'} ${row.rep}`)
      .replace('{time}', row.reading_s === null ? T.runNoTime : `${formatTime(row.reading_s, L())} s`)
      + (row.run.flight ? '' : ` · ${T.runNoFlight}`)
  }

  function selectRun(id: number | null): void {
    runId = id
    clip = id === null ? null : app.slowmo(id)
    pause()
    frame = clip ? clip.launchFrameIndex : 0
    slider.max = String(clip ? clip.frames.length - 1 : 0)
    drawKey = ''
    w.touch()
  }
  function setFrame(i: number): void {
    if (!clip) return
    const n = Math.max(0, Math.min(clip.frames.length - 1, Math.round(i)))
    if (n === frame) return
    frame = n
    drawKey = ''
    paintFrameText()
  }
  const stepBy = (d: number): void => { pause(); setFrame(frame + d) }
  function pause(): void { playing = false; paintPlay() }
  function togglePlay(): void {
    if (reduced() || !clip) return
    if (playing) { pause(); return }
    if (frame >= clip.frames.length - 1) setFrame(0)
    playing = true; acc = 0; lastNow = ctx.now()
    paintPlay()
  }
  function paintPlay(): void {
    const T = S()
    playBtn.textContent = playing ? T.pause : T.play
    if (reduced()) playBtn.setAttribute('aria-disabled', 'true'); else playBtn.removeAttribute('aria-disabled')
    playNote.textContent = reduced() ? T.reducedNote : T.playNote
  }
  function paintFrameText(): void {
    if (!clip) { frameText.textContent = ''; return }
    const f = clip.frames[frame]!
    frameText.textContent = S().frame.replace('{n}', String(frame + 1)).replace('{t}', formatFrameTime(f.t_s, L()))
    slider.value = String(frame)
    slider.setAttribute('aria-valuetext', frameText.textContent)
  }

  // ---- drawing ---------------------------------------------------------------------------------------------------------------------
  const css = (k: string): string => getComputedStyle(canvas).getPropertyValue(k).trim() || '#888'
  function draw(): void {
    const dpr = window.devicePixelRatio || 1
    const wpx = Math.max(1, Math.round(canvas.clientWidth)), hpx = Math.max(1, Math.round(canvas.clientHeight))
    if (canvas.width !== Math.round(wpx * dpr) || canvas.height !== Math.round(hpx * dpr)) { canvas.width = Math.round(wpx * dpr); canvas.height = Math.round(hpx * dpr) }
    const g = canvas.getContext('2d')
    if (!g) return
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    g.clearRect(0, 0, wpx, hpx)
    if (!clip || !runId) return
    const run = rows.find((r) => r.run.id === runId)!.run
    const R = DRAW_RADIUS_m[run.ball]
    const fr = clip.frames
    const xs = fr.map((f) => f.x_m)
    const xMax = Math.max(...xs) + VIEW_RIGHT_PAD_m
    const tableTop = fr[0]!.y_m - R
    const yMax = tableTop + 0.14
    const ink = css('--label'), ink2 = css('--label-2'), ink3 = css('--label-3'), accent = css('--accent'), good = css('--success'), surf = css('--surface-2'), sep = css('--separator')
    const marginL = 34, marginB = 26, marginT = 8, marginR = 8
    const sc = Math.min((wpx - marginL - marginR) / (VIEW_LEFT_m + xMax), (hpx - marginB - marginT) / yMax)
    const X = (x: number): number => marginL + (x + VIEW_LEFT_m) * sc
    const Y = (y: number): number => hpx - marginB - y * sc
    g.font = '11px ' + css('--font')
    g.lineWidth = 1
    // floor and table
    g.fillStyle = surf
    g.fillRect(marginL, Y(0), wpx - marginL, marginB - 6)
    g.strokeStyle = ink2
    g.beginPath(); g.moveTo(marginL, Y(0)); g.lineTo(wpx - marginR, Y(0)); g.stroke()
    g.fillStyle = surf; g.strokeStyle = ink2
    g.fillRect(X(-VIEW_LEFT_m), Y(tableTop), X(0) - X(-VIEW_LEFT_m), Math.max(4, 0.03 * sc))
    g.strokeRect(X(-VIEW_LEFT_m), Y(tableTop), X(0) - X(-VIEW_LEFT_m), Math.max(4, 0.03 * sc))
    g.setLineDash([4, 4]); g.strokeStyle = ink3
    g.beginPath(); g.moveTo(X(0), Y(0)); g.lineTo(X(0), Y(tableTop)); g.stroke(); g.setLineDash([])
    g.fillStyle = ink2; g.textAlign = 'left'
    g.fillText(S().edge, X(0) + 4, Y(tableTop * 0.5))
    g.fillText(S().floor, marginL + 4, Y(0) + 16)
    // cm scale: horizontal along the floor from the edge, vertical at the left
    g.strokeStyle = ink2; g.fillStyle = ink2; g.textAlign = 'center'
    for (let cm = 0; X(cm / 100) < wpx - marginR - 6; cm += 10) {
      const x = X(cm / 100)
      g.beginPath(); g.moveTo(x, Y(0)); g.lineTo(x, Y(0) + (cm % 50 === 0 ? 7 : 4)); g.stroke()
      if (cm % 20 === 0) g.fillText(String(cm), x, Y(0) + 18)
    }
    g.textAlign = 'right'
    for (let cm = 0; cm / 100 <= yMax; cm += 10) {
      const y = Y(cm / 100)
      g.beginPath(); g.moveTo(marginL - (cm % 50 === 0 ? 7 : 4), y); g.lineTo(marginL, y); g.stroke()
      if (cm % 20 === 0) g.fillText(String(cm), marginL - 9, y + 4)
    }
    g.textAlign = 'left'; g.fillText('cm', marginL + 4, marginT + 8)
    // trail of the frames shown so far
    g.fillStyle = ink3
    for (let i = 0; i < frame; i++) { g.beginPath(); g.arc(X(fr[i]!.x_m), Y(fr[i]!.y_m), 2, 0, Math.PI * 2); g.fill() }
    // launch and landing frames: outlined balls with a label
    const ghost = (i: number, color: string, label: string, dy: number): void => {
      const f = fr[i]!
      g.strokeStyle = color; g.fillStyle = color; g.lineWidth = 1.5
      g.beginPath(); g.arc(X(f.x_m), Y(f.y_m), Math.max(R * sc, 4), 0, Math.PI * 2); g.stroke()
      g.textAlign = 'center'; g.fillText(label, X(f.x_m), Y(f.y_m) + dy)
      g.lineWidth = 1
    }
    ghost(clip.launchFrameIndex, accent, L() === 'es' ? 'lanzamiento' : 'launch', -Math.max(R * sc, 4) - 5)
    ghost(clip.landingFrameIndex, good, L() === 'es' ? 'aterrizaje' : 'landing', -Math.max(R * sc, 4) - 5)
    // the ball at the current frame
    const f = fr[frame]!
    g.fillStyle = ink; g.strokeStyle = sep
    g.beginPath(); g.arc(X(f.x_m), Y(f.y_m), Math.max(R * sc, 3), 0, Math.PI * 2); g.fill(); g.stroke()
  }

  // ---- text ----------------------------------------------------------------------------------------------------------------------
  function labels(): void {
    const T = S()
    c.title.textContent = T.title
    intro.textContent = T.intro
    selLabel.textContent = T.runLabel
    sliderLabel.textContent = T.slider
    prevBtn.setAttribute('aria-label', T.prev); prevBtn.title = T.prev
    nextBtn.setAttribute('aria-label', T.next); nextBtn.title = T.next
    toLaunch.textContent = T.toLaunch; toLanding.textContent = T.toLanding
    canvas.setAttribute('aria-label', T.canvasAria)
    resTitle.textContent = T.resultsTitle
    resSpeedNote.textContent = T.speedNote
    resNote.textContent = `${T.markNote} ${T.frameNote}`
    paintPlay()
    paintFrameText()
    optionsKey = ''
    drawKey = ''
  }
  function sync(): void {
    const T = S()
    rows = buildRows()
    const key = `${L()}|${rows.map((r) => `${r.run.id}:${optionText(r)}`).join('|')}`
    if (key !== optionsKey) {
      optionsKey = key
      sel.replaceChildren(...rows.map((r) => el('option', undefined, optionText(r), { value: String(r.run.id) })))
    }
    if (rows.length === 0) {
      if (runId !== null) selectRun(null)
      empty.textContent = T.noRuns
      empty.hidden = false
    } else {
      // A new launch becomes the one on show; otherwise keep the student's choice.
      if (runId === null || !rows.some((r) => r.run.id === runId) || rows.length > lastCount) selectRun(rows[0]!.run.id)
      sel.value = String(runId)
      empty.textContent = clip ? '' : T.noFlight
      empty.hidden = clip !== null
    }
    lastCount = rows.length
    sel.disabled = rows.length === 0
    const has = clip !== null
    for (const x of [stageBox, frameText, sliderLabel, slider, marks, controls, playNote, results]) x.hidden = !has
    if (!clip || runId === null) return
    const row = rows.find((r) => r.run.id === runId)!
    const nGap = clip.landingFrameIndex - clip.launchFrameIndex
    const pct = (i: number): string => `${(100 * i) / (clip!.frames.length - 1)}%`
    markLaunch.textContent = `▲ ${T.markLaunch.replace('{n}', String(clip.launchFrameIndex + 1))}`
    markLanding.textContent = `▲ ${T.markLanding.replace('{n}', String(clip.landingFrameIndex + 1))}`
    markLaunch.style.left = pct(clip.launchFrameIndex)
    markLanding.style.left = pct(clip.landingFrameIndex)
    resFrames.textContent = T.flightFrames.replace('{n}', String(nGap))
    resFlight.textContent = T.flightValue.replace('{t}', formatNum(clip.flightFromFrames_s, 3, L())).replace('{q}', formatNum(clip.frameQuantisation_s, 3, L()))
    resSpeed.textContent = T.speedValue.replace('{v}', formatNum(clip.v0FromFrames_mps, 2, L()))
    if (row.reading_s === null) { resYour.textContent = T.yourTimeNone; resCompare.textContent = '' }
    else {
      resYour.textContent = T.yourTime.replace('{t}', formatTime(row.reading_s, L()))
      const cmp = compareReading(row.reading_s, clip.flightFromFrames_s)
      resCompare.textContent = T.compare.replace('{d}', signedText(cmp.difference_s, 2, L())).replace('{p}', Number.isFinite(cmp.relative) ? signedText(cmp.relative * 100, 1, L()) : '—')
    }
    drawKey = ''
    paintFrameText()
  }

  sel.addEventListener('change', () => selectRun(Number(sel.value)))
  const ro = new ResizeObserver(() => { drawKey = '' })
  ro.observe(canvas)
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
  const onMq = (): void => { if (mq.matches) pause(); paintPlay() }
  mq.addEventListener('change', onMq)

  labels()
  return {
    update() {
      if (w.dirty()) { w.clear(); sync() }
      if (playing && clip) {
        const now = ctx.now()
        acc += now - lastNow; lastNow = now
        const dt = (1000 * PLAY_SLOWDOWN) / clip.fps_hz
        while (acc >= dt && frame < clip.frames.length - 1) { acc -= dt; frame++; drawKey = '' }
        if (frame >= clip.frames.length - 1) pause()
        paintFrameText()
      }
      if (!clip || stageBox.hidden || c.root.closest('[hidden]')) return
      const key = `${frame}|${runId}|${canvas.clientWidth}|${canvas.clientHeight}|${L()}|${document.documentElement.dataset.theme ?? ''}|${window.matchMedia('(prefers-color-scheme: dark)').matches}`
      if (key !== drawKey) { drawKey = key; draw() }
    },
    relabel() { labels(); w.touch() },
    destroy() { ro.disconnect(); mq.removeEventListener('change', onMq); w.off(); c.root.remove() },
  }
}
