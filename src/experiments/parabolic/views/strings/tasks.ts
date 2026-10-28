// Names of the guide's analysis tasks (section 2.4) for the checklist of the analysis panel.
import type { Strings } from '../view.ts'

export interface TaskStrings { labels: Record<string, string> }

export const strings: Strings<TaskStrings> = {
  es: {
    labels: {
      t1: 'Tarea 1 · Esquema del experimento, tipo de movimiento y dirección de la velocidad',
      t2: 'Tarea 2 · Tiempo medio y alcance medio de cada ensayo (Tabla 2.1)',
      t3: 'Tarea 3 · Qué pasa con los tiempos de vuelo entre ensayos',
      t4: 'Tarea 4 · Velocidad de lanzamiento de cada ensayo',
      t5: 'Tarea 5 · Expresión del tiempo de vuelo y tiempo esperado',
      t6: 'Tarea 6 · Tiempo esperado frente al experimental, error porcentual',
      t7: 'Tarea 7 · Velocidad final antes de llegar al suelo',
      t8: 'Tarea 8 · Diferencia entre el movimiento de la canica y el de la pelota',
      t9: 'Tarea 9 · Condiciones del movimiento ideal y causas de las desviaciones',
    },
  },
  en: {
    labels: {
      t1: 'Task 1 · Sketch, type of motion and direction of the velocity',
      t2: 'Task 2 · Mean time and mean range of each trial (Tabla 2.1)',
      t3: 'Task 3 · What happens to the flight times across trials',
      t4: 'Task 4 · Launch speed of each trial',
      t5: 'Task 5 · Expression for the flight time and expected time',
      t6: 'Task 6 · Expected against experimental time, percentage error',
      t7: 'Task 7 · Final speed just before landing',
      t8: 'Task 8 · Difference between the marble and the ping-pong ball',
      t9: 'Task 9 · Conditions of ideal motion and causes of the deviations',
    },
  },
}
