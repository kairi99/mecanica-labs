// Names of the guide's analysis tasks (section 3.4) for the checklist of the analysis panel.
import type { Strings } from '../view.ts'

export interface TaskStrings { labels: Record<string, string> }

export const strings: Strings<TaskStrings> = {
  es: {
    labels: {
      t1: 'Tarea 1 · ¿MRU o MRUV? Justificación',
      t2: 'Tarea 2 · Tiempo medio de cada ensayo con su incertidumbre',
      t3: 'Tarea 3 · Aceleración del sistema en cada ensayo',
      t4: 'Tarea 4 · Segunda ley de Newton para el sistema (cuerpo y masa colgante)',
      t5: 'Tarea 5 · Gráfica F contra a, ajuste lineal y significado de la pendiente',
      t6: 'Tarea 6 · Masa total del ajuste frente a la medida, con su error',
      t7: 'Tarea 7 · ¿Se puede comprobar la segunda ley de Newton con este experimento?',
      t8: 'Tarea 8 · Fuentes de error y cómo reducirlas',
    },
  },
  en: {
    labels: {
      t1: 'Task 1 · MRU or MRUV? Justification',
      t2: 'Task 2 · Mean time of each trial with its uncertainty',
      t3: 'Task 3 · System acceleration for each trial',
      t4: "Task 4 · Newton's second law for the system (body and hanging mass)",
      t5: 'Task 5 · F against a plot, linear fit and meaning of the slope',
      t6: 'Task 6 · Total mass from the fit against the measured one, with its error',
      t7: "Task 7 · Can Newton's second law be checked with this experiment?",
      t8: 'Task 8 · Error sources and how to reduce them',
    },
  },
}
