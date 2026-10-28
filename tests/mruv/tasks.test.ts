import { describe, expect, it } from 'vitest'
import { MRUV_TASK_IDS, mruvCompletion, type MruvTaskData } from '../../src/experiments/mruv/analysis/tasks.ts'
import { strings } from '../../src/experiments/mruv/views/strings/tasks.ts'

const all = new Set(MRUV_TASK_IDS)
const full: MruvTaskData = { marks: true, whole: true, d30: true, d10: true, fit: true, vEnd: true }
const none: MruvTaskData = { marks: false, whole: false, d30: false, d10: false, fit: false, vEnd: false }

describe('MRUV task completion (guide 1.4, tasks 1 to 10)', () => {
  it('has the ten guide tasks and a label for each in both languages', () => {
    expect(MRUV_TASK_IDS).toHaveLength(10)
    for (const l of ['es', 'en'] as const) expect(Object.keys(strings[l].labels).sort()).toEqual([...MRUV_TASK_IDS].sort())
  })
  it('complete only with every tick and every datum', () => {
    expect(mruvCompletion(all, full)).toMatchObject({ done: 10, total: 10, complete: true })
    const missing = new Set(all); missing.delete('t10')
    expect(mruvCompletion(missing, full)).toMatchObject({ done: 9, complete: false })
    expect(mruvCompletion(new Set(), full).done).toBe(0)
  })
  it('ticks without data do not count (empty table)', () => {
    const c = mruvCompletion(all, none)
    expect(c.complete).toBe(false)
    expect(c.done).toBe(0)
    expect(c.tasks.every((t) => t.dataMissing)).toBe(true)
  })
  it('the fit tasks need the fit, the velocity tasks only their own intervals', () => {
    const c = mruvCompletion(all, { ...full, fit: false, vEnd: false })
    expect(c.tasks.filter((t) => !t.done).map((t) => t.id)).toEqual(['t6', 't7', 't8', 't9', 't10'])
    const d = mruvCompletion(all, { ...full, d10: false })
    expect(d.tasks.filter((t) => !t.done).map((t) => t.id)).toEqual(['t4', 't5'])
  })
})
