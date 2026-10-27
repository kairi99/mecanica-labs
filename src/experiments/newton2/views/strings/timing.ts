import type { Strings } from '../view.ts'

export interface TimingStrings {
  aria: string
  trialLabel: string
  trialOption: string
  trialOptionEmpty: string
  lcdAria: string
  start: string
  stop: string
  reset: string
  copy: string
  release: string
  returnStart: string
  keys: string
  keysFull: string
  needStopwatch: string
  readyHint: string
  whyRolling: string
  whyUnplaced: string
  whyNoRun: string
  // copy messages
  rowFull: string
  copied: string
  wrongTrial: string
}

export const strings: Strings<TimingStrings> = {
  es: {
    aria: 'Barra de cronometraje',
    trialLabel: 'Prueba',
    trialOption: 'Prueba {n}: {m} masas',
    trialOptionEmpty: 'Prueba {n}: contenedor vacío',
    lcdAria: 'Pantalla del cronómetro',
    start: 'Iniciar', stop: 'Detener', reset: 'Cero', copy: 'Copiar', release: 'Soltar', returnStart: 'Volver al inicio',
    keys: 'Teclas: S soltar · Espacio iniciar/detener · R cero · Enter copiar',
    keysFull: 'Teclas: S suelta el DigiCart, Espacio inicia y detiene el cronómetro, R lo pone en cero, Enter copia la lectura a la tabla.',
    needStopwatch: 'Pon el cronómetro sobre la mesa.',
    readyHint: 'Suelta el DigiCart desde el reposo en la marca de inicio.',
    whyRolling: 'El DigiCart se está moviendo.',
    whyUnplaced: 'Primero pon el DigiCart sobre la riel.',
    whyNoRun: 'Falta algo para poder soltar: revisa el inventario y el DigiCart sobre la riel.',
    rowFull: 'Esa prueba ya tiene 10 tiempos.',
    copied: 'Copiado {t} s a la prueba {n}, tiempo {c}.',
    wrongTrial: 'Ojo: este recorrido se hizo con otra cantidad de masas en el contenedor que la fila elegida.',
  },
  en: {
    aria: 'Timing bar',
    trialLabel: 'Trial',
    trialOption: 'Trial {n}: {m} masses',
    trialOptionEmpty: 'Trial {n}: empty canister',
    lcdAria: 'Stopwatch display',
    start: 'Start', stop: 'Stop', reset: 'Zero', copy: 'Copy', release: 'Release', returnStart: 'Back to start',
    keys: 'Keys: S release · Space start/stop · R zero · Enter copy',
    keysFull: 'Keys: S releases the DigiCart, Space starts and stops the stopwatch, R zeroes it, Enter copies the reading to the table.',
    needStopwatch: 'Put the stopwatch on the table.',
    readyHint: 'Release the DigiCart from rest on the start mark.',
    whyRolling: 'The DigiCart is moving.',
    whyUnplaced: 'First put the DigiCart on the rail.',
    whyNoRun: 'Something is missing before you can release: check the inventory and the DigiCart on the rail.',
    rowFull: 'That trial already has 10 times.',
    copied: 'Copied {t} s to trial {n}, time {c}.',
    wrongTrial: 'Careful: this run was made with a different number of masses in the canister than the chosen row.',
  },
}
