import type { Strings } from '../view.ts'

export interface AdjustStrings {
  title: string
  needRail: string
  // level
  levelTitle: string
  levelIntro: string
  rackLabel: string
  footLabel: string
  needClamp: string
  needReceiverFoot: string
  levelPlace: string
  levelRail: string
  levelTable: string
  levelAway: string
  vialAria: string
  vialHigh: string
  vialLow: string
  levelNone: string
  levelCentered: string
  levelOff: string
  levelSaturated: string
  levelHelp: string
  // marks
  marksTitle: string
  marksIntro: string
  startLabel: string
  endLabel: string
  place: string
  remove: string
  markSummary: string
  markNone: string
  distanceLine: string
  distanceOk: string
  distanceOff: string
  needRailMarks: string
  // cart
  cartTitle: string
  cartIntro: string
  cartLabel: string
  cartPlace: string
  cartBack: string
  cartAt: string
  cartNone: string
  cartWarn: string
  // string
  stringTitle: string
  stringIntro: string
  stringLabel: string
  stringSet: string
  stringNow: string
  stringHang: string
  // masses
  massesTitle: string
  massesIntro: string
  trialsLabel: string
  trialBtn: string
  trialBtnEmpty: string
  trialNow: string
  massLabel: string
  inCanister: string
  onCart: string
  onBench: string
  summaryLine: string
  benchWarn: string
  screwNote: string
  needMasses: string
  trialHint: string
  invalidNumber: string
}

