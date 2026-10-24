import type { Strings } from '../../views/view.ts'
import type { TourStrings as CoreTourStrings } from '../../../../core/pedagogy/tour.ts'
import type { TourStepId } from '../tour.ts'

export type TourStrings = CoreTourStrings<TourStepId>

export const strings: Strings<TourStrings> = {
  es: {
    label: 'Recorrido por el laboratorio',
    stepOf: 'Paso {n} de {total}',
    next: 'Siguiente', back: 'Atrás', skip: 'Saltar', finish: 'Terminar',
    steps: {
      stage: { title: 'El escenario', body: 'Aquí ves la mesa, la riel inclinada, la bola y el papel en el piso. Cambia entre 3D y la vista lateral 2D con los botones de la esquina.' },
      inventory: { title: 'El inventario', body: 'Empieza aquí: pon los materiales sobre la mesa y arma la pista con el soporte con cremallera, la base y el soporte de dos patas. Cada unión te dice qué le falta.' },
      adjust: { title: 'Ajustes y marcas', body: 'Sube el extremo alto 20 cm, deja el extremo bajo a unos 5 cm del borde, nivela la riel, pega 5 marcas en la mitad superior y pon el papel bond con el carbón en el piso.' },
      timing: { title: 'La barra de cronometraje', body: 'Suelta la bola con S, inicia el cronómetro con Espacio cuando llegue al borde y deténlo cuando toque el piso. R reinicia y Enter copia el tiempo a la celda activa de la tabla.' },
      table: { title: 'Tabla 2.1', body: 'Aquí van los 5 tiempos y los 5 alcances de cada marca, para la canica y para la pelota de ping-pong. Puedes copiarlos desde los instrumentos o escribirlos, y exportarlos en CSV. Las últimas tres columnas se calculan solas con su incertidumbre.' },
      slowmo: { title: 'Cámara lenta', body: 'Un video a 240 cuadros por segundo de cualquier lanzamiento. Cuenta los cuadros entre la salida del borde y el primer contacto con el piso: es un tiempo de referencia mucho más fino que tu cronómetro.' },
      analysis: { title: 'Análisis', body: 'Las tareas 2 a 9 de la guía: tiempos y alcances promedio con su incertidumbre, rapidez de salida, tiempo esperado con tu altura medida, error porcentual, rapidez final y la comparación entre las dos bolas.' },
    },
  },
  en: {
    label: 'Lab tour',
    stepOf: 'Step {n} of {total}',
    next: 'Next', back: 'Back', skip: 'Skip', finish: 'Finish',
    steps: {
      stage: { title: 'The stage', body: 'Here you see the table, the inclined rail, the ball and the paper on the floor. Switch between 3D and the 2D side view with the buttons in the corner.' },
      inventory: { title: 'The inventory', body: 'Start here: put the materials on the table and build the track with the rack-and-pinion stand, the base and the two-leg stand. Each joint tells you what it still needs.' },
      adjust: { title: 'Settings and marks', body: 'Raise the high end 20 cm, leave the low end about 5 cm from the edge, level the rail, stick 5 marks in the upper half and lay the bond paper with the carbon on the floor.' },
      timing: { title: 'The timing bar', body: 'Release the ball with S, start the stopwatch with Space when it reaches the edge and stop it when it hits the floor. R resets and Enter copies the time to the active cell of the table.' },
      table: { title: 'Table 2.1', body: 'The 5 times and the 5 ranges of each mark go here, for the marble and for the ping-pong ball. You can copy them from the instruments or type them, and export them as CSV. The last three columns fill in by themselves with their uncertainty.' },
      slowmo: { title: 'Slow motion', body: 'A 240 frames-per-second video of any launch. Count the frames between leaving the edge and the first contact with the floor: a reference time much finer than your stopwatch.' },
      analysis: { title: 'Analysis', body: 'Tasks 2 to 9 of the guide: mean times and ranges with their uncertainty, launch speed, the expected time with your measured height, percent error, final speed and the comparison between the two balls.' },
    },
  },
}
