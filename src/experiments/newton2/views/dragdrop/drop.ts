// Runs a drop on the Apparatus. No rules live here: every branch calls the same Apparatus method the inventory buttons call
// (addItem, removeItem, attach, detach, placeCart, liftCart, placeLevel, setMassLocation) and passes the refusal on. The only logic of
// this module is sequencing: a part coming from the tray is put on the table first and taken off again if the joint is refused.
import type { Apparatus, ItemId, Result } from '../../apparatus/index.ts'
import { isMassPart, jointsOfPart, massIndex, type PartId, type Target, type Zone } from './snap.ts'

export type DragSource = 'tray' | 'bench'

/** The inventory item behind a part (the four masses are one item). */
export const itemOf = (part: PartId): ItemId => (isMassPart(part) ? 'masses' : part)

function perform(app: Apparatus, part: PartId, zone: Zone, railPos_mm: number | null, fromTray: boolean): Result {
  const a = zone.action
  switch (a.kind) {
    case 'table': {
      // a part lifted off a joint and put down on the table comes apart; a loose part just stays
      if (isMassPart(part)) {
        if (fromTray) for (let i = 0; i < 4; i++) if (app.massLocations()[i] !== 'cart') app.setMassLocation(i, 'bench')
        return app.setMassLocation(massIndex(part), 'bench')
      }
      const s = app.getState()
      if (part === 'cart') return s.cart.placed ? app.liftCart() : { ok: true }
      if (part === 'level') return s.level.placement === null ? { ok: true } : app.placeLevel(null)
      for (const j of jointsOfPart(part, s)) {
        const r = app.detach(j)
        if (!r.ok) return r
      }
      return { ok: true }
    }
    case 'attach': {
      const cur = app.getState().joints
      if (a.joint === 'rackClamp' && cur.rackClamp !== null && cur.rackClamp !== a.railEnd) {
        // moving the rail from one end to the other: undo the clamp, then make it again, and restore it if that is refused
        const old = cur.rackClamp
        const d = app.detach('rackClamp')
        if (!d.ok) return d
        const r = app.attach('rackClamp', { railEnd: a.railEnd })
        if (!r.ok) app.attach('rackClamp', { railEnd: old })
        return r
      }
      return app.attach(a.joint, a.railEnd ? { railEnd: a.railEnd } : {})
    }
    case 'placeCart':
      return railPos_mm === null ? { ok: false, reason: 'noStartPosition' } : app.placeCart(railPos_mm)
    case 'placeLevel':
      return app.placeLevel(a.where)
    case 'mass': {
      if (!isMassPart(part)) return { ok: false, reason: 'badMass' }
      if (fromTray) for (let i = 0; i < 4; i++) if (i !== massIndex(part) && app.massLocations()[i] !== 'cart') app.setMassLocation(i, 'bench')
      return app.setMassLocation(massIndex(part), a.to)
    }
  }
}

/** What a drop did, for the status line. */
export type DropResult = (Result & { removed?: boolean; added?: boolean })

/**
 * Apply a drop of `part` on `target`. From the tray the part is added first; if the call is then refused the part is taken back off
 * (it "returns to the tray"). From the bench, a drop on the tray takes the part off the table (a mass only leaves the system: it stays
 * on the table, since the four masses are one item of the box).
 */
export function executeDrop(app: Apparatus, part: PartId, source: DragSource, target: Target): DropResult {
  const item = itemOf(part)
  if (target.kind === 'tray') {
    if (source === 'tray') return { ok: true }
    if (isMassPart(part)) return app.setMassLocation(massIndex(part), 'bench')
    const r = app.removeItem(item)
    return r.ok ? { ok: true, removed: true } : r
  }
  const fromTray = !app.hasItem(item)
  if (fromTray) {
    const r = app.addItem(item)
    if (!r.ok) return r
  }
  const r = perform(app, part, target.zone, target.railPos_mm, fromTray)
  if (!r.ok && fromTray) app.removeItem(item)
  return r.ok ? { ok: true, added: fromTray } : r
}
