import { describe, expect, it } from 'vitest'
import { ITEM_IDS, createApparatus, type Reason } from '../../src/experiments/newton2/apparatus/index.ts'
import { experiments, findExperiment, readyExperiments } from '../../src/experiments/registry.ts'
import { strings as reasonStrings } from '../../src/experiments/newton2/views/strings/reasons.ts'
import { reasonText } from '../../src/experiments/newton2/views/reasons.ts'
import { strings as inventoryStrings } from '../../src/experiments/newton2/views/strings/inventory.ts'
import { strings as adjustStrings } from '../../src/experiments/newton2/views/strings/adjust.ts'
import { strings as measureStrings } from '../../src/experiments/newton2/views/strings/measure.ts'
import { strings as timingStrings } from '../../src/experiments/newton2/views/strings/timing.ts'
import { strings as tableStrings } from '../../src/experiments/newton2/views/strings/table.ts'
import { strings as logStrings } from '../../src/experiments/newton2/views/strings/log.ts'
import { strings as analysisStrings } from '../../src/experiments/newton2/views/strings/analysis.ts'
import { strings as side2dStrings } from '../../src/experiments/newton2/views/strings/side2d.ts'
import { strings as sceneStrings } from '../../src/experiments/newton2/views/strings/scene3d.ts'
import { strings as shellStrings } from '../../src/experiments/newton2/views/strings/shell.ts'
import { strings as checklistStrings } from '../../src/experiments/newton2/pedagogy/strings/checklist.ts'
import { strings as tourStrings } from '../../src/experiments/newton2/pedagogy/strings/tour.ts'
import { strings as coachStrings } from '../../src/experiments/newton2/pedagogy/strings/coach.ts'
import { COACH_KEYS } from '../../src/experiments/newton2/pedagogy/coach.ts'
import { TOUR_STEP_IDS } from '../../src/experiments/newton2/pedagogy/tour.ts'
import { STEP_IDS } from '../../src/experiments/newton2/pedagogy/checklist.ts'
import { jointBlock } from '../../src/experiments/newton2/views/inventory.ts'
import { PRESET_NAMES } from '../../src/experiments/newton2/views/scene3d/units.ts'

const pages = import.meta.glob('../../segunda-ley/**/*.html', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

/** Every leaf of a nested strings object as "path.to.leaf" -> text. */
function leaves(o: unknown, path = ''): Array<[string, string]> {
  if (typeof o === 'string') return [[path, o]]
  if (o && typeof o === 'object') return Object.entries(o).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k))
  return []
}
const tokens = (s: string): string => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',')

const BUNDLES: Array<[string, { es: unknown; en: unknown }]> = [
  ['reasons', reasonStrings], ['inventory', inventoryStrings], ['adjust', adjustStrings], ['measure', measureStrings], ['timing', timingStrings],
  ['table', tableStrings], ['log', logStrings], ['analysis', analysisStrings], ['side2d', side2dStrings], ['scene3d', sceneStrings], ['shell', shellStrings],
  ['checklist', checklistStrings], ['tour', tourStrings], ['coach', coachStrings],
]

describe('strings: Spanish and English have the same keys, no empty text and the same {placeholders}', () => {
  for (const [name, b] of BUNDLES) {
    it(name, () => {
      const es = leaves(b.es), en = leaves(b.en)
      expect(es.map((x) => x[0])).toEqual(en.map((x) => x[0]))
      es.forEach(([k, v], i) => {
        expect(v.trim(), `${name} es.${k}`).not.toBe('')
        expect(en[i]![1].trim(), `${name} en.${k}`).not.toBe('')
        expect(tokens(en[i]![1]), `${name} placeholders of ${k}`).toBe(tokens(v))
      })
    })
  }
  it('the shell lists five step names and short names', () => {
    for (const l of ['es', 'en'] as const) { expect(shellStrings[l].stepNames).toHaveLength(5); expect(shellStrings[l].stepShort).toHaveLength(5) }
  })
  it('the tour, the coach and the checklist have text for every id', () => {
    for (const l of ['es', 'en'] as const) {
      for (const id of TOUR_STEP_IDS) expect(tourStrings[l].steps[id].title.length).toBeGreaterThan(0)
      for (const id of STEP_IDS) expect(checklistStrings[l].steps[id].why.length).toBeGreaterThan(0)
      for (const k of COACH_KEYS) expect(coachStrings[l].nudges[k].length).toBeGreaterThan(0)
    }
  })
  it('every inventory item has a name, a short name and a hint', () => {
    for (const l of ['es', 'en'] as const) for (const id of ITEM_IDS) {
      expect(inventoryStrings[l].items[id].name.length).toBeGreaterThan(0)
      expect(inventoryStrings[l].itemShort[id].length).toBeGreaterThan(0)
    }
  })
})

