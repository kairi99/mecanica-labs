import type { Strings } from '../view.ts'

export interface TabletStrings {
  title: string
  appName: string
  disclaimer: string
  run: string
  runOption: string
  noRuns: string
  noRunsHelp: string
  plotAria: string
  axisT: string
  axisX: string
  seriesX: string
  marks: string
  markLabel: string
  markTime: string
  markNone: string
  compare: string
  colMark: string
  colYou: string
  colCart: string
  colDiff: string
  colStart: string
  noStops: string
  noMarkTarget: string
  startLate: string
  startEarly: string
  rolling: string
  cartCm: string
  hintDiff: string
  sensor: string
}

export const strings: Strings<TabletStrings> = {
  es: {
    title: 'Tableta del DigiCart',
    appName: 'DigiCart · Registro de la corrida',
    disclaimer: 'Datos de referencia: el DigiCart real mide su posición con su propio sensor. Aquí ves la medida verdadera del modelo, para que la compares con tu cronómetro. Tu tabla se llena con TU cronómetro.',
    run: 'Corrida',
    runOption: 'Corrida {n}',
    noRuns: 'Aún no hay corridas.',
    noRunsHelp: 'Suelta el DigiCart para que el sensor registre su posición.',
    plotAria: 'Gráfica de la posición del DigiCart en función del tiempo, con los instantes en que cruzó cada marca',
    axisT: 't (s)', axisX: 'x (m)',
    seriesX: 'Posición x(t)',
    marks: 'Cruce de marcas',
    markLabel: '{x} cm',
    markTime: '{t} s',
    markNone: 'sin cruce',
    compare: 'Tu cronómetro frente al DigiCart',
    colMark: 'Marca', colYou: 'Tu cronómetro', colCart: 'DigiCart', colDiff: 'Diferencia', colStart: 'Inicio',
    noStops: 'No detuviste el cronómetro en esta corrida.',
    noMarkTarget: 'sin marca',
    startLate: '{t} s tarde', startEarly: '{t} s antes',
    rolling: 'La corrida sigue en curso: el registro se completa al avanzar el carro.',
    cartCm: '{x} cm',
    hintDiff: 'Diferencia = tu lectura menos el instante verdadero: es tu error de cronometraje (reacción al iniciar y al detener).',
    sensor: 'Sensor: 50 muestras por segundo, resolución de 1 mm.',
  },
  en: {
    title: 'DigiCart tablet',
    appName: 'DigiCart · Run record',
    disclaimer: 'Reference data: the real DigiCart measures its position with its own sensor. Here you see the true value from the model, so you can compare it with your stopwatch. Your table is filled from YOUR stopwatch.',
    run: 'Run',
    runOption: 'Run {n}',
    noRuns: 'No runs yet.',
    noRunsHelp: 'Release the DigiCart so the sensor records its position.',
    plotAria: 'Plot of the DigiCart position against time, with the instants it crossed each mark',
    axisT: 't (s)', axisX: 'x (m)',
    seriesX: 'Position x(t)',
    marks: 'Mark crossings',
    markLabel: '{x} cm',
    markTime: '{t} s',
    markNone: 'no crossing',
    compare: 'Your stopwatch versus the DigiCart',
    colMark: 'Mark', colYou: 'Your stopwatch', colCart: 'DigiCart', colDiff: 'Difference', colStart: 'Start',
    noStops: 'You did not stop the stopwatch in this run.',
    noMarkTarget: 'no mark',
    startLate: '{t} s late', startEarly: '{t} s early',
    rolling: 'The run is still going: the record fills in as the cart moves.',
    cartCm: '{x} cm',
    hintDiff: 'Difference = your reading minus the true instant: it is your timing error (reaction when starting and stopping).',
    sensor: 'Sensor: 50 samples per second, 1 mm resolution.',
  },
}
