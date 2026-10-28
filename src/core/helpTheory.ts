// Script of the static help pages: reveals the sections marked `data-locked="theory"` once the experiment's theory is unlocked
// (flag in localStorage, or the teacher override `?theory=1`), and keeps the override on the page's own header links.
import { isTheoryUnlocked, theoryOverride, THEORY_PARAM } from './theory.ts'

export function initHelpTheory(doc: Document = document): void {
  const id = doc.body?.dataset.experiment
  if (!id) return
  const search = globalThis.location?.search ?? ''
  const open = isTheoryUnlocked(id, search)
  doc.querySelectorAll<HTMLElement>('[data-locked="theory"]').forEach((e) => { e.hidden = !open })
  doc.querySelectorAll<HTMLElement>('[data-theory-notice]').forEach((e) => { e.hidden = open })
  if (!theoryOverride(search)) return
  // keep the override across the language switch and the way back to the lab
  doc.querySelectorAll<HTMLAnchorElement>('header a[href]').forEach((a) => {
    const href = a.getAttribute('href') ?? ''
    if (/^(https?:|#)/.test(href)) return
    const [path = '', hash = ''] = href.split('#')
    a.setAttribute('href', `${path}${path.includes('?') ? '&' : '?'}${THEORY_PARAM}=1${hash ? `#${hash}` : ''}`)
  })
}
