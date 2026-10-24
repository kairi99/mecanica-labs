// Inventory and assembly panel: what is on the table, how it is joined, what is missing.
import { ITEM_IDS, SCREWS_PER_JOINT, type ApparatusState, type ItemId, type JointId, type Reason } from '../apparatus/index.ts'
import type { MountView, View } from './view.ts'
import { button, card, el, rebuild, setBlocked, isBlocked, svg, watch } from '../../../core/views/dom.ts'
import { reasonText } from './reasons.ts'
import { strings } from './strings/inventory.ts'

type Block = { reason: Reason; item?: ItemId } | null

/** Why a joint cannot be made right now (mirrors the order of checks in ParabolicApparatus.attach). */
export function jointBlock(s: ApparatusState, joint: JointId): Block {
  const has = (i: ItemId): boolean => s.items[i]
  if (joint === 'standBase') {
    if (!has('rackStand')) return { reason: 'itemNotOnTable', item: 'rackStand' }
    if (!has('base')) return { reason: 'itemNotOnTable', item: 'base' }
    return s.joints.standBase ? { reason: 'alreadyAttached' } : null
  }
  if (!has('rail')) return { reason: 'itemNotOnTable', item: 'rail' }
  const own: ItemId = joint === 'rackClamp' ? 'rackStand' : 'twoLeg'
  if (!has(own)) return { reason: 'itemNotOnTable', item: own }
  if (s.joints[joint]) return { reason: 'alreadyAttached' }
  if (joint === 'rackClamp' ? !s.joints.standBase : !s.joints.rackClamp) return { reason: joint === 'rackClamp' ? 'needStandBase' : 'needRackClamp' }
  if (!has('screws')) return { reason: 'itemNotOnTable', item: 'screws' }
  if (s.screwsAvailable < SCREWS_PER_JOINT) return { reason: 'noScrews' }
  return null
}

/** 24 px line icons, one per item (generic drawings, no brand marks). */
const ICONS: Record<ItemId, string[]> = {
  rail: ['M3 15L21 9', 'M3 18L21 12'],
  rackStand: ['M9 3v18', 'M9 7h6M9 11h6', 'M5 21h8'],
  base: ['M3 17h18v4H3z', 'M12 17V9'],
  twoLeg: ['M12 4L6 20M12 4l6 16', 'M8.5 14h7'],
  screws: ['M12 3v13', 'M9 6h6M9 9h6M9 12h6', 'M10 16l2 5 2-5'],
  level: ['M3 9h18v6H3z', 'M10 12h4'],
  marble: ['M12 20a7 7 0 1 0 0-.1', 'M9 9a3.5 3.5 0 0 1 3-2'],
  pingPong: ['M12 21a8 8 0 1 0 0-.1', 'M7 9a6 6 0 0 1 4-3'],
  tapeMeasure: ['M4 8h16v10H4z', 'M4 12h6M7 12v3M20 11h2v4h-2'],
  stopwatch: ['M12 21a7 7 0 1 0 0-.1', 'M12 14v-4M10 3h4'],
  bondPaper: ['M7 3h8l4 4v14H7z', 'M15 3v4h4'],
  carbonPaper: ['M7 3h8l4 4v14H7z', 'M10 12h6M10 16h6'],
}
function itemIcon(id: ItemId): SVGElement {
  const g = svg('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', class: 'icon inv-icon' })
  for (const d of ICONS[id]) g.append(svg('path', { d }))
  return g
}

/** Items shown as "fixed" (joined to the rail or the base) rather than just on the table. */
function isFixed(id: ItemId, s: ApparatusState): boolean {
  if (id === 'base') return s.joints.standBase
  if (id === 'rail' || id === 'rackStand') return s.joints.rackClamp
  if (id === 'twoLeg') return s.joints.twoLegStand
  return false
}

