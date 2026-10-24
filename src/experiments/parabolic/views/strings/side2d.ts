import type { Strings } from '../view.ts'

export interface Side2dStrings {
  aria: string
  caption: string
  scaleNote: string
  rack: string
  twoLeg: string
  base: string
  rail: string
  table: string
  floor: string
  edge: string
  marble: string
  pingPong: string
  bond: string
  carbon: string
  carbonMark: string
  tapeLegend: string
  level: string
  trail: string
  plumb: string
  /** Shorter labels for the 2D view on narrow screens, where the full ones would run into each other. */
  short: { rack: string; twoLeg: string; edge: string; table: string }
}

export const strings: Strings<Side2dStrings> = {
  es: {
    aria: 'Vista lateral de la mesa: riel inclinada, borde de la mesa, trayectoria de la bola y papel en el piso',
    caption: 'Vista lateral 2D',
    scaleNote: 'Esquema a escala; la bola se dibuja más grande para que se vea.',
    rack: 'Soporte con cremallera',
    twoLeg: 'Soporte de dos patas',
    base: 'Base',
    rail: 'Riel',
    table: 'Mesa',
    floor: 'Piso',
    edge: 'Borde de la mesa',
    marble: 'Canica',
    pingPong: 'Pelota de ping-pong',
    bond: 'Papel bond',
    carbon: 'Papel carbón',
    carbonMark: 'Marca de carbón',
    tapeLegend: 'Cinta: distancia a la punta (cm)',
    level: 'Nivelador',
    trail: 'Última trayectoria',
    plumb: 'Proyección del borde',
    short: { rack: 'Soporte', twoLeg: 'Dos patas', edge: 'Borde', table: 'Mesa' },
  },
  en: {
    aria: 'Side view of the table: inclined rail, table edge, ball trajectory and paper on the floor',
    caption: '2D side view',
    scaleNote: 'Scale drawing; the ball is drawn larger so it can be seen.',
    rack: 'Rack stand',
    twoLeg: 'Two-leg stand',
    base: 'Base',
    rail: 'Rail',
    table: 'Table',
    floor: 'Floor',
    edge: 'Table edge',
    marble: 'Marble',
    pingPong: 'Ping-pong ball',
    bond: 'Bond paper',
    carbon: 'Carbon paper',
    carbonMark: 'Carbon mark',
    tapeLegend: 'Tape: distance from the tip (cm)',
    level: 'Level',
    trail: 'Last trajectory',
    plumb: 'Edge projection',
    short: { rack: 'Stand', twoLeg: 'Two-leg', edge: 'Edge', table: 'Table' },
  },
}
