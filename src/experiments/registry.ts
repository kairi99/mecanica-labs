// The experiments the landing page lists and the build bundles. Import only manifests here, never experiment code.
import type { ExperimentManifest } from './manifest.ts'
import { manifest as mruv } from './mruv/experiment.ts'
import { manifest as parabolic } from './parabolic/experiment.ts'
import { manifest as friction } from './friction/experiment.ts'

export const experiments: readonly ExperimentManifest[] = [mruv, parabolic, friction]

export const findExperiment = (id: string): ExperimentManifest | undefined => experiments.find((x) => x.id === id)
export const readyExperiments = (): ExperimentManifest[] => experiments.filter((x) => x.status === 'ready')
