// Angle conversions. Pure. Convert only locally inside a function, never across an API.
export const deg2rad = (deg: number): number => (deg * Math.PI) / 180
export const rad2deg = (rad: number): number => (rad * 180) / Math.PI
