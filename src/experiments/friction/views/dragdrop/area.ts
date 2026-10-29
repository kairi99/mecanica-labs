// Which half of the bench the current lab step uses. The drop zones are offered only for it. main.ts supplies the source (the shell's
// current step); the drag controllers read it when they build the zones, so a step change needs no notification.
import type { Area } from './snap.ts'

let source: () => Area = () => 'all'
export const getDragArea = (): Area => source()
export const setDragAreaSource = (fn: () => Area): void => { source = fn }
