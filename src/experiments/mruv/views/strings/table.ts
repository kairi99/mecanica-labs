import type { Strings } from '../view.ts'

export interface TableStrings {
  title: string
  caption: string
  corner: string
  cellAria: string
  rowZero: string
  copy: string
  copyHint: string
  rowFull: string
  copied: string
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
}

export const strings: Strings<TableStrings> = {
  es: {
    title: 'Tabla 1.1 · Tiempos de recorrido',
    caption: 'Tiempos experimentales del DigiCart en un plano inclinado de 1,30°, en segundos.',
    corner: 'x (cm)',
    cellAria: 't{c} hasta x = {x} cm (s)',
    rowZero: 'Inicio: t = 0 s',
    copy: 'Copiar a la tabla',
    copyHint: 'La lectura detenida va a la primera casilla vacía de la fila resaltada (la marca elegida en la barra de cronometraje).',
    rowFull: 'Esa fila ya tiene sus 10 tiempos. Borra una casilla para reemplazarla.',
    copied: 'Copiado: {t} s en t{c} a {x} cm.',
    clearCell: 'Borrar casilla',
    clearAll: 'Borrar toda la tabla',
    clearAllAsk: '¿Seguro que quieres borrar todos los tiempos?',
    clearAllYes: 'Sí, borrar todo',
    cancel: 'Cancelar',
    export: 'Exportar CSV',
    fileName: 'tabla-1-1.csv',
    filled: '{n} de 100 tiempos',
    keyboard: 'Flechas y Enter mueven entre casillas. Escribe con coma o punto decimal.',
    copiedMark: 'copiado del cronómetro',
    cleared: 'Tabla borrada.',
  },
  en: {
    title: 'Table 1.1 · Travel times',
    caption: 'Experimental DigiCart travel times on a 1.30° incline, in seconds.',
    corner: 'x (cm)',
    cellAria: 't{c} up to x = {x} cm (s)',
    rowZero: 'Start: t = 0 s',
    copy: 'Copy to the table',
    copyHint: 'The stopped reading goes to the first empty cell of the highlighted row (the mark chosen in the timing bar).',
    rowFull: 'That row already has its 10 times. Clear a cell to replace it.',
    copied: 'Copied: {t} s into t{c} at {x} cm.',
    clearCell: 'Clear cell',
    clearAll: 'Clear the whole table',
    clearAllAsk: 'Are you sure you want to clear all the times?',
    clearAllYes: 'Yes, clear all',
    cancel: 'Cancel',
    export: 'Export CSV',
    fileName: 'table-1-1.csv',
    filled: '{n} of 100 times',
    keyboard: 'Arrows and Enter move between cells. Type with a decimal comma or point.',
    copiedMark: 'copied from the stopwatch',
    cleared: 'Table cleared.',
  },
}
