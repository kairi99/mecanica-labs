// Texts of the task checklist and the theory card shared by every analysis panel.
import type { Strings } from './view.ts'

export interface TaskPanelStrings {
  title: string
  hint: string
  /** Visible label of each task's checkbox. */
  done: string
  /** Accessible name of a checkbox: {task} is the task text. */
  doneAria: string
  progress: string
  needData: string
  lockedTitle: string
  lockedBody: string
  unlockedTitle: string
  unlockedBody: string
  openTheory: string
  announce: string
  teacherOpen: string
}

export const strings: Strings<TaskPanelStrings> = {
  es: {
    title: 'Tareas de la guía',
    hint: 'Marca cada tarea cuando la hayas hecho, también las que haces en papel. Las que usan números de la tabla cuentan solo si hay datos.',
    done: 'Hecha',
    doneAria: 'Hecha: {task}',
    progress: '{k} / {n} tareas completas',
    needData: 'Faltan datos en la tabla para dar esta tarea por completa.',
    lockedTitle: 'Teoría bloqueada',
    lockedBody: 'La teoría y las fuentes de error de la ayuda se desbloquean al completar todas las tareas.',
    unlockedTitle: 'Teoría desbloqueada',
    unlockedBody: 'Ya puedes leer la teoría y las fuentes de error en la ayuda.',
    openTheory: 'Abrir la teoría en la ayuda',
    announce: 'Teoría desbloqueada: completaste todas las tareas. La encuentras en la ayuda.',
    teacherOpen: 'Modo docente (?theory=1): la teoría está abierta sin guardar nada.',
  },
  en: {
    title: 'Guide tasks',
    hint: 'Tick each task when you have done it, including the ones you do on paper. Tasks that use numbers from the table only count when the data exist.',
    done: 'Done',
    doneAria: 'Done: {task}',
    progress: '{k} / {n} tasks complete',
    needData: 'The table lacks the data needed to count this task as complete.',
    lockedTitle: 'Theory locked',
    lockedBody: 'The theory and the error sources in the help unlock when every task is complete.',
    unlockedTitle: 'Theory unlocked',
    unlockedBody: 'You can now read the theory and the error sources in the help.',
    openTheory: 'Open the theory in the help',
    announce: 'Theory unlocked: you completed every task. You will find it in the help.',
    teacherOpen: 'Teacher mode (?theory=1): the theory is open, nothing is saved.',
  },
}
