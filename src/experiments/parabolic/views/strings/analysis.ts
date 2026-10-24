import type { Strings } from '../view.ts'

export interface AnalysisStrings {
  title: string
  intro: string
  statusEmpty: string
  statusData: string
  noData: string
  needData: string
  exportCsv: string
  fileName: string
  notesLabel: string
  notesPlaceholder: string
  balls: { marble: string; pingpong: string }
  colTrial: string
  // task 1
  t1Title: string
  t1Prompts: string[]
  // tasks 2 and 4
  t24Title: string
  t24Intro: string
  colN: string
  colT: string
  colX: string
  colV: string
  convTitle: string
  convItems: string[]
  bdTitle: string
  bdCols: { sd: string; uA: string; uRes: string; uReact: string; uTape: string; uProj: string }
  bdTime: string
  bdRange: string
  reactNote: string
  // task 3
  t3Title: string
  t3Intro: string
  t3Spread: string
  t3Plot: string
  axisTrial: string
  axisTime: string
  legMarble: string
  legPingpong: string
  legTheo: string
  t3Prompt: string
  // task 5
  t5Title: string
  t5Intro: string
  hLabel: string
  hHelp: string
  hBad: string
  hNotMeasured: string
  t5Result: string
  t5Inputs: string
  t5NoH: string
  t5IndepTitle: string
  colTheo: string
  t5Prompt: string
  // task 6
  t6Title: string
  t6Intro: string
  colErr: string
  colVerdict: string
  verdicts: { within1: string; within2: string; beyond2: string }
  t6Pooled: string
  t6RefTitle: string
  t6RefLine: string
  t6RefNone: string
  t6RefCompare: string
  t6RefNote: string
  t6Prompt: string
  // task 7
  t7Title: string
  t7Intro: string
  colVf: string
  colAngle: string
  t7Note: string
  t7Prompt: string
  // task 8
  t8Title: string
  t8Intro: string
  colDiff: string
  colRatio: string
  t8Prompt: string
  // task 9
  t9Title: string
  t9Intro: string
  t9Items: string[]
  t9Prompt: string
  // share
  correlationNote: string
}

