// Dev harness for the 3D table scene: an Apparatus, a ViewContext, the scene and buttons that call apparatus actions.
// Query: ?preset=assembled|empty  &cam=overview|highEnd|lowEnd|lateral|mark|tape (alongRail = lateral)  &markfrom=50  &lang=es|en  &theme=dark|light
//        &setup=add:rail,add:cart,attach:standBase,attach:rackClamp:E1,rack:25,foot:0.5,place:0,release,wait:1500,tool:markers,tape:clamp
import '../src/styles/tokens.css'
import { createApparatus, ITEM_IDS, type ItemId } from '../src/apparatus/index.ts'
import { loadLang } from '../src/i18n.ts'
import type { ViewContext } from '../src/views/view.ts'
import { mountScene3D, webgl2Available, type PresetName } from '../src/views/scene3d/index.ts'
import { parsePreset } from '../src/views/scene3d/presets.ts'

const q = new URLSearchParams(location.search)
const theme = q.get('theme')
if (theme) document.documentElement.dataset.theme = theme
const a = createApparatus(q.get('preset') === 'assembled' ? 'assembled' : 'empty', { seed: 42 })
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
const ctx: ViewContext = {
  apparatus: a, lang: loadLang, reducedMotion: () => reduced || q.get('reduced') === '1', now: () => performance.now(),
  changed: () => log('changed'),
}
const logEl = document.getElementById('log')!
function log(s: string): void { logEl.textContent = `${s}\n${logEl.textContent}`.slice(0, 900) }
a.on((e) => { const { seq: _s, t_ms: _t, ...rest } = e; log(JSON.stringify(rest)) })

if (!webgl2Available()) log('no WebGL2')
const root = document.getElementById('root')!
const view = mountScene3D(root, ctx, {
  preset: parsePreset(q.get('cam')) ?? 'overview',
  onFail: (r) => log(`onFail ${r}`),
  openPanel: (p) => log(`openPanel ${p}`),
  onTapeTarget: (t) => log(`tape target ${JSON.stringify(t)}`),
})
if (q.get('markfrom')) view.setMarkTarget(Number(q.get('markfrom')))
const fitRoot = (): void => { root.style.height = `${Math.max(300, innerHeight - root.getBoundingClientRect().top - 40)}px` }
fitRoot()
addEventListener('resize', fitRoot)
const stEl = document.getElementById('st')!
function frame(): void {
  view.update()
  const cs = a.cartState(ctx.now())
  stEl.textContent = `cart ${cs.phase} front=${cs.frontRailPos_mm?.toFixed(0) ?? '-'}mm t=${cs.t_s.toFixed(2)}s  rack=${a.getState().rack_mm}mm foot=${a.getState().foot_mm}`
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)

const bar = document.getElementById('bar')!
function btn(label: string, fn: () => void): void {
  const b = document.createElement('button')
  b.textContent = label
  b.addEventListener('click', () => { fn(); log(label) })
  bar.append(b)
}
for (const id of ITEM_IDS) btn(`+${id}`, () => a.addItem(id as ItemId))
btn('attach base', () => a.attach('standBase'))
btn('clamp E1', () => a.attach('rackClamp', { railEnd: 'E1' }))
btn('clamp E2', () => a.attach('rackClamp', { railEnd: 'E2' }))
btn('twoLeg', () => a.attach('twoLegStand'))
btn('receiver', () => a.attach('receiver'))
btn('rack+10', () => a.setRackHeight_mm(a.getState().rack_mm + 10))
btn('rack-10', () => a.setRackHeight_mm(a.getState().rack_mm - 10))
btn('place A', () => a.placeCart(a.evaluateMarks().aRailPos_mm ?? 120))
btn('release', () => a.releaseCart(performance.now()))
btn('reset cart', () => a.resetCart())
btn('level rail', () => a.placeLevel('rail'))
btn('level table', () => a.placeLevel('table'))
btn('stopwatch', () => a.stopwatchStartStop(performance.now()))
btn('preset assembled', () => { a.preset('assembled') })
btn('preset empty', () => { a.preset('empty') })
for (const p of ['overview', 'highEnd', 'lowEnd', 'lateral', 'mark', 'tape'] as const) btn(p, () => view.setPreset(p))
for (const m of [0, 10, 50, 90]) btn(`mark ${m}`, () => view.setMarkTarget(m))

