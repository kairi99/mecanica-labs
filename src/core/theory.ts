// "Theory unlocks after the analysis tasks" (classroom aid, no server): pure completion logic, the per-experiment tick store and the
// unlock flag. The help pages (same origin) read the flag from localStorage; a teacher opens them with `?theory=1` instead.
import { experimentKey, storage, type ExperimentStore } from './persist.ts'

/** Event on `window` (same tab) fired whenever the unlock flag changes; other tabs get the native `storage` event. */
export const THEORY_EVENT = 'mecanica:theory'
export const THEORY_PARAM = 'theory'

/** One analysis task of a guide: its id, and the named data it needs (when the app computes its numbers from the table). */
export interface TaskSpec {
  readonly id: string
  readonly needs?: readonly string[]
}

export interface TaskStatus { id: string; ticked: boolean; /** Ticked, but the data the app needs for it are missing. */ dataMissing: boolean; done: boolean }
export interface Completion { done: number; total: number; complete: boolean; tasks: TaskStatus[] }

/**
 * A task is complete when it is ticked AND every named datum it needs is available. `available` maps a datum name to whether
 * the table holds it; a name missing from the map counts as unavailable.
 */
export function taskCompletion(tasks: readonly TaskSpec[], ticks: ReadonlySet<string>, available: Readonly<Record<string, boolean>>): Completion {
  const status: TaskStatus[] = tasks.map((t) => {
    const ticked = ticks.has(t.id)
    const dataMissing = ticked && (t.needs ?? []).some((n) => available[n] !== true)
    return { id: t.id, ticked, dataMissing, done: ticked && !dataMissing }
  })
  const done = status.filter((s) => s.done).length
  return { done, total: tasks.length, complete: tasks.length > 0 && done === tasks.length, tasks: status }
}

/** `?theory=1` (anything but 0 or empty) on the sim or help URL: the teacher override. */
export function theoryOverride(search: string = globalThis.location?.search ?? ''): boolean {
  const v = new URLSearchParams(search).get(THEORY_PARAM)
  return v !== null && v !== '' && v !== '0'
}

export const theoryKey = (id: string): string => experimentKey(id, 'theoryUnlocked')
const TICKS = 'tasks'

/** Whether the help page / button should show the theory: the stored flag or the teacher override. */
export function isTheoryUnlocked(id: string, search?: string): boolean {
  return theoryOverride(search) || storage.get(theoryKey(id)) === '1'
}

/** Add the teacher override to a help link (before any `#anchor`). */
export function helpHref(base: string, override: boolean): string {
  if (!override) return base
  const i = base.indexOf('#')
  const path = i < 0 ? base : base.slice(0, i), hash = i < 0 ? '' : base.slice(i)
  return `${path}${path.includes('?') ? '&' : '?'}${THEORY_PARAM}=1${hash}`
}

export interface TaskTracker {
  has(id: string): boolean
  ticks(): ReadonlySet<string>
  set(id: string, on: boolean): void
  /** "Start over": forget every tick and lock the theory again. */
  clear(): void
  unlocked(): boolean
  setUnlocked(on: boolean): void
  onChange(fn: () => void): () => void
}

export function createTaskTracker(store: ExperimentStore): TaskTracker {
  const load = (): Set<string> => {
    const v = store.loadJson(TICKS, (x): x is string[] => Array.isArray(x) && x.every((s) => typeof s === 'string'))
    return new Set(v ?? [])
  }
  let ticks = load()
  const listeners = new Set<() => void>()
  const emit = (): void => { for (const f of [...listeners]) f() }
  const save = (): void => { if (ticks.size === 0) store.set(TICKS, null); else store.saveJson(TICKS, [...ticks]) }
  const broadcast = (): void => { try { globalThis.window?.dispatchEvent(new Event(THEORY_EVENT)) } catch { /* no window */ } }
  return {
    has: (id) => ticks.has(id),
    ticks: () => ticks,
    set(id, on) {
      if (ticks.has(id) === on) return
      ticks = new Set(ticks)
      if (on) ticks.add(id); else ticks.delete(id)
      save(); emit()
    },
    clear() {
      ticks = new Set()
      save()
      store.set('theoryUnlocked', null)
      broadcast(); emit()
    },
    unlocked: () => store.get('theoryUnlocked') === '1',
    setUnlocked(on) {
      if ((store.get('theoryUnlocked') === '1') === on) return
      store.set('theoryUnlocked', on ? '1' : null)
      broadcast(); emit()
    },
    onChange(fn) { listeners.add(fn); return () => { listeners.delete(fn) } },
  }
}
