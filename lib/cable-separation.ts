import * as T from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { createPeelableInsulation } from './peelable-insulation'
import { morph, separableConductor, smooth, stage } from './layer-separation'
import { buildConductor, conductorMaterials, constructions } from './conductor-models'
import { createPowerCoreGeometry, powerCoreStrands } from './power-cable-cores'

/**
 * Cables whose "Separate layers" control opens them in depth, the way the aerial bunched cable opens: sheaths split
 * and curl back, armour wires flare, cores fan apart and strands spread at their tips, each in turn from the outside
 * in. Every model matches the assembled cable the viewer always showed at separation 0. Local cable axis: Y.
 */
type Window = [number, number]
type Offset = (y: number, value: number) => T.Vector3

function layerKit(name: string) {
  const group = new T.Group()
  group.name = name
  const geometries: T.BufferGeometry[] = []
  const updates: ((value: number) => void)[] = []
  const zero = new T.Vector3()

  /** A continuous sheath or insulation that splits at its front into two lips, which curl outward and back. */
  function peel({ outer, inner, bottom, top, lip, split = 0, window, out, back, centre, sides = 64 }: { outer: number; inner: number; bottom: number; top: number; lip: number; split?: number; window: Window; out: number; back: number; centre?: Offset; sides?: number }, materials: T.Material[], label: string) {
    const cut = .9 - .9 * lip / (top - bottom)
    const u = new T.Vector3(Math.cos(split), 0, Math.sin(split))
    const sleeve = createPeelableInsulation({
      at(t, value, half) {
        const y = bottom + (top - bottom) * t / .9
        const point = new T.Vector3(0, y, 0).add(centre ? centre(y, value) : zero)
        if (half === undefined) return point
        const peeled = stage(value, ...window), along = smooth((t - cut) / (.9 - cut))
        // Like the aerial bunched cable's lips: the halves part sideways and lean back a little, leaving a clear gap.
        return point.addScaledVector(u, (half ? -1 : 1) * peeled * out * along ** 1.2).add(new T.Vector3(0, -peeled * back * along * along, 0))
      },
      hint: () => u.clone(),
    }, materials, { outer, inner, cutStart: cut, end: .9, sides })
    sleeve.mesh.name = label
    group.add(sleeve.mesh)
    updates.push(sleeve.update); geometries.push(sleeve.mesh.geometry)
  }

  /** A ring of round armour wires running the full length and flaring open like a broom over their last stretch. */
  function armour({ count, radius, wire, bottom, top, from, window, fan, back }: { count: number; radius: number; wire: number; bottom: number; top: number; from: number; window: Window; fan: number; back: number }, material: T.Material, label: string) {
    const parts: T.BufferGeometry[] = [], meta: number[] = []
    for (let k = 0; k < count; k++) {
      const angle = k * Math.PI * 2 / count
      const geometry = new T.CylinderGeometry(wire, wire, top - bottom, 10, Math.ceil((top - bottom) * 12), false)
      geometry.translate(Math.cos(angle) * radius, (top + bottom) / 2, Math.sin(angle) * radius)
      for (let i = 0; i < geometry.getAttribute('position').count; i++) meta.push(Math.cos(angle), Math.sin(angle), k)
      parts.push(geometry)
    }
    const geometry = mergeGeometries(parts); parts.forEach(part => part.dispose())
    geometries.push(geometry)
    const mesh = new T.Mesh(geometry, material); mesh.name = label; group.add(mesh)
    const apply = morph(geometry, new Float32Array(meta), 3)
    updates.push(value => {
      const open = stage(value, ...window)
      apply((x, y, z, m, i, out) => {
        if (!open) return
        const along = smooth((y - from) / (top - from)), wireShare = 1 + .14 * Math.sin(m[i + 2] * 2.39)
        const radial = open * fan * along ** 1.5 * wireShare
        out.set(m[i] * radial, -open * back * along * along * wireShare, m[i + 1] * radial)
      })
    })
  }

  /**
   * Straight round strands at `positions` (x, z), from `bottom` to `top`, carried by `offset` (a core fanning out),
   * spreading from `centre` at their tips during `window`. Below `still` they never move, so they stay one segment.
   */
  function strands({ positions, radius, bottom, still, top, offset, centre, window, spread, tipLength }: { positions: [number, number][]; radius: number; bottom: number; still: number; top: number; offset?: Offset; centre: [number, number]; window: Window; spread: number; tipLength: number }, material: T.Material, label: string) {
    const parts: T.BufferGeometry[] = [], meta: number[] = []
    const reach = Math.max(...positions.map(([x, z]) => Math.hypot(x - centre[0], z - centre[1]))) || 1
    positions.forEach(([x, z], k) => {
      const dx = x - centre[0], dz = z - centre[1], distance = Math.hypot(dx, dz)
      for (const [from, to, segments] of [[bottom, still, 1], [still, top, Math.ceil((top - still) * 18)]] as const) {
        const geometry = new T.CylinderGeometry(radius, radius, to - from, 7, segments, false)
        geometry.translate(x, (from + to) / 2, z)
        for (let i = 0; i < geometry.getAttribute('position').count; i++) meta.push(distance ? dx / distance : 0, distance ? dz / distance : 0, distance / reach, k)
        parts.push(geometry)
      }
    })
    const geometry = mergeGeometries(parts); parts.forEach(part => part.dispose())
    geometries.push(geometry)
    const mesh = new T.Mesh(geometry, material); mesh.name = label; group.add(mesh)
    const apply = morph(geometry, new Float32Array(meta), 4)
    updates.push(value => {
      const open = stage(value, ...window)
      apply((x, y, z, m, i, out) => {
        if (offset) out.copy(offset(y, value))
        if (!open || !m[i + 2]) return
        const tip = smooth((y - (top - tipLength)) / tipLength)
        const radial = open * tip * tip * spread * m[i + 2] * (1 + .2 * Math.sin(m[i + 3] * 1.7))
        out.x += m[i] * radial; out.z += m[i + 1] * radial; out.y += open * tip * m[i + 2] * spread * .4
      })
    })
  }

  /** Any other mesh that should travel with a fanning core. */
  function carried(geometry: T.BufferGeometry, material: T.Material, offset: Offset, label: string) {
    geometries.push(geometry)
    const mesh = new T.Mesh(geometry, material); mesh.name = label; group.add(mesh)
    const apply = morph(geometry, new Float32Array(0), 0)
    updates.push(value => apply((x, y, z, m, i, out) => { out.copy(offset(y, value)) }))
  }

  function separate(value: number) { updates.forEach(update => update(T.MathUtils.clamp(value, 0, 1))) }
  return { group, peel, armour, strands, carried, separate, updates, dispose: () => geometries.forEach(geometry => geometry.dispose()) }
}

