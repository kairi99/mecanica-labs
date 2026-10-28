// Guide section 4.4 analysis tasks (experiments 1 and 2: 1 to 6; experiment 3: 1 to 7; general: 1 and 2) and when each counts as
// complete (pure; the theory unlocks when all do).
import { taskCompletion, type Completion, type TaskSpec } from '../../../core/theory.ts'

/**
 * Data the panel computes: the F(W) lines of Tabla 4.1 (`fit1`), the static coefficients of Tabla 4.2 (`exp2`), any incline trial of
 * Tabla 4.3 (`exp3`), the mean coefficient of a bar (`exp3Mean`), and a literature value typed by the student (`lit`).
 */
export interface FrictionTaskData { fit1: boolean; exp2: boolean; exp3: boolean; exp3Mean: boolean; lit: boolean }

export const FRICTION_TASKS: readonly TaskSpec[] = [
  { id: 'a1' },
  { id: 'a2', needs: ['fit1'] },
  { id: 'a3', needs: ['fit1'] },
  { id: 'a4', needs: ['exp2'] },
  { id: 'a5' },
  { id: 'a6' },
  { id: 'b1', needs: ['exp3'] },
  { id: 'b2', needs: ['exp3'] },
  { id: 'b3' },
  { id: 'b4', needs: ['exp3'] },
  { id: 'b5', needs: ['exp3Mean'] },
  { id: 'b6' },
  { id: 'b7', needs: ['lit'] },
  { id: 'g1' },
  { id: 'g2' },
]
export const FRICTION_TASK_IDS: readonly string[] = FRICTION_TASKS.map((t) => t.id)

/** Written tasks (diagrams, interpretation questions) only need the tick; the ones with numbers in the panel also need the data. */
export function frictionCompletion(ticks: ReadonlySet<string>, data: FrictionTaskData): Completion {
  return taskCompletion(FRICTION_TASKS, ticks, { ...data })
}
