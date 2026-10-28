// Persistence of the Practica 4 apparatus snapshot (keys `mecanica:friction:*`). Every access is guarded.
import { createExperimentStore } from '../../core/persist.ts'
import { createTaskTracker } from '../../core/theory.ts'
import type { ApparatusSnapshot } from './apparatus/index.ts'

export const store = createExperimentStore('friction')
/** Ticks of the analysis tasks and the theory-unlocked flag (`mecanica:friction:tasks`, `mecanica:friction:theoryUnlocked`). */
export const tasks = createTaskTracker(store)

const isSnapshot = (v: unknown): v is ApparatusSnapshot => !!v && (v as { version?: unknown }).version === 1

export function loadSnapshot(): ApparatusSnapshot | null { return store.loadJson('state', isSnapshot) }
export function saveSnapshot(s: ApparatusSnapshot): void { store.saveJson('state', s) }
export function clearSnapshot(): void { store.set('state', null) }

// ---- analysis panel: literature values and citations typed by the student, and free-text answers per task ------------------------
export interface LitEntry { value: string; source: string }
const isLit = (v: unknown): v is Record<string, LitEntry> =>
  !!v && typeof v === 'object' && !Array.isArray(v) && Object.values(v as Record<string, unknown>).every((x) => !!x && typeof (x as LitEntry).value === 'string' && typeof (x as LitEntry).source === 'string')
export const loadLiterature = (): Record<string, LitEntry> => store.loadJson('analysis-lit', isLit) ?? {}
export const saveLiterature = (l: Record<string, LitEntry>): void => {
  const clean = Object.fromEntries(Object.entries(l).filter(([, v]) => v.value.trim() !== '' || v.source.trim() !== ''))
  if (Object.keys(clean).length === 0) store.set('analysis-lit', null)
  else store.saveJson('analysis-lit', clean)
}
const isNotes = (v: unknown): v is Record<string, string> =>
  !!v && typeof v === 'object' && !Array.isArray(v) && Object.values(v as Record<string, unknown>).every((x) => typeof x === 'string')
export const loadNotes = (): Record<string, string> => store.loadJson('analysis-notes', isNotes) ?? {}
export const saveNotes = (n: Record<string, string>): void => {
  const clean = Object.fromEntries(Object.entries(n).filter(([, v]) => v.trim() !== ''))
  if (Object.keys(clean).length === 0) store.set('analysis-notes', null)
  else store.saveJson('analysis-notes', clean)
}
export function clearAnalysisState(): void { store.set('analysis-lit', null); store.set('analysis-notes', null) }
