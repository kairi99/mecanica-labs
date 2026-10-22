import type { Strings } from '../view.ts'

export interface ProcedureStrings {
  title: string
  intro: string
  statusOk: string
  statusPending: string
  statusNa: string
  items: {
    setup: string
    scale: string
    levelled: string
    angle: string
    heights: string
    marks: string
    cartZero: string
    records: string
  }
  detail: {
    angleUnknown: string
    marksCount: string
    recordsLine: string
    runs: string
  }
  analysisTitle: string
  analysisSoon: string
}

export const strings: Strings<ProcedureStrings> = {
  es: {
    title: 'Lista de verificación',
    intro: 'Un resumen del avance de la práctica. Es una ayuda: no bloquea nada.',
    statusOk: 'Listo', statusPending: 'Pendiente', statusNa: 'Aún no aplica',
    items: {
      setup: 'Montaje completo (riel, soportes, receptor y tornillos)',
      scale: 'La escala 0 de la riel queda arriba',
      levelled: 'Riel nivelada antes de subir el soporte',
      angle: 'Inclinación de 1,30° dentro de la tolerancia',
      heights: 'Alturas medidas con el calibrador (soporte alto y bajo)',
      marks: 'Marcas cada 10 cm desde A, hasta 90 cm',
      cartZero: 'DigiCart en la marca de 0 cm',
      records: 'Tiempos registrados por posición',
    },
    detail: {
      angleUnknown: 'Primero fija la riel a los dos soportes.',
      marksCount: '{n} marcas puestas',
      recordsLine: '{n} de 10 posiciones con al menos un tiempo; {t} de 100 casillas llenas',
      runs: '{n} corridas, {s} paradas del cronómetro',
    },
    analysisTitle: 'Análisis',
    analysisSoon: 'Aquí irán las tareas de análisis de la guía (tiempo medio con incertidumbre, velocidades, gráfica x(t) y conclusión sobre el MRUV).',
  },
  en: {
    title: 'Checklist',
    intro: 'A summary of your progress. It is an aid: it blocks nothing.',
    statusOk: 'Done', statusPending: 'Pending', statusNa: 'Not applicable yet',
    items: {
      setup: 'Setup complete (rail, stands, receiver and screws)',
      scale: 'The rail scale 0 is at the top',
      levelled: 'Rail levelled before raising the stand',
      angle: '1.30° incline within tolerance',
      heights: 'Heights measured with the caliper (high and low stand)',
      marks: 'Marks every 10 cm from A, up to 90 cm',
      cartZero: 'DigiCart on the 0 cm mark',
      records: 'Times recorded per position',
    },
    detail: {
      angleUnknown: 'First fasten the rail to both stands.',
      marksCount: '{n} marks in place',
      recordsLine: '{n} of 10 positions with at least one time; {t} of 100 cells filled',
      runs: '{n} runs, {s} stopwatch stops',
    },
    analysisTitle: 'Analysis',
    analysisSoon: "The guide's analysis tasks will go here (mean time with uncertainty, velocities, x(t) plot and the MRUV conclusion).",
  },
}
