import * as T from 'three'

/** Illustrative five-member ABC, not a dimensioned catalogue construction. Local cable axis: Y. */
export function buildAerialBunch() {
  const group = new T.Group()
  group.name = 'Twisted aerial bunch · four insulated members and a bare messenger'
  const jacket = new T.MeshPhysicalMaterial({ color: 0x11171b, roughness: .4, metalness: .08, clearcoat: .2, clearcoatRoughness: .4 })
  const lining = new T.MeshStandardMaterial({ color: 0x30383b, roughness: .66 })
  const aluminium = new T.MeshStandardMaterial({ color: 0xb9c2c8, metalness: 1, roughness: .24 })
  jacket.name = 'Black insulation'; lining.name = 'Insulation cut face'; aluminium.name = 'Stranded aluminium'
  const geometries: T.BufferGeometry[] = []
  const updates: ((value: number) => void)[] = []
  const tau = Math.PI * 2
  // One broad quarter-turn across the visible length, rather than a tightly wound rope.
  const layTurns = .3
  const smooth = (value: number) => T.MathUtils.smoothstep(value, 0, 1)
  const stage = (value: number, start: number, end: number) => smooth((value - start) / (end - start))
  type Frame = { centre: T.Vector3; u: T.Vector3; v: T.Vector3 }
  type Section = { contour: T.Vector2[]; at: (t: number, value: number) => T.Vector3; hint: (t: number, value: number) => T.Vector3; steps: number; outerSides?: number }

  function member(t: number, phase: number, value: number, bare = false): Frame {
    const fan = stage(value, 0, .48)
    const progress = T.MathUtils.clamp((t - .08) / .92, 0, 1)
    const opening = smooth(progress)
    const openingSlope = (6 * progress - 6 * progress * progress) / .92
    // The lay eases into parallel cut ends, keeping all five terminations legible.
    const end = T.MathUtils.clamp((t - .76) / .18, 0, 1)
    const lay = t < .76 ? t : .76 + .18 * (end - end * end / 2)
    const angle = phase + tau * layTurns * (lay - .5) * (1 - .28 * fan * opening)
    // The smaller bare member follows an outside valley between two insulated members.
    const spread = bare ? 1.35 : 1.03
    const radius = (bare ? .64 : .46) + spread * fan * opening
    const centre = new T.Vector3(Math.cos(angle) * radius, -3.1 + 6.2 * t, Math.sin(angle) * radius)
    // Radial section orientation follows the lay without an arbitrary Frenet-frame flip.
    const u = new T.Vector3(Math.cos(angle), 0, Math.sin(angle))
    const slope = tau * layTurns * ((1 - end) * (1 - .28 * fan * opening) - (lay - .5) * .28 * fan * openingSlope)
    const radialSlope = spread * fan * openingSlope
    const tangent = new T.Vector3(Math.cos(angle) * radialSlope - Math.sin(angle) * radius * slope, 6.2, Math.sin(angle) * radialSlope + Math.cos(angle) * radius * slope).normalize()
    u.addScaledVector(tangent, -u.dot(tangent)).normalize()
    return { centre, u, v: new T.Vector3().crossVectors(tangent, u).normalize() }
  }

  /** Closed swept solids, including real end faces. Buffers are reused when the slider changes. */
  function sweeps(sections: Section[], materials: T.Material | T.Material[], name: string) {
    const vertices: number[] = [], indices: number[] = []
    const ranges: { section: Section; offset: number; capOffset: number; count: number }[] = []
    const geometry = new T.BufferGeometry()
    for (const section of sections) {
      const offset = vertices.length / 3, count = section.contour.length
      vertices.push(...new Array((section.steps + 1) * count * 3).fill(0))
      // One contiguous draw group for each finish, rather than one draw call per ring.
      for (const [start, end, material] of section.outerSides === undefined ? [[0, count, 0]] : [[0, section.outerSides, 0], [section.outerSides, count, 1]]) {
        const firstIndex = indices.length
        for (let row = 0; row < section.steps; row++) for (let col = start; col < end; col++) {
          const a = offset + row * count + col, b = offset + row * count + (col + 1) % count
          indices.push(a, b, b + count, a, b + count, a + count)
        }
        geometry.addGroup(firstIndex, indices.length - firstIndex, material)
      }
      // Separate vertices keep the aluminium cut ends flat and the insulation rims crisp.
      const capOffset = vertices.length / 3
      vertices.push(...new Array(count * 2 * 3).fill(0))
      const capIndex = indices.length
      const triangles = T.ShapeUtils.triangulateShape(section.contour, [])
      for (const [a, b, c] of triangles) {
        indices.push(capOffset + c, capOffset + b, capOffset + a)
        indices.push(capOffset + count + a, capOffset + count + b, capOffset + count + c)
      }
      geometry.addGroup(capIndex, indices.length - capIndex, section.outerSides === undefined ? 0 : 1)
      ranges.push({ section, offset, capOffset, count })
    }
    geometry.setAttribute('position', new T.Float32BufferAttribute(vertices, 3))
    geometry.setIndex(indices)
    const position = geometry.getAttribute('position') as T.BufferAttribute
    function update(value: number) {
      for (const { section, offset, capOffset, count } of ranges) {
        for (let row = 0; row <= section.steps; row++) {
          const t = row / section.steps
          const centre = section.at(t, value)
          const tangent = section.at(Math.min(1, t + .0001), value).sub(section.at(Math.max(0, t - .0001), value)).normalize()
          const u = section.hint(t, value)
          u.addScaledVector(tangent, -u.dot(tangent)).normalize()
          const v = new T.Vector3().crossVectors(tangent, u).normalize()
          section.contour.forEach((point, col) => {
            const x = centre.x + u.x * point.x + v.x * point.y
            const y = centre.y + u.y * point.x + v.y * point.y
            const z = centre.z + u.z * point.x + v.z * point.y
            position.setXYZ(offset + row * count + col, x, y, z)
            if (row === 0 || row === section.steps) position.setXYZ(capOffset + (row === 0 ? 0 : count) + col, x, y, z)
          })
        }
      }
      position.needsUpdate = true
      geometry.computeVertexNormals()
      geometry.computeBoundingBox(); geometry.computeBoundingSphere()
    }
    updates.push(update); geometries.push(geometry)
    const mesh = new T.Mesh(geometry, materials)
    mesh.name = name
    group.add(mesh)
    return mesh
  }

  const circle = (radius: number) => Array.from({ length: 12 }, (_, i) => new T.Vector2(Math.cos(i * tau / 12) * radius, Math.sin(i * tau / 12) * radius))
  // A half-annulus is solid insulation, not a transparent surface or an empty black disc.
  function shellContour(half: number) {
    const points: T.Vector2[] = []
    for (let i = 0; i <= 32; i++) {
      const angle = half * Math.PI - Math.PI / 2 + i * Math.PI / 32
      points.push(new T.Vector2(Math.cos(angle) * .293, Math.sin(angle) * .293))
    }
    for (let i = 32; i >= 0; i--) {
      const angle = half * Math.PI - Math.PI / 2 + i * Math.PI / 32
      points.push(new T.Vector2(Math.cos(angle) * .224, Math.sin(angle) * .224))
    }
    return points
  }

  for (let index = 0; index < 5; index++) {
    const bare = index === 4, phase = bare ? Math.PI * 3 / 4 : index * tau / 4
    const assembly = new T.Group()
    assembly.name = bare ? 'Bare aluminium messenger · smaller diameter' : `Insulated aluminium member ${index + 1}`
    assembly.userData = { member: index + 1, insulated: !bare, outerRadius: bare ? .119 : .293 }
    group.add(assembly)
    const frame = (t: number, value: number): Frame => {
      const f = member(t, phase, value, bare)
      if (bare) f.centre.y += .28 * smooth((t - .85) / .15)
      return f
    }
    function attach(mesh: T.Mesh) { group.remove(mesh); assembly.add(mesh) }

    if (!bare) for (let half = 0; half < 2; half++) {
      const direction = half ? -1 : 1
      const path = (t: number, value: number) => {
        const along = t * .9
        const f = frame(along, value)
        const peel = stage(value, .3, .82) * smooth((along - .5) / .4)
        // Split insulation curls away from the aluminium towards two opposite sides.
        return f.centre.addScaledVector(f.u, direction * peel * .72).add(new T.Vector3(0, -peel * .28, 0))
      }
      const mesh = sweeps([{ contour: shellContour(half), at: path, hint: (t, value) => frame(t * .9, value).u, steps: 80, outerSides: 32 }], [jacket, lining], `Black insulation · member ${index + 1} · half ${half + 1}`)
      attach(mesh)
    }

    const strandRadius = bare ? .039 : .042
    const sections: Section[] = []
    const rings = bare ? 1 : 2
    for (let ring = 0; ring <= rings; ring++) for (let strand = 0; strand < (ring ? ring * 6 : 1); strand++) {
      const start = ring ? strand * tau / (ring * 6) : 0
      sections.push({
        contour: circle(strandRadius), steps: 100,
        at(t, value) {
          const f = frame(t, value)
          const reveal = stage(value, .6, 1) * smooth((t - .78) / .22)
          const radius = ring * strandRadius * 2.025 + reveal * ring * (bare ? .025 : .08)
          const angle = start + (ring % 2 ? -1 : 1) * tau * (bare ? 2.1 : 1.65) * t
          return f.centre.addScaledVector(f.u, Math.cos(angle) * radius).addScaledVector(f.v, Math.sin(angle) * radius)
            .add(new T.Vector3(0, reveal * (ring * .14 + .035 * Math.cos(start)), 0))
        },
        hint: (t, value) => frame(t, value).u,
      })
    }
    const metal = sweeps(sections, aluminium, bare ? 'Bare seven-strand aluminium messenger' : `Nineteen aluminium strands · member ${index + 1}`)
    metal.userData.strandCount = bare ? 7 : 19
    attach(metal)
  }

  function separate(value: number) { updates.forEach(update => update(T.MathUtils.clamp(value, 0, 1))) }
  separate(0)
  return {
    group, separate,
    dispose() { geometries.forEach(geometry => geometry.dispose()); jacket.dispose(); lining.dispose(); aluminium.dispose() },
  }
}