export const strings: Strings<AdjustStrings> = {
  es: {
    title: 'Ajustes y marcas',
    needRail: 'Primero monta la pista: arrastra la riel, el soporte y el receptor en el escenario.',
    levelTitle: 'Nivelar la riel',
    levelIntro: 'La riel debe quedar horizontal. Apoya el nivelador en ella y sube o baja el extremo del soporte (mm) y el tornillo del receptor (fino) hasta centrar la burbuja.',
    rackLabel: 'Altura del extremo del soporte (mm)',
    footLabel: 'Tornillo de nivelación del receptor (mm)',
    needClamp: 'Fija la riel a la pinza del soporte para ajustar su altura.',
    needReceiverFoot: 'Pon el receptor para usar su tornillo de nivelación.',
    levelPlace: 'Nivelador',
    levelRail: 'En la riel', levelTable: 'En la mesa', levelAway: 'Guardado',
    vialAria: 'Burbuja del nivelador',
    vialHigh: 'extremo del soporte', vialLow: 'extremo del receptor',
    levelNone: 'El nivelador está guardado.',
    levelCentered: 'Burbuja centrada: la riel está (casi) horizontal.',
    levelOff: 'Burbuja descentrada {mm} mm: la riel está inclinada.',
    levelSaturated: 'La burbuja llegó al extremo del tubo: la inclinación es grande.',
    levelHelp: 'Una burbuja centrada garantiza la horizontal solo hasta cierto punto: un resto de inclinación pequeño cambia un poco la fuerza neta.',
    marksTitle: 'Marcas de 0 y 90 cm',
    marksIntro: 'Pega una marca donde el DigiCart parte (0 cm) y otra 90 cm más adelante, hacia el receptor. Usa la escala impresa de la riel (mm).',
    startLabel: 'Marca de inicio (0 cm), mm', endLabel: 'Marca final (90 cm), mm',
    place: 'Pegar', remove: 'Quitar',
    markSummary: 'Inicio: {s} mm · Final: {e} mm',
    markNone: 'sin marca',
    distanceLine: 'Distancia entre marcas: {d} cm.',
    distanceOk: 'Son los 90 cm de la guía.',
    distanceOff: 'La guía pide 90 cm.',
    needRailMarks: 'Hacen falta la riel y la cinta de marcas sobre la mesa.',
    cartTitle: 'DigiCart en el inicio',
    cartIntro: 'Pon el DigiCart con su frente (el lado del receptor) sobre la marca de inicio. Debe quedar entero sobre la riel.',
    cartLabel: 'Frente del DigiCart (mm)',
    cartPlace: 'Poner el DigiCart', cartBack: 'Volver al inicio',
    cartAt: 'El frente del DigiCart está en {x} mm.',
    cartNone: 'El DigiCart no está sobre la riel.',
    cartWarn: 'Nunca dejes el DigiCart fuera de la riel: rueda con facilidad y puede caer. Sin el receptor en el extremo, también se sale y cae.',
    stringTitle: 'Largo del hilo',
    stringIntro: 'El hilo va del tornillo de latón del DigiCart, sobre la polea, hasta el contenedor. Debe ser lo bastante largo para llegar a la polea y que el contenedor cuelgue, pero lo bastante corto para que no toque el piso antes de los 90 cm.',
    stringLabel: 'Largo del hilo (cm)',
    stringSet: 'Ajustar',
    stringNow: 'Largo actual: {x} cm.',
    stringHang: 'Con el DigiCart en el inicio, el contenedor cuelga {x} cm bajo la polea.',
    massesTitle: 'Masas: contenedor y DigiCart',
    massesIntro: 'Las cuatro masas de 10 g empiezan sueltas sobre la mesa: arrástralas al contenedor (o al DigiCart). Para cada prueba se pasa una masa del contenedor al DigiCart con un tornillo de plástico: así el total del sistema casi no cambia.',
    trialsLabel: 'Prueba (masas en el contenedor)',
    trialBtn: '{n} en el contenedor',
    trialBtnEmpty: 'Contenedor vacío (opcional)',
    trialNow: 'Ahora: {c} masas en el contenedor, {k} en el DigiCart.',
    massLabel: 'Masa {n}',
    inCanister: 'Contenedor', onCart: 'DigiCart', onBench: 'Fuera',
    summaryLine: 'En el contenedor: {c} · En el DigiCart: {k} (tornillos de plástico usados: {k}) · Fuera del sistema: {b}',
    benchWarn: 'Sacar una masa del sistema cambia la masa total: no es lo que pide la guía.',
    screwNote: 'Cada tornillo de plástico también pesa algo.',
    needMasses: 'Hacen falta las masas, el contenedor y el DigiCart sobre la mesa.',
    trialHint: 'Cambiar de prueba mueve masas; después vuelve a leer el peso del contenedor con el dinamómetro.',
    invalidNumber: 'Escribe un número.',
  },
  en: {
    title: 'Settings and marks',
    needRail: 'First build the track: drag the rail, the stand and the receiver on the stage.',
    levelTitle: 'Level the rail',
    levelIntro: 'The rail must be horizontal. Rest the level on it and raise or lower the stand end (mm) and the receiver screw (fine) until the bubble is centred.',
    rackLabel: 'Stand end height (mm)',
    footLabel: 'Receiver levelling screw (mm)',
    needClamp: 'Fix the rail in the stand clamp to adjust its height.',
    needReceiverFoot: 'Put the receiver to use its levelling screw.',
    levelPlace: 'Level',
    levelRail: 'On the rail', levelTable: 'On the table', levelAway: 'Put away',
    vialAria: 'Level bubble',
    vialHigh: 'stand end', vialLow: 'receiver end',
    levelNone: 'The level is put away.',
    levelCentered: 'Bubble centred: the rail is (almost) horizontal.',
    levelOff: 'Bubble off centre by {mm} mm: the rail is tilted.',
    levelSaturated: 'The bubble is at the end of the tube: the tilt is large.',
    levelHelp: 'A centred bubble guarantees the horizontal only up to a point: a small residual tilt changes the net force a little.',
    marksTitle: '0 and 90 cm marks',
    marksIntro: 'Stick a mark where the DigiCart starts (0 cm) and another 90 cm further, toward the receiver. Use the printed scale of the rail (mm).',
    startLabel: 'Start mark (0 cm), mm', endLabel: 'End mark (90 cm), mm',
    place: 'Stick', remove: 'Remove',
    markSummary: 'Start: {s} mm · End: {e} mm',
    markNone: 'no mark',
    distanceLine: 'Distance between marks: {d} cm.',
    distanceOk: 'That is the 90 cm of the guide.',
    distanceOff: 'The guide asks for 90 cm.',
    needRailMarks: 'The rail and the marking tape are needed on the table.',
    cartTitle: 'DigiCart at the start',
    cartIntro: 'Put the DigiCart with its front (the receiver side) on the start mark. It must lie entirely on the rail.',
    cartLabel: 'DigiCart front (mm)',
    cartPlace: 'Put the DigiCart', cartBack: 'Back to the start',
    cartAt: 'The front of the DigiCart is at {x} mm.',
    cartNone: 'The DigiCart is not on the rail.',
    cartWarn: 'Never leave the DigiCart off the rail: it rolls easily and can fall.',
    stringTitle: 'String length',
    stringIntro: 'The string runs from the brass screw on the DigiCart, over the pulley, to the canister. It must be long enough to reach the pulley and let the canister hang, but short enough that the canister does not touch the floor before 90 cm.',
    stringLabel: 'String length (cm)',
    stringSet: 'Set',
    stringNow: 'Current length: {x} cm.',
    stringHang: 'With the DigiCart at the start, the canister hangs {x} cm below the pulley.',
    massesTitle: 'Masses: canister and DigiCart',
    massesIntro: 'The four 10 g masses start loose on the table: drag them into the canister (or onto the DigiCart). For each trial one mass moves from the canister to the DigiCart with a plastic screw, so the total of the system hardly changes.',
    trialsLabel: 'Trial (masses in the canister)',
    trialBtn: '{n} in the canister',
    trialBtnEmpty: 'Empty canister (optional)',
    trialNow: 'Now: {c} masses in the canister, {k} on the DigiCart.',
    massLabel: 'Mass {n}',
    inCanister: 'Canister', onCart: 'DigiCart', onBench: 'Out',
    summaryLine: 'In the canister: {c} · On the DigiCart: {k} (plastic screws used: {k}) · Out of the system: {b}',
    benchWarn: 'Taking a mass out of the system changes the total mass: that is not what the guide asks.',
    screwNote: 'Each plastic screw weighs something too.',
    needMasses: 'The masses, the canister and the DigiCart are needed on the table.',
    trialHint: 'Changing trial moves masses; then read the weight of the canister with the dynamometer again.',
    invalidNumber: 'Type a number.',
  },
}
