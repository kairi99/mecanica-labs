// Pure camera framing maths (no three.js, no DOM): where to put a perspective camera so a set of scene points fills the view.
// Scene units: cm, y up, azimuth 0 = camera in front (+z), positive azimuth swings it toward +x (the low end).
export type Vec = readonly [number, number, number]

export interface ViewBasis { dir: Vec; right: Vec; up: Vec }
const cross = (a: Vec, b: Vec): Vec => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const dot = (a: Vec, b: Vec): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const norm = (a: Vec): Vec => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l] }

/** Camera basis: `dir` points from the target to the camera, `right` and `up` span the image plane. */
export function viewBasis(azimuth_deg: number, elevation_deg: number): ViewBasis {
  const az = (azimuth_deg * Math.PI) / 180, el = (elevation_deg * Math.PI) / 180
  const dir = norm([Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)])
  const right = norm(cross([0, 1, 0], dir))
  const up = cross(dir, right)
  return { dir, right, up }
}

export interface Fit { target: [number, number, number]; distance: number; position: [number, number, number] }

/**
 * Camera that frames `points` with the given extra `margin` (0.08 = the content spans 1/1.08 of the view). The target is the
 * centre of the points' extent in the image plane; the distance is the smallest that keeps every point inside the frustum.
 * `fov_deg` is the vertical field of view, `aspect` = width / height.
 */
export function fitView(points: readonly Vec[], azimuth_deg: number, elevation_deg: number, fov_deg: number, aspect: number, margin = 0.08): Fit {
  const { dir, right, up } = viewBasis(azimuth_deg, elevation_deg)
  let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity, w0 = Infinity, w1 = -Infinity
  for (const p of points) {
    const u = dot(p, right), v = dot(p, up), w = dot(p, dir)
    u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); w0 = Math.min(w0, w); w1 = Math.max(w1, w)
  }
  const uc = (u0 + u1) / 2, vc = (v0 + v1) / 2, wc = (w0 + w1) / 2
  const target: [number, number, number] = [
    right[0] * uc + up[0] * vc + dir[0] * wc, right[1] * uc + up[1] * vc + dir[1] * wc, right[2] * uc + up[2] * vc + dir[2] * wc,
  ]
  const tanV = Math.tan((fov_deg * Math.PI) / 360), tanH = tanV * aspect, m = 1 + margin
  let distance = 1
  for (const p of points) {
    const du = Math.abs(dot(p, right) - uc), dv = Math.abs(dot(p, up) - vc), dw = dot(p, dir) - wc
    distance = Math.max(distance, dw + (du * m) / tanH, dw + (dv * m) / tanV)
  }
  const position: [number, number, number] = [target[0] + dir[0] * distance, target[1] + dir[1] * distance, target[2] + dir[2] * distance]
  return { target, distance, position }
}

/** Corners of an axis-aligned box. */
export function boxCorners(min: Vec, max: Vec): Vec[] {
  const out: Vec[] = []
  for (const x of [min[0], max[0]]) for (const y of [min[1], max[1]]) for (const z of [min[2], max[2]]) out.push([x, y, z])
  return out
}

/** Project a point with a camera at `fit.position` looking at `fit.target`; returns NDC x, y (inside the view when |.| <= 1). */
export function projectNdc(p: Vec, fit: Fit, azimuth_deg: number, elevation_deg: number, fov_deg: number, aspect: number): [number, number] {
  const { dir, right, up } = viewBasis(azimuth_deg, elevation_deg)
  const rel: Vec = [p[0] - fit.position[0], p[1] - fit.position[1], p[2] - fit.position[2]]
  const depth = -dot(rel, dir)
  const tanV = Math.tan((fov_deg * Math.PI) / 360)
  return [dot(rel, right) / (depth * tanV * aspect), dot(rel, up) / (depth * tanV)]
}
