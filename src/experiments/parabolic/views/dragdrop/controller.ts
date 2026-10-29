// Parabolic adapter of the shared drag-and-drop controller (core/dragdrop/controller.ts): the part list, the zones of the assembly
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
import { PARTS, benchDraggable, defaultTarget, resolveDrop, zonesFor, type Target, type Zone } from './snap.ts'
import { executeDrop } from './drop.ts'

export type StageAdapter = CoreStage<ItemId, Zone, Target>
export type DragDropController = CoreController<ItemId, Zone, Target>
export interface DragDropDeps { ctx: ViewContext; stage: HTMLElement; mount: HTMLElement }

export function createDragDrop(d: DragDropDeps): DragDropController {
  const { ctx } = d
  const app = ctx.apparatus
  // the part a zone button / key chose is not passed to defaultTarget by core: remember it from the zone list that was built for it
  let lastPart: ItemId = PARTS[0]!
  const model: DragDropModel<ItemId, Zone, Target> = {
    parts: PARTS,
    name: (id) => invStrings[ctx.lang()].items[id],
    icon: itemIcon,
    onBench: (id) => app.getState().items[id],
    benchDraggable: (id) => benchDraggable(id, app.getState()),
    zonesFor: (id) => { lastPart = id; return zonesFor(id, app.getState()) },
    zoneLabel: (z) => strings[ctx.lang()].zones[z.id],
    resolve: resolveDrop,
    defaultTarget: (zone) => defaultTarget(zone, app.getState(), lastPart),
    executeDrop: (part, source, target) => {
      const r = executeDrop(app, part, source, target)
      return r.ok ? r : { ok: false, message: reasonText(ctx.lang(), r.reason, r.item) }
    },
    changes: app,
  }
  return createCoreDragDrop({ model, lang: ctx.lang, reducedMotion: ctx.reducedMotion, changed: ctx.changed, stage: d.stage, mount: d.mount })
}
