import type { Strings } from '../view.ts'

export interface CaliperStrings {
  title: string
  needCaliper: string
  target: string
  tClamp: string
  tTwoLeg: string
  tRailAt: string
  tCart: string
  railPos: string
  measure: string
  close: string
  variant: string
  vernier: string
  digital: string
  zoom: string
  zoomIn: string
  zoomOut: string
  vernierAria: string
  overviewAria: string
  prompt: string
  closedNote: string
  noNumeric: string
  how: string
  howVernier: string[]
  howDigital: string[]
  depth: string
  depthText: string
  lcdAria: string
  power: string
  zero: string
  zeroNote: string
  onOff: string
  measuring: string
  unit: string
}

export const strings: Strings<CaliperStrings> = {
  es: {
    title: 'Pie de rey',
    needCaliper: 'Pon el calibrador sobre la mesa desde el inventario.',
    target: '¿Qué mides?',
    tClamp: 'Altura de la riel en el soporte alto',
    tTwoLeg: 'Altura de la riel en el soporte bajo',
    tRailAt: 'Altura de la riel en una posición',
    tCart: 'Longitud del DigiCart',
    railPos: 'Posición en la escala (mm)',
    measure: 'Medir',
    close: 'Cerrar mordazas',
    variant: 'Tipo de calibrador',
    vernier: 'Vernier', digital: 'Digital',
    zoom: 'Ampliación',
    zoomIn: 'Acercar', zoomOut: 'Alejar',
    vernierAria: 'Escala principal en milímetros y escala vernier de 20 divisiones',
    overviewAria: 'Calibrador con las mordazas abiertas',
    prompt: 'Elige qué medir y pulsa Medir para abrir las mordazas sobre esa pieza.',
    closedNote: 'Mordazas cerradas.',
    noNumeric: 'Lee tú mismo la medida: no hay valor numérico.',
    how: 'Cómo leer',
    howVernier: [
      'Mira dónde queda el cero de la escala vernier sobre la escala principal: los milímetros enteros están a su izquierda.',
      'Busca la línea del vernier que coincide mejor con una línea de la escala principal.',
      'Cada división del vernier vale 0,05 mm. Súmala a los milímetros enteros.',
    ],
    howDigital: [
      'Con las mordazas cerradas pulsa ZERO: la pantalla debe marcar 0,00.',
      'Mide y lee el valor en mm con dos decimales.',
    ],
    depth: 'Varilla de profundidad',
    depthText: 'Para la altura de la riel apoya el cuerpo del calibrador sobre la parte superior de la riel y baja la varilla de profundidad hasta tocar la mesa; la lectura es la altura. Mantén el calibrador vertical.',
    lcdAria: 'Pantalla del calibrador digital, en milímetros',
    power: 'Encendido',
    zero: 'ZERO',
    zeroNote: 'ZERO solo tiene sentido con las mordazas cerradas.',
    onOff: 'ON/OFF',
    measuring: 'Midiendo: {x}',
    unit: 'mm',
  },
  en: {
    title: 'Caliper (pie de rey)',
    needCaliper: 'Put the caliper on the table from the inventory.',
    target: 'What are you measuring?',
    tClamp: 'Rail height at the high stand',
    tTwoLeg: 'Rail height at the low stand',
    tRailAt: 'Rail height at a position',
    tCart: 'DigiCart length',
    railPos: 'Position on the scale (mm)',
    measure: 'Measure',
    close: 'Close the jaws',
    variant: 'Caliper type',
    vernier: 'Vernier', digital: 'Digital',
    zoom: 'Magnification',
    zoomIn: 'Zoom in', zoomOut: 'Zoom out',
    vernierAria: 'Main scale in millimetres and 20-division vernier scale',
    overviewAria: 'Caliper with the jaws open',
    prompt: 'Choose what to measure and press Measure to open the jaws on that part.',
    closedNote: 'Jaws closed.',
    noNumeric: 'Read the measurement yourself: there is no numeric value.',
    how: 'How to read',
    howVernier: [
      'See where the zero of the vernier scale falls on the main scale: the whole millimetres are to its left.',
      'Find the vernier line that best lines up with a line of the main scale.',
      'Each vernier division is worth 0.05 mm. Add it to the whole millimetres.',
    ],
    howDigital: [
      'With the jaws closed press ZERO: the display should read 0.00.',
      'Measure and read the value in mm with two decimals.',
    ],
    depth: 'Depth rod',
    depthText: 'For the rail height rest the caliper body on top of the rail and lower the depth rod until it touches the table; the reading is the height. Keep the caliper vertical.',
    lcdAria: 'Digital caliper display, in millimetres',
    power: 'Power',
    zero: 'ZERO',
    zeroNote: 'ZERO only makes sense with the jaws closed.',
    onOff: 'ON/OFF',
    measuring: 'Measuring: {x}',
    unit: 'mm',
  },
}
