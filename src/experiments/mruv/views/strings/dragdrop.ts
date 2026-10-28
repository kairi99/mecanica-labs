// Strings of the drag-and-drop assembly: the parts tray, zone names and the status line. es first, identical keys in en.
import type { Strings } from '../view.ts'
import type { ZoneId } from '../dragdrop/snap.ts'

export interface DragDropStrings {
  tray: string
  hint: string
  empty: string
  partAria: string
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
    hint: 'Arrastra una pieza hasta un destino resaltado de la mesa. También puedes tocarla y luego tocar el destino.',
    empty: 'Todo está sobre la mesa. Arrastra una pieza hasta aquí para devolverla a la caja.',
    partAria: '{x}: arrástrala a la mesa, o pulsa Intro para elegirla',
    picked: 'Elegida: {x}. Toca un destino resaltado en la mesa o elige uno aquí. Esc cancela.',
    chooseZone: 'Colocar en:',
    cancel: 'Cancelar',
    notReady: 'aún falta algo',
    dragging: 'Moviendo {x}. Suéltala sobre un destino resaltado.',
    overTray: 'Suelta aquí para quitar {x} de la mesa.',
    placed: '{x}: colocada.',
    removed: '{x}: vuelve a la caja.',
    returned: '{x}: no se pudo colocar y vuelve.',
    noTarget: 'Suéltala sobre un destino resaltado.',
    disclosure: 'Montar con botones',
    inventoryIntro: 'Arrastra las piezas de la bandeja (bajo el escenario) hasta su sitio en la mesa. Si prefieres botones, ábrelos aquí abajo.',
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
    hint: 'Drag a part to a highlighted spot on the table. You can also tap it and then tap the spot.',
    empty: 'Everything is on the table. Drag a part here to put it back in the box.',
    partAria: '{x}: drag it to the table, or press Enter to pick it',
    picked: 'Picked: {x}. Tap a highlighted spot on the table or choose one here. Esc cancels.',
    chooseZone: 'Place at:',
    cancel: 'Cancel',
    notReady: 'something is missing',
    dragging: 'Moving {x}. Drop it on a highlighted spot.',
    overTray: 'Drop here to take {x} off the table.',
    placed: '{x}: placed.',
    removed: '{x}: back in the box.',
    returned: '{x}: could not be placed and goes back.',
    noTarget: 'Drop it on a highlighted spot.',
    disclosure: 'Assemble with buttons',
    inventoryIntro: 'Drag the parts from the tray (under the stage) to their place on the table. If you prefer buttons, open them below.',
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
