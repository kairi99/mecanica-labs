// Procedure checklist logic: guide 2.3.2 (Montaje) and 2.3.3 (Procedimiento) as steps derived live from the apparatus.
// Pure and DOM-free; the generic panel is core/pedagogy/checklistView.ts. Nothing here blocks the student. No view logic is
// repeated: every status is read from app.procedure() / the table / the stop log.
import { BALL_IDS, TABLE_REPS, TABLE_TRIALS, type ParabolicApparatus } from '../apparatus/index.ts'
import type { ChecklistStepBase, StepStatus } from '../../../core/pedagogy/checklistView.ts'
import { timedEdgeToFloor } from './timing.ts'

export const STEP_IDS = [
  'assembly', 'rise', 'gap', 'marks', 'paper', 'edgeProjection', 'timing', 'range', 'launches', 'bothBalls', 'launchHeight',
] as const
export type StepId = (typeof STEP_IDS)[number]
export type { StepStatus }

/** Which UI panel (data-panel id) a "show me" opens. */
export type PanelId = 'inventory' | 'adjust' | 'tapeRange' | 'launch' | 'table'

export interface ChecklistStep extends ChecklistStepBase<StepId> { panel: PanelId }

export function buildChecklist(app: ParabolicApparatus): ChecklistStep[] {
  const p = app.procedure()
  const geo = app.getState().geometry
  const missing = app.missing().length
  const filled = p.tableFilled.marble + p.tableFilled.pingpong
  const total = 2 * TABLE_TRIALS * TABLE_REPS * 2
  const st = (ok: boolean, ready = true): StepStatus => (ok ? 'ok' : ready ? 'pending' : 'na')
  const timed = app.stopLog().filter((s) => s.runId !== null && timedEdgeToFloor(s)).length
  const rangesTaken = BALL_IDS.some((b) => app.tableData(b).x_m.some((row) => row.some((v) => v !== null)))
  const perBall = Object.fromEntries(BALL_IDS.map((b) => [b, Math.min(TABLE_TRIALS * TABLE_REPS, app.tableData(b).cells.flat().filter((c) => c.t_s !== null && c.x_m !== null).length)])) as Record<(typeof BALL_IDS)[number], number>
  return [
    { id: 'assembly', status: st(p.setupComplete), detail: p.setupComplete ? null : { key: 'missing', params: { n: missing } }, focus: ['rail', 'rackStand', 'twoLeg'], panel: 'inventory' },
    { id: 'rise', status: st(p.riseOk, geo !== null), detail: geo ? null : { key: 'needRail', params: {} }, focus: ['rackStand'], panel: 'adjust' },
    { id: 'gap', status: st(p.gapOk, geo !== null), detail: null, focus: ['rail'], panel: 'adjust' },
    {
      id: 'marks', status: st(p.marks.fiveMarks && p.marks.marksInUpperHalf),
      detail: { key: 'marks', params: { n: p.marks.count, upper: p.marks.upperHalfCount } }, focus: ['rail'], panel: 'adjust',
    },
    { id: 'paper', status: st(p.carbonOverBond), detail: null, focus: ['paper'], panel: 'adjust' },
    { id: 'edgeProjection', status: st(p.edgeProjectionPlaced), detail: null, focus: ['paper'], panel: 'adjust' },
    { id: 'timing', status: st(timed > 0, p.runsCount > 0), detail: p.stopsCount > 0 ? { key: 'timing', params: { n: timed, stops: p.stopsCount } } : null, focus: [], panel: 'launch' },
    {
      id: 'range', status: st(rangesTaken && !p.paperMovedSinceMarks, p.runsCount > 0),
      detail: p.paperMovedSinceMarks ? { key: 'paperMoved', params: {} } : null, focus: ['paper'], panel: 'tapeRange',
    },
    { id: 'launches', status: st(p.tableComplete.marble && p.tableComplete.pingpong), detail: { key: 'launches', params: { runs: p.runsCount, n: filled, total } }, focus: [], panel: 'table' },
    {
      id: 'bothBalls', status: st(perBall.marble > 0 && perBall.pingpong > 0),
      detail: { key: 'bothBalls', params: { marble: perBall.marble, pingpong: perBall.pingpong, per: TABLE_TRIALS * TABLE_REPS } }, focus: [], panel: 'table',
    },
    { id: 'launchHeight', status: st(p.measured.launchHeight), detail: null, focus: [], panel: 'tapeRange' },
  ]
}

export const nextStep = (steps: ChecklistStep[]): ChecklistStep | null => steps.find((s) => s.status === 'pending') ?? null
