import type { Strings } from '../view.ts'

export interface Side2dStrings {
  aria: string
  table: string
  rail: string
  hand: string
  block: string
  paperLabel: string
  note: string
  legendBlock: string
  legendRail: string
}

export const strings: Strings<Side2dStrings> = {
  es: {
    aria: 'Vista lateral 2D: arriba el taco jalado por el dinamómetro sobre el papel; abajo el riel inclinado con la barra y el soporte con cremallera',
    table: 'Mesa y papel', rail: 'Riel', hand: 'mano', block: 'taco', paperLabel: 'papel',
    note: 'Vista simplificada: se dibuja el estado del simulador. La aguja del dinamómetro está en el panel del paso.',
    legendBlock: 'Arriba: el taco, las masas y el dinamómetro estirado (el resorte se alarga cuando el taco no se mueve).',
    legendRail: 'Abajo: el riel con la barra, la marca de salida y la de llegada, y el soporte que lo levanta.',
  },
  en: {
    aria: '2D side view: on top the block pulled by the spring scale over the paper; below the raised rail with the bar and the rack-and-pinion stand',
    table: 'Table and paper', rail: 'Rail', hand: 'hand', block: 'block', paperLabel: 'paper',
    note: 'Simplified view: it draws the simulator\'s state. The spring scale\'s needle is in the step panel.',
    legendBlock: 'Top: the block, the masses and the stretched spring scale (the spring lengthens while the block does not move).',
    legendRail: 'Bottom: the rail with the bar, the start and finish marks, and the stand that raises it.',
  },
}
