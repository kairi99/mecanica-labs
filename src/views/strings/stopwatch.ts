import type { Strings } from '../view.ts'

export interface StopwatchStrings {
  title: string
  lcdAria: string
  start: string
  stop: string
  reset: string
  keyHint: string
  markTarget: string
  markOption: string
  release: string
  releaseKey: string
  link: string
  linkNote: string
  reaction: string
  needStopwatch: string
  lastReading: string
  lastReadingFor: string
  phaseUnplaced: string
  phaseAtStart: string
  phaseRolling: string
  phaseStopped: string
  phaseStuck: string
  runs: string
  keysTitle: string
}

export const strings: Strings<StopwatchStrings> = {
  es: {
    title: 'Cronómetro',
    lcdAria: 'Pantalla del cronómetro',
    start: 'Iniciar', stop: 'Detener', reset: 'Reiniciar',
    keyHint: 'Espacio: iniciar o detener · R: reiniciar',
    markTarget: '¿Hasta qué marca mides?',
    markOption: '{n} cm',
    release: 'Soltar el DigiCart',
    releaseKey: 'Tecla S',
    link: 'Iniciar el cronómetro al soltar el carro',
    linkNote: 'Solo para practicar; no es realista: en el laboratorio sueltas el carro y pulsas el cronómetro con tu mano.',
    reaction: 'Tu lectura incluye tu propio tiempo de reacción: al pulsar iniciar y detener, tu mano llega un poco tarde. Por eso repites cada medida 10 veces.',
    needStopwatch: 'Pon el cronómetro sobre la mesa desde el inventario.',
    lastReading: 'Última lectura: {t} s',
    lastReadingFor: 'Última lectura: {t} s (hasta {x} cm)',
    phaseUnplaced: 'DigiCart: sin colocar en la riel.',
    phaseAtStart: 'DigiCart: en reposo, listo para soltar.',
    phaseRolling: 'DigiCart: rodando.',
    phaseStopped: 'DigiCart: detenido. Devuélvelo al inicio para otra corrida.',
    phaseStuck: 'DigiCart: detenido sobre la riel.',
    runs: 'Corridas realizadas: {n}',
    keysTitle: 'Atajos',
  },
  en: {
    title: 'Stopwatch',
    lcdAria: 'Stopwatch display',
    start: 'Start', stop: 'Stop', reset: 'Reset',
    keyHint: 'Space: start or stop · R: reset',
    markTarget: 'Up to which mark are you timing?',
    markOption: '{n} cm',
    release: 'Release the DigiCart',
    releaseKey: 'Key S',
    link: 'Start the stopwatch when the cart is released',
    linkNote: 'Practice only; not realistic: in the lab you release the cart and press the stopwatch by hand.',
    reaction: 'Your reading includes your own reaction time: when you press start and stop, your hand arrives a little late. That is why you repeat each measurement 10 times.',
    needStopwatch: 'Put the stopwatch on the table from the inventory.',
    lastReading: 'Last reading: {t} s',
    lastReadingFor: 'Last reading: {t} s (up to {x} cm)',
    phaseUnplaced: 'DigiCart: not on the rail.',
    phaseAtStart: 'DigiCart: at rest, ready to release.',
    phaseRolling: 'DigiCart: rolling.',
    phaseStopped: 'DigiCart: stopped. Bring it back to the start for another run.',
    phaseStuck: 'DigiCart: stopped on the rail.',
    runs: 'Runs so far: {n}',
    keysTitle: 'Shortcuts',
  },
}
