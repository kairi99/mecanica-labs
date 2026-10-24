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
    },
  },
  en: {
    label: 'Hint',
    dismiss: 'Dismiss the hint',
    nudges: {
      marksLowerHalf: 'That mark is in the lower half of the rail. The guide asks for all 5 marks in the upper half (60 to 120 cm): there the ball reaches the edge with more speed.',
      noCarbon: 'You released the ball with no carbon paper over the bond paper: it will leave no mark and you will not be able to measure the range.',
      paperMoved: 'You moved the paper while it had marks. They no longer match the edge projection: measure before moving it or repeat the launches.',
    },
  },
}
