// Parabolic page: builds the apparatus (URL options ?seed ?preset ?cam ?reference ?analysis), wires the panels to the lab steps and
// the camera logic of the 3D stage, then hands everything to the shared shell (core/shell). Shell options: ?lang ?theme ?view ?step ?tour ?teacher.
import '../../core/styles/tokens.css'
import '../../core/styles/app.css'
import '../../core/styles/layout.css'
import '../../core/styles/panels.css'
import './styles/instruments.css'
import './styles/slowmo.css'
import '../../core/styles/pedagogy.css'
import '../../core/styles/analysis.css'
import { ParabolicApparatus, type ApparatusEvent } from './apparatus/index.ts'
import { mountShell } from '../../core/shell/mountShell.ts'
import { readShellParams } from '../../core/shell/params.ts'
import type { ProcedureProgress, ShellSlot, Shell, Stage3DModule } from '../../core/shell/types.ts'
import type { Strings } from '../../core/views/view.ts'
import type { ShellStrings } from '../../core/shell/types.ts'
import { reasonText } from './views/reasons.ts'
import { strings as baseShellStrings } from './views/strings/shell.ts'
import { mountInventory } from './views/inventory.ts'
import { mountAdjust } from './views/adjust.ts'
import { mountTape } from './views/tape.ts'
import { mountLaunch } from './views/launch.ts'
import { mountTimingBar } from './views/timingbar.ts'
import { mountTable } from './views/table.ts'
import { mountSlowmo } from './views/slowmo.ts'
import { mountAnalysis } from './views/analysis.ts'
import { getTape, onUiState, setBall, setCell, setNote, setTape, tapeKey } from './views/uistate.ts'
import { mountChecklist } from './pedagogy/checklistView.ts'
import type { ChecklistStep, StepId } from './pedagogy/checklist.ts'
import { strings as checklistStrings } from './pedagogy/strings/checklist.ts'
import { mountCoach } from './pedagogy/coach.ts'
import { mountTour } from './pedagogy/tour.ts'
import { mountSide2d } from './views/side2d.ts'
import { PRESETS, type PresetName, type Scene3DView } from './views/stage.ts'
import type { ViewContext } from './views/view.ts'
import { clearAnalysisState, clearSnapshot, loadSnapshot, saveSnapshot, store } from './persist.ts'
import { rebaseSnapshotTime } from './restore.ts'

const params = new URLSearchParams(location.search)
const shellParams = readShellParams()

const camParam = params.get('cam')
const cam: PresetName | undefined = (PRESETS as readonly string[]).includes(camParam ?? '') ? (camParam as PresetName) : undefined
const showReference = params.get('reference') !== '0'
const showAnalysis = params.get('analysis') !== '0'

// ---- lab steps: 1 assembly, 2 settings, 3 launches, then slow motion (?reference=0 hides it) and analysis (?analysis=0 hides it) ------------------
type StepKey = 'assembly' | 'adjust' | 'launch' | 'slowmo' | 'analysis'
const STEP_KEYS: StepKey[] = ['assembly', 'adjust', 'launch', ...(showReference ? ['slowmo' as const] : []), ...(showAnalysis ? ['analysis' as const] : [])]
const STEP_COUNT = STEP_KEYS.length
/** 1-based lab step of a step key; 0 when that step is switched off. */
const stepOf = (k: StepKey): number => STEP_KEYS.indexOf(k) + 1
const LAUNCH_STEP = stepOf('launch')
/** Names of the steps that are shown (the shell strings list all five). */
const keep = [0, 1, 2, ...(showReference ? [3] : []), ...(showAnalysis ? [4] : [])]
const pick = (a: readonly string[]): string[] => keep.map((i) => a[i]!)
const shellStrings: Strings<ShellStrings> = {
  es: { ...baseShellStrings.es, stepNames: pick(baseShellStrings.es.stepNames), stepShort: pick(baseShellStrings.es.stepShort) },
  en: { ...baseShellStrings.en, stepNames: pick(baseShellStrings.en.stepNames), stepShort: pick(baseShellStrings.en.stepShort) },
}

