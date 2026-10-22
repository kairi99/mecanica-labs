// UI strings, Spanish (default) and English. Views never hard-code user-facing text.
const es = {
  title: 'MRUV — DigiCart en plano inclinado',
  subtitle: 'Laboratorio virtual de la Práctica 1 de Mecánica Newtoniana',
  language: 'Idioma',
  theme: 'Tema',
  themes: { auto: 'Auto', light: 'Claro', dark: 'Oscuro' },
  placeholder: 'Estamos preparando el laboratorio. Pronto podrás armar la pista, medir tiempos y analizar tus datos.',
  credits: 'Basado en la guía de laboratorio de la EPN. Proyecto independiente, sin afiliación con la EPN ni con PHYWE.',
  regionMain: 'Laboratorio',
}
type Dict = typeof es
const en: Dict = {
  title: 'MRUV — DigiCart on an inclined plane',
  subtitle: 'Virtual lab for Practice 1 of Newtonian Mechanics',
  language: 'Language',
  theme: 'Theme',
  themes: { auto: 'Auto', light: 'Light', dark: 'Dark' },
  placeholder: 'The lab is being prepared. Soon you will assemble the track, measure times and analyse your data.',
  credits: 'Based on the EPN lab guide. Independent project, not affiliated with EPN or PHYWE.',
  regionMain: 'Lab',
}

export type Lang = 'es' | 'en'
export const dictionaries: Record<Lang, Dict> = { es, en }

const KEY = 'digicart-lang'
/** Language: ?lang= override first, then localStorage, then Spanish. */
export function loadLang(): Lang {
  try {
    const q = new URLSearchParams(globalThis.location?.search ?? '').get('lang')
    if (q === 'es' || q === 'en') return q
  } catch { /* no location: ignore */ }
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'es' || v === 'en') return v
  } catch { /* storage blocked: fall back to Spanish */ }
  return 'es'
}
export function saveLang(lang: Lang): void {
  try { localStorage.setItem(KEY, lang) } catch { /* ignore */ }
}
export function t(lang: Lang): Dict { return dictionaries[lang] }
