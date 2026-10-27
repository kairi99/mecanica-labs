// Small UI state shared between panels (not apparatus state): which trial row of Tabla 3.1 the student is working on.
import { TABLE_ROWS } from '../apparatus/index.ts'

type Listener = () => void
const listeners = new Set<Listener>()
let trialRow = 0 // row 0 = 4 masses in the canister

export const getTrialRow = (): number => trialRow
export function setTrialRow(row: number): void {
  const r = Math.max(0, Math.min(TABLE_ROWS - 1, Math.round(row)))
  if (r === trialRow) return
  trialRow = r
  for (const l of listeners) l()
}
export function onTrialRow(l: Listener): () => void {
  listeners.add(l)
  return () => { listeners.delete(l) }
}
