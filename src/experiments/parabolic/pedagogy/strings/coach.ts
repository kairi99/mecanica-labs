import type { Strings } from '../../views/view.ts'
import type { CoachStrings as CoreCoachStrings } from '../../../../core/pedagogy/coachView.ts'
import type { CoachKey } from '../coach.ts'

export type CoachStrings = CoreCoachStrings<CoachKey>

export const strings: Strings<CoachStrings> = {
  es: {
    label: 'Sugerencia',
    dismiss: 'Descartar la sugerencia',
    nudges: {
      marksLowerHalf: 'Esa marca está en la mitad inferior de la riel. La guía pide las 5 marcas en la mitad superior (de 60 a 120 cm): ahí la bola llega al borde con más rapidez.',
      noCarbon: 'Soltaste la bola sin papel carbón sobre el papel bond: no quedará marca y no podrás medir el alcance.',
      paperMoved: 'Moviste el papel con marcas ya puestas. Ya no corresponden a la proyección del borde: mide antes de moverlo o repite los lanzamientos.',
      riseOff: 'El extremo alto no está a unos 20 cm sobre la mesa. Con otra altura cambia la pendiente y con ella todas las rapideces de salida; mídela con la cinta y ajusta el soporte.',
      gapSmall: 'La punta de la riel está a solo {cm} cm del borde. La guía deja unos 5 cm para que la bola ya ruede sobre la mesa al llegar al borde; muy cerca, puede salir todavía patinando y cambiar la rapidez de salida.',
      gapLarge: 'La punta de la riel está a {cm} cm del borde. Una separación grande no detiene la bola (la resistencia a la rodadura es pequeña), solo la frena un poco: cambia v0 y añade dispersión entre lanzamientos. Vuelve a unos 5 cm.',
      noEdgeProjection: 'Aún no marcaste en el piso el punto bajo el borde de la mesa. El alcance se mide desde ahí hasta el centro de la marca; márcalo con una plomada o una escuadra.',
      offPaper: 'La bola cayó fuera del papel bond o del carbón y no dejó marca. Centra los papeles en la zona de aterrizaje (mira dónde cayó) y repite el lanzamiento.',
      tooFaint: 'La marca salió demasiado tenue para verse. La pelota de ping-pong es liviana y deja marcas débiles: repite el lanzamiento, o apoya mejor el papel carbón.',
      startedAtRelease: 'Parece que arrancaste el cronómetro unos {s} s antes de que la bola llegara al borde. El tiempo de vuelo empieza al pasar el borde, no al soltarla: así estás midiendo también el rodar.',
      startedLate: 'Arrancaste el cronómetro unos {s} s después de que la bola pasó el borde, así que se perdió parte de la caída. Prepárate y presiona justo cuando salga de la mesa.',
      timeFar: 'Un tiempo de {t} s está lejos de lo que cabe esperar para caer desde una mesa (cerca de 0,4 s). Revisa en qué momento presionaste inicio y alto.',
      rangeFromTip: 'Ese alcance coincide con medir desde la punta de la riel ({cm} cm antes del borde). Mídelo desde la proyección del borde en el piso, como pide la guía.',
      launchHeightMissing: 'Ya tienes varios datos pero no has medido la altura de lanzamiento (del piso a la mesa). La necesitas para el tiempo esperado y la rapidez final.',
    },
  },
  en: {
    label: 'Hint',
    dismiss: 'Dismiss the hint',
    nudges: {
      marksLowerHalf: 'That mark is in the lower half of the rail. The guide asks for all 5 marks in the upper half (60 to 120 cm): there the ball reaches the edge with more speed.',
      noCarbon: 'You released the ball with no carbon paper over the bond paper: it will leave no mark and you will not be able to measure the range.',
      paperMoved: 'You moved the paper while it had marks. They no longer match the edge projection: measure before moving it or repeat the launches.',
      riseOff: 'The high end is not about 20 cm above the table. Another height changes the slope and with it every launch speed; measure it with the tape and adjust the stand.',
      gapSmall: 'The rail tip is only {cm} cm from the edge. The guide leaves about 5 cm so the ball is already rolling on the table at the edge; very close, it may leave still slipping and change the launch speed.',
      gapLarge: 'The rail tip is {cm} cm from the edge. A large gap does not stop the ball (rolling resistance is small), it only slows it a little: that changes v0 and adds scatter between launches. Go back to about 5 cm.',
      noEdgeProjection: 'You have not marked the point under the table edge on the floor yet. The range is measured from there to the centre of the dot; mark it with a plumb line or a set square.',
      offPaper: 'The ball landed off the bond paper or the carbon and left no mark. Centre the papers on the landing zone (watch where it fell) and repeat the launch.',
      tooFaint: 'The dot was too faint to see. The ping-pong ball is light and leaves weak marks: repeat the launch, or press the carbon paper down better.',
      startedAtRelease: 'It looks like you started the stopwatch about {s} s before the ball reached the edge. The flight time starts when it passes the edge, not at the release: this way you also time the roll.',
      startedLate: 'You started the stopwatch about {s} s after the ball passed the edge, so part of the fall is missing. Get ready and press just as it leaves the table.',
      timeFar: 'A time of {t} s is far from what to expect for a fall from a table (about 0.4 s). Check when you pressed start and stop.',
      rangeFromTip: 'That range matches measuring from the tip of the rail ({cm} cm before the edge). Measure it from the edge projection on the floor, as the guide asks.',
      launchHeightMissing: 'You have several data points but have not measured the launch height (floor to table). You need it for the expected time and the final speed.',
    },
  },
}
