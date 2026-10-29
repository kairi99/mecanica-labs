// MRUV page: builds the apparatus (URL options ?preset=assembled|empty|loose ?seed ?cam ?analysis, dev-only ?demo) and the camera logic of the 3D
// stage, then hands everything to the shared shell (core/shell). Shell options: ?lang ?theme ?view ?step ?tour ?teacher.
import '../../core/styles/tokens.css'
import '../../core/styles/app.css'
import '../../core/styles/layout.css'
import '../../core/styles/panels.css'
import '../../core/styles/dragdrop.css'
import './styles/instruments.css'
import './styles/side2d.css'
import '../../core/styles/analysis.css'
import '../../core/styles/pedagogy.css'
import { Apparatus, TABLE_POSITIONS_cm, type ApparatusEvent } from './apparatus/index.ts'
import { mountShell } from '../../core/shell/mountShell.ts'
import { readShellParams } from '../../core/shell/params.ts'
import type { ProcedureProgress, Shell, Stage3DModule } from '../../core/shell/types.ts'
import type { MountView } from './views/view.ts'
import { reasonText } from './views/reasons.ts'
import { strings as shellStrings } from './views/strings/shell.ts'
import { mountInventory } from './views/inventory.ts'
import { mountAdjust } from './views/adjust.ts'
import { mountStopwatch } from './views/stopwatch.ts'
import { mountTimingBar } from './views/timingbar.ts'
import { mountTape } from './views/tape.ts'
import { mountTable } from './views/table.ts'
import { mountTablet } from './views/tablet.ts'
import { mountAnalysis } from './views/analysis.ts'
import { getMarkRow, onMarkRow } from './views/uistate.ts'
import { mountChecklist } from './pedagogy/checklistView.ts'
import type { ChecklistStep, StepId } from './pedagogy/checklist.ts'
import { strings as checklistStrings } from './pedagogy/strings/checklist.ts'
import { mountCoach } from './pedagogy/coach.ts'
import { mountTour, type TourStepId } from './pedagogy/tour.ts'
import { fillTableSimulated } from './pedagogy/simulatedReadings.ts'
import { mountSide2d } from './views/side2d.ts'
import type { PresetName as ScenePreset, Scene3DView } from './views/scene3d/index.ts'
import {
  clearSnapshot, loadAutoMark, loadSnapshot, migrateLegacyStorage, saveAutoMark, saveSnapshot, store, tasks,
} from './persist.ts'

migrateLegacyStorage()
const params = new URLSearchParams(location.search)
const shellParams = readShellParams()

/** Camera presets agreed with the 3D scene: 'alongRail' is gone, 'lateral' and 'mark' are new. */
const PRESETS = ['overview', 'highEnd', 'lowEnd', 'lateral', 'mark', 'tape'] as const
const camParam = params.get('cam')
type Cam = (typeof PRESETS)[number]
const cam: Cam | undefined = (PRESETS as readonly string[]).includes(camParam ?? '') ? (camParam as Cam) : undefined
const showAnalysis = params.get('analysis') !== '0'
/** ?teacher shows target values (checklist angle, the model's expected a in the analysis comparison). */
const teacher = shellParams.teacher
/** Dev builds only: ?demo=table fills Table 1.1 with simulated human readings (screenshots, manual checks). Never persisted. */
const demoTable = import.meta.env.DEV && params.get('demo') === 'table'
/** Help pages; the theory sections unlock with the task checklist (or ?theory=1). `?analysis=0` hides the checklist: use ?theory=1 then. */
const HELP = { es: 'help/index.html', en: 'help/en.html' } as const
const HELP_THEORY = { es: 'help/index.html#teoria', en: 'help/en.html#theory' } as const
const STEP_COUNT = showAnalysis ? 5 : 4

// ---- apparatus -----------------------------------------------------------------------------------------------------
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
  if (presetParam === 'assembled' || presetParam === 'empty' || presetParam === 'loose') {
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
  a.preset('loose')
  return a
}
const app = createApp()
let autoMark = loadAutoMark()

