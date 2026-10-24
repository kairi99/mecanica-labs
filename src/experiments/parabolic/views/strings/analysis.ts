import type { Strings } from '../view.ts'

export interface AnalysisStrings { title: string; soon: string; body: string }

export const strings: Strings<AnalysisStrings> = {
  es: {
    title: 'Análisis',
    soon: 'Disponible pronto',
    body: 'Aquí se calcularán los tiempos y alcances promedio con su incertidumbre, la rapidez inicial y la comparación con el tiempo esperado, siguiendo las tareas de la sección 2.4 de la guía. Por ahora llena la Tabla 2.1.',
  },
  en: {
    title: 'Analysis',
    soon: 'Coming soon',
    body: 'This will compute the mean times and ranges with their uncertainty, the initial speed and the comparison with the expected time, following the tasks of section 2.4 of the guide. For now, fill Table 2.1.',
  },
}
