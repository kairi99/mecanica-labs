import type { Strings } from '../view.ts'

export interface AdjustStrings {
  title: string
  rackTitle: string
  rackLabel: string
  rackReading: string
  rackNeed: string
  footTitle: string
  footLabel: string
  footReading: string
  footNeed: string
  fine: string
  coarse: string
  up: string
  down: string
  levelTitle: string
  levelNeed: string
  levelOnRail: string
  levelOnTable: string
  levelAway: string
  levelGroup: string
  bubbleCentered: string
  bubbleHigh: string
  bubbleLow: string
  bubbleSaturated: string
  levelIdle: string
  levelHelp: string
  vialAria: string
  highEnd: string
  lowEnd: string
  markTitle: string
  markSummaryNone: string
  markSummaryOne: string
  markSummary: string
  markEdit: string
  markDone: string
  markEditAria: string
  markNeed: string
  markPos: string
  markUnit: string
  markPlace: string
  nudge: string
  markList: string
  markNone: string
  markA: string
  markRel: string
  markMove: string
  markRemove: string
  markClear: string
  markFromA: string
  cartTitle: string
  cartNeed: string
  cartAtMark: string
  cartAtMarkBtn: string
  cartAtPos: string
  cartAtPosBtn: string
  cartReset: string
  cartPhaseUnplaced: string
  cartPhaseAtStart: string
  cartPhaseRolling: string
  cartPhaseStopped: string
  cartPhaseStuck: string
  cartPhaseFalling: string
  cartPhaseFallenTable: string
  cartPhaseFallenFloor: string
  cartFront: string
  cartFrontHint: string
  noMarks: string
}