type CableMaterials = { rubber: T.Material; steel: T.Material; bedding: T.Material; aluminium: T.Material; colours: T.Material[]; blue: T.Material; pale: T.Material; cutFace: T.Material }

/** Two-core PVC or four-core LT XLPE armoured power cable with sector-shaped aluminium conductors. */
export function buildPowerCable(xlpe: boolean, m: CableMaterials) {
  const kit = layerKit(xlpe ? 'Four-core LT XLPE armoured cable' : 'Two-core PVC power cable')
  const count = xlpe ? 4 : 2, coreRadius = xlpe ? .587 : .565, coreBase = xlpe ? 1.75 : .3
  kit.peel({ outer: xlpe ? .8 : .64, inner: xlpe ? .72 : .568, bottom: -2.8, top: .3, lip: 1.4, window: [.03, .32], out: xlpe ? 1.1 : .95, back: xlpe ? .4 : .35 }, [xlpe ? m.blue : m.rubber, m.cutFace], xlpe ? 'Blue outer sheath' : 'Black PVC sheath')
  if (xlpe) {
    kit.armour({ count: 68, radius: .684, wire: .03, bottom: -2.8, top: 1.3, from: -.9, window: [.16, .46], fan: .62, back: .3 }, m.steel, 'Galvanised steel wire armour · 68 wires')
    kit.peel({ outer: .65, inner: .59, bottom: -2.8, top: coreBase, lip: 1.1, split: Math.PI / 2, window: [.36, .62], out: .8, back: .3, sides: 72 }, [m.bedding, m.bedding], 'Inner sheath')
  }
  const strandRadius = .026, positions = powerCoreStrands(count, coreRadius - .052, .064, strandRadius)
  const centroid = positions.reduce((sum, [x, z]) => [sum[0] + x / positions.length, sum[1] + z / positions.length], [0, 0])
  for (let index = 0; index < count; index++) {
    const angle = index * Math.PI * 2 / count + (count === 2 ? Math.PI / 2 : 0)
    const direction = angle + (count === 4 ? Math.PI / 4 : 0)
    const dir = new T.Vector3(Math.cos(direction), 0, Math.sin(direction))
    const top = 3.05 + (index % 2) * .08, insulationTop = top - .55
    // The sectors part like the members of the aerial bunched cable, each along its own radius.
    const offset: Offset = (y, value) => dir.clone().multiplyScalar(stage(value, .58, .9) * (xlpe ? .62 : .5) * smooth((y - (coreBase - .25)) / 2.3) ** 1.2)
    const shell = createPowerCoreGeometry(count, coreRadius, -2.8, insulationTop, Math.ceil((insulationTop + 2.8) * 10))
    shell.rotateY(-angle)
    kit.carried(shell, count === 2 && index === 1 ? m.colours[3] : m.colours[index], offset, `Core ${index + 1} insulation`)
    // Same orientation as the shell: three.js rotateY(-angle) turns (x, z) by +angle.
    const turn = ([x, z]: [number, number]) => [x * Math.cos(angle) - z * Math.sin(angle), x * Math.sin(angle) + z * Math.cos(angle)] as [number, number]
    const rotated = positions.map(turn), centre = turn(centroid as [number, number])
    kit.strands({ positions: rotated, radius: strandRadius, bottom: -2.8, still: coreBase - .3, top, offset, centre, window: [.78, 1], spread: .16, tipLength: .75 }, m.aluminium, `Core ${index + 1} · stranded aluminium`)
  }
  kit.separate(0)
  return kit
}

