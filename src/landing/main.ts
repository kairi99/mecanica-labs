// Landing page: the experiment picker. Spanish first, EN toggle (shared lang key, ?lang=), theme toggle (shared theme key).
// `?exp=<id>` goes straight to that experiment and keeps the other query parameters. No experiment code is imported here,
// only the manifests, so this page stays tiny.
import '../core/styles/tokens.css'
import '../core/styles/app.css'
import './landing.css'
import { loadLang, saveLang, type Lang } from '../core/i18n.ts'
import { LEGACY_SHARED_KEYS, loadLast, loadTheme, migrateKeys, saveTheme, type Theme } from '../core/persist.ts'
import { fmt } from '../core/pedagogy/dom.ts'
import { button, el } from '../core/views/dom.ts'
import { applyTheme, nextTheme, themeIcon } from '../core/views/theme.ts'
import type { ExperimentManifest } from '../experiments/manifest.ts'
import { experiments } from '../experiments/registry.ts'
import { readShellParams } from '../core/shell/params.ts'
import { orderedExperiments, redirectTarget } from './order.ts'
import { strings } from './strings.ts'
import { thumb } from './thumbs.ts'

function run(): void {
  const target = redirectTarget(location.search, location.hash, experiments)
  if (target) { location.replace(target); return }

  migrateKeys(LEGACY_SHARED_KEYS)
  let lang: Lang = loadLang()
  let theme: Theme = readShellParams().theme ?? loadTheme()
  const S = () => strings[lang]
  const last = loadLast()

  const root = document.getElementById('app')!
  const header = el('header', 'lp-top')
  const brand = el('span', 'lp-brand')
  const tools = el('div', 'lp-tools')
  const langBtn = button('', 'lp-tool')
  const themeBtn = button('', 'lp-tool')
  tools.append(langBtn, themeBtn)
  header.append(brand, tools)

  const main = el('main', 'lp-main')
  const hero = el('section', 'lp-hero')
  const h1 = el('h1', 'lp-heading')
  const sub = el('p', 'lp-sub')
  hero.append(h1, sub)
  const grid = el('ul', 'lp-grid')
  main.append(hero, grid)
  const footer = el('footer', 'credits lp-credits')
  root.append(header, main, footer)

  interface CardRefs { x: ExperimentManifest; guide: HTMLElement; last: HTMLElement; title: HTMLElement; summary: HTMLElement; action: HTMLElement }
  const cards: CardRefs[] = []
  for (const x of orderedExperiments(experiments, last)) {
    const li = el('li')
    const article = el('article', `lp-card${x.status === 'ready' ? '' : ' lp-card-soon'}${x.status === 'ready' && x.id === last ? ' lp-card-last' : ''}`, undefined, { 'data-experiment': x.id })
    const meta = el('div', 'lp-meta')
    const guide = el('span', 'lp-guide')
    const lastChip = el('span', 'chip lp-last')
    lastChip.hidden = !(x.status === 'ready' && x.id === last)
    meta.append(guide, lastChip)
    const title = el('h2', 'lp-title')
    const summary = el('p', 'lp-summary')
    let action: HTMLElement
    if (x.status === 'ready') {
      action = el('a', 'btn btn-primary lp-action', undefined, { href: x.page })
    } else {
      const b = button('', 'btn btn-quiet lp-action')
      b.disabled = true
      action = b
    }
    article.append(thumb(x.thumb), meta, title, summary, action)
    li.append(article)
    grid.append(li)
    cards.push({ x, guide, last: lastChip, title, summary, action })
  }

  function label(): void {
    const t = S()
    document.documentElement.lang = lang
    document.title = t.title
    brand.textContent = t.brand
    h1.textContent = t.heading
    sub.textContent = t.subtitle
    main.setAttribute('aria-label', t.regionMain)
    footer.textContent = t.credits
    langBtn.textContent = lang === 'es' ? 'EN' : 'ES'
    langBtn.setAttribute('aria-label', t.langSwitch)
    themeBtn.replaceChildren(themeIcon(theme))
    themeBtn.setAttribute('aria-label', `${t.theme}: ${t.themes[theme]}`)
    themeBtn.title = `${t.theme}: ${t.themes[theme]}`
    for (const c of cards) {
      const title = c.x.title[lang]
      c.guide.textContent = fmt(t.guide, { n: /\d+/.exec(c.x.guide)?.[0] ?? '' })
      c.last.textContent = t.last
      c.title.textContent = title
      c.summary.textContent = c.x.summary[lang]
      if (c.x.status === 'ready') {
        c.action.textContent = t.open
        c.action.setAttribute('aria-label', fmt(t.openAria, { title }))
      } else {
        c.action.textContent = t.soon
        c.action.removeAttribute('aria-label')
      }
    }
  }
  langBtn.addEventListener('click', () => { lang = lang === 'es' ? 'en' : 'es'; saveLang(lang); label() })
  themeBtn.addEventListener('click', () => { theme = nextTheme(theme); saveTheme(theme); applyTheme(theme); label() })
  applyTheme(theme)
  label()
}

run()
