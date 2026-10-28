// Guide section 3.4 analysis tasks 1 to 8 and when each counts as complete (pure; the theory unlocks when all do).
import { taskCompletion, type Completion, type TaskSpec } from '../../../core/theory.ts'

/** Data the panel computes from Tabla 3.1: trials with a time and a force (tasks 2, 3), the F(a) fit (5), the mass comparison (6). */
export interface Newton2TaskData { trials: boolean; fit: boolean; mass: boolean }

export const NEWTON2_TASKS: readonly TaskSpec[] = [
  { id: 't1' },
  { id: 't2', needs: ['trials'] },
  { id: 't3', needs: ['trials'] },
  { id: 't4' },
  { id: 't5', needs: ['fit'] },
  { id: 't6', needs: ['mass'] },
  { id: 't7' },
  { id: 't8' },
]
export const NEWTON2_TASK_IDS: readonly string[] = NEWTON2_TASKS.map((t) => t.id)

/** Written-on-paper tasks (1, 4, 7, 8) only need the tick; the ones with numbers in the panel also need the data. */
export function newton2Completion(ticks: ReadonlySet<string>, data: Newton2TaskData): Completion {
  return taskCompletion(NEWTON2_TASKS, ticks, { ...data })
}
