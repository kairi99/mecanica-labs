// MRUV strings of the drag-and-drop assembly: zone names and the inventory intro. The generic tray strings are in core/dragdrop/strings.ts.
import type { Strings } from '../view.ts'
import type { ZoneId } from '../dragdrop/snap.ts'

export interface DragDropStrings {
  inventoryIntro: string
  zones: Record<ZoneId, string>
}

export const strings: Strings<DragDropStrings> = {
  es: {
    inventoryIntro: 'Todas las piezas están sueltas sobre la mesa. Arrástralas en el escenario hasta su sitio. La bandeja (bajo el escenario) recibe las que quites de la mesa. Si prefieres botones, ábrelos aquí abajo.',
    zones: {
      table: 'Mesa (cualquier sitio libre)',
      stand: 'Soporte con cremallera sobre su base',
      clampE1: 'Extremo E1 (0 mm) en la pinza',
      clampE2: 'Extremo E2 (1200 mm) en la pinza',
      twoLeg: 'Extremo bajo: soporte de dos patas',
      receiver: 'Extremo bajo: receptor',
      railCart: 'Sobre la riel',
      railMark: 'Marca en la riel',
      railLevel: 'Nivel sobre la riel',
      tableLevel: 'Nivel sobre la mesa',
    },
  },
  en: {
    inventoryIntro: 'All the parts are loose on the table. Drag them on the stage to their place. The tray (under the stage) receives the ones you take off the table. If you prefer buttons, open them below.',
    zones: {
      table: 'Table (any free spot)',
      stand: 'Rack stand on its base',
      clampE1: 'End E1 (0 mm) in the clamp',
      clampE2: 'End E2 (1200 mm) in the clamp',
      twoLeg: 'Low end: two-leg stand',
      receiver: 'Low end: receiver',
      railCart: 'On the rail',
      railMark: 'Mark on the rail',
      railLevel: 'Level on the rail',
      tableLevel: 'Level on the table',
    },
  },
}
