import type { Strings } from '../view.ts'

export interface TableStrings {
  title41: string
  title42: string
  title43: string
  intro41: string
  intro42: string
  intro43: string
  face: { cloth: string; sandpaper: string }
  bar: { wood: string; aluminium: string; iron: string }
  massCol: string
  faceCol: string
  caseCol: string
  massVal: string
  reading: string
  mean: string
  trial: string
  heightCol: string
  timeCol: string
  cellAria: string
  cellAriaH: string
  cellAriaT: string
  clear: string
  clearAll: string
  csv: string
  copyH: string
  copyT: string
  active: string
  fromOther: string
  overRange: string
}

export const strings: Strings<TableStrings> = {
  es: {
    title41: 'Tabla 4.1 · Fuerza para mover el taco con rapidez constante',
    title42: 'Tabla 4.2 · Fuerza máxima antes de que el taco se mueva',
    title43: 'Tabla 4.3 · Altura de inicio del deslizamiento y tiempo de recorrido',
    intro41: 'Cinco lecturas por caso (al menos). La fila indica la cara y la masa añadida sobre el taco.',
    intro42: 'Sin masas añadidas. Cinco lecturas por cara.',
    intro43: 'Cinco intentos por barra: la altura h donde la barra empieza a deslizar sin detenerse y el tiempo en recorrer la distancia marcada.',
    face: { cloth: 'Tela', sandpaper: 'Lija' },
    bar: { wood: 'Madera', aluminium: 'Aluminio', iron: 'Hierro' },
    massCol: 'Cara · masa sobre el taco',
    faceCol: 'Cara',
    caseCol: 'Caso',
    massVal: '{g} g',
    reading: 'F{n} [N]',
    mean: 'F̄ ± ΔF [N]',
    trial: 'No.',
    heightCol: 'h [m]',
    timeCol: 't [s]',
    cellAria: 'Tabla {t}, {row}, lectura {n}, en newtons',
    cellAriaH: 'Barra {bar}, intento {n}, altura en metros',
    cellAriaT: 'Barra {bar}, intento {n}, tiempo en segundos',
    clear: 'Borrar la celda activa',
    clearAll: 'Vaciar la tabla',
    csv: 'Descargar CSV',
    copyH: 'Copiar h medida',
    copyT: 'Copiar el tiempo del cronómetro',
    active: 'Celda activa',
    fromOther: 'Esta lectura vino de otro montaje',
    overRange: 'La aguja estaba en el tope',
  },
  en: {
    title41: 'Table 4.1 · Force that moves the block at constant speed',
    title42: 'Table 4.2 · Largest force before the block moves',
    title43: 'Table 4.3 · Height at the start of sliding and travel time',
    intro41: 'Five readings per case (at least). The row gives the face and the mass added on the block.',
    intro42: 'No added masses. Five readings per face.',
    intro43: 'Five tries per bar: the height h at which the bar starts sliding without stopping and the time to cover the marked distance.',
    face: { cloth: 'Cloth', sandpaper: 'Sandpaper' },
    bar: { wood: 'Wood', aluminium: 'Aluminium', iron: 'Iron' },
    massCol: 'Face · mass on the block',
    faceCol: 'Face',
    caseCol: 'Case',
    massVal: '{g} g',
    reading: 'F{n} [N]',
    mean: 'F̄ ± ΔF [N]',
    trial: 'No.',
    heightCol: 'h [m]',
    timeCol: 't [s]',
    cellAria: 'Table {t}, {row}, reading {n}, in newtons',
    cellAriaH: '{bar} bar, try {n}, height in metres',
    cellAriaT: '{bar} bar, try {n}, time in seconds',
    clear: 'Clear the active cell',
    clearAll: 'Empty the table',
    csv: 'Download CSV',
    copyH: 'Copy the measured h',
    copyT: 'Copy the stopwatch time',
    active: 'Active cell',
    fromOther: 'This reading came from another setup',
    overRange: 'The needle was at its stop',
  },
}
