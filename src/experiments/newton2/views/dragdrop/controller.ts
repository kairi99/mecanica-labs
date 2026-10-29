// Practica 3 adapter of the shared drag-and-drop controller (core/dragdrop/controller.ts): the part list, the zones of the assembly
// (snap.ts), and the drop sequencing on the Apparatus (drop.ts). The tray, the chip, pick-then-place and the keyboard flow are core.
import type { ViewContext } from '../view.ts'
import {
  createDragDrop as createCoreDragDrop, type DragDropController as CoreController, type DragDropModel, type StageAdapter as CoreStage,
} from '../../../../core/dragdrop/controller.ts'
import { itemIcon } from '../itemIcons.ts'
import { reasonText } from '../reasons.ts'
import { strings as invStrings } from '../strings/inventory.ts'
import { strings } from '../strings/dragdrop.ts'
import { benchDraggable, defaultTarget, isMassPart, massIndex, resolveDrop, spotsFor, zonesFor, MASS_PARTS, type PartId, type Target, type Zone } from './snap.ts'
import { executeDrop, itemOf } from './drop.ts'

/** Parts shown in the guide's order (the four masses stand for the masses item). */
export const TRAY_ORDER: readonly PartId[] = [
  'rail', 'cart', 'rackStand', 'standBase', 'receiver', 'screws', 'level', 'string', 'canister', 'brassScrew', 'plasticScrews',
  ...MASS_PARTS, 'balance', 'dynamometer', 'dynamometer2N', 'stopwatch', 'markers', 'twoLegStand', 'mass50', 'marble',
]

export type StageAdapter = CoreStage<PartId, Zone, Target>
export type DragDropController = CoreController<PartId, Zone, Target>
export interface DragDropDeps { ctx: ViewContext; stage: HTMLElement; mount: HTMLElement }

export function createDragDrop(d: DragDropDeps): DragDropController {
  const { ctx } = d
  const app = ctx.apparatus
  const partName = (id: PartId): string => (isMassPart(id) ? strings[ctx.lang()].massName.replace('{n}', String(massIndex(id) + 1)) : invStrings[ctx.lang()].items[id].name)
  const model: DragDropModel<PartId, Zone, Target> = {
    parts: TRAY_ORDER,
    name: partName,
    icon: itemIcon,
    onBench: (id) => app.getState().items[itemOf(id)],
    benchDraggable: (id) => benchDraggable(id, app.getState()),
    zonesFor: (id) => {
      const s = app.getState()
      const st = app.cartState(ctx.now())
      return zonesFor(id, s, spotsFor(s, { frontRailPos_mm: st.frontRailPos_mm, fall: st.fall }))
    },
    zoneLabel: (z) => strings[ctx.lang()].zones[z.id],
    resolve: resolveDrop,
    defaultTarget: (zone) => defaultTarget(zone, app.getState()),
    executeDrop: (part, source, target) => {
      const r = executeDrop(app, part, source, target)
      return r.ok ? r : { ok: false, message: reasonText(ctx.lang(), r.reason, r.item) }
    },
    changes: app,
  }
  return createCoreDragDrop({ model, lang: ctx.lang, reducedMotion: ctx.reducedMotion, changed: ctx.changed, stage: d.stage, mount: d.mount })
}
