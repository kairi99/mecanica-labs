import type { Strings } from '../view.ts'

export interface SlowmoStrings {
  title: string
  intro: string
  noRuns: string
  goLaunch: string
  noFlight: string
  runLabel: string
  runOption: string
  runNoMark: string
  runNoRep: string
  runNoTime: string
  runNoFlight: string
  balls: { marble: string; pingpong: string }
  canvasAria: string
  slider: string
  prev: string
  next: string
  play: string
  pause: string
  playNote: string
  reducedNote: string
  toLaunch: string
  toLanding: string
  frame: string
  markLaunch: string
  markLanding: string
  markNote: string
  edge: string
  floor: string
  resultsTitle: string
  flightFrames: string
  flightValue: string
  speedValue: string
  speedNote: string
  yourTime: string
  yourTimeNone: string
  compare: string
  frameNote: string
}

export const strings: Strings<SlowmoStrings> = {
  es: {
    title: 'Cámara lenta',
    intro: 'Una cámara de 240 fotogramas por segundo filmó el lanzamiento. Avanza fotograma a fotograma para medir el tiempo de vuelo y la rapidez en el borde sin depender de tu reacción.',
    noRuns: 'Todavía no hay lanzamientos. Suelta la bola en el paso 3.',
    goLaunch: 'Ir al paso 3',
    noFlight: 'Este lanzamiento no tiene vuelo (la bola se detuvo en la mesa o salió rodando), así que no hay nada que ver en cámara lenta.',
    runLabel: 'Lanzamiento',
    runOption: 'Lanzamiento {n} · {ball} · {mark} · {rep} · {time}',
    runNoMark: 'sin marca', runNoRep: 'sin tabla', runNoTime: 'sin tiempo',
    runNoFlight: 'sin vuelo',
    balls: { marble: 'canica', pingpong: 'pelota de ping-pong' },
    canvasAria: 'Vista lateral del lanzamiento en cámara lenta, con una escala en centímetros',
    slider: 'Fotograma',
    prev: 'Fotograma anterior', next: 'Fotograma siguiente',
    play: 'Reproducir', pause: 'Pausa',
    playNote: 'Reproducción a 1/8 de la velocidad real.',
    reducedNote: 'Tu sistema pide menos movimiento: avanza con los botones de fotograma.',
    toLaunch: 'Ir al lanzamiento', toLanding: 'Ir al aterrizaje',
    frame: 'fotograma {n} · t = {t} s',
    markLaunch: 'Lanzamiento · fotograma {n}',
    markLanding: 'Aterrizaje · fotograma {n}',
    markNote: 'Lanzamiento: primer fotograma tras pasar el borde. Aterrizaje: primer fotograma con la bola en el piso.',
    edge: 'borde',
    floor: 'piso',
    resultsTitle: 'Lo que dice la cámara',
    flightFrames: '{n} fotogramas entre el lanzamiento y el aterrizaje',
    flightValue: 'Tiempo de vuelo: {t} s (± {q} s)',
    speedValue: 'Rapidez en el borde: {v} m/s',
    speedNote: 'Sale de la distancia que avanza la bola entre dos fotogramas seguidos, dividida entre 1/240 s.',
    yourTime: 'Tu cronómetro marcó {t} s.',
    yourTimeNone: 'No cronometraste este lanzamiento.',
    compare: 'Diferencia con la cámara: {d} s ({p} % del tiempo de la cámara).',
    frameNote: 'Cada tiempo contado en fotogramas tiene una incertidumbre de ± 1/240 s.',
  },
  en: {
    title: 'Slow motion',
    intro: 'A 240 frames-per-second camera filmed the launch. Step frame by frame to measure the flight time and the speed at the edge without depending on your reaction.',
    noRuns: 'There are no launches yet. Release the ball in step 3.',
    goLaunch: 'Go to step 3',
    noFlight: 'This launch has no flight (the ball stopped on the table or rolled off), so there is nothing to see in slow motion.',
    runLabel: 'Launch',
    runOption: 'Launch {n} · {ball} · {mark} · {rep} · {time}',
    runNoMark: 'no mark', runNoRep: 'not in table', runNoTime: 'no time',
    runNoFlight: 'no flight',
    balls: { marble: 'marble', pingpong: 'ping-pong ball' },
    canvasAria: 'Side view of the launch in slow motion, with a scale in centimetres',
    slider: 'Frame',
    prev: 'Previous frame', next: 'Next frame',
    play: 'Play', pause: 'Pause',
    playNote: 'Playing at 1/8 of real speed.',
    reducedNote: 'Your system asks for less motion: step with the frame buttons.',
    toLaunch: 'Go to the launch', toLanding: 'Go to the landing',
    frame: 'frame {n} · t = {t} s',
    markLaunch: 'Launch · frame {n}',
    markLanding: 'Landing · frame {n}',
    markNote: 'Launch: first frame after the ball passes the edge. Landing: first frame with the ball on the floor.',
    edge: 'edge',
    floor: 'floor',
    resultsTitle: 'What the camera says',
    flightFrames: '{n} frames between the launch and the landing',
    flightValue: 'Flight time: {t} s (± {q} s)',
    speedValue: 'Speed at the edge: {v} m/s',
    speedNote: 'It comes from the distance the ball moves between two consecutive frames, divided by 1/240 s.',
    yourTime: 'Your stopwatch showed {t} s.',
    yourTimeNone: 'You did not time this launch.',
    compare: 'Difference from the camera: {d} s ({p} % of the camera time).',
    frameNote: 'Every time counted in frames has an uncertainty of ± 1/240 s.',
  },
}
