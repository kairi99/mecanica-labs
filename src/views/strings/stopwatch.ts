import type { Strings } from '../view.ts'

export interface StopwatchStrings {
  title: string
  autoMark: string
  practice: string
  link: string
  linkNote: string
  reactionTitle: string
  reaction: string
  lastReading: string
  lastReadingFor: string
  phaseUnplaced: string
  phaseAtStart: string
  phaseRolling: string
  phaseStopped: string
  phaseStuck: string
  runs: string
  steps: string
}

export const strings: Strings<StopwatchStrings> = {
  es: {
    title: 'Cronometraje',
    autoMark: 'Cambiar a la vista Marca al soltar',
    practice: 'Modo práctica',
    link: 'Iniciar el cronómetro al soltar el DigiCart',
    linkNote: 'Solo para practicar; no es realista: en el laboratorio sueltas el carro y pulsas el cronómetro con tu mano.',
    reactionTitle: 'Tu tiempo de reacción',
    reaction: 'Tu lectura incluye tu propio tiempo de reacción: al pulsar iniciar y detener, tu mano llega un poco tarde. Por eso repites cada medida 10 veces.',
    lastReading: 'Última lectura: {t} s',
    lastReadingFor: 'Última lectura: {t} s (hasta {x} cm)',
    phaseUnplaced: 'DigiCart: sin colocar en la riel.',
    phaseAtStart: 'DigiCart: en reposo, listo para soltar.',
    phaseRolling: 'DigiCart: rodando.',
    phaseStopped: 'DigiCart: detenido. Devuélvelo al inicio para otra repetición.',
    phaseStuck: 'DigiCart: detenido sobre la riel.',
    runs: 'Repeticiones realizadas: {n}',
    steps: 'Suelta el DigiCart (S), inicia el cronómetro cuando pase por el inicio, detenlo en la marca elegida y copia la lectura a la tabla.',
  },
  en: {
    title: 'Timing',
    autoMark: 'Switch to the Mark view on release',
    practice: 'Practice mode',
    link: 'Start the stopwatch when the DigiCart is released',
    linkNote: 'Practice only; not realistic: in the lab you release the cart and press the stopwatch by hand.',
    reactionTitle: 'Your reaction time',
    reaction: 'Your reading includes your own reaction time: when you press start and stop, your hand arrives a little late. That is why you repeat each measurement 10 times.',
    lastReading: 'Last reading: {t} s',
    lastReadingFor: 'Last reading: {t} s (up to {x} cm)',
    phaseUnplaced: 'DigiCart: not on the rail.',
    phaseAtStart: 'DigiCart: at rest, ready to release.',
    phaseRolling: 'DigiCart: rolling.',
    phaseStopped: 'DigiCart: stopped. Bring it back to the start for another run.',
    phaseStuck: 'DigiCart: stopped on the rail.',
    runs: 'Runs so far: {n}',
    steps: 'Release the DigiCart (S), start the stopwatch as it passes the start, stop it at the chosen mark and copy the reading to the table.',
  },
}
