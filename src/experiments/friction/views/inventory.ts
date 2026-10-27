// Inventory panel: what is in the box and what is on the table. Distractors are listed like any other item.
import { ITEM_IDS, type ItemId } from '../apparatus/index.ts'
import type { MountView, View } from './view.ts'
import { button, card, el, rebuild, svg, watch } from '../../../core/views/dom.ts'
import { fmt } from '../../../core/pedagogy/dom.ts'
import { strings } from './strings/inventory.ts'

/** 24 px line icons, one per item (generic drawings, no brand marks). */
const ICONS: Record<ItemId, string[]> = {
  alBar: ['M3 10h18v5H3z', 'M3 12.5h18'], woodBar: ['M3 10h18v5H3z', 'M6 12h4M13 13h4'], ironBar: ['M3 10h18v5H3z', 'M3 10l3-2h15'],
  block: ['M5 9h14v9H5z', 'M5 9l3-3h14l-3 3', 'M19 12h3'], scale1N: ['M10 3h4v14h-4z', 'M12 17v4', 'M12 3V1'], scale2N: ['M10 3h4v14h-4z', 'M12 17v4', 'M10 8h4'],
  rail: ['M3 15L21 9', 'M3 18L21 12'], masses50: ['M6 12h12v6H6z', 'M9 12v-2h6v2'], tape: ['M4 8h16v10H4z', 'M4 12h6M7 12v3M20 11h2v4h-2'],
  paper: ['M7 3h8l4 4v14H7z', 'M15 3v4h4'], rackStand: ['M9 3v18', 'M9 7h6M9 11h6', 'M5 21h8'], standBase: ['M3 17h18v4H3z', 'M12 17V9'],
  stopwatch: ['M12 21a7 7 0 1 0 0-.1', 'M12 14v-4M10 3h4'], balance: ['M4 18h16', 'M12 18V6', 'M5 9h14', 'M5 9l-2 4h4zM19 9l-2 4h4z'],
  masses10: ['M8 14h8v4H8z', 'M10 14v-2h4v2'], marble: ['M12 20a7 7 0 1 0 0-.1', 'M9 9a3.5 3.5 0 0 1 3-2'],
}
function itemIcon(id: ItemId): SVGElement {
  const g = svg('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', class: 'icon inv-icon' })
  for (const d of ICONS[id]) g.append(svg('path', { d }))
  return g
}

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
  c.body.append(headRow, list, note)
  root.append(c.root)

  function render(): void {
    const T = S()
    const s = app.getState()
    c.title.textContent = T.title
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
