// Accessibility regression guards (WCAG 2.0 AA): accessible names exist in both languages, every page has lang, a title,
// a skip link and a main landmark, and the help pages carry the accessibility statement with the issues link.
import { describe, expect, it } from 'vitest'
import { strings as core } from '../../src/core/shell/strings.ts'
import { strings as landing } from '../../src/landing/strings.ts'
import { strings as mruvShell } from '../../src/experiments/mruv/views/strings/shell.ts'
import { strings as parShell } from '../../src/experiments/parabolic/views/strings/shell.ts'
import { strings as mruvSide } from '../../src/experiments/mruv/views/strings/side2d.ts'
import { strings as parSide } from '../../src/experiments/parabolic/views/strings/side2d.ts'
import { strings as mruvTablet } from '../../src/experiments/mruv/views/strings/tablet.ts'
import { strings as parSlowmo } from '../../src/experiments/parabolic/views/strings/slowmo.ts'
import { strings as mruvAn } from '../../src/experiments/mruv/views/strings/analysis.ts'
import { strings as parAn } from '../../src/experiments/parabolic/views/strings/analysis.ts'
import { strings as mruvScene } from '../../src/experiments/mruv/views/strings/scene3d.ts'
import { strings as parScene } from '../../src/experiments/parabolic/views/strings/scene3d.ts'
import { strings as mruvCoach } from '../../src/experiments/mruv/pedagogy/strings/coach.ts'
import { strings as parCoach } from '../../src/experiments/parabolic/pedagogy/strings/coach.ts'
import { strings as frShell } from '../../src/experiments/friction/views/strings/shell.ts'
import { strings as frSide } from '../../src/experiments/friction/views/strings/side2d.ts'
import { strings as frScene } from '../../src/experiments/friction/views/strings/scene3d.ts'
import { strings as frCoach } from '../../src/experiments/friction/pedagogy/strings/coach.ts'
import { strings as frAn } from '../../src/experiments/friction/views/strings/analysis.ts'

type Bundle = { es: Record<string, unknown>; en: Record<string, unknown> }

/** [bundle, accessible-name keys that must be non-empty text in es and en] */
const NAMES: Array<[string, Bundle, string[]]> = [
  ['core shell', core as unknown as Bundle, ['skipToMain', 'dismiss', 'experiments']],
  ['landing', landing as unknown as Bundle, ['skipToMain', 'regionMain', 'langSwitch', 'theme', 'openAria']],
  ['mruv shell', mruvShell as unknown as Bundle, ['regionMain', 'regionStage', 'panelRegion', 'stepsNav', 'stepsMenu', 'langSwitch', 'theme', 'help', 'more', 'viewMode', 'sheetToggle']],
  ['parabolic shell', parShell as unknown as Bundle, ['regionMain', 'regionStage', 'panelRegion', 'stepsNav', 'stepsMenu', 'langSwitch', 'theme', 'help', 'more', 'viewMode', 'sheetToggle']],
  ['friction shell', frShell as unknown as Bundle, ['regionMain', 'regionStage', 'panelRegion', 'stepsNav', 'stepsMenu', 'langSwitch', 'theme', 'help', 'more', 'viewMode', 'sheetToggle']],
  ['friction side view', frSide as unknown as Bundle, ['aria']],
  ['friction 3d canvas', frScene as unknown as Bundle, ['canvasLabel']],
  ['friction coach', frCoach as unknown as Bundle, ['dismiss']],
  ['friction analysis plot', frAn as unknown as Bundle, ['plotAria']],
  ['mruv side view', mruvSide as unknown as Bundle, ['aria']],
  ['parabolic side view', parSide as unknown as Bundle, ['aria']],
  ['mruv tablet plot', mruvTablet as unknown as Bundle, ['plotAria']],
  ['parabolic slow motion', parSlowmo as unknown as Bundle, ['canvasAria']],
  ['mruv analysis charts', mruvAn as unknown as Bundle, ['xtAria', 'vtAria', 'resAria']],
  ['parabolic analysis charts', parAn as unknown as Bundle, ['t3Plot']],
  ['mruv 3d canvas', mruvScene as unknown as Bundle, ['canvasLabel']],
  ['parabolic 3d canvas', parScene as unknown as Bundle, ['canvasLabel']],
  ['mruv coach', mruvCoach as unknown as Bundle, ['dismiss']],
  ['parabolic coach', parCoach as unknown as Bundle, ['dismiss']],
]

describe('accessible names exist in es and en', () => {
  for (const [name, b, keys] of NAMES) {
    it(name, () => {
      for (const lang of ['es', 'en'] as const) for (const k of keys) {
        const v = b[lang][k]
        expect(typeof v === 'string' && v.trim().length > 0, `${name} ${lang}.${k}`).toBe(true)
      }
    })
  }
})

const raw = import.meta.glob(['../../index.html', '../../mruv/**/*.html', '../../parabolico/**/*.html', '../../rozamiento/**/*.html'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const PAGES = ['index.html', 'mruv/index.html', 'parabolico/index.html', 'mruv/help/index.html', 'mruv/help/en.html', 'parabolico/help/index.html', 'parabolico/help/en.html', 'rozamiento/index.html', 'rozamiento/help/index.html', 'rozamiento/help/en.html']

describe('every html page', () => {
  for (const p of PAGES) {
    const html = raw[`../../${p}`]!
    it(`${p} has lang and a title`, () => {
      expect(html).toMatch(/<html lang="(es|en)"/)
      expect(html).toMatch(/<title>[^<]+<\/title>/)
    })
  }
  for (const p of PAGES.filter((x) => x.includes('help'))) {
    const html = raw[`../../${p}`]!
    it(`${p} has a skip link, a main landmark and the accessibility statement with the issues link`, () => {
      expect(html).toContain('class="skip-link" href="#main"')
      expect(html).toContain('<main id="main"')
      expect(html).toMatch(/id="(accesibilidad|accessibility)"/)
      expect(html).toContain('/mecanica-labs/issues')
      expect(html).toMatch(/WCAG\) 2\.0/)
    })
  }
})
