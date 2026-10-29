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
      steps: { title: 'Los cinco pasos', body: 'El laboratorio va por pasos: montaje, ajustes y altura, cronometraje con la Tabla 1.1, la tableta del DigiCart y el análisis. Los pasos que ya hiciste llevan una marca; puedes saltar a cualquiera.' },
      stage: { title: 'El escenario', body: 'Aquí ves la mesa, la riel y el DigiCart en 3D. Arrastra para girar, pellizca o usa la rueda para acercar, y toca una pieza para ver su ficha. Si tu dispositivo no tiene 3D, verás la vista lateral 2D.' },
      inventory: { title: 'El montaje', body: 'Todas las piezas ya están sobre la mesa, sueltas. Arrastra cada una hasta su sitio resaltado y arma la pista, como en el montaje de la guía: el soporte sobre su base, la riel en la pinza, el extremo bajo. Si no puedes arrastrar, toca la pieza y luego el destino, o abre «Montar con botones». Si falta algo, la mesa te dice qué.' },
      adjust: { title: 'Ajustes', body: 'Nivela la riel con el nivelador, sube el soporte con cremallera y pega las marcas cada 10 cm. El DigiCart arranca sobre la marca de 0 cm.' },
      tape: { title: 'El flexómetro', body: 'Mide la altura de cada soporte y la distancia d entre ellos para comprobar tu inclinación de 1,30°: la diferencia de alturas debe cumplir Δh = d · sen θ. Lees la cinta tú mismo, en milímetros.' },
      stopwatch: { title: 'La barra de cronometraje', body: 'Suelta el DigiCart (tecla S) y mide el tiempo con tus propias pulsaciones: la barra espaciadora inicia y detiene, R reinicia y Enter copia la lectura a la tabla. El instante exacto de tu pulsación cuenta, así que la lectura incluye tu tiempo de reacción; por eso se repite 10 veces.' },
      table: { title: 'Tabla 1.1', body: 'Aquí van los 10 tiempos de cada marca, de 10 a 90 cm. Copia la lectura del cronómetro o escríbela. Puedes exportarla en CSV.' },
      tablet: { title: 'La tableta del DigiCart', body: 'El DigiCart guarda su propio registro de la posición. Úsalo para contrastar tus mediciones manuales con lo que registró el carro.' },
      analysis: { title: 'Análisis', body: 'Con la tabla llena, aquí se calculan las tareas de la sección 1.4: tiempos medios con incertidumbre, velocidades, la gráfica x(t) y más. Se actualiza solo a medida que llenas la tabla.' },
    },
  },
  en: {
    label: 'Lab tour',
    stepOf: 'Step {n} of {total}',
    next: 'Next', back: 'Back', skip: 'Skip', finish: 'Finish',
    steps: {
      steps: { title: 'The five steps', body: 'The lab goes in steps: setup, adjustments and height, timing with Table 1.1, the DigiCart tablet and the analysis. Steps you have finished get a check; you can jump to any of them.' },
      stage: { title: 'The stage', body: 'Here you see the table, the rail and the DigiCart in 3D. Drag to orbit, pinch or use the wheel to zoom, and tap a part to see its card. If your device has no 3D you get the 2D side view.' },
      inventory: { title: 'The assembly', body: "All the parts are already on the table, loose. Drag each one to its highlighted spot and build the track, as in the guide's assembly: the stand on its base, the rail in the clamp, the low end. If you cannot drag, tap the part and then the spot, or open “Assemble with buttons”. If something is missing, the table tells you what." },
      adjust: { title: 'Adjustments', body: 'Level the rail with the level, raise the rack-and-pinion stand and stick the marks every 10 cm. The DigiCart starts on the 0 cm mark.' },
      tape: { title: 'The tape measure', body: 'Measure the height at each stand and the distance d between them to check your 1.30° incline: the height difference must satisfy Δh = d · sin θ. You read the tape yourself, in millimetres.' },
      stopwatch: { title: 'The timing bar', body: 'Release the DigiCart (key S) and time it with your own presses: the space bar starts and stops, R resets and Enter copies the reading to the table. The exact moment of your press counts, so the reading includes your reaction time; that is why it is repeated 10 times.' },
      table: { title: 'Table 1.1', body: 'The 10 times for each mark, from 10 to 90 cm, go here. Copy the stopwatch reading or type it. You can export it as CSV.' },
      tablet: { title: 'The DigiCart tablet', body: "The DigiCart keeps its own record of position. Use it to compare your hand-timed measurements with what the cart logged." },
      analysis: { title: 'Analysis', body: "With the table filled, this computes the tasks of section 1.4: mean times with uncertainty, velocities, the x(t) plot and more. It updates by itself as you fill the table." },
    },
  },
}
