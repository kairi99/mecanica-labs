import { describe, expect, it } from 'vitest'
import {
  SPRING_SCALES, createSpringScale, rezeroSpringScale, springScaleReading, springScaleUncertainty_N, zeroError_N,
} from '../../src/core/instruments/springScale.ts'
import { G_QUITO_mps2, typeBAnalog } from '../../src/core/physics/index.ts'

describe('spring scale', () => {
  it('Hooke: full range sits at the printed length of the scale (k = range / extension)', () => {
    for (const s of Object.values(SPRING_SCALES)) expect(s.k_Npm * s.fullExtension_m).toBeCloseTo(s.range_N, 12)
  })
  it('reading is quantised to the smallest division (0.02 N for 1 N, 0.05 N for 2 N)', () => {
    const s1 = createSpringScale('1N', 'vertical')
    const r = springScaleReading(s1, 0.4349)
    expect(r.reading_N).toBeCloseTo(0.44, 12)
    expect(Math.abs(r.reading_N - r.indicated_N)).toBeLessThanOrEqual(0.01 + 1e-12)
    const s2 = createSpringScale('2N', 'vertical')
    expect(springScaleReading(s2, 0.874).reading_N).toBeCloseTo(0.85, 12)
  })
  it('needle is held at the stop above the range and flagged over-range', () => {
    const s = createSpringScale('1N', 'vertical')
    const r = springScaleReading(s, 1.37)
    expect(r.overRange).toBe(true)
    expect(r.indicated_N).toBe(1)
    expect(r.reading_N).toBe(1)
    expect(springScaleReading(s, 0.99).overRange).toBe(false)
  })
  it('zeroed hanging and used horizontally it reads low by the weight of its moving parts; the zero screw removes it', () => {
    const spec = SPRING_SCALES['1N']
    const s = createSpringScale('1N', 'horizontal')
    expect(s.zeroError_N).toBeCloseTo(-spec.movingMass_kg * G_QUITO_mps2, 12)
    const r = springScaleReading(s, 0.5)
    expect(r.indicated_N).toBeCloseTo(0.5 - spec.movingMass_kg * G_QUITO_mps2, 12)
    expect(springScaleReading(rezeroSpringScale(s), 0.5).indicated_N).toBeCloseTo(0.5, 12)
    expect(zeroError_N(spec, 'vertical', 'vertical')).toBe(0)
  })
  it('a force below the zero error leaves the needle on the zero stop', () => {
    const s = createSpringScale('1N', 'horizontal')
    const r = springScaleReading(s, 0.01)
    expect(r.indicated_N).toBe(0)
    expect(r.belowZero).toBe(true)
  })
  it('Type B uncertainty is d / sqrt(12), the statistics.ts analog convention', () => {
    expect(springScaleUncertainty_N(SPRING_SCALES['2N'])).toBeCloseTo(typeBAnalog(0.05), 15)
    expect(springScaleUncertainty_N(SPRING_SCALES['1N'])).toBeCloseTo(0.02 / Math.sqrt(12), 15)
  })
  it('extension for drawing is indicated / k', () => {
    const r = springScaleReading(createSpringScale('2N', 'vertical'), 1)
    expect(r.extension_m).toBeCloseTo(0.05, 12)
  })
})
