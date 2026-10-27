import type { Strings } from '../view.ts'

export interface PullStrings {
  title1: string
  title2: string
  hint1: string
  hint2: string
  speed: string
  speedValue: string
  presets: { slow: string; medium: string; fast: string }
  start: string
  stopHand: string
  release: string
  read: string
  readHint: string
  copy: string
  copyTo: string
  status: { idle: string; stuck: string; sliding: string; ended: string; offPaper: string }
  last: string
  noLast: string
  over: string
  low: string
  gauge: string
  gaugeAria: string
  unit: string
  keys: string
}

export const strings: Strings<PullStrings> = {
  es: {
    title1: 'Jalar el taco con rapidez constante',
    title2: 'Jalar despacio hasta que el taco esté a punto de moverse',
    hint1: 'Jala con rapidez constante (la guía pide que el taco se mueva uniformemente) y pulsa «Leer» cuando la aguja se mantenga. Con jalones muy lentos la aguja sube y baja a saltos.',
    hint2: 'Jala despacio y pulsa «Leer» en el instante de mayor fuerza, justo antes de que el taco se mueva: después la aguja cae. Tu pulsación es tu tiempo de reacción.',
    speed: 'Rapidez de la mano',
    speedValue: '{v} cm/s',
    presets: { slow: 'Lenta', medium: 'Media', fast: 'Rápida' },
    start: 'Empezar a jalar',
    stopHand: 'Parar la mano',
    release: 'Soltar el dinamómetro',
    read: 'Leer',
    readHint: 'Anota la aguja en este instante',
    copy: 'Copiar la lectura a la celda activa',
    copyTo: 'Tabla {t}, fila {r}, lectura {n}',
    status: { idle: 'Listo para jalar.', stuck: 'El taco está en reposo; la fuerza crece.', sliding: 'El taco se desliza.', ended: 'Soltaste el dinamómetro; el taco volvió a su sitio.', offPaper: 'El taco salió de la hoja (ahora roza con la mesa): suelta y repite.' },
    last: 'Última lectura: {f} N',
    noLast: 'Aún no has leído la aguja.',
    over: 'La aguja topó con el tope: la fuerza real es mayor que el fondo de escala. Usa el dinamómetro de 2 N.',
    low: 'La aguja está en cero: la fuerza es menor que el error de cero del dinamómetro.',
    gauge: 'Dinamómetro',
    gaugeAria: 'Dinamómetro de {r} N con marcas de {d} N',
    unit: 'N',
    keys: 'Teclado: Intro o Espacio en «Leer» anota la aguja.',
  },
  en: {
    title1: 'Pull the block at constant speed',
    title2: 'Pull slowly until the block is about to move',
    hint1: 'Pull at constant speed (the guide wants the block to move uniformly) and press “Read” when the needle holds steady. Very slow pulls make the needle jump up and down.',
    hint2: 'Pull slowly and press “Read” at the instant of the largest force, just before the block moves: after that the needle drops. Your press is your reaction time.',
    speed: 'Hand speed',
    speedValue: '{v} cm/s',
    presets: { slow: 'Slow', medium: 'Medium', fast: 'Fast' },
    start: 'Start pulling',
    stopHand: 'Stop the hand',
    release: 'Let go of the spring scale',
    read: 'Read',
    readHint: 'Note the needle at this instant',
    copy: 'Copy the reading to the active cell',
    copyTo: 'Table {t}, row {r}, reading {n}',
    status: { idle: 'Ready to pull.', stuck: 'The block is at rest; the force grows.', sliding: 'The block is sliding.', ended: 'You let go; the block went back to its place.', offPaper: 'The block left the sheet (now it rubs on the table): let go and repeat.' },
    last: 'Last reading: {f} N',
    noLast: 'You have not read the needle yet.',
    over: 'The needle hit its stop: the real force is above full scale. Use the 2 N spring scale.',
    low: 'The needle is at zero: the force is below the scale\'s zero error.',
    gauge: 'Spring scale',
    gaugeAria: '{r} N spring scale with {d} N marks',
    unit: 'N',
    keys: 'Keyboard: Enter or Space on “Read” notes the needle.',
  },
}
