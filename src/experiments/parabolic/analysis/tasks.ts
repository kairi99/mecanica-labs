// Guide section 2.4 analysis tasks 1 to 9 and when each counts as complete (pure; the theory unlocks when all do).
import { taskCompletion, type Completion, type TaskSpec } from '../../../core/theory.ts'

/** Data the panel computes from Tabla 2.1: any ball with pooled data, both balls with data, and the expected flight time (needs the typed height). */
export interface ParabolicTaskData { data: boolean; both: boolean; expected: boolean }

export const PARABOLIC_TASKS: readonly TaskSpec[] = [
  { id: 't1' },
  { id: 't2', needs: ['data'] },
  { id: 't3', needs: ['data'] },
  { id: 't4', needs: ['data'] },
  { id: 't5', needs: ['expected'] },
  { id: 't6', needs: ['data', 'expected'] },
  { id: 't7', needs: ['data', 'expected'] },
  { id: 't8', needs: ['both'] },
  { id: 't9' },
]
export const PARABOLIC_TASK_IDS: readonly string[] = PARABOLIC_TASKS.map((t) => t.id)

/** Written tasks (1, 9) only need the tick; the ones with numbers in the panel also need the data. */
export function parabolicCompletion(ticks: ReadonlySet<string>, data: ParabolicTaskData): Completion {
  return taskCompletion(PARABOLIC_TASKS, ticks, { ...data })
}
