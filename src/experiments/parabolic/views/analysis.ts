// Analysis pane (step 5): a placeholder until the analysis phase. It renders no data.
import type { MountView, View } from './view.ts'
import { card, el } from '../../../core/views/dom.ts'
import { strings } from './strings/analysis.ts'

export const mountAnalysis: MountView = (root, ctx): View => {
  const S = () => strings[ctx.lang()]
  const c = card('analysis', S().title, 'card-analysis')
  c.root.dataset.region = 'analysis'
  const chip = el('p', 'chip')
  const body = el('p', 'muted')
  c.body.append(chip, body)
  root.append(c.root)
  function labels(): void {
    c.title.textContent = S().title
    chip.textContent = S().soon
    body.textContent = S().body
  }
  labels()
  return { update() {}, relabel: labels, destroy() { c.root.remove() } }
}
