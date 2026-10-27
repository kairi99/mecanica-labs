// Practica 3 page: builds the apparatus (URL options ?preset ?seed ?cam ?reference ?analysis, dev-only ?demo) and the camera logic of
// the 3D stage, then hands everything to the shared shell (core/shell). Shell options: ?lang ?theme ?view ?step ?tour ?teacher.
import '../../core/styles/tokens.css'
import '../../core/styles/app.css'
import '../../core/styles/layout.css'
import '../../core/styles/panels.css'
import './styles/instruments.css'
import './styles/side2d.css'
import './styles/newton2.css'
import '../../core/styles/analysis.css'
import '../../core/styles/pedagogy.css'
import { Apparatus, type ApparatusEvent } from './apparatus/index.ts'
import { mountShell } from '../../core/shell/mountShell.ts'
import { readShellParams } from '../../core/shell/params.ts'
import type { ProcedureProgress, Shell, Stage3DModule } from '../../core/shell/types.ts'
import type { MountView } from './views/view.ts'
import { reasonText } from './views/reasons.ts'
import { strings as shellStrings } from './views/strings/shell.ts'
import { mountInventory } from './views/inventory.ts'
import { mountAdjust } from './views/adjust.ts'
import { mountMasses } from './views/masses.ts'
import { mountMeasure } from './views/measure.ts'
import { mountStopwatch } from './views/stopwatch.ts'
import { mountTimingBar } from './views/timingbar.ts'
import { mountTable } from './views/table.ts'
import { mountLog } from './views/log.ts'
import { mountAnalysis } from './views/analysis.ts'
import { mountSide2d } from './views/side2d.ts'
import { mountChecklist } from './pedagogy/checklistView.ts'
import type { ChecklistStep, StepId } from './pedagogy/checklist.ts'
import { strings as checklistStrings } from './pedagogy/strings/checklist.ts'
import { mountCoach } from './pedagogy/coach.ts'
import { mountTour, type TourStepId } from './pedagogy/tour.ts'
import { fillTableSimulated } from './pedagogy/simulatedReadings.ts'
import type { Scene3DView } from './views/scene3d/index.ts'
import { parsePreset, type PresetName as ScenePreset } from './views/scene3d/units.ts'
import { clearSnapshot, loadAutoCam, loadSnapshot, saveAutoCam, saveSnapshot, store } from './persist.ts'

const params = new URLSearchParams(location.search)
const shellParams = readShellParams()
const cam = parsePreset(params.get('cam')) ?? undefined
/** ?reference=0 hides the DigiCart log step; ?analysis=0 hides the analysis step. */
const showReference = params.get('reference') !== '0'
const showAnalysis = params.get('analysis') !== '0'
const teacher = shellParams.teacher
/** Dev builds only: ?demo=table fills Tabla 3.1 with simulated human readings (screenshots, manual checks). Never persisted. */
const demoTable = import.meta.env.DEV && params.get('demo') === 'table'

// ---- lab steps: 1 assembly, 2 settings, 3 measurements, then the DigiCart log (?reference=0 hides it) and the analysis (?analysis=0) ----
const STEP_KEYS = ['assembly', 'adjust', 'measure', ...(showReference ? ['log' as const] : []), ...(showAnalysis ? ['analysis' as const] : [])] as const
type StepKey = (typeof STEP_KEYS)[number]
const stepOf = (k: StepKey): number => STEP_KEYS.indexOf(k) + 1
const STEP_COUNT = STEP_KEYS.length
const MEASURE_STEP = stepOf('measure')

// ---- apparatus ----
function randomSeed(): number {
  try { return crypto.getRandomValues(new Uint32Array(1))[0]! } catch { return (Date.now() & 0x7fffffff) >>> 0 }
}
const seedParam = params.get('seed') !== null ? Number(params.get('seed')) : NaN
const presetParam = params.get('preset')
function createApp(): Apparatus {
  if (demoTable) {
    const a = new Apparatus({ seed: Number.isFinite(seedParam) ? seedParam : 7 })
    a.preset('assembled')
    fillTableSimulated(a, { seed: 11 })
    return a
  }
  const wantSeed = Number.isFinite(seedParam) ? seedParam : null
  if (presetParam === 'assembled' || presetParam === 'empty') {
    const a = new Apparatus({ seed: wantSeed ?? randomSeed() })
    a.preset(presetParam)
    return a
  }
  const saved = loadSnapshot()
  if (saved && (wantSeed === null || saved.seed === wantSeed)) {
    const a = new Apparatus({ seed: saved.seed })
    const r = a.load(saved)
    if (r.ok) {
      // Timestamps are relative to the page load: a run or a running stopwatch from a previous visit cannot continue.
      if (a.getState().cart.released) a.resetCart()
      if (a.getState().stopwatch.running) a.stopwatchReset()
      return a
    }
  }
  const a = new Apparatus({ seed: wantSeed ?? randomSeed() })
  a.preset('empty')
  return a
}
const app = createApp()
let autoCam = loadAutoCam()

