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
      stage: { title: 'El escenario', body: 'Aquí ves la mesa con la riel, el DigiCart, la polea en el borde, el contenedor colgando y el piso. Cambia entre 3D y la vista lateral 2D, y elige la cámara en el menú Vista.' },
      inventory: { title: 'El inventario', body: 'Empieza aquí: pon los materiales sobre la mesa y arma la pista (soporte, riel, receptor) y el hilo del DigiCart al contenedor sobre la polea. Algunos elementos de la caja no se usan.' },
      adjust: { title: 'Ajustes y marcas', body: 'Nivela la riel con el nivelador, pega las marcas de 0 y 90 cm, pon el DigiCart en el inicio, elige el largo del hilo y reparte las masas entre el contenedor y el DigiCart.' },
      instruments: { title: 'Instrumentos', body: 'La balanza da la masa total Mt y el dinamómetro, el peso del contenedor: la fuerza F de cada prueba. Después de mover una masa, vuelve a leer F.' },
      timing: { title: 'La barra de cronometraje', body: 'Suelta el DigiCart con S, inicia el cronómetro con Espacio y detenlo al pasar por la marca de 90 cm. R pone en cero y Enter copia el tiempo a la prueba elegida.' },
      table: { title: 'Tabla 3.1', body: 'Una fila por fuerza (4, 3, 2 y 1 masas en el contenedor, y una quinta opcional con el contenedor vacío): la fuerza F y 10 tiempos. Puedes copiar los datos de los instrumentos o escribirlos, y exportarlos en CSV.' },
      log: { title: 'Registro del DigiCart', body: 'La posición del DigiCart durante cada recorrido, medida por su propio sensor, como referencia para comparar con tu cronómetro. Si el contenedor toca el piso lo verás en la curva.' },
      analysis: { title: 'Análisis', body: 'Tiempo medio y aceleración de cada fuerza con sus incertidumbres, la gráfica de F contra a con su recta de ajuste y la comparación de la masa del ajuste con Mt. Las explicaciones las escribes tú.' },
    },
  },
  en: {
    label: 'Lab tour',
    stepOf: 'Step {n} of {total}',
    next: 'Next', back: 'Back', skip: 'Skip', finish: 'Finish',
    steps: {
      stage: { title: 'The stage', body: 'Here you see the bench with the rail, the DigiCart, the pulley at the edge, the hanging canister and the floor. Switch between 3D and the 2D side view, and pick the camera in the View menu.' },
      inventory: { title: 'The inventory', body: 'Start here: put the materials on the table and build the track (stand, rail, receiver) and the string from the DigiCart to the canister over the pulley. Some items in the box are not used.' },
      adjust: { title: 'Settings and marks', body: 'Level the rail with the level, stick the 0 and 90 cm marks, put the DigiCart at the start, choose the string length and share the masses between the canister and the DigiCart.' },
      instruments: { title: 'Instruments', body: 'The balance gives the total mass Mt and the dynamometer the weight of the canister: the force F of each trial. After moving a mass, read F again.' },
      timing: { title: 'The timing bar', body: 'Release the DigiCart with S, start the stopwatch with Space and stop it as it passes the 90 cm mark. R zeroes and Enter copies the time to the chosen trial.' },
      table: { title: 'Table 3.1', body: 'One row per force (4, 3, 2 and 1 masses in the canister, plus an optional fifth with the empty canister): the force F and 10 times. You can copy the data from the instruments or type it, and export it as CSV.' },
      log: { title: 'DigiCart log', body: 'The position of the DigiCart during each run, measured by its own sensor, as a reference to compare with your stopwatch. If the canister hits the floor you will see it in the curve.' },
      analysis: { title: 'Analysis', body: 'Mean time and acceleration for each force with their uncertainties, the F against a graph with its fitted line and the comparison of the fitted mass with Mt. The explanations are yours to write.' },
    },
  },
}