export const strings: Strings<AdjustStrings> = {
  es: {
    title: 'Ajustes',
    rackTitle: 'Altura del soporte con cremallera',
    rackLabel: 'Altura de la pinza (escala del soporte)',
    rackReading: 'Escala del soporte: {n} mm',
    rackNeed: 'Pon el soporte con cremallera sobre la mesa para ajustar su altura.',
    footTitle: 'Pie de tornillo del soporte de dos patas',
    footLabel: 'Altura del pie (ajuste fino)',
    footReading: 'Pie: {n} mm',
    footNeed: 'Pon el soporte de dos patas sobre la mesa para ajustar su pie.',
    fine: 'Ajuste fino', coarse: 'Ajuste grueso', up: 'Subir {n} mm', down: 'Bajar {n} mm',
    levelTitle: 'Nivelador',
    levelNeed: 'El nivelador no está sobre la mesa: arrástralo desde la bandeja de piezas.',
    levelOnRail: 'En la riel', levelOnTable: 'En la mesa', levelAway: 'Retirar',
    levelGroup: 'Dónde apoyas el nivelador',
    bubbleCentered: 'Burbuja centrada entre las marcas: horizontal.',
    bubbleHigh: 'Burbuja desplazada hacia el extremo alto: el extremo bajo está más bajo.',
    bubbleLow: 'Burbuja desplazada hacia el extremo bajo: el extremo bajo está más alto.',
    bubbleSaturated: ' La burbuja llegó al final del tubo.',
    levelIdle: 'El nivelador está guardado.',
    levelHelp: 'Con la riel nivelada (soporte en 0 mm), la burbuja queda entre las dos marcas. Nivela antes de subir el soporte.',
    vialAria: 'Tubo del nivelador con la burbuja',
    highEnd: 'extremo alto', lowEnd: 'extremo bajo',
    markTitle: 'Marcas en la riel',
    markSummaryNone: 'Sin marcas todavía', markSummaryOne: '1 marca puesta', markSummary: '{n} marcas puestas',
    markEdit: 'Editar', markDone: 'Listo', markEditAria: 'Editar las marcas de la riel',
    markNeed: 'Necesitas la riel y los marcadores sobre la mesa.',
    markPos: 'Posición en la escala de la riel',
    markUnit: 'mm',
    markPlace: 'Poner marca', nudge: 'Mover {n} mm',
    markList: 'Marcas puestas',
    markNone: 'Todavía no hay marcas. La guía pide marcas cada 10 cm desde A, la más alta, hasta al menos 90 cm.',
    markA: 'A (0 cm)', markRel: 'A + {n} cm',
    markMove: 'Posición de la marca {n} (mm)', markRemove: 'Quitar la marca {n}',
    markClear: 'Quitar todas',
    markFromA: 'Las marcas se nombran con respecto a A, la marca más alta de la pendiente.',
    cartTitle: 'DigiCart',
    cartNeed: 'Pon el DigiCart sobre la mesa y fija la riel a la pinza para poder colocarlo.',
    cartAtMark: 'Poner el frente en una marca',
    cartAtMarkBtn: 'Colocar en la marca',
    cartAtPos: 'Poner el frente en una posición (mm)',
    cartAtPosBtn: 'Colocar',
    cartReset: 'Devolver al inicio',
    cartPhaseUnplaced: 'Sin colocar en la riel.',
    cartPhaseAtStart: 'En reposo, listo para soltar.',
    cartPhaseRolling: 'Rodando.',
    cartPhaseStopped: 'Detenido en el receptor. Devuélvelo al inicio para otra repetición.',
    cartPhaseStuck: 'Detenido sobre la riel (no avanza).',
    cartPhaseFalling: 'El DigiCart salió de la riel y está cayendo.',
    cartPhaseFallenTable: 'El DigiCart cayó sobre la mesa. Levántalo y vuelve a ponerlo en la riel.',
    cartPhaseFallenFloor: 'El DigiCart cayó de la mesa al piso. Levántalo y vuelve a ponerlo en la riel.',
    cartFront: 'La referencia es el frente del carro.',
    cartFrontHint: 'Escala en mm de la riel',
    noMarks: 'Sin marcas',
  },
  en: {
    title: 'Adjustments',
    rackTitle: 'Rack-stand height',
    rackLabel: 'Clamp height (stand scale)',
    rackReading: 'Stand scale: {n} mm',
    rackNeed: 'Put the rack stand on the table to adjust its height.',
    footTitle: 'Screw foot of the two-leg stand',
    footLabel: 'Foot height (fine adjustment)',
    footReading: 'Foot: {n} mm',
    footNeed: 'Put the two-leg stand on the table to adjust its foot.',
    fine: 'Fine adjustment', coarse: 'Coarse adjustment', up: 'Raise {n} mm', down: 'Lower {n} mm',
    levelTitle: 'Level',
    levelNeed: 'The level is not on the table: drag it from the parts tray.',
    levelOnRail: 'On the rail', levelOnTable: 'On the table', levelAway: 'Remove',
    levelGroup: 'Where you rest the level',
    bubbleCentered: 'Bubble centred between the marks: level.',
    bubbleHigh: 'Bubble shifted toward the high end: the low end sits lower.',
    bubbleLow: 'Bubble shifted toward the low end: the low end sits higher.',
    bubbleSaturated: ' The bubble reached the end of the tube.',
    levelIdle: 'The level is put away.',
    levelHelp: 'With the rail levelled (stand at 0 mm) the bubble sits between the two marks. Level before raising the stand.',
    vialAria: 'Level vial with the bubble',
    highEnd: 'high end', lowEnd: 'low end',
    markTitle: 'Marks on the rail',
    markSummaryNone: 'No marks yet', markSummaryOne: '1 mark placed', markSummary: '{n} marks placed',
    markEdit: 'Edit', markDone: 'Done', markEditAria: 'Edit the marks on the rail',
    markNeed: 'You need the rail and the markers on the table.',
    markPos: 'Position on the rail scale',
    markUnit: 'mm',
    markPlace: 'Place mark', nudge: 'Move {n} mm',
    markList: 'Marks in place',
    markNone: 'No marks yet. The guide asks for marks every 10 cm from A, the highest one, to at least 90 cm.',
    markA: 'A (0 cm)', markRel: 'A + {n} cm',
    markMove: 'Position of mark {n} (mm)', markRemove: 'Remove mark {n}',
    markClear: 'Remove all',
    markFromA: 'Marks are named relative to A, the highest mark on the slope.',
    cartTitle: 'DigiCart',
    cartNeed: 'Put the DigiCart on the table and fasten the rail to the clamp to place it.',
    cartAtMark: 'Put the front on a mark',
    cartAtMarkBtn: 'Place at the mark',
    cartAtPos: 'Put the front at a position (mm)',
    cartAtPosBtn: 'Place',
    cartReset: 'Bring back to the start',
    cartPhaseUnplaced: 'Not on the rail.',
    cartPhaseAtStart: 'At rest, ready to release.',
    cartPhaseRolling: 'Rolling.',
    cartPhaseStopped: 'Stopped at the receiver. Bring it back to the start for another run.',
    cartPhaseStuck: 'Stopped on the rail (it does not advance).',
    cartPhaseFalling: 'The DigiCart left the rail and is falling.',
    cartPhaseFallenTable: 'The DigiCart fell onto the table. Pick it up and put it back on the rail.',
    cartPhaseFallenFloor: 'The DigiCart fell off the table onto the floor. Pick it up and put it back on the rail.',
    cartFront: 'The reference is the front of the cart.',
    cartFrontHint: 'Rail scale in mm',
    noMarks: 'No marks',
  },
}
