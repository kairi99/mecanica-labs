// MRUV adapter of the shared drag-and-drop controller (core/dragdrop/controller.ts): the part list, the zones of the assembly
// (snap.ts), and the drop sequencing on the Apparatus (drop.ts). The tray, the chip, pick-then-place and the keyboard flow are core.
import type { ItemId } from '../../apparatus/index.ts'
import type { ViewContext } from '../view.ts'
import {
  createDragDrop as createCoreDragDrop, type DragDropController as CoreController, type DragDropModel, type StageAdapter as CoreStage,
} from '../../../../core/dragdrop/controller.ts'
import { itemIcon } from '../itemIcons.ts'
import { reasonText } from '../reasons.ts'
import { strings as invStrings } from '../strings/inventory.ts'
import { strings } from '../strings/dragdrop.ts'
import { benchDraggable, defaultTarget, resolveDrop, zonesFor, type Target, type Zone } from './snap.ts'
import { executeDrop } from './drop.ts'

/** Items shown in the guide's order. */
export const TRAY_ORDER: readonly ItemId[] = ['rail', 'cart', 'rackStand', 'standBase', 'twoLegStand', 'screws', 'level', 'receiver', 'stopwatch', 'tape', 'markers']

export type StageAdapter = CoreStage<ItemId, Zone, Target>
export type DragDropController = CoreController<ItemId, Zone, Target>
export interface DragDropDeps { ctx: ViewContext; stage: HTMLElement; mount: HTMLElement }

export function createDragDrop(d: DragDropDeps): DragDropController {
  const { ctx } = d
  const app = ctx.apparatus
  const model: DragDropModel<ItemId, Zone, Target> = {
    parts: TRAY_ORDER,
    name: (id) => invStrings[ctx.lang()].items[id].name,
    icon: itemIcon,
    onBench: (id) => app.getState().items[id],
    benchDraggable: (id) => benchDraggable(id, app.getState()),
    zonesFor: (id) => zonesFor(id, app.getState(), app.railPoseNow()),
    zoneLabel: (z) => strings[ctx.lang()].zones[z.id],
    resolve: resolveDrop,
    defaultTarget: (zone) => defaultTarget(zone, app.getState(), app.evaluateMarks().aRailPos_mm),
    executeDrop: (part, source, target) => {
      const r = executeDrop(app, part, source, target)
      return r.ok ? r : { ok: false, message: reasonText(ctx.lang(), r.reason, r.item) }
    },
    changes: app,
  }
  return createCoreDragDrop({ model, lang: ctx.lang, reducedMotion: ctx.reducedMotion, changed: ctx.changed, stage: d.stage, mount: d.mount })
}
