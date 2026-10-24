// Analysis panel (guide section 2.4, tasks 1 to 9). Reads Tabla 2.1 through the pure analysis layer (analysis/compute.ts, which calls
// core physics); this view only lays the numbers out and draws them. Updates live as the table fills. Hidden by the shell with
// ?analysis=0. Free-text answers and the typed launch height persist in this browser (persist.ts).
import { summariseLaunches } from '../analysis/launchNote.ts'
import type { MountView, View } from './view.ts'
import { BALL_IDS, TABLE_REPS, TABLE_TRIALS, type BallId } from '../apparatus/index.ts'
import { button, card, el, nextId, watch } from '../../../core/views/dom.ts'
import { numText, pmText } from '../../../core/views/format.ts'
import { plotTrialBars, readPalette, type PlotHandle } from '../../../core/views/analysisPlots.ts'
import { fmt } from '../../../core/pedagogy/dom.ts'
import { strings, type AnalysisStrings } from './strings/analysis.ts'
import { fullAnalysis, type FullAnalysis } from '../analysis/compute.ts'
import { slowmoReference } from '../analysis/fromApparatus.ts'
import { analysisCSV } from '../analysis/csv.ts'
import { parseCm } from './format.ts'
import { loadHeightText, loadNotes, saveHeightText, saveNotes } from '../persist.ts'

export interface AnalysisOptions {
  /** The slow-motion step is shown (?reference=0 hides it and its reference time here too). */
  reference: boolean
}

type Lang = 'es' | 'en'
const NOTE_TASKS = ['t1', 't24', 't3', 't5', 't6', 't7', 't8', 't9'] as const
type NoteTask = (typeof NOTE_TASKS)[number]

function table(headers: string[], rows: string[][], cls = 'data-table an-table an-compact'): HTMLElement {
  const wrap = el('div', 'table-scroll', undefined, { tabindex: '0' })
  const t = el('table', cls)
  const thead = el('thead'), hr = el('tr')
  headers.forEach((h) => hr.append(el('th', undefined, h, { scope: 'col' })))
  thead.append(hr)
  const tb = el('tbody')
  for (const r of rows) {
    const tr = el('tr')
    r.forEach((c, i) => tr.append(i === 0 ? el('th', undefined, c, { scope: 'row' }) : el('td', undefined, c)))
    tb.append(tr)
  }
  t.append(thead, tb)
  wrap.append(t)
  return wrap
}

