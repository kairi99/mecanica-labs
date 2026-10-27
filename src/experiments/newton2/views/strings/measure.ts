import type { Strings } from '../view.ts'

export interface MeasureStrings {
  title: string
  balanceTitle: string
  balanceIntro: string
  targets: { cart: string; brassScrew: string; plasticScrew: string; canister: string; mass0: string; mass1: string; mass2: string; mass3: string; system: string }
  weigh: string
  clearPan: string
  reading: string
  readingNone: string
  resolution: string
  mtLabel: string
  mtRecord: string
  mtNow: string
  mtNone: string
  mtCopy: string
  invalid: string
  forceTitle: string
  forceIntro: string
  scaleLabel: string
  scale1: string
  scale2: string
  read: string
  forceReading: string
  forceNone: string
  forceFor: string
  forceDiv: string
  copyForce: string
  forceCopied: string
  stale: string
  needScale: string
  needCanister: string
  runTitle: string
  runNone: string
  runOutcome: string
  runTime: string
  phase: Record<'unplaced' | 'atStart' | 'rolling' | 'coasting' | 'stopped' | 'stuck', string>
  autoCam: string
  practice: string
  link: string
  linkNote: string
  reactionTitle: string
  reaction: string
  steps: string
  lastReading: string
}

export const strings: Strings<MeasureStrings> = {
  es: {
    title: 'Instrumentos',
    balanceTitle: 'Balanza',
    balanceIntro: 'Pesa el sistema completo (DigiCart con el tornillo de latón, contenedor con tapa y las cuatro masas de 10 g) para obtener Mt. También puedes pesar las piezas por separado.',
    targets: { cart: 'DigiCart', brassScrew: 'Tornillo de latón', plasticScrew: 'Tornillo de plástico', canister: 'Contenedor con tapa', mass0: 'Masa 1', mass1: 'Masa 2', mass2: 'Masa 3', mass3: 'Masa 4', system: 'Todo el sistema' },
    weigh: 'Pesar', clearPan: 'Vaciar el plato',
    reading: 'Lectura: {m} g', readingNone: 'Pon algo en el plato.',
    resolution: 'Resolución de la balanza: 0,1 g.',
    mtLabel: 'Mt (g)', mtRecord: 'Anotar Mt', mtNow: 'Mt anotada: {m} g', mtNone: 'Aún no anotas Mt.', mtCopy: 'Usar la última lectura',
    invalid: 'Escribe un número con a lo más un decimal.',
    forceTitle: 'Dinamómetro',
    forceIntro: 'Cuelga el contenedor con sus masas del dinamómetro: su peso es la fuerza F de la Tabla 3.1. Vuelve a leerlo cada vez que cambies las masas del contenedor.',
    scaleLabel: 'Dinamómetro',
    scale1: '1 N (divisiones de 0,02 N)', scale2: '2 N (divisiones de 0,05 N)',
    read: 'Colgar el contenedor y leer',
    forceReading: 'Lectura: {f} N ({c} masas en el contenedor)',
    forceNone: 'Aún no leíste el peso.',
    forceFor: 'Peso del contenedor con {c} masas',
    forceDiv: 'Se lee a la división más cercana: {d} N.',
    copyForce: 'Copiar a la fila de la prueba', forceCopied: 'F = {f} N anotada en la prueba {n}.',
    stale: 'Cambiaste las masas del contenedor después de esta lectura: léela otra vez.',
    needScale: 'Pon un dinamómetro sobre la mesa.',
    needCanister: 'Pon el contenedor sobre la mesa.',
    runTitle: 'La última suelta',
    runNone: 'Aún no soltaste el DigiCart.',
    runOutcome: 'Resultado: {x}',
    runTime: 'Tiempo verdadero del modelo: lo registra el DigiCart (paso 4).',
    phase: {
      unplaced: 'El DigiCart no está sobre la riel.', atStart: 'El DigiCart espera en el inicio.', rolling: 'El DigiCart avanza.',
      coasting: 'El contenedor tocó el piso: el DigiCart sigue por inercia.', stopped: 'El DigiCart se detuvo.', stuck: 'El DigiCart no se mueve.',
    },
    autoCam: 'Pasar a la vista de la polea al soltar',
    practice: 'Modo práctica',
    link: 'Iniciar el cronómetro solo al soltar',
    linkNote: 'Sirve para practicar; en la medición real tú inicias y detienes el cronómetro.',
    reactionTitle: 'Tiempo de reacción',
    reaction: 'Tú inicias y detienes el cronómetro con tu reacción (unos 0,2 s cada vez). Si el retraso fuera igual al empezar y al terminar, se cancelaría; no siempre pasa, y eso no se promedia.',
    steps: 'Para cada fuerza: lee el peso, anótalo y mide 10 tiempos de recorrido de 90 cm (suelta con S, inicia con Espacio, detén al pasar por la marca final, Enter copia).',
    lastReading: 'Última lectura del cronómetro: {t} s.',
  },
  en: {
    title: 'Instruments',
    balanceTitle: 'Balance',
    balanceIntro: 'Weigh the whole system (DigiCart with the brass screw, canister with lid and the four 10 g masses) to get Mt. You can also weigh the parts separately.',
    targets: { cart: 'DigiCart', brassScrew: 'Brass screw', plasticScrew: 'Plastic screw', canister: 'Canister with lid', mass0: 'Mass 1', mass1: 'Mass 2', mass2: 'Mass 3', mass3: 'Mass 4', system: 'The whole system' },
    weigh: 'Weigh', clearPan: 'Empty the pan',
    reading: 'Reading: {m} g', readingNone: 'Put something on the pan.',
    resolution: 'Balance resolution: 0.1 g.',
    mtLabel: 'Mt (g)', mtRecord: 'Record Mt', mtNow: 'Mt recorded: {m} g', mtNone: 'You have not recorded Mt yet.', mtCopy: 'Use the last reading',
    invalid: 'Type a number with at most one decimal.',
    forceTitle: 'Dynamometer',
    forceIntro: 'Hang the canister with its masses from the dynamometer: its weight is the force F of Table 3.1. Read it again every time you change the masses in the canister.',
    scaleLabel: 'Dynamometer',
    scale1: '1 N (0.02 N divisions)', scale2: '2 N (0.05 N divisions)',
    read: 'Hang the canister and read',
    forceReading: 'Reading: {f} N ({c} masses in the canister)',
    forceNone: 'You have not read the weight yet.',
    forceFor: 'Weight of the canister with {c} masses',
    forceDiv: 'Read to the nearest division: {d} N.',
    copyForce: 'Copy to the trial row', forceCopied: 'F = {f} N recorded for trial {n}.',
    stale: 'You changed the masses in the canister after this reading: read it again.',
    needScale: 'Put a dynamometer on the table.',
    needCanister: 'Put the canister on the table.',
    runTitle: 'The last release',
    runNone: 'You have not released the DigiCart yet.',
    runOutcome: 'Result: {x}',
    runTime: 'True time of the model: the DigiCart records it (step 4).',
    phase: {
      unplaced: 'The DigiCart is not on the rail.', atStart: 'The DigiCart waits at the start.', rolling: 'The DigiCart is moving.',
      coasting: 'The canister hit the floor: the DigiCart coasts on.', stopped: 'The DigiCart has stopped.', stuck: 'The DigiCart does not move.',
    },
    autoCam: 'Switch to the pulley view on release',
    practice: 'Practice mode',
    link: 'Start the stopwatch automatically on release',
    linkNote: 'Useful to practise; in the real measurement you start and stop the stopwatch yourself.',
    reactionTitle: 'Reaction time',
    reaction: 'You start and stop the stopwatch with your own reaction (about 0.2 s each). If the delay were the same at the start and at the end it would cancel; it does not always, and that is not averaged away.',
    steps: 'For each force: read the weight, record it and time 10 runs of 90 cm (release with S, start with Space, stop as it passes the end mark, Enter copies).',
    lastReading: 'Last stopwatch reading: {t} s.',
  },
}
