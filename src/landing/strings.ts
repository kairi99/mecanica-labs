// Texts of the landing page (Spanish first, English second, identical keys). Experiment titles and summaries live in the manifests.
import type { Strings } from '../core/views/view.ts'

export interface LandingStrings {
  /** Document title. */
  title: string
  brand: string
  heading: string
  subtitle: string
  regionMain: string
  /** "Práctica {n}" */
  guide: string
  open: string
  /** {title} */
  openAria: string
  soon: string
  last: string
  langSwitch: string
  theme: string
  themes: { auto: string; light: string; dark: string }
  credits: string
}

export const strings: Strings<LandingStrings> = {
  es: {
    title: 'Mecánica · Laboratorio virtual',
    brand: 'Mecánica',
    heading: 'Laboratorio virtual de Mecánica Newtoniana',
    subtitle: 'Elige una práctica. Armas el montaje, tomas tus propias medidas y analizas los datos, en el navegador y también en el celular.',
    regionMain: 'Prácticas del laboratorio',
    guide: 'Práctica {n}',
    open: 'Abrir',
    openAria: 'Abrir: {title}',
    soon: 'Próximamente',
    last: 'Último abierto',
    langSwitch: 'Cambiar a inglés',
    theme: 'Tema',
    themes: { auto: 'Automático', light: 'Claro', dark: 'Oscuro' },
    credits: 'Basado en la guía de laboratorio de la EPN. Proyecto independiente y de código abierto, sin afiliación con la EPN ni con PHYWE.',
  },
  en: {
    title: 'Mechanics · Virtual lab',
    brand: 'Mechanics',
    heading: 'Newtonian Mechanics virtual lab',
    subtitle: 'Pick a practice. You assemble the setup, take your own measurements and analyse the data, in the browser and on your phone.',
    regionMain: 'Lab practices',
    guide: 'Practice {n}',
    open: 'Open',
    openAria: 'Open: {title}',
    soon: 'Coming soon',
    last: 'Last opened',
    langSwitch: 'Switch to Spanish',
    theme: 'Theme',
    themes: { auto: 'Automatic', light: 'Light', dark: 'Dark' },
    credits: 'Based on the EPN lab guide. Independent open-source project, not affiliated with EPN or PHYWE.',
  },
}
