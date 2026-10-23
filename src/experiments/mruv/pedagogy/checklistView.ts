// MRUV procedure checklist panel: the generic renderer (core/pedagogy/checklistView.ts) bound to the MRUV checklist.
import type { MountView } from '../views/view.ts'
import { mountChecklist as mountCoreChecklist, type ChecklistDef, type ChecklistHooks as CoreChecklistHooks } from '../../../core/pedagogy/checklistView.ts'
import { STEP_IDS, buildChecklist, nextStep, type ChecklistStep, type StepId } from './checklist.ts'
import { strings } from './strings/checklist.ts'
import type { Apparatus } from '../apparatus/index.ts'

export { localiseParams } from '../../../core/pedagogy/checklistView.ts'
export type ChecklistHooks = CoreChecklistHooks<ChecklistStep>

export const CHECKLIST_DEF: ChecklistDef<Apparatus, StepId, ChecklistStep> = {
  ids: STEP_IDS, strings, build: buildChecklist, next: nextStep,
}

export function mountChecklist(hooks: ChecklistHooks): MountView { return mountCoreChecklist(CHECKLIST_DEF, hooks) }
