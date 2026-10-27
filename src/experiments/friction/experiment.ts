// Manifest of the friction experiment (data only: see ../manifest.ts). Status 'ready': page rozamiento/index.html.
import type { ExperimentManifest } from '../manifest.ts'

export const manifest: ExperimentManifest = {
  id: 'friction',
  slug: 'rozamiento',
  guide: 'Práctica 4',
  title: { es: 'Fuerza de rozamiento', en: 'Friction force' },
  summary: {
    es: 'Rozamiento estático y cinético: un taco sobre papel jalado con dinamómetros y barras que deslizan por un riel inclinado.',
    en: 'Static and kinetic friction: a block on paper pulled with spring scales and bars sliding down a raised rail.',
  },
  page: 'rozamiento/index.html',
  help: { es: 'rozamiento/help/index.html', en: 'rozamiento/help/en.html' },
  thumb: 'block',
  status: 'ready',
}
