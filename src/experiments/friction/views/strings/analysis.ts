import type { Strings } from '../view.ts'

export interface AnalysisStrings {
  title: string
  intro: string
  needM: string
  face: { cloth: string; sandpaper: string }
  bar: { wood: string; aluminium: string; iron: string }
  s1: string
  s1intro: string
  colFace: string
  colMass: string
  colW: string
  colF: string
  noData: string
  plotAria: string
  axisW: string
  axisF: string
  fitHead: string
  fitLine: string
  fitIntercept: string
  fitNote: string
  atStop: string
  s2: string
  s2intro: string
  colFmax: string
  colMus: string
  s3: string
  s3intro: string
  colTrial: string
  colH: string
  colT: string
  colTheta: string
  colA: string
  colMu: string
  muMean: string
  lit: string
  litIntro: string
  litRow: string
  litValue: string
  litSource: string
  litError: string
  litVerdict: { within1: string; within2: string; beyond2: string }
  litNone: string
  tasks: string
  tasksIntro: string
  taskLabels: { diagram: string; slope: string; exp1static: string; surfaces: string; exp3static: string; largest: string; shown: string }
  csvTables: string
  csvResults: string
  teacher: string
  teacherLine: string
  plotS1: string
  errSmall: string
  plotS2: string
}