/**
 * Two-core flat service cable: an oval black sheath around two side-by-side cores, red and black insulated, each with a
 * solid round aluminium conductor. Separating slides the sheath back, parts the cores and peels their insulation.
 */
export function buildServiceCable(m: CableMaterials) {
  const kit = layerKit('Two-core service cable')
  const pitch = .29, insulation = .262, conductor = .165, bottom = -2.8
  // Oval (flat twin) sheath: a stadium-shaped ring, extruded along the cable.
  const stadium = (halfLength: number, radius: number) => {
    const shape = new T.Shape()
    shape.absarc(halfLength, 0, radius, -Math.PI / 2, Math.PI / 2, false)
    shape.absarc(-halfLength, 0, radius, Math.PI / 2, Math.PI * 3 / 2, false)
    return shape
  }
  const outline = stadium(pitch, insulation + .095), hole = stadium(pitch, insulation + .006)
  outline.holes.push(new T.Path(hole.getPoints(48).reverse()))
  const sheathTop = .3, sheath = new T.ExtrudeGeometry(outline, { depth: sheathTop - bottom, steps: 1, curveSegments: 36, bevelEnabled: true, bevelThickness: .012, bevelSize: .01, bevelSegments: 2 })
  sheath.rotateX(-Math.PI / 2)
  sheath.translate(0, bottom, 0)
  kit.carried(sheath, [m.cutFace, m.rubber] as unknown as T.Material, (y, value) => new T.Vector3(0, -stage(value, .03, .38) * 1.1, 0), 'Black oval outer sheath')
  const cores = [{ x: -pitch, colour: m.colours[0], insulationTop: 1.25, top: 2.85, name: 'Red' }, { x: pitch, colour: m.colours[3], insulationTop: .62, top: 2.55, name: 'Black' }]
  cores.forEach((core, index) => {
    // The cores part sideways, each away from the other.
    const offset: Offset = (y, value) => new T.Vector3(Math.sign(core.x) * stage(value, .3, .7) * .32 * smooth((y + .6) / 2.4), 0, 0)
    const centre: Offset = (y, value) => new T.Vector3(core.x, 0, 0).add(offset(y, value))
    kit.peel({ outer: insulation, inner: conductor + .004, bottom, top: core.insulationTop, lip: .7, split: index ? Math.PI : 0, centre, window: [.56, .9], out: .32, back: .14, sides: 56 }, [core.colour, core.colour], `${core.name} insulation`)
    // A solid round aluminium conductor, split along its length so it bends smoothly as the core parts.
    const solid = new T.CylinderGeometry(conductor, conductor, core.top - bottom, 48, 40)
    solid.translate(core.x, (core.top + bottom) / 2, 0)
    kit.carried(solid, m.aluminium, offset, `${core.name} core · solid aluminium conductor`)
  })
  // Turn the flat side towards the viewer, so both cores show side by side.
  kit.group.rotation.y = Math.PI / 2 - .35
  kit.separate(0)
  return kit
}

/** Covered conductor for overhead lines: three extruded coverings over a compacted alloy conductor. */
export function buildCoveredConductor(m: CableMaterials) {
  const kit = layerKit('Covered conductor for overhead lines')
  kit.peel({ outer: .7, inner: .58, bottom: -2.8, top: .25, lip: 1.3, window: [.03, .3], out: 1, back: .35 }, [m.rubber, m.cutFace], 'Black weather-resistant covering')
  const grey = new T.MeshPhysicalMaterial({ color: 0x737b80, roughness: .5, clearcoat: .15 })
  kit.peel({ outer: .58, inner: .42, bottom: -2.8, top: .95, lip: 1.2, split: Math.PI / 2, window: [.24, .5], out: .85, back: .3 }, [grey, grey], 'Light grey XLPE inner covering')
  kit.peel({ outer: .42, inner: .38, bottom: -2.8, top: 1.55, lip: 1, split: Math.PI / 4, window: [.44, .66], out: .65, back: .22 }, [m.bedding, m.bedding], 'Semi-conducting screen')
  const metals = conductorMaterials()
  // 1 + 6 wires whose outer diameter fills the screen (inner radius .38): wire diameter .38 / 1.5, less a hair of clearance.
  const built = buildConductor('aaac', metals, { length: 5.7, wire: .2515, step: .34, layers: constructions.aaac.slice(0, 2) })
  built.group.rotation.x = -Math.PI / 2
  built.group.position.y = 2.9
  kit.group.add(built.group)
  kit.updates.push(separableConductor(built.group, { reach: 1.5, spread: .42, from: .62, to: 1 }))
  kit.separate(0)
  return { ...kit, dispose() { kit.dispose(); built.dispose(); grey.dispose(); Object.values(metals).forEach(material => material.dispose()) } }
}
