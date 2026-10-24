import type { ItemId, JointId, MissingReason } from '../../apparatus/index.ts'
import type { Strings } from '../view.ts'

export interface InventoryStrings {
  title: string
  summary: string
  putAll: string
  removeAll: string
  onTable: string
  inBox: string
  attached: string
  add: string
  remove: string
  addAria: string
  removeAria: string
  screwsLeft: string
  screwsInUse: string
  genericItem: string
  items: Record<ItemId, string>
  /** Name with article, used inside sentences ("Primero pon la riel sobre la mesa"). */
  itemShort: Record<ItemId, string>
  jointsTitle: string
  jointsIntro: string
  joints: Record<JointId, { name: string; todo: string; done: string; doIt: string; undo: string }>
  missingTitle: string
  missingNone: string
  missingItem: string
  missingJoint: string
  missingReasons: Record<MissingReason, string>
  blocksRun: string
}

export const strings: Strings<InventoryStrings> = {
  es: {
    title: 'Inventario y montaje',
    summary: '{n} de {total} elementos sobre la mesa',
    putAll: 'Poner todo', removeAll: 'Retirar todo',
    onTable: 'En la mesa', inBox: 'En la caja', attached: 'Fijado',
    add: 'Poner', remove: 'Retirar',
    addAria: 'Poner {x} sobre la mesa', removeAria: 'Retirar {x} de la mesa',
    screwsLeft: 'Tornillos libres: {n}.',
    screwsInUse: 'Sujetan la riel: suelta las conexiones para recuperarlos.',
    genericItem: 'ese elemento',
    items: {
      rail: 'Riel metálica (1,2 m)', rackStand: 'Soporte con cremallera', base: 'Base del soporte', twoLeg: 'Soporte de dos patas',
      screws: 'Tornillos', level: 'Nivelador', marble: 'Canica', pingPong: 'Pelota de ping-pong', tapeMeasure: 'Cinta métrica',
      stopwatch: 'Cronómetro', bondPaper: 'Papel bond (2 hojas)', carbonPaper: 'Papel carbón',
    },
    itemShort: {
      rail: 'la riel', rackStand: 'el soporte con cremallera', base: 'la base del soporte', twoLeg: 'el soporte de dos patas',
      screws: 'los tornillos', level: 'el nivelador', marble: 'la canica', pingPong: 'la pelota de ping-pong', tapeMeasure: 'la cinta métrica',
      stopwatch: 'el cronómetro', bondPaper: 'el papel bond', carbonPaper: 'el papel carbón',
    },
    jointsTitle: 'Uniones',
    jointsIntro: 'La riel queda sujeta en la pinza del soporte con cremallera (extremo alto) y apoyada en el soporte de dos patas, cerca del extremo bajo.',
    joints: {
      standBase: { name: 'Soporte sobre su base', todo: 'Pendiente', done: 'Hecho', doIt: 'Montar el soporte en la base', undo: 'Desmontar' },
      rackClamp: { name: 'Riel en la pinza del soporte con cremallera', todo: 'Pendiente', done: 'Hecho', doIt: 'Fijar la riel a la pinza', undo: 'Soltar la riel' },
      twoLegStand: { name: 'Riel sobre el soporte de dos patas', todo: 'Pendiente', done: 'Hecho', doIt: 'Fijar el soporte de dos patas', undo: 'Soltar el soporte' },
    },
    missingTitle: 'Qué falta',
    missingNone: 'Todo está sobre la mesa y unido.',
    missingItem: 'Falta poner {x}.',
    missingJoint: 'Falta la unión: {x}.',
    missingReasons: {
      notOnTable: 'no está sobre la mesa', needsStandBase: 'antes monta el soporte en la base',
      needsRackClamp: 'antes fija la riel a la pinza', notAttached: 'sin hacer',
    },
    blocksRun: 'necesario para lanzar',
  },
  en: {
    title: 'Inventory and assembly',
    summary: '{n} of {total} items on the table',
    putAll: 'Put everything', removeAll: 'Remove everything',
    onTable: 'On the table', inBox: 'In the box', attached: 'Fixed',
    add: 'Put', remove: 'Remove',
    addAria: 'Put {x} on the table', removeAria: 'Remove {x} from the table',
    screwsLeft: 'Free screws: {n}.',
    screwsInUse: 'They hold the rail: undo the connections to get them back.',
    genericItem: 'that item',
    items: {
      rail: 'Metal rail (1.2 m)', rackStand: 'Rack-and-pinion stand', base: 'Stand base', twoLeg: 'Two-leg stand',
      screws: 'Screws', level: 'Level', marble: 'Marble', pingPong: 'Ping-pong ball', tapeMeasure: 'Tape measure',
      stopwatch: 'Stopwatch', bondPaper: 'Bond paper (2 sheets)', carbonPaper: 'Carbon paper',
    },
    itemShort: {
      rail: 'the rail', rackStand: 'the rack-and-pinion stand', base: 'the stand base', twoLeg: 'the two-leg stand',
      screws: 'the screws', level: 'the level', marble: 'the marble', pingPong: 'the ping-pong ball', tapeMeasure: 'the tape measure',
      stopwatch: 'the stopwatch', bondPaper: 'the bond paper', carbonPaper: 'the carbon paper',
    },
    jointsTitle: 'Joints',
    jointsIntro: 'The rail is held in the clamp of the rack-and-pinion stand (high end) and rests on the two-leg stand near the low end.',
    joints: {
      standBase: { name: 'Stand on its base', todo: 'To do', done: 'Done', doIt: 'Mount the stand on the base', undo: 'Dismount' },
      rackClamp: { name: 'Rail in the rack-stand clamp', todo: 'To do', done: 'Done', doIt: 'Fasten the rail to the clamp', undo: 'Release the rail' },
      twoLegStand: { name: 'Rail on the two-leg stand', todo: 'To do', done: 'Done', doIt: 'Fasten the two-leg stand', undo: 'Release the stand' },
    },
    missingTitle: "What's missing",
    missingNone: 'Everything is on the table and joined.',
    missingItem: 'Still to put: {x}.',
    missingJoint: 'Joint still to make: {x}.',
    missingReasons: {
      notOnTable: 'not on the table', needsStandBase: 'first mount the stand on its base',
      needsRackClamp: 'first fasten the rail to the clamp', notAttached: 'not made',
    },
    blocksRun: 'needed to launch',
  },
}
