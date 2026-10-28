// Persistence of the Practica 2 apparatus snapshot (keys `mecanica:parabolic:*`). Every access is guarded.
import { createExperimentStore } from '../../core/persist.ts'
import { createTaskTracker } from '../../core/theory.ts'
import type { ApparatusSnapshot } from './apparatus/index.ts'

export const store = createExperimentStore('parabolic')
/** Ticks of the analysis tasks and the theory-unlocked flag (`mecanica:parabolic:tasks`, `mecanica:parabolic:theoryUnlocked`). */
export const tasks = createTaskTracker(store)

const isSnapshot = (v: unknown): v is ApparatusSnapshot => !!v && (v as { version?: unknown }).version === 1

export function loadSnapshot(): ApparatusSnapshot | null { return store.loadJson('state', isSnapshot) }
export function saveSnapshot(s: ApparatusSnapshot): void { store.saveJson('state', s) }
export function clearSnapshot(): void { store.set('state', null) }

// ---- analysis panel: the launch height typed from the tape (cm text) and the free-text answers per task ------------------------
export const loadHeightText = (): string => store.get('analysis-H') ?? ''
export const saveHeightText = (t: string): void => store.set('analysis-H', t === '' ? null : t)

const isNotes = (v: unknown): v is Record<string, string> =>
  !!v && typeof v === 'object' && !Array.isArray(v) && Object.values(v as Record<string, unknown>).every((x) => typeof x === 'string')
export const loadNotes = (): Record<string, string> => store.loadJson('analysis-notes', isNotes) ?? {}
export const saveNotes = (n: Record<string, string>): void => {
  const clean = Object.fromEntries(Object.entries(n).filter(([, v]) => v.trim() !== ''))
  if (Object.keys(clean).length === 0) store.set('analysis-notes', null)
  else store.saveJson('analysis-notes', clean)
}
export function clearAnalysisState(): void { store.set('analysis-H', null); store.set('analysis-notes', null) }
