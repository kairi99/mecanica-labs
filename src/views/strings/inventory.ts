import type { ItemId, JointId, MissingReason } from '../../apparatus/index.ts'
import type { Strings } from '../view.ts'

interface ItemText { name: string; hint: string }
export interface InventoryStrings {
  title: string
  genericItem: string
  itemShort: Record<ItemId, string>
  items: Record<ItemId, ItemText>
  onTable: string
  inBox: string
  add: string
  remove: string
  addAria: string
  removeAria: string
  itemsTitle: string
  jointsTitle: string
  jointsIntro: string
  joints: Record<JointId, { name: string; done: string; todo: string }>
  doStandBase: string
  undoStandBase: string
  attachE1: string
  attachE2: string
  hintE1: string
  hintE2: string
  undoClamp: string
  attachTwoLeg: string
  undoTwoLeg: string
  attachReceiver: string
  undoReceiver: string
  highEndIs: string
  screws: string
  caliperVariant: string
  vernier: string
  digital: string
  missingTitle: string
  missingNone: string
  blocksRun: string
  missingItem: string
  missingJoint: string
  missingReasons: Record<MissingReason, string>
  screwsInUse: string
  summary: string
}

export const strings: Strings<InventoryStrings> = {
  es: {
    title: 'Inventario y montaje',
    genericItem: 'el elemento',
    itemShort: {
      rail: 'la riel', cart: 'el DigiCart', rackStand: 'el soporte con cremallera', standBase: 'la base metálica', twoLegStand: 'el soporte de dos patas',
      screws: 'los tornillos', level: 'el nivelador', receiver: 'el receptor del DigiCart', stopwatch: 'el cronómetro', caliper: 'el calibrador', markers: 'los marcadores',
    },
    items: {
      rail: { name: 'Riel metálica de 1,2 m', hint: 'Con escala en milímetros; sus extremos son E1 (0 mm) y E2 (1200 mm).' },
      cart: { name: 'DigiCart', hint: 'El carro con sensor. Nunca debe quedar fuera de la pista.' },
      rackStand: { name: 'Soporte de altura regulable con cremallera', hint: 'Sujeta el extremo alto de la riel; su escala indica la altura de la pinza.' },
      standBase: { name: 'Base metálica del soporte', hint: 'Donde se monta el soporte con cremallera.' },
      twoLegStand: { name: 'Soporte de dos patas', hint: 'Sujeta el extremo bajo; su pie de tornillo permite un ajuste fino.' },
      screws: { name: '6 tornillos', hint: 'Cada conexión de la riel usa 2.' },
      level: { name: 'Nivelador', hint: 'Burbuja para comprobar que la riel está horizontal.' },
      receiver: { name: 'Receptor del DigiCart con polea', hint: 'Va en el extremo bajo y detiene el carro.' },
      stopwatch: { name: 'Cronómetro', hint: 'Digital de mano; lo controlas tú.' },
      caliper: { name: 'Calibrador (pie de rey)', hint: 'Para medir alturas. Elige vernier o digital.' },
      markers: { name: 'Marcadores (cinta)', hint: 'Para señalar las posiciones cada 10 cm.' },
    },
    onTable: 'En la mesa', inBox: 'Guardado',
    add: 'Poner en la mesa', remove: 'Guardar', addAria: 'Poner en la mesa: {x}', removeAria: 'Guardar: {x}',
    itemsTitle: 'Materiales',
    jointsTitle: 'Montaje de la pista',
    jointsIntro: 'Sigue la guía: soporte con cremallera en un extremo; receptor y soporte de dos patas en el otro.',
    joints: {
      standBase: { name: 'Soporte con cremallera sobre su base', done: 'Montado', todo: 'Sin montar' },
      rackClamp: { name: 'Riel en la pinza del soporte con cremallera', done: 'Fijada', todo: 'Sin fijar' },
      twoLegStand: { name: 'Riel sobre el soporte de dos patas', done: 'Fijada', todo: 'Sin fijar' },
      receiver: { name: 'Receptor del DigiCart con polea', done: 'Fijado', todo: 'Sin fijar' },
    },
    doStandBase: 'Montar sobre la base', undoStandBase: 'Desmontar de la base',
    attachE1: 'Fijar el extremo E1 de la riel', attachE2: 'Fijar el extremo E2 de la riel',
    hintE1: 'E1 tiene la marca 0 mm: queda arriba.', hintE2: 'E2 tiene la marca 1200 mm: queda arriba.',
    undoClamp: 'Soltar la riel de la pinza',
    attachTwoLeg: 'Fijar al extremo opuesto', undoTwoLeg: 'Soltar el soporte de dos patas',
    attachReceiver: 'Fijar al extremo bajo', undoReceiver: 'Soltar el receptor',
    highEndIs: 'Extremo alto: {x}',
    screws: 'Tornillos libres: {n} de 6',
    caliperVariant: 'Tipo de calibrador', vernier: 'Vernier', digital: 'Digital',
    missingTitle: 'Qué falta',
    missingNone: 'El montaje está completo: no falta nada.',
    blocksRun: 'necesario para soltar el carro',
    missingItem: 'Poner en la mesa: {x}',
    missingJoint: 'Montar: {x}',
    missingReasons: {
      notOnTable: 'no está sobre la mesa', needsStandBase: 'primero monta el soporte sobre su base',
      needsRackClamp: 'primero fija la riel a la pinza', notAttached: 'falta conectarlo',
    },
    screwsInUse: 'Los tornillos están en uso.',
    summary: '{n} de 11 elementos sobre la mesa',
  },
  en: {
    title: 'Inventory and assembly',
    genericItem: 'the item',
    itemShort: {
      rail: 'the rail', cart: 'the DigiCart', rackStand: 'the rack stand', standBase: 'the stand base', twoLegStand: 'the two-leg stand',
      screws: 'the screws', level: 'the level', receiver: 'the DigiCart receiver', stopwatch: 'the stopwatch', caliper: 'the caliper', markers: 'the markers',
    },
    items: {
      rail: { name: '1.2 m metal rail', hint: 'With a millimetre scale; its ends are E1 (0 mm) and E2 (1200 mm).' },
      cart: { name: 'DigiCart', hint: 'The cart with a sensor. It must never be off the track.' },
      rackStand: { name: 'Height-adjustable rack stand', hint: 'Holds the high end of the rail; its scale gives the clamp height.' },
      standBase: { name: 'Metal stand base', hint: 'Where the rack stand is mounted.' },
      twoLegStand: { name: 'Two-leg stand', hint: 'Holds the low end; its screw foot allows a fine adjustment.' },
      screws: { name: '6 screws', hint: 'Each rail connection uses 2.' },
      level: { name: 'Level', hint: 'A bubble to check that the rail is horizontal.' },
      receiver: { name: 'DigiCart receiver with pulley', hint: 'Goes at the low end and stops the cart.' },
      stopwatch: { name: 'Stopwatch', hint: 'Handheld digital; you control it.' },
      caliper: { name: 'Caliper', hint: 'To measure heights. Choose vernier or digital.' },
      markers: { name: 'Markers (tape)', hint: 'To flag the positions every 10 cm.' },
    },
    onTable: 'On the table', inBox: 'Stored',
    add: 'Put on the table', remove: 'Put away', addAria: 'Put on the table: {x}', removeAria: 'Put away: {x}',
    itemsTitle: 'Materials',
    jointsTitle: 'Track assembly',
    jointsIntro: 'Follow the guide: rack stand at one end; receiver and two-leg stand at the other.',
    joints: {
      standBase: { name: 'Rack stand on its base', done: 'Mounted', todo: 'Not mounted' },
      rackClamp: { name: 'Rail in the rack-stand clamp', done: 'Fastened', todo: 'Not fastened' },
      twoLegStand: { name: 'Rail on the two-leg stand', done: 'Fastened', todo: 'Not fastened' },
      receiver: { name: 'DigiCart receiver with pulley', done: 'Fastened', todo: 'Not fastened' },
    },
    doStandBase: 'Mount on the base', undoStandBase: 'Remove from the base',
    attachE1: 'Fasten rail end E1', attachE2: 'Fasten rail end E2',
    hintE1: 'E1 has the 0 mm mark: it ends up on top.', hintE2: 'E2 has the 1200 mm mark: it ends up on top.',
    undoClamp: 'Release the rail from the clamp',
    attachTwoLeg: 'Fasten to the opposite end', undoTwoLeg: 'Release the two-leg stand',
    attachReceiver: 'Fasten to the low end', undoReceiver: 'Release the receiver',
    highEndIs: 'High end: {x}',
    screws: 'Free screws: {n} of 6',
    caliperVariant: 'Caliper type', vernier: 'Vernier', digital: 'Digital',
    missingTitle: "What's missing",
    missingNone: 'The setup is complete: nothing is missing.',
    blocksRun: 'needed to release the cart',
    missingItem: 'Put on the table: {x}',
    missingJoint: 'Assemble: {x}',
    missingReasons: {
      notOnTable: 'not on the table', needsStandBase: 'first mount the stand on its base',
      needsRackClamp: 'first fasten the rail to the clamp', notAttached: 'not connected yet',
    },
    screwsInUse: 'The screws are in use.',
    summary: '{n} of 11 items on the table',
  },
}
