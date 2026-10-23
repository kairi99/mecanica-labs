// Keyboard shortcuts of the timing bar: Space = start/stop, R = reset, S = release the DigiCart, Enter = copy to the table.
// Pure handler: takes the event (anything with timeStamp/code/key/target) and the actions. Unit-tested with a fake event.
//
// The shortcuts never hijack a control that has its own keyboard behaviour (B5 of the design review): focus on a button, link,
// summary, checkbox, radio, range, select or text input is left alone. The exception is the timing bar's own controls, which
// handle Space / Enter themselves (see press.ts); there only S and R still work, and never on a select or text field.
import { inTimingBar, isInteractiveTarget, isTextTarget } from './dom.ts'
import type { PressEvent } from './press.ts'

export interface StopwatchActions {
  startStop(t_ms: number): void
  reset(): void
  release(t_ms: number): void
  /** Enter: copy the stopped reading to the table. Optional so a host without a table can omit it. */
  copy?(t_ms: number): void
}

/** Returns true when the key was a stopwatch key and was handled. */
export function handleStopwatchKey(e: PressEvent, a: StopwatchActions): boolean {
  if (e.ctrlKey || e.metaKey || e.altKey) return false
  const target = e.target ?? null
  if (isTextTarget(target)) return false
  const onControl = isInteractiveTarget(target)
  const inBar = inTimingBar(target)
  if (onControl && !inBar) return false // a focused button, link, checkbox ... keeps its own keys
  const k = e.code ?? ''
  const isSpace = k === 'Space' || e.key === ' '
  const isEnter = k === 'Enter' || k === 'NumpadEnter' || e.key === 'Enter'
  if (isSpace || isEnter) {
    if (onControl) return false // inside the bar a button handles Space / Enter itself
    if (isSpace) {
      if (!e.repeat) a.startStop(e.timeStamp) // the moment of the key press, not "now"
      e.preventDefault?.()
      return true
    }
    if (!a.copy) return false
    if (!e.repeat) a.copy(e.timeStamp)
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
