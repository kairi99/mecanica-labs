// Text of the placeholder side view (the stage agent's real side2d.ts brings its own strings).
import type { Strings } from '../view.ts'

export interface PlaceholderStrings { side2d: string }

export const strings: Strings<PlaceholderStrings> = {
  es: { side2d: 'Vista lateral 2D: se está preparando.' },
  en: { side2d: '2D side view: coming soon.' },
}
