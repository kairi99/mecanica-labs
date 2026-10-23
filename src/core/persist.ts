// Persistence in localStorage, shared by the landing page and every experiment. Every access is guarded.
// Keys: `mecanica:lang`, `mecanica:theme`, `mecanica:last` (shared) and `mecanica:<id>:<name>` (per experiment).

export const LANG_KEY = 'mecanica:lang'
export const THEME_KEY = 'mecanica:theme'
/** Id of the experiment opened last (the landing page shows it first). */
export const LAST_KEY = 'mecanica:last'
/** Keys of the single-experiment app that preceded the multi-experiment layout (shared ones). */
export const LEGACY_SHARED_KEYS: Readonly<Record<string, string>> = { [LANG_KEY]: 'digicart-lang', [THEME_KEY]: 'digicart-mruv-theme' }

export type Theme = 'auto' | 'light' | 'dark'
export type StageMode = '3d' | '2d'

/** The slice of Storage this module uses (lets tests pass a fake). */
export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export const experimentKey = (id: string, name: string): string => `mecanica:${id}:${name}`

function get(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}
function set(key: string, value: string | null): void {
  try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value) } catch { /* storage blocked or full */ }
}
export const storage = { get, set }

/**
 * One-time copy of values saved under the old key names. `keys` maps each new key to its old key; a new key that is
 * already set is left alone, an old key is never deleted. Returns the new keys that were filled.
 */
export function migrateKeys(keys: Readonly<Record<string, string>>, store: StorageLike | null = defaultStorage()): string[] {
  const copied: string[] = []
  if (!store) return copied
  for (const [next, old] of Object.entries(keys)) {
    try {
      if (store.getItem(next) !== null) continue
      const v = store.getItem(old)
      if (v === null) continue
      store.setItem(next, v)
      copied.push(next)
    } catch { /* storage blocked or full */ }
  }
  return copied
}
function defaultStorage(): StorageLike | null {
  try { return localStorage } catch { return null }
}

export function loadTheme(): Theme {
  const v = get(THEME_KEY)
  return v === 'light' || v === 'dark' ? v : 'auto'
}
export function saveTheme(t: Theme): void { set(THEME_KEY, t === 'auto' ? null : t) }

export function loadLast(): string | null { return get(LAST_KEY) }
export function saveLast(id: string): void { set(LAST_KEY, id) }

/** The per-experiment slice of localStorage: `mecanica:<id>:state|view|step|automark|tour-done`. */
export interface ExperimentStore {
  readonly id: string
  key(name: string): string
  get(name: string): string | null
  set(name: string, value: string | null): void
  loadJson<T>(name: string, accept: (v: unknown) => v is T): T | null
  saveJson(name: string, value: unknown): void
  loadStageMode(): StageMode | null
  saveStageMode(m: StageMode): void
  /** Active lab step (1-based; null: never chosen). */
  loadStep(): number | null
  saveStep(n: number): void
}

export function createExperimentStore(id: string): ExperimentStore {
  const key = (name: string): string => experimentKey(id, name)
  return {
    id,
    key,
    get: (name) => get(key(name)),
    set: (name, value) => set(key(name), value),
    loadJson<T>(name: string, accept: (v: unknown) => v is T): T | null {
      const raw = get(key(name))
      if (!raw) return null
      try {
        const v: unknown = JSON.parse(raw)
        return accept(v) ? v : null
      } catch { return null }
    },
    saveJson(name, value) { try { set(key(name), JSON.stringify(value)) } catch { /* ignore */ } },
    loadStageMode() {
      const v = get(key('view'))
      return v === '2d' || v === '3d' ? v : null
    },
    saveStageMode(m) { set(key('view'), m) },
    loadStep() {
      const n = Number(get(key('step')))
      return Number.isInteger(n) && n >= 1 && n <= 99 ? n : null
    },
    saveStep(n) { set(key('step'), String(n)) },
  }
}