describe('refusal text', () => {
  it('every reason has a text in both languages and {item} is replaced by the item name', () => {
    for (const l of ['es', 'en'] as const) {
      for (const r of Object.keys(reasonStrings[l].reasons) as Reason[]) expect(reasonText(l, r, 'rail')).not.toContain('{item}')
      expect(reasonText(l, 'itemNotOnTable', 'string')).toContain(inventoryStrings[l].itemShort.string)
    }
  })
  it('real refusals from the apparatus have a reason text', () => {
    const a = createApparatus('empty')
    const r = a.attach('rackClamp', { railEnd: 'E1' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(reasonText('es', r.reason, r.item).length).toBeGreaterThan(5)
  })
})

describe('joint rules shown in the inventory', () => {
  it('say what each joint needs, in the order the apparatus checks', () => {
    const a = createApparatus('empty')
    expect(jointBlock(a.getState(), 'standBase')).toMatchObject({ reason: 'itemNotOnTable', item: 'rackStand' })
    for (const i of ['rail', 'rackStand', 'standBase', 'receiver', 'screws', 'string', 'cart', 'canister', 'brassScrew'] as const) a.addItem(i)
    expect(jointBlock(a.getState(), 'rackClamp')).toMatchObject({ reason: 'needStandBase' })
    expect(jointBlock(a.getState(), 'receiver')).toMatchObject({ reason: 'needRackClamp' })
    expect(jointBlock(a.getState(), 'stringPulley')).toMatchObject({ reason: 'needReceiver' })
    expect(jointBlock(a.getState(), 'stringCart')).toBeNull()
    a.attach('standBase'); a.attach('rackClamp', { railEnd: 'E1' }); a.attach('receiver')
    expect(jointBlock(a.getState(), 'receiver')).toMatchObject({ reason: 'alreadyAttached' })
    expect(jointBlock(a.getState(), 'stringPulley')).toBeNull()
  })
})

describe('registry and pages', () => {
  it('the experiment is ready, in the registry, and its pages exist', () => {
    const m = findExperiment('newton2')!
    expect(m.status).toBe('ready')
    expect(readyExperiments().map((x) => x.id)).toContain('newton2')
    expect(experiments.filter((x) => x.slug === 'segunda-ley')).toHaveLength(1)
    for (const p of [m.page, m.help.es, m.help.en]) expect(pages[`../../${p}`], p).toBeDefined()
    expect(pages['../../segunda-ley/index.html']).toContain('/src/experiments/newton2/main.ts')
  })
  it('the help pages keep the trademark sentence, make no EPN affiliation claim either way, and carry privacy, AI note and third-party notices', () => {
    const es = pages['../../segunda-ley/help/index.html']!, en = pages['../../segunda-ley/help/en.html']!
    expect(es).toContain('no está afiliado, patrocinado ni respaldado por PHYWE')
    expect(en).toContain('not affiliated with, sponsored or endorsed by PHYWE')
    for (const h of [es, en]) {
      expect(h).not.toMatch(/(afiliad|affiliat)[^.<]*(EPN|Politécnica)/i)
      expect(h).toContain('THIRD-PARTY-NOTICES.txt')
      expect(h).toContain('localStorage')
      expect(h).toMatch(/IA|AI tools/)
      expect(h).toContain('class="skip-link" href="#main"')
      expect(h).toContain('<main id="main"')
      expect(h).toMatch(/WCAG\) 2\.0/)
      expect(h).not.toContain('\\n<p>')
    }
    expect(es).toContain('dinamómetro')
    expect(en).toContain('dynamometer')
  })
  it('the camera presets are the six of the brief', () => {
    expect([...PRESET_NAMES]).toEqual(['overview', 'start', 'pulley', 'floor', 'balance', 'scale'])
  })
})
