import * as T from 'three'

/** Sector-shaped aluminium cores. The filmed XLPE sample has four quarter sectors;
 * the two-core PVC illustration uses complementary D sections. Not SKU dimensions. */
export function powerCoreProfile(count: 2 | 4, radius: number, inset = .006) {
  const shape = new T.Shape()
  const start = count === 2 ? -Math.acos(inset / radius) : Math.asin(inset / radius)
  const end = Math.acos(inset / radius)
  if (count === 4) shape.moveTo(inset, inset)
  else shape.moveTo(inset, -Math.sqrt(radius * radius - inset * inset))
  shape.lineTo(Math.cos(start) * radius, Math.sin(start) * radius)
  shape.absarc(0, 0, radius, start, end, false)
  shape.closePath()
  return shape
}

/** Keep every round strand wholly inside the shaped conductor, including its flat edges. */
export function powerCoreStrands(count: 2 | 4, radius: number, inset: number, strand: number) {
  const points: [number, number][] = []
  const step = strand * 2.025
  const rows = Math.ceil(radius / (step * Math.sqrt(3) / 2))
  for (let row = -rows; row <= rows; row++) {
    const z = row * step * Math.sqrt(3) / 2
    for (let column = -rows; column <= rows; column++) {
      const x = (column + (Math.abs(row) % 2) / 2) * step
      if (x < inset + strand || (count === 4 && z < inset + strand)) continue
      if (Math.hypot(x, z) + strand > radius) continue
      points.push([x, z])
    }
  }
  return points
}

export function createPowerCoreGeometry(count: 2 | 4, radius: number, bottom: number, top: number) {
  const outer = powerCoreProfile(count, radius)
  const inner = powerCoreProfile(count, radius - .052, .064)
  outer.holes.push(new T.Path(inner.getPoints(64).reverse()))
  const geometry = new T.ExtrudeGeometry(outer, { depth: top - bottom, bevelEnabled: false, steps: 1, curveSegments: 48 })
  // Profile coordinates are X/Z. Extrusion and strands both run along local Y.
  geometry.rotateX(Math.PI / 2)
  geometry.translate(0, top, 0)
  return geometry
}
