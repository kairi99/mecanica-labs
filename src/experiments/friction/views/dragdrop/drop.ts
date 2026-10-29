// Runs a drop on the Apparatus. No rules live here: every branch calls the same Apparatus method the bench panel's buttons call
// (placePaper, setFace, chooseScale, setAddedMasses, placeBar, removePaper) and passes the refusal on. The only logic of this module is
// sequencing: a part coming from the tray is put on the table first and taken off again if the placement is refused, and a placed part
// lifted onto the table comes apart (the Apparatus has no "un-place" call for the block, a scale or a bar: they are lifted off the table
// and laid down again).
import type { FrictionApparatus, ItemId, Result } from '../../apparatus/index.ts'
import { BAR_OF_PART, SCALE_OF_PART, isPart, isPlaced, type PartId, type Zone } from './snap.ts'

export type DragSource = 'tray' | 'bench'
export type Target = { kind: 'tray' } | { kind: 'zone'; zone: Zone; dist_cm: number }
export type DropResult = Result & { removed?: boolean; added?: boolean }

function layDown(app: FrictionApparatus, part: PartId): Result {
  const r = app.removeItem(part)
  return r.ok ? app.addItem(part) : r
}

function perform(app: FrictionApparatus, part: PartId, zone: Zone): Result {
  const s = app.getState()
  switch (zone.action.kind) {
    case 'table':
      // a placed part lifted off and put down on the table comes apart; a loose part just stays
      if (!isPlaced(part, s)) return { ok: true }
      if (part === 'paper') return app.removePaper()
      if (part === 'masses50') return { ok: true } // a stacked mass is taken off with the bench panel's buttons or the tray (which part of the pile was lifted is not known here)
      return layDown(app, part)
    case 'paper': return app.placePaper('fixed')
    case 'face': return app.setFace(zone.action.face)
    case 'hook': return part === 'scale1N' || part === 'scale2N' ? app.chooseScale(SCALE_OF_PART[part]) : { ok: true }
    case 'masses': return app.setAddedMasses(s.addedMasses + 1)
    case 'bar': return part === 'woodBar' || part === 'alBar' || part === 'ironBar' ? app.placeBar(BAR_OF_PART[part]) : { ok: true }
  }
}

/**
 * Apply a drop of `part` on `target`. From the tray the part is added first; if the placement is then refused the part is taken back off
 * (it returns to the tray). From the table, a drop on the tray takes the part off the table.
 */
export function executeDrop(app: FrictionApparatus, partId: ItemId, source: DragSource, target: Target): DropResult {
  if (!isPart(partId)) return { ok: true }
  const part: PartId = partId
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
  const r = perform(app, part, target.zone)
  if (!r.ok && fromTray) app.removeItem(part)
  return r.ok ? { ok: true, added: fromTray } : r
}
