import * as T from 'three'

type Path = {
  at: (t: number, value: number, half?: number) => T.Vector3
  hint: (t: number, value: number) => T.Vector3
}

/**
 * One continuous annular sleeve, branching into two peelable lips only at its front. The defaults are the aerial
 * bunched cable's insulation; the control cable's sheaths pass their own radii and cut position.
 */
export function createPeelableInsulation(path: Path, materials: T.Material[], {outer = .293, inner = .224, cutStart = .5, end = .9, sides = 64} = {}) {
  const rearSteps = 48, lipSteps = 40
  const positions: number[] = [], normals: number[] = []
  const outside: number[] = [], inside: number[] = [], rims: number[] = [], cuts: number[] = []
  type Ring = { offset: number; count: number; t: number; half?: number; start: number; radius: number; normal: 'outer' | 'inner' | 'front' | 'back' | 'start' | 'finish' }
  const rings: Ring[] = []
  const geometry = new T.BufferGeometry()
  function ring(t: number, radius: number, normal: Ring['normal'], half?: number, start = 0, count = sides) {
    const offset = positions.length / 3
    positions.push(...new Array(count * 3).fill(0)); normals.push(...new Array(count * 3).fill(0))
    rings.push({ offset, count, t, half, start, radius, normal })
    return Array.from({ length: count }, (_, i) => offset + i)
  }
  function quad(target: number[], a: number, b: number, c: number, d: number, reverse = false) {
    if (reverse) target.push(a, c, b, a, d, c)
    else target.push(a, b, c, a, c, d)
  }
  const rear: number[][][] = []
  for (let surface = 0; surface < 2; surface++) {
    const rows = Array.from({ length: rearSteps + 1 }, (_, i) => ring(cutStart * i / rearSteps, surface ? inner : outer, surface ? 'inner' : 'outer'))
    for (let row = 0; row < rearSteps; row++) for (let col = 0; col < sides; col++) {
      const next = (col + 1) % sides
      quad(surface ? inside : outside, rows[row][col], rows[row][next], rows[row + 1][next], rows[row + 1][col], !!surface)
    }
    rear.push(rows)
  }
  const back = [ring(0, outer, 'back'), ring(0, inner, 'back')]
  for (let col = 0; col < sides; col++) {
    const next = (col + 1) % sides
    quad(rims, back[0][col], back[0][next], back[1][next], back[1][col], true)
  }
  for (let half = 0; half < 2; half++) {
    const start = half * sides / 2
    for (let surface = 0; surface < 2; surface++) {
      // Both lips share the rear ring. There is no transverse cap or cut inside the intact body.
      const rows = [Array.from({ length: sides / 2 + 1 }, (_, col) => rear[surface][rearSteps][(start + col) % sides])]
      for (let row = 1; row <= lipSteps; row++) rows.push(ring(cutStart + (end - cutStart) * row / lipSteps, surface ? inner : outer, surface ? 'inner' : 'outer', half, start, sides / 2 + 1))
      for (let row = 0; row < lipSteps; row++) for (let col = 0; col < sides / 2; col++) quad(surface ? inside : outside, rows[row][col], rows[row][col + 1], rows[row + 1][col + 1], rows[row + 1][col], !!surface)
    }
    const front = [ring(end, outer, 'front', half, start, sides / 2 + 1), ring(end, inner, 'front', half, start, sides / 2 + 1)]
    for (let col = 0; col < sides / 2; col++) quad(rims, front[0][col], front[0][col + 1], front[1][col + 1], front[1][col])
    for (let edge = 0; edge < 2; edge++) {
      const rows: number[][] = []
      for (let row = 0; row <= lipSteps; row++) {
        const t = cutStart + (end - cutStart) * row / lipSteps
        rows.push([ring(t, outer, edge ? 'finish' : 'start', half, start + edge * sides / 2, 1)[0], ring(t, inner, edge ? 'finish' : 'start', half, start + edge * sides / 2, 1)[0]])
      }
      for (let row = 0; row < lipSteps; row++) quad(cuts, rows[row][0], rows[row + 1][0], rows[row + 1][1], rows[row][1], !!edge)
    }
  }
  const closedCount = outside.length + inside.length + rims.length
  geometry.setIndex([...outside, ...inside, ...rims, ...cuts])
  const position = new T.Float32BufferAttribute(positions, 3)
  const normal = new T.Float32BufferAttribute(normals, 3)
  geometry.setAttribute('position', position); geometry.setAttribute('normal', normal)
  let wasOpen: boolean | undefined
  function update(value: number) {
    const open = value > .3
    if (wasOpen !== open) {
      const count = open ? geometry.index!.count : closedCount
      // Reuse a single GPU index buffer; the slit walls are drawn only while the lips open.
      geometry.setDrawRange(0, count)
      geometry.clearGroups()
      geometry.addGroup(0, outside.length, 0)
      geometry.addGroup(outside.length, count - outside.length, 1)
      wasOpen = open
    }
    const frames = new Map<string, { centre: T.Vector3; u: T.Vector3; v: T.Vector3; tangent: T.Vector3 }>()
    for (const row of rings) {
      const half = row.t <= cutStart ? undefined : row.half
      const key = `${row.t}:${half ?? 'rear'}`
      let frame = frames.get(key)
      if (!frame) {
        const centre = path.at(row.t, value, half)
        const tangent = path.at(Math.min(end, row.t + .0001), value, half).sub(path.at(Math.max(0, row.t - .0001), value, half)).normalize()
        const u = path.hint(row.t, value)
        u.addScaledVector(tangent, -u.dot(tangent)).normalize()
        frame = { centre, tangent, u, v: new T.Vector3().crossVectors(tangent, u).normalize() }
        frames.set(key, frame)
      }
      const { centre, u, v, tangent } = frame
      for (let col = 0; col < row.count; col++) {
        const angle = -Math.PI / 2 + ((row.start + col) % sides) * Math.PI * 2 / sides
        const cosine = Math.cos(angle), sine = Math.sin(angle)
        const radial = new T.Vector3().addScaledVector(u, cosine).addScaledVector(v, sine)
        const point = centre.clone().addScaledVector(radial, row.radius)
        const n = row.normal === 'front' ? tangent : row.normal === 'back' ? tangent.clone().negate()
          : row.normal === 'inner' ? radial.clone().negate()
          : row.normal === 'outer' ? radial
          : new T.Vector3().addScaledVector(u, -sine).addScaledVector(v, cosine).multiplyScalar(row.normal === 'start' ? -1 : 1)
        position.setXYZ(row.offset + col, point.x, point.y, point.z)
        normal.setXYZ(row.offset + col, n.x, n.y, n.z)
      }
    }
    position.needsUpdate = true; normal.needsUpdate = true
    geometry.computeBoundingBox(); geometry.computeBoundingSphere()
  }
  const mesh = new T.Mesh(geometry, materials)
  mesh.userData.continuousInsulation = true
  return { mesh, update }
}
