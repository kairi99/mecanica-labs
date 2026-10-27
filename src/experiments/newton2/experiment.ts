// Manifest of the force-acceleration experiment (data only: see ../manifest.ts).
// Status 'soon' (the manifest type has no 'planned'): listed but not built until the views exist (phase 2). Not in the registry yet.
import type { ExperimentManifest } from '../manifest.ts'

export const manifest: ExperimentManifest = {
  id: 'newton2',
  slug: 'segunda-ley',
  guide: 'Práctica 3',
  title: { es: 'Relación fuerza–aceleración', en: 'Force and acceleration' },
  summary: {
    es: 'Un DigiCart en una riel nivelada es jalado por un contenedor colgante: mide la fuerza y la aceleración y comprueba la segunda ley de Newton.',
    en: 'A DigiCart on a levelled rail is pulled by a hanging canister: measure the force and the acceleration and test Newton’s second law.',
  },
  page: 'segunda-ley/index.html',
  help: { es: 'segunda-ley/help/index.html', en: 'segunda-ley/help/en.html' },
  thumb: 'pulley',
  status: 'soon',
}
