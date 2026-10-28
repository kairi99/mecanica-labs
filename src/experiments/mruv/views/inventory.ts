// Inventory and assembly panel: what is on the table, how it is joined, what is missing.
import { SCREWS_PER_JOINT, type ApparatusState, type ItemId, type JointId, type Reason, type RailEnd } from '../apparatus/index.ts'
import type { MountView, View } from './view.ts'
import { button, card, el, rebuild, setBlocked, isBlocked, watch } from '../../../core/views/dom.ts'
import { reasonText } from './reasons.ts'
import { itemIcon } from './itemIcons.ts'
import { strings } from './strings/inventory.ts'
import { strings as ddStrings } from './strings/dragdrop.ts'

/** Items shown in the guide's order. */
const ORDER: ItemId[] = ['rail', 'cart', 'rackStand', 'standBase', 'twoLegStand', 'screws', 'level', 'receiver', 'stopwatch', 'tape', 'markers']

type Block = { reason: Reason; item?: ItemId } | null

/** Why a joint cannot be made right now (mirrors the order of checks in Apparatus.attach). */
export function jointBlock(s: ApparatusState, joint: JointId, railEnd?: RailEnd): Block {
  const has = (i: ItemId): boolean => s.items[i]
  if (joint === 'standBase') {
    if (!has('rackStand')) return { reason: 'itemNotOnTable', item: 'rackStand' }
    if (!has('standBase')) return { reason: 'itemNotOnTable', item: 'standBase' }
    return s.joints.standBase ? { reason: 'alreadyAttached' } : null
  }
  if (!has('rail')) return { reason: 'itemNotOnTable', item: 'rail' }
  const own: ItemId = joint === 'rackClamp' ? 'rackStand' : joint
  if (!has(own)) return { reason: 'itemNotOnTable', item: own }
  const done = joint === 'rackClamp' ? s.joints.rackClamp !== null : s.joints[joint]
  if (done) return { reason: 'alreadyAttached' }
  if (joint === 'rackClamp') {
    if (!s.joints.standBase) return { reason: 'needStandBase' }
    void railEnd
  } else if (s.joints.rackClamp === null) return { reason: 'needRackClamp' }
  if (!has('screws')) return { reason: 'itemNotOnTable', item: 'screws' }
  if (s.screwsAvailable < SCREWS_PER_JOINT) return { reason: 'noScrews' }
  return null
}

/** Items that are "fixed" (joined to the rail or the base) rather than just on the table. */
function isFixed(id: ItemId, s: ApparatusState): boolean {
  if (id === 'standBase') return s.joints.standBase
  if (id === 'rackStand') return s.joints.rackClamp !== null
  if (id === 'twoLegStand') return s.joints.twoLegStand
  if (id === 'receiver') return s.joints.receiver
  return false
}

