// Small UI state shared between panels (not apparatus state): which mark the student is timing.
import { TABLE_POSITIONS_cm } from '../apparatus/index.ts'

type Listener = () => void
const listeners = new Set<Listener>()
let markRow = 1 // row index in Table 1.1: 1 = 10 cm

export const getMarkRow = (): number => markRow
export function setMarkRow(row: number): void {
  const r = Math.max(1, Math.min(TABLE_POSITIONS_cm.length - 1, Math.round(row)))
  if (r === markRow) return
  markRow = r
  for (const l of listeners) l()
}
export function onMarkRow(l: Listener): () => void {
  listeners.add(l)
  return () => { listeners.delete(l) }
}
