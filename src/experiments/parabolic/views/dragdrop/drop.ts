// Runs a drop on the Apparatus. No rules live here: every branch calls the same Apparatus method the inventory buttons call
// (addItem, removeItem, attach, detach, placeLevel, selectBall, placeBall, placeBond, placeCarbon, removeBond, removeCarbon) and
// passes the refusal on. The only logic of this module is sequencing: a part coming from the tray is put on the table first and
// taken off again if the call is refused.
import type { ItemId, ParabolicApparatus, Result } from '../../apparatus/index.ts'
import { MARK_SNAP_cm } from './snap.ts'
import { BALL_OF, jointOfPart, paperOrientation, paperSpot_cm, type Target, type Zone } from './snap.ts'

export type DragSource = 'tray' | 'bench'

const CM = 100

function perform(app: ParabolicApparatus, part: ItemId, zone: Zone, target: Extract<Target, { kind: 'zone' }>): Result {
  const a = zone.action
  const s = app.getState()
  switch (a.kind) {
    case 'table': {
      // a part lifted off a joint or a placement and put down on the table comes apart; a loose part just stays
      const joint = jointOfPart(part, s)
      if (joint) return app.detach(joint)
      if (part === 'level' && s.level.placement !== null) return app.placeLevel(null)
      if (part === 'bondPaper' && s.paper.bond) return app.removeBond()
      if (part === 'carbonPaper' && s.paper.carbon) return app.removeCarbon()
      const ball = BALL_OF[part]
      if (ball && s.ball.selected === ball && s.ball.placed) return app.selectBall(ball)
      return { ok: true }
    }
    case 'attach':
      return app.attach(a.joint)
    case 'placeLevel':
      return app.placeLevel(a.where)
    case 'placeBall': {
      const ball = BALL_OF[part]
      if (!ball || target.s_m === null) return { ok: false, reason: 'ballOffRail' }
      if (s.ball.selected !== ball) {
        const r = app.selectBall(ball)
        if (!r.ok) return r
      }
      const near = s.marks.find((m) => Math.abs(m.s_m - target.s_m!) <= MARK_SNAP_cm / CM)
      return near ? app.placeBall({ markId: near.id }) : app.placeBall({ s_m: target.s_m })
    }
    case 'placePaper': {
      const at = target.at ?? { x_cm: 0, z_cm: 0 }
      const spot = paperSpot_cm(zone, at)
      const x = Math.round(spot.x) / CM, z = Math.round(spot.z) / CM
      if (part === 'bondPaper') return app.placeBond(x, z, paperOrientation(s, 'bondPaper'))
      return app.placeCarbon(x, z, paperOrientation(s, 'carbonPaper'))
    }
  }
}

/** What a drop did, for the status line. */
export type DropResult = Result & { removed?: boolean; added?: boolean }

/**
 * Apply a drop of `part` on `target`. From the tray the part is added first; if the call is then refused the part is taken
 * back off (the part "returns to the tray"). From the bench, a drop on the tray takes the part off the table.
 */
export function executeDrop(app: ParabolicApparatus, part: ItemId, source: DragSource, target: Target): DropResult {
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
  const r = perform(app, part, target.zone, target)
  if (!r.ok && fromTray) app.removeItem(part)
  return r.ok ? { ok: true, added: fromTray } : r
}
