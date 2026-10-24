// Camera preset names (pure). The list lives in the stage contract (views/stage.ts).
import { PRESETS, type PresetName } from '../stage.ts'

export { PRESETS as PRESET_NAMES, type PresetName }

/** Parse a preset name from a URL parameter or a caller; null when unknown. */
export function parsePreset(s: string | null | undefined): PresetName | null {
  return s && (PRESETS as readonly string[]).includes(s) ? (s as PresetName) : null
}
