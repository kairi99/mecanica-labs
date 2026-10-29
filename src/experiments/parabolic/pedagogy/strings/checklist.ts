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
      edgeProjection: { label: 'Proyección del borde marcada en el piso', why: 'El alcance se mide desde el punto del piso justo debajo del borde de la mesa, no desde la punta de la riel. Márcalo con una plomada o una escuadra antes de lanzar.' },
      timing: { label: 'Tiempo medido del borde al piso', why: 'El tiempo de vuelo empieza cuando la bola pasa el borde y termina cuando toca el piso. Si arrancas el cronómetro al soltarla, mides también el rodar por la riel.' },
      range: { label: 'Alcance medido sin mover el papel', why: 'Mide la distancia desde la proyección del borde hasta el centro de la marca de carbón con el papel donde cayó la bola. Si lo mueves antes, la marca ya no corresponde al borde.' },
      launches: { label: 'Lanzamientos anotados en la Tabla 2.1', why: 'Cinco repeticiones de tiempo y alcance en cada una de las cinco marcas, primero con la canica y luego con la pelota de ping-pong.' },
      bothBalls: { label: 'Se usaron la canica y la pelota de ping-pong', why: 'La guía repite todo con la pelota de ping-pong. Compararlas es la tarea 8: misma pista, distinta masa, tamaño y vacío por dentro.' },
      launchHeight: { label: 'Altura de lanzamiento medida', why: 'La mides con la cinta desde el piso hasta la superficie de la mesa. La necesitas para el tiempo esperado (tarea 5) y la rapidez final (tarea 7).' },
    },
    detail: {
      missing: 'Faltan {n} cosas (arrastra las piezas a su sitio; el panel de montaje dice cuáles).',
      needRail: 'Primero fija la riel a la pinza del soporte.',
      riseUnmeasured: 'Aún no mediste con la cinta cuánto sube el extremo alto.',
      marks: '{n} marcas puestas, {upper} en la mitad superior',
      launches: '{runs} lanzamientos · {n} de {total} datos',
      timing: '{n} de {stops} lecturas empezaron en el borde',
      paperMoved: 'Moviste el papel con marcas puestas.',
      bothBalls: 'Canica {marble} de {per} · ping-pong {pingpong} de {per}',
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
      edgeProjection: { label: 'Edge projection marked on the floor', why: 'The range is measured from the floor point right below the table edge, not from the tip of the rail. Mark it with a plumb line or a set square before launching.' },
      timing: { label: 'Time measured from the edge to the floor', why: 'The flight time starts when the ball passes the edge and ends when it touches the floor. If you start the watch at the release you also time the roll along the rail.' },
      range: { label: 'Range measured without moving the paper', why: 'Measure from the edge projection to the centre of the carbon dot with the paper where the ball landed. If you move it first, the dot no longer matches the edge.' },
      launches: { label: 'Launches recorded in Table 2.1', why: 'Five repetitions of time and range at each of the five marks, first with the marble and then with the ping-pong ball.' },
      bothBalls: { label: 'Both the marble and the ping-pong ball used', why: 'The guide repeats everything with the ping-pong ball. Comparing them is task 8: same track, different mass, size and hollow inside.' },
      launchHeight: { label: 'Launch height measured', why: 'Measure it with the tape from the floor to the table surface. You need it for the expected time (task 5) and the final speed (task 7).' },
    },
    detail: {
      missing: '{n} things are missing (drag the parts into place; the assembly panel says which).',
      needRail: 'First fasten the rail to the stand clamp.',
      riseUnmeasured: 'You have not measured with the tape how high the upper end is yet.',
      marks: '{n} marks placed, {upper} in the upper half',
      launches: '{runs} launches · {n} of {total} values',
      timing: '{n} of {stops} readings started at the edge',
      paperMoved: 'You moved the paper while it had dots.',
      bothBalls: 'Marble {marble} of {per} · ping-pong {pingpong} of {per}',
    },
  },
}
