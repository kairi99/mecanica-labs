// Pressing a time-critical button. The apparatus needs the moment of the press, so the handlers take
// event.timeStamp from pointerdown / keydown (same clock as performance.now()), never from click or keyup,
// and never a later performance.now().

/** The slice of an event the time-critical handlers read (lets tests pass a fake event). */
export interface PressEvent {
  timeStamp: number
  code?: string
  key?: string
  repeat?: boolean
  target?: EventTarget | null
  ctrlKey?: boolean
  metaKey?: boolean
  altKey?: boolean
  preventDefault?: () => void
}

/**
 * Make a button act at the instant of the press. Mouse / touch / pen: pointerdown. Keyboard: Enter or Space
 * keydown. The click that the browser synthesises afterwards is swallowed so the action never runs twice.
 */
export function onPress(b: HTMLElement, action: (timeStamp_ms: number) => void, keys: readonly string[] = ['Enter', ' ']): void {
  b.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    if (b.getAttribute('aria-disabled') === 'true') return
    action(e.timeStamp)
  })
  b.addEventListener('keydown', (e) => {
    if (!keys.includes(e.key) || e.repeat) return
    e.preventDefault()
    if (b.getAttribute('aria-disabled') === 'true') return
    action(e.timeStamp)
  })
  b.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') e.preventDefault() })
  b.addEventListener('click', (e) => e.preventDefault())
}
