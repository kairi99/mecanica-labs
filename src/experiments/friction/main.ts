// Friction page: builds the apparatus (URL options ?seed ?preset ?cam ?reference ?analysis), wires the panels to the lab steps and the camera
// logic of the 3D stage, then hands everything to the shared shell (core/shell). Shell options: ?lang ?theme ?view ?step ?tour ?teacher.
import '../../core/styles/tokens.css'
import '../../core/styles/app.css'
import '../../core/styles/layout.css'
import '../../core/styles/panels.css'
import '../../core/styles/pedagogy.css'
import '../../core/styles/analysis.css'
import './styles/friction.css'
import { FrictionApparatus, type ApparatusEvent } from './apparatus/index.ts'
import { mountShell } from '../../core/shell/mountShell.ts'
import { readShellParams } from '../../core/shell/params.ts'
import type { ProcedureProgress, Shell, ShellSlot, ShellStrings, Stage3DModule } from '../../core/shell/types.ts'
import type { Strings } from '../../core/views/view.ts'
import { reasonText } from './views/reasons.ts'
import { strings as baseShellStrings } from './views/strings/shell.ts'
import { mountInventory } from './views/inventory.ts'
import { mountBench } from './views/bench.ts'
import { mountPull } from './views/pull.ts'
import { mountForceTable, mountTable43 } from './views/table.ts'
import { mountIncline } from './views/incline.ts'
import { mountRecord } from './views/record.ts'
import { mountAnalysis } from './views/analysis.ts'
import { mountSide2d } from './views/side2d.ts'
import { resetUi } from './views/uistate.ts'
import { PRESETS, type PresetName } from './views/strings/scene3d.ts'
import type { Scene3DView } from './views/scene3d/index.ts'
import type { ViewContext } from './views/view.ts'
import { mountChecklist } from './pedagogy/checklistView.ts'
import type { ChecklistStep, StepId } from './pedagogy/checklist.ts'
import { strings as checklistStrings } from './pedagogy/strings/checklist.ts'
import { mountCoach } from './pedagogy/coach.ts'
import { mountTour } from './pedagogy/tour.ts'
import { clearAnalysisState, clearSnapshot, loadSnapshot, saveSnapshot, store } from './persist.ts'
import { rebaseSnapshotTime } from './restore.ts'

const params = new URLSearchParams(location.search)
const shellParams = readShellParams()

const camParam = params.get('cam')
const cam: PresetName | undefined = (PRESETS as readonly string[]).includes(camParam ?? '') ? (camParam as PresetName) : undefined
const showReference = params.get('reference') !== '0'
const showAnalysis = params.get('analysis') !== '0'

// ---- lab steps: 1 assembly, 2 experiment 1, 3 experiment 2, 4 experiment 3, then the reference record (?reference=0 hides it) and analysis (?analysis=0) ----
type StepKey = 'assembly' | 'exp1' | 'exp2' | 'exp3' | 'record' | 'analysis'
const STEP_KEYS: StepKey[] = ['assembly', 'exp1', 'exp2', 'exp3', ...(showReference ? ['record' as const] : []), ...(showAnalysis ? ['analysis' as const] : [])]
const STEP_COUNT = STEP_KEYS.length
const stepOf = (k: StepKey): number => STEP_KEYS.indexOf(k) + 1
const keep = [0, 1, 2, 3, ...(showReference ? [4] : []), ...(showAnalysis ? [5] : [])]
const pick = (a: readonly string[]): string[] => keep.map((i) => a[i]!)
const shellStrings: Strings<ShellStrings> = {
  es: { ...baseShellStrings.es, stepNames: pick(baseShellStrings.es.stepNames), stepShort: pick(baseShellStrings.es.stepShort) },
  en: { ...baseShellStrings.en, stepNames: pick(baseShellStrings.en.stepNames), stepShort: pick(baseShellStrings.en.stepShort) },
}

// ---- apparatus ---------------------------------------------------------------------------------------------------------------------
function randomSeed(): number {
  try { return crypto.getRandomValues(new Uint32Array(1))[0]! } catch { return (Date.now() & 0x7fffffff) >>> 0 }
}
const seedText = params.get('seed')
const seedParam = seedText !== null && seedText.trim() !== '' ? Number(seedText) : NaN
const presetParam = params.get('preset')
function createApp(): FrictionApparatus {
  const wantSeed = Number.isFinite(seedParam) ? seedParam : null
  if (presetParam === 'empty' || presetParam === 'exp12' || presetParam === 'exp3') {
    const a = new FrictionApparatus({ seed: wantSeed ?? randomSeed() })
    a.preset(presetParam)
    return a
  }
  const saved = loadSnapshot()
  if (saved && (wantSeed === null || saved.seed === wantSeed)) {
    const a = new FrictionApparatus({ seed: saved.seed })
    if (a.load(rebaseSnapshotTime(saved)).ok) return a
  }
  const a = new FrictionApparatus({ seed: wantSeed ?? randomSeed() })
  a.preset('empty')
  return a
}
const app = createApp()

