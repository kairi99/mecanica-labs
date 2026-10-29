// Bench setup of exps. 1 and 2: face, added masses, spring scale (and its zero), paper, balance. Every choice goes through the apparatus;
// a refused action reaches the shell's message line.
import { MASS_STEPS, type FaceId, type PaperState, type SpringScaleId } from '../apparatus/index.ts'
import type { MountView, View } from './view.ts'
import { button, card, el, rebuild, watch } from '../../../core/views/dom.ts'
import { fmt } from '../../../core/pedagogy/dom.ts'
import { strings } from './strings/bench.ts'
import { strings as ddCore } from '../../../core/dragdrop/strings.ts'

export const mountBench = (panel = 'bench'): MountView => (root, ctx): View => {
  const app = ctx.apparatus
  const S = () => strings[ctx.lang()]
  const w = watch(app)
  const c = card(panel, S().title, 'card-bench')
  const intro = el('p', 'muted')
  const groups = el('div', 'seg-groups')
  // the setup is arranged by dragging on the stage; these buttons are the non-dragging path (WCAG 2.5.7), folded away by default
  const manual = el('details', 'inv-manual')
  const manualSum = el('summary', 'inv-manual-sum')
  const manualBody = el('div', 'seg-groups')
  manual.append(manualSum, manualBody)
  c.body.append(intro, manual, groups)
  root.append(c.root)

  function seg(label: string, opts: Array<{ id: string; text: string; on: boolean; run: () => void; k: string }>): HTMLElement {
    const g = el('div', 'seg-group', undefined, { role: 'group', 'aria-label': label })
    g.append(el('span', 'seg-label', label))
    const row = el('div', 'seg-row')
    for (const o of opts) {
      const b = button(o.text, `seg-btn${o.on ? ' on' : ''}`, () => { o.run(); ctx.changed() })
      b.setAttribute('aria-pressed', String(o.on))
      b.dataset.k = o.k
      row.append(b)
    }
    g.append(row)
    return g
  }

  function render(): void {
    const T = S()
    const s = app.getState()
    c.title.textContent = T.title
    intro.textContent = T.intro
    manualSum.textContent = ddCore[ctx.lang()].disclosure
    rebuild(manualBody, () => {
      manualBody.append(
        seg(T.face, (['cloth', 'sandpaper'] as FaceId[]).map((f) => ({ id: f, text: T.faces[f], on: s.face === f, run: () => app.setFace(f), k: `face-${f}` }))),
        seg(T.masses, Array.from({ length: MASS_STEPS }, (_, n) => ({ id: String(n), text: fmt(T.massOpt, { g: n * 50 }), on: s.addedMasses === n, run: () => app.setAddedMasses(n), k: `mass-${n}` }))),
        seg(T.scale, (['1N', '2N'] as SpringScaleId[]).map((id) => ({ id, text: T.scales[id], on: s.scale === id, run: () => app.chooseScale(id), k: `scale-${id}` }))),
        seg(T.paper, (['none', 'loose', 'fixed'] as PaperState[]).map((p) => ({
          id: p, text: T.paperOpts[p], on: s.paper === p, k: `paper-${p}`,
          run: () => { if (p === 'none') app.removePaper(); else app.placePaper(p) },
        }))), el('p', 'why', T.paperHint),
      )
    })
    rebuild(groups, () => {
      // zero screw
      const z = el('div', 'bench-zero')
      const zb = button(T.zero, 'btn btn-sm', () => { app.zeroScale(); ctx.changed() })
      zb.dataset.k = 'zero'
      const zeroed = s.scale !== null && s.zeroed[s.scale]
      z.append(zb, el('p', zeroed ? 'readout-text' : 'why', s.scale === null ? T.noScale : zeroed ? T.zeroDone : T.zeroTodo))
      groups.append(z)
      // balance
      const wb = el('div', 'bench-weigh')
      const b = button(T.weigh, 'btn btn-sm', () => { app.weigh('block'); ctx.changed() })
      b.dataset.k = 'weigh'
      wb.append(b, el('p', s.measuredBlock_kg === null ? 'why' : 'readout-text', s.measuredBlock_kg === null ? T.notWeighed : fmt(T.weighed, { m: (s.measuredBlock_kg * 1000).toFixed(1).replace('.', ctx.lang() === 'es' ? ',' : '.') })))
      groups.append(wb)
    })
  }
  return {
    update() { if (w.dirty()) { w.clear(); render() } },
    relabel() { w.touch() },
    focus(targets) { c.root.classList.toggle('focus', !!targets && targets.length > 0) },
    destroy() { w.off(); c.root.remove() },
  }
}
