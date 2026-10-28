// Guide section 1.4 analysis tasks 1 to 10 and when each counts as complete (pure; the theory unlocks when all do).
import { taskCompletion, type Completion, type TaskSpec } from '../../../core/theory.ts'

/** Data the app computes from Table 1.1: any mark with data, the velocities of tasks 2 to 4 (whole path, 30 cm and 10 cm intervals), the x(t) fit, the final velocity. */
export interface MruvTaskData { marks: boolean; whole: boolean; d30: boolean; d10: boolean; fit: boolean; vEnd: boolean }

export const MRUV_TASKS: readonly TaskSpec[] = [
  { id: 't1', needs: ['marks'] },
  { id: 't2', needs: ['whole'] },
  { id: 't3', needs: ['d30'] },
  { id: 't4', needs: ['d10'] },
  { id: 't5', needs: ['whole', 'd30', 'd10'] },
  { id: 't6', needs: ['fit'] },
  { id: 't7', needs: ['fit'] },
  { id: 't8', needs: ['fit'] },
  { id: 't9', needs: ['vEnd'] },
  { id: 't10', needs: ['fit'] },
]
export const MRUV_TASK_IDS: readonly string[] = MRUV_TASKS.map((t) => t.id)

/** Ticked tasks whose numbers the panel computes also need those data; the others (written on paper) only need the tick. */
export function mruvCompletion(ticks: ReadonlySet<string>, data: MruvTaskData): Completion {
  return taskCompletion(MRUV_TASKS, ticks, { ...data })
}
