// Pure, DOM-free physics of Practica 2 (horizontal launch), SI units with the unit in the name.
// Pipeline: incline -> rail-tip departure (projectile) -> table phase (impact.ts, tablePhase.ts: hops, slip, roll) -> edge launch (horizontal or diagonal) -> flight -> mark.
// The original inelastic-corner model (junction.ts) stays available as tipModel "corner". Generic parts live in src/core/physics.
export * from '../../../core/physics/index.ts'
export * from './constants.ts'
export * from './incline.ts'
export * from './junction.ts'
export * from './impact.ts'
export * from './tablePhase.ts'
export * from './flight.ts'
export * from './launch.ts'
export * from './variability.ts'
export * from './marks.ts'
export * from './settle.ts'
