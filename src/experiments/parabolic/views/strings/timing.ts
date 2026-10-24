import type { Strings } from '../view.ts'

export interface TimingStrings {
  aria: string
  trialLabel: string
  repLabel: string
  trialOption: string
  repOption: string
  lcdAria: string
  start: string
  stop: string
  reset: string
  release: string
  releaseBall: { marble: string; pingpong: string }
  returnStart: string
  copy: string
  keys: string
  keysFull: string
  needStopwatch: string
  readyHint: string
  cell: string
  balls: { marble: string; pingpong: string }
  ballMovedToMark: string
}

export const strings: Strings<TimingStrings> = {
  es: {
    aria: 'Cronometraje',
    trialLabel: 'Número de marca', repLabel: 'Repetición',
    trialOption: 'No. {n}', repOption: 'Rep. {n}',
    lcdAria: 'Pantalla del cronómetro',
    start: 'Iniciar', stop: 'Detener', reset: 'Reiniciar',
    release: 'Soltar la bola',
    releaseBall: { marble: 'Soltar la canica', pingpong: 'Soltar la pelota' },
    returnStart: 'Devolver la bola',
    copy: 'Copiar a la tabla',
    keys: 'Espacio · S · R · Enter',
    keysFull: 'Espacio inicia o detiene, S suelta la bola, R reinicia el cronómetro, Enter copia la lectura a la tabla.',
    needStopwatch: 'Pon el cronómetro sobre la mesa desde el inventario.',
    readyHint: 'Listo para soltar.',
    cell: 'Celda: {ball} · No. {t} · repetición {r}',
    balls: { marble: 'canica', pingpong: 'pelota de ping-pong' },
    ballMovedToMark: 'La bola pasó a la marca {n}.',
  },
  en: {
    aria: 'Timing',
    trialLabel: 'Mark number', repLabel: 'Repetition',
    trialOption: 'No. {n}', repOption: 'Rep. {n}',
    lcdAria: 'Stopwatch display',
    start: 'Start', stop: 'Stop', reset: 'Reset',
    release: 'Release the ball',
    releaseBall: { marble: 'Release the marble', pingpong: 'Release the ball' },
    returnStart: 'Return the ball',
    copy: 'Copy to the table',
    keys: 'Space · S · R · Enter',
    keysFull: 'Space starts or stops, S releases the ball, R resets the stopwatch, Enter copies the reading to the table.',
    needStopwatch: 'Put the stopwatch on the table from the inventory.',
    readyHint: 'Ready to release.',
    cell: 'Cell: {ball} · No. {t} · repetition {r}',
    balls: { marble: 'marble', pingpong: 'ping-pong ball' },
    ballMovedToMark: 'The ball moved to mark {n}.',
  },
}
