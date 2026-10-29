import type { ItemId } from '../../apparatus/index.ts'
import type { Strings } from '../view.ts'

export interface InventoryStrings {
  title: string
  summary: string
  putAll: string
  removeAll: string
  add: string
  remove: string
  onTable: string
  inBox: string
  genericItem: string
  items: Record<ItemId, string>
  itemShort: Record<ItemId, string>
  note: string
  next: string
}

export const strings: Strings<InventoryStrings> = {
  es: {
    title: 'Inventario',
    summary: '{n} de {total} objetos sobre la mesa',
    putAll: 'Poner todo', removeAll: 'Quitar todo',
    add: 'Poner en la mesa', remove: 'Quitar',
    onTable: 'En la mesa', inBox: 'En la caja',
    genericItem: 'el objeto',
    items: {
      alBar: 'Barra de aluminio', woodBar: 'Barra de madera', ironBar: 'Barra de hierro', block: 'Taco de rozamiento (tela y lija, con gancho)',
      scale1N: 'Dinamómetro de 1 N', scale2N: 'Dinamómetro de 2 N', rail: 'Riel metálico de 1,2 m', masses50: 'Tres masas de 50 g (plateadas)',
      tape: 'Cinta métrica', paper: 'Hoja de papel', rackStand: 'Soporte con cremallera', standBase: 'Base del soporte', stopwatch: 'Cronómetro',
      balance: 'Balanza', masses10: 'Masas de 10 g', marble: 'Canica',
    },
    itemShort: {
      alBar: 'la barra de aluminio', woodBar: 'la barra de madera', ironBar: 'la barra de hierro', block: 'el taco de rozamiento',
      scale1N: 'el dinamómetro de 1 N', scale2N: 'el dinamómetro de 2 N', rail: 'el riel', masses50: 'las masas de 50 g',
      tape: 'la cinta métrica', paper: 'la hoja de papel', rackStand: 'el soporte con cremallera', standBase: 'la base del soporte', stopwatch: 'el cronómetro',
      balance: 'la balanza', masses10: 'las masas de 10 g', marble: 'la canica',
    },
    note: 'La lista de materiales de la guía no menciona el soporte con cremallera con su base, el cronómetro ni la balanza, pero el procedimiento los necesita (levantar el riel y cronometrar en el experimento 3, y medir la masa M del taco). Aquí también están sobre la mesa. Las masas de 10 g y la canica no sirven para esta práctica y siguen en la caja; con los botones puedes ponerlas si quieres comprobarlo.',
    next: 'Cuando el montaje esté listo, pasa al Experimento 1.',
  },
  en: {
    title: 'Inventory',
    summary: '{n} of {total} items on the table',
    putAll: 'Put everything', removeAll: 'Remove everything',
    add: 'Put on the table', remove: 'Remove',
    onTable: 'On the table', inBox: 'In the box',
    genericItem: 'the item',
    items: {
      alBar: 'Aluminium bar', woodBar: 'Wooden bar', ironBar: 'Iron bar', block: 'Friction block (cloth and sandpaper faces, with hook)',
      scale1N: '1 N spring scale', scale2N: '2 N spring scale', rail: '1.2 m metal rail', masses50: 'Three 50 g masses (silver)',
      tape: 'Tape measure', paper: 'Sheet of paper', rackStand: 'Rack-and-pinion stand', standBase: 'Stand base', stopwatch: 'Stopwatch',
      balance: 'Balance', masses10: '10 g masses', marble: 'Marble',
    },
    itemShort: {
      alBar: 'the aluminium bar', woodBar: 'the wooden bar', ironBar: 'the iron bar', block: 'the friction block',
      scale1N: 'the 1 N spring scale', scale2N: 'the 2 N spring scale', rail: 'the rail', masses50: 'the 50 g masses',
      tape: 'the tape measure', paper: 'the sheet of paper', rackStand: 'the rack-and-pinion stand', standBase: 'the stand base', stopwatch: 'the stopwatch',
      balance: 'the balance', masses10: 'the 10 g masses', marble: 'the marble',
    },
    note: 'The guide\'s materials list does not mention the rack-and-pinion stand with its base, the stopwatch or the balance, but the procedure needs them (raising the rail and timing in experiment 3, and measuring the block\'s mass M). They are on the table too. The 10 g masses and the marble are of no use in this practice and stay in the box; with the buttons you can put them out if you want to check.',
    next: 'When the setup is ready, go to Experiment 1.',
  },
}
