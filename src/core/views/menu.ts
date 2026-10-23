// A small accessible popup menu: a trigger button (aria-haspopup=menu) and a list of menu items.
// Keyboard: Enter / Space / ArrowDown open it, arrows move, Home / End jump, Escape closes and returns focus, Tab closes.
import { el } from './dom.ts'

export interface Menu {
  wrap: HTMLElement
  panel: HTMLElement
  open(): void
  close(returnFocus?: boolean): void
  isOpen(): boolean
}

/** `items` are buttons already built by the caller; this sets their role and wires the keys. The caller keeps their text up to date. */
export function mountMenu(trigger: HTMLElement, items: HTMLElement[], opts: { align?: 'left' | 'right'; label?: string } = {}): Menu {
  const wrap = el('div', 'menu-wrap')
  const panel = el('div', `menu menu-${opts.align ?? 'right'}`, undefined, { role: 'menu' })
  panel.hidden = true
  if (opts.label) panel.setAttribute('aria-label', opts.label)
  trigger.setAttribute('aria-haspopup', 'menu')
  trigger.setAttribute('aria-expanded', 'false')
  for (const it of items) { it.setAttribute('role', it.getAttribute('role') ?? 'menuitem'); it.tabIndex = -1; panel.append(it) }
  wrap.append(trigger, panel)

  const visible = (): HTMLElement[] => items.filter((i) => !i.hidden && i.offsetParent !== null)
  const focusAt = (i: number): void => { const v = visible(); if (v.length) v[(i + v.length) % v.length]!.focus() }
  function open(): void {
    panel.hidden = false
    trigger.setAttribute('aria-expanded', 'true')
    const checked = visible().findIndex((i) => i.getAttribute('aria-checked') === 'true')
    focusAt(checked >= 0 ? checked : 0)
    document.addEventListener('pointerdown', onOutside, true)
  }
  function close(returnFocus = false): void {
    if (panel.hidden) return
    panel.hidden = true
    trigger.setAttribute('aria-expanded', 'false')
    document.removeEventListener('pointerdown', onOutside, true)
    if (returnFocus) trigger.focus()
  }
  function onOutside(e: Event): void { if (!wrap.contains(e.target as Node)) close() }
  trigger.addEventListener('click', () => { if (panel.hidden) open(); else close(true) })
  trigger.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (panel.hidden) open() }
  })
  panel.addEventListener('keydown', (e) => {
    const v = visible()
    const at = v.indexOf(document.activeElement as HTMLElement)
    if (e.key === 'ArrowDown') { e.preventDefault(); focusAt(at + 1) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); focusAt(at - 1) }
    else if (e.key === 'Home') { e.preventDefault(); focusAt(0) }
    else if (e.key === 'End') { e.preventDefault(); focusAt(v.length - 1) }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true) }
    else if (e.key === 'Tab') close()
  })
  panel.addEventListener('click', () => close(true))
  return { wrap, panel, open, close, isOpen: () => !panel.hidden }
}