const JOINT_ORDER: JointId[] = ['standBase', 'rackClamp', 'twoLegStand']

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
  const jointsHead = el('h3', 'sub-title')
  const jointsIntro = el('p', 'muted')
  const joints = el('div', 'joint-list')
  const missHead = el('h3', 'sub-title')
  const missing = el('div', 'missing')
  c.body.append(headRow, list, jointsHead, jointsIntro, joints, missHead, missing)
  root.append(c.root)
  const fill = (tpl: string, vars: Record<string, string | number>): string => tpl.replace(/\{(\w+)\}/g, (_m, k: string) => String(vars[k] ?? ''))

  function itemRow(id: ItemId, s: ApparatusState, suggested: boolean): HTMLElement {
    const T = S()
    const on = s.items[id]
    const li = el('li', `inv-item${on ? ' on' : ''}`)
    const row = el('div', 'inv-row')
    const fixed = on && isFixed(id, s)
    const text = el('div', 'inv-text')
    text.append(el('span', 'inv-name', T.items[id]), el('span', `chip${on ? ' chip-on' : ''}`, fixed ? T.attached : on ? T.onTable : T.inBox))
    const lock = id === 'screws' && on && s.screwsUsed > 0
    const b = button(on ? T.remove : T.add, `link-btn${suggested ? ' link-accent' : ''}`, () => {
      if (isBlocked(b)) { app.removeItem(id); ctx.changed(); return } // the refusal feeds the shell's message line
      if (on) app.removeItem(id); else app.addItem(id)
      ctx.changed()
    })
    b.dataset.k = `item-${id}`
    b.setAttribute('aria-label', fill(on ? T.removeAria : T.addAria, { x: T.items[id] }))
    setBlocked(b, lock)
    row.append(itemIcon(id), text, b)
    li.append(row)
    if (id === 'screws' && on) li.append(el('p', 'inv-hint', fill(T.screwsLeft, { n: s.screwsAvailable })))
    if (lock) li.append(el('p', 'why', T.screwsInUse))
    return li
  }
  function jointRow(joint: JointId, s: ApparatusState, suggested: boolean): HTMLElement {
    const T = S()
    const j = T.joints[joint]
    const done = s.joints[joint]
    const row = el('div', `joint${done ? ' done' : ''}`)
    const head = el('div', 'joint-head')
    head.append(el('span', 'joint-mark', done ? '✓' : '○', { 'aria-hidden': 'true' }), el('span', 'inv-name', j.name), el('span', `chip${done ? ' chip-on' : ''}`, done ? j.done : j.todo))
    row.append(head)
    const actions = el('div', 'joint-actions')
    const why = el('p', 'why')
    if (done) {
      const b = button(j.undo, 'link-btn', () => { app.detach(joint); ctx.changed() })
      b.dataset.k = `j-${joint}-undo`
      actions.append(b)
    } else {
      const blk = jointBlock(s, joint)
      const b = button(j.doIt, `btn btn-sm${suggested ? ' btn-primary' : ''}`, () => { if (isBlocked(b)) return; app.attach(joint); ctx.changed() })
      b.dataset.k = `j-${joint}`
      setBlocked(b, blk !== null)
      actions.append(b)
      if (blk) why.textContent = reasonText(ctx.lang(), blk.reason, blk.item)
    }
    row.append(actions)
    if (why.textContent) row.append(why)
    return row
  }
  function render(): void {
    const T = S()
    c.title.textContent = T.title
    const s = app.getState()
    const nOn = ITEM_IDS.filter((i) => s.items[i]).length
    summary.textContent = fill(T.summary, { n: nOn, total: ITEM_IDS.length })
    putAll.textContent = T.putAll
    removeAll.textContent = T.removeAll
    putAll.hidden = nOn === ITEM_IDS.length
    removeAll.hidden = nOn === 0
    jointsHead.textContent = T.jointsTitle
    jointsIntro.textContent = T.jointsIntro
    missHead.textContent = T.missingTitle
    const nextItem = ITEM_IDS.find((i) => !s.items[i])
    rebuild(list, () => { for (const id of ITEM_IDS) list.append(itemRow(id, s, id === nextItem)) })
    const nextJoint = nextItem === undefined ? JOINT_ORDER.find((j) => !s.joints[j] && jointBlock(s, j) === null) : undefined
    rebuild(joints, () => { for (const j of JOINT_ORDER) joints.append(jointRow(j, s, j === nextJoint)) })
    rebuild(missing, () => {
      const m = app.missing()
      if (m.length === 0) { missing.append(el('p', 'ok-note', T.missingNone)); return }
      const ul = el('ul', 'miss-list')
      for (const e of m) {
        const name = e.kind === 'item' ? T.items[e.id as ItemId] : T.joints[e.id as JointId].name
        const li = el('li', undefined, fill(e.kind === 'item' ? T.missingItem : T.missingJoint, { x: name }))
        if (e.reason !== 'notOnTable') li.append(el('span', 'muted', ` (${T.missingReasons[e.reason]})`))
        if (e.blocksRun) li.append(el('span', 'chip chip-need', T.blocksRun))
        ul.append(li)
      }
      missing.append(ul)
    })
  }
  return {
    update() { if (w.dirty()) { w.clear(); render() } },
    relabel() { w.touch() },
    destroy() { w.off(); c.root.remove() },
  }
}
