import type { Strings } from '../view.ts'

export interface TapeStrings {
  title: string
  needTape: string
  target: string
  tLaunchHeight: string
  tGap: string
  tRise: string
  tMark: string
  tRange: string
  balls: { marble: string; pingpong: string }
  measure: string
  zoom: string
  zoomIn: string
  zoomOut: string
  bladeAria: string
  prompt: string
  measuring: string
  noNumeric: string
  tolerance: string
  rangeHint: string
  noMarks: string
  how: string
  howSteps: string[]
}

export const strings: Strings<TapeStrings> = {
  es: {
    title: 'Cinta métrica',
    needTape: 'Falta la cinta métrica: toma la pieza de la bandeja bajo el escenario (paso 1).',
    target: 'Qué medir',
    tLaunchHeight: 'Altura de lanzamiento (del piso a la mesa)',
    tGap: 'Distancia del extremo bajo de la riel al borde',
    tRise: 'Altura de la pinza sobre la mesa',
    tMark: 'Posición de la marca {n} desde el extremo bajo',
    tRange: 'Alcance a la marca de carbón {n} ({ball}, lanzamiento {run})',
    balls: { marble: 'canica', pingpong: 'pelota de ping-pong' },
    measure: 'Medir',
    zoom: 'Zoom',
    zoomIn: 'Acercar', zoomOut: 'Alejar',
    bladeAria: 'Cinta métrica: extremo de lo que mides sobre la escala',
    prompt: 'Elige qué medir y pulsa «Medir». Después lee la cinta.',
    measuring: 'Midiendo: {x}.',
    noNumeric: 'La cinta no te da el número: léelo tú en la escala, milímetro a milímetro.',
    tolerance: 'La cinta es de clase II: puede errar hasta ± {x} mm en esta longitud, además de lo que tú estimes al leer.',
    rangeHint: 'Un alcance se mide desde la proyección del borde hasta el centro de la marca de carbón, con la cinta tendida en el piso. Luego cópialo a la Tabla 2.1.',
    noMarks: 'Todavía no hay marcas de carbón en el papel.',
    how: 'Cómo leer la cinta',
    howSteps: [
      'Mira dónde el borde de lo que mides toca la escala.',
      'Cada rayita fina es 1 mm; la rayita larga es 1 cm y lleva su número.',
      'Anota el valor del milímetro más cercano y pásalo a metros.',
    ],
  },
  en: {
    title: 'Tape measure',
    needTape: 'The tape measure is in the tray: drag it back onto the table (step 1).',
    target: 'What to measure',
    tLaunchHeight: 'Launch height (floor to the table)',
    tGap: 'Distance from the low end of the rail to the edge',
    tRise: 'Height of the clamp above the table',
    tMark: 'Position of mark {n} from the low end',
    tRange: 'Range to carbon mark {n} ({ball}, launch {run})',
    balls: { marble: 'marble', pingpong: 'ping-pong ball' },
    measure: 'Measure',
    zoom: 'Zoom',
    zoomIn: 'Zoom in', zoomOut: 'Zoom out',
    bladeAria: 'Tape measure: end of the thing you measure on the scale',
    prompt: 'Choose what to measure and press "Measure". Then read the tape.',
    measuring: 'Measuring: {x}.',
    noNumeric: 'The tape does not give you the number: read it yourself on the scale, millimetre by millimetre.',
    tolerance: 'The tape is class II: it can be off by up to ± {x} mm at this length, besides what you estimate when reading.',
    rangeHint: 'A range is measured from the edge projection to the centre of the carbon mark, with the tape laid straight on the floor. Then copy it to Table 2.1.',
    noMarks: 'There are no carbon marks on the paper yet.',
    how: 'How to read the tape',
    howSteps: [
      'See where the edge of what you measure meets the scale.',
      'Each thin tick is 1 mm; the long tick is 1 cm and has its number.',
      'Take the nearest millimetre and convert it to metres.',
    ],
  },
}