// scripted setup from the URL (used by the screenshot checks)
const steps = (q.get('setup') ?? '').split(',').filter(Boolean)
let delay = 0
for (const s of steps) {
  const [op, x, y] = s.split(':')
  if (op === 'wait') { delay += Number(x); continue }
  const run = (): void => {
    switch (op) {
      case 'add': a.addItem(x as ItemId); break
      case 'attach': a.attach(x as 'standBase' | 'rackClamp' | 'twoLegStand' | 'receiver', y ? { railEnd: y as 'E1' | 'E2' } : {}); break
      case 'rack': a.setRackHeight_mm(Number(x)); break
      case 'foot': a.setFoot_mm(Number(x)); break
      case 'place': a.placeCart(Number(x)); break
      case 'mark': a.placeMarker(Number(x)); break
      case 'release': a.releaseCart(performance.now()); break
      case 'level': a.placeLevel(x as 'rail' | 'table'); break
      case 'tool': view.setTool?.(x as 'select' | 'markers' | 'level' | 'tape'); break
      case 'tape': view.setTapeTarget?.(x === 'twoLeg' || x === 'clamp' ? { kind: 'railHeight', at: x } : x === 'cart' ? { kind: 'cartLength' } : x === 'd' ? { kind: 'supportSeparation' } : { kind: 'railHeight', at: { railPos_mm: Number(x) } }); break
      default: break
    }
  }
  if (delay === 0) run(); else setTimeout(run, delay)
}

// scripted pointer tests (need ?debug3d=1): act=drag:rackKnob:0:-60,tap:cart,wheel:rackKnob:-100,wait:500 ...
type Dbg = { screen(name: string): { x: number; y: number } | null }
const canvas = (): HTMLCanvasElement => root.querySelector('canvas')!
const ev = (type: string, x: number, y: number, extra: PointerEventInit = {}): void => {
  canvas().dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, pointerId: 7, pointerType: 'mouse', button: 0, buttons: type === 'pointerup' ? 0 : 1, bubbles: true, cancelable: true, isPrimary: true, ...extra }))
}
const acts = (q.get('act') ?? '').split(',').filter(Boolean)
let t = 600
for (const s of acts) {
  const [op, name, ax, ay] = s.split(':')
  if (op === 'wait') { t += Number(name); continue }
  setTimeout(() => {
    const dbg = (window as unknown as { __scene3d?: Dbg }).__scene3d
    const p0 = dbg?.screen(name ?? '')
    if (op === 'tool') { view.setTool?.(name as 'select' | 'markers' | 'level' | 'tape'); return }
    if (op === 'cam') { view.setPreset(name as PresetName); return }
    if (!p0) { log(`no screen for ${name}`); return }
    if (op === 'tap') { ev('pointerdown', p0.x, p0.y); ev('pointerup', p0.x, p0.y) }
    else if (op === 'drag') {
      // drag: by pixel offset (ax, ay) or to another handle (ax = 'to', ay = target name)
      let dx = Number(ax), dy = Number(ay)
      if (ax === 'to') { const p1 = dbg?.screen(ay ?? ''); if (!p1) return; dx = p1.x - p0.x; dy = p1.y - p0.y }
      ev('pointerdown', p0.x, p0.y)
      for (let i = 1; i <= 8; i++) ev('pointermove', p0.x + (dx * i) / 8, p0.y + (dy * i) / 8)
      ev('pointerup', p0.x + dx, p0.y + dy)
    } else if (op === 'wheel') canvas().dispatchEvent(new WheelEvent('wheel', { clientX: p0.x, clientY: p0.y, deltaY: Number(ax), bubbles: true, cancelable: true }))
    else if (op === 'hover') ev('pointermove', p0.x, p0.y, { buttons: 0 })
  }, t)
  t += 250
}

// ?open=view|tool: open a menu after load and press ArrowDown, to check it in a screenshot
const openMenu = q.get('open')
if (openMenu) setTimeout(() => {
  const b = root.querySelector<HTMLButtonElement>(openMenu === 'view' ? '.scene3d-viewmenu .scene3d-chip' : '.scene3d-toolmenu .scene3d-chip')
  b?.click()
  document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
  log(`menu open: expanded=${b?.getAttribute('aria-expanded')} focus=${document.activeElement?.textContent}`)
}, 1500)
