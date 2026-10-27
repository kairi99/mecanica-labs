// Procedure checklist logic: the guide's assembly (3.3.2) and procedure (3.3.3) as steps derived live from the apparatus.
// Pure and DOM-free; the generic panel is core/pedagogy/checklistView.ts. Nothing here blocks the student. Every status is read from
// app.procedure() / the table / the run log.
import { MIN_HANG_m } from '../physics/index.ts'
import { TABLE_COLS, type Apparatus } from '../apparatus/index.ts'
import type { ChecklistStepBase, StepStatus } from '../../../core/pedagogy/checklistView.ts'

export const STEP_IDS = ['assembly', 'levelled', 'marks', 'cartStart', 'stringLength', 'mt', 'force', 'timings', 'massKept'] as const
export type StepId = (typeof STEP_IDS)[number]
export type { StepStatus }

/** Which UI panel (data-panel id) a "show me" opens. */
export type PanelId = 'inventory' | 'adjust' | 'masses' | 'instruments' | 'table'

export interface ChecklistStep extends ChecklistStepBase<StepId> { panel: PanelId }

export function buildChecklist(app: Apparatus): ChecklistStep[] {
  const p = app.procedure()
  const s = app.getState()
  const d = app.tableData()
  const missing = app.missing().length
  const st = (ok: boolean, ready = true): StepStatus => (ok ? 'ok' : ready ? 'pending' : 'na')
  const last = app.getRuns().at(-1)
  const hang = app.hangBelowPulley_m()
  const stringOk = hang !== null && hang >= MIN_HANG_m && (last === undefined || last.outcome === 'ok')
  const rowsDone = [0, 1, 2, 3].filter((r) => d.values_s[r]!.filter((v) => v !== null).length >= TABLE_COLS).length
  const forceRows = [0, 1, 2, 3].filter((r) => d.forces_N[r] !== null).length
  const lastForce = app.lastForceReading()
  const stale = lastForce !== null && lastForce.massesInCanister !== app.massesInCanister()
  return [
    { id: 'assembly', status: st(p.setupComplete), detail: p.setupComplete ? null : { key: 'missing', params: { n: missing } }, focus: ['rail', 'rackStand', 'receiver', 'string'], panel: 'inventory' },
    { id: 'levelled', status: st(p.levelled, s.geometry !== null), detail: s.geometry === null ? { key: 'needRail', params: {} } : null, focus: ['level', 'rail'], panel: 'adjust' },
    { id: 'marks', status: st(p.marksPlaced && p.distanceOk, s.items.rail && s.items.markers), detail: p.distance_m === null ? null : { key: 'distance', params: { d: Math.round(p.distance_m * 1000) / 10 } }, focus: ['markers', 'rail'], panel: 'adjust' },
    { id: 'cartStart', status: st(p.cartAtStart, s.geometry !== null), detail: null, focus: ['cart'], panel: 'adjust' },
    {
      id: 'stringLength', status: st(stringOk, p.stringConnected),
      detail: hang === null ? null : last !== undefined && last.outcome !== 'ok' ? { key: 'lastRun', params: {} } : { key: 'hang', params: { x: Math.round(hang * 1000) / 10 } }, focus: ['string', 'canister'], panel: 'adjust',
    },
    { id: 'mt', status: st(p.mtRecorded_kg !== null, s.items.balance), detail: null, focus: ['balance'], panel: 'instruments' },
    {
      id: 'force', status: st(forceRows >= 4 && !stale, s.items.dynamometer || s.items.dynamometer2N),
      detail: stale ? { key: 'stale', params: {} } : { key: 'forces', params: { n: forceRows } }, focus: ['dynamometer', 'canister'], panel: 'instruments',
    },
    {
      id: 'timings', status: st(rowsDone >= 4, p.runsCount > 0), detail: { key: 'timings', params: { runs: p.runsCount, rows: rowsDone } },
      focus: ['cart'], panel: 'table',
    },
    { id: 'massKept', status: st(p.massKept && p.massesIn.cart > 0 && p.massesIn.canister + p.massesIn.cart === 4, p.runsCount > 0), detail: p.massesIn.bench > 0 ? { key: 'bench', params: { n: p.massesIn.bench } } : null, focus: ['masses', 'plasticScrews'], panel: 'masses' },
  ]
}

export const nextStep = (steps: ChecklistStep[]): ChecklistStep | null => steps.find((x) => x.status === 'pending') ?? null
