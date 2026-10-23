// Tiny DOM helpers shared by the views. No physics, no state.

const SVG_NS = 'http://www.w3.org/2000/svg'

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K, cls?: string, text?: string, attrs?: Record<string, string>,
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag)
  if (cls) e.className = cls
  if (text !== undefined) e.textContent = text
  if (attrs) for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
  return e
}

export function svg<K extends keyof SVGElementTagNameMap>(
  tag: K, attrs: Record<string, string | number> = {}, ...kids: (SVGElement | string)[]
): SVGElementTagNameMap[K] {
  const e = document.createElementNS(SVG_NS, tag)
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v))
  for (const k of kids) e.append(typeof k === 'string' ? document.createTextNode(k) : k)
  return e
}

/** A <button type=button>. */
export function button(text: string, cls: string, onClick?: (e: MouseEvent) => void): HTMLButtonElement {
  const b = el('button', cls, text, { type: 'button' })
  if (onClick) b.addEventListener('click', onClick)
  return b
}

/** Disable a button the accessible way: stays focusable, announces the state, and ignores activation. */
export function setBlocked(b: HTMLElement, blocked: boolean): void {
  if (blocked) b.setAttribute('aria-disabled', 'true')
  else b.removeAttribute('aria-disabled')
}
export const isBlocked = (b: HTMLElement): boolean => b.getAttribute('aria-disabled') === 'true'

/** Anything views can watch: the apparatus (or another model) that announces every change to its listeners. */
export interface Subscribable { on(listener: () => void): () => void }

/** Dirty flag that flips on any model event (also refusals). */
export function watch(app: Subscribable): { dirty: () => boolean; clear: () => void; touch: () => void; off: () => void } {
  let d = true
  const off = app.on(() => { d = true })
  return { dirty: () => d, clear: () => { d = false }, touch: () => { d = true }, off }
}

/** Rebuild a container's children but keep keyboard focus on the element with the same `data-k`. */
export function rebuild(container: HTMLElement, build: () => void): void {
  const active = document.activeElement
  const key = active instanceof HTMLElement && container.contains(active) ? active.dataset.k : undefined
  container.replaceChildren()
  build()
  if (key) container.querySelector<HTMLElement>(`[data-k="${CSS.escape(key)}"]`)?.focus({ preventScroll: true })
}

/** True when the keyboard focus sits in something that takes typed text (the stopwatch keys must not fire there). */
export function isTextTarget(t: EventTarget | null): boolean {
  const n = t as { tagName?: string; type?: string; isContentEditable?: boolean } | null
  if (!n || typeof n.tagName !== 'string') return false
  if (n.isContentEditable) return true
  if (n.tagName === 'TEXTAREA' || n.tagName === 'SELECT') return true
  if (n.tagName === 'INPUT') return !['button', 'checkbox', 'radio', 'range', 'submit', 'reset'].includes(n.type ?? 'text')
  return false
}

/** Roles whose keyboard behaviour the page must never override (Space / Enter / S / R belong to them). */
const WIDGET_ROLES = new Set(['button', 'checkbox', 'radio', 'switch', 'tab', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'option', 'slider', 'link', 'combobox', 'textbox', 'spinbutton'])

/**
 * True when the keyboard focus sits on something that has its own Space / Enter behaviour: a button, link, summary, checkbox,
 * radio, range, select, text input, [role=button] and friends. The global stopwatch shortcuts must leave these alone.
 */
export function isInteractiveTarget(t: EventTarget | null): boolean {
  if (isTextTarget(t)) return true
  const n = t as { tagName?: string; getAttribute?: (k: string) => string | null; isContentEditable?: boolean } | null
  if (!n || typeof n.tagName !== 'string') return false
  const tag = n.tagName
  if (tag === 'BUTTON' || tag === 'A' || tag === 'SUMMARY' || tag === 'INPUT' || tag === 'DETAILS' || tag === 'DIALOG') return true
  const role = typeof n.getAttribute === 'function' ? n.getAttribute('role') : null
  return role !== null && WIDGET_ROLES.has(role)
}

/** True when the target is inside the timing bar (its own controls handle their own Space / Enter). */
export function inTimingBar(t: EventTarget | null): boolean {
  const n = t as { closest?: (s: string) => unknown } | null
  return !!n && typeof n.closest === 'function' && n.closest('[data-timing-bar]') !== null
}

let uid = 0
export const nextId = (p: string): string => `${p}-${++uid}`

/** A card: <section> with a heading and a body. `panel` is the key a 3D part card can open. */
export function card(panel: string, title: string, cls = ''): { root: HTMLElement; head: HTMLElement; title: HTMLElement; body: HTMLElement } {
  const root = el('section', `card ${cls}`.trim(), undefined, { 'data-panel': panel })
  const id = nextId('h')
  const head = el('header', 'card-head')
  const h = el('h2', 'card-title', title, { id })
  head.append(h)
  const body = el('div', 'card-body')
  root.setAttribute('aria-labelledby', id)
  root.append(head, body)
  return { root, head, title: h, body }
}