// ---- apparatus -------------------------------------------------------------------------------------------------------------------
function randomSeed(): number {
  try { return crypto.getRandomValues(new Uint32Array(1))[0]! } catch { return (Date.now() & 0x7fffffff) >>> 0 }
}
const seedText = params.get('seed')
const seedParam = seedText !== null && seedText.trim() !== '' ? Number(seedText) : NaN
const presetParam = params.get('preset')
function createApp(): ParabolicApparatus {
  const wantSeed = Number.isFinite(seedParam) ? seedParam : null
  if (presetParam === 'assembled' || presetParam === 'empty') {
    const a = new ParabolicApparatus({ seed: wantSeed ?? randomSeed() })
    a.preset(presetParam)
    return a
  }
  const saved = loadSnapshot()
  if (saved && (wantSeed === null || saved.seed === wantSeed)) {
    const a = new ParabolicApparatus({ seed: saved.seed })
    if (a.load(rebaseSnapshotTime(saved)).ok) return a
  }
  const a = new ParabolicApparatus({ seed: wantSeed ?? randomSeed() })
  a.preset('empty')
  return a
}
const app = createApp()
setBall(app.getState().ball.selected ?? 'marble')
app.on((e) => { if (e.type === 'ballSelected') setBall(e.ball) })

// ---- panels ----------------------------------------------------------------------------------------------------------------------
const autoEdge = {
  get: (): boolean => store.get('autoedge') !== '0',
  set: (on: boolean): void => store.set('autoedge', on ? '1' : '0'),
}
const slots: ShellSlot<ParabolicApparatus>[] = [
  { id: 'inventory', step: 1, mount: mountInventory },
  { id: 'adjust', step: 2, mount: mountAdjust },
  { id: 'tape', step: 2, mount: mountTape('tape') },
  // Tabla 2.1 first (the record of the step, as Table 1.1 in MRUV), then the launches, then the tape for the ranges
  { id: 'table', step: LAUNCH_STEP, mount: mountTable },
  { id: 'launch', step: LAUNCH_STEP, mount: mountLaunch({ autoEdge }) },
  { id: 'tapeRange', step: LAUNCH_STEP, mount: mountTape('tapeRange') },
]
if (showReference) slots.push({ id: 'slowmo', step: stepOf('slowmo'), mount: mountSlowmo({ goToLaunch: () => shell.setStep(LAUNCH_STEP) }) })
if (showAnalysis) slots.push({ id: 'analysis', step: stepOf('analysis'), mount: mountAnalysis({ reference: showReference }) })
/** Which lab step holds each panel (data-panel); 0: always visible. Switched-off steps have no entry. */
const PANEL_STEP: Record<string, number> = { inventory: 1, adjust: 2, tape: 2, launch: LAUNCH_STEP, tapeRange: LAUNCH_STEP, table: LAUNCH_STEP, stage: 0, procedure: 0 }
if (showReference) PANEL_STEP.slowmo = stepOf('slowmo')
if (showAnalysis) PANEL_STEP.analysis = stepOf('analysis')

/** Done checks of the tracker and the "next step" line, from the live checklist. */
function progressOf(steps: ChecklistStep[], next: ChecklistStep | null): ProcedureProgress {
  const ok = (ids: StepId[]): boolean => ids.every((id) => steps.find((s) => s.id === id)?.status === 'ok')
  const done: Record<StepKey, boolean> = {
    assembly: ok(['assembly']),
    adjust: ok(['rise', 'gap', 'marks', 'paper']),
    launch: ok(['launches']),
    slowmo: app.getRuns().length > 0,
    analysis: false,
  }
  return {
    stepDone: STEP_KEYS.map((k) => done[k]),
    done: steps.filter((s) => s.status === 'ok').length,
    total: steps.length,
    nextLabel: next ? (lang) => checklistStrings[lang].steps[next.id].label : null,
  }
}

