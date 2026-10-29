// Inventory panel: what is in the box and what is on the table. Distractors are listed like any other item.
import { ITEM_IDS } from '../apparatus/index.ts'
import type { MountView, View } from './view.ts'
import { button, card, el, rebuild, watch } from '../../../core/views/dom.ts'
import { fmt } from '../../../core/pedagogy/dom.ts'
import { strings } from './strings/inventory.ts'
import { strings as ddStrings } from './strings/dragdrop.ts'
import { strings as ddCore } from '../../../core/dragdrop/strings.ts'
import { itemIcon } from './itemIcons.ts'

export const mountInventory: MountView = (root, ctx): View => {
  const app = ctx.apparatus
  const S = () => strings[ctx.lang()]
  const w = watch(app)
  const c = card('inventory', S().title, 'card-inventory')
  const headRow = el('div', 'inv-head')
  const summary = el('p', 'inv-summary')
  const bulk = el('div', 'inv-bulk')
  const putAll = button('', 'link-btn', () => { for (const id of ITEM_IDS) if (!app.getState().items[id]) app.addItem(id); ctx.changed() })
  const removeAll = button('', 'link-btn', () => { for (const id of [...ITEM_IDS].reverse()) if (app.getState().items[id]) app.removeItem(id); ctx.changed() })
  bulk.append(putAll, removeAll)
  headRow.append(summary, bulk)
  const list = el('ul', 'inv-list')
  const note = el('p', 'muted')
  const intro = el('p', 'muted dd-intro')
  // the button path (WCAG 2.5.7): every drag has a non-dragging equivalent, folded away by default
  const manual = el('details', 'inv-manual')
  const manualSum = el('summary', 'inv-manual-sum')
  manual.append(manualSum, headRow, list)
  c.body.append(intro, manual, note)
  root.append(c.root)

  function render(): void {
    const T = S()
    const s = app.getState()
    c.title.textContent = T.title
    intro.textContent = ddStrings[ctx.lang()].inventoryIntro
    manualSum.textContent = ddCore[ctx.lang()].disclosure
    putAll.textContent = T.putAll
    removeAll.textContent = T.removeAll
    summary.textContent = fmt(T.summary, { n: ITEM_IDS.filter((i) => s.items[i]).length, total: ITEM_IDS.length })
    note.textContent = T.note
    rebuild(list, () => {
      for (const id of ITEM_IDS) {
        const on = s.items[id]
        const li = el('li', `inv-item${on ? ' on' : ''}`)
        const row = el('div', 'inv-row')
        const text = el('div', 'inv-text')
        text.append(el('span', 'inv-name', T.items[id]), el('span', `chip${on ? ' chip-on' : ''}`, on ? T.onTable : T.inBox))
        const b = button(on ? T.remove : T.add, 'link-btn', () => { if (on) app.removeItem(id); else app.addItem(id); ctx.changed() })
        b.dataset.k = `item-${id}`
        b.setAttribute('aria-label', `${on ? T.remove : T.add}: ${T.items[id]}`)
        row.append(itemIcon(id), text, b)
        li.append(row)
        list.append(li)
      }
    })
  }
  return {
    update() { if (w.dirty()) { w.clear(); render() } },
    relabel() { w.touch() },
    destroy() { w.off(); c.root.remove() },
  }
}