// ---- panels ------------------------------------------------------------------------------------------------------------------------
const slots: ShellSlot<FrictionApparatus>[] = [
  { id: 'inventory', step: 1, mount: mountInventory },
  { id: 'bench', step: 2, mount: mountBench('bench') },
  { id: 'pull4.1', step: 2, mount: mountPull('4.1') },
  { id: 'table4.1', step: 2, mount: mountForceTable('4.1') },
  { id: 'bench2', step: 3, mount: mountBench('bench2') },
  { id: 'pull4.2', step: 3, mount: mountPull('4.2') },
  { id: 'table4.2', step: 3, mount: mountForceTable('4.2') },
  { id: 'incline', step: 4, mount: mountIncline },
  { id: 'table4.3', step: 4, mount: mountTable43 },
]
if (showReference) slots.push({ id: 'record', step: stepOf('record'), mount: mountRecord })
if (showAnalysis) slots.push({ id: 'analysis', step: stepOf('analysis'), mount: mountAnalysis({ teacher: shellParams.teacher }) })
const PANEL_STEP: Record<string, number> = {
  inventory: 1, bench: 2, 'pull4.1': 2, 'table4.1': 2, bench2: 3, 'pull4.2': 3, 'table4.2': 3, incline: 4, 'table4.3': 4, stage: 0, procedure: 0,
}
if (showReference) PANEL_STEP.record = stepOf('record')
if (showAnalysis) PANEL_STEP.analysis = stepOf('analysis')

/** Lab step (1-based key) that holds each checklist item: the "next" line shows the first unfinished item of the CURRENT step, else the first one overall. */
const ITEM_STEP: Record<StepId, StepKey> = { assembly: 'assembly', mass: 'exp1', paper: 'exp1', zero: 'exp1', exp1: 'exp1', exp2: 'exp2', course: 'exp3', exp3: 'exp3' }
function progressOf(steps: ChecklistStep[], overall: ChecklistStep | null): ProcedureProgress {
  const cur = STEP_KEYS[(shell ? shell.currentStep() : 1) - 1]
  const next = steps.find((s) => s.status === 'pending' && ITEM_STEP[s.id] === cur) ?? overall
  const ok = (ids: StepId[]): boolean => ids.every((id) => steps.find((s) => s.id === id)?.status === 'ok')
  const done: Record<StepKey, boolean> = {
    assembly: ok(['assembly']),
    exp1: ok(['mass', 'paper', 'zero', 'exp1']),
    exp2: ok(['exp2']),
    exp3: ok(['course', 'exp3']),
    record: app.getPullRuns().length + app.getTrials().length > 0,
    analysis: false,
  }
  return {
    stepDone: STEP_KEYS.map((k) => done[k]),
    done: steps.filter((s) => s.status === 'ok').length,
    total: steps.length,
    nextLabel: next ? (lang) => checklistStrings[lang].steps[next.id].label : null,
  }
}

// ---- stage: the 3D scene and its camera ----------------------------------------------------------------------------------------------
let scene3d: Scene3DView | null = null
// `shell` is assigned at the end of this file; every use is inside a callback that runs later.
let shell: Shell<FrictionApparatus>
let coachHandle: { relabel(): void; clear(): void; destroy(): void } | null = null
const areaForStep = (step: number): 'all' | 'exp12' | 'exp3' => (step === 2 || step === 3 ? 'exp12' : step === 4 ? 'exp3' : 'all')
const presetForStep = (step: number): PresetName => (step === 2 || step === 3 ? 'scale' : step === 4 ? 'rail' : 'overview')
function setCamera(name: PresetName): void {
  if (!scene3d || shell.effectiveMode() !== '3d') return
  scene3d.setPreset(name)
}

const load3d = async (): Promise<Stage3DModule<FrictionApparatus>> => {
  const mod = await import('./views/scene3d/index.ts')
  return {
    webgl2Available: mod.webgl2Available,
    mount(host: HTMLElement, ctx: ViewContext, opts) {
      scene3d = mod.mountScene3D(host, ctx, { preset: cam ?? presetForStep(shell.currentStep()), area: areaForStep(shell.currentStep()), openPanel: opts.openPanel, onFail: () => opts.onFail() })
      return scene3d
    },
  }
}

// ---- go ------------------------------------------------------------------------------------------------------------------------------
shell = mountShell<FrictionApparatus, ApparatusEvent>({
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
  stage: { mount2d: mountSide2d, load3d },
  refusalText: (e, lang) => (e.type === 'refused' ? reasonText(lang, e.reason) : null),
  reset() { clearSnapshot(); clearAnalysisState(); app.preset('empty'); resetUi() },
  save: () => saveSnapshot(app.snapshot()),
  onStepChanged(step) {
    scene3d?.setArea(areaForStep(step))
    if (!cam) setCamera(presetForStep(step))
    coachHandle?.clear() // a hint about another step is stale here
    shell.relabelAll() // re-renders the checklist: its "next" line follows the current step
  },
  tour: {
    mount: (ctx, hooks) => mountTour(ctx, hooks),
    stepOf: { inventory: 1, bench: 2, pull: 2, table: 2, incline: 4, ...(showReference ? { record: stepOf('record') } : {}), ...(showAnalysis ? { analysis: stepOf('analysis') } : {}) },
  },
  coach: (ctx) => { const h = mountCoach(ctx); coachHandle = h; return h },
  params: shellParams,
})
