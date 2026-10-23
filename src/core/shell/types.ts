// Public types of the experiment shell: what an experiment hands to mountShell() and what the shell hands back.
import type { Lang } from '../i18n.ts'
import type { ExperimentStore, StageMode } from '../persist.ts'
import type { EventSource } from '../pedagogy/coach.ts'
import type { MountView, Strings, View, ViewContext } from '../views/view.ts'

/** Header, step tracker, stage, procedure drawer and dialog texts of one experiment (`{ es, en }` pair, identical keys). */
export interface ShellStrings {
  title: string
  titleShort: string
  subtitle: string
  regionMain: string
  regionStage: string
  lang: string
  langSwitch: string
  theme: string
  themes: { auto: string; light: string; dark: string }
  help: string
  viewMode: string
  view3d: string
  view2d: string
  notice3d: string
  noticeNoWebgl: string
  loading3d: string
  credits: string
  new: string
  newConfirm: string
  newYes: string
  newNo: string
  more: string
  stepsNav: string
  stepsMenu: string
  stepNames: string[]
  stepShort: string[]
  stepOf: string
  stepDone: string
  prevStep: string
  nextStep: string
  procedure: string
  procedureProgress: string
  procedureNext: string
  procedureDone: string
  sheetToggle: string
  panelRegion: string
}


/** `?tour=`: 0 never starts the tour on its own, 1 starts it on every load, otherwise only on the first visit. */
export type TourFlag = '0' | '1' | null

/** Options every experiment page understands (the experiment adds its own: ?preset ?seed ?cam ?analysis ?demo ...). */
export interface ShellParams {
  /** ?step=n (1-based; null: not given). */
  step: number | null
  /** ?theme=light|dark (null: use the saved theme). */
  theme: 'light' | 'dark' | null
  tour: TourFlag
  /** ?view=2d|3d (null: use the saved one, default 3d). */
  view: StageMode | null
  /** ?teacher shows target values (checklist angle, the model's expected result in the analysis comparison). */
  teacher: boolean
}

/** Where one view mounts: which step pane, under which `data-slot` id. */
export interface ShellSlot<A> {
  id: string
  /** Lab step (1-based) whose pane holds the view. */
  step: number
  mount: MountView<A>
}

/** Done checks of the step tracker and the "next step" line of the procedure bar, from the experiment's checklist. */
export interface ProcedureProgress {
  /** One flag per lab step. */
  stepDone: readonly boolean[]
  /** Checklist steps done and in total. */
  done: number
  total: number
  /** Label of the next checklist step in the given language (null: everything is done). */
  nextLabel: ((lang: Lang) => string) | null
}

/** What the shell offers while an experiment is being built and afterwards. */
export interface ShellApi<A> {
  readonly ctx: ViewContext<A>
  lang(): Lang
  currentStep(): number
  setStep(n: number, opts?: { scroll?: boolean }): void
  /** '3d' only while the 3D scene is the one on screen (a failed 3D falls back to '2d'). */
  effectiveMode(): StageMode
  /** Show the step that holds a panel (data-panel id) and optionally scroll to it. */
  openPanel(id: string, scroll?: boolean): void
  /** "Show me" of the checklist: go to the panel and highlight 3D parts for a few seconds. */
  showStep(panel: string, focus: string[]): void
  startTour(): void
  setProgress(p: ProcedureProgress): void
  schedulePersist(): void
}

/** The 3D scene as the shell sees it. The experiment keeps its own, richer handle for camera presets and the like. */
export interface Stage3DView extends View {
  setVisible(visible: boolean): void
}
/** Result of the lazy import of an experiment's 3D scene. */
export interface Stage3DModule<A> {
  webgl2Available(): boolean
  mount(host: HTMLElement, ctx: ViewContext<A>, opts: { openPanel(panel: string): void; onFail(): void }): Stage3DView
}

export interface TourController {
  start(): void
  shouldAutoStart(flag: TourFlag): boolean
  relabel(): void
  isOpen(): boolean
}

/** Hooks the shell gives to the experiment's tour. */
export interface TourShellHooks {
  begin(): void
  end(): void
  /** Show the lab step that holds a tour target. */
  reveal(id: string): void
}

export interface ShellConfig<A extends EventSource<E>, E> {
  /** The experiment's apparatus, already restored from storage. */
  apparatus: A
  /** Per-experiment storage (`mecanica:<id>:...`); the shell keeps the step and the stage mode in it. */
  store: ExperimentStore
  strings: Strings<ShellStrings>
  /** Help pages by language and the link back to the landing page (relative to the experiment page). */
  help: Record<Lang, string>
  landingUrl: string
  /** Number of lab steps (the analysis step can be switched off). */
  stepCount: number
  /** Which lab step holds each panel (data-panel id); 0: always visible. */
  panelStep: Record<string, number>
  /** Views per step pane, in mounting order. */
  slots: readonly ShellSlot<A>[]
  /** The procedure drawer (checklist); built with the shell api because its buttons drive the shell. */
  procedure: (api: ShellApi<A>) => MountView<A>
  /** Optional view under the stage (the timing bar). */
  timingBar?: MountView<A>
  stage: {
    mount2d: MountView<A>
    load3d: () => Promise<Stage3DModule<A>>
  }
  /** Text of a refused action for the toast (null: the event is not a refusal; the shell persists instead). */
  refusalText(e: E, lang: Lang): string | null
  /** Called when the student confirms "start over": clear the saved state and return the apparatus to its empty state. */
  reset(): void
  /** Save the apparatus (debounced after changes, and on pagehide). Not called while `persist` is false. */
  save(): void
  /** False for dev-only demo states that must never be saved. Default true. */
  persist?: boolean
  /** Called when the active step changes (not on the first paint). */
  onStepChanged?(step: number): void
  /** Tour: how to build it and which lab step holds each target. */
  tour: {
    mount(ctx: ViewContext<A>, hooks: TourShellHooks): TourController
    stepOf: Record<string, number>
  }
  coach: (ctx: ViewContext<A>) => { relabel(): void; destroy(): void }
  /** Parsed URL options; default: read from location.search. */
  params?: ShellParams
}

export interface Shell<A> extends ShellApi<A> {
  relabelAll(): void
}
