/** Deterministic 32-bit PRNG (mulberry32); returns uniform [0,1). Inject it; never use Math.random. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Standard normal sample via Box-Muller from a uniform RNG. */
export function gaussian(rng: () => number): number {
  const u1 = Math.max(rng(), 1e-12)
  const u2 = rng()
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

/**
 * mulberry32 stream that counts its draws, so a saved snapshot can resume exactly where it stopped:
 * `new CountedRng(seed, draws)` burns `draws` values before the first `next()`.
 */
export class CountedRng {
  draws = 0
  private readonly base: () => number
  constructor(seed: number, burn = 0) {
    this.base = mulberry32(seed)
    for (let i = 0; i < burn; i++) this.base()
    this.draws = burn
  }
  next = (): number => { this.draws++; return this.base() }
}
