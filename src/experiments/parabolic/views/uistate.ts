// Small UI state shared between panels (not apparatus state): which cell of Tabla 2.1 the next stopwatch reading goes to, which
// ball's table is shown, which tape target is chosen. Module-level, like MRUV's mark row.
import { TABLE_REPS, TABLE_TRIALS, type BallId, type TapeTarget } from '../apparatus/index.ts'

type Listener = () => void
const listeners = new Set<Listener>()
const notify = (): void => { for (const l of listeners) l() }
export function onUiState(l: Listener): () => void {
  listeners.add(l)
  return () => { listeners.delete(l) }
}

// ---- target cell: ball, trial (= rail mark, 0-based), repetition (0-based) ------------------------------------------------------
let ball: BallId = 'marble'
let trial = 0
let rep = 0
export const getBall = (): BallId => ball
export const getTrial = (): number => trial
export const getRep = (): number => rep
export function setBall(b: BallId): void { if (b !== ball) { ball = b; notify() } }
export function setCell(t: number, r: number): void {
  const nt = Math.max(0, Math.min(TABLE_TRIALS - 1, Math.round(t)))
  const nr = Math.max(0, Math.min(TABLE_REPS - 1, Math.round(r)))
  if (nt === trial && nr === rep) return
  trial = nt; rep = nr
  notify()
}

/**
 * The cell after (trial, rep) in reading order whose time is still empty, or the same cell when there is none.
 * Pure: takes the times of the ball's table as [trial][rep].
 */
export function nextEmptyTimeCell(t_s: readonly (readonly (number | null)[])[], from: { trial: number; rep: number }): { trial: number; rep: number } {
  const total = TABLE_TRIALS * TABLE_REPS
  const start = from.trial * TABLE_REPS + from.rep
  for (let k = 1; k < total; k++) {
    const i = (start + k) % total
    const tr = Math.floor(i / TABLE_REPS)
    const rp = i % TABLE_REPS
    if (t_s[tr]?.[rp] === null) return { trial: tr, rep: rp }
  }
  return from
}

// ---- last message of a copy action (shown where the timing bar's caption is hidden, for example on phones) ----------------------
let note = ''
export const getNote = (): string => note
export function setNote(text: string): void { note = text; notify() }

// ---- tape target (the panel and the 3D scene stay in step) -------------------------------------------------------------------------
let tapeTarget: TapeTarget = { kind: 'launchHeight' }
export const getTape = (): TapeTarget => tapeTarget
const sameTarget = (a: TapeTarget, b: TapeTarget): boolean => JSON.stringify(a) === JSON.stringify(b)
/** Choose a tape target; returns true when it changed. */
export function setTape(t: TapeTarget): boolean {
  if (sameTarget(t, tapeTarget)) return false
  tapeTarget = t
  notify()
  return true
}
export const tapeKey = (t: TapeTarget): string => (t.kind === 'range' ? `range:${t.carbonId}` : t.kind === 'markPosition' ? `mark:${t.markId}` : t.kind)
export function tapeFromKey(k: string): TapeTarget | null {
  if (k === 'launchHeight' || k === 'gap' || k === 'rise') return { kind: k }
  if (k.startsWith('range:')) return { kind: 'range', carbonId: k.slice(6) }
  if (k.startsWith('mark:')) return { kind: 'markPosition', markId: k.slice(5) }
  return null
}
