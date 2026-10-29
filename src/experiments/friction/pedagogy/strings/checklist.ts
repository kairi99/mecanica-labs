import type { Strings } from '../../views/view.ts'
import type { ChecklistStrings as CoreChecklistStrings } from '../../../../core/pedagogy/checklistView.ts'
import type { StepId } from '../checklist.ts'

export type ChecklistStrings = CoreChecklistStrings<StepId>

export const strings: Strings<ChecklistStrings> = {
  es: {
    title: 'Procedimiento',
    intro: 'Sigue el montaje y el procedimiento de la guía (4.3.2 y 4.3.3). Es una ayuda: no bloquea nada.',
    progress: '{n} de {total} pasos listos',
    allDone: 'Todos los pasos están listos. Ahora pasa al análisis (sección 4.4).',
    statusOk: 'Listo', statusPending: 'Pendiente', statusNa: 'Aún no',
    why: 'Por qué', show: 'Muéstramelo', showAria: 'Muéstramelo: {step}', next: 'Siguiente',
    tour: 'Ver el recorrido',
    rowChip: '{x}: {n} de {total}',
    steps: {
      mass: { label: 'Medir la masa M del taco', why: 'La fuerza de rozamiento es μ por la fuerza normal, que depende de M. Sin M no puedes obtener μ de la fuerza ni calcular los pesos de la recta.' },
      paper: { label: 'Fijar la hoja de papel a la mesa', why: 'Si el papel se desliza con el taco, el dinamómetro mide el rozamiento del papel con la mesa y no el de la superficie que quieres estudiar: las lecturas salen bajas y erráticas.' },
      zero: { label: 'Poner a cero el dinamómetro acostado', why: 'El cero de fábrica se ajusta con el dinamómetro colgando; acostado la aguja marca un poco de menos y todas tus fuerzas salen corridas por el mismo valor.' },
      exp1: { label: 'Experimento 1: Tabla 4.1', why: 'Con rapidez constante la fuerza aplicada iguala al rozamiento cinético. Cinco lecturas por cara y por masa (0, 50, 100 y 150 g) dan la recta de F contra el peso.' },
      exp2: { label: 'Experimento 2: Tabla 4.2', why: 'El rozamiento estático crece hasta un máximo antes de que el taco se mueva. Lee la aguja en el instante de mayor fuerza: después baja y la lectura sale baja.' },
      course: { label: 'Medir y marcar el recorrido de 100 cm', why: 'La aceleración sale de a = 2d/t². Si la distancia marcada no es la que usas en el cálculo, el error pasa directo al coeficiente.' },
      exp3: { label: 'Experimento 3: Tabla 4.3', why: 'Para cada barra anota la altura h donde empieza a deslizar sin detenerse y el tiempo de recorrido; con θ y a se calcula μ. Detén la manivela en cuanto la barra se mueva.' },
    },
    detail: {
      paperLoose: 'El papel está suelto.',
      fill41: '{n} de {total} lecturas',
      fill42: '{n} de {total} lecturas',
      fill43: '{n} de {total} intentos completos',
    },
  },
  en: {
    title: 'Procedure',
    intro: 'Follow the assembly and the procedure of the guide (4.3.2 and 4.3.3). It is a help: nothing is blocked.',
    progress: '{n} of {total} steps done',
    allDone: 'All steps are done. Now go to the analysis (section 4.4).',
    statusOk: 'Done', statusPending: 'To do', statusNa: 'Not yet',
    why: 'Why', show: 'Show me', showAria: 'Show me: {step}', next: 'Next',
    tour: 'Take the tour',
    rowChip: '{x}: {n} of {total}',
    steps: {
      mass: { label: 'Measure the block\'s mass M', why: 'Friction is μ times the normal force, which depends on M. Without M you cannot get μ from the force or compute the weights of the line.' },
      paper: { label: 'Fix the sheet of paper to the table', why: 'If the paper slides with the block, the spring scale measures the friction of the paper on the table, not that of the surface you want to study: readings come out low and erratic.' },
      zero: { label: 'Zero the spring scale lying flat', why: 'The factory zero is set with the scale hanging; lying flat the needle reads a little low and all your forces are shifted by the same amount.' },
      exp1: { label: 'Experiment 1: Table 4.1', why: 'At constant speed the applied force equals kinetic friction. Five readings per face and per mass (0, 50, 100 and 150 g) give the line of F against weight.' },
      exp2: { label: 'Experiment 2: Table 4.2', why: 'Static friction grows up to a maximum before the block moves. Read the needle at the instant of the largest force: afterwards it drops and the reading comes out low.' },
      course: { label: 'Measure and mark the 100 cm travel', why: 'The acceleration comes from a = 2d/t². If the distance you mark is not the one you use in the calculation, the error goes straight into the coefficient.' },
      exp3: { label: 'Experiment 3: Table 4.3', why: 'For each bar note the height h at which it starts sliding without stopping and the travel time; with θ and a you compute μ. Stop the crank as soon as the bar moves.' },
    },
    detail: {
      paperLoose: 'The paper is loose.',
      fill41: '{n} of {total} readings',
      fill42: '{n} of {total} readings',
      fill43: '{n} of {total} complete tries',
    },
  },
}
