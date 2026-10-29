// Generic strings of the drag-and-drop assembly (parts tray, picker, status line). es first, identical keys in en.
// Experiment-specific wording (zone names, the inventory intro) stays in the experiment's own strings file.
import type { Strings } from '../views/view.ts'

export interface DragDropCoreStrings {
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
  /** Summary of the folded button-driven assembly (the WCAG 2.5.7 path). */
  disclosure: string
}

export const strings: Strings<DragDropCoreStrings> = {
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
  },
}
