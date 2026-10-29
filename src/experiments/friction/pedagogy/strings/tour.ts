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
      stage: { title: 'El escenario', body: 'Aquí ves la mesa con el papel, el taco y el dinamómetro, y detrás el riel inclinado con la barra y el soporte. Cambia de vista con el menú de la esquina y entre 3D y 2D con los botones.' },
      inventory: { title: 'El montaje', body: 'Todos los materiales ya están sobre la mesa, sueltos. Arrastra cada uno hasta su sitio resaltado: la hoja, el taco con la cara que elijas hacia abajo, el dinamómetro al gancho, las masas sobre el taco y la barra en la marca del riel. Si no puedes arrastrar, toca la pieza y luego el destino, o abre «Montar con botones». La lista de la guía no menciona la balanza, el soporte con su base ni el cronómetro, que sí necesitas; también están en la mesa.' },
      bench: { title: 'Montaje del taco', body: 'Elige la cara del taco, las masas, el dinamómetro y fija el papel. Pesa el taco y pon a cero el dinamómetro acostado: son los detalles que más desvían las lecturas.' },
      pull: { title: 'Jalar y leer la aguja', body: 'Fija la rapidez de tu mano, empieza a jalar y pulsa «Leer» cuando quieras anotar la aguja. Esa pulsación es tu tiempo de reacción: en el experimento 2 es la diferencia entre la fuerza máxima y una lectura baja.' },
      table: { title: 'Las tablas', body: 'Copia la lectura a la celda activa o escribe los valores. Cada fila muestra su promedio con la incertidumbre. La Tabla 4.2 está en el experimento 2 y la 4.3 en el experimento 3.' },
      incline: { title: 'El riel inclinado', body: 'Marca la distancia de recorrido, pon la barra, gira la manivela hasta que deslice y párala de inmediato. Mide h con la cinta y cronometra el recorrido. sen θ = h / 1,10 m.' },
      record: { title: 'Registro de referencia', body: 'La fuerza verdadera de cada jalón como la registraría un sensor, y la altura y el tiempo verdaderos de cada barra. Sirve para saber cuánto se desvió tu lectura.' },
      analysis: { title: 'Análisis', body: 'Las tareas de la sección 4.4: promedios con incertidumbre, rectas F contra W, μ de la fuerza máxima, θ, a y μ de cada barra, y la comparación con el valor de la literatura que tú busques.' },
    },
  },
  en: {
    label: 'Lab tour',
    stepOf: 'Step {n} of {total}',
    next: 'Next', back: 'Back', skip: 'Skip', finish: 'Finish',
    steps: {
      stage: { title: 'The stage', body: 'Here you see the table with the paper, the block and the spring scale, and behind it the raised rail with the bar and the stand. Change view with the corner menu, and between 3D and 2D with the buttons.' },
      inventory: { title: 'The setup', body: 'All the materials are already on the table, loose. Drag each one to its highlighted spot: the sheet, the block with the face you choose down, the spring scale to the hook, the masses on the block and the bar on the rail\'s mark. If you cannot drag, tap the part and then its spot, or open “Assemble with buttons”. The guide\'s list does not mention the balance, the stand with its base or the stopwatch, which you do need; they are on the table too.' },
      bench: { title: 'Block setup', body: 'Choose the block\'s face, the masses and the spring scale, and fix the paper. Weigh the block and zero the spring scale lying flat: these are the details that shift the readings most.' },
      pull: { title: 'Pull and read the needle', body: 'Set your hand\'s speed, start pulling and press “Read” when you want to note the needle. That press is your reaction time: in experiment 2 it is the difference between the largest force and a low reading.' },
      table: { title: 'The tables', body: 'Copy the reading into the active cell or type the values. Each row shows its mean with the uncertainty. Table 4.2 is in experiment 2 and Table 4.3 in experiment 3.' },
      incline: { title: 'The raised rail', body: 'Mark the travel distance, put the bar, turn the crank until it slides and stop it at once. Measure h with the tape and time the travel. sin θ = h / 1.10 m.' },
      record: { title: 'Reference record', body: 'The true force of each pull as a sensor would log it, and the true height and time of each bar. Use it to see how far your reading was off.' },
      analysis: { title: 'Analysis', body: 'The tasks of section 4.4: means with uncertainty, F against W lines, μ from the largest force, θ, a and μ for each bar, and the comparison with the literature value you look up.' },
    },
  },
}
