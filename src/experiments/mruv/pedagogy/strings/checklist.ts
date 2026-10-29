import type { Strings } from '../../views/view.ts'
import type { ChecklistStrings as CoreChecklistStrings } from '../../../../core/pedagogy/checklistView.ts'
import type { StepId } from '../checklist.ts'

export type ChecklistStrings = CoreChecklistStrings<StepId>

export const strings: Strings<ChecklistStrings> = {
  es: {
    title: 'Procedimiento',
    intro: 'Sigue el montaje y el procedimiento de la guía (1.3.2 y 1.3.3). Es una ayuda: no bloquea nada.',
    progress: '{n} de {total} pasos listos',
    allDone: 'Todos los pasos están listos. Ahora ve al análisis (sección 1.4).',
    statusOk: 'Listo', statusPending: 'Pendiente', statusNa: 'Aún no',
    why: 'Por qué', show: 'Muéstramelo', showAria: 'Muéstramelo: {step}', next: 'Siguiente',
    tour: 'Ver el recorrido',
    rowChip: '{x} cm: {n} de {total}',
    steps: {
      standBase: { label: 'Soporte con cremallera sobre su base', why: 'La base metálica le da estabilidad al soporte alto; un soporte que se mueve cambia la inclinación entre una medida y otra.' },
      railClamped: { label: 'Riel sujeta al soporte con cremallera', why: 'El extremo de la riel en la pinza es el punto más alto. De ahí sale el DigiCart y ahí se sube o baja la altura h.' },
      scale: { label: 'Escala de la riel con el 0 en el extremo alto', why: 'La guía mide las distancias desde el punto más alto (A, marca 0 cm). Si la escala impresa está al revés, las lecturas de posición quedan invertidas.' },
      lowEnd: { label: 'Soporte de dos patas y receptor en el extremo bajo', why: 'El soporte de dos patas apoya el extremo bajo y el receptor con polea detiene al carro al final, para que no caiga.' },
      screws: { label: 'Tornillos puestos en las tres uniones', why: 'Cada unión de la riel lleva dos tornillos; con los seis la pista no se mueve mientras mides.' },
      levelled: { label: 'Riel nivelada antes de subir el soporte', why: 'Con el nivelador puesto sobre la riel y la cremallera en cero, ajusta el pie del soporte de dos patas hasta centrar la burbuja. Así quitas la inclinación propia de la mesa antes de crear la tuya.' },
      angle: { label: 'Inclinación de 1,30° dentro de la tolerancia', why: 'La guía pide 1,30°. Sube el extremo alto una altura h: la diferencia de alturas entre los dos soportes, medida con el flexómetro, debe cumplir Δh = d · sen θ, con d la distancia entre soportes. Si la mesa no está nivelada, la diferencia de alturas de la riel ya nivelada no es cero: cuenta el cambio desde ese estado.' },
      marks: { label: 'Marcas cada 10 cm, con el 0 cm en A y AB de al menos 90 cm', why: 'Cada posición de la Tabla 1.1 necesita su marca. Las distancias se cuentan desde A, el punto más alto, y el recorrido AB debe llegar a 90 cm.' },
      cartZero: { label: 'Frente del DigiCart en la marca de 0 cm', why: 'El frente del carro es la referencia de la distancia recorrida. Si sale de otro punto, todas las distancias quedan desplazadas.' },
      measure: { label: 'Medir 10 veces el tiempo hasta cada marca (10 a 90 cm)', why: 'Repetir diez veces permite estimar la dispersión de tus reacciones (incertidumbre tipo A). Suelta el carro desde el reposo, cronometra hasta la marca elegida y pasa la lectura a la Tabla 1.1.' },
    },
    detail: {
      count: '{n} de {total}',
      reversed: 'Está al revés: el 0 impreso quedó abajo. Cambia el extremo de la riel en la pinza.',
      formula: 'Tu ruta: mide la altura en cada soporte con el flexómetro, calcula Δh = d · sen 1,30° y compara.',
      measured: 'Tu Δh medido: {dh_mm} mm. Calcula d · sen 1,30° con tu d y compara.',
      teacher: 'Docente: Δh objetivo ≈ {target_mm} mm (d = 1,10 m); ángulo actual {now_deg}°.',
      marks: '{n} marcas puestas; AB ≈ {ab} cm',
      progress: '{rows} de {totalRows} marcas completas · {n} de {total} lecturas',
    },
  },
  en: {
    title: 'Procedure',
    intro: "Follow the guide's assembly and procedure (1.3.2 and 1.3.3). It is an aid: it blocks nothing.",
    progress: '{n} of {total} steps done',
    allDone: 'Every step is done. Now go to the analysis (section 1.4).',
    statusOk: 'Done', statusPending: 'Pending', statusNa: 'Not yet',
    why: 'Why', show: 'Show me', showAria: 'Show me: {step}', next: 'Next',
    tour: 'Replay the tour',
    rowChip: '{x} cm: {n} of {total}',
    steps: {
      standBase: { label: 'Rack-and-pinion stand on its base', why: "The metal base steadies the tall stand; a stand that shifts changes the incline between one measurement and the next." },
      railClamped: { label: 'Rail clamped in the rack-and-pinion stand', why: 'The rail end in the clamp is the highest point. The DigiCart starts there, and that is where you raise or lower the height h.' },
      scale: { label: 'Rail scale with 0 at the high end', why: 'The guide measures distances from the highest point (A, the 0 cm mark). If the printed scale is reversed, the position readings are reversed.' },
      lowEnd: { label: 'Two-leg stand and receiver at the low end', why: 'The two-leg stand holds the low end and the receiver with its pulley stops the cart at the bottom so it cannot fall.' },
      screws: { label: 'Screws fitted in the three joints', why: 'Each rail joint takes two screws; with all six the track stays put while you measure.' },
      levelled: { label: 'Rail levelled before raising the stand', why: 'With the level on the rail and the rack at zero, adjust the foot of the two-leg stand until the bubble is centred. This removes the bench\'s own tilt before you create yours.' },
      angle: { label: '1.30° incline within tolerance', why: 'The guide asks for 1.30°. Raise the high end by a height h: the height difference between the two stands, measured with the tape measure, must satisfy Δh = d · sin θ, with d the distance between the stands. If the bench is not level, the height difference of the levelled rail is not zero: count the change from that state.' },
      marks: { label: 'Marks every 10 cm, 0 cm at A and AB at least 90 cm', why: 'Each position of Table 1.1 needs its mark. Distances are counted from A, the highest point, and the path AB must reach 90 cm.' },
      cartZero: { label: 'DigiCart front on the 0 cm mark', why: 'The front of the cart is the reference for distance travelled. Starting from another point shifts every distance.' },
      measure: { label: 'Time the run to each mark 10 times (10 to 90 cm)', why: 'Ten repetitions let you estimate the scatter of your reactions (Type A uncertainty). Release the cart from rest, time it to the chosen mark and copy the reading into Table 1.1.' },
    },
    detail: {
      count: '{n} of {total}',
      reversed: 'It is reversed: the printed 0 is at the bottom. Change the rail end in the clamp.',
      formula: 'Your route: measure the height at each stand with the tape measure, compute Δh = d · sin 1.30° and compare.',
      measured: 'Your measured Δh: {dh_mm} mm. Compute d · sin 1.30° with your d and compare.',
      teacher: 'Teacher: target Δh ≈ {target_mm} mm (d = 1.10 m); current angle {now_deg}°.',
      marks: '{n} marks in place; AB ≈ {ab} cm',
      progress: '{rows} of {totalRows} marks complete · {n} of {total} readings',
    },
  },
}
