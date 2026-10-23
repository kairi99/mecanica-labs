// Camera preset names (pure). 'alongRail' was the old name of 'lateral' and stays accepted as an alias (?cam=alongRail).
export type PresetName = 'overview' | 'highEnd' | 'lowEnd' | 'lateral' | 'mark' | 'tape'
export const PRESET_NAMES: readonly PresetName[] = ['overview', 'highEnd', 'lowEnd', 'lateral', 'mark', 'tape']

/** Parse a preset name from a URL parameter or a caller; null when unknown. */
export function parsePreset(s: string | null | undefined): PresetName | null {
  if (!s) return null
  if (s === 'alongRail') return 'lateral'
  return (PRESET_NAMES as readonly string[]).includes(s) ? (s as PresetName) : null
}
