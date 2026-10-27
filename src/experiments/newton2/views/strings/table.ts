import type { Strings } from '../view.ts'

export interface TableStrings {
  title: string
  caption: string
  corner: string
  forceHead: string
  rowHead: string
  rowHeadEmpty: string
  forceAria: string
  cellAria: string
  copy: string
  copyHint: string
  copyForce: string
  clearCell: string
  clearAll: string
  clearAllAsk: string
  clearAllYes: string
  cancel: string
  export: string
  fileName: string
  filled: string
  keyboard: string
  copiedMark: string
  cleared: string
  optionalRow: string
}

export const strings: Strings<TableStrings> = {
  es: {
    title: 'Tabla 3.1 · Fuerza y tiempos de recorrido',
    caption: 'Datos experimentales de la fuerza del contenedor y los tiempos que tarda el DigiCart en recorrer 90 cm, en newtons y segundos.',
    corner: 'Prueba',
    forceHead: 'F (N)',
    rowHead: '{n} · {m} masas',
    rowHeadEmpty: '{n} · vacío',
    forceAria: 'Fuerza F de la prueba {n} (N)',
    cellAria: 'Tiempo t{c} de la prueba {n} (s)',
    copy: 'Copiar tiempo a la tabla',
    copyHint: 'La lectura detenida va a la primera casilla vacía de la prueba elegida en la barra de cronometraje.',
    copyForce: 'Copiar la lectura del dinamómetro a la prueba elegida',
    clearCell: 'Borrar casilla',
    clearAll: 'Borrar toda la tabla',
    clearAllAsk: '¿Seguro que quieres borrar todas las fuerzas y todos los tiempos?',
    clearAllYes: 'Sí, borrar todo',
    cancel: 'Cancelar',
    export: 'Exportar CSV',
    fileName: 'tabla-3-1.csv',
    filled: '{n} tiempos anotados.',
    keyboard: 'Teclado: Enter y flechas se mueven entre casillas; Escape descarta lo escrito. Usa coma o punto decimal.',
    copiedMark: 'Copiado del cronómetro',
    cleared: 'Tabla borrada.',
    optionalRow: 'La prueba con el contenedor vacío es opcional.',
  },
  en: {
    title: 'Table 3.1 · Force and run times',
    caption: 'Experimental data of the canister force and the times the DigiCart takes to cover 90 cm, in newtons and seconds.',
    corner: 'Trial',
    forceHead: 'F (N)',
    rowHead: '{n} · {m} masses',
    rowHeadEmpty: '{n} · empty',
    forceAria: 'Force F of trial {n} (N)',
    cellAria: 'Time t{c} of trial {n} (s)',
    copy: 'Copy time to the table',
    copyHint: 'The stopped reading goes to the first empty cell of the trial chosen in the timing bar.',
    copyForce: 'Copy the dynamometer reading to the chosen trial',
    clearCell: 'Clear cell',
    clearAll: 'Clear the whole table',
    clearAllAsk: 'Are you sure you want to clear all the forces and times?',
    clearAllYes: 'Yes, clear everything',
    cancel: 'Cancel',
    export: 'Export CSV',
    fileName: 'table-3-1.csv',
    filled: '{n} times recorded.',
    keyboard: 'Keyboard: Enter and arrows move between cells; Escape discards what you typed. Use a comma or a decimal point.',
    copiedMark: 'Copied from the stopwatch',
    cleared: 'Table cleared.',
    optionalRow: 'The trial with the empty canister is optional.',
  },
}
