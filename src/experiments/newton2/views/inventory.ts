// Inventory and assembly panel: what is on the table, how it is joined, what is missing.
import {
  REQUIRED_ITEM_IDS, SCREWS_PER_JOINT, type ApparatusState, type ItemId, type JointId, type Reason,
} from '../apparatus/index.ts'
import type { MountView, View } from './view.ts'
import { button, card, el, rebuild, setBlocked, isBlocked, watch } from '../../../core/views/dom.ts'
import { reasonText } from './reasons.ts'
import { itemIcon } from './itemIcons.ts'
import { strings } from './strings/inventory.ts'
import { strings as ddStrings } from './strings/dragdrop.ts'
import { strings as ddCore } from '../../../core/dragdrop/strings.ts'

/** Items shown in the guide's order, then the alternative dynamometer and the parts this practice does not use. */
const ORDER: ItemId[] = [
  'rail', 'cart', 'rackStand', 'standBase', 'receiver', 'screws', 'level', 'string', 'canister', 'brassScrew', 'plasticScrews', 'masses',
  'balance', 'dynamometer', 'dynamometer2N', 'stopwatch', 'markers', 'twoLegStand', 'mass50', 'marble',
]
const JOINTS: JointId[] = ['standBase', 'rackClamp', 'receiver', 'stringCart', 'stringCanister', 'stringPulley']

type Block = { reason: Reason; item?: ItemId } | null

/** Why a joint cannot be made right now (mirrors the order of checks in Apparatus.attach). */
export function jointBlock(s: ApparatusState, joint: JointId): Block {
  const has = (i: ItemId): boolean => s.items[i]
  const need = (...ids: ItemId[]): Block => {
    for (const i of ids) if (!has(i)) return { reason: 'itemNotOnTable', item: i }
    return null
  }
  const done = joint === 'rackClamp' ? s.joints.rackClamp !== null : s.joints[joint]
  const miss = joint === 'standBase' ? need('rackStand', 'standBase')
    : joint === 'rackClamp' ? need('rail', 'rackStand')
      : joint === 'receiver' ? need('rail', 'receiver')
        : joint === 'stringCart' ? need('string', 'cart', 'brassScrew')
          : joint === 'stringCanister' ? need('string', 'canister') : need('string', 'receiver')
  if (miss) return miss
  if (done) return { reason: 'alreadyAttached' }
  if (joint === 'rackClamp' && !s.joints.standBase) return { reason: 'needStandBase' }
  if (joint === 'receiver' && s.joints.rackClamp === null) return { reason: 'needRackClamp' }
  if (joint === 'stringPulley' && !s.joints.receiver) return { reason: 'needReceiver' }
  if (joint === 'rackClamp' || joint === 'receiver') {
    if (!has('screws')) return { reason: 'itemNotOnTable', item: 'screws' }
    if (s.screwsAvailable < SCREWS_PER_JOINT) return { reason: 'noScrews' }
  }
  return null
}

/** Items that are "fixed" (joined to the rail or the base) rather than just on the table. */
function isFixed(id: ItemId, s: ApparatusState): boolean {
  if (id === 'standBase') return s.joints.standBase
  if (id === 'rackStand') return s.joints.rackClamp !== null
  if (id === 'receiver') return s.joints.receiver
  return false
}

