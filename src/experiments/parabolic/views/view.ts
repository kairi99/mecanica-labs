// Contract every parabolic view follows (the generic one lives in core/views/view.ts, bound here to ParabolicApparatus).
import type { MountView as CoreMountView, ViewContext as CoreViewContext } from '../../../core/views/view.ts'
import type { ParabolicApparatus } from '../apparatus/index.ts'

export type { Strings, View } from '../../../core/views/view.ts'
export type ViewContext = CoreViewContext<ParabolicApparatus>
export type MountView = CoreMountView<ParabolicApparatus>
