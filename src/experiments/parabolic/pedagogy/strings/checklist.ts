import type { Strings } from '../../views/view.ts'
import type { ChecklistStrings as CoreChecklistStrings } from '../../../../core/pedagogy/checklistView.ts'
import type { StepId } from '../checklist.ts'

export type ChecklistStrings = CoreChecklistStrings<StepId>

export const strings: Strings<ChecklistStrings> = {
  es: {
    title: 'Procedimiento',
    intro: 'Sigue el montaje y el procedimiento de la guía (2.3.2 y 2.3.3). Es una ayuda: no bloquea nada.',
    progress: '{n} de {total} pasos listos',
    allDone: 'Todos los pasos están listos. Ahora pasa al análisis (sección 2.4).',
    statusOk: 'Listo', statusPending: 'Pendiente', statusNa: 'Aún no',
    why: 'Por qué', show: 'Muéstramelo', showAria: 'Muéstramelo: {step}', next: 'Siguiente',
    tour: 'Ver el recorrido',
    rowChip: '{x}: {n} de {total}',
    steps: {
      assembly: { label: 'Montaje completo', why: 'Con el soporte con cremallera en su base y la riel sujeta a él y al soporte de dos patas, la pista no se mueve entre un lanzamiento y otro.' },
      rise: { label: 'Extremo alto 20 cm sobre la mesa', why: 'La guía pide subir 20 cm el extremo del soporte con cremallera, de modo que el otro extremo quede apoyado en la mesa. Mide la altura con la cinta métrica.' },
      gap: { label: 'Extremo bajo de la riel a unos 5 cm del borde', why: 'Si la riel termina lejos del borde, la bola frena en la mesa; si llega al borde, no sale horizontal. Unos 5 cm es lo que pide la guía.' },
      marks: { label: '5 marcas en la mitad superior de la riel', why: 'Soltar la bola desde 5 posiciones distintas da 5 velocidades de salida. La mitad superior (de 60 a 120 cm) asegura que la bola llegue al borde con buena rapidez.' },
      paper: { label: 'Papel bond con papel carbón encima, en el piso', why: 'Donde la bola toca el papel carbón deja una marca en el papel bond: ahí mides el alcance. No muevas el papel antes de medir.' },
      launches: { label: 'Lanzamientos anotados en la Tabla 2.1', why: 'Cinco repeticiones de tiempo y alcance en cada una de las cinco marcas, primero con la canica y luego con la pelota de ping-pong.' },
    },
    detail: {
      missing: 'Faltan {n} cosas (revisa el inventario).',
      needRail: 'Primero fija la riel a la pinza del soporte.',
      marks: '{n} marcas puestas, {upper} en la mitad superior',
      launches: '{runs} lanzamientos · {n} de {total} datos',
    },
  },
  en: {
    title: 'Procedure',
    intro: 'Follow the assembly and the procedure of the guide (2.3.2 and 2.3.3). It is a help: it blocks nothing.',
    progress: '{n} of {total} steps done',
    allDone: 'All steps are done. Now go to the analysis (section 2.4).',
    statusOk: 'Done', statusPending: 'To do', statusNa: 'Not yet',
    why: 'Why', show: 'Show me', showAria: 'Show me: {step}', next: 'Next',
    tour: 'Take the tour',
    rowChip: '{x}: {n} of {total}',
    steps: {
      assembly: { label: 'Assembly complete', why: 'With the rack-and-pinion stand on its base and the rail fastened to it and to the two-leg stand, the track does not move between launches.' },
      rise: { label: 'High end 20 cm above the table', why: 'The guide asks to raise the rack-stand end 20 cm, so the other end rests on the table. Measure the height with the tape measure.' },
      gap: { label: 'Low end of the rail about 5 cm from the edge', why: 'If the rail ends far from the edge the ball slows down on the table; if it reaches the edge, it does not leave horizontally. About 5 cm is what the guide asks.' },
      marks: { label: '5 marks in the upper half of the rail', why: 'Releasing the ball from 5 different positions gives 5 launch speeds. The upper half (60 to 120 cm) makes sure the ball reaches the edge with good speed.' },
      paper: { label: 'Bond paper with carbon paper on top, on the floor', why: 'Where the ball hits the carbon paper it leaves a mark on the bond paper: that is where you measure the range. Do not move the paper before measuring.' },
      launches: { label: 'Launches recorded in Table 2.1', why: 'Five repetitions of time and range at each of the five marks, first with the marble and then with the ping-pong ball.' },
    },
    detail: {
      missing: '{n} things are missing (check the inventory).',
      needRail: 'First fasten the rail to the stand clamp.',
      marks: '{n} marks placed, {upper} in the upper half',
      launches: '{runs} launches · {n} of {total} values',
    },
  },
}
