// Language choice shared by every page. UI strings live next to each view in `{ es, en }` pairs with identical keys.
import { LANG_KEY } from './persist.ts'

export type Lang = 'es' | 'en'

/** Language: ?lang= override first, then localStorage, then Spanish. */
export function loadLang(): Lang {
  try {
    const q = new URLSearchParams(globalThis.location?.search ?? '').get('lang')
    if (q === 'es' || q === 'en') return q
  } catch { /* no location: ignore */ }
  try {
    const v = localStorage.getItem(LANG_KEY)
    if (v === 'es' || v === 'en') return v
  } catch { /* storage blocked: fall back to Spanish */ }
  return 'es'
}
export function saveLang(lang: Lang): void {
  try { localStorage.setItem(LANG_KEY, lang) } catch { /* ignore */ }
}
