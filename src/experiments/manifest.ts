// What the landing page and the build need to know about an experiment. Manifests are plain data: importing one never
// pulls in the experiment's code, so the landing bundle stays tiny.
import type { Strings } from '../core/views/view.ts'

export type ExperimentStatus = 'ready' | 'soon'

export interface ExperimentManifest {
  /** Stable id: storage keys (`mecanica:<id>:...`), `?exp=<id>` and `mecanica:last`. */
  id: string
  /** Folder of the page in the built site (`<slug>/index.html`). */
  slug: string
  /** Number of the lab guide this experiment follows, for example 'Práctica 1' (the landing page translates the word). */
  guide: string
  title: Strings<string>
  /** One line shown on the landing card. */
  summary: Strings<string>
  /** Experiment page and help pages, relative to the site root. */
  page: string
  help: { es: string; en: string }
  /** 'soon': listed on the landing page but not clickable and not built. */
  status: ExperimentStatus
}
