import { describe, expect, it } from 'vitest'

// Every source file of src/core as text (Vite resolves the glob at transform time).
const sources = import.meta.glob('../../src/core/**/*.{ts,css}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

describe('core boundary', () => {
  it('finds the core sources', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(30)
  })

  it('src/core never imports from src/experiments or src/landing', () => {
    const offenders: string[] = []
    for (const [file, text] of Object.entries(sources)) {
      const specs = [...text.matchAll(/(?:from\s+|import\s*\(\s*|import\s+|@import\s+)['"]([^'"]+)['"]/g)].map((m) => m[1]!)
      for (const s of specs) if (/experiments\/|landing\//.test(s)) offenders.push(`${file}: ${s}`)
    }
    expect(offenders).toEqual([])
  })

  it('core physics stays free of DOM, storage, timers and Math.random', () => {
    const offenders: string[] = []
    for (const [file, text] of Object.entries(sources)) {
      if (!/\/core\/physics\//.test(file)) continue
      const code = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
      if (/\b(document|window|localStorage|setTimeout|setInterval|requestAnimationFrame)\b|Math\.random/.test(code)) offenders.push(file)
    }
    expect(offenders).toEqual([])
  })
})
