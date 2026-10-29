// Names of the guide's analysis tasks (section 4.4) for the checklist of the analysis panel.
import type { Strings } from '../view.ts'

export interface TaskStrings { labels: Record<string, string> }

export const strings: Strings<TaskStrings> = {
  es: {
    labels: {
      a1: 'Experimentos 1 y 2 · Tarea 1 · Diagrama de cuerpo libre y expresión de la fuerza aplicada',
      a2: 'Experimentos 1 y 2 · Tarea 2 · Fuerza media contra peso y ajuste lineal por material',
      a3: 'Experimentos 1 y 2 · Tarea 3 · Significado de la pendiente y coeficientes del experimento 1',
      a4: 'Experimentos 1 y 2 · Tarea 4 · Coeficientes del experimento 2',
      a5: 'Experimentos 1 y 2 · Tarea 5 · ¿Estáticos o cinéticos?',
      a6: 'Experimentos 1 y 2 · Tarea 6 · ¿Depende de una superficie o de las dos?',
      b1: 'Experimento 3 · Tarea 1 · Ángulo de inclinación a partir de h',
      b2: 'Experimento 3 · Tarea 2 · Aceleración de cada ensayo (MRUV)',
      b3: 'Experimento 3 · Tarea 3 · Diagrama de cuerpo libre y expresión del coeficiente',
      b4: 'Experimento 3 · Tarea 4 · Coeficiente de cada ensayo',
      b5: 'Experimento 3 · Tarea 5 · Coeficiente de cada material, media ± incertidumbre',
      b6: 'Experimento 3 · Tarea 6 · ¿Estáticos o cinéticos?',
      b7: 'Experimento 3 · Tarea 7 · Valor de la literatura y error relativo',
      g1: 'General · Tarea 1 · Pares de superficies con mayor coeficiente',
      g2: 'General · Tarea 2 · ¿Se mostró que el estático es mayor que el cinético?',
    },
  },
  en: {
    labels: {
      a1: 'Experiments 1 and 2 · Task 1 · Free-body diagram and expression for the applied force',
      a2: 'Experiments 1 and 2 · Task 2 · Mean force against weight and linear fit per material',
      a3: 'Experiments 1 and 2 · Task 3 · Meaning of the slope and coefficients of experiment 1',
      a4: 'Experiments 1 and 2 · Task 4 · Coefficients of experiment 2',
      a5: 'Experiments 1 and 2 · Task 5 · Static or kinetic?',
      a6: 'Experiments 1 and 2 · Task 6 · Does it depend on one surface or both?',
      b1: 'Experiment 3 · Task 1 · Inclination angle from h',
      b2: 'Experiment 3 · Task 2 · Acceleration of each trial (MRUV)',
      b3: 'Experiment 3 · Task 3 · Free-body diagram and expression for the coefficient',
      b4: 'Experiment 3 · Task 4 · Coefficient of each trial',
      b5: 'Experiment 3 · Task 5 · Coefficient of each material, mean ± uncertainty',
      b6: 'Experiment 3 · Task 6 · Static or kinetic?',
      b7: 'Experiment 3 · Task 7 · Literature value and relative error',
      g1: 'General · Task 1 · Surface pairs with the largest coefficient',
      g2: 'General · Task 2 · Was it shown that static is larger than kinetic?',
    },
  },
}