export const strings: Strings<AnalysisStrings> = {
  es: {
    title: 'Análisis',
    intro: 'Las tareas 2 a 9 de la sección 2.4 de la guía, calculadas con los datos de tu Tabla 2.1. Todo se actualiza solo al llenar la tabla. Las respuestas con palabras las escribes tú en cada tarea; se guardan en este navegador.',
    statusEmpty: 'Aún no hay datos en la Tabla 2.1.',
    statusData: 'Datos: canica {marble} de {per}, pelota de ping-pong {pingpong} de {per} (tiempo y alcance a la vez).',
    noData: 'Sin datos',
    needData: 'Falta llenar la Tabla 2.1 de esta bola.',
    exportCsv: 'Exportar análisis (CSV)',
    fileName: 'analisis-parabolico.csv',
    notesLabel: 'Tus notas y respuestas',
    notesPlaceholder: 'Escribe aquí tu respuesta…',
    balls: { marble: 'Canica', pingpong: 'Pelota de ping-pong' },
    colTrial: 'No.',
    t1Title: 'Tarea 1 · El movimiento',
    t1Prompts: [
      'Haz un esquema del experimento: mesa, riel, borde, la trayectoria de la bola y el punto donde cae.',
      'Después de dejar la mesa, ¿qué fuerzas actúan sobre la bola? ¿Qué movimiento tiene en horizontal y cuál en vertical?',
      '¿Cuál es la dirección de su velocidad justo al salir de la mesa?',
    ],
    t24Title: 'Tareas 2 y 4 · Promedios y rapidez de salida',
    t24Intro: 'Cada fila es una marca de la riel. Tiempo y alcance promedio con su incertidumbre, y la rapidez de salida v0 = x/t con la incertidumbre propagada.',
    colN: 'n (t, x)',
    colT: 't ± Δt [s]',
    colX: 'x ± Δx [m]',
    colV: 'v0 ± Δv [m/s]',
    convTitle: 'Cómo se calculó la incertidumbre',
    convItems: [
      'Promedio de los 5 datos. Tipo A: s/√5, con s la desviación estándar de la muestra.',
      'Tipo B del cronómetro: resolución 0,01 s, u = 0,01/√12 (distribución rectangular).',
      'Tipo B de tu reacción: al arrancar y al parar el cronómetro la mano se retrasa un tiempo desconocido; la diferencia media es un sesgo (±0,1 s, u = 0,1/√3, supuesto) común a los 25 datos. No baja al promediar.',
      'Δt combina las tres en cuadratura. Para el alcance: Tipo A, lectura de la cinta (división de 1 mm, u = 1/√12 mm) y la colocación de la proyección del borde (2 mm, supuesto, común a todos los alcances).',
      'v0 = x/t y Δv = v0·√((Δx/x)² + (Δt/t)²), con x y t medidos de forma independiente.',
    ],
    bdTitle: 'Desglose de las incertidumbres',
    bdCols: { sd: 's', uA: 'Tipo A', uRes: 'Resolución', uReact: 'Reacción', uTape: 'Cinta', uProj: 'Proyección' },
    bdTime: 'Tiempo [s]',
    bdRange: 'Alcance [m]',
    reactNote: 'Con un tiempo de unos 0,4 s, un sesgo de reacción de décimas de segundo pesa mucho: es la causa principal de que Δv sea grande aunque los 5 tiempos se parezcan entre sí.',
    t3Title: 'Tarea 3 · Los tiempos de vuelo',
    t3Intro: 'Tiempo promedio de cada marca, con su incertidumbre, para las dos bolas. La rapidez de salida cambia de una marca a otra; mira qué pasa con el tiempo.',
    t3Spread: '{ball}: de la marca con menor a la de mayor tiempo promedio hay {s} s; la incertidumbre Δt de cada marca es de unos {u} s.',
    t3Plot: 'Gráfica del tiempo promedio por marca con barras de incertidumbre, para la canica y la pelota de ping-pong.',
    axisTrial: 'Marca (No.)',
    axisTime: 't [s]',
    legMarble: '● Canica',
    legPingpong: '■ Ping-pong',
    legTheo: '— Tiempo esperado',
    t3Prompt: '¿Qué ocurre con los tiempos de vuelo al cambiar de marca? ¿Las diferencias son mayores que la incertidumbre? ¿Cómo lo explicas?',
    t5Title: 'Tarea 5 · Tiempo esperado',
    t5Intro: 'Deduce una expresión para el tiempo de vuelo a partir del movimiento vertical (cae desde la altura H, sin velocidad vertical inicial) y calcúlalo con la altura que mediste.',
    hLabel: 'Altura de lanzamiento H (cm)',
    hHelp: 'Mídela con la cinta, del piso a la superficie de la mesa (paso Lanzamientos), y escribe aquí la lectura.',
    hBad: 'Escribe una altura entre 20 y 200 cm.',
    hNotMeasured: 'Aún no has medido la altura con la cinta métrica.',
    t5Result: 't = √(2H/g) = {t} s',
    t5Inputs: 'H = {H} m (incertidumbre {uH} m, dos extremos de la cinta) y g = {g} m/s² en Quito (incertidumbre {ug} m/s², supuesta).',
    t5NoH: 'Escribe tu altura H para calcular el tiempo esperado.',
    t5IndepTitle: 'Tiempo esperado con la rapidez de salida de cada marca',
    colTheo: 'v0 [m/s] → t esperado [s]',
    t5Prompt: '¿De qué depende el tiempo de vuelo? ¿Cambia con la rapidez de salida? Compruébalo en la tabla y explícalo con tus ecuaciones.',
    t6Title: 'Tarea 6 · Error porcentual',
    t6Intro: 'Compara el tiempo medido con el esperado: error % = (t − t esperado) / t esperado × 100. El veredicto usa la incertidumbre combinada de ambos.',
    colErr: 'Error %',
    colVerdict: 'Veredicto',
    verdicts: { within1: '< 1σ', within2: '1σ a 2σ', beyond2: '> 2σ' },
    t6Pooled: '{ball}, los {n} datos juntos: t = {t} s, error {err} % (desviación {verdict}).',
    t6RefTitle: 'Referencia de la cámara lenta',
    t6RefLine: '{ball}: {t} s contando cuadros ({n} lanzamientos), error {err} % frente al tiempo esperado.',
    t6RefCompare: 'Tu cronómetro frente a la cámara lenta: {diff} s ({pct} %).',
    t6RefNone: 'Aún no hay lanzamientos con cámara lenta de esta bola.',
    t6RefNote: 'Contar cuadros a 240 por segundo tiene una incertidumbre de unos 2 ms; la del cronómetro en mano es cien veces mayor.',
    t6Prompt: '¿Cuánto vale el error porcentual? ¿Qué fuentes de error lo explican (reacción, medición de H, la propia bola)? ¿Mejora con la cámara lenta?',
    t7Title: 'Tarea 7 · Rapidez final',
    t7Intro: 'Justo antes de tocar el piso, la componente horizontal sigue siendo v0 y la vertical vale g·t. Con la altura: v = √(v0² + 2gH).',
    colVf: 'v final ± Δv [m/s]',
    colAngle: 'Ángulo bajo la horizontal [°]',
    t7Note: 'Supone un proyectil ideal (sin aire, g constante). La incertidumbre propaga v0, H y g.',
    t7Prompt: '¿Cuánto más rápida es la bola al llegar al piso que al salir de la mesa? ¿De qué depende más: de v0 o de H?',
    t8Title: 'Tarea 8 · Canica y pelota de ping-pong',
    t8Intro: 'Misma pista y mismas marcas. Diferencia de cada resultado entre las dos bolas, en unidades de la incertidumbre combinada.',
    colDiff: 'Diferencia (en σ)',
    colRatio: 'Cociente',
    t8Prompt: '¿En qué se diferencia el movimiento de las dos bolas: velocidad de salida, alcance, tiempo? ¿Por qué? Piensa en masa, tamaño, que una es hueca, rodar y el aire.',
    t9Title: 'Tarea 9 · Proyectil ideal',
    t9Intro: 'Para ser un proyectil ideal deben cumplirse ciertas condiciones. Para cada una decide si se cumplió en tu experimento y qué efecto tuvo en tus datos.',
    t9Items: [
      '¿Qué fuerzas actúan sobre el cuerpo desde que sale de la mesa?',
      '¿La velocidad de salida era exactamente horizontal? ¿Estaba la riel nivelada de lado?',
      '¿Es constante la aceleración de la gravedad en toda la caída?',
      '¿Se puede tratar la bola como un punto? ¿Gira? ¿Importa su tamaño?',
      '¿El borde de la mesa deja salir la bola sin perturbarla?',
      '¿Qué otros factores del montaje o de la medición (tiempo, alcance, alturas) pudieron desviar tus resultados?',
    ],
    t9Prompt: 'Escribe tu respuesta: qué condiciones se cumplieron, cuáles no y cuáles factores causaron las desviaciones.',
    correlationNote: 'El sesgo de reacción es común a todas las marcas: los errores de las filas no son independientes.',
  },
  en: {
    title: 'Analysis',
    intro: 'Tasks 2 to 9 of section 2.4 of the guide, computed from your Table 2.1. Everything updates by itself as you fill the table. The answers in words are yours to write in each task; they are saved in this browser.',
    statusEmpty: 'No data in Table 2.1 yet.',
    statusData: 'Data: marble {marble} of {per}, ping-pong ball {pingpong} of {per} (time and range together).',
    noData: 'No data',
    needData: "Table 2.1 for this ball is still empty.",
    exportCsv: 'Export analysis (CSV)',
    fileName: 'parabolic-analysis.csv',
    notesLabel: 'Your notes and answers',
    notesPlaceholder: 'Write your answer here…',
    balls: { marble: 'Marble', pingpong: 'Ping-pong ball' },
    colTrial: 'No.',
    t1Title: 'Task 1 · The motion',
    t1Prompts: [
      'Sketch the experiment: table, rail, edge, the ball path and the point where it lands.',
      'After leaving the table, which forces act on the ball? What motion does it have horizontally and what vertically?',
      'What is the direction of its velocity just as it leaves the table?',
    ],
    t24Title: 'Tasks 2 and 4 · Averages and launch speed',
    t24Intro: 'Each row is a mark on the rail. Mean time and range with their uncertainty, and the launch speed v0 = x/t with the propagated uncertainty.',
    colN: 'n (t, x)',
    colT: 't ± Δt [s]',
    colX: 'x ± Δx [m]',
    colV: 'v0 ± Δv [m/s]',
    convTitle: 'How the uncertainty was computed',
    convItems: [
      'Mean of the 5 values. Type A: s/√5, with s the sample standard deviation.',
      'Stopwatch Type B: resolution 0.01 s, u = 0.01/√12 (rectangular distribution).',
      'Type B of your reaction: when starting and stopping the watch your hand lags by an unknown time; the mean difference is a bias (±0.1 s, u = 0.1/√3, assumed) common to all 25 values. It does not shrink when averaging.',
      'Δt combines the three in quadrature. For the range: Type A, tape reading (1 mm division, u = 1/√12 mm) and the placement of the edge projection (2 mm, assumed, common to every range).',
      'v0 = x/t and Δv = v0·√((Δx/x)² + (Δt/t)²), with x and t measured independently.',
    ],
    bdTitle: 'Breakdown of the uncertainties',
    bdCols: { sd: 's', uA: 'Type A', uRes: 'Resolution', uReact: 'Reaction', uTape: 'Tape', uProj: 'Projection' },
    bdTime: 'Time [s]',
    bdRange: 'Range [m]',
    reactNote: 'With a time of about 0.4 s, a reaction bias of a tenth of a second weighs a lot: it is the main reason Δv is large even when the 5 times resemble each other.',
    t3Title: 'Task 3 · The flight times',
    t3Intro: 'Mean time of each mark, with its uncertainty, for both balls. The launch speed changes from mark to mark; look at what happens to the time.',
    t3Spread: '{ball}: from the mark with the smallest mean time to the largest there are {s} s; the Δt of each mark is about {u} s.',
    t3Plot: 'Plot of the mean time per mark with uncertainty bars, for the marble and the ping-pong ball.',
    axisTrial: 'Mark (No.)',
    axisTime: 't [s]',
    legMarble: '● Marble',
    legPingpong: '■ Ping-pong',
    legTheo: '— Expected time',
    t3Prompt: 'What happens to the flight times as the mark changes? Are the differences larger than the uncertainty? How do you explain it?',
    t5Title: 'Task 5 · Expected time',
    t5Intro: 'Derive an expression for the flight time from the vertical motion (it falls from height H with no initial vertical speed) and compute it with the height you measured.',
    hLabel: 'Launch height H (cm)',
    hHelp: 'Measure it with the tape, from the floor to the table surface (Launches step), and type the reading here.',
    hBad: 'Type a height between 20 and 200 cm.',
    hNotMeasured: 'You have not measured the height with the tape yet.',
    t5Result: 't = √(2H/g) = {t} s',
    t5Inputs: 'H = {H} m (uncertainty {uH} m, two tape ends) and g = {g} m/s² in Quito (uncertainty {ug} m/s², assumed).',
    t5NoH: 'Type your height H to compute the expected time.',
    t5IndepTitle: 'Expected time with the launch speed of each mark',
    colTheo: 'v0 [m/s] → expected t [s]',
    t5Prompt: 'What does the flight time depend on? Does it change with the launch speed? Check it in the table and explain it with your equations.',
    t6Title: 'Task 6 · Percent error',
    t6Intro: 'Compare the measured time with the expected one: error % = (t − expected t) / expected t × 100. The verdict uses the combined uncertainty of both.',
    colErr: 'Error %',
    colVerdict: 'Verdict',
    verdicts: { within1: '< 1σ', within2: '1σ to 2σ', beyond2: '> 2σ' },
    t6Pooled: '{ball}, all {n} values together: t = {t} s, error {err} % (deviation {verdict}).',
    t6RefTitle: 'Slow-motion reference',
    t6RefLine: '{ball}: {t} s counting frames ({n} launches), error {err} % against the expected time.',
    t6RefCompare: 'Your stopwatch against slow motion: {diff} s ({pct} %).',
    t6RefNone: 'There are no slow-motion launches of this ball yet.',
    t6RefNote: 'Counting frames at 240 per second has an uncertainty of about 2 ms; a hand-held stopwatch is a hundred times larger.',
    t6Prompt: 'What is the percent error? Which sources of error explain it (reaction, measuring H, the ball itself)? Does it improve with slow motion?',
    t7Title: 'Task 7 · Final speed',
    t7Intro: 'Just before touching the floor, the horizontal component is still v0 and the vertical one is g·t. With the height: v = √(v0² + 2gH).',
    colVf: 'final v ± Δv [m/s]',
    colAngle: 'Angle below horizontal [°]',
    t7Note: 'It assumes an ideal projectile (no air, constant g). The uncertainty propagates v0, H and g.',
    t7Prompt: 'How much faster is the ball when it reaches the floor than when it left the table? What matters more: v0 or H?',
    t8Title: 'Task 8 · Marble and ping-pong ball',
    t8Intro: 'Same track and same marks. Difference of each result between the two balls, in units of the combined uncertainty.',
    colDiff: 'Difference (in σ)',
    colRatio: 'Ratio',
    t8Prompt: 'How does the motion of the two balls differ: launch speed, range, time? Why? Think of mass, size, one being hollow, rolling and the air.',
    t9Title: 'Task 9 · Ideal projectile',
    t9Intro: 'To be an ideal projectile certain conditions must hold. For each one decide whether it held in your experiment and what effect it had on your data.',
    t9Items: [
      'Which forces act on the body from the moment it leaves the table?',
      'Was the launch velocity exactly horizontal? Was the rail levelled sideways?',
      'Is the acceleration of gravity constant over the whole fall?',
      'Can the ball be treated as a point? Does it spin? Does its size matter?',
      'Does the table edge let the ball leave undisturbed?',
      'Which other factors of the set-up or the measurement (time, range, heights) could have shifted your results?',
    ],
    t9Prompt: 'Write your answer: which conditions held, which did not and which factors caused the deviations.',
    correlationNote: 'The reaction bias is common to all marks: the errors of the rows are not independent.',
  },
}
