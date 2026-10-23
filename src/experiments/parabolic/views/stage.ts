// Contract between the page (main.ts, panels) and the stage (3D scene in views/scene3d, 2D side view in views/side2d.ts).
// The 3D module is lazy-loaded: main.ts imports it with `import('./views/scene3d/index.ts')`, which must export
// `webgl2Available` and `mountScene3D`; views/side2d.ts must export `mountSide2d: MountView`.
import type { TapeTarget } from '../apparatus/index.ts'
import type { View } from './view.ts'

/** Camera presets. 'edge' is the side profile that shows the table edge and the landing zone together (timing view). */
export const PRESETS = ['overview', 'release', 'edge', 'floor', 'tape'] as const
export type PresetName = (typeof PRESETS)[number]

/** Scene tools: select/drag parts, stick marks on the rail, use the level, move the paper on the floor, choose a tape target. */
export const TOOLS = ['select', 'marks', 'level', 'paper', 'tape'] as const
export type Tool = (typeof TOOLS)[number]

export interface Scene3DOptions {
  /** The scene cannot start (no WebGL2, lost context): the shell falls back to the 2D side view. */
  onFail?(reason: string): void
  preset?: PresetName
  /** A part card asks to open the matching panel (data-panel id, e.g. 'inventory', 'adjust', 'tape', 'table'). */
  openPanel?(panel: string): void
  /** The student chose a tape target in the scene (click on the table edge, a carbon mark, the rail...). */
  onTapeTarget?(target: TapeTarget): void
}

export type Scene3DView = View & {
  setVisible(visible: boolean): void
  setPreset(name: PresetName): void
  setTool(tool: Tool): void
  /** Tape target shown in the scene (null: the tape measure rests on the table). */
  setTapeTarget(target: TapeTarget | null): void
  getTapeTarget(): TapeTarget | null
}
