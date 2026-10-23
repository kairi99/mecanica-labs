// MRUV tour: which regions it walks through and where to find them. The mechanism is in core/pedagogy/tour.ts.
import type { ViewContext } from '../views/view.ts'
import { mountTour as mountCoreTour, type Tour, type TourDef, type TourFlag, type TourHooks as CoreTourHooks } from '../../../core/pedagogy/tour.ts'
import { experimentKey } from '../../../core/persist.ts'
import { strings } from './strings/tour.ts'

export const TOUR_KEY = experimentKey('mruv', 'tour-done')
export const TOUR_STEP_IDS = ['steps', 'stage', 'inventory', 'adjust', 'tape', 'stopwatch', 'table', 'tablet', 'analysis'] as const
export type TourStepId = (typeof TOUR_STEP_IDS)[number]
/** A comma list: the first match that is on screen wins (the step tracker on wide screens, the step menu button on phones). */
export const TOUR_SELECTORS: Record<TourStepId, string> = {
  steps: '[data-region="steps"], [data-region="steps-menu"]',
  stage: '[data-region="stage"]',
  inventory: '[data-panel="inventory"]',
  adjust: '[data-panel="adjust"]',
  tape: '[data-panel="tape"]',
  stopwatch: '[data-timing-bar]',
  table: '[data-panel="table"]',
  tablet: '[data-panel="tablet"]',
  analysis: '[data-region="analysis"]',
}

export type { Tour, TourFlag }
export type TourHooks = CoreTourHooks<TourStepId>

export const TOUR_DEF: TourDef<TourStepId> = { ids: TOUR_STEP_IDS, selectors: TOUR_SELECTORS, storageKey: TOUR_KEY, strings }

export function mountTour(ctx: ViewContext, hooks?: TourHooks): Tour { return mountCoreTour(ctx, TOUR_DEF, hooks) }
