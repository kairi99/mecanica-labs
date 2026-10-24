// Parabolic tour: which regions it walks through and where to find them (steps that are switched off with ?reference=0 / ?analysis=0
// have no target on screen and are skipped). The mechanism, including going back to the step the student was on, is in core/pedagogy/tour.ts.
import type { ViewContext } from '../views/view.ts'
import { mountTour as mountCoreTour, type Tour, type TourDef, type TourFlag, type TourHooks as CoreTourHooks } from '../../../core/pedagogy/tour.ts'
import { experimentKey } from '../../../core/persist.ts'
import { strings } from './strings/tour.ts'

export const TOUR_KEY = experimentKey('parabolic', 'tour-done')
export const TOUR_STEP_IDS = ['stage', 'inventory', 'adjust', 'timing', 'table', 'slowmo', 'analysis'] as const
export type TourStepId = (typeof TOUR_STEP_IDS)[number]
export const TOUR_SELECTORS: Record<TourStepId, string> = {
  stage: '[data-region="stage"]',
  inventory: '[data-panel="inventory"]',
  adjust: '[data-panel="adjust"]',
  timing: '[data-timing-bar]',
  table: '[data-panel="table"]',
  slowmo: '[data-region="slowmo"]',
  analysis: '[data-region="analysis"]',
}

export type { Tour, TourFlag }
export type TourHooks = CoreTourHooks<TourStepId>

export const TOUR_DEF: TourDef<TourStepId> = { ids: TOUR_STEP_IDS, selectors: TOUR_SELECTORS, storageKey: TOUR_KEY, strings }

export function mountTour(ctx: ViewContext, hooks?: TourHooks): Tour { return mountCoreTour(ctx, TOUR_DEF, hooks) }
