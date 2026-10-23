// Contract every view follows. A view renders the apparatus state; it never computes physics.
import type { Lang } from '../i18n.ts'

/** Each view keeps its strings in its own `{ es, en }` pair with identical keys. */
export type Strings<T> = { es: T; en: T }

/** What the shell hands to every view. `A` is the experiment's apparatus. */
export interface ViewContext<A> {
  apparatus: A
  lang: () => Lang
  /** True when the user asked for reduced motion (prefers-reduced-motion). */
  reducedMotion: () => boolean
  /** Same clock as event.timeStamp (performance.now()), in ms. Views pass it to time-dependent apparatus calls. */
  now: () => number
  /** Tell the shell that apparatus state changed (re-render other views, persist, checklist). */
  changed: () => void
}

export interface View {
  /** Called once per animation frame; must not cause layout thrash. */
  update(): void
  /** Rebuild every label after a language change. */
  relabel(): void
  /** Optional: highlight the parts or controls a procedure step needs. Nothing is disabled. */
  focus?(targets: string[] | null): void
  destroy(): void
}

export type MountView<A> = (root: HTMLElement, ctx: ViewContext<A>) => View
