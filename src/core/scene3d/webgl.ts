// WebGL capability probe shared by every 3D scene (the scene itself is loaded lazily by the experiment).

/** True when a WebGL2 context can be created. Releases the probe context right away. */
export function webgl2Available(): boolean {
  try {
    const c = document.createElement('canvas')
    const gl = c.getContext('webgl2')
    if (!gl) return false
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return true
  } catch { return false }
}
