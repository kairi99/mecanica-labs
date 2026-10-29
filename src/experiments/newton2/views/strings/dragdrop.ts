// Practica 3 strings of the drag-and-drop assembly: zone names, the mass names and the inventory intro. The generic tray strings are in
// core/dragdrop/strings.ts.
import type { Strings } from '../view.ts'
import type { ZoneId } from '../dragdrop/snap.ts'

export interface DragDropStrings {
  inventoryIntro: string
  /** Name of one of the four 10 g masses, `{n}` = 1..4. */
  massName: string
  zones: Record<ZoneId, string>
}

export const strings: Strings<DragDropStrings> = {
  es: {
    inventoryIntro: 'Todas las piezas están sueltas sobre la mesa. Arrástralas en el escenario hasta su sitio. La bandeja (bajo el escenario) recibe las que quites de la mesa. Si prefieres botones, ábrelos aquí abajo.',
    massName: 'Masa de 10 g {n}',
    zones: {
      table: 'Mesa (cualquier sitio libre)',
      stand: 'Soporte con cremallera sobre su base',
      clampE1: 'Extremo 0 mm en la pinza del soporte',
      clampE2: 'Extremo 1200 mm en la pinza del soporte',
      receiver: 'Otro extremo de la riel: receptor con polea',
      railCart: 'DigiCart sobre la riel',
      railLevel: 'Nivelador sobre la riel',
      tableLevel: 'Nivelador sobre la mesa',
      screwOnCart: 'Tornillo de latón en el DigiCart',
      pulleyThread: 'Hilo sobre la polea',
      canisterHook: 'Contenedor atado al hilo',
      canisterMass: 'Masa dentro del contenedor',
      cartMass: 'Masa sobre el DigiCart (tornillo de plástico)',
    },
  },
  en: {
    inventoryIntro: 'All the parts are loose on the table. Drag them on the stage to their place. The tray (under the stage) receives the ones you take off the table. If you prefer buttons, open them below.',
    massName: '10 g mass {n}',
    zones: {
      table: 'Table (any free spot)',
      stand: 'Rack stand on its base',
      clampE1: 'End 0 mm in the stand clamp',
      clampE2: 'End 1200 mm in the stand clamp',
      receiver: 'Other end of the rail: receiver with pulley',
      railCart: 'DigiCart on the rail',
      railLevel: 'Level on the rail',
      tableLevel: 'Level on the table',
      screwOnCart: 'Brass screw on the DigiCart',
      pulleyThread: 'String over the pulley',
      canisterHook: 'Canister tied to the string',
      canisterMass: 'Mass inside the canister',
      cartMass: 'Mass on the DigiCart (plastic screw)',
    },
  },
}
