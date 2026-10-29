// Strings of the drag-and-drop assembly: the parts tray, zone names and the status line. es first, identical keys in en.
import type { Strings } from '../view.ts'
import type { ZoneId } from '../dragdrop/snap.ts'

export interface DragDropStrings {
  tray: string
  hint: string
  empty: string
  partAria: string
  benchAria: string
  benchSummary: string
  picked: string
  chooseZone: string
  cancel: string
  notReady: string
  dragging: string
  overTray: string
  placed: string
  removed: string
  returned: string
  noTarget: string
  disclosure: string
  inventoryIntro: string
  zones: Record<ZoneId, string>
}

export const strings: Strings<DragDropStrings> = {
  es: {
    tray: 'Bandeja de piezas',
    hint: 'Aquí están las piezas que quitaste de la mesa. Arrástralas de vuelta hasta un destino resaltado.',
    empty: 'Vacía. Suelta aquí una pieza para quitarla de la mesa.',
    partAria: '{x}: arrástrala a la mesa, o pulsa Intro para elegirla',
    benchAria: '{x}, sobre la mesa: pulsa Intro para elegirla y luego un destino',
    benchSummary: 'Elegir una pieza de la mesa ({x})',
    picked: 'Elegida: {x}. Toca un destino resaltado en la mesa o elige uno aquí. Esc cancela.',
    chooseZone: 'Colocar en:',
    cancel: 'Cancelar',
    notReady: 'aún falta algo',
    dragging: 'Moviendo {x}. Suéltala sobre un destino resaltado.',
    overTray: 'Suelta aquí para quitar {x} de la mesa.',
    placed: '{x}: colocada.',
    removed: '{x}: quitada de la mesa, está en la bandeja.',
    returned: '{x}: no se pudo colocar y vuelve.',
    noTarget: 'Suéltala sobre un destino resaltado.',
    disclosure: 'Montar con botones',
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
    tray: 'Parts tray',
    hint: 'These are the parts you took off the table. Drag them back to a highlighted spot.',
    empty: 'Empty. Drop a part here to take it off the table.',
    partAria: '{x}: drag it to the table, or press Enter to pick it',
    benchAria: '{x}, on the table: press Enter to pick it, then choose a spot',
    benchSummary: 'Pick a part on the table ({x})',
    picked: 'Picked: {x}. Tap a highlighted spot on the table or choose one here. Esc cancels.',
    chooseZone: 'Place at:',
    cancel: 'Cancel',
    notReady: 'something is missing',
    dragging: 'Moving {x}. Drop it on a highlighted spot.',
    overTray: 'Drop here to take {x} off the table.',
    placed: '{x}: placed.',
    removed: '{x}: taken off the table, it is in the tray.',
    returned: '{x}: could not be placed and goes back.',
    noTarget: 'Drop it on a highlighted spot.',
    disclosure: 'Assemble with buttons',
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
