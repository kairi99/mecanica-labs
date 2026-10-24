// Dev harness for the projectile stage (3D scene and 2D side view). Dev only: not in the vite build inputs.
// Query: ?view=3d|2d|both  &cam=overview|release|edge|floor|tape  &lang=es|en  &theme=dark|light  &reduced=1
//   &runs=3        runs released programmatically in the past (marks land on the paper), marble then ping-pong
//   &live=1        one run released at load (animation)       &tool=select|marks|level|paper|tape
//   &tape=height|gap|rise|mark|range   tape target       &debug3d=1  (pointer test hooks, see scene.ts)
//   &act=drag:ball:to:mark@1,tap:floor@0,0,...  scripted pointer actions
import '../src/core/styles/tokens.css'
import '../src/core/styles/app.css'
import { createApparatus, type TapeTarget } from '../src/experiments/parabolic/apparatus/index.ts'
import { loadLang } from '../src/core/i18n.ts'
import type { ViewContext } from '../src/experiments/parabolic/views/view.ts'
import type { PresetName, Tool } from '../src/experiments/parabolic/views/stage.ts'
import { mountScene3D, webgl2Available } from '../src/experiments/parabolic/views/scene3d/index.ts'
import { parsePreset } from '../src/experiments/parabolic/views/scene3d/presets.ts'
import { mountSide2d } from '../src/experiments/parabolic/views/side2d.ts'

const q = new URLSearchParams(location.search)
const theme = q.get('theme')
if (theme) document.documentElement.dataset.theme = theme
const a = createApparatus('assembled', { seed: 7 })
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
const ctx: ViewContext = {
  apparatus: a, lang: loadLang, reducedMotion: () => reduced || q.get('reduced') === '1', now: () => performance.now(),
  changed: () => log('changed'),
}
const logEl = document.getElementById('log')!
function log(s: string): void { logEl.textContent = `${s}\n${logEl.textContent}`.slice(0, 700) }
a.on((e) => { if (e.type !== 'refused') return; log(`refused ${e.action} ${e.reason}`) })

// runs released in the past so that their marks are on the paper already
const nRuns = Number(q.get('runs') ?? 0)
const marks = a.getState().marks
let t0 = performance.now() - 40000
for (let i = 0; i < nRuns; i++) {
  if (i === 3) a.selectBall('pingpong')
  const m = marks[i % marks.length]!
  a.placeBall({ markId: m.id })
  const r = a.release(t0)
  if (!r.ok) log(`release refused ${r.reason}`)
  t0 += 4000
  a.tick(t0)
}
if (nRuns > 0) { a.selectBall('marble'); a.placeBall({ markId: marks[0]!.id }) }
if (q.get('live') === '1') setTimeout(() => { const r = a.release(performance.now()); log(`live release ${JSON.stringify(r)}`) }, Number(q.get('livedelay') ?? 1200))

;(window as unknown as { __a?: unknown }).__a = a
const view = q.get('view') ?? 'both'
const root3d = document.getElementById('root3d')!
const root2d = document.getElementById('root2d')!
if (!webgl2Available()) log('no WebGL2')
const scene = view !== '2d' ? mountScene3D(root3d, ctx, {
  preset: parsePreset(q.get('cam')) ?? 'overview',
  onFail: (r) => log(`onFail ${r}`),
  openPanel: (p) => log(`openPanel ${p}`),
  onTapeTarget: (t) => log(`tape target ${JSON.stringify(t)}`),
}) : null
const side = view !== '3d' ? mountSide2d(root2d, ctx) : null
const fit = (): void => { root3d.style.height = view === 'both' ? `${Math.round(innerHeight * 0.62)}px` : `${Math.max(300, innerHeight - 40)}px` }
fit()
addEventListener('resize', fit)
if (view === '2d') root3d.style.display = 'none'
if (view === '3d') root2d.style.display = 'none'

const tool = q.get('tool')
if (tool && scene) scene.setTool(tool as Tool)
const tp = q.get('tape')
if (tp) {
  const mid = marks[2]?.id ?? 'm1'
  const carbon = a.paperMarks(performance.now() + 1e6)[0]?.id ?? 'c1'
  const targets: Record<string, TapeTarget> = {
    height: { kind: 'launchHeight' }, gap: { kind: 'gap' }, rise: { kind: 'rise' }, mark: { kind: 'markPosition', markId: mid }, range: { kind: 'range', carbonId: carbon },
  }
  const t = targets[tp]
  if (t) { a.tapeMeasure(t); scene?.setTapeTarget(t) }
}

function frame(): void {
  scene?.update()
  side?.update()
  const s = a.ballStatus(ctx.now())
  document.getElementById('st')!.textContent = `ball ${s.ball} ${s.phase} t=${s.t_s.toFixed(2)} run=${s.runId} pos=${s.pos ? `${(s.pos.x_m * 100).toFixed(0)},${(s.pos.y_m * 100).toFixed(0)}` : '-'}`
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)

// scripted pointer tests (need ?debug3d=1)
type Dbg = { screen(name: string): { x: number; y: number } | null }
const canvas = (): HTMLCanvasElement => root3d.querySelector('canvas')!
const ev = (type: string, x: number, y: number): void => {
  canvas().dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, pointerId: 7, pointerType: 'mouse', button: 0, buttons: type === 'pointerup' ? 0 : 1, bubbles: true, cancelable: true, isPrimary: true }))
}
let t = 1200
for (const s of (q.get('act') ?? '').split(',').filter(Boolean)) {
  const [op, name, ax, ay] = s.split(':')
  if (op === 'wait') { t += Number(name); continue }
  setTimeout(() => {
    const dbg = (window as unknown as { __scene3d?: Dbg }).__scene3d
    if (op === 'tool') { scene?.setTool(name as Tool); return }
    if (op === 'cam') { scene?.setPreset(name as PresetName); return }
    const p0 = dbg?.screen(name ?? '')
    if (!p0) { log(`no screen for ${name}`); return }
    if (op === 'tap') { ev('pointerdown', p0.x, p0.y); ev('pointerup', p0.x, p0.y) }
    else if (op === 'drag') {
      let dx = Number(ax), dy = Number(ay)
      if (ax === 'to') { const p1 = dbg?.screen(ay ?? ''); if (!p1) return; dx = p1.x - p0.x; dy = p1.y - p0.y }
      ev('pointerdown', p0.x, p0.y)
      for (let i = 1; i <= 8; i++) ev('pointermove', p0.x + (dx * i) / 8, p0.y + (dy * i) / 8)
      ev('pointerup', p0.x + dx, p0.y + dy)
    }
  }, t)
  t += 300
}
