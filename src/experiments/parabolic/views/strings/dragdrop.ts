// Parabolic strings of the drag-and-drop assembly: zone names and the inventory intro. The generic tray strings are in core/dragdrop/strings.ts.
import type { Strings } from '../view.ts'
import type { ZoneId } from '../dragdrop/snap.ts'

export interface DragDropStrings {
  inventoryIntro: string
  zones: Record<ZoneId, string>
}

export const strings: Strings<DragDropStrings> = {
  es: {
    inventoryIntro: 'Todos los materiales están sueltos sobre la mesa y el papel está junto a ellos. Arrástralos en el escenario hasta su sitio. La bandeja (bajo el escenario) recibe los que quites de la mesa. Si prefieres botones, ábrelos aquí abajo.',
    zones: {
      table: 'Mesa (cualquier sitio libre)',
      stand: 'Soporte con cremallera sobre su base',
      clamp: 'Extremo alto de la riel en la pinza',
      twoLeg: 'Extremo bajo: soporte de dos patas',
      railLevel: 'Nivelador sobre la riel',
      tableLevel: 'Nivelador sobre la mesa',
      railBall: 'Bola sobre la riel',
      floor: 'Piso: zona de caída',
    },
  },
  en: {
    inventoryIntro: 'All the materials are loose on the table and the paper lies beside them. Drag them on the stage to their place. The tray (under the stage) receives the ones you take off the table. If you prefer buttons, open them below.',
    zones: {
      table: 'Table (any free spot)',
      stand: 'Rack stand on its base',
      clamp: 'High end of the rail in the clamp',
      twoLeg: 'Low end: two-leg stand',
      railLevel: 'Level on the rail',
      tableLevel: 'Level on the table',
      railBall: 'Ball on the rail',
      floor: 'Floor: landing area',
    },
  },
}
