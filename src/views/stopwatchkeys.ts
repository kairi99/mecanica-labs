// Keyboard shortcuts of the stopwatch: Space = start/stop, R = reset, S = release the cart.
// Pure handler: takes the event (anything with timeStamp/code/key) and the actions. Unit-tested with a fake event.
import { isTextTarget } from './dom.ts'
import type { PressEvent } from './press.ts'

export interface StopwatchActions {
  startStop(t_ms: number): void
  reset(): void
  release(t_ms: number): void
}

/** Returns true when the key was a stopwatch key and was handled. Never fires while typing in a text field. */
export function handleStopwatchKey(e: PressEvent, a: StopwatchActions): boolean {
  if (e.ctrlKey || e.metaKey || e.altKey) return false
  if (isTextTarget(e.target ?? null)) return false
  const k = e.code ?? ''
  if (k === 'Space' || e.key === ' ') {
    if (!e.repeat) a.startStop(e.timeStamp) // the moment of the key press, not "now"
    e.preventDefault?.()
    return true
  }
  if (k === 'KeyR' || e.key === 'r' || e.key === 'R') {
    if (!e.repeat) a.reset()
    return true
  }
  if (k === 'KeyS' || e.key === 's' || e.key === 'S') {
    if (!e.repeat) a.release(e.timeStamp)
    return true
  }
  return false
}
