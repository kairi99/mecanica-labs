// Small UI state shared between panels (not apparatus state): the pull speed and crank rate the sliders hold, and which cell of each
// table the next reading goes to. Module-level, like the other experiments.
import { BAR_ORDER, FACE_ORDER, MASS_STEPS, T43_TRIALS, T4_READINGS } from '../apparatus/index.ts'

type Listener = () => void
const listeners = new Set<Listener>()
const notify = (): void => { for (const l of listeners) l() }
export function onUiState(l: Listener): () => void {
  listeners.add(l)
  return () => { listeners.delete(l) }
}

/** Pull speed of the hand, cm/s (slider). Advised 4 cm/s for Tabla 4.1; Tabla 4.2 wants a slow pull. */
let pullSpeed_cmps = 4
export const getPullSpeed = (): number => pullSpeed_cmps
export function setPullSpeed(v: number): void { if (Number.isFinite(v) && v !== pullSpeed_cmps) { pullSpeed_cmps = v; notify() } }

/** Crank rate of the rack, mm/s (slider). */
let crank_mmps = 20
export const getCrank = (): number => crank_mmps
export function setCrank(v: number): void { if (Number.isFinite(v) && v !== crank_mmps) { crank_mmps = v; notify() } }

export type TableKey = '4.1' | '4.2' | '4.3'
const cells: Record<TableKey, { row: number; col: number }> = { '4.1': { row: 0, col: 0 }, '4.2': { row: 0, col: 0 }, '4.3': { row: 0, col: 0 } }
const dims: Record<TableKey, { rows: number; cols: number }> = {
  '4.1': { rows: FACE_ORDER.length * MASS_STEPS, cols: T4_READINGS },
  '4.2': { rows: FACE_ORDER.length, cols: T4_READINGS },
  '4.3': { rows: BAR_ORDER.length, cols: T43_TRIALS },
}
export const getCell = (t: TableKey): { row: number; col: number } => ({ ...cells[t] })
export function setCell(t: TableKey, row: number, col: number): void {
  const d = dims[t]
  const r = Math.max(0, Math.min(d.rows - 1, Math.round(row))), c = Math.max(0, Math.min(d.cols - 1, Math.round(col)))
  if (cells[t].row === r && cells[t].col === c) return
  cells[t] = { row: r, col: c }
  notify()
}
/** Move the active cell to the next reading (same row first, then the next row). */
export function advanceCell(t: TableKey): void {
  const d = dims[t], c = cells[t]
  if (c.col + 1 < d.cols) setCell(t, c.row, c.col + 1)
  else if (c.row + 1 < d.rows) setCell(t, c.row + 1, 0)
}
export function resetUi(): void {
  cells['4.1'] = { row: 0, col: 0 }; cells['4.2'] = { row: 0, col: 0 }; cells['4.3'] = { row: 0, col: 0 }
  notify()
}