// ---- steps and panels ------------------------------------------------------------------------------------------------------
/** Which lab step holds each panel (data-panel). */
const PANEL_STEP: Record<string, number> = { inventory: 1, adjust: 2, tape: 2, table: 3, stopwatch: 3, tablet: 4, analysis: 5, stage: 0, procedure: 0 }
const TOUR_STEP: Partial<Record<TourStepId, number>> = { inventory: 1, adjust: 2, tape: 2, stopwatch: 3, table: 3, tablet: 4, analysis: 5 }

const slots: Array<{ id: string; step: number; mount: MountView }> = [
  { id: 'inventory', step: 1, mount: mountInventory },
  { id: 'adjust', step: 2, mount: mountAdjust },
  { id: 'tape', step: 2, mount: mountTape },
  { id: 'table', step: 3, mount: mountTable },
  { id: 'stopwatch', step: 3, mount: mountStopwatch({ autoMark: { get: () => autoMark, set: (on) => { autoMark = on; saveAutoMark(on) } } }) },
  { id: 'tablet', step: 4, mount: mountTablet },
]
if (showAnalysis) slots.push({ id: 'analysis', step: 5, mount: mountAnalysis({ teacher, helpTheory: HELP_THEORY }) })

/** Done checks of the tracker and the "next step" line, from the live checklist. */
function progressOf(steps: ChecklistStep[], next: ChecklistStep | null): ProcedureProgress {
  const ok = (ids: StepId[]): boolean => ids.every((id) => steps.find((s) => s.id === id)?.status === 'ok')
  const measured = ok(['measure'])
  return {
    stepDone: [
      ok(['standBase', 'railClamped', 'scale', 'lowEnd', 'screws']),
      ok(['levelled', 'angle', 'marks', 'cartZero']),
      measured,
      app.getRuns().length > 0,
      measured,
    ].slice(0, STEP_COUNT),
    done: steps.filter((s) => s.status === 'ok').length,
    total: steps.length,
    nextLabel: next ? (lang) => checklistStrings[lang].steps[next.id].label : null,
  }
}

// ---- stage: the 3D scene and its camera ----------------------------------------------------------------------------------------
const phoneQuery = window.matchMedia('(max-width: 819px)')
let scene3d: Scene3DView | null = null
// `shell` is assigned at the end of this file; every use is inside a callback that runs later.
let shell: Shell<Apparatus>

/** Camera preset by name. */
function setCamera(name: Cam): void {
  if (!scene3d || shell.effectiveMode() !== '3d') return
  scene3d.setPreset(name as ScenePreset)
}
function sendMarkTarget(): void {
  scene3d?.setMarkTarget(TABLE_POSITIONS_cm[getMarkRow()]!)
}
onMarkRow(sendMarkTarget)
app.on((e) => {
  // without the receiver the cart will fall off the low end: show the whole bench instead of the marks
  if (e.type === 'released' && autoMark && shell.currentStep() === 3) setCamera(app.canRun().warnings.length > 0 ? 'lowEnd' : 'mark')
})

const load3d = async (): Promise<Stage3DModule<Apparatus>> => {
  const mod = await import('./views/scene3d/index.ts')
  return {
    webgl2Available: mod.webgl2Available,
    mount(host, ctx, opts) {
      scene3d = mod.mountScene3D(host, ctx, {
        preset: cam === 'mark' || cam === 'lateral' ? undefined : (cam as ScenePreset | undefined),
        openPanel: opts.openPanel,
        onFail: opts.onFail,
      })
      sendMarkTarget()
      if (cam === 'mark' || cam === 'lateral') setCamera(cam)
      else if (!cam && shell.currentStep() === 3 && phoneQuery.matches) setCamera('mark')
      return scene3d
    },
  }
}

// ---- go -------------------------------------------------------------------------------------------------------------------
shell = mountShell<Apparatus, ApparatusEvent>({
  apparatus: app,
  store,
  strings: shellStrings,
  help: HELP,
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
  reset() { clearSnapshot(); tasks.clear(); app.preset('loose') },
  save: () => saveSnapshot(app.snapshot()),
  persist: !demoTable,
  // Entering step 3 on a phone switches the camera to the Mark view.
  onStepChanged(step) { if (step === 3 && phoneQuery.matches) setCamera('mark') },
  tour: {
    mount: (ctx, hooks) => mountTour(ctx, hooks),
    stepOf: TOUR_STEP,
  },
  coach: mountCoach,
  params: shellParams,
})
