// Texts the shell adds around every experiment (the rest comes from the experiment's own shell strings).
import type { Strings } from '../views/view.ts'

export interface CoreShellStrings {
  /** Overflow-menu entry that goes back to the landing page. */
  experiments: string
}

export const strings: Strings<CoreShellStrings> = {
  es: { experiments: 'Experimentos' },
  en: { experiments: 'Experiments' },
}
