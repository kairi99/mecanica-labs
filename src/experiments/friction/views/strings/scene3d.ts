import type { Strings } from '../view.ts'

export const PRESETS = ['overview', 'scale', 'rail', 'tape'] as const
export type PresetName = (typeof PRESETS)[number]

export interface SceneStrings {
  canvasLabel: string
  figure: string
  loading: string
  viewMenu: string
  presetsLabel: string
  presets: Record<PresetName, string>
  openPanel: string
  close: string
}

export const strings: Strings<SceneStrings> = {
  es: {
    canvasLabel: 'Escena 3D de la mesa: el taco sobre el papel jalado por el dinamómetro, y el riel inclinado con la barra. Arrastra para girar, rueda para acercar.',
    figure: 'Escenario 3D del laboratorio',
    loading: 'Cargando la vista 3D…',
    viewMenu: 'Vista',
    presetsLabel: 'Vistas de la cámara',
    presets: { overview: 'Vista general', scale: 'Dinamómetro y taco', rail: 'Riel de lado', tape: 'Cinta en la sujeción' },
    openPanel: 'Abrir el panel',
    close: 'Cerrar',
  },
  en: {
    canvasLabel: '3D scene of the bench: the block on the paper pulled by the spring scale, and the raised rail with the bar. Drag to rotate, scroll to zoom.',
    figure: '3D lab stage',
    loading: 'Loading the 3D view…',
    viewMenu: 'View',
    presetsLabel: 'Camera views',
    presets: { overview: 'Overview', scale: 'Spring scale and block', rail: 'Rail from the side', tape: 'Tape at the clamp' },
    openPanel: 'Open the panel',
    close: 'Close',
  },
}
