// Procedure checklist logic: guide 1.3.2 (Montaje) and 1.3.3 (Procedimiento) as steps derived live from the apparatus.
// Pure and DOM-free; checklistView.ts renders it. Nothing here blocks the student.
import {
  ITEM_IDS, SCREWS_TOTAL, SUPPORT_SEPARATION_m, TABLE_COLS, TABLE_ROWS, type Apparatus,
} from '../apparatus/index.ts'
import { THETA_GUIDE_rad, heightDifferenceForAngle_m, rad2deg } from '../physics/index.ts'

export const STEP_IDS = [
  'materials', 'standBase', 'railClamped', 'scale', 'lowEnd', 'screws', 'levelled', 'angle', 'marks', 'cartZero', 'measure',
] as const
export type StepId = (typeof STEP_IDS)[number]
export type StepStatus = 'ok' | 'pending' | 'na'

/** Which UI panel (data-panel id) a "show me" opens. */
export type PanelId = 'inventory' | 'adjust' | 'caliper' | 'stopwatch' | 'table'

export interface StepDetail {
  /** Key in the strings `detail` table. */
  key: string
  params: Record<string, string | number>
}

export interface ChecklistStep {
  id: StepId
  status: StepStatus
  detail: StepDetail | null
  /** 3D part ids to highlight (scene focus). */
  focus: string[]
  panel: PanelId
  /** Measurement step only: readings per row 1..9 (cap 10), for the progress chips. */
  progress?: number[]
}

export interface ChecklistOptions {
  /** Teacher mode: show the target values (the formula alone is shown to students). */
  teacher?: boolean
}

export const READINGS_PER_MARK = TABLE_COLS

function lastHeight(app: Apparatus, at: 'clamp' | 'twoLeg'): number | null {
  const log = app.eventLog()
  for (let i = log.length - 1; i >= 0; i--) {
    const e = log[i]!
    if (e.type === 'measuredHeight' && e.target.kind === 'railHeight' && e.target.at === at) return e.value_m
  }
  return null
}

export function buildChecklist(app: Apparatus, opts: ChecklistOptions = {}): ChecklistStep[] {
  const st = app.getState()
  const p = app.procedure()
  const have = ITEM_IDS.filter((i) => st.items[i]).length
  const clamped = st.joints.rackClamp !== null
  const geo = st.geometry
  const steps: ChecklistStep[] = []
  const add = (s: ChecklistStep): void => { steps.push(s) }

  add({ id: 'materials', status: have === ITEM_IDS.length ? 'ok' : 'pending', detail: { key: 'count', params: { n: have, total: ITEM_IDS.length } }, focus: [], panel: 'inventory' })
  add({ id: 'standBase', status: st.joints.standBase ? 'ok' : 'pending', detail: null, focus: ['rackStand', 'standBase'], panel: 'inventory' })
  add({ id: 'railClamped', status: clamped ? 'ok' : 'pending', detail: null, focus: ['rail', 'rackStand'], panel: 'inventory' })
  add({
    id: 'scale', status: p.scaleZeroAtHighEnd === null ? 'na' : p.scaleOk ? 'ok' : 'pending',
    detail: p.scaleZeroAtHighEnd === false ? { key: 'reversed', params: {} } : null, focus: ['rail'], panel: 'inventory',
  })
  add({
    id: 'lowEnd', status: st.joints.twoLegStand && st.joints.receiver ? 'ok' : clamped ? 'pending' : 'na',
    detail: null, focus: ['twoLegStand', 'receiver'], panel: 'inventory',
  })
  add({ id: 'screws', status: st.screwsUsed >= SCREWS_TOTAL ? 'ok' : 'pending', detail: { key: 'count', params: { n: st.screwsUsed, total: SCREWS_TOTAL } }, focus: ['screws'], panel: 'inventory' })
  add({ id: 'levelled', status: p.levelledBeforeRaise ? 'ok' : p.setupComplete ? 'pending' : 'na', detail: null, focus: ['level', 'foot'], panel: 'adjust' })

  // Incline: the student's own route is the caliper heights and dh = d sin(theta); the numbers are shown only to teachers.
  const hc = lastHeight(app, 'clamp'), ht = lastHeight(app, 'twoLeg')
  let angleDetail: StepDetail | null = null
  if (hc !== null && ht !== null) angleDetail = { key: 'measured', params: { dh_mm: Math.round((hc - ht) * 10000) / 10 } }
  if (opts.teacher && p.theta_rad !== null) {
    angleDetail = {
      key: 'teacher',
      params: {
        target_mm: Math.round(heightDifferenceForAngle_m(THETA_GUIDE_rad, SUPPORT_SEPARATION_m) * 10000) / 10,
        now_deg: Math.round(rad2deg(p.theta_rad) * 1000) / 1000,
      },
    }
  }
  add({
    id: 'angle', status: p.theta_rad === null ? 'na' : p.angleOk ? 'ok' : 'pending',
    detail: angleDetail ?? { key: 'formula', params: {} }, focus: ['rackKnob', 'foot'], panel: geo ? 'caliper' : 'adjust',
  })

  add({ id: 'marks', status: p.marksOk ? 'ok' : 'pending', detail: { key: 'marks', params: { n: p.marks.count, ab: Math.round(p.marks.ab_mm / 10) } }, focus: ['markers', 'rail'], panel: 'adjust' })
  add({ id: 'cartZero', status: p.cart.onRail && p.cart.atZero ? 'ok' : 'pending', detail: null, focus: ['cart', 'rail'], panel: 'adjust' })

  const perRow = p.recordsPerPosition.slice(1).map((n) => Math.min(READINGS_PER_MARK, n))
  const rowsDone = perRow.filter((n) => n >= READINGS_PER_MARK).length
  const readings = perRow.reduce((a, b) => a + b, 0)
  add({
    id: 'measure', status: rowsDone === TABLE_ROWS - 1 ? 'ok' : 'pending',
    detail: { key: 'progress', params: { rows: rowsDone, totalRows: TABLE_ROWS - 1, n: readings, total: (TABLE_ROWS - 1) * READINGS_PER_MARK } },
    focus: ['cart', 'stopwatch'], panel: 'stopwatch', progress: perRow,
  })
  return steps
}

/** The first step that is not done (the "next" one), or null when all are ok. */
export function nextStep(steps: readonly ChecklistStep[]): ChecklistStep | null {
  return steps.find((s) => s.status !== 'ok') ?? null
}
