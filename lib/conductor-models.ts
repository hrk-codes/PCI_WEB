import * as T from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

/**
 * Procedural overhead conductors, modelled on PCI's own display samples: concentric layers of wires laid in
 * alternating directions, stepped back at the end so every layer shows. Illustrative, not a specification.
 */
export type ConductorKind = 'aac' | 'aaac' | 'acsr' | 'aacsr' | 'acar' | 'eco-panther'
type Metal = 'aluminium' | 'alloy' | 'steel'
type Layer = {count:number, metal:Metal, shape:'round' | 'trapezoid'}

/** Layer build-ups from the centre out (wire counts follow common constructions for each family). */
export const constructions: Record<ConductorKind, Layer[]> = {
  aac:[{count:1, metal:'aluminium', shape:'round'}, {count:6, metal:'aluminium', shape:'round'}, {count:12, metal:'aluminium', shape:'round'}, {count:18, metal:'aluminium', shape:'round'}],
  aaac:[{count:1, metal:'alloy', shape:'round'}, {count:6, metal:'alloy', shape:'round'}, {count:12, metal:'alloy', shape:'round'}, {count:18, metal:'alloy', shape:'round'}],
  acsr:[{count:1, metal:'steel', shape:'round'}, {count:6, metal:'steel', shape:'round'}, {count:12, metal:'aluminium', shape:'round'}, {count:18, metal:'aluminium', shape:'round'}],
  aacsr:[{count:1, metal:'steel', shape:'round'}, {count:6, metal:'steel', shape:'round'}, {count:12, metal:'alloy', shape:'round'}, {count:18, metal:'alloy', shape:'round'}],
  acar:[{count:1, metal:'alloy', shape:'round'}, {count:6, metal:'alloy', shape:'round'}, {count:12, metal:'aluminium', shape:'round'}, {count:18, metal:'aluminium', shape:'round'}],
  'eco-panther':[{count:1, metal:'alloy', shape:'round'}, {count:6, metal:'alloy', shape:'round'}, {count:8, metal:'aluminium', shape:'trapezoid'}, {count:12, metal:'aluminium', shape:'trapezoid'}],
}

export function conductorMaterials() {
  return {
    // Drawn aluminium: bright, slightly cool, fine satin.
    aluminium:new T.MeshPhysicalMaterial({color:0xd3d8dd, metalness:1, roughness:.15, clearcoat:.2, clearcoatRoughness:.25}),
    // Al-Mg-Si alloy: a touch whiter and smoother than plain aluminium.
    alloy:new T.MeshPhysicalMaterial({color:0xe6e9ec, metalness:1, roughness:.11, clearcoat:.3, clearcoatRoughness:.2}),
    // Galvanised steel: darker, warmer zinc grey with a duller sheen.
    steel:new T.MeshPhysicalMaterial({color:0x5f656b, metalness:.88, roughness:.42}),
    // Sawn wire ends: the same metals, a little darker and rougher than the drawn wire surface.
    aluminiumCut:new T.MeshPhysicalMaterial({color:0x76797a, metalness:.55, roughness:.7, envMapIntensity:.22}),
    alloyCut:new T.MeshPhysicalMaterial({color:0x828586, metalness:.55, roughness:.66, envMapIntensity:.26}),
    steelCut:new T.MeshPhysicalMaterial({color:0x3f4549, metalness:.7, roughness:.66, envMapIntensity:.5}),
  }
}

/** Copies the given vertex ranges of a non-indexed geometry into a new geometry. */
function slice(source: T.BufferGeometry, ranges: [number, number][]) {
  const out = new T.BufferGeometry()
  const total = ranges.reduce((sum, [, count]) => sum + count, 0)
  for (const name of ['position', 'normal', 'uv']) {
    const attribute = source.attributes[name] as T.BufferAttribute | undefined
    if (!attribute) continue
    const size = attribute.itemSize, array = new Float32Array(total * size)
    let offset = 0
    for (const [start, count] of ranges) { array.set((attribute.array as Float32Array).subarray(start * size, (start + count) * size), offset); offset += count * size }
    out.setAttribute(name, new T.BufferAttribute(array, size))
  }
  return out
}
/** Splits a wire into its drawn surface and its sawn end faces, using the face groups three.js assigns. */
function splitEnds(geometry: T.BufferGeometry, endGroups: Set<number>) {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry
  const sides: [number, number][] = [], ends: [number, number][] = []
  for (const group of flat.groups) (endGroups.has(group.materialIndex ?? 0) ? ends : sides).push([group.start, group.count])
  if (!flat.groups.length) sides.push([0, flat.attributes.position.count])
  const result = {sides:slice(flat, sides), ends:slice(flat, ends)}
  if (flat !== geometry) flat.dispose()
  return result
}

