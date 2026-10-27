// Texts the shell adds around every experiment (the rest comes from the experiment's own shell strings).
import type { Strings } from '../views/view.ts'

export interface CoreShellStrings {
  /** Overflow-menu entry that goes back to the landing page. */
  experiments: string
  /** Skip link: the first focusable element, jumps to the main region. */
  skipToMain: string
  /** Close button of the refusal message. */
  dismiss: string
}

export const strings: Strings<CoreShellStrings> = {
  es: { experiments: 'Experimentos', skipToMain: 'Saltar al contenido principal', dismiss: 'Cerrar el mensaje' },
  en: { experiments: 'Experiments', skipToMain: 'Skip to main content', dismiss: 'Close the message' },
}
