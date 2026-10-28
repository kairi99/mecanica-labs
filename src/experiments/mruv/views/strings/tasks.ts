// Names of the guide's analysis tasks (section 1.4) for the checklist of the analysis panel.
import type { Strings } from '../view.ts'

export interface TaskStrings { labels: Record<string, string> }

export const strings: Strings<TaskStrings> = {
  es: {
    labels: {
      t1: 'Tarea 1 · Tiempo medio de cada posición con su incertidumbre',
      t2: 'Tarea 2 · Velocidad media en todo el recorrido',
      t3: 'Tarea 3 · Velocidad media en intervalos de 30 cm',
      t4: 'Tarea 4 · Velocidad media en intervalos de 10 cm',
      t5: 'Tarea 5 · Diferencia entre las velocidades de las tareas 2, 3 y 4',
      t6: 'Tarea 6 · Gráfica x(t), ajuste y significado de la pendiente de la tangente',
      t7: 'Tarea 7 · Velocidad en función del tiempo v(t)',
      t8: 'Tarea 8 · Aceleración a partir de v(t)',
      t9: 'Tarea 9 · Velocidad final y su relación con la velocidad media',
      t10: 'Tarea 10 · ¿Se puede concluir que es un MRUV? Justificación',
    },
  },
  en: {
    labels: {
      t1: 'Task 1 · Mean time of each position with its uncertainty',
      t2: 'Task 2 · Mean velocity over the whole path',
      t3: 'Task 3 · Mean velocity over 30 cm intervals',
      t4: 'Task 4 · Mean velocity over 10 cm intervals',
      t5: 'Task 5 · Difference between the velocities of tasks 2, 3 and 4',
      t6: 'Task 6 · x(t) graph, fit and meaning of the tangent slope',
      t7: 'Task 7 · Velocity as a function of time v(t)',
      t8: 'Task 8 · Acceleration from v(t)',
      t9: 'Task 9 · Final velocity and how it relates to the mean velocity',
      t10: 'Task 10 · Can we conclude it is MRUV? Justification',
    },
  },
}
