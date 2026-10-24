// Manifest of the projectile-motion experiment (data only: see ../manifest.ts). Status 'ready': page parabolico/index.html.
import type { ExperimentManifest } from '../manifest.ts'

export const manifest: ExperimentManifest = {
  id: 'parabolic',
  slug: 'parabolico',
  guide: 'Práctica 2',
  title: { es: 'Movimiento parabólico', en: 'Projectile motion' },
  summary: {
    es: 'Lanzamiento horizontal de una canica y de una pelota de ping-pong desde el borde de la mesa.',
    en: 'Horizontal launch of a marble and a ping-pong ball from the edge of the table.',
  },
  page: 'parabolico/index.html',
  help: { es: 'parabolico/help/index.html', en: 'parabolico/help/en.html' },
  thumb: 'arc',
  status: 'ready',
}
