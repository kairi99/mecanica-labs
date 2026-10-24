// Manifest of the MRUV experiment (data only: see ../manifest.ts).
import type { ExperimentManifest } from '../manifest.ts'

export const manifest: ExperimentManifest = {
  id: 'mruv',
  slug: 'mruv',
  guide: 'Práctica 1',
  title: { es: 'Movimiento rectilíneo uniformemente variado', en: 'Uniformly accelerated rectilinear motion' },
  summary: {
    es: 'Un DigiCart rueda por una riel inclinada: arma el montaje, cronometra, mide y analiza la aceleración.',
    en: 'A DigiCart rolls down an inclined rail: assemble the setup, time it, measure and analyse the acceleration.',
  },
  page: 'mruv/index.html',
  help: { es: 'mruv/help/index.html', en: 'mruv/help/en.html' },
  thumb: 'incline',
  status: 'ready',
}
