import type { Strings } from '../../views/view.ts'
import type { TourStepId } from '../tour.ts'

export interface TourStrings {
  label: string
  stepOf: string
  next: string
  back: string
  skip: string
  finish: string
  steps: Record<TourStepId, { title: string; body: string }>
}

export const strings: Strings<TourStrings> = {
  es: {
    label: 'Recorrido por el laboratorio',
    stepOf: 'Paso {n} de {total}',
    next: 'Siguiente', back: 'Atrás', skip: 'Saltar', finish: 'Terminar',
    steps: {
      stage: { title: 'El escenario', body: 'Aquí ves la mesa, la riel y el DigiCart en 3D. Arrastra para girar, pellizca o usa la rueda para acercar, y toca una pieza para ver su ficha. Si tu dispositivo no tiene 3D, verás la vista lateral 2D.' },
      inventory: { title: 'El inventario', body: 'Empieza aquí: pon los materiales sobre la mesa y arma la pista, como en el montaje de la guía. Cada unión te dice qué le falta.' },
      adjust: { title: 'Ajustes', body: 'Nivela la riel con el nivelador, sube el soporte con cremallera y pega las marcas cada 10 cm. El DigiCart arranca sobre la marca de 0 cm.' },
      caliper: { title: 'El calibrador', body: 'Mide la altura de cada soporte para comprobar tu inclinación de 1,30°: la diferencia de alturas debe cumplir Δh = d · sen θ. Puedes usar el pie de rey analógico (nonio) o el digital.' },
      stopwatch: { title: 'Cronómetro y soltado', body: 'Suelta el carro y mide el tiempo con tus propias pulsaciones: la barra espaciadora inicia y detiene. El instante exacto de tu pulsación cuenta, así que la lectura incluye tu tiempo de reacción; por eso se repite 10 veces.' },
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
      stage: { title: 'The stage', body: 'Here you see the table, the rail and the DigiCart in 3D. Drag to orbit, pinch or use the wheel to zoom, and tap a part to see its card. If your device has no 3D you get the 2D side view.' },
      inventory: { title: 'The inventory', body: "Start here: put the materials on the table and build the track, as in the guide's assembly. Each joint tells you what it still needs." },
      adjust: { title: 'Adjustments', body: 'Level the rail with the level, raise the rack-and-pinion stand and stick the marks every 10 cm. The DigiCart starts on the 0 cm mark.' },
      caliper: { title: 'The caliper', body: 'Measure the height at each stand to check your 1.30° incline: the height difference must satisfy Δh = d · sin θ. You can use the analog vernier or the digital caliper.' },
      stopwatch: { title: 'Stopwatch and release', body: 'Release the cart and time it with your own presses: the space bar starts and stops. The exact moment of your press counts, so the reading includes your reaction time; that is why it is repeated 10 times.' },
      table: { title: 'Table 1.1', body: 'The 10 times for each mark, from 10 to 90 cm, go here. Copy the stopwatch reading or type it. You can export it as CSV.' },
      tablet: { title: 'The DigiCart tablet', body: "The DigiCart keeps its own record of position. Use it to compare your hand-timed measurements with what the cart logged." },
      analysis: { title: 'Analysis', body: "With the table filled, this computes the tasks of section 1.4: mean times with uncertainty, velocities, the x(t) plot and more. It updates by itself as you fill the table." },
    },
  },
}
