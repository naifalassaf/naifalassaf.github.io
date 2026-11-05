/** Generated contour lines for the topographic hero. */
type Pt = [number, number]

/** Smooth closed path through points (Catmull–Rom → cubic Bézier). */
function closedPath(pts: Pt[]) {
  const n = pts.length
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]
    const p1 = pts[i]
    const p2 = pts[(i + 1) % n]
    const p3 = pts[(i + 2) % n]
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += `C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`
  }
  return d + 'Z'
}

/**
 * Nested contour rings around a peak. Displacement is mostly shared between rings,
 * so neighbours stay roughly parallel and never cross, like a real topo map.
 */
export function contourRings(cx: number, cy: number, levels: number, step: number, seed: number, squash = 0.75) {
  const rings: string[] = []
  for (let k = 1; k <= levels; k++) {
    const r = k * step
    const pts: Pt[] = []
    for (let i = 0; i < 72; i++) {
      const t = (i / 72) * Math.PI * 2
      const shared = Math.sin(3 * t + seed) * 0.16 + Math.sin(5 * t + seed * 2.3) * 0.08 + Math.sin(2 * t - seed) * 0.1
      const own = Math.sin(7 * t + k * 0.6 + seed) * 0.025
      const rr = r * (1 + shared + own) + Math.sin(t * 4 + k) * step * 0.12
      pts.push([cx + Math.cos(t) * rr, cy + Math.sin(t) * rr * squash])
    }
    rings.push(closedPath(pts))
  }
  return rings
}
