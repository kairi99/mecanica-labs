import { describe, expect, it } from 'vitest'
import {
  combinedUncertainty, compareToExpected, mean, meanVelocity, quantize, repeatedStats, roundSignificant,
  roundWithUncertainty, sampleSd, sem, typeBAnalog, typeBDigital,
} from '../src/physics/index.ts'
import { loadLang, t } from '../src/i18n.ts'

describe('statistics', () => {
  it('mean, sample s (n-1) and s/sqrt(n)', () => {
    const xs = [2, 4, 4, 4, 5, 5, 7, 9]
    expect(mean(xs)).toBe(5)
    expect(sampleSd(xs)).toBeCloseTo(Math.sqrt(32 / 7), 12)
    expect(sem(xs)).toBeCloseTo(Math.sqrt(32 / 7) / Math.sqrt(8), 12)
    expect(sampleSd([3])).toBe(0)
  })
  it('type B: resolution/sqrt(12) digital; (d/2)/sqrt(3) analog (same number)', () => {
    expect(typeBDigital(0.01)).toBeCloseTo(0.01 / Math.sqrt(12), 15)
    expect(typeBAnalog(0.001)).toBeCloseTo(0.001 / Math.sqrt(12), 15)
  })
  it('combined uncertainty is the quadrature sum', () => {
    expect(combinedUncertainty(3, 4)).toBe(5)
  })
  it('repeated readings: u = sqrt((s/sqrt n)^2 + uB^2); uB does not average down', () => {
    const r = repeatedStats([1.0, 1.1, 0.9, 1.0], typeBDigital(0.01))
    expect(r.mean).toBeCloseTo(1, 12)
    expect(r.u).toBeCloseTo(Math.hypot(r.sd / 2, typeBDigital(0.01)), 12)
    expect(repeatedStats([1, 1, 1, 1], 0.003).u).toBeCloseTo(0.003, 12)
  })
  it('rounding: significant figures and uncertainty to 1-2 digits', () => {
    expect(roundSignificant(123.456, 2)).toBe(120)
    expect(roundSignificant(0.012345, 3)).toBeCloseTo(0.0123, 12)
    expect(roundWithUncertainty(1.23456, 0.0142)).toEqual({ value: 1.235, sigma: 0.014, decimals: 3 })
    expect(roundWithUncertainty(1.23456, 0.036)).toEqual({ value: 1.23, sigma: 0.04, decimals: 2 })
  })
  it('quantize to the instrument resolution', () => {
    expect(quantize(1.2349, 0.01)).toBeCloseTo(1.23, 12)
  })
})

describe('mean velocity and comparison', () => {
  it('v = dx/dt with propagated sigma', () => {
    const r = meanVelocity(0, 0, 0.9, 3, 0.001, 0, 0.05)
    expect(r.v_mps).toBeCloseTo(0.3, 12)
    expect(r.sigma_v_mps).toBeCloseTo(Math.sqrt(2e-6 + 0.09 * 0.0025) / 3, 12)
  })
  it('for uniformly accelerated motion the mean velocity over 0..t equals v(t)/2', () => {
    const a = 0.2, T = 3
    expect(meanVelocity(0, 0, 0.5 * a * T * T, T).v_mps).toBeCloseTo((a * T) / 2, 12)
  })
  it('compareToExpected verdicts', () => {
    expect(compareToExpected(0.21, 0.01, 0.2).verdict).toBe('within1')
    expect(compareToExpected(0.23, 0.01, 0.2).verdict).toBe('beyond2')
  })
})

describe('i18n', () => {
  it('Spanish is the default language and both dictionaries have the same keys', () => {
    expect(loadLang()).toBe('es')
    expect(t('en').title).not.toBe(t('es').title)
    expect(Object.keys(t('en'))).toEqual(Object.keys(t('es')))
  })
})
