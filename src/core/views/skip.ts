// Skip link (WCAG 2.4.1): the first focusable element of a page. It moves focus to the main region without touching the URL hash
// (the landing page reads the hash). Hidden until it has the keyboard focus (.skip-link in app.css).
import { el } from './dom.ts'

export interface SkipLink { link: HTMLAnchorElement; setLabel(text: string): void }

export function mountSkipLink(main: HTMLElement): SkipLink {
  if (!main.id) main.id = 'main'
  main.tabIndex = -1
  const link = el('a', 'skip-link', undefined, { href: `#${main.id}` })
  link.addEventListener('click', (e) => { e.preventDefault(); main.focus() })
  return { link, setLabel: (text) => { link.textContent = text } }
}
