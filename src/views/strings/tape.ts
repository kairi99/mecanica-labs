import type { Strings } from '../view.ts'

export interface TapeStrings {
  title: string
  needTape: string
  target: string
  tClamp: string
  tTwoLeg: string
  tRailAt: string
  tCart: string
  tSeparation: string
  railPos: string
  measure: string
  zoom: string
  zoomIn: string
  zoomOut: string
  bladeAria: string
  prompt: string
  noNumeric: string
  how: string
  howSteps: string[]
  technique: string
  techniqueText: string
  tolerance: string
  measuring: string
}

export const strings: Strings<TapeStrings> = {
  es: {
    title: 'Flexómetro',
    needTape: 'Pon el flexómetro sobre la mesa desde el inventario.',
    target: '¿Qué mides?',
    tClamp: 'Altura de la riel en el soporte alto',
    tTwoLeg: 'Altura de la riel en el soporte bajo',
    tRailAt: 'Altura de la riel en una posición',
    tCart: 'Longitud del DigiCart',
    tSeparation: 'Distancia d entre los dos soportes',
    railPos: 'Posición en la escala (mm)',
    measure: 'Medir',
    zoom: 'Ampliación',
    zoomIn: 'Acercar', zoomOut: 'Alejar',
    bladeAria: 'Cinta del flexómetro graduada en milímetros, con números cada centímetro',
    prompt: 'Elige qué medir y pulsa Medir para apoyar el flexómetro en esa pieza.',
    noNumeric: 'Lee tú mismo la medida: no hay valor numérico.',
    how: 'Cómo leer',
    howSteps: [
      'Busca el borde de la pieza sobre la cinta (la zona gris de arriba): ahí termina la medida.',
      'Lee el número de centímetro que queda a su izquierda y cuenta los milímetros hasta el borde.',
      'Cada división vale 1 mm. Anota el valor de la división más cercana (incertidumbre ±0,5 mm).',
    ],
    technique: 'Técnica',
    techniqueText: 'Mantén la cinta vertical y perpendicular a la mesa, tensa y sin torcer. Mira de frente a la marca para evitar el error de paralaje. El gancho del extremo tiene holgura: se desliza el grosor del gancho para compensar si empujas o tiras, así el cero queda bien.',
    tolerance: 'Tolerancia de la cinta (clase II): ±{x} mm.',
    measuring: 'Midiendo: {x}',
  },
  en: {
    title: 'Tape measure',
    needTape: 'Put the tape measure on the table from the inventory.',
    target: 'What are you measuring?',
    tClamp: 'Rail height at the high stand',
    tTwoLeg: 'Rail height at the low stand',
    tRailAt: 'Rail height at a position',
    tCart: 'DigiCart length',
    tSeparation: 'Distance d between the two supports',
    railPos: 'Position on the scale (mm)',
    measure: 'Measure',
    zoom: 'Magnification',
    zoomIn: 'Zoom in', zoomOut: 'Zoom out',
    bladeAria: 'Tape measure blade graduated in millimetres, with numbers every centimetre',
    prompt: 'Choose what to measure and press Measure to hold the tape measure against that part.',
    noNumeric: 'Read the measurement yourself: there is no numeric value.',
    how: 'How to read',
    howSteps: [
      'Find the edge of the part on the blade (the grey zone at the top): the length ends there.',
      'Read the centimetre number to its left and count the millimetres up to the edge.',
      'Each division is 1 mm. Note the value of the nearest division (uncertainty ±0.5 mm).',
    ],
    technique: 'Technique',
    techniqueText: 'Keep the blade vertical and perpendicular to the table, taut and not twisted. Look straight at the mark to avoid parallax. The end hook has play: it slides by its own thickness to compensate whether you push or pull, so the zero stays right.',
    tolerance: 'Tape tolerance (class II): ±{x} mm.',
    measuring: 'Measuring: {x}',
  },
}
