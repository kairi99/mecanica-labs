import { describe, expect, it } from 'vitest'
import { NEWTON2_TASK_IDS, newton2Completion, type Newton2TaskData } from '../../src/experiments/newton2/analysis/tasks.ts'
import { strings } from '../../src/experiments/newton2/views/strings/tasks.ts'

const all = new Set(NEWTON2_TASK_IDS)
const full: Newton2TaskData = { trials: true, fit: true, mass: true }

describe('Newton 2 task completion (guide 3.4, tasks 1 to 8)', () => {
  it('has the eight guide tasks and a label for each in both languages', () => {
    expect(NEWTON2_TASK_IDS).toHaveLength(8)
    for (const l of ['es', 'en'] as const) expect(Object.keys(strings[l].labels).sort()).toEqual([...NEWTON2_TASK_IDS].sort())
  })
  it('complete only with every tick and the data', () => {
    expect(newton2Completion(all, full).complete).toBe(true)
    const missing = new Set(all); missing.delete('t4')
    expect(newton2Completion(missing, full)).toMatchObject({ done: 7, complete: false })
  })
  it('paper tasks (1, 4, 7, 8) need only the tick', () => {
    const c = newton2Completion(all, { trials: false, fit: false, mass: false })
    expect(c.tasks.filter((t) => t.done).map((t) => t.id)).toEqual(['t1', 't4', 't7', 't8'])
  })
  it('fit and mass tasks need their results', () => {
    const c = newton2Completion(all, { trials: true, fit: false, mass: false })
    expect(c.tasks.filter((t) => !t.done).map((t) => t.id)).toEqual(['t5', 't6'])
  })
})