/** Twists a straight (along +z) geometry into a helix about the z axis: `turnsPerUnit` full turns per unit length. */
function twist(geo: T.BufferGeometry, turnsPerUnit: number) {
  const p = geo.attributes.position, n = geo.attributes.normal
  for (let i = 0; i < p.count; i++) {
    const a = p.getZ(i) * turnsPerUnit * Math.PI * 2, c = Math.cos(a), s = Math.sin(a)
    const x = p.getX(i), y = p.getY(i)
    p.setXY(i, x * c - y * s, x * s + y * c)
    if (n) { const nx = n.getX(i), ny = n.getY(i); n.setXY(i, nx * c - ny * s, nx * s + ny * c) }
  }
  p.needsUpdate = true
  if (n) n.needsUpdate = true
  return geo
}

/**
 * Builds a conductor along +z, its stepped end at z = 0 and its body running back to z = -length.
 * `wire` is the round wire diameter; trapezoidal layers keep the same layer thickness.
 */
export function buildConductor(kind: ConductorKind, materials = conductorMaterials(), {length = 14, wire = .2, step = .55, layers: selectedLayers = constructions[kind]}: {length?:number; wire?:number; step?:number; layers?:Layer[]} = {}) {
  const group = new T.Group()
  const layers = selectedLayers
  const geometries: T.BufferGeometry[] = []
  let inner = 0
  const lay = 11 * wire * layers.length // lay length grows with the conductor diameter, as in real stranding
  layers.forEach((layer, index) => {
    const outer = index === 0 ? wire / 2 : inner + wire
    const centre = index === 0 ? 0 : (inner + outer) / 2
    const end = -index * step                           // each outer layer stops earlier: the stepped cutaway
    const len = length + end
    const direction = index % 2 ? 1 : -1                // alternate lay directions, like the real thing
    const turns = index === 0 ? 0 : direction / lay
    const parts: T.BufferGeometry[] = [], ends: T.BufferGeometry[] = []
    for (let k = 0; k < layer.count; k++) {
      const angle = k / layer.count * Math.PI * 2
      let g: T.BufferGeometry
      if (layer.shape === 'round' || index === 0) {
        const r = index === 0 ? wire / 2 : Math.min(wire / 2, Math.sin(Math.PI / layer.count) * centre) * .985
        g = new T.CylinderGeometry(r, r, len, 18, Math.max(2, Math.round(len * 10)), false)
        g.rotateX(Math.PI / 2)
        g.translate(Math.cos(angle) * centre, Math.sin(angle) * centre, end - len / 2)
      } else {
        // Trapezoidal (TW) wire: an annular sector with softened corners and a hairline gap to its neighbours.
        const span = Math.PI * 2 / layer.count, gap = .022 / centre, a0 = angle - span / 2 + gap / 2, a1 = angle + span / 2 - gap / 2
        const ri = inner + .004, ro = outer - .004, shape = new T.Shape()
        const steps = 10
        shape.moveTo(Math.cos(a0) * ri, Math.sin(a0) * ri)
        for (let s = 0; s <= steps; s++) { const a = a0 + (a1 - a0) * s / steps; shape.lineTo(Math.cos(a) * ro, Math.sin(a) * ro) }
        for (let s = steps; s >= 0; s--) { const a = a0 + (a1 - a0) * s / steps; shape.lineTo(Math.cos(a) * ri, Math.sin(a) * ri) }
        g = new T.ExtrudeGeometry(shape, {depth:len, steps:Math.max(2, Math.round(len * 10)), bevelEnabled:true, bevelThickness:.012, bevelSize:.01, bevelSegments:3, curveSegments:4})
        g.translate(0, 0, end - len)
      }
      if (turns) twist(g, turns)
      // Cylinder caps are groups 1 and 2; extruded (trapezoidal) lids are group 0.
      const split = splitEnds(g, layer.shape === 'round' || index === 0 ? new Set([1, 2]) : new Set([0]))
      g.dispose()
      parts.push(split.sides); ends.push(split.ends)
    }
    const merged = mergeGeometries(parts), mergedEnds = mergeGeometries(ends)
    parts.forEach(g => g.dispose()); ends.forEach(g => g.dispose())
    geometries.push(merged, mergedEnds)
    // One group per layer, so callers that move layers (the product viewer's separation) keep each wire whole.
    const layerGroup = new T.Group()
    layerGroup.add(new T.Mesh(merged, materials[layer.metal]), new T.Mesh(mergedEnds, materials[`${layer.metal}Cut` as const]))
    group.add(layerGroup)
    inner = outer
  })
  return {group, radius:inner, dispose:() => geometries.forEach(g => g.dispose())}
}
