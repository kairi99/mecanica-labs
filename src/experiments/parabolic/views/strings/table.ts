import type { Strings } from '../view.ts'

export interface TableStrings {
  title: string
  tabs: string
  balls: { marble: string; pingpong: string }
  caption: string
  colTrial: string
  groupTime: string
  groupRange: string
  repHead: string
  calcTime: string
  calcRange: string
  calcSpeed: string
  calcNote: string
  active: string
  copyTime: string
  copyRange: string
  copyHint: string
  copiedTime: string
  copiedRange: string
  cellAria: string
  copiedMark: string
  clearCell: string
  clearTable: string
  clearAsk: string
  clearYes: string
  cancel: string
  cleared: string
  exportCsv: string
  fileName: string
  filled: string
  keyboard: string
}

export const strings: Strings<TableStrings> = {
  es: {
    title: 'Tabla 2.1',
    tabs: 'Tabla de la bola',
    balls: { marble: 'Canica', pingpong: 'Pelota de ping-pong' },
    caption: 'Tabla 2.1: tiempos de vuelo y alcances de cada lanzamiento',
    colTrial: 'No.',
    groupTime: 'Tiempo t [s]',
    groupRange: 'Alcance x [m]',
    repHead: '{n}',
    calcTime: 'Tiempo promedio t ± Δt [s]',
    calcRange: 'Alcance promedio x ± Δx [m]',
    calcSpeed: 'Velocidad inicial v ± Δv [m/s]',
    calcNote: 'Las tres últimas columnas se calculan en el Análisis.',
    active: 'Celda activa: {ball} · No. {t} · repetición {r}',
    copyTime: 'Copiar tiempo del cronómetro',
    copyRange: 'Copiar alcance de la cinta',
    copyHint: 'Elige una celda tocándola. El alcance que se copia es el último que mediste con la cinta.',
    copiedTime: 'Copiado {t} s en No. {n}, repetición {r}.',
    copiedRange: 'Copiado {x} m en No. {n}, repetición {r}.',
    cellAria: '{what}, {ball}, No. {t}, repetición {r}',
    copiedMark: 'Copiado de un instrumento',
    clearCell: 'Borrar celda',
    clearTable: 'Borrar tabla',
    clearAsk: '¿Borrar todos los datos de la tabla de esta bola?',
    clearYes: 'Sí, borrar', cancel: 'Cancelar',
    cleared: 'Tabla borrada.',
    exportCsv: 'Exportar CSV',
    fileName: 'tabla-2-1-{ball}.csv',
    filled: '{n} de {total} datos escritos',
    keyboard: 'Teclado: flechas y Enter para moverte entre celdas; Esc deshace lo que estás escribiendo.',
  },
  en: {
    title: 'Table 2.1',
    tabs: 'Table of the ball',
    balls: { marble: 'Marble', pingpong: 'Ping-pong ball' },
    caption: 'Table 2.1: flight times and ranges of each launch',
    colTrial: 'No.',
    groupTime: 'Time t [s]',
    groupRange: 'Range x [m]',
    repHead: '{n}',
    calcTime: 'Mean time t ± Δt [s]',
    calcRange: 'Mean range x ± Δx [m]',
    calcSpeed: 'Initial speed v ± Δv [m/s]',
    calcNote: 'The last three columns are computed in the Analysis.',
    active: 'Active cell: {ball} · No. {t} · repetition {r}',
    copyTime: 'Copy time from the stopwatch',
    copyRange: 'Copy range from the tape',
    copyHint: 'Choose a cell by tapping it. The range that is copied is the last one you measured with the tape.',
    copiedTime: 'Copied {t} s to No. {n}, repetition {r}.',
    copiedRange: 'Copied {x} m to No. {n}, repetition {r}.',
    cellAria: '{what}, {ball}, No. {t}, repetition {r}',
    copiedMark: 'Copied from an instrument',
    clearCell: 'Clear cell',
    clearTable: 'Clear table',
    clearAsk: 'Clear all the data in this ball\'s table?',
    clearYes: 'Yes, clear', cancel: 'Cancel',
    cleared: 'Table cleared.',
    exportCsv: 'Export CSV',
    fileName: 'table-2-1-{ball}.csv',
    filled: '{n} of {total} values entered',
    keyboard: 'Keyboard: arrows and Enter move between cells; Esc undoes what you are typing.',
  },
}