// ---- panels ----
const PANEL_STEP: Record<string, number> = {
  inventory: 1, adjust: 2, masses: 2, instruments: MEASURE_STEP, trial: MEASURE_STEP, stopwatch: MEASURE_STEP, table: MEASURE_STEP, stage: 0, procedure: 0,
}
const slots: Array<{ id: string; step: number; mount: MountView }> = [
  { id: 'inventory', step: 1, mount: mountInventory },
  { id: 'adjust', step: 2, mount: mountAdjust },
  { id: 'masses', step: 2, mount: mountMasses({ compact: false }) },
  { id: 'instruments', step: MEASURE_STEP, mount: mountMeasure },
  { id: 'trial', step: MEASURE_STEP, mount: mountMasses({ compact: true }) },
  { id: 'table', step: MEASURE_STEP, mount: mountTable },
  { id: 'stopwatch', step: MEASURE_STEP, mount: mountStopwatch({ autoCam: { get: () => autoCam, set: (on) => { autoCam = on; saveAutoCam(on) } } }) },
]
const TOUR_STEP: Partial<Record<TourStepId, number>> = { inventory: 1, adjust: 2, instruments: MEASURE_STEP, timing: MEASURE_STEP, table: MEASURE_STEP }
if (showReference) { slots.push({ id: 'log', step: stepOf('log'), mount: mountLog }); PANEL_STEP.log = stepOf('log'); TOUR_STEP.log = stepOf('log') }
if (showAnalysis) { slots.push({ id: 'analysis', step: stepOf('analysis'), mount: mountAnalysis({ teacher }) }); PANEL_STEP.analysis = stepOf('analysis'); TOUR_STEP.analysis = stepOf('analysis') }

/** Done checks of the tracker and the "next step" line, from the live checklist. */
function progressOf(steps: ChecklistStep[], next: ChecklistStep | null): ProcedureProgress {
  const ok = (ids: StepId[]): boolean => ids.every((id) => steps.find((s) => s.id === id)?.status === 'ok')
  const measured = ok(['mt', 'force', 'timings'])
  const flags: Record<StepKey, boolean> = {
    assembly: ok(['assembly']), adjust: ok(['levelled', 'marks', 'cartStart', 'stringLength']), measure: measured, log: app.getRuns().length > 0, analysis: measured,
  }
  return {
    stepDone: STEP_KEYS.map((k) => flags[k]),
    done: steps.filter((s) => s.status === 'ok').length,
    total: steps.length,
    nextLabel: next ? (lang) => checklistStrings[lang].steps[next.id].label : null,
  }
}

// ---- stage: the 3D scene and its camera ----
let scene3d: Scene3DView | null = null
// `shell` is assigned at the end of this file; every use is inside a callback that runs later.
let shell: Shell<Apparatus>
function setCamera(name: ScenePreset): void {
  if (!scene3d || shell.effectiveMode() !== '3d') return
  scene3d.setPreset(name)
}
app.on((e) => {
  if (e.type === 'released' && autoCam && shell.currentStep() === MEASURE_STEP) setCamera('pulley')
})

const load3d = async (): Promise<Stage3DModule<Apparatus>> => {
  const mod = await import('./views/scene3d/index.ts')
  return {
    webgl2Available: mod.webgl2Available,
    mount(host, ctx, opts) {
      scene3d = mod.mountScene3D(host, ctx, { preset: cam, openPanel: opts.openPanel, onFail: opts.onFail })
      return scene3d
    },
  }
}

// ---- go ----
shell = mountShell<Apparatus, ApparatusEvent>({
  apparatus: app,
  store,
  strings: shellStrings,
  help: { es: 'help/index.html', en: 'help/en.html' },
  landingUrl: '../index.html',
  stepCount: STEP_COUNT,
  panelStep: PANEL_STEP,
  slots,
  procedure: (api) => mountChecklist({
    teacher,
    onShow: (step) => api.showStep(step.panel, step.focus),
    onTour: () => api.startTour(),
    onProgress: (steps, next) => api.setProgress(progressOf(steps, next)),
  }),
  timingBar: mountTimingBar,
  stage: { mount2d: mountSide2d, load3d },
  refusalText: (e, lang) => (e.type === 'refused' ? reasonText(lang, e.reason) : null),
  reset() { clearSnapshot(); app.preset('empty') },
  save: () => saveSnapshot(app.snapshot()),
  persist: !demoTable,
  tour: { mount: (ctx, hooks) => mountTour(ctx, hooks), stepOf: TOUR_STEP },
  coach: mountCoach,
  params: shellParams,
})
