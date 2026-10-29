import type { Strings } from '../view.ts'

export interface TimingStrings {
  aria: string
  markLabel: string
  markOption: string
  lcdAria: string
  start: string
  stop: string
  reset: string
  release: string
  returnStart: string
  copy: string
  keys: string
  keysFull: string
  needStopwatch: string
  whyUnplaced: string
  whyRolling: string
  whyNoRun: string
  readyHint: string
}

export const strings: Strings<TimingStrings> = {
  es: {
    aria: 'Cronometraje',
    markLabel: 'Marca',
    markOption: 'Marca: {n} cm',
    lcdAria: 'Pantalla del cronómetro',
    start: 'Iniciar', stop: 'Detener', reset: 'Reiniciar',
    release: 'Soltar el DigiCart',
    returnStart: 'Devolver el DigiCart al inicio',
    copy: 'Copiar a la tabla',
    keys: 'Espacio · S · R · Enter',
    keysFull: 'Espacio inicia o detiene, S suelta el DigiCart, R reinicia el cronómetro, Enter copia la lectura a la tabla.',
    needStopwatch: 'El cronómetro no está sobre la mesa: arrástralo desde la bandeja de piezas.',
    whyUnplaced: 'Primero coloca el DigiCart en reposo sobre la riel (paso 2).',
    whyRolling: 'El DigiCart está rodando.',
    whyNoRun: 'Falta algo en el montaje para soltar el DigiCart (revisa el paso 1).',
    readyHint: 'Listo para soltar.',
  },
  en: {
    aria: 'Timing',
    markLabel: 'Mark',
    markOption: 'Mark: {n} cm',
    lcdAria: 'Stopwatch display',
    start: 'Start', stop: 'Stop', reset: 'Reset',
    release: 'Release the DigiCart',
    returnStart: 'Bring the DigiCart back to the start',
    copy: 'Copy to the table',
    keys: 'Space · S · R · Enter',
    keysFull: 'Space starts or stops, S releases the DigiCart, R resets the stopwatch, Enter copies the reading to the table.',
    needStopwatch: 'The stopwatch is not on the table: drag it from the parts tray.',
    whyUnplaced: 'First put the DigiCart at rest on the rail (step 2).',
    whyRolling: 'The DigiCart is rolling.',
    whyNoRun: 'Something is missing in the setup before the DigiCart can be released (check step 1).',
    readyHint: 'Ready to release.',
  },
}
