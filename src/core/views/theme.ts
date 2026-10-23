// Theme toggle shared by the landing page and the experiment shell: auto (system), light, dark. No physics, no state.
import type { Theme } from '../persist.ts'
import { svg } from './dom.ts'

export const THEMES: readonly Theme[] = ['auto', 'light', 'dark']

/** The theme the toggle moves to next. */
export const nextTheme = (t: Theme): Theme => THEMES[(THEMES.indexOf(t) + 1) % THEMES.length]!

/** Apply a theme to the page: auto follows the system (no attribute), light and dark are forced. */
export function applyTheme(theme: Theme): void {
  if (theme === 'auto') document.documentElement.removeAttribute('data-theme')
  else document.documentElement.dataset.theme = theme
}

const THEME_ICON: Record<Theme, Array<[string, Record<string, string>]>> = {
  auto: [['circle', { cx: '12', cy: '12', r: '8' }], ['path', { d: 'M12 4a8 8 0 0 0 0 16z', fill: 'currentColor' }]],
  light: [['circle', { cx: '12', cy: '12', r: '4' }], ['path', { d: 'M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4' }]],
  dark: [['path', { d: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z' }]],
}
export function themeIcon(th: Theme): SVGElement {
  const s = svg('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', class: 'icon' })
  for (const [tag, attrs] of THEME_ICON[th]) s.append(svg(tag as 'path', attrs))
  return s
}
