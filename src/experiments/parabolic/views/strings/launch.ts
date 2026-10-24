import type { Strings } from '../view.ts'

export interface LaunchStrings {
  title: string
  steps: string
  phase: Record<'none' | 'chosen' | 'placed' | 'moving' | 'done' | 'stopped' | 'rolledOver', string>
  blocked: string
  lastReading: string
  autoEdge: string
  reactionTitle: string
  reaction: string
}

export const strings: Strings<LaunchStrings> = {
  es: {
    title: 'Lanzamientos',
    steps: 'Suelta la bola sin empujarla (tecla S). Cuando llegue al borde de la mesa pulsa Espacio para iniciar; púlsalo otra vez cuando toque el piso. Enter copia el tiempo a la celda activa de la Tabla 2.1.',
    phase: {
      none: 'Elige la bola en el paso 2.',
      chosen: 'Falta poner la bola sobre una marca de la riel (paso 2).',
      placed: 'La bola reposa en la riel, lista para soltar.',
      moving: 'La bola está en movimiento.',
      done: 'El lanzamiento terminó. Mide el alcance en el papel (con la cinta, abajo) y devuelve la bola a su marca para repetir.',
      stopped: 'La bola se detuvo en la mesa y no llegó al borde. Revisa la inclinación y la distancia al borde (paso 2).',
      rolledOver: 'La bola salió rodando por el borde en lugar de volar horizontalmente.',
    },
    blocked: 'Para soltar: {x}',
    lastReading: 'Última lectura del cronómetro: {t} s.',
    autoEdge: 'Pasar a la vista de perfil al soltar la bola',
    reactionTitle: 'Tu tiempo de reacción',
    reaction: 'El vuelo dura menos de medio segundo. Tu reacción al pulsar tarda unas décimas de segundo, y se nota mucho en el tiempo que mides. Por eso se repite cinco veces cada marca.',
  },
  en: {
    title: 'Launches',
    steps: 'Release the ball without pushing it (key S). When it reaches the table edge press Space to start; press it again when it hits the floor. Enter copies the time to the active cell of Table 2.1.',
    phase: {
      none: 'Choose the ball in step 2.',
      chosen: 'The ball still has to go on a mark of the rail (step 2).',
      placed: 'The ball rests on the rail, ready to release.',
      moving: 'The ball is moving.',
      done: 'The launch is over. Measure the range on the paper (with the tape, below) and bring the ball back to its mark to repeat.',
      stopped: 'The ball stopped on the table and did not reach the edge. Check the incline and the distance to the edge (step 2).',
      rolledOver: 'The ball rolled off the edge instead of flying horizontally.',
    },
    blocked: 'To release: {x}',
    lastReading: 'Last stopwatch reading: {t} s.',
    autoEdge: 'Switch to the side-on view when the ball is released',
    reactionTitle: 'Your reaction time',
    reaction: 'The flight lasts less than half a second. Your reaction when you press takes a few tenths of a second, and it shows a lot in the time you measure. That is why each mark is repeated five times.',
  },
}