export const mountInventory: MountView = (root, ctx): View => {
  const app = ctx.apparatus
  const S = () => strings[ctx.lang()]
  const w = watch(app)
  const c = card('inventory', S().title, 'card-inventory')
  const headRow = el('div', 'inv-head')
  const summary = el('p', 'inv-summary')
  const bulk = el('div', 'inv-bulk')
  const putAll = button('', 'link-btn', () => { for (const id of REQUIRED_ITEM_IDS) if (!app.getState().items[id]) app.addItem(id); ctx.changed() })
  const removeAll = button('', 'link-btn', () => { for (const id of [...ORDER].reverse()) if (app.getState().items[id]) app.removeItem(id); ctx.changed() })
  bulk.append(putAll, removeAll)
  headRow.append(summary, bulk)
  const list = el('ul', 'inv-list')
  const note = el('p', 'muted')
  const jointsHead = el('h3', 'sub-title')
  const jointsIntro = el('p', 'muted')
  const joints = el('div', 'joint-list')
  const missHead = el('h3', 'sub-title')
  const missing = el('div', 'missing')
  // the drag-and-drop path is the main one (tray and stage); the buttons stay in a folded section as the non-dragging alternative
  const intro = el('p', 'muted dd-intro')
  const manual = el('details', 'inv-manual')
  const manualSum = el('summary', 'inv-manual-sum')
  manual.append(manualSum, headRow, list, note, jointsHead, jointsIntro, joints)
  c.body.append(intro, manual, missHead, missing)
  root.append(c.root)
  const openInfo = new Set<ItemId>()
  const fill = (tpl: string, vars: Record<string, string | number>): string =>
    tpl.replace(/\{(\w+)\}/g, (_m, k: string) => String(vars[k] ?? ''))
  function itemRow(id: ItemId, s: ApparatusState, suggested: boolean): HTMLElement {
    const T = S()
    const on = s.items[id]
    const li = el('li', `inv-item${on ? ' on' : ''}`)
    const row = el('div', 'inv-row')
    const name = el('span', 'inv-name', T.items[id].name)
    const fixed = on && isFixed(id, s)
    const tag = el('span', `chip${on ? ' chip-on' : ''}`, fixed ? T.attached : on ? T.onTable : T.inBox)
    const text = el('div', 'inv-text')
    text.append(name, tag)
    const info = button('i', 'info-btn inv-info')
    info.dataset.k = `info-${id}`
    info.setAttribute('aria-label', fill(T.info, { x: T.items[id].name }))
    info.setAttribute('aria-expanded', String(openInfo.has(id)))
    const lock = (id === 'screws' && on && s.screwsUsed > 0) || (id === 'plasticScrews' && on && s.plasticScrewsUsed > 0)
    const b = button(on ? T.remove : T.add, `link-btn${suggested ? ' link-accent' : ''}`, () => {
      if (isBlocked(b)) { app.removeItem(id); ctx.changed(); return } // the refusal feeds the shell's message line
      const r = on ? app.removeItem(id) : app.addItem(id)
      void r
      ctx.changed()
    })
    b.dataset.k = `item-${id}`
    b.setAttribute('aria-label', `${on ? T.remove : T.add}: ${T.items[id].name}`)
    setBlocked(b, lock)
    row.append(itemIcon(id), text, info, b)
    li.append(row)
    const hint = el('p', 'inv-hint', T.items[id].hint)
    hint.hidden = !openInfo.has(id)
    info.addEventListener('click', () => {
      if (openInfo.has(id)) openInfo.delete(id); else openInfo.add(id)
      hint.hidden = !openInfo.has(id)
      info.setAttribute('aria-expanded', String(openInfo.has(id)))
    })
    li.append(hint)
    if (id === 'screws' && on) li.append(el('p', 'inv-hint', fill(T.screws, { n: s.screwsAvailable })))
    return li
  }
  function jointRow(joint: JointId, s: ApparatusState, suggested: boolean): HTMLElement {
    const T = S()
    const j = T.joints[joint]
    const done = joint === 'rackClamp' ? s.joints.rackClamp !== null : s.joints[joint]
    const row = el('div', `joint${done ? ' done' : ''}`)
    const head = el('div', 'joint-head')
    head.append(el('span', 'joint-mark', done ? '✓' : '○', { 'aria-hidden': 'true' }), el('span', 'inv-name', j.name), el('span', `chip${done ? ' chip-on' : ''}`, done ? j.done : j.todo))
    row.append(head)
    if (joint === 'rackClamp' && s.joints.rackClamp) {
      row.append(el('p', 'muted', fill(T.standEndIs, { x: s.joints.rackClamp === 'E1' ? '0 mm' : '1200 mm' })))
    }
    const actions = el('div', 'joint-actions')
    const why = el('p', 'why')
    const blk = done ? null : jointBlock(s, joint)
    if (done) {
      const b = button(j.undo, 'link-btn', () => { app.detach(joint); ctx.changed() })
      b.dataset.k = `j-${joint}-undo`
      actions.append(b)
    } else if (joint === 'rackClamp') {
      for (const end of ['E1', 'E2'] as const) {
        const b = button(end === 'E1' ? T.attachE1 : T.attachE2, `btn btn-sm${suggested && end === 'E1' ? ' btn-primary' : ''}`, () => {
          if (isBlocked(b)) return
          app.attach(joint, { railEnd: end }); ctx.changed()
        })
        b.dataset.k = `j-${joint}-${end}`
        setBlocked(b, blk !== null)
        const wrap = el('div', 'joint-opt')
        wrap.append(b, el('span', 'muted', end === 'E1' ? T.hintE1 : T.hintE2))
        actions.append(wrap)
      }
    } else {
      const b = button(j.doIt, `btn btn-sm${suggested ? ' btn-primary' : ''}`, () => { if (isBlocked(b)) return; app.attach(joint); ctx.changed() })
      b.dataset.k = `j-${joint}`
      setBlocked(b, blk !== null)
      actions.append(b)
    }
    if (blk) why.textContent = reasonText(ctx.lang(), blk.reason, blk.item)
    row.append(actions)
    if (why.textContent) row.append(why)
    return row
  }
  function render(): void {
    const T = S()
    c.title.textContent = T.title
    intro.textContent = ddStrings[ctx.lang()].inventoryIntro
    manualSum.textContent = ddCore[ctx.lang()].disclosure
    const s = app.getState()
    const nOn = ORDER.filter((i) => s.items[i]).length
    summary.textContent = fill(T.summary, { n: nOn })
    putAll.textContent = T.putAll
    removeAll.textContent = T.removeAll
    putAll.hidden = REQUIRED_ITEM_IDS.every((i) => s.items[i])
    removeAll.hidden = nOn === 0
    note.textContent = T.distractorNote
    jointsHead.textContent = T.jointsTitle
    jointsIntro.textContent = T.jointsIntro
    missHead.textContent = T.missingTitle
    const nextItem = REQUIRED_ITEM_IDS.find((i) => !s.items[i] && !(i === 'dynamometer' && s.items.dynamometer2N))
    rebuild(list, () => { for (const id of ORDER) list.append(itemRow(id, s, id === nextItem)) })
    const nextJoint = nextItem === undefined ? JOINTS.find((j) => jointBlock(s, j) === null) : undefined
    rebuild(joints, () => { for (const j of JOINTS) joints.append(jointRow(j, s, j === nextJoint)) })
    rebuild(missing, () => {
      const m = app.missing()
      if (m.length === 0) { missing.append(el('p', 'ok-note', T.missingNone)); return }
      const ul = el('ul', 'miss-list')
      for (const e of m) {
        const name = e.kind === 'item' ? T.items[e.id as ItemId].name : T.joints[e.id as JointId].name
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
