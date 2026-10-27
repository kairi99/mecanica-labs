import type { Strings } from '../view.ts'

export interface LogStrings {
  title: string
  appName: string
  disclaimer: string
  run: string
  runOption: string
  noRuns: string
  noRunsHelp: string
  axisT: string
  axisX: string
  seriesX: string
  plotAria: string
  rolling: string
  facts: string
  factEnd: string
  factNoEnd: string
  factFloor: string
  factMasses: string
  factOutcome: string
  compare: string
  noStops: string
  colTrial: string
  colYou: string
  colCart: string
  colDiff: string
  colStart: string
  startLate: string
  startEarly: string
  hintDiff: string
  sensor: string
  endLabel: string
  floorLabel: string
  trialOf: string
}

export const strings: Strings<LogStrings> = {
  es: {
    title: 'Registro del DigiCart',
    appName: 'DigiCart · registro',
    disclaimer: 'El DigiCart real mide su propia posición con un sensor. Aquí es una referencia: no sustituye tu medición con el cronómetro (la Tabla 3.1) ni la analiza por ti.',
    run: 'Recorrido',
    runOption: 'Recorrido {n}',
    noRuns: 'Todavía no hay registros.',
    noRunsHelp: 'Suelta el DigiCart en el paso 3 y su posición x(t) aparecerá aquí.',
    axisT: 't (s)', axisX: 'x (m)', seriesX: 'x(t)',
    plotAria: 'Gráfica de la posición del DigiCart contra el tiempo',
    rolling: 'El registro se completa mientras el DigiCart avanza.',
    facts: 'Datos de este recorrido',
    factEnd: 'Tiempo hasta la marca final ({d} cm): {t} s',
    factNoEnd: 'El DigiCart no llegó a la marca final.',
    factFloor: 'El contenedor tocó el piso a los {t} s: después el hilo queda flojo.',
    factMasses: 'Masas en el contenedor: {m}',
    factOutcome: 'Resultado: {x}',
    compare: 'Tu cronómetro y el DigiCart',
    noStops: 'Aún no detuviste el cronómetro en este recorrido.',
    colTrial: 'Prueba', colYou: 'Tú (s)', colCart: 'DigiCart (s)', colDiff: 'Diferencia (s)', colStart: 'Tu inicio',
    startLate: '{t} s tarde', startEarly: '{t} s antes',
    hintDiff: 'La diferencia mezcla tu reacción al iniciar y al detener y el redondeo de la pantalla.',
    sensor: 'Referencia del modelo, a 50 muestras por segundo y 1 mm de resolución.',
    endLabel: 'marca final', floorLabel: 'piso',
    trialOf: 'prueba {n}',
  },
  en: {
    title: 'DigiCart log',
    appName: 'DigiCart · log',
    disclaimer: 'The real DigiCart measures its own position with a sensor. Here it is a reference: it does not replace your stopwatch measurement (Table 3.1) nor analyse it for you.',
    run: 'Run',
    runOption: 'Run {n}',
    noRuns: 'There are no records yet.',
    noRunsHelp: 'Release the DigiCart in step 3 and its position x(t) will show up here.',
    axisT: 't (s)', axisX: 'x (m)', seriesX: 'x(t)',
    plotAria: 'Graph of the DigiCart position against time',
    rolling: 'The record fills in while the DigiCart moves.',
    facts: 'Facts of this run',
    factEnd: 'Time to the end mark ({d} cm): {t} s',
    factNoEnd: 'The DigiCart did not reach the end mark.',
    factFloor: 'The canister hit the floor at {t} s: after that the string is slack.',
    factMasses: 'Masses in the canister: {m}',
    factOutcome: 'Result: {x}',
    compare: 'Your stopwatch and the DigiCart',
    noStops: 'You have not stopped the stopwatch on this run yet.',
    colTrial: 'Trial', colYou: 'You (s)', colCart: 'DigiCart (s)', colDiff: 'Difference (s)', colStart: 'Your start',
    startLate: '{t} s late', startEarly: '{t} s early',
    hintDiff: 'The difference mixes your reaction at the start and at the stop and the rounding of the display.',
    sensor: 'Model reference, 50 samples per second and 1 mm resolution.',
    endLabel: 'end mark', floorLabel: 'floor',
    trialOf: 'trial {n}',
  },
}
