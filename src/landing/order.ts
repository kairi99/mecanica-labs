// Pure decisions of the landing page (no DOM): where ?exp= redirects and in which order the cards appear.
import type { ExperimentManifest } from '../experiments/manifest.ts'

/** Where `?exp=<id>` sends the browser (null: no such ready experiment). The other query parameters and the hash stay. */
export function redirectTarget(search: string, hash: string, list: readonly ExperimentManifest[]): string | null {
  const q = new URLSearchParams(search)
  const id = q.get('exp')
  const x = id === null ? undefined : list.find((e) => e.id === id)
  if (!x || x.status !== 'ready') return null
  q.delete('exp')
  const rest = q.toString()
  return `${x.page}${rest ? `?${rest}` : ''}${hash}`
}

/** Ready experiments first (the last opened one on top), then the ones that are coming soon, each group in registry order. */
export function orderedExperiments(list: readonly ExperimentManifest[], last: string | null): ExperimentManifest[] {
  const ready = list.filter((x) => x.status === 'ready')
  const soon = list.filter((x) => x.status !== 'ready')
  const first = ready.find((x) => x.id === last)
  return [...(first ? [first] : []), ...ready.filter((x) => x !== first), ...soon]
}
