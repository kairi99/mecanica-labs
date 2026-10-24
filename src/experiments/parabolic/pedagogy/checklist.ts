// Procedure checklist (minimal, Phase 3b): the assembly and procedure of the guide (2.3.2 and 2.3.3) as a few steps derived live
// from the apparatus. Pure and DOM-free; the generic panel is core/pedagogy/checklistView.ts. Phase 4 expands it. Nothing here blocks the student.
import { TABLE_REPS, TABLE_TRIALS, type ParabolicApparatus } from '../apparatus/index.ts'
import type { ChecklistStepBase, StepStatus } from '../../../core/pedagogy/checklistView.ts'

export const STEP_IDS = ['assembly', 'rise', 'gap', 'marks', 'paper', 'launches'] as const
export type StepId = (typeof STEP_IDS)[number]
export type { StepStatus }

/** Which UI panel (data-panel id) a "show me" opens. */
export type PanelId = 'inventory' | 'adjust' | 'table'

export interface ChecklistStep extends ChecklistStepBase<StepId> { panel: PanelId }

export function buildChecklist(app: ParabolicApparatus): ChecklistStep[] {
  const p = app.procedure()
  const geo = app.getState().geometry
  const missing = app.missing().length
  const filled = p.tableFilled.marble + p.tableFilled.pingpong
  const total = 2 * TABLE_TRIALS * TABLE_REPS * 2
  const st = (ok: boolean, ready = true): StepStatus => (ok ? 'ok' : ready ? 'pending' : 'na')
  return [
    { id: 'assembly', status: st(p.setupComplete), detail: p.setupComplete ? null : { key: 'missing', params: { n: missing } }, focus: ['rail', 'rackStand', 'twoLeg'], panel: 'inventory' },
    { id: 'rise', status: st(p.riseOk, geo !== null), detail: geo ? null : { key: 'needRail', params: {} }, focus: ['rackStand'], panel: 'adjust' },
    { id: 'gap', status: st(p.gapOk, geo !== null), detail: null, focus: ['rail'], panel: 'adjust' },
    {
      id: 'marks', status: st(p.marks.fiveMarks && p.marks.marksInUpperHalf),
      detail: { key: 'marks', params: { n: p.marks.count, upper: p.marks.upperHalfCount } }, focus: ['rail'], panel: 'adjust',
    },
    { id: 'paper', status: st(p.carbonOverBond), detail: null, focus: ['paper'], panel: 'adjust' },
    { id: 'launches', status: st(p.tableComplete.marble && p.tableComplete.pingpong), detail: { key: 'launches', params: { runs: p.runsCount, n: filled, total } }, focus: [], panel: 'table' },
  ]
}

export const nextStep = (steps: ChecklistStep[]): ChecklistStep | null => steps.find((s) => s.status === 'pending') ?? null

