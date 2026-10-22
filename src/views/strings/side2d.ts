import type { Strings } from '../view.ts'

export interface Side2dStrings {
  aria: string
  caption: string
  scaleNote: string
  rack: string
  twoLeg: string
  receiver: string
  cart: string
  base: string
  level: string
  theta: string
  highEnd: string
  lowEnd: string
  release: string
  returnStart: string
  start: string
  stop: string
  reset: string
  watch: string
  keys: string
  scaleCm: string
}

export const strings: Strings<Side2dStrings> = {
  es: {
    aria: 'Vista lateral de la pista: riel sobre sus soportes, DigiCart y marcas',
    caption: 'Vista lateral 2D',
    scaleNote: 'Esquema: la escala vertical está ampliada ×1,4 para que se vea la pendiente.',
    rack: 'Soporte con cremallera',
    twoLeg: 'Soporte de dos patas',
    receiver: 'Receptor con polea',
    cart: 'DigiCart',
    base: 'Base',
    level: 'Nivelador',
    theta: 'θ',
    highEnd: 'Extremo alto',
    lowEnd: 'Extremo bajo',
    release: 'Soltar el DigiCart',
    returnStart: 'Devolver al inicio',
    start: 'Iniciar', stop: 'Detener', reset: 'Reiniciar',
    watch: 'Cronómetro',
    keys: 'Espacio: iniciar o detener · R: reiniciar · S: soltar',
    scaleCm: 'Escala de la riel (cm)',
  },
  en: {
    aria: 'Side view of the track: rail on its stands, DigiCart and marks',
    caption: '2D side view',
    scaleNote: 'Sketch: the vertical scale is stretched ×1.4 so the slope is visible.',
    rack: 'Rack stand',
    twoLeg: 'Two-leg stand',
    receiver: 'Receiver with pulley',
    cart: 'DigiCart',
    base: 'Base',
    level: 'Level',
    theta: 'θ',
    highEnd: 'High end',
    lowEnd: 'Low end',
    release: 'Release the DigiCart',
    returnStart: 'Bring back to the start',
    start: 'Start', stop: 'Stop', reset: 'Reset',
    watch: 'Stopwatch',
    keys: 'Space: start or stop · R: reset · S: release',
    scaleCm: 'Rail scale (cm)',
  },
}
