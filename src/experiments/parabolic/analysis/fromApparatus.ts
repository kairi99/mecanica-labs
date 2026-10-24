// Adapters from the apparatus to the pure analysis inputs. No physics here.
import type { BallId, ParabolicApparatus } from '../apparatus/index.ts'
import { SLOWMO_FPS_hz } from '../apparatus/index.ts'
import { analyseBall, referenceTime, type BallAnalysis } from './compute.ts'

export function ballAnalysis(app: ParabolicApparatus, ball: BallId): BallAnalysis {
  const d = app.tableData(ball)
  return analyseBall(d.t_s, d.x_m)
}

/** Slow-motion reference flight time of one ball: the frame-counted flight of every run of that ball that flew. Null with none. */
export function slowmoReference(app: ParabolicApparatus, ball: BallId): { t_s: number; u_s: number; n: number } | null {
  const flights: number[] = []
  for (const r of app.getRuns()) {
    if (r.ball !== ball || !r.flight) continue
    const clip = app.slowmo(r.id)
    if (clip) flights.push(clip.flightFromFrames_s)
  }
  return referenceTime(flights, 1 / SLOWMO_FPS_hz)
}
