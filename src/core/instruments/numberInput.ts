// Validation of numbers typed into a lab table (decimal point or comma, bounded, limited decimals). Pure; no DOM.
// Shared by the experiments' tables (times from a stopwatch, lengths from a tape measure).

export type DecimalInputReason = 'empty' | 'notANumber' | 'negative' | 'tooLarge' | 'tooManyDecimals'
export type ParsedDecimal = { ok: true; value: number } | { ok: false; reason: DecimalInputReason }
export interface DecimalLimits {
  /** Largest accepted value (inclusive), in the unit of the input. */
  max: number
  /** Most decimals the instrument shows; typed values with more are rejected, accepted ones are rounded to this many. */
  maxDecimals: number
}

/** Parse typed text (decimal point or comma) or a number against the limits. Trailing zeros do not count as decimals. */
export function parseDecimalInput(input: string | number, limits: DecimalLimits): ParsedDecimal {
  let text: string
  if (typeof input === 'number') {
    if (!Number.isFinite(input)) return { ok: false, reason: 'notANumber' }
    if (input < 0) return { ok: false, reason: 'negative' }
    text = Math.abs(input) < 1e-6 ? '0' : input.toFixed(9).replace(/0+$/, '').replace(/\.$/, '')
  } else {
    text = input.trim().replace(',', '.')
    if (text === '') return { ok: false, reason: 'empty' }
    if (/^-\s*\d/.test(text) || /^-\.\d/.test(text)) return { ok: false, reason: 'negative' }
    if (!/^(\d+(\.\d*)?|\.\d+)$/.test(text)) return { ok: false, reason: 'notANumber' }
  }
  const decimals = text.includes('.') ? text.split('.')[1]!.replace(/0+$/, '').length : 0
  if (decimals > limits.maxDecimals) return { ok: false, reason: 'tooManyDecimals' }
  const v = Number(text)
  if (v > limits.max) return { ok: false, reason: 'tooLarge' }
  const f = 10 ** limits.maxDecimals
  return { ok: true, value: Math.round(v * f) / f }
}
