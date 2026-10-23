// Persistence of the MRUV apparatus snapshot and its shell options (keys `mecanica:mruv:*`). Every access is guarded.
import { createExperimentStore, LEGACY_SHARED_KEYS, migrateKeys, experimentKey } from '../../core/persist.ts'
import type { ApparatusSnapshot } from './apparatus/index.ts'

export const store = createExperimentStore('mruv')

/** New key -> key of the single-experiment app (copied once on the first load, old keys stay). */
export const LEGACY_KEYS: Readonly<Record<string, string>> = {
  ...LEGACY_SHARED_KEYS,
  [experimentKey('mruv', 'state')]: 'digicart-mruv-state',
  [experimentKey('mruv', 'view')]: 'digicart-mruv-view',
  [experimentKey('mruv', 'step')]: 'digicart-mruv-step',
  [experimentKey('mruv', 'automark')]: 'digicart-mruv-automark',
  [experimentKey('mruv', 'tour-done')]: 'digicart-mruv-tour-done',
}
/** Carry the progress saved before the multi-experiment layout over to the new keys. Call before reading anything. */
export function migrateLegacyStorage(): void { migrateKeys(LEGACY_KEYS) }

const isSnapshot = (v: unknown): v is ApparatusSnapshot => !!v && (v as { version?: unknown }).version === 1

export function loadSnapshot(): ApparatusSnapshot | null { return store.loadJson('state', isSnapshot) }
export function saveSnapshot(s: ApparatusSnapshot): void { store.saveJson('state', s) }
export function clearSnapshot(): void { store.set('state', null) }

/** "Switch to the Mark view when the cart is released" (default on). */
export function loadAutoMark(): boolean { return store.get('automark') !== '0' }
export function saveAutoMark(on: boolean): void { store.set('automark', on ? null : '0') }
