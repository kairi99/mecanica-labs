import type { Strings } from '../view.ts'

export interface AnalysisStrings {
  title: string
  intro: string
  statusEmpty: string
  statusPartial: string
  statusFit: string
  needFit: string
  needFitShort: string
  exportCsv: string
  fileName: string
  info: string
  // task 1
  t1Title: string
  t1Note: string
  t1OneReading: string
  colX: string; colN: string; colMean: string; colSd: string; colUA: string; colURes: string; colUReact: string; colU: string
  noData: string
  // tasks 2 to 5
  t25Title: string
  t2Title: string
  t3Title: string
  t4Title: string
  t5Title: string
  t5Body: string
  colInterval: string
  colV: string
  intervalFmt: string
  vNote: string
  correlationTip: string
  // task 6
  t6Title: string
  t6Note: string
  plotXtAria: string
  axisT: string
  axisXm: string
  legReadings: string
  legMeans: string
  legFit: string
  legTangent: string
  coefTitle: string
  coefC0: string; coefC1: string; coefC2: string
  chi2: string
  chi2Hint: string
  tangentLabel: string
  tangentRead: string
  tangentQuestion: string
  // tasks 7-8
  t78Title: string
  t78Note: string
  plotVtAria: string
  axisV: string
  legV: string
  legBand: string
  vOfT: string
  aResult: string
  aNote: string
  // task 9
  t9Title: string
  t9Fitted: string
  t9Twice: string
  t9Note: string
  // task 10
  t10Title: string
  t10Body: string
  plotResAria: string
  axisRes: string
  legRes: string
  legZero: string
  // comparison
  cmpTitle: string
  cmpIntro: string
  cmpYours: string
  cmpRef: string
  cmpRefNone: string
  cmpModel: string
  cmpModelNote: string
  cmpOffsetsTitle: string
  cmpOffsetsNote: string
  cmpNoOffsets: string
  cmpColMark: string
  cmpColN: string
  cmpColOffset: string
  unitS: string
  // csv
  csvT1: string; csvVelocity: string; csvFit: string; csvTask9: string; csvCompare: string
  csvColInterval: string; csvColV: string; csvColSigma: string; csvColValue: string; csvColQuantity: string
  csvC0: string; csvC1: string; csvC2: string; csvA: string; csvChi2: string; csvVfit: string; csvVtwice: string; csvRef: string; csvModel: string
}

