// Runs a drop on the Apparatus. No rules live here: every branch calls the same Apparatus method the inventory buttons call
// (addItem, removeItem, attach, detach, placeCart, placeMarker, placeLevel) and passes the refusal on. The only logic of this
// module is sequencing: a part coming from the tray is put on the table first and taken off again if the joint is refused.
import type { Apparatus, ItemId, Result } from '../../apparatus/index.ts'
import { jointOfPart, type Target, type Zone } from './snap.ts'

export type DragSource = 'tray' | 'bench'

function perform(app: Apparatus, part: ItemId, zone: Zone, railPos_mm: number | null): Result {
  const a = zone.action
  switch (a.kind) {
    case 'table': {
      // a part lifted off a joint and put down on the table comes apart; a loose part just stays
      const joint = jointOfPart(part, app.getState())
      return joint ? app.detach(joint) : { ok: true }
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
    case 'placeMarker':
      return railPos_mm === null ? { ok: false, reason: 'outOfRail' } : app.placeMarker(railPos_mm)
    case 'placeLevel':
      return app.placeLevel(a.where)
  }
}

/** What a drop did, for the status line. */
export type DropResult = (Result & { removed?: boolean; added?: boolean })

/**
 * Apply a drop of `part` on `target`. From the tray the part is added first; if the joint is then refused the part is taken
 * back off (the part "returns to the tray"). From the bench, a drop on the tray takes the part off the table.
 */
export function executeDrop(app: Apparatus, part: ItemId, source: DragSource, target: Target): DropResult {
  if (target.kind === 'tray') {
    if (source === 'tray') return { ok: true }
    const r = app.removeItem(part)
    return r.ok ? { ok: true, removed: true } : r
  }
  const fromTray = !app.hasItem(part)
  if (fromTray) {
    const r = app.addItem(part)
    if (!r.ok) return r
  }
  const r = perform(app, part, target.zone, target.railPos_mm)
  if (!r.ok && fromTray) app.removeItem(part)
  return r.ok ? { ok: true, added: fromTray } : r
}
