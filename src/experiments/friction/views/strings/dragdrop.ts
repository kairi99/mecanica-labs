// Friction strings of the drag-and-drop setup: zone names and the inventory intro. The generic tray strings are in core/dragdrop/strings.ts.
import type { Strings } from '../view.ts'
import type { PartId, ZoneId } from '../dragdrop/snap.ts'

export interface DragDropStrings {
  inventoryIntro: string
  /** Short part names for the tray and the picker. */
  parts: Record<PartId, string>
  zones: Record<ZoneId, string>
}

export const strings: Strings<DragDropStrings> = {
  es: {
    inventoryIntro: 'Todos los materiales están sueltos sobre la mesa. Arrastra cada uno en el escenario hasta su sitio: la hoja sobre la mesa, el taco sobre la hoja con la cara que quieras hacia abajo, el dinamómetro al gancho del taco, las masas sobre el taco y, en el experimento 3, la barra en la marca de salida del riel. La bandeja (bajo el escenario) recibe lo que quites de la mesa. Si prefieres botones, ábrelos aquí abajo.',
    parts: { paper: 'Hoja de papel', block: 'Taco de rozamiento', scale1N: 'Dinamómetro de 1 N', scale2N: 'Dinamómetro de 2 N', masses50: 'Masas de 50 g', woodBar: 'Barra de madera', alBar: 'Barra de aluminio', ironBar: 'Barra de hierro' },
    zones: {
      table: 'Mesa (cualquier sitio libre)',
      paper: 'Hoja fijada a la mesa',
      faceCloth: 'Tela hacia abajo',
      faceSand: 'Lija hacia abajo',
      hook: 'Gancho del taco',
      masses: 'Masa de 50 g sobre el taco',
      barStart: 'Marca de salida del riel',
    },
  },
  en: {
    inventoryIntro: 'All the materials are loose on the table. Drag each one on the stage to its place: the sheet on the table, the block on the sheet with the face you want down, the spring scale to the block\'s hook, the masses on the block and, in experiment 3, the bar on the rail\'s start mark. The tray (under the stage) receives what you take off the table. If you prefer buttons, open them below.',
    parts: { paper: 'Sheet of paper', block: 'Friction block', scale1N: '1 N spring scale', scale2N: '2 N spring scale', masses50: '50 g masses', woodBar: 'Wooden bar', alBar: 'Aluminium bar', ironBar: 'Iron bar' },
    zones: {
      table: 'Table (any free spot)',
      paper: 'Sheet fixed to the table',
      faceCloth: 'Cloth face down',
      faceSand: 'Sandpaper face down',
      hook: 'The block\'s hook',
      masses: '50 g mass on the block',
      barStart: 'Rail start mark',
    },
  },
}