export const mountInventory: MountView = (root, ctx): View => {
  const app = ctx.apparatus
  const S = () => strings[ctx.lang()]
  const dd = () => ddStrings[ctx.lang()]
  const w = watch(app)
  const c = card('inventory', S().title, 'card-inventory')
  const headRow = el('div', 'inv-head')
  const summary = el('p', 'inv-summary')
  const bulk = el('div', 'inv-bulk')
  const putAll = button('', 'link-btn', () => { for (const id of ORDER) if (!app.getState().items[id]) app.addItem(id); ctx.changed() })
  const removeAll = button('', 'link-btn', () => { for (const id of [...ORDER].reverse()) if (app.getState().items[id]) app.removeItem(id); ctx.changed() })
  bulk.append(putAll, removeAll)
  headRow.append(summary, bulk)
  const list = el('ul', 'inv-list')
  const jointsHead = el('h3', 'sub-title')
  const jointsIntro = el('p', 'muted')
  const joints = el('div', 'joint-list')
  const missHead = el('h3', 'sub-title')
  const missing = el('div', 'missing')
  const intro = el('p', 'muted dd-intro')
  const manual = el('details', 'inv-manual')
  const manualSum = el('summary', 'inv-manual-sum')
  manual.append(manualSum, list, jointsHead, jointsIntro, joints)
  c.body.append(intro, headRow, manual, missHead, missing)
  root.append(c.root)
  const openInfo = new Set<ItemId>()
  const fill = (tpl: string, vars: Record<string, string | number>): string =>
    tpl.replace(/\{(\w+)\}/g, (_m, k: string) => String(vars[k] ?? ''))
  function act(r: { ok: boolean }): void { ctx.changed(); void r }
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
    const lock = id === 'screws' && on && s.screwsUsed > 0
    const b = button(on ? T.remove : T.add, `link-btn${suggested ? ' link-accent' : ''}`, () => {
      if (isBlocked(b)) return
      act(on ? app.removeItem(id) : app.addItem(id))
    })
    b.dataset.k = `item-${id}`
    b.setAttribute('aria-label', `${on ? T.remove : T.add}: ${T.items[id].name}`)
    setBlocked(b, lock)
    if (lock) b.addEventListener('click', () => app.removeItem(id)) // refusal feeds the shell's message line
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
    if (lock) li.append(el('p', 'why', T.screwsInUse))
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
      row.append(el('p', 'muted', fill(T.highEndIs, { x: `${s.joints.rackClamp} (${s.joints.rackClamp === 'E1' ? '0' : '1200'} mm)` })))
    }
    const actions = el('div', 'joint-actions')
    const why = el('p', 'why')
    if (done) {
      const label = joint === 'standBase' ? T.undoStandBase : joint === 'rackClamp' ? T.undoClamp : joint === 'twoLegStand' ? T.undoTwoLeg : T.undoReceiver
      const b = button(label, 'link-btn', () => act(app.detach(joint)))
      b.dataset.k = `j-${joint}-undo`
      actions.append(b)
    } else if (joint === 'rackClamp') {
      const blk = jointBlock(s, joint)
      for (const end of ['E1', 'E2'] as const) {
        const b = button(end === 'E1' ? T.attachE1 : T.attachE2, `btn btn-sm${suggested && end === 'E1' ? ' btn-primary' : ''}`, () => { if (isBlocked(b)) return; act(app.attach(joint, { railEnd: end })) })
        b.dataset.k = `j-${joint}-${end}`
        setBlocked(b, blk !== null)
        b.title = end === 'E1' ? T.hintE1 : T.hintE2
        const wrap = el('div', 'joint-opt')
        wrap.append(b, el('span', 'muted', end === 'E1' ? T.hintE1 : T.hintE2))
        actions.append(wrap)
      }
      if (blk) why.textContent = reasonText(ctx.lang(), blk.reason, blk.item)
    } else {
      const blk = jointBlock(s, joint)
      const label = joint === 'standBase' ? T.doStandBase : joint === 'twoLegStand' ? T.attachTwoLeg : T.attachReceiver
      const b = button(label, `btn btn-sm${suggested ? ' btn-primary' : ''}`, () => { if (isBlocked(b)) return; act(app.attach(joint)) })
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
    intro.textContent = dd().inventoryIntro
    manualSum.textContent = dd().disclosure
    const s = app.getState()
    const nOn = ORDER.filter((i) => s.items[i]).length
    summary.textContent = fill(T.summary, { n: nOn })
    putAll.textContent = T.putAll
    removeAll.textContent = T.removeAll
    putAll.hidden = nOn === ORDER.length
    removeAll.hidden = nOn === 0
    jointsHead.textContent = T.jointsTitle
    jointsIntro.textContent = T.jointsIntro
    missHead.textContent = T.missingTitle
    const nextItem = ORDER.find((i) => !s.items[i])
    rebuild(list, () => { for (const id of ORDER) list.append(itemRow(id, s, id === nextItem)) })
    const order = ['standBase', 'rackClamp', 'twoLegStand', 'receiver'] as const
    const nextJoint = nextItem === undefined ? order.find((j) => jointBlock(s, j) === null) : undefined
    rebuild(joints, () => { for (const j of order) joints.append(jointRow(j, s, j === nextJoint)) })
    rebuild(missing, () => {
      const m = app.missing()
      if (m.length === 0) { missing.append(el('p', 'ok-note', T.missingNone)); return }
      const ul = el('ul', 'miss-list')
      for (const e of m) {
        const name = e.kind === 'item' ? T.items[e.id as ItemId].name : T.joints[e.id as JointId].name
        const li = el('li', undefined, `${fill(e.kind === 'item' ? T.missingItem : T.missingJoint, { x: name })}`)
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
