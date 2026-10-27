// Strings of the 3D bench scene (overlay and camera presets). es first.
import type { Strings } from '../view.ts'
import type { PresetName } from '../scene3d/units.ts'

export interface Scene3DStrings {
  canvasLabel: string
  figure: string
  loading: string
  presetsLabel: string
  presets: Record<PresetName, string>
  viewMenu: string
  hint: string
}

export const strings: Strings<Scene3DStrings> = {
  es: {
    canvasLabel: 'Mesa de laboratorio en 3D con la riel nivelada, el DigiCart, la polea en el borde, el contenedor colgando y el piso. Con el foco aquí, las flechas orbitan la vista y más y menos acercan. Toca una pieza para abrir su panel.',
    figure: 'Escena 3D de la mesa de laboratorio y el piso',
    loading: 'Cargando la mesa 3D…',
    presetsLabel: 'Vistas de cámara',
    presets: { overview: 'General', start: 'DigiCart e inicio', pulley: 'Polea y contenedor', floor: 'Piso', balance: 'Balanza', scale: 'Dinamómetro' },
    viewMenu: 'Vista',
    hint: 'Toca una pieza para abrir su panel.',
  },
  en: {
    canvasLabel: '3D lab bench with the levelled rail, the DigiCart, the pulley at the edge, the hanging canister and the floor. With focus here, the arrow keys orbit the view and plus and minus zoom. Tap a part to open its panel.',
    figure: '3D scene of the lab bench and the floor',
    loading: 'Loading the 3D bench…',
    presetsLabel: 'Camera views',
    presets: { overview: 'Overview', start: 'DigiCart and start', pulley: 'Pulley and canister', floor: 'Floor', balance: 'Balance', scale: 'Dynamometer' },
    viewMenu: 'View',
    hint: 'Tap a part to open its panel.',
  },
}
