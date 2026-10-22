import './styles/tokens.css'
import './styles/app.css'
import { loadLang, saveLang, t, type Lang } from './i18n.ts'

const root = document.getElementById('app')!

function render(lang: Lang): void {
  const s = t(lang)
  document.documentElement.lang = lang
  document.title = s.title
  root.replaceChildren()
  const main = document.createElement('main')
  main.setAttribute('aria-label', s.regionMain)
  main.className = 'shell'
  const h1 = document.createElement('h1')
  h1.textContent = s.title
  const sub = document.createElement('p')
  sub.className = 'sub'
  sub.textContent = s.subtitle
  const msg = document.createElement('p')
  msg.textContent = s.placeholder
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'lang'
  btn.textContent = lang === 'es' ? 'English' : 'Español'
  btn.setAttribute('aria-label', s.language)
  btn.addEventListener('click', () => {
    const next: Lang = lang === 'es' ? 'en' : 'es'
    saveLang(next)
    render(next)
  })
  const foot = document.createElement('p')
  foot.className = 'credits'
  foot.textContent = s.credits
  main.append(h1, sub, msg, btn, foot)
  root.append(main)
}
render(loadLang())
