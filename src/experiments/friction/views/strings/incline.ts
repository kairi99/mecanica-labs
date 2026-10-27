import type { Strings } from '../view.ts'

export interface InclineStrings {
  title: string
  intro: string
  geometry: string
  course: string
  courseUnit: string
  mark: string
  marked: string
  notMarked: string
  bar: string
  bars: { wood: string; aluminium: string; iron: string }
  crank: string
  crankValue: string
  raise: string
  stopCrank: string
  lower: string
  phase: { idle: string; raising: string; holding: string; sliding: string; finished: string; stopped: string }
  tape: string
  tapeBtn: string
  tapeReading: string
  noTape: string
  watch: string
  watchStart: string
  watchStop: string
  watchReset: string
  watchAria: string
  keys: string
}

export const strings: Strings<InclineStrings> = {
  es: {
    title: 'Riel inclinado: barra, manivela, cinta y cronómetro',
    intro: 'Marca la distancia de recorrido sobre el riel, pon la barra en la marca de salida y levanta el extremo con la manivela del soporte hasta que la barra empiece a deslizar sin detenerse. Para la manivela en ese instante, mide h con la cinta y cronometra el recorrido.',
    geometry: 'El riel descansa en la mesa por su extremo bajo y el soporte lo sujeta a 1,10 m de ese punto. h es la altura del borde inferior del riel en la sujeción sobre la mesa, así que sen θ = h / 1,10 m.',
    course: 'Distancia de recorrido',
    courseUnit: 'cm',
    mark: 'Medir y marcar',
    marked: 'Recorrido marcado: {cm} cm. La barra espera en la marca de salida.',
    notMarked: 'Aún no marcaste la distancia de recorrido.',
    bar: 'Barra sobre la marca de salida',
    bars: { wood: 'Madera', aluminium: 'Aluminio', iron: 'Hierro' },
    crank: 'Rapidez de la manivela',
    crankValue: '{v} mm/s de altura',
    raise: 'Girar la manivela (subir)',
    stopCrank: 'Parar la manivela',
    lower: 'Bajar el riel y volver a la marca',
    phase: { idle: 'El riel está plano.', raising: 'Subiendo el riel…', holding: 'La manivela está quieta.', sliding: 'La barra desliza.', finished: 'La barra pasó la marca de llegada.', stopped: 'La barra se detuvo antes de llegar.' },
    tape: 'Cinta métrica',
    tapeBtn: 'Medir h con la cinta',
    tapeReading: 'h = {h} m (cinta, al milímetro)',
    noTape: 'Aún no mediste h.',
    watch: 'Cronómetro',
    watchStart: 'Iniciar',
    watchStop: 'Detener',
    watchReset: 'Poner en cero',
    watchAria: 'Cronómetro',
    keys: 'Tu tiempo de reacción cuenta: inicia cuando veas que la barra empieza a moverse y detén cuando cruce la marca de llegada.',
  },
  en: {
    title: 'Raised rail: bar, crank, tape and stopwatch',
    intro: 'Mark the travel distance on the rail, put the bar on the start mark and raise the end with the stand\'s crank until the bar starts sliding without stopping. Stop the crank at that moment, measure h with the tape and time the travel.',
    geometry: 'The rail rests on the table at its low end and the stand holds it 1.10 m from that point. h is the height of the rail\'s lower edge at the clamp above the table, so sin θ = h / 1.10 m.',
    course: 'Travel distance',
    courseUnit: 'cm',
    mark: 'Measure and mark',
    marked: 'Travel marked: {cm} cm. The bar waits on the start mark.',
    notMarked: 'You have not marked the travel distance yet.',
    bar: 'Bar on the start mark',
    bars: { wood: 'Wood', aluminium: 'Aluminium', iron: 'Iron' },
    crank: 'Crank speed',
    crankValue: '{v} mm/s of height',
    raise: 'Turn the crank (raise)',
    stopCrank: 'Stop the crank',
    lower: 'Lower the rail and return to the mark',
    phase: { idle: 'The rail is flat.', raising: 'Raising the rail…', holding: 'The crank is still.', sliding: 'The bar is sliding.', finished: 'The bar passed the finish mark.', stopped: 'The bar stopped before arriving.' },
    tape: 'Tape measure',
    tapeBtn: 'Measure h with the tape',
    tapeReading: 'h = {h} m (tape, to the millimetre)',
    noTape: 'You have not measured h yet.',
    watch: 'Stopwatch',
    watchStart: 'Start',
    watchStop: 'Stop',
    watchReset: 'Reset',
    watchAria: 'Stopwatch',
    keys: 'Your reaction time counts: start when you see the bar begin to move and stop when it crosses the finish mark.',
  },
}
