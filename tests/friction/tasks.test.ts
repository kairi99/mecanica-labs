import { describe, expect, it } from 'vitest'
import { FRICTION_TASK_IDS, frictionCompletion, type FrictionTaskData } from '../../src/experiments/friction/analysis/tasks.ts'
import { strings } from '../../src/experiments/friction/views/strings/tasks.ts'

const all = new Set(FRICTION_TASK_IDS)
const full: FrictionTaskData = { fit1: true, exp2: true, exp3: true, exp3Mean: true, lit: true }
const none: FrictionTaskData = { fit1: false, exp2: false, exp3: false, exp3Mean: false, lit: false }

describe('Friction task completion (guide 4.4: 6 + 7 + 2 tasks)', () => {
  it('has the fifteen guide tasks and a label for each in both languages', () => {
    expect(FRICTION_TASK_IDS).toHaveLength(15)
    for (const l of ['es', 'en'] as const) expect(Object.keys(strings[l].labels).sort()).toEqual([...FRICTION_TASK_IDS].sort())
  })
  it('complete only with every tick and the data', () => {
    expect(frictionCompletion(all, full).complete).toBe(true)
    const missing = new Set(all); missing.delete('g2')
    expect(frictionCompletion(missing, full)).toMatchObject({ done: 14, complete: false })
  })
  it('written tasks need only the tick; computed ones need their table', () => {
    const c = frictionCompletion(all, none)
    expect(c.tasks.filter((t) => t.done).map((t) => t.id)).toEqual(['a1', 'a5', 'a6', 'b3', 'b6', 'g1', 'g2'])
    expect(c.complete).toBe(false)
  })
  it('the literature comparison needs a typed value', () => {
    const c = frictionCompletion(all, { ...full, lit: false })
    expect(c.tasks.filter((t) => !t.done).map((t) => t.id)).toEqual(['b7'])
  })
})
