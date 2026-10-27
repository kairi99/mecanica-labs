// Persistence of the Práctica 3 apparatus snapshot (keys `mecanica:newton2:*`). Every access is guarded.
import { createExperimentStore } from '../../core/persist.ts'
import type { ApparatusSnapshot } from './apparatus/index.ts'

export const store = createExperimentStore('newton2')

const isSnapshot = (v: unknown): v is ApparatusSnapshot => !!v && (v as { version?: unknown }).version === 1

export function loadSnapshot(): ApparatusSnapshot | null { return store.loadJson('state', isSnapshot) }
export function saveSnapshot(s: ApparatusSnapshot): void { store.saveJson('state', s) }
export function clearSnapshot(): void { store.set('state', null) }

/** "Switch to the pulley view when the cart is released" (default on). */
export function loadAutoCam(): boolean { return store.get('autocam') !== '0' }
export function saveAutoCam(on: boolean): void { store.set('autocam', on ? null : '0') }
