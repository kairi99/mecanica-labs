// Pure snap resolution of the drag-and-drop assembly (no DOM, no three.js, no experiment units): a drop point is matched against the
// zones a part can go to. Zones are boxes on a horizontal plane in scene centimetres (any frame the experiment's views agree on).
// What a zone MEANS (which model call it stands for) is the experiment's business: it extends `Zone` with its own fields.

/** area: a wide fallback (the table, no label, no snap margin); point: a spot with a snap radius; band: a long strip (a rail), may tilt. */
export type ZoneKind = 'area' | 'point' | 'band'

/** A box on the plane at height `cy` (half sizes hx, hz; 0 for a point), widened by `snap_cm` on every side. */
export interface Zone {
  id: string
  kind: ZoneKind
  cx: number
  cy: number
  cz: number
  hx: number
  hz: number
  snap_cm: number
  /** Ties between equally distant zones go to the higher number. */
  priority: number
  /** The model would accept the drop right now (as far as the view knows). Not-ready zones still accept a drop: the refusal teaches. */
  ready: boolean
  /** Band zones: tilt about z (radians, positive = low end at +x), for drawing only. */
  tilt_rad?: number
}

export interface PlanePoint { x_cm: number; z_cm: number | null }
/** Where the pointer meets the horizontal plane at the zone's height (z null: the view has no depth, ignore it); null: not over the stage. */
export type Probe = (zone: Zone) => PlanePoint | null

/** Result of a drop: the parts tray (take the part off the bench) or a zone. Experiments extend the zone variant with their own fields. */
export type ZoneTarget<Z extends Zone = Zone> = { kind: 'tray' } | { kind: 'zone'; zone: Z; dist_cm: number }

export interface ZoneHit<Z extends Zone = Zone> { zone: Z; dist_cm: number; point: { x_cm: number; z_cm: number | null } }

/** Distance (cm) from a point to the zone's box, 0 inside. z null: only x counts (side view). */
export function distanceToZone(zone: Zone, p: PlanePoint): number {
  const dx = Math.max(0, Math.abs(p.x_cm - zone.cx) - zone.hx)
  const dz = p.z_cm === null ? 0 : Math.max(0, Math.abs(p.z_cm - zone.cz) - zone.hz)
  return Math.hypot(dx, dz)
}

/**
 * The zone a drop point falls in: the nearest non-area zone within its snap distance (ties: higher priority), else the area zone
 * if the point is on it, else null. `probe` gives the point on the plane at each zone's height (a pointer ray crosses planes of
 * different heights at different x, z).
 */
export function nearestZone<Z extends Zone>(zones: readonly Z[], probe: Probe): ZoneHit<Z> | null {
  let best: ZoneHit<Z> | null = null
  let area: ZoneHit<Z> | null = null
  for (const zone of zones) {
    const p = probe(zone)
    if (!p || !Number.isFinite(p.x_cm)) continue
    const dist = distanceToZone(zone, p)
    if (dist > zone.snap_cm + 1e-9) continue
    const hit: ZoneHit<Z> = { zone, dist_cm: dist, point: p }
    if (zone.kind === 'area') { area = hit; continue }
    if (!best || dist < best.dist_cm - 1e-9 || (Math.abs(dist - best.dist_cm) <= 1e-9 && zone.priority > best.zone.priority)) best = hit
  }
  return best ?? area
}

/** Plain resolution to a zone target (experiments that need extra fields in the target call `nearestZone` and decorate). */
export function resolveDrop<Z extends Zone>(zones: readonly Z[], probe: Probe): { kind: 'zone'; zone: Z; dist_cm: number } | null {
  const h = nearestZone(zones, probe)
  return h ? { kind: 'zone', zone: h.zone, dist_cm: h.dist_cm } : null
}
