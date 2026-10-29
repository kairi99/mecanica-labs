import type { Strings } from '../view.ts'

export interface Side2dStrings {
  aria: string
  caption: string
  scaleNote: string
  stand: string
  receiver: string
  cart: string
  canister: string
  floor: string
  bench: string
  start: string
  end: string
  masses: string
  noRail: string
  height: string
}

export const strings: Strings<Side2dStrings> = {
  es: {
    aria: 'Vista lateral: la riel sobre la mesa, el DigiCart, el hilo sobre la polea y el contenedor colgando sobre el piso',
    caption: 'Vista lateral 2D',
    scaleNote: 'Esquema a escala (1 mm por unidad). El DigiCart y el contenedor se mueven con el modelo.',
    stand: 'Soporte', receiver: 'Receptor con polea', cart: 'DigiCart', canister: 'Contenedor', floor: 'Piso', bench: 'Mesa',
    start: '0 cm', end: '90 cm', masses: 'masas',
    noRail: 'Falta la riel: ponla desde la bandeja para verla aquí.',
    height: 'h = {h} m',
  },
  en: {
    aria: 'Side view: the rail on the bench, the DigiCart, the string over the pulley and the canister hanging above the floor',
    caption: '2D side view',
    scaleNote: 'Scale drawing (1 mm per unit). The DigiCart and the canister move with the model.',
    stand: 'Stand', receiver: 'Receiver with pulley', cart: 'DigiCart', canister: 'Canister', floor: 'Floor', bench: 'Bench',
    start: '0 cm', end: '90 cm', masses: 'masses',
    noRail: 'The rail is missing: put it from the tray to see it here.',
    height: 'h = {h} m',
  },
}