export function mountAnalysis(opts: AnalysisOptions = { reference: true }): MountView {
  return (root, ctx): View => {
    const app = ctx.apparatus
    const S = (): AnalysisStrings => strings[ctx.lang()]
    const L = (): Lang => ctx.lang()
    const w = watch(app)
    const c = card('analysis', S().title, 'card-analysis')
    c.root.dataset.region = 'analysis'
    root.append(c.root)

    let notes = loadNotes()
    let hText = loadHeightText()
    let saveTimer = 0
    const persistNotes = (): void => { window.clearTimeout(saveTimer); saveTimer = window.setTimeout(() => saveNotes(notes), 400) }

    // ---- skeleton (built once) -------------------------------------------------------------------------------------------
    const intro = el('p', 'muted')
    const status = el('p', 'readout-text', undefined, { 'aria-live': 'polite' })
    interface Sec { root: HTMLElement; h: HTMLElement; dyn: HTMLElement; noteLabel: HTMLElement; note: HTMLTextAreaElement | null }
    const section = (cls: string, task: NoteTask): Sec => {
      const s = el('section', `an-sec ${cls}`)
      const h = el('h3', 'sub-title')
      const dyn = el('div', 'an-body')
      const id = nextId('an-note')
      const noteLabel = el('label', 'field-label', undefined, { for: id })
      const note = el('textarea', 'note-area', undefined, { id, rows: '3', spellcheck: 'true' })
      note.value = notes[task] ?? ''
      note.addEventListener('input', () => { notes = { ...notes, [task]: note.value }; persistNotes() })
      s.append(h, dyn, noteLabel, note)
      return { root: s, h, dyn, noteLabel, note }
    }
    const secs = Object.fromEntries(NOTE_TASKS.map((k) => [k, section(`an-${k}`, k)])) as Record<NoteTask, Sec>
    // the launch height input belongs to task 5
    const hId = nextId('an-h')
    const hLabel = el('label', 'field-label', undefined, { for: hId })
    const hInput = el('input', 'num an-h', undefined, { id: hId, type: 'text', inputmode: 'decimal', autocomplete: 'off', spellcheck: 'false' })
    hInput.value = hText
    const hHelp = el('p', 'muted'), hMsg = el('p', 'readout-text', undefined, { 'aria-live': 'polite' })
    hInput.addEventListener('input', () => { hText = hInput.value; saveHeightText(hText); dirty = true; sig = '' })
    const t5Static = el('div', 'an-body')
    t5Static.append(hLabel, hInput, hHelp, hMsg)
    secs.t5.dyn.before(t5Static)

    const exportBtn = button('', 'btn btn-quiet', () => download())
    const actions = el('div', 'table-actions')
    actions.append(exportBtn)
    c.body.append(intro, status, ...NOTE_TASKS.map((k) => secs[k].root), actions)

    // ---- state ---------------------------------------------------------------------------------------------------------
    let handles: PlotHandle[] = []
    let sig = ''
    let dirty = true
    let last: FullAnalysis | null = null
    const offApp = app.on((e) => {
      if (e.type === 'presetApplied') { notes = loadNotes(); hText = loadHeightText(); hInput.value = hText; for (const k of NOTE_TASKS) secs[k].note!.value = notes[k] ?? '' }
    })
    const themeObserver = new MutationObserver(() => { dirty = true; sig = '' })
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    const dark = window.matchMedia('(prefers-color-scheme: dark)')
    const onScheme = (): void => { dirty = true; sig = '' }
    dark.addEventListener('change', onScheme)
    let lastWidth = 0
    const ro = new ResizeObserver(() => {
      const wpx = Math.floor(c.body.clientWidth)
      if (wpx !== lastWidth) { lastWidth = wpx; sig = ''; dirty = true }
    })
    ro.observe(c.body)

    const list = (items: string[]): HTMLElement => {
      const ul = el('ul', 'an-list')
      for (const t of items) ul.append(el('li', undefined, t))
      return ul
    }
    const H_m = (): number | null => {
      const v = parseCm(hText)
      return Number.isNaN(v) ? null : v
    }
    const pm = (v: number | null, u: number | null): string => (v === null || u === null ? '–' : pmText(v, u, L()))

    /** Neutral note when some launches were not horizontal (from the run records); null when all were (within a degree) or none flew. */
    function launchNote(): HTMLElement | null {
      const T = S(), lang = L()
      const sum = summariseLaunches(app.getRuns())
      if (sum.nTilted === 0 || sum.minAngle_deg === null || sum.maxAngle_deg === null) return null
      const box = el('div', 'an-launchnote')
      box.append(el('p', 'muted', fmt(T.launchNote, { m: sum.nTilted, n: sum.n, a: numText(sum.minAngle_deg, 1, lang), b: numText(sum.maxAngle_deg, 1, lang) })))
      if (sum.nBounced > 0) box.append(el('p', 'muted', fmt(T.launchNoteBounce, { k: sum.nBounced })))
      if (sum.nOverRail > 0) box.append(el('p', 'muted', fmt(T.launchNoteRail, { k: sum.nOverRail })))
      return box
    }

    function render(): void {
      const T = S(), lang = L()
      const H = H_m()
      const data = Object.fromEntries(BALL_IDS.map((b) => [b, app.tableData(b)])) as Record<BallId, ReturnType<typeof app.tableData>>
      const a = fullAnalysis({ tables: { marble: data.marble, pingpong: data.pingpong }, H_m: H })
      last = a
      const exp = a.expected
      const pairs = (b: BallId): number => data[b].cells.flat().filter((q) => q.t_s !== null && q.x_m !== null).length
      const per = TABLE_TRIALS * TABLE_REPS
      c.title.textContent = T.title
      intro.textContent = T.intro
      exportBtn.textContent = T.exportCsv
      exportBtn.disabled = a.balls.marble.pooled === null && a.balls.pingpong.pooled === null
      status.textContent = pairs('marble') + pairs('pingpong') === 0 ? T.statusEmpty : fmt(T.statusData, { marble: pairs('marble'), pingpong: pairs('pingpong'), per })
      for (const k of NOTE_TASKS) { secs[k].noteLabel.textContent = T.notesLabel; secs[k].note!.placeholder = T.notesPlaceholder }
      for (const h of handles) h.destroy()
      handles = []
      const pal = readPalette()
      const hPush = (h: PlotHandle | null): void => { if (h) handles.push(h) }
      const ballName = (b: BallId): string => T.balls[b]
      const sub = (title: string): HTMLElement => el('h4', 'an-col-title', title)
      // The formula is hidden until the student opens it, so tasks 5 and 7 stay a derivation and not a copy.
      const checkBox = (formula: string): HTMLElement => {
        const d = el('details', 'an-compare')
        d.append(el('summary', undefined, T.checkExpr), el('p', 'readout-text', formula))
        return d
      }

      // task 1
      secs.t1.h.textContent = T.t1Title
      secs.t1.dyn.replaceChildren(list(T.t1Prompts))

      // tasks 2 and 4
      secs.t24.h.textContent = T.t24Title
      const t24: HTMLElement[] = [el('p', 'muted', T.t24Intro)]
      for (const b of BALL_IDS) {
        const bt = a.balls[b]
        t24.push(sub(ballName(b)))
        t24.push(bt.pooled === null
          ? el('p', 'muted', T.needData)
          : table([T.colTrial, T.colT, T.colX, T.colV], bt.trials.map((t, i) => [
            String(i + 1), pm(t.t_s, t.u_t_s), pm(t.x_m, t.u_x_m), pm(t.v0_mps, t.u_v0_mps),
          ])))
      }
      t24.push(el('p', 'note', T.reactNote))
      const conv = el('details', 'an-compare')
      conv.append(el('summary', undefined, T.convTitle))
      const convBody = el('div', 'an-body')
      convBody.append(list(T.convItems))
      for (const b of BALL_IDS) {
        const bt = a.balls[b]
        if (bt.pooled === null) continue
        convBody.append(sub(`${ballName(b)} · ${T.bdTitle}`))
        convBody.append(table([T.colTrial, T.colN, `${T.bdTime}: ${T.bdCols.sd}`, T.bdCols.uA, T.bdCols.uRes, T.bdCols.uReact, `${T.bdRange}: ${T.bdCols.sd}`, T.bdCols.uA, T.bdCols.uTape, T.bdCols.uProj],
          bt.trials.map((t, i) => [String(i + 1), `${t.n_t}, ${t.n_x}`, numText(t.sd_t_s, 3, lang), numText(t.uA_t_s, 3, lang), numText(t.uRes_s, 4, lang), numText(t.uReact_s, 3, lang),
            numText(t.sd_x_m, 4, lang), numText(t.uA_x_m, 4, lang), numText(t.uTape_m, 4, lang), numText(t.uProj_m, 4, lang)])))
      }
      conv.append(convBody)
      t24.push(conv)
      secs.t24.dyn.replaceChildren(...t24)

      // task 3
      secs.t3.h.textContent = T.t3Title
      const plot3 = el('div', 'plot')
      const t3: HTMLElement[] = [el('p', 'muted', T.t3Intro), plot3, el('p', 'muted an-legend', `${T.legMarble}  ·  ${T.legPingpong}`)]
      plot3.setAttribute('role', 'img'); plot3.setAttribute('aria-label', T.t3Plot)
      for (const b of BALL_IDS) {
        const bt = a.balls[b]
        if (bt.timeSpread_s === null) continue
        const us = bt.trials.map((t) => t.uStat_t_s).filter((v): v is number => v !== null)
        t3.push(el('p', 'readout-text', fmt(T.t3Spread, { ball: ballName(b), s: numText(bt.timeSpread_s, 2, lang), u: numText(Math.max(...us), 2, lang) })))
      }
      t3.push(el('p', 'muted', T.t3Caption), el('p', 'note', T.t3Prompt))
      secs.t3.dyn.replaceChildren(...t3)
      // Marks are compared with each other in task 3 (the shared reaction bias cancels: scatter + resolution only); task 6 compares with the expected time (full Delta t).
      const ptsWith = (b: BallId, key: 'uStat_t_s' | 'u_t_s'): Array<{ y: number; u: number } | null> => a.balls[b].trials.map((t) => (t.t_s !== null && t[key] !== null ? { y: t.t_s, u: t[key]! } : null))
      const pts = (b: BallId): Array<{ y: number; u: number } | null> => ptsWith(b, 'u_t_s')
      const pts3 = (b: BallId): Array<{ y: number; u: number } | null> => ptsWith(b, 'uStat_t_s')
      hPush(plotTrialBars(plot3, { series: [{ points: pts3('marble'), shape: 'circle' }, { points: pts3('pingpong'), shape: 'square' }] }, pal, { x: T.axisTrial, y: T.axisTime }))

      // task 5
      secs.t5.h.textContent = T.t5Title
      hLabel.textContent = T.hLabel
      hHelp.textContent = T.hHelp
      const typed = hText.trim() !== ''
      hMsg.textContent = typed && exp === null ? T.hBad : !app.procedure().measured.launchHeight ? T.hNotMeasured : ''
      hInput.toggleAttribute('aria-invalid', typed && exp === null)
      const t5: HTMLElement[] = [el('p', 'muted', T.t5Intro)]
      if (exp) {
        t5.push(el('p', 'readout-value', fmt(T.t5Result, { t: pmText(exp.t_s, exp.u_t_s, lang) })))
        t5.push(el('p', 'muted', fmt(T.t5Inputs, { H: numText(exp.H_m, 3, lang), uH: numText(exp.u_H_m, 4, lang), g: numText(exp.g_mps2, 3, lang), ug: numText(5e-3, 3, lang) })))
        t5.push(checkBox(T.t5Formula))
      } else t5.push(el('p', 'muted', T.t5NoH))
      t5.push(el('p', 'note', T.t5Prompt))
      const ln = launchNote()
      if (ln) t5.push(ln)
      secs.t5.dyn.replaceChildren(...t5)

      // task 6
      secs.t6.h.textContent = T.t6Title
      const t6: HTMLElement[] = [el('p', 'muted', T.t6Intro)]
      let plot6: HTMLElement | null = null
      if (exp) {
        plot6 = el('div', 'plot')
        plot6.setAttribute('role', 'img'); plot6.setAttribute('aria-label', T.t3Plot)
        t6.push(plot6, el('p', 'muted an-legend', `${T.legMarble}  ·  ${T.legPingpong}  ·  ${T.legTheo}`))
        for (const b of BALL_IDS) {
          const bt = a.balls[b]
          t6.push(sub(ballName(b)))
          t6.push(bt.pooled === null ? el('p', 'muted', T.needData) : table([T.colTrial, T.colT, T.colErr, T.colVerdict], bt.trials.map((t, i) => {
            const e = a.derived[b][i]!.error
            return [String(i + 1), pm(t.t_s, t.u_t_s), e ? `${e.error_pct >= 0 ? '+' : '−'}${numText(Math.abs(e.error_pct), 1, lang)}` : '–', e ? T.verdicts[e.comparison.verdict] : '–']
          })))
          const pe = a.pooledError[b]
          if (pe && bt.pooled) t6.push(el('p', 'readout-text', fmt(T.t6Pooled, { ball: ballName(b), n: bt.pooled.n, t: pmText(bt.pooled.t_s, bt.pooled.u_s, lang), err: `${pe.error_pct >= 0 ? '+' : '−'}${numText(Math.abs(pe.error_pct), 1, lang)}`, verdict: T.verdicts[pe.comparison.verdict] })))
        }
      } else t6.push(el('p', 'muted', T.t5NoH))
      { const ln6 = launchNote(); if (ln6) t6.push(ln6) }
      if (opts.reference) {
        const box = el('div', 'an-body')
        box.append(sub(T.t6RefTitle))
        for (const b of BALL_IDS) {
          const ref = slowmoReference(app, b)
          if (!ref) { box.append(el('p', 'muted', `${ballName(b)}: ${T.t6RefNone}`)); continue }
          const err = exp ? ((ref.t_s - exp.t_s) / exp.t_s) * 100 : null
          box.append(el('p', 'readout-text', fmt(T.t6RefLine, { ball: ballName(b), t: pmText(ref.t_s, Math.max(ref.u_s, 0.0005), lang), n: ref.n, err: err === null ? '–' : `${err >= 0 ? '+' : '−'}${numText(Math.abs(err), 1, lang)}` })))
          const pl = a.balls[b].pooled
          if (pl) {
            const d = pl.t_s - ref.t_s
            box.append(el('p', 'muted', fmt(T.t6RefCompare, { diff: `${d >= 0 ? '+' : '−'}${numText(Math.abs(d), 2, lang)}`, pct: `${d >= 0 ? '+' : '−'}${numText(Math.abs((d / ref.t_s) * 100), 0, lang)}` })))
          }
        }
        // the note quotes ~2 ms per frame count, so the ratio is the stopwatch uncertainty over that figure
        const ratios = BALL_IDS.map((b) => a.balls[b].pooled?.u_s ?? null).filter((v): v is number => v !== null).map((u) => u / 0.002)
        if (ratios.length) box.append(el('p', 'muted', fmt(T.t6RefNote, { ratio: String(Math.round(Math.min(...ratios) / 5) * 5) })))
        t6.push(box)
      }
      t6.push(el('p', 'muted', opts.reference ? T.t6SigmaNote : T.t6SigmaNoteSlow), el('p', 'note', T.t6Prompt))
      secs.t6.dyn.replaceChildren(...t6)
      if (exp && plot6) hPush(plotTrialBars(plot6, { series: [{ points: pts('marble'), shape: 'circle' }, { points: pts('pingpong'), shape: 'square' }], ref: { y: exp.t_s, u: exp.u_t_s } }, pal, { x: T.axisTrial, y: T.axisTime }))

      // task 7
      secs.t7.h.textContent = T.t7Title
      const t7: HTMLElement[] = [el('p', 'muted', T.t7Intro)]
      if (exp) {
        t7.push(checkBox(T.t7Formula))
        for (const b of BALL_IDS) {
          t7.push(sub(ballName(b)))
          t7.push(a.balls[b].pooled === null ? el('p', 'muted', T.needData) : table([T.colTrial, T.colV, T.colVf, T.colAngle], a.balls[b].trials.map((t, i) => {
            const f = a.derived[b][i]!.final
            return [String(i + 1), pm(t.v0_mps, t.u_v0_mps), f ? pm(f.v_mps, f.u_v_mps) : '–', f ? numText(f.angle_deg, 0, lang) : '–']
          })))
        }
        t7.push(el('p', 'muted', T.t7Note))
      } else t7.push(el('p', 'muted', T.t5NoH))
      t7.push(el('p', 'note', T.t7Prompt))
      secs.t7.dyn.replaceChildren(...t7)

      // task 8
      secs.t8.h.textContent = T.t8Title
      const sg = (d: { sigma: number } | null): string => (d ? `${d.sigma >= 0 ? '+' : '−'}${numText(Math.abs(d.sigma), 1, lang)}σ` : '–')
      const t8: HTMLElement[] = [el('p', 'muted', T.t8Intro)]
      const any = a.balls.marble.pooled !== null && a.balls.pingpong.pooled !== null
      t8.push(any ? table(
        [T.colTrial, `v0 ${ballName('marble')}`, `v0 ${ballName('pingpong')}`, `v0 · ${T.colDiff}`, `x · ${T.colDiff}`, `t · ${T.colDiff}`, `v0 · ${T.colRatio}`],
        a.balls.marble.trials.map((m, i) => {
          const p = a.balls.pingpong.trials[i]!, cmp = a.compare[i]!
          return [String(i + 1), pm(m.v0_mps, m.u_v0_mps), pm(p.v0_mps, p.u_v0_mps), sg(cmp.v0), sg(cmp.x), sg(cmp.t), cmp.v0Ratio === null ? '–' : numText(cmp.v0Ratio, 2, lang)]
        })) : el('p', 'muted', T.needData))
      t8.push(el('p', 'muted', T.correlationNote), el('p', 'note', T.t8Prompt))
      secs.t8.dyn.replaceChildren(...t8)

      // task 9
      secs.t9.h.textContent = T.t9Title
      secs.t9.dyn.replaceChildren(el('p', 'muted', T.t9Intro), list(T.t9Items), el('p', 'note', T.t9Prompt))
    }

    function download(): void {
      if (!last) return
      const csv = (L() === 'es' ? '﻿' : '') + analysisCSV(last, L())
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
      const a = el('a', undefined, undefined, { href: url, download: S().fileName })
      document.body.append(a); a.click(); a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    }

    return {
      update() {
        if (w.dirty()) { w.clear(); dirty = true }
        if (!dirty) return
        const next = `${JSON.stringify(BALL_IDS.map((b) => app.tableData(b).cells))}|${app.getRuns().length}|${app.procedure().measured.launchHeight}|${hText}|${L()}`
        dirty = false
        if (next === sig) return
        sig = next
        render()
      },
      relabel() { sig = ''; dirty = true },
      destroy() {
        for (const h of handles) h.destroy()
        window.clearTimeout(saveTimer); saveNotes(notes)
        offApp(); themeObserver.disconnect(); dark.removeEventListener('change', onScheme); ro.disconnect(); w.off(); c.root.remove()
      },
    }
  }
}
