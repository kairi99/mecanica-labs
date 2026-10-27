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
  attached: string
  info: string
  putAll: string
  removeAll: string
  add: string
  remove: string
  summary: string
  itemsTitle: string
  jointsTitle: string
  jointsIntro: string
  joints: Record<JointId, { name: string; done: string; todo: string; doIt: string; undo: string }>
  attachE1: string
  attachE2: string
  hintE1: string
  hintE2: string
  standEndIs: string
  screws: string
  missingTitle: string
  missingNone: string
  missingItem: string
  missingJoint: string
  missingReasons: Record<MissingReason, string>
  blocksRun: string
  distractorNote: string
}

export const strings: Strings<InventoryStrings> = {
  es: {
    title: 'Inventario y montaje',
    genericItem: 'ese elemento',
    itemShort: {
      rail: 'la riel', cart: 'el DigiCart', rackStand: 'el soporte con cremallera', standBase: 'la base del soporte', receiver: 'el receptor con polea',
      screws: 'los tornillos', level: 'el nivelador', string: 'el hilo', canister: 'el contenedor de película', brassScrew: 'el tornillo de latón',
      plasticScrews: 'los tornillos de plástico', masses: 'las masas de 10 g', balance: 'la balanza', dynamometer: 'el dinamómetro de 1 N',
      dynamometer2N: 'el dinamómetro de 2 N', stopwatch: 'el cronómetro', markers: 'la cinta de marcas', mass50: 'la masa de 50 g', marble: 'la canica',
      twoLegStand: 'el soporte de dos patas',
    },
    items: {
      rail: { name: 'Riel metálica de 1,2 m', hint: 'La pista del DigiCart. Su escala impresa va de 0 a 1200 mm.' },
      cart: { name: 'DigiCart', hint: 'El carrito con sensor. Rueda con muy poca fricción: nunca lo dejes fuera de la riel.' },
      rackStand: { name: 'Soporte con cremallera', hint: 'Sostiene un extremo de la riel; su escala da la altura de la pinza.' },
      standBase: { name: 'Base metálica del soporte', hint: 'El soporte con cremallera va montado sobre ella.' },
      receiver: { name: 'Receptor con polea', hint: 'Se fija en el otro extremo de la riel: detiene el DigiCart y guía el hilo hacia abajo.' },
      screws: { name: 'Tornillos (6)', hint: 'Cada conexión de la riel (soporte y receptor) usa 2.' },
      level: { name: 'Nivelador', hint: 'La burbuja centrada indica una riel horizontal.' },
      string: { name: 'Hilo', hint: 'Une el DigiCart con el contenedor pasando por la polea. Su largo importa.' },
      canister: { name: 'Contenedor de película con tapa', hint: 'Cuelga del hilo y lleva las masas de 10 g.' },
      brassScrew: { name: 'Tornillo de latón', hint: 'Sujeta el hilo al DigiCart.' },
      plasticScrews: { name: 'Tornillos de plástico (5)', hint: 'Fijan una masa de 10 g sobre el DigiCart (uno por masa).' },
      masses: { name: 'Masas de 10 g (4)', hint: 'Cuatro masas plateadas. Se reparten entre el contenedor y el DigiCart.' },
      balance: { name: 'Balanza', hint: 'Resolución de 0,1 g. Para la masa total Mt.' },
      dynamometer: { name: 'Dinamómetro de 1 N', hint: 'De resorte, divisiones de 0,02 N. Mide el peso del contenedor (la guía lo usa aunque no figura en su lista de materiales).' },
      dynamometer2N: { name: 'Dinamómetro de 2 N', hint: 'De resorte, divisiones de 0,05 N: más alcance, menos finura.' },
      stopwatch: { name: 'Cronómetro', hint: 'Digital, 0,01 s.' },
      markers: { name: 'Cinta de marcas', hint: 'Para marcar el inicio y los 90 cm sobre la riel.' },
      mass50: { name: 'Masa de 50 g', hint: 'No es parte de esta práctica.' },
      marble: { name: 'Canica', hint: 'No es parte de esta práctica.' },
      twoLegStand: { name: 'Soporte de dos patas', hint: 'No hace falta en esta práctica: el receptor sostiene el otro extremo.' },
    },
    onTable: 'En la mesa',
    inBox: 'En la caja',
    attached: 'Fijado',
    info: 'Más información sobre {x}',
    putAll: 'Poner todo lo necesario',
    removeAll: 'Guardar todo',
    add: 'Poner', remove: 'Guardar',
    summary: '{n} elementos sobre la mesa',
    itemsTitle: 'Materiales',
    jointsTitle: 'Conexiones',
    jointsIntro: 'Arma la pista: el soporte en su base, la riel en el soporte, el receptor en el otro extremo y el hilo del DigiCart al contenedor por la polea.',
    joints: {
      standBase: { name: 'Soporte sobre su base', done: 'Hecho', todo: 'Pendiente', doIt: 'Montar el soporte en la base', undo: 'Desmontar' },
      rackClamp: { name: 'Riel en la pinza del soporte', done: 'Hecho', todo: 'Pendiente', doIt: 'Fijar la riel', undo: 'Soltar la riel' },
      receiver: { name: 'Receptor con polea en la riel', done: 'Hecho', todo: 'Pendiente', doIt: 'Fijar el receptor', undo: 'Soltar el receptor' },
      stringCart: { name: 'Hilo al DigiCart con el tornillo de latón', done: 'Hecho', todo: 'Pendiente', doIt: 'Atar al DigiCart', undo: 'Desatar' },
      stringCanister: { name: 'Hilo al contenedor', done: 'Hecho', todo: 'Pendiente', doIt: 'Atar al contenedor', undo: 'Desatar' },
      stringPulley: { name: 'Hilo sobre la polea', done: 'Hecho', todo: 'Pendiente', doIt: 'Pasar por la polea', undo: 'Sacar de la polea' },
    },
    attachE1: 'Extremo 0 mm en el soporte', attachE2: 'Extremo 1200 mm en el soporte',
    hintE1: 'La escala crece hacia el receptor.', hintE2: 'La escala decrece hacia el receptor.',
    standEndIs: 'En la pinza va el extremo {x}.',
    screws: 'Tornillos libres: {n}.',
    missingTitle: 'Qué falta',
    missingNone: 'Todo está montado.',
    missingItem: 'Falta poner: {x}',
    missingJoint: 'Falta la conexión: {x}',
    missingReasons: { notOnTable: 'no está sobre la mesa', needsStandBase: 'antes monta el soporte en su base', needsRackClamp: 'antes fija la riel al soporte', needsReceiver: 'antes fija el receptor', notAttached: 'sin hacer' },
    blocksRun: 'necesario para soltar',
    distractorNote: 'Algunos elementos de la caja no se usan en esta práctica.',
  },
  en: {
    title: 'Inventory and assembly',
    genericItem: 'that item',
    itemShort: {
      rail: 'the rail', cart: 'the DigiCart', rackStand: 'the rack stand', standBase: 'the stand base', receiver: 'the receiver with pulley',
      screws: 'the screws', level: 'the level', string: 'the string', canister: 'the film canister', brassScrew: 'the brass screw',
      plasticScrews: 'the plastic screws', masses: 'the 10 g masses', balance: 'the balance', dynamometer: 'the 1 N dynamometer',
      dynamometer2N: 'the 2 N dynamometer', stopwatch: 'the stopwatch', markers: 'the marking tape', mass50: 'the 50 g mass', marble: 'the marble',
      twoLegStand: 'the two-leg stand',
    },
    items: {
      rail: { name: '1.2 m metal rail', hint: 'The DigiCart track. Its printed scale runs from 0 to 1200 mm.' },
      cart: { name: 'DigiCart', hint: 'The cart with a sensor. It rolls with very little friction: never leave it off the rail.' },
      rackStand: { name: 'Rack stand', hint: 'Holds one end of the rail; its scale gives the clamp height.' },
      standBase: { name: 'Metal stand base', hint: 'The rack stand is mounted on it.' },
      receiver: { name: 'Receiver with pulley', hint: 'Fixed on the other end of the rail: it stops the DigiCart and guides the string down.' },
      screws: { name: 'Screws (6)', hint: 'Each rail connection (stand and receiver) uses 2.' },
      level: { name: 'Level', hint: 'A centred bubble means a horizontal rail.' },
      string: { name: 'String', hint: 'Joins the DigiCart to the canister over the pulley. Its length matters.' },
      canister: { name: 'Film canister with lid', hint: 'Hangs from the string and carries the 10 g masses.' },
      brassScrew: { name: 'Brass screw', hint: 'Fixes the string to the DigiCart.' },
      plasticScrews: { name: 'Plastic screws (5)', hint: 'Fix a 10 g mass on the DigiCart (one per mass).' },
      masses: { name: '10 g masses (4)', hint: 'Four silver masses. They are shared between the canister and the DigiCart.' },
      balance: { name: 'Balance', hint: '0.1 g resolution. For the total mass Mt.' },
      dynamometer: { name: '1 N dynamometer', hint: 'Spring scale, 0.02 N divisions. Measures the weight of the canister (the guide uses it although its materials list does not include it).' },
      dynamometer2N: { name: '2 N dynamometer', hint: 'Spring scale, 0.05 N divisions: more range, less fineness.' },
      stopwatch: { name: 'Stopwatch', hint: 'Digital, 0.01 s.' },
      markers: { name: 'Marking tape', hint: 'To mark the start and the 90 cm on the rail.' },
      mass50: { name: '50 g mass', hint: 'Not part of this practice.' },
      marble: { name: 'Marble', hint: 'Not part of this practice.' },
      twoLegStand: { name: 'Two-leg stand', hint: 'Not needed in this practice: the receiver holds the other end.' },
    },
    onTable: 'On the table',
    inBox: 'In the box',
    attached: 'Fixed',
    info: 'More about {x}',
    putAll: 'Put out everything needed',
    removeAll: 'Put everything away',
    add: 'Put', remove: 'Put away',
    summary: '{n} items on the table',
    itemsTitle: 'Materials',
    jointsTitle: 'Connections',
    jointsIntro: 'Build the track: the stand on its base, the rail in the stand, the receiver on the other end and the string from the DigiCart to the canister over the pulley.',
    joints: {
      standBase: { name: 'Stand on its base', done: 'Done', todo: 'To do', doIt: 'Mount the stand on the base', undo: 'Dismount' },
      rackClamp: { name: 'Rail in the stand clamp', done: 'Done', todo: 'To do', doIt: 'Fix the rail', undo: 'Release the rail' },
      receiver: { name: 'Receiver with pulley on the rail', done: 'Done', todo: 'To do', doIt: 'Fix the receiver', undo: 'Release the receiver' },
      stringCart: { name: 'String to the DigiCart with the brass screw', done: 'Done', todo: 'To do', doIt: 'Tie to the DigiCart', undo: 'Untie' },
      stringCanister: { name: 'String to the canister', done: 'Done', todo: 'To do', doIt: 'Tie to the canister', undo: 'Untie' },
      stringPulley: { name: 'String over the pulley', done: 'Done', todo: 'To do', doIt: 'Lay over the pulley', undo: 'Take off the pulley' },
    },
    attachE1: '0 mm end in the stand', attachE2: '1200 mm end in the stand',
    hintE1: 'The scale grows toward the receiver.', hintE2: 'The scale decreases toward the receiver.',
    standEndIs: 'The {x} end is in the clamp.',
    screws: 'Free screws: {n}.',
    missingTitle: 'What is missing',
    missingNone: 'Everything is set up.',
    missingItem: 'Still to put out: {x}',
    missingJoint: 'Still to connect: {x}',
    missingReasons: { notOnTable: 'not on the table', needsStandBase: 'first mount the stand on its base', needsRackClamp: 'first fix the rail in the stand', needsReceiver: 'first fix the receiver', notAttached: 'not done' },
    blocksRun: 'needed to release',
    distractorNote: 'Some items in the box are not used in this practice.',
  },
}
