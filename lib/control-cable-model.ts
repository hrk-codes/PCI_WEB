import * as T from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { createPeelableInsulation } from './peelable-insulation'
import { morph, smooth, stage } from './layer-separation'

type Materials = { rubber: T.Material; steel: T.Material; bedding: T.Material; colours: T.Material[]; copper: T.Material }

/**
 * PCI's four-core armoured copper control cable, built from continuous layers so "Separate layers" opens it the way
 * the aerial bunched cable opens: the outer sheath splits and curls back, the galvanised armour wires flare out,
 * the inner sheath peels, the four cores fan apart with their own insulation peeling, and the copper strands spread
 * at the tips. Illustrative, not a dimensioned construction. Local cable axis: Y. At separation 0 it matches the
 * assembled model the viewer always showed.
 */
export function buildControlCable({ rubber, steel, bedding, colours, copper }: Materials) {
  const group = new T.Group()
  group.name = 'Four-core armoured copper control cable'
  const lining = new T.MeshStandardMaterial({ color: 0x2c3236, roughness: .7 })
  lining.name = 'Sheath cut face'
  const geometries: T.BufferGeometry[] = []
  const updates: ((value: number) => void)[] = []
  const tau = Math.PI * 2

  /** Merges parts, keeping `meta` numbers for every vertex of each part (in merge order). */
  function merged(parts: { geometry: T.BufferGeometry; meta: number[] }[]) {
    const size = parts[0].meta.length, meta: number[] = []
    for (const part of parts) for (let i = 0; i < part.geometry.getAttribute('position').count; i++) meta.push(...part.meta)
    const geometry = mergeGeometries(parts.map(part => part.geometry))
    parts.forEach(part => part.geometry.dispose())
    geometries.push(geometry)
    return { geometry, meta: new Float32Array(meta), size }
  }
  function peel(options: Parameters<typeof createPeelableInsulation>[2], path: Parameters<typeof createPeelableInsulation>[0], materials: T.Material[], name: string) {
    const sleeve = createPeelableInsulation(path, materials, options)
    sleeve.mesh.name = name
    group.add(sleeve.mesh)
    updates.push(sleeve.update); geometries.push(sleeve.mesh.geometry)
  }

  // Outer PVC sheath: splits into two lips that curl outward and back.
  {
    const bottom = -3.15, top = -.2, u = new T.Vector3(1, 0, 0)
    peel({ outer: .72, inner: .65, cutStart: .42, end: .9 }, {
      at(t, value, half) {
        const centre = new T.Vector3(0, bottom + (top - bottom) * t / .9, 0)
        if (half === undefined) return centre
        // Like the aerial bunched cable's lips: the halves part sideways and lean back a little, leaving a clear gap.
        const peeled = stage(value, .03, .34), along = smooth((t - .42) / .48)
        return centre.addScaledVector(u, (half ? -1 : 1) * peeled * .95 * along ** 1.2).add(new T.Vector3(0, -peeled * .3 * along * along, 0))
      },
      hint: () => u.clone(),
    }, [rubber, lining], 'Outer PVC sheath')
  }

  // Galvanised round-wire armour: 52 wires running the full length, flaring open like a broom at the front.
  const armourTop = .72, armourFrom = -1.25
  {
    const parts = []
    for (let k = 0; k < 52; k++) {
      const angle = k * tau / 52
      const geometry = new T.CylinderGeometry(.031, .031, armourTop + 3.15, 10, 48, false)
      geometry.translate(Math.cos(angle) * .61, (armourTop - 3.15) / 2, Math.sin(angle) * .61)
      parts.push({ geometry, meta: [Math.cos(angle), Math.sin(angle), k] })
    }
    const { geometry, meta } = merged(parts)
    const mesh = new T.Mesh(geometry, steel)
    mesh.name = 'Galvanised steel wire armour · 52 wires'
    group.add(mesh)
    const apply = morph(geometry, meta, 3)
    updates.push(value => {
      const open = stage(value, .16, .5)
      apply((x, y, z, m, i, out) => {
        if (!open) return
        const along = smooth((y - armourFrom) / (armourTop - armourFrom))
        const wire = 1 + .14 * Math.sin(m[i + 2] * 2.39)
        const radial = open * .62 * along ** 1.5 * wire
        out.set(m[i] * radial, -open * .28 * along * along * wire, m[i + 1] * radial)
      })
    })
  }

  // Inner sheath (bedding): peels at its front, at right angles to the outer sheath.
  {
    const bottom = -3.1, top = 1.35, u = new T.Vector3(0, 0, 1)
    peel({ outer: .57, inner: .52, cutStart: .7, end: .9 }, {
      at(t, value, half) {
        const centre = new T.Vector3(0, bottom + (top - bottom) * t / .9, 0)
        if (half === undefined) return centre
        const lip = stage(value, .4, .7) * smooth((t - .7) / .2)
        return centre.addScaledVector(u, (half ? -1 : 1) * lip * .85).add(new T.Vector3(0, -lip * .22, 0))
      },
      hint: () => u.clone(),
    }, [bedding, bedding], 'Inner sheath')
  }

  // Four colour-coded cores: they fan apart above the inner sheath, each insulation peels, the copper spreads.
  const ends = [2.98, 2.87, 3.06, 2.92], names = ['Red', 'Yellow', 'Blue', 'Black'], coreBottom = -3.1
  const fanOf = (y: number, value: number, k: number) => stage(value, .58, .9) * (.95 + .12 * (k % 2)) * smooth((y - .35) / 2.5) ** 1.25
  const strandRadius = .14 / 5.15
  for (let k = 0; k < 4; k++) {
    const cx = k % 2 ? .21 : -.21, cz = k < 2 ? .21 : -.21
    const direction = new T.Vector3(cx, 0, cz).normalize()
    const side = new T.Vector3(-direction.z, 0, direction.x)
    const end = ends[k]
    const centre = (y: number, value: number) => new T.Vector3(cx, y, cz).addScaledVector(direction, fanOf(y, value, k))
    const cut = .9 - .9 * .85 / (end - coreBottom)
    peel({ outer: .2, inner: .145, cutStart: cut, end: .9, sides: 40 }, {
      at(t, value, half) {
        const point = centre(coreBottom + (end - coreBottom) * t / .9, value)
        if (half === undefined) return point
        const lip = stage(value, .7, .95) * smooth((t - cut) / (.9 - cut))
        return point.addScaledVector(side, (half ? -1 : 1) * lip * .3).add(new T.Vector3(0, -lip * .14, 0))
      },
      hint: () => side.clone(),
    }, [colours[k], colours[k]], `${names[k]} core insulation`)

    // 19 copper strands, 0.56 longer than the insulation, splaying at the tips once the core is open.
    const parts = [], top = end + .56
    const positions: [number, number, number][] = [[0, 0, 0]]
    for (let ring = 1; ring <= 2; ring++) for (let s = 0; s < ring * 6; s++) positions.push([ring, s * tau / (ring * 6), s])
    for (const [ring, angle, s] of positions) {
      const geometry = new T.CylinderGeometry(strandRadius, strandRadius, top - coreBottom, 8, 90, false)
      const dx = Math.cos(angle), dz = Math.sin(angle)
      geometry.translate(cx + dx * ring * strandRadius * 2.03, (top + coreBottom) / 2, cz + dz * ring * strandRadius * 2.03)
      parts.push({ geometry, meta: [dx, dz, ring, s] })
    }
    const { geometry, meta } = merged(parts)
    const mesh = new T.Mesh(geometry, copper)
    mesh.name = `${names[k]} core · stranded copper`
    group.add(mesh)
    const apply = morph(geometry, meta, 4)
    updates.push(value => {
      const spread = stage(value, .78, 1)
      apply((x, y, z, m, i, out) => {
        const fan = fanOf(y, value, k)
        out.set(direction.x * fan, 0, direction.z * fan)
        if (!spread || !m[i + 2]) return
        const tip = smooth((y - (end - .45)) / (top - end + .45))
        const radial = spread * tip * tip * m[i + 2] * .085 * (1 + .2 * Math.sin(m[i + 3] * 1.7 + k))
        out.x += m[i] * radial; out.z += m[i + 1] * radial
        out.y += spread * tip * m[i + 2] * .05
      })
    })
  }

  function separate(value: number) { updates.forEach(update => update(T.MathUtils.clamp(value, 0, 1))) }
  separate(0)
  return {
    group, separate,
    dispose() { geometries.forEach(geometry => geometry.dispose()); lining.dispose() },
  }
}
