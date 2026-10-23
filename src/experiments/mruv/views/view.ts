// Contract every MRUV view follows (the generic one lives in core/views/view.ts, bound here to the MRUV Apparatus).
import type { MountView as CoreMountView, ViewContext as CoreViewContext } from '../../../core/views/view.ts'
import type { Apparatus } from '../apparatus/index.ts'

export type { Strings, View } from '../../../core/views/view.ts'
export type ViewContext = CoreViewContext<Apparatus>
export type MountView = CoreMountView<Apparatus>
