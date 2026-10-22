// Persistence of the apparatus snapshot and the shell options in localStorage. Every access is guarded.
import type { ApparatusSnapshot } from './apparatus/index.ts'

const STATE_KEY = 'digicart-mruv-state'
const THEME_KEY = 'digicart-mruv-theme'
const VIEW_KEY = 'digicart-mruv-view'
const FOLD_KEY = 'digicart-mruv-fold'

export type Theme = 'auto' | 'light' | 'dark'
export type StageMode = '3d' | '2d'

function get(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}
function set(key: string, value: string | null): void {
  try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value) } catch { /* storage blocked or full */ }
}

export function loadSnapshot(): ApparatusSnapshot | null {
  const raw = get(STATE_KEY)
  if (!raw) return null
  try {
    const s = JSON.parse(raw) as ApparatusSnapshot
    return s && s.version === 1 ? s : null
  } catch { return null }
}
export function saveSnapshot(s: ApparatusSnapshot): void {
  try { set(STATE_KEY, JSON.stringify(s)) } catch { /* ignore */ }
}
export function clearSnapshot(): void { set(STATE_KEY, null) }

export function loadTheme(): Theme {
  const v = get(THEME_KEY)
  return v === 'light' || v === 'dark' ? v : 'auto'
}
export function saveTheme(t: Theme): void { set(THEME_KEY, t === 'auto' ? null : t) }

export function loadStageMode(): StageMode | null {
  const v = get(VIEW_KEY)
  return v === '2d' || v === '3d' ? v : null
}
export function saveStageMode(m: StageMode): void { set(VIEW_KEY, m) }

export function loadFolds(): Record<string, boolean> {
  try { return JSON.parse(get(FOLD_KEY) ?? '{}') as Record<string, boolean> } catch { return {} }
}
export function saveFolds(f: Record<string, boolean>): void { set(FOLD_KEY, JSON.stringify(f)) }
