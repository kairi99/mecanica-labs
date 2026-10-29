// Procedure checklist logic: the guide's procedure (4.3.2 assembly and 4.3.3 experiments 1 to 3) as steps derived live from the apparatus.
// Pure and DOM-free; the generic panel is core/pedagogy/checklistView.ts. Nothing here blocks the student.
import { T41_ROWS, T42_ROWS, T43_TRIALS, T4_READINGS, BAR_ORDER, type FrictionApparatus } from '../apparatus/index.ts'
import type { ChecklistStepBase, StepStatus } from '../../../core/pedagogy/checklistView.ts'

export const STEP_IDS = ['mass', 'paper', 'zero', 'exp1', 'exp2', 'course', 'exp3'] as const
export type StepId = (typeof STEP_IDS)[number]
export type { StepStatus }

/** Which UI panel (data-panel id) a "show me" opens. */
export type PanelId = 'inventory' | 'bench' | 'table4.1' | 'table4.2' | 'incline' | 'table4.3'
export interface ChecklistStep extends ChecklistStepBase<StepId> { panel: PanelId }

/** The setup of the guide's assembly (4.3.2 and the start of exp. 3) is arranged: a block face on the paper, a scale hooked, the paper laid, a bar on the mark. Not a checklist step: it ticks the first lab step. */
export function setupDone(app: FrictionApparatus): boolean {
  const s = app.getState()
  return s.face !== null && s.scale !== null && s.paper !== 'none' && s.bar !== null
}

export function buildChecklist(app: FrictionApparatus): ChecklistStep[] {
  const p = app.procedure()
  const s = app.getState()
  const st = (ok: boolean, ready = true): StepStatus => (ok ? 'ok' : ready ? 'pending' : 'na')
  const t41 = p.filled.t41, t42 = p.filled.t42
  const t43 = app.tableData().t43.reduce((a, r) => a + r.filter((c) => c.h_m !== null && c.t_s !== null).length, 0)
  const ready12 = s.items.block && s.scale !== null
  return [
    { id: 'mass', status: st(p.blockWeighed, s.items.block && s.items.balance), detail: null, focus: ['block'], panel: 'bench' },
    { id: 'paper', status: st(p.paperFixed, s.items.paper), detail: s.paper === 'loose' ? { key: 'paperLoose', params: {} } : null, focus: ['paper'], panel: 'bench' },
    { id: 'zero', status: st(p.scaleZeroed, s.scale !== null), detail: null, focus: ['scale'], panel: 'bench' },
    { id: 'exp1', status: st(p.complete.t41, ready12), detail: { key: 'fill41', params: { n: t41, total: T41_ROWS * T4_READINGS } }, focus: ['block', 'scale'], panel: 'table4.1' },
    { id: 'exp2', status: st(p.complete.t42, ready12), detail: { key: 'fill42', params: { n: t42, total: T42_ROWS * T4_READINGS } }, focus: ['block', 'scale'], panel: 'table4.2' },
    { id: 'course', status: st(p.courseMarked, s.items.rail && s.items.tape), detail: null, focus: ['rail'], panel: 'incline' },
    { id: 'exp3', status: st(p.complete.t43, p.courseMarked), detail: { key: 'fill43', params: { n: t43, total: BAR_ORDER.length * T43_TRIALS } }, focus: ['rail', 'bar', 'tape', 'stopwatch'], panel: 'table4.3' },
  ]
}

export const nextStep = (steps: ChecklistStep[]): ChecklistStep | null => steps.find((x) => x.status === 'pending') ?? null
