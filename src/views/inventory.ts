// Inventory and assembly panel: what is on the table, how it is joined, what is missing.
import { SCREWS_PER_JOINT, type ApparatusState, type ItemId, type JointId, type Reason, type RailEnd } from '../apparatus/index.ts'
import type { MountView, View } from './view.ts'
import { button, card, el, rebuild, setBlocked, isBlocked, watch } from './dom.ts'
import { reasonText } from './reasons.ts'
import { strings } from './strings/inventory.ts'

/** Items shown in the guide's order. */
const ORDER: ItemId[] = ['rail', 'cart', 'rackStand', 'standBase', 'twoLegStand', 'screws', 'level', 'receiver', 'stopwatch', 'caliper', 'markers']

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

export const mountInventory: MountView = (root, ctx): View => {
  const app = ctx.apparatus
  const S = () => strings[ctx.lang()]
  const w = watch(app)
  const c = card('inventory', S().title, 'card-inventory')
  const summary = el('p', 'muted')
  const itemsHead = el('h3', 'sub-title')
  const list = el('ul', 'inv-list')
  const jointsHead = el('h3', 'sub-title')
  const jointsIntro = el('p', 'muted')
  const joints = el('div', 'joint-list')
  const missHead = el('h3', 'sub-title')
  const missing = el('div', 'missing')
  c.body.append(summary, itemsHead, list, jointsHead, jointsIntro, joints, missHead, missing)
  root.append(c.root)

  const fill = (tpl: string, vars: Record<string, string | number>): string =>
    tpl.replace(/\{(\w+)\}/g, (_m, k: string) => String(vars[k] ?? ''))

  function act(r: { ok: boolean }): void { ctx.changed(); void r }

  function itemRow(id: ItemId, s: ApparatusState): HTMLElement {
    const T = S()
    const on = s.items[id]
    const li = el('li', `inv-item${on ? ' on' : ''}`)
    const text = el('div', 'inv-text')
    const name = el('span', 'inv-name', T.items[id].name)
    const hint = el('span', 'inv-hint', T.items[id].hint)
    const nameLine = el('span', 'inv-nameline')
    nameLine.append(name)
    text.append(nameLine, hint)
    if (id === 'screws' && on) text.append(el('span', 'inv-hint', fill(T.screws, { n: s.screwsAvailable })))
    const tag = el('span', `chip${on ? ' chip-on' : ''}`, on ? T.onTable : T.inBox)
    const lock = id === 'screws' && on && s.screwsUsed > 0
    const b = button(on ? T.remove : T.add, `btn ${on ? 'btn-quiet' : 'btn-primary'}`, () => {
      if (isBlocked(b)) return
      act(on ? app.removeItem(id) : app.addItem(id))
    })
    b.dataset.k = `item-${id}`
    b.setAttribute('aria-label', fill(on ? T.removeAria : T.addAria, { x: T.items[id].name }))
    setBlocked(b, lock)
    if (lock) b.addEventListener('click', () => app.removeItem(id)) // refusal feeds the shell's message line
    nameLine.append(tag)
    const row = el('div', 'inv-row')
    row.append(text, b)
    li.append(row)
    if (lock) li.append(el('p', 'why', T.screwsInUse))
    if (id === 'caliper' && on) {
      const seg = el('div', 'seg', undefined, { role: 'group', 'aria-label': T.caliperVariant })
      for (const v of ['vernier', 'digital'] as const) {
        const sb = button(T[v], `seg-btn${s.caliper.variant === v ? ' active' : ''}`, () => act(app.setCaliperVariant(v)))
        sb.setAttribute('aria-pressed', String(s.caliper.variant === v))
        sb.dataset.k = `cal-${v}`
        seg.append(sb)
      }
      li.append(seg)
    }
    return li
  }

  function jointRow(joint: JointId, s: ApparatusState): HTMLElement {
    const T = S()
    const j = T.joints[joint]
    const done = joint === 'rackClamp' ? s.joints.rackClamp !== null : s.joints[joint]
    const row = el('div', `joint${done ? ' done' : ''}`)
    const head = el('div', 'joint-head')
    head.append(el('span', 'inv-name', j.name), el('span', `chip${done ? ' chip-on' : ''}`, done ? j.done : j.todo))
    row.append(head)
    if (joint === 'rackClamp' && s.joints.rackClamp) {
      row.append(el('p', 'muted', fill(T.highEndIs, { x: `${s.joints.rackClamp} (${s.joints.rackClamp === 'E1' ? '0' : '1200'} mm)` })))
    }
    const actions = el('div', 'joint-actions')
    const why = el('p', 'why')
    if (done) {
      const label = joint === 'standBase' ? T.undoStandBase : joint === 'rackClamp' ? T.undoClamp : joint === 'twoLegStand' ? T.undoTwoLeg : T.undoReceiver
      const b = button(label, 'btn btn-quiet', () => act(app.detach(joint)))
      b.dataset.k = `j-${joint}-undo`
      actions.append(b)
    } else if (joint === 'rackClamp') {
      const blk = jointBlock(s, joint)
      for (const end of ['E1', 'E2'] as const) {
        const b = button(end === 'E1' ? T.attachE1 : T.attachE2, 'btn btn-primary', () => { if (!isBlocked(b)) act(app.attach(joint, { railEnd: end })) })
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
      const b = button(label, 'btn btn-primary', () => { if (!isBlocked(b)) act(app.attach(joint)) })
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
    summary.textContent = fill(T.summary, { n: ORDER.filter((i) => s.items[i]).length })
    itemsHead.textContent = T.itemsTitle
    jointsHead.textContent = T.jointsTitle
    jointsIntro.textContent = T.jointsIntro
    missHead.textContent = T.missingTitle
    rebuild(list, () => { for (const id of ORDER) list.append(itemRow(id, s)) })
    rebuild(joints, () => { for (const j of ['standBase', 'rackClamp', 'twoLegStand', 'receiver'] as const) joints.append(jointRow(j, s)) })
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