// ---- stage: the 3D scene and its camera ------------------------------------------------------------------------------------------
const phoneQuery = window.matchMedia('(max-width: 819px)')
let scene3d: Scene3DView | null = null
// `shell` is assigned at the end of this file; every use is inside a callback that runs later.
let shell: Shell<ParabolicApparatus>

function setCamera(name: PresetName): void {
  if (!scene3d || shell.effectiveMode() !== '3d') return
  scene3d.setPreset(name)
}
/** Release switches to the side-on 'edge' view while timing (opt-out in the launches panel). */
app.on((e) => { if (e.type === 'released' && autoEdge.get() && shell.currentStep() === LAUNCH_STEP) setCamera('edge') })

// The tape target chosen in the panel goes to the 3D scene (and the other way round, see onTapeTarget below).
let sentTape = ''
onUiState(() => {
  const k = tapeKey(getTape())
  if (k !== sentTape) { sentTape = k; scene3d?.setTapeTarget(getTape()) }
})

const load3d = async (): Promise<Stage3DModule<ParabolicApparatus>> => {
  const mod = await import('./views/scene3d/index.ts')
  return {
    webgl2Available: mod.webgl2Available,
    mount(host: HTMLElement, ctx: ViewContext, opts) {
      scene3d = mod.mountScene3D(host, ctx, {
        preset: cam ?? (shell.currentStep() === LAUNCH_STEP && phoneQuery.matches ? 'edge' : 'overview'),
        openPanel: opts.openPanel,
        onFail: () => opts.onFail(),
        onTapeTarget: (t) => {
          setTape(t)
          shell.openPanel(shell.currentStep() === LAUNCH_STEP ? 'tapeRange' : 'tape')
        },
      })
      return scene3d
    },
  }
}

/** Below 1080 px the slow-motion step hides the stage (styles/slowmo.css), so the viewer, scrubber and controls fit together. */
function markSlowmoStep(step: number): void {
  document.body.classList.toggle('pb-slowmo', showReference && step === stepOf('slowmo'))
}

// ---- go --------------------------------------------------------------------------------------------------------------------------
shell = mountShell<ParabolicApparatus, ApparatusEvent>({
  apparatus: app,
  store,
  strings: shellStrings,
  help: { es: 'help/index.html', en: 'help/en.html' },
  landingUrl: '../index.html',
  stepCount: STEP_COUNT,
  panelStep: PANEL_STEP,
  slots,
  procedure: (api) => mountChecklist({
    teacher: shellParams.teacher,
    onShow: (step) => api.showStep(step.panel, step.focus),
    onTour: () => api.startTour(),
    onProgress: (steps, next) => api.setProgress(progressOf(steps, next)),
  }),
  timingBar: mountTimingBar,
  stage: { mount2d: mountSide2d, load3d },
  refusalText: (e, lang) => (e.type === 'refused' ? reasonText(lang, e.reason) : null),
  reset() { clearSnapshot(); clearAnalysisState(); app.preset('empty'); setCell(0, 0); setNote('') },
  save: () => saveSnapshot(app.snapshot()),
  // On a phone the launches step uses the side-on view; other steps go back to the overview (unless ?cam fixes the camera).
  onStepChanged(step) {
    markSlowmoStep(step)
    if (cam || !phoneQuery.matches) return
    setCamera(step === LAUNCH_STEP ? 'edge' : 'overview')
  },
  tour: {
    mount: (ctx, hooks) => mountTour(ctx, hooks),
    stepOf: { inventory: 1, adjust: 2, timing: LAUNCH_STEP, table: LAUNCH_STEP, ...(showReference ? { slowmo: stepOf('slowmo') } : {}), ...(showAnalysis ? { analysis: stepOf('analysis') } : {}) },
  },
  coach: mountCoach,
  params: shellParams,
})
markSlowmoStep(shell.currentStep())
