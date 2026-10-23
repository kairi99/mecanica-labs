// Persistence of the Practica 2 apparatus snapshot (keys `mecanica:parabolic:*`). Every access is guarded.
import { createExperimentStore } from '../../core/persist.ts'
import type { ApparatusSnapshot } from './apparatus/index.ts'

export const store = createExperimentStore('parabolic')

const isSnapshot = (v: unknown): v is ApparatusSnapshot => !!v && (v as { version?: unknown }).version === 1

export function loadSnapshot(): ApparatusSnapshot | null { return store.loadJson('state', isSnapshot) }
export function saveSnapshot(s: ApparatusSnapshot): void { store.saveJson('state', s) }
export function clearSnapshot(): void { store.set('state', null) }
