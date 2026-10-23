// URL options shared by every experiment page: ?lang is read by loadLang(); ?theme ?step ?tour ?view ?teacher are here.
import type { ShellParams } from './types.ts'

export function readShellParams(search: string = globalThis.location?.search ?? ''): ShellParams {
  const q = new URLSearchParams(search)
  const step = Number(q.get('step'))
  const theme = q.get('theme')
  const tour = q.get('tour')
  const view = q.get('view')
  return {
    step: Number.isInteger(step) && step >= 1 ? step : null,
    theme: theme === 'light' || theme === 'dark' ? theme : null,
    tour: tour === '0' || tour === '1' ? tour : null,
    view: view === '2d' || view === '3d' ? view : null,
    teacher: q.has('teacher') && q.get('teacher') !== '0',
  }
}
