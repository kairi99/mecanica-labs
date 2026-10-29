import type { Strings } from '../../views/view.ts'
import type { ChecklistStrings as CoreChecklistStrings } from '../../../../core/pedagogy/checklistView.ts'
import type { StepId } from '../checklist.ts'

export type ChecklistStrings = CoreChecklistStrings<StepId>

export const strings: Strings<ChecklistStrings> = {
  es: {
    title: 'Procedimiento',
    intro: 'Sigue el montaje y el procedimiento de la guía (3.3.2 y 3.3.3). Es una ayuda: no bloquea nada.',
    progress: '{n} de {total} pasos listos',
    allDone: 'Todos los pasos están listos. Ahora pasa al análisis (sección 3.4).',
    statusOk: 'Listo', statusPending: 'Pendiente', statusNa: 'Aún no',
    why: 'Por qué', show: 'Muéstramelo', showAria: 'Muéstramelo: {step}', next: 'Siguiente',
    tour: 'Ver el recorrido',
    rowChip: 'Prueba {x}: {n} de {total}',
    steps: {
      assembly: { label: 'Montaje completo', why: 'La riel sobre el soporte y el receptor con la polea, el hilo atado al DigiCart con el tornillo de latón, sobre la polea y atado al contenedor. Sin eso, nada jala al DigiCart.' },
      levelled: { label: 'Riel nivelada', why: 'La guía pide la riel completamente horizontal: así el peso del DigiCart no ayuda ni frena, y la fuerza neta viene solo del contenedor.' },
      marks: { label: 'Marcas de inicio y de 90 cm', why: 'Todas las mediciones se hacen entre dos marcas separadas 90 cm: el DigiCart parte de la primera y se cronometra hasta la segunda.' },
      cartStart: { label: 'DigiCart en la marca de inicio', why: 'Cada recorrido debe partir del reposo en el mismo punto. Nunca lo dejes fuera de la riel: rueda con facilidad y puede caer.' },
      stringLength: { label: 'Largo del hilo adecuado', why: 'El hilo debe ser lo bastante largo para que el DigiCart llegue a los 90 cm y lo bastante corto para que el contenedor no toque el piso antes. Si toca el piso, el hilo se afloja y el movimiento deja de ser el que quieres medir.' },
      mt: { label: 'Masa total Mt medida con la balanza', why: 'Mt (DigiCart con el tornillo de latón, contenedor con tapa y las cuatro masas) es lo que compararás con la pendiente del ajuste.' },
      force: { label: 'Fuerza F leída y anotada en cada prueba', why: 'F es el peso del contenedor con sus masas, medido con el dinamómetro. Cambia en cada prueba: vuelve a leerlo después de mover una masa.' },
      timings: { label: '10 tiempos de recorrido por cada fuerza', why: 'Repetir 10 veces permite promediar y estimar la incertidumbre de tus lecturas. Suelta desde el reposo en la marca de inicio y cronometra hasta la marca de 90 cm.' },
      massKept: { label: 'Las masas se pasaron al DigiCart, no se sacaron', why: 'Pasar una masa del contenedor al DigiCart con un tornillo de plástico reduce la fuerza pero mantiene (casi) constante la masa total, que es lo que exige comparar F con a.' },
    },
    detail: {
      missing: 'Faltan {n} cosas por montar (las piezas se arrastran al escenario).',
      needRail: 'Primero fija la riel al soporte y al receptor.',
      distance: 'Distancia entre marcas: {d} cm.',
      hang: 'El contenedor cuelga {x} cm bajo la polea al inicio.',
      lastRun: 'La última suelta no fue limpia: revisa el resultado.',
      stale: 'Cambiaste las masas del contenedor: vuelve a leer F.',
      forces: '{n} de 4 fuerzas anotadas.',
      timings: '{runs} recorridos · {rows} de 4 fuerzas con 10 tiempos',
      bench: '{n} masa(s) fuera del sistema.',
    },
  },
  en: {
    title: 'Procedure',
    intro: 'Follow the guide’s assembly and procedure (3.3.2 and 3.3.3). It is a help: it blocks nothing.',
    progress: '{n} of {total} steps done',
    allDone: 'All steps are done. Now go to the analysis (section 3.4).',
    statusOk: 'Done', statusPending: 'To do', statusNa: 'Not yet',
    why: 'Why', show: 'Show me', showAria: 'Show me: {step}', next: 'Next',
    tour: 'Take the tour',
    rowChip: 'Trial {x}: {n} of {total}',
    steps: {
      assembly: { label: 'Complete assembly', why: 'The rail on the stand and the receiver with the pulley, the string tied to the DigiCart with the brass screw, over the pulley and tied to the canister. Without that nothing pulls the DigiCart.' },
      levelled: { label: 'Rail levelled', why: 'The guide asks for a completely horizontal rail: then the weight of the DigiCart neither helps nor brakes, and the net force comes from the canister alone.' },
      marks: { label: 'Start and 90 cm marks', why: 'Every measurement is made between two marks 90 cm apart: the DigiCart starts at the first one and is timed up to the second.' },
      cartStart: { label: 'DigiCart on the start mark', why: 'Every run must start from rest at the same point. Never leave it off the rail: it rolls easily and can fall.' },
      stringLength: { label: 'Suitable string length', why: 'The string must be long enough for the DigiCart to reach 90 cm and short enough that the canister does not touch the floor first. If it does, the string goes slack and the motion is no longer the one you want to measure.' },
      mt: { label: 'Total mass Mt measured with the balance', why: 'Mt (DigiCart with the brass screw, canister with lid and the four masses) is what you will compare with the slope of the fit.' },
      force: { label: 'Force F read and recorded for each trial', why: 'F is the weight of the canister with its masses, measured with the dynamometer. It changes in each trial: read it again after moving a mass.' },
      timings: { label: '10 run times for each force', why: 'Repeating 10 times lets you average and estimate the uncertainty of your readings. Release from rest on the start mark and time up to the 90 cm mark.' },
      massKept: { label: 'Masses were moved to the DigiCart, not taken out', why: 'Moving a mass from the canister to the DigiCart with a plastic screw lowers the force but keeps the total mass (almost) constant, which is what comparing F with a requires.' },
    },
    detail: {
      missing: '{n} things are still to be set up (drag the parts on the stage).',
      needRail: 'First fix the rail to the stand and the receiver.',
      distance: 'Distance between marks: {d} cm.',
      hang: 'The canister hangs {x} cm below the pulley at the start.',
      lastRun: 'The last release was not clean: check the result.',
      stale: 'You changed the masses in the canister: read F again.',
      forces: '{n} of 4 forces recorded.',
      timings: '{runs} runs · {rows} of 4 forces with 10 times',
      bench: '{n} mass(es) out of the system.',
    },
  },
}
