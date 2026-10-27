import type { Strings } from '../view.ts'

export interface AnalysisStrings {
  title: string
  intro: string
  status: string
  gateTable: string
  // tasks 2 and 3
  t23: string
  t23Intro: string
  colTrial: string
  colF: string
  colN: string
  colT: string
  colA: string
  colMasses: string
  uncertaintyNote: string
  reactionNote: string
  // task 4
  t4: string
  t4Body: string
  // task 5
  t5: string
  t5Intro: string
  gate5: string
  plotAria: string
  axisA: string
  axisF: string
  legendPoints: string
  legendFit: string
  fitLine: string
  slopeCaption: string
  slopeValue: string
  interceptCaption: string
  interceptValue: string
  errSmall: string
  chi2: string
  chi2Hint: string
  t5Prompt: string
  // task 6
  t6: string
  gate6: string
  mFit: string
  mMeasured: string
  errorPct: string
  agreement: Record<'within1' | 'within2' | 'beyond2', string>
  t6Note: string
  plasticNote: string
  reactionEffect: string
  // tasks 1, 7, 8
  t1: string
  t1Body: string
  t78: string
  t78Body: string
  teacherTitle: string
  teacherBody: string
  exportCsv: string
  fileName: string
  noData: string
}

export const strings: Strings<AnalysisStrings> = {
  es: {
    title: 'Análisis · Fuerza y aceleración',
    intro: 'Las tareas de la sección de análisis de la guía. La aplicación calcula los números a partir de tu Tabla 3.1; las preguntas de explicación las respondes tú.',
    status: '{n} pruebas con fuerza y al menos 2 tiempos.',
    gateTable: 'Llena la Tabla 3.1 (la fuerza y al menos 2 tiempos por prueba) para ver el análisis.',
    t23: 'Tareas 2 y 3 · Tiempo medio y aceleración',
    t23Intro: 'Para cada fuerza: el tiempo medio de los 90 cm con su incertidumbre, y la aceleración a = 2d/t² (parte del reposo, aceleración constante) con la incertidumbre propagada.',
    colTrial: 'Prueba', colF: 'F (N)', colN: 'n', colT: 't medio ± Δt (s)', colA: 'a ± Δa (m/s²)', colMasses: 'Masas en el contenedor',
    uncertaintyNote: 'Δt combina la dispersión de tus lecturas (tipo A, s/√n), la resolución del cronómetro (tipo B, 0,01 s/√12) y el sesgo de reacción (tipo B). Δa propaga Δt y la incertidumbre de los 90 cm, sin el sesgo de reacción: ese es común a todas las lecturas y se muestra aparte.',
    reactionNote: 'Un sesgo de reacción común de {s} s cambiaría la masa del ajuste en {m} % y F₀ en {f} N.',
    t4: 'Tarea 4 · Segunda ley de Newton',
    t4Body: 'Escribe tú la segunda ley de Newton para el sistema de la figura 3.2 (masa M sobre una superficie horizontal sin fricción, atada con un hilo ideal a una masa colgante m). Aquí no se da la respuesta.',
    t5: 'Tarea 5 · Fuerza contra aceleración',
    t5Intro: 'Cada punto es una prueba. Las barras son las incertidumbres. La recta es el ajuste por mínimos cuadrados ponderados F = M · a + F₀ (M es la masa del ajuste y F₀ la ordenada al origen), que tiene en cuenta la incertidumbre de ambas variables (método de la varianza efectiva).',
    gate5: 'Se necesitan al menos 2 pruebas completas para trazar la recta.',
    plotAria: 'Gráfica de la fuerza contra la aceleración con las barras de incertidumbre y la recta de ajuste',
    axisA: 'a (m/s²)', axisF: 'F (N)',
    legendPoints: 'Puntos medidos', legendFit: 'Ajuste F = M · a + F₀',
    fitLine: 'Ajuste',
    slopeCaption: 'Pendiente (masa del ajuste)', slopeValue: '{m} kg',
    interceptCaption: 'Ordenada al origen F₀', interceptValue: '{f} N',
    errSmall: 'Las barras de incertidumbre son más pequeñas que los círculos: no faltan, no se distinguen a esta escala.',
    chi2: 'χ² reducido: {c}',
    chi2Hint: 'Cerca de 1 si las incertidumbres explican la dispersión. Un valor muy alto señala un error sistemático o un modelo incompleto; uno muy bajo, incertidumbres sobreestimadas (con 2 o 3 puntos casi siempre sale así).',
    t5Prompt: '¿Qué representa la pendiente? ¿Y la ordenada? Respóndelo tú con tus palabras.',
    t6: 'Tarea 6 · Masa del ajuste contra la masa medida',
    gate6: 'Anota Mt con la balanza (paso 3) para comparar.',
    mFit: 'Masa del ajuste: {m} kg',
    mMeasured: 'Masa medida Mt (balanza): {m} kg',
    errorPct: 'Error porcentual: {e} %',
    agreement: { within1: 'La diferencia es menor que 1 incertidumbre combinada.', within2: 'La diferencia está entre 1 y 2 incertidumbres combinadas.', beyond2: 'La diferencia supera 2 incertidumbres combinadas.' },
    t6Note: 'La incertidumbre combinada junta la del ajuste y la de la balanza. Que la masa del ajuste no coincida con Mt no es un fallo de la aplicación: busca en qué se diferencia el sistema real del ideal.',
    plasticNote: 'Mt se pesó una vez; con cada masa que pasaste al DigiCart el sistema ganó un tornillo de plástico.',
    reactionEffect: 'Efecto de un sesgo de reacción de {s} s: la masa del ajuste cambia {m} %.',
    t1: 'Tarea 1 · ¿MRU o MRUV?',
    t1Body: 'Mira la gráfica x(t) del registro del DigiCart (paso 4) y los tiempos que mediste: decide y justifica. Aquí no se da la respuesta.',
    t78: 'Tareas 7 y 8 · Validez y fuentes de error',
    t78Body: 'Responde con tus propias palabras si este experimento permite comprobar la segunda ley de Newton y qué fuentes de error influyen y cómo reducirlas. La ayuda describe las fuentes que contiene la simulación.',
    teacherTitle: 'Modo profesor',
    teacherBody: 'La guía para el profesor (docs/teacher-key-newton2.md) tiene los valores esperados del modelo.',
    exportCsv: 'Exportar CSV',
    fileName: 'analisis-3.csv',
    noData: 'Sin datos.',
  },
  en: {
    title: 'Analysis · Force and acceleration',
    intro: 'The tasks of the analysis section of the guide. The app computes the numbers from your Table 3.1; the explanation questions are yours to answer.',
    status: '{n} trials with a force and at least 2 times.',
    gateTable: 'Fill in Table 3.1 (the force and at least 2 times per trial) to see the analysis.',
    t23: 'Tasks 2 and 3 · Mean time and acceleration',
    t23Intro: 'For each force: the mean time for the 90 cm with its uncertainty, and the acceleration a = 2d/t² (starts from rest, constant acceleration) with the propagated uncertainty.',
    colTrial: 'Trial', colF: 'F (N)', colN: 'n', colT: 'mean t ± Δt (s)', colA: 'a ± Δa (m/s²)', colMasses: 'Masses in the canister',
    uncertaintyNote: 'Δt combines the scatter of your readings (type A, s/√n), the stopwatch resolution (type B, 0.01 s/√12) and the reaction bias (type B). Δa propagates Δt and the uncertainty of the 90 cm, without the reaction bias: that one is common to all readings and is shown apart.',
    reactionNote: 'A common reaction bias of {s} s would change the fitted mass by {m} % and F₀ by {f} N.',
    t4: 'Task 4 · Newton’s second law',
    t4Body: 'Write Newton’s second law yourself for the system of figure 3.2 (mass M on a frictionless horizontal surface, tied with an ideal string to a hanging mass m). The answer is not given here.',
    t5: 'Task 5 · Force against acceleration',
    t5Intro: 'Each point is one trial. The bars are the uncertainties. The line is the weighted least-squares fit F = M · a + F₀ (M is the fitted mass and F₀ the intercept), which accounts for the uncertainty of both variables (effective-variance method).',
    gate5: 'At least 2 complete trials are needed to draw the line.',
    plotAria: 'Graph of force against acceleration with the uncertainty bars and the fitted line',
    axisA: 'a (m/s²)', axisF: 'F (N)',
    legendPoints: 'Measured points', legendFit: 'Fit F = M · a + F₀',
    fitLine: 'Fit',
    slopeCaption: 'Slope (fit mass)', slopeValue: '{m} kg',
    interceptCaption: 'Intercept F₀', interceptValue: '{f} N',
    errSmall: 'The uncertainty bars are smaller than the circles: they are not missing, just too small to see at this scale.',
    chi2: 'Reduced χ²: {c}',
    chi2Hint: 'Near 1 when the uncertainties explain the scatter. A very high value points to a systematic error or an incomplete model; a very low one, to overestimated uncertainties (with 2 or 3 points it almost always comes out so).',
    t5Prompt: 'What does the slope represent? And the intercept? Answer in your own words.',
    t6: 'Task 6 · Fitted mass against measured mass',
    gate6: 'Record Mt with the balance (step 3) to compare.',
    mFit: 'Fitted mass: {m} kg',
    mMeasured: 'Measured mass Mt (balance): {m} kg',
    errorPct: 'Percent error: {e} %',
    agreement: { within1: 'The difference is smaller than 1 combined uncertainty.', within2: 'The difference is between 1 and 2 combined uncertainties.', beyond2: 'The difference exceeds 2 combined uncertainties.' },
    t6Note: 'The combined uncertainty joins that of the fit and that of the balance. The fit mass not matching Mt is not an app failure: look for how the real system differs from the ideal one.',
    plasticNote: 'Mt was weighed once; with every mass you moved to the DigiCart the system gained a plastic screw.',
    reactionEffect: 'Effect of a reaction bias of {s} s: the fit mass changes {m} %.',
    t1: 'Task 1 · MRU or MRUV?',
    t1Body: 'Look at the x(t) graph of the DigiCart log (step 4) and the times you measured: decide and justify. The answer is not given here.',
    t78: 'Tasks 7 and 8 · Validity and error sources',
    t78Body: 'Answer in your own words whether this experiment lets you check Newton’s second law, and which error sources matter and how to reduce them. The help page describes the sources the simulation contains.',
    teacherTitle: 'Teacher mode',
    teacherBody: 'The teacher key (docs/teacher-key-newton2.md) has the expected values of the model.',
    exportCsv: 'Export CSV',
    fileName: 'analysis-3.csv',
    noData: 'No data.',
  },
}