export const strings: Strings<AnalysisStrings> = {
  es: {
    title: 'Análisis (sección 1.4)',
    intro: 'Se calcula solo, con los valores de tu Tabla 1.1, y se actualiza mientras la llenas. Las preguntas de la guía las respondes tú.',
    statusEmpty: 'Llena la Tabla 1.1 (10 tiempos por marca, de 10 a 90 cm) para ver los resultados.',
    statusPartial: 'Con {k} marcas con datos ({n} lecturas). Para la regresión necesitas al menos 3 marcas con 2 lecturas cada una.',
    statusFit: '{k} marcas con datos, {n} lecturas en total.',
    needFit: 'Aún no hay suficientes datos para ajustar: se necesitan al menos 3 marcas con 2 o más lecturas cada una (ahora hay {k}).',
    needFitShort: 'Faltan datos para el ajuste ({k} de 3 marcas).',
    exportCsv: 'Exportar resultados (CSV)',
    fileName: 'analisis-mruv.csv',
    info: 'Más información',
    t1Title: 'Tarea 1 · Tiempo medio de cada posición con su incertidumbre',
    t1Note: 'u(t̄) = √(u_A² + u_res² + u_reac²). u_A = s/√n (tipo A, dispersión de tus lecturas). u_res = 0,01 s/√12 (tipo B, pantalla digital). u_reac = 0,1 s/√3 (tipo B, supuesto: el sesgo medio entre pulsar iniciar y detener es de ±0,1 s; es común a todas tus lecturas y no se reduce al promediar).',
    t1OneReading: 'Con una sola lectura no se puede estimar u_A.',
    colX: 'x (cm)', colN: 'n', colMean: 't̄ ± u (s)', colSd: 's (s)', colUA: 's/√n (s)', colURes: 'u_res (s)', colUReact: 'u_reac (s)', colU: 'u(t̄) (s)',
    noData: 'sin datos',
    t25Title: 'Tareas 2 a 5 · Velocidad media',
    t2Title: 'Tarea 2 · Todo el recorrido',
    t3Title: 'Tarea 3 · Intervalos de 30 cm',
    t4Title: 'Tarea 4 · Intervalos de 10 cm',
    t5Title: 'Tarea 5 · Compara',
    t5Body: 'Mira los tres conjuntos de velocidades medias, lado a lado. ¿En qué se diferencian? ¿Por qué? Respóndelo con tus palabras.',
    colInterval: 'Intervalo (cm)', colV: 'v̄ ± σ (m/s)',
    intervalFmt: '{a} a {b}',
    vNote: 'v̄ = Δx/Δt, con σ propagada desde la incertidumbre de la posición (escala de la riel) y la de los tiempos medios.',
    correlationTip: 'Los intervalos consecutivos comparten el tiempo (y la posición) de la marca común, así que sus velocidades están correlacionadas; cada σ se calculó como si el intervalo fuera independiente.',
    t6Title: 'Tarea 6 · Gráfica x(t) y ajuste',
    t6Note: 'Puntos claros: cada lectura. Cuadrados: media con barra horizontal ± u(t̄). Curva: ajuste cuadrático x = c₀ + c₁t + c₂t², con el método de varianza efectiva (los tiempos son la variable con ruido). El punto (0, 0) del lanzamiento entra en el ajuste con la incertidumbre de colocar el carro.',
    plotXtAria: 'Gráfica de posición x en función del tiempo t con las lecturas, las medias, el ajuste y la tangente',
    axisT: 't (s)', axisXm: 'x (m)',
    legReadings: 'Lecturas (○)', legMeans: 'Medias ± u (■)', legFit: 'Ajuste (—)', legTangent: 'Tangente (- -)',
    coefTitle: 'Coeficientes del ajuste',
    coefC0: 'c₀ (m)', coefC1: 'c₁ (m/s)', coefC2: 'c₂ (m/s²)',
    chi2: 'χ² reducida = {x} ({dof} grados de libertad)',
    chi2Hint: 'Cerca de 1: las barras de error describen la dispersión. Mucho menor: sobrestimas las incertidumbres. Mucho mayor: faltan efectos que las barras no incluyen.',
    tangentLabel: 'Tiempo de la tangente',
    tangentRead: 't = {t} s · x(t) = {x} m · pendiente de la tangente = {v} m/s',
    tangentQuestion: 'Mueve el control y observa la pendiente de la tangente. ¿Qué representa? Responde con tus palabras.',
    t78Title: 'Tareas 7 y 8 · v(t) y aceleración',
    t78Note: 'De la regresión de la tarea 6: v(t) = c₁ + 2c₂t. La banda es ± una desviación estándar propagada con la covarianza del ajuste.',
    plotVtAria: 'Gráfica de la velocidad v en función del tiempo con su banda de incertidumbre',
    axisV: 'v (m/s)',
    legV: 'v(t) (—)', legBand: 'Banda ± σ',
    vOfT: 'v(t) = ({c1}) + 2·({c2})·t',
    aResult: 'a = 2c₂ = {a} m/s²',
    aNote: 'No tiene por qué ser igual a g·sen θ: la inercia de rotación de las ruedas y la fricción la reducen.',
    t9Title: 'Tarea 9 · Velocidad final',
    t9Fitted: 'v(t̄₉₀) del ajuste: {v} m/s',
    t9Twice: '2 × velocidad media de 0 a 90 cm: {v} m/s',
    t9Note: 'Compara los dos valores y relaciónalos. Piensa en la pregunta 3 del trabajo preparatorio.',
    t10Title: 'Tarea 10 · ¿Es un MRUV?',
    t10Body: 'Los residuos x − x_ajuste frente a t, con su incertidumbre efectiva. Mira si se reparten alrededor de cero, sin una forma sistemática, comparados con sus barras. Justifica tu conclusión con esto y con lo que sabes de las fuentes de error.',
    plotResAria: 'Gráfica de los residuos del ajuste en función del tiempo',
    axisRes: 'x − x_aj (mm)',
    legRes: 'Residuo ± σ (●)', legZero: 'Cero (- -)',
    cmpTitle: 'Contraste con la referencia del DigiCart',
    cmpIntro: 'Para ver cuánto pesa tu cronómetro. Usa lo que el DigiCart registró de verdad en tus corridas.',
    cmpYours: 'Tu a: {a} m/s²',
    cmpRef: 'a de referencia (ajuste de los tiempos verdaderos de {n} corridas): {a} m/s²',
    cmpRefNone: 'Aún no hay suficientes corridas para la referencia.',
    cmpModel: 'a esperada por el modelo (docente): {a} m/s²',
    cmpModelNote: 'Con parámetros supuestos; consulta PARAMETERS.md.',
    cmpOffsetsTitle: 'Desfase medio de tus lecturas (tu lectura − tiempo verdadero)',
    cmpOffsetsNote: 'Un desfase constante positivo en todas las marcas es el sesgo sistemático de tu reacción: promediar más lecturas no lo quita.',
    cmpNoOffsets: 'Aún no hay lecturas copiadas del cronómetro para comparar (las escritas a mano no tienen tiempo verdadero asociado).',
    cmpColMark: 'x (cm)', cmpColN: 'n', cmpColOffset: 'Desfase medio (s)',
    unitS: 's',
    csvT1: 'Tarea 1', csvVelocity: 'Tareas 2 a 4: velocidad media', csvFit: 'Tareas 6 a 8: ajuste', csvTask9: 'Tarea 9', csvCompare: 'Contraste',
    csvColInterval: 'Intervalo (cm)', csvColV: 'v (m/s)', csvColSigma: 'sigma', csvColValue: 'Valor', csvColQuantity: 'Magnitud',
    csvC0: 'c0 (m)', csvC1: 'c1 (m/s)', csvC2: 'c2 (m/s2)', csvA: 'a = 2 c2 (m/s2)', csvChi2: 'chi2 reducida',
    csvVfit: 'v(t90) del ajuste (m/s)', csvVtwice: '2 x v media 0-90 cm (m/s)', csvRef: 'a de referencia DigiCart (m/s2)', csvModel: 'a del modelo (m/s2)',
  },
  en: {
    title: 'Analysis (section 1.4)',
    intro: 'It computes by itself from the values in your Table 1.1 and updates as you fill it. You answer the guide\'s questions.',
    statusEmpty: 'Fill Table 1.1 (10 times per mark, 10 to 90 cm) to see the results.',
    statusPartial: 'With {k} marks with data ({n} readings). For the regression you need at least 3 marks with 2 readings each.',
    statusFit: '{k} marks with data, {n} readings in total.',
    needFit: 'Not enough data to fit yet: you need at least 3 marks with 2 or more readings each (now {k}).',
    needFitShort: 'More data needed for the fit ({k} of 3 marks).',
    exportCsv: 'Export results (CSV)',
    fileName: 'mruv-analysis.csv',
    info: 'More information',
    t1Title: 'Task 1 · Mean time of each position with its uncertainty',
    t1Note: 'u(t̄) = √(u_A² + u_res² + u_react²). u_A = s/√n (Type A, the scatter of your readings). u_res = 0.01 s/√12 (Type B, digital display). u_react = 0.1 s/√3 (Type B, assumed: the mean bias between pressing start and stop is within ±0.1 s; it is common to all your readings and does not average down).',
    t1OneReading: 'With a single reading u_A cannot be estimated.',
    colX: 'x (cm)', colN: 'n', colMean: 't̄ ± u (s)', colSd: 's (s)', colUA: 's/√n (s)', colURes: 'u_res (s)', colUReact: 'u_react (s)', colU: 'u(t̄) (s)',
    noData: 'no data',
    t25Title: 'Tasks 2 to 5 · Mean velocity',
    t2Title: 'Task 2 · Whole path',
    t3Title: 'Task 3 · 30 cm intervals',
    t4Title: 'Task 4 · 10 cm intervals',
    t5Title: 'Task 5 · Compare',
    t5Body: 'Look at the three sets of mean velocities side by side. How do they differ? Why? Answer in your own words.',
    colInterval: 'Interval (cm)', colV: 'v̄ ± σ (m/s)',
    intervalFmt: '{a} to {b}',
    vNote: 'v̄ = Δx/Δt, with σ propagated from the position uncertainty (rail scale) and that of the mean times.',
    correlationTip: 'Consecutive intervals share the time (and position) of their common mark, so their velocities are correlated; each σ was computed as if the interval were independent.',
    t6Title: 'Task 6 · x(t) plot and fit',
    t6Note: 'Light dots: every reading. Squares: mean with a horizontal ± u(t̄) bar. Curve: quadratic fit x = c₀ + c₁t + c₂t², with the effective-variance method (times are the noisy variable). The release point (0, 0) is in the fit with the uncertainty of placing the cart.',
    plotXtAria: 'Plot of position x against time t with the readings, the means, the fit and the tangent',
    axisT: 't (s)', axisXm: 'x (m)',
    legReadings: 'Readings (○)', legMeans: 'Means ± u (■)', legFit: 'Fit (—)', legTangent: 'Tangent (- -)',
    coefTitle: 'Fit coefficients',
    coefC0: 'c₀ (m)', coefC1: 'c₁ (m/s)', coefC2: 'c₂ (m/s²)',
    chi2: 'reduced χ² = {x} ({dof} degrees of freedom)',
    chi2Hint: 'Near 1: the error bars describe the scatter. Much lower: you overestimate the uncertainties. Much higher: effects the bars do not include.',
    tangentLabel: 'Tangent time',
    tangentRead: 't = {t} s · x(t) = {x} m · tangent slope = {v} m/s',
    tangentQuestion: 'Move the control and watch the slope of the tangent. What does it represent? Answer in your own words.',
    t78Title: 'Tasks 7 and 8 · v(t) and acceleration',
    t78Note: 'From the regression of task 6: v(t) = c₁ + 2c₂t. The band is ± one standard deviation propagated with the covariance of the fit.',
    plotVtAria: 'Plot of velocity v against time t with its uncertainty band',
    axisV: 'v (m/s)',
    legV: 'v(t) (—)', legBand: 'Band ± σ',
    vOfT: 'v(t) = ({c1}) + 2·({c2})·t',
    aResult: 'a = 2c₂ = {a} m/s²',
    aNote: 'It need not equal g·sin θ: the rotational inertia of the wheels and friction lower it.',
    t9Title: 'Task 9 · Final velocity',
    t9Fitted: 'v(t̄₉₀) from the fit: {v} m/s',
    t9Twice: '2 × mean velocity from 0 to 90 cm: {v} m/s',
    t9Note: 'Compare the two values and relate them. Think of question 3 of the preparatory work.',
    t10Title: 'Task 10 · Is it MRUV?',
    t10Body: 'The residuals x − x_fit against t, with their effective uncertainty. Look at whether they scatter around zero with no systematic shape, compared with their bars. Justify your conclusion with this and with what you know about the sources of error.',
    plotResAria: 'Plot of the fit residuals against time',
    axisRes: 'x − x_fit (mm)',
    legRes: 'Residual ± σ (●)', legZero: 'Zero (- -)',
    cmpTitle: 'Check against the DigiCart reference',
    cmpIntro: 'To see how much your stopwatch weighs. It uses what the DigiCart really logged in your runs.',
    cmpYours: 'Your a: {a} m/s²',
    cmpRef: 'Reference a (fit of the true times of {n} runs): {a} m/s²',
    cmpRefNone: 'Not enough runs for the reference yet.',
    cmpModel: 'Expected a from the model (teacher): {a} m/s²',
    cmpModelNote: 'With assumed parameters; see PARAMETERS.md.',
    cmpOffsetsTitle: 'Mean offset of your readings (your reading − true time)',
    cmpOffsetsNote: 'A constant positive offset at every mark is the systematic bias of your reaction: averaging more readings does not remove it.',
    cmpNoOffsets: 'No readings copied from the stopwatch to compare yet (typed ones have no true time attached).',
    cmpColMark: 'x (cm)', cmpColN: 'n', cmpColOffset: 'Mean offset (s)',
    unitS: 's',
    csvT1: 'Task 1', csvVelocity: 'Tasks 2 to 4: mean velocity', csvFit: 'Tasks 6 to 8: fit', csvTask9: 'Task 9', csvCompare: 'Check',
    csvColInterval: 'Interval (cm)', csvColV: 'v (m/s)', csvColSigma: 'sigma', csvColValue: 'Value', csvColQuantity: 'Quantity',
    csvC0: 'c0 (m)', csvC1: 'c1 (m/s)', csvC2: 'c2 (m/s2)', csvA: 'a = 2 c2 (m/s2)', csvChi2: 'reduced chi2',
    csvVfit: 'v(t90) from the fit (m/s)', csvVtwice: '2 x mean v 0-90 cm (m/s)', csvRef: 'DigiCart reference a (m/s2)', csvModel: 'model a (m/s2)',
  },
}
