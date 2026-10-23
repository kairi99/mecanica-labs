// A small accessible dropdown menu (button + menu of radio items) used for the "Vista" and "Herramienta" chips of the scene.
// Button: aria-haspopup="menu", aria-expanded. Items: role="menuitemradio" with aria-checked. Keys: arrows, Home, End, Esc, Tab closes.

export interface MenuItem { id: string; label: string }
export interface Menu {
  root: HTMLElement
  button: HTMLButtonElement
  setItems(items: MenuItem[]): void
  setValue(id: string | null): void
  setLabel(label: string): void
  close(): void
  destroy(): void
}

let uid = 0

export function createMenu(className: string, onSelect: (id: string) => void): Menu {
  const root = document.createElement('div')
  root.className = `scene3d-menu ${className}`
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'scene3d-chip'
  button.setAttribute('aria-haspopup', 'menu')
  button.setAttribute('aria-expanded', 'false')
  const caret = document.createElement('span')
  caret.className = 'scene3d-caret'
  caret.setAttribute('aria-hidden', 'true')
  caret.textContent = '▾'
  const text = document.createElement('span')
  button.append(text, caret)
  const popup = document.createElement('div')
  popup.className = 'scene3d-menu-pop'
  popup.setAttribute('role', 'menu')
  popup.id = `scene3d-menu-${++uid}`
  popup.hidden = true
  button.setAttribute('aria-controls', popup.id)
  root.append(button, popup)

  let items: MenuItem[] = []
  let value: string | null = null
  const els = (): HTMLButtonElement[] => [...popup.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]')]

  const isOpen = (): boolean => !popup.hidden
  const close = (refocus = false): void => {
    if (!isOpen()) return
    popup.hidden = true
    button.setAttribute('aria-expanded', 'false')
    if (refocus) button.focus()
  }
  const open = (focusIndex: 'checked' | 'first' | 'last' = 'checked'): void => {
    popup.hidden = false
    button.setAttribute('aria-expanded', 'true')
    const list = els()
    const i = focusIndex === 'first' ? 0 : focusIndex === 'last' ? list.length - 1 : Math.max(0, items.findIndex((x) => x.id === value))
    list[i]?.focus()
  }
  button.addEventListener('click', () => { if (isOpen()) close(); else open() })
  button.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); open('first') }
    else if (e.key === 'ArrowUp') { e.preventDefault(); open('last') }
  })
  popup.addEventListener('keydown', (e) => {
    const list = els()
    const i = list.indexOf(document.activeElement as HTMLButtonElement)
    const go = (n: number): void => { e.preventDefault(); list[(n + list.length) % list.length]?.focus() }
    if (e.key === 'ArrowDown') go(i + 1)
    else if (e.key === 'ArrowUp') go(i - 1)
    else if (e.key === 'Home') go(0)
    else if (e.key === 'End') go(list.length - 1)
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true) }
    else if (e.key === 'Tab') close()
  })
  const onOutside = (e: Event): void => { if (isOpen() && !root.contains(e.target as Node)) close() }
  document.addEventListener('pointerdown', onOutside, true)
  root.addEventListener('focusout', (e) => { if (isOpen() && e.relatedTarget && !root.contains(e.relatedTarget as Node)) close() })

  const render = (): void => {
    popup.replaceChildren()
    for (const it of items) {
      const b = document.createElement('button')
      b.type = 'button'
      b.setAttribute('role', 'menuitemradio')
      b.setAttribute('aria-checked', String(it.id === value))
      b.tabIndex = -1
      b.dataset.id = it.id
      b.textContent = it.label
      b.addEventListener('click', () => { onSelect(it.id); close(true) })
      popup.append(b)
    }
  }
  return {
    root, button,
    setItems(list) { items = list; render() },
    setValue(id) { value = id; for (const b of els()) b.setAttribute('aria-checked', String(b.dataset.id === id)) },
    setLabel(label) { text.textContent = label },
    close: () => close(),
    destroy() { document.removeEventListener('pointerdown', onOutside, true); root.remove() },
  }
}
