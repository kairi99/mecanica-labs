import { describe, expect, it } from 'vitest'
import { PARABOLIC_TASK_IDS, parabolicCompletion, type ParabolicTaskData } from '../../src/experiments/parabolic/analysis/tasks.ts'
import { strings } from '../../src/experiments/parabolic/views/strings/tasks.ts'

const all = new Set(PARABOLIC_TASK_IDS)
const full: ParabolicTaskData = { data: true, both: true, expected: true }

describe('Parabolic task completion (guide 2.4, tasks 1 to 9)', () => {
  it('has the nine guide tasks and a label for each in both languages', () => {
    expect(PARABOLIC_TASK_IDS).toHaveLength(9)
    for (const l of ['es', 'en'] as const) expect(Object.keys(strings[l].labels).sort()).toEqual([...PARABOLIC_TASK_IDS].sort())
  })
  it('complete only with every tick and the data', () => {
    expect(parabolicCompletion(all, full).complete).toBe(true)
    const missing = new Set(all); missing.delete('t9')
    expect(parabolicCompletion(missing, full)).toMatchObject({ done: 8, complete: false })
  })
  it('written tasks (1, 9) need only the tick; computed ones need data', () => {
    const c = parabolicCompletion(all, { data: false, both: false, expected: false })
    expect(c.tasks.filter((t) => t.done).map((t) => t.id)).toEqual(['t1', 't9'])
    expect(c.complete).toBe(false)
  })
  it('the expected-time tasks need the typed height, the comparison needs both balls', () => {
    const noH = parabolicCompletion(all, { ...full, expected: false })
    expect(noH.tasks.filter((t) => !t.done).map((t) => t.id)).toEqual(['t5', 't6', 't7'])
    const one = parabolicCompletion(all, { ...full, both: false })
    expect(one.tasks.filter((t) => !t.done).map((t) => t.id)).toEqual(['t8'])
  })
})
