import type { Strings } from '../../views/view.ts'
import type { CoachStrings as CoreCoachStrings } from '../../../../core/pedagogy/coachView.ts'
import type { CoachKey } from '../coach.ts'

export type CoachStrings = CoreCoachStrings<CoachKey>

export const strings: Strings<CoachStrings> = {
  es: {
    label: 'Sugerencia',
    dismiss: 'Descartar la sugerencia',
    nudges: {
      cartOffRail: 'Ojo: el DigiCart nunca debe quedar fuera de la riel. Rueda con facilidad y puede caer de la mesa. Colócalo entero sobre la riel.',
      noReceiver: 'Sin el receptor en el extremo bajo no hay quién detenga al carro y se cae. Ponlo antes de soltar.',
      scaleReversed: 'La escala impresa tiene el 0 en el extremo bajo. La guía cuenta las distancias desde el punto más alto: pasa el otro extremo de la riel a la pinza.',
      raisedBeforeLevel: 'Subiste el soporte antes de nivelar. Baja la cremallera a cero, nivela con el pie del soporte de dos patas y vuelve a subir.',
      angleOff: 'La inclinación no está en 1,30° dentro de la tolerancia. Revisa las alturas con el flexómetro antes de seguir tomando tiempos.',
      cartNotAtZero: 'El frente del carro no está en la marca de 0 cm (A). Las distancias de la Tabla 1.1 se cuentan desde ahí.',
      noMarks: 'Aún no hay marcas en la riel. Sin ellas no sabrás dónde detener el cronómetro.',
      startLate: 'Pulsaste iniciar unos {s} s después de soltar el carro. Así pierdes el comienzo del movimiento: inicia justo al soltar.',
      startEarly: 'Pulsaste iniciar unos {s} s antes de soltar el carro. La lectura incluye esa espera: inicia justo al soltar.',
      wrongMark: 'Estabas cronometrando la marca de {target} cm, pero tu parada se parece más a la de {other} cm. Revisa qué marca elegiste.',
      implausible: 'El valor {t} s en {x} cm no encaja con tus otras lecturas ni con las marcas vecinas. ¿Lo copiaste bien?',
      emptyCopy: 'El cronómetro está en cero o sin lectura: no hay nada que copiar. Cronometra una repetición primero.',
    },
  },
  en: {
    label: 'Hint',
    dismiss: 'Dismiss the hint',
    nudges: {
      cartOffRail: 'Careful: the DigiCart must never be off the rail. It rolls easily and can fall off the table. Put it fully on the rail.',
      noReceiver: 'With no receiver at the low end nothing stops the cart and it falls. Fit it before releasing.',
      scaleReversed: 'The printed scale has its 0 at the low end. The guide counts distances from the highest point: put the other rail end in the clamp.',
      raisedBeforeLevel: 'You raised the stand before levelling. Lower the rack to zero, level with the foot of the two-leg stand and raise again.',
      angleOff: 'The incline is not 1.30° within tolerance. Check the heights with the tape measure before you keep timing.',
      cartNotAtZero: 'The cart front is not on the 0 cm mark (A). The distances in Table 1.1 are counted from there.',
      noMarks: 'There are no marks on the rail yet. Without them you will not know where to stop the stopwatch.',
      startLate: 'You pressed start about {s} s after releasing the cart. You miss the start of the motion: start right at the release.',
      startEarly: 'You pressed start about {s} s before releasing the cart. The reading includes that wait: start right at the release.',
      wrongMark: 'You were timing the {target} cm mark, but your stop looks closer to the {other} cm one. Check which mark you picked.',
      implausible: 'The value {t} s at {x} cm does not fit your other readings or the neighbouring marks. Did you copy it correctly?',
      emptyCopy: 'The stopwatch is at zero or has no reading: there is nothing to copy. Time a run first.',
    },
  },
}