export const strings: Strings<AnalysisStrings> = {
  es: {
    title: 'Análisis',
    intro: 'Cálculos de la sección 4.4 de la guía con tus propios datos. La aplicación calcula; las preguntas de interpretación las respondes tú.',
    needM: 'Falta la masa M del taco: mídela con la balanza (paso Experimento 1).',
    face: { cloth: 'Tela', sandpaper: 'Lija' },
    bar: { wood: 'Madera', aluminium: 'Aluminio', iron: 'Hierro' },
    s1: 'Experimento 1 · fuerza media y recta F contra W',
    s1intro: 'Se grafica la fuerza media contra el peso W = (M + m) g del taco con sus masas. La recta se ajusta con pesos 1/(ΔF)²; su incertidumbre se amplía si el ajuste es pobre.',
    colFace: 'Cara', colMass: 'Masa añadida', colW: 'W [N]', colF: 'F̄ ± ΔF [N]',
    noData: 'Aún faltan datos.',
    plotAria: 'Fuerza media en función del peso para la tela y la lija, con las rectas ajustadas',
    axisW: 'W [N]', axisF: 'F [N]',
    fitHead: 'Rectas ajustadas',
    fitLine: '{face}: pendiente = {m} ± {s}',
    fitIntercept: 'ordenada en el origen = {b} ± {sb} N',
    fitNote: 'La pendiente y la ordenada se interpretan con tu diagrama de cuerpo libre (tarea 1); la aplicación no las interpreta por ti.',
    atStop: 'En {n} fila(s) todas las lecturas están en el tope de 1 N: la fuerza real es mayor. Repite con el dinamómetro de 2 N.',
    s2: 'Experimento 2 · coeficiente a partir de la fuerza máxima',
    s2intro: 'μ = F̄máx / (M g), con M la masa del taco sin masas añadidas.',
    colFmax: 'F̄máx ± ΔF [N]', colMus: 'μ ± δμ',
    s3: 'Experimento 3 · barras en el riel',
    s3intro: 'θ = arcsen(h / L) con L = 1,10 m; a = 2d / t² con d = 1,00 m; μ = tan θ − a / (g cos θ) en cada intento.',
    colTrial: 'No.', colH: 'h [m]', colT: 't [s]', colTheta: 'θ [°]', colA: 'a [m/s²]', colMu: 'μ',
    muMean: 'μ̄ ± δμ',
    lit: 'Comparación con la literatura',
    litIntro: 'Busca en una fuente confiable el coeficiente de cada par de superficies, escribe el valor y cita la fuente. La aplicación no te da valores de la literatura; solo calcula el error relativo y lo compara con tu incertidumbre.',
    litRow: '{what}: {mu}',
    litValue: 'Valor de la literatura', litSource: 'Fuente (autor, título, año o enlace)',
    litError: 'Error relativo: {e} %',
    litVerdict: { within1: 'Dentro de 1 incertidumbre combinada.', within2: 'Dentro de 2 incertidumbres combinadas.', beyond2: 'Fuera de 2 incertidumbres combinadas.' },
    litNone: 'Sin resultado todavía.',
    tasks: 'Preguntas de la guía',
    tasksIntro: 'Escribe tus respuestas con tus datos. No se guardan fuera de este navegador.',
    taskLabels: {
      diagram: 'Diagrama de cuerpo libre y expresión de la fuerza aplicada en función del coeficiente y del peso (tarea 1).',
      slope: '¿Qué representa la pendiente de la recta? (tarea 3)',
      exp1static: '¿Los coeficientes de los experimentos 1 y 2 son estáticos o cinéticos? (tarea 5)',
      surfaces: '¿El coeficiente depende de una sola superficie o de las dos en contacto? (tarea 6)',
      exp3static: '¿Los coeficientes del experimento 3 son estáticos o cinéticos? (tarea 6 del experimento 3)',
      largest: '¿Qué pares de superficies tienen el mayor coeficiente?',
      shown: '¿Se mostró que el coeficiente estático es mayor que el cinético?',
    },
    csvTables: 'Descargar las tablas (CSV)', csvResults: 'Descargar los resultados (CSV)',
    teacher: 'Modo docente', teacherLine: 'Valor del modelo para {what}: {v}',
    plotS1: 'Tela', plotS2: 'Lija',
    errSmall: 'Barras de error menores que el marcador. Tela: círculos y línea continua; lija: cuadrados y línea discontinua.',
  },
  en: {
    title: 'Analysis',
    intro: 'Calculations of section 4.4 of the guide with your own data. The app computes; the interpretation questions are yours to answer.',
    needM: 'The block\'s mass M is missing: measure it with the balance (Experiment 1 step).',
    face: { cloth: 'Cloth', sandpaper: 'Sandpaper' },
    bar: { wood: 'Wood', aluminium: 'Aluminium', iron: 'Iron' },
    s1: 'Experiment 1 · mean force and the F against W line',
    s1intro: 'The mean force is plotted against the weight W = (M + m) g of the block with its masses. The line is fitted with weights 1/(ΔF)²; its uncertainty is widened when the fit is poor.',
    colFace: 'Face', colMass: 'Added mass', colW: 'W [N]', colF: 'F̄ ± ΔF [N]',
    noData: 'Data are still missing.',
    plotAria: 'Mean force against weight for cloth and sandpaper, with the fitted lines',
    axisW: 'W [N]', axisF: 'F [N]',
    fitHead: 'Fitted lines',
    fitLine: '{face}: slope = {m} ± {s}',
    fitIntercept: 'intercept = {b} ± {sb} N',
    fitNote: 'You interpret the slope and the intercept with your free-body diagram (task 1); the app does not interpret them for you.',
    atStop: 'In {n} row(s) every reading is at the 1 N stop: the real force is larger. Repeat with the 2 N spring scale.',
    s2: 'Experiment 2 · coefficient from the largest force',
    s2intro: 'μ = F̄max / (M g), with M the block\'s mass without added masses.',
    colFmax: 'F̄max ± ΔF [N]', colMus: 'μ ± δμ',
    s3: 'Experiment 3 · bars on the rail',
    s3intro: 'θ = arcsin(h / L) with L = 1.10 m; a = 2d / t² with d = 1.00 m; μ = tan θ − a / (g cos θ) in each try.',
    colTrial: 'No.', colH: 'h [m]', colT: 't [s]', colTheta: 'θ [°]', colA: 'a [m/s²]', colMu: 'μ',
    muMean: 'μ̄ ± δμ',
    lit: 'Comparison with the literature',
    litIntro: 'Look up the coefficient of each pair of surfaces in a reliable source, type the value and cite the source. The app gives you no literature values; it only computes the relative error and compares it with your uncertainty.',
    litRow: '{what}: {mu}',
    litValue: 'Literature value', litSource: 'Source (author, title, year or link)',
    litError: 'Relative error: {e} %',
    litVerdict: { within1: 'Within 1 combined uncertainty.', within2: 'Within 2 combined uncertainties.', beyond2: 'Beyond 2 combined uncertainties.' },
    litNone: 'No result yet.',
    tasks: 'Questions of the guide',
    tasksIntro: 'Write your answers with your data. They are not stored outside this browser.',
    taskLabels: {
      diagram: 'Free-body diagram and an expression for the applied force in terms of the coefficient and the weight (task 1).',
      slope: 'What does the slope of the line represent? (task 3)',
      exp1static: 'Are the coefficients of experiments 1 and 2 static or kinetic? (task 5)',
      surfaces: 'Does the coefficient depend on one surface or on both in contact? (task 6)',
      exp3static: 'Are the coefficients of experiment 3 static or kinetic? (task 6 of experiment 3)',
      largest: 'Which pairs of surfaces have the largest coefficient?',
      shown: 'Was it shown that the static coefficient is larger than the kinetic one?',
    },
    csvTables: 'Download the tables (CSV)', csvResults: 'Download the results (CSV)',
    teacher: 'Teacher mode', teacherLine: 'Model value for {what}: {v}',
    plotS1: 'Cloth', plotS2: 'Sandpaper',
    errSmall: 'Error bars smaller than the marker. Cloth: circles and solid line; sandpaper: squares and dashed line.',
  },
}
