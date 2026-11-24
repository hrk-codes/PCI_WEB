import * as T from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

/**
 * Procedural overhead conductors, modelled on PCI's own display samples: concentric layers of wires laid in
 * alternating directions, stepped back at the end so every layer shows. Illustrative, not a specification.
 */
/**
 * A layer from the centre out. `round` wires and `trapezoid` (TW) wires lay helically; a `tube` is one continuous
 * sleeve (a composite core's glass fibre layer, a gap conductor's grease). `size` scales the layer's thickness (the
 * wire diameter for round wires; a solid composite core is larger than a wire), and `gap` leaves radial clearance
 * inside the layer.
 */
export type ConductorLayer = {count:number, metal:Metal, shape:'round' | 'trapezoid' | 'tube', size?:number, gap?:number}
export type ConductorKind = 'aac' | 'aaac' | 'acsr' | 'aacsr' | 'acar' | 'eco-panther' | 'acss' | 'carbon-core' | 'invar' | 'gap' | 'tacsr' | 'copper-conductor' | 'bec'
type Metal = 'aluminium' | 'alloy' | 'steel' | 'annealed' | 'thermal' | 'invar' | 'copper' | 'zinc' | 'carbon' | 'glass' | 'grease'
type Layer = ConductorLayer

/** Layer build-ups from the centre out (wire counts follow common constructions for each family). */
export const constructions: Record<ConductorKind, Layer[]> = {
  aac:[{count:1, metal:'aluminium', shape:'round'}, {count:6, metal:'aluminium', shape:'round'}, {count:12, metal:'aluminium', shape:'round'}, {count:18, metal:'aluminium', shape:'round'}],
  aaac:[{count:1, metal:'alloy', shape:'round'}, {count:6, metal:'alloy', shape:'round'}, {count:12, metal:'alloy', shape:'round'}, {count:18, metal:'alloy', shape:'round'}],
  acsr:[{count:1, metal:'steel', shape:'round'}, {count:6, metal:'steel', shape:'round'}, {count:12, metal:'aluminium', shape:'round'}, {count:18, metal:'aluminium', shape:'round'}],
  aacsr:[{count:1, metal:'steel', shape:'round'}, {count:6, metal:'steel', shape:'round'}, {count:12, metal:'alloy', shape:'round'}, {count:18, metal:'alloy', shape:'round'}],
  acar:[{count:1, metal:'alloy', shape:'round'}, {count:6, metal:'alloy', shape:'round'}, {count:12, metal:'aluminium', shape:'round'}, {count:18, metal:'aluminium', shape:'round'}],
  'eco-panther':[{count:1, metal:'alloy', shape:'round'}, {count:6, metal:'alloy', shape:'round'}, {count:8, metal:'aluminium', shape:'trapezoid'}, {count:12, metal:'aluminium', shape:'trapezoid'}],
  // HTLS. ACSS: annealed aluminium on a coated steel core (26/7 style).
  acss:[{count:1, metal:'steel', shape:'round'}, {count:6, metal:'steel', shape:'round'}, {count:10, metal:'annealed', shape:'round'}, {count:16, metal:'annealed', shape:'round'}],
  // Carbon core: a solid carbon fibre rod in a glass fibre sleeve, then trapezoidal annealed aluminium (9 + 13).
  'carbon-core':[{count:1, metal:'carbon', shape:'round', size:2.2}, {count:1, metal:'glass', shape:'tube', size:.32}, {count:9, metal:'annealed', shape:'trapezoid', size:1.15}, {count:13, metal:'annealed', shape:'trapezoid', size:1.15}],
  // INVAR: aluminium-clad Invar core (1 + 6), super thermal-resistant Al-Zr alloy outer wires (12 + 18).
  invar:[{count:1, metal:'invar', shape:'round'}, {count:6, metal:'invar', shape:'round'}, {count:12, metal:'thermal', shape:'round'}, {count:18, metal:'thermal', shape:'round'}],
  // GAP: steel core, a grease-filled gap, a self-supporting trapezoidal alloy layer, then round alloy wires.
  gap:[{count:1, metal:'steel', shape:'round'}, {count:6, metal:'steel', shape:'round'}, {count:1, metal:'grease', shape:'tube', size:.38}, {count:10, metal:'thermal', shape:'trapezoid'}, {count:16, metal:'thermal', shape:'round'}],
  // TACSR: thermal-resistant alloy over a galvanised steel core (54/7 style).
  tacsr:[{count:1, metal:'steel', shape:'round'}, {count:6, metal:'steel', shape:'round'}, {count:12, metal:'thermal', shape:'round'}, {count:18, metal:'thermal', shape:'round'}, {count:24, metal:'thermal', shape:'round'}],
  'copper-conductor':[{count:1, metal:'copper', shape:'round'}, {count:6, metal:'copper', shape:'round'}, {count:12, metal:'copper', shape:'round'}],
  // BEC: bright galvanised steel strand, 19 wires (1 + 6 + 12), laid long and cut flush.
  bec:[{count:1, metal:'zinc', shape:'round'}, {count:6, metal:'zinc', shape:'round'}, {count:12, metal:'zinc', shape:'round'}],
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
    // Annealed (O-temper) aluminium: softer and less glossy than hard-drawn wire, a touch warmer.
    annealed:new T.MeshPhysicalMaterial({color:0xcfd1cf, metalness:1, roughness:.28, clearcoat:.08, clearcoatRoughness:.5}),
    annealedCut:new T.MeshPhysicalMaterial({color:0x7a7a77, metalness:.55, roughness:.72, envMapIntensity:.22}),
    // Thermal-resistant Al-Zr alloy: bright, with a faintly cooler tint than plain aluminium.
    thermal:new T.MeshPhysicalMaterial({color:0xdde3ea, metalness:1, roughness:.17, clearcoat:.22, clearcoatRoughness:.25}),
    thermalCut:new T.MeshPhysicalMaterial({color:0x7c8087, metalness:.55, roughness:.68, envMapIntensity:.24}),
    // Aluminium-clad Invar: a silver cladding a little duller and greyer than the conductor wires around it.
    invar:new T.MeshPhysicalMaterial({color:0xa9b0b6, metalness:.95, roughness:.3}),
    invarCut:new T.MeshPhysicalMaterial({color:0x55595c, metalness:.7, roughness:.62, envMapIntensity:.4}),
    // Hard-drawn copper.
    copper:new T.MeshPhysicalMaterial({color:0xd0875a, metalness:1, roughness:.2, clearcoat:.2, clearcoatRoughness:.3}),
    copperCut:new T.MeshPhysicalMaterial({color:0x8a4f2e, metalness:.6, roughness:.62, envMapIntensity:.3}),
    // Hot-dip galvanising: a bright, slightly satin zinc silver.
    zinc:new T.MeshPhysicalMaterial({color:0xc6ccd0, metalness:.92, roughness:.26, clearcoat:.15, clearcoatRoughness:.3}),
    zincCut:new T.MeshPhysicalMaterial({color:0x4a5155, metalness:.7, roughness:.66, envMapIntensity:.45}),
    // Carbon fibre composite: near-black satin.
    carbon:new T.MeshPhysicalMaterial({color:0x1a1c1f, metalness:.15, roughness:.38, clearcoat:.6, clearcoatRoughness:.3}),
    carbonCut:new T.MeshPhysicalMaterial({color:0x0f1012, metalness:.1, roughness:.8}),
    // Glass fibre composite sleeve: a pale amber.
    glass:new T.MeshPhysicalMaterial({color:0xc9b98a, metalness:0, roughness:.35, clearcoat:.8, clearcoatRoughness:.15}),
    glassCut:new T.MeshPhysicalMaterial({color:0x9c8c5e, metalness:0, roughness:.6}),
    // High-temperature grease: dark amber with a wet sheen.
    grease:new T.MeshPhysicalMaterial({color:0x5a3a12, metalness:0, roughness:.18, clearcoat:1, clearcoatRoughness:.08}),
    greaseCut:new T.MeshPhysicalMaterial({color:0x3d2609, metalness:0, roughness:.3, clearcoat:.6}),
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
export function buildConductor(kind: ConductorKind, materials = conductorMaterials(), {length = 14, wire = .2, step = .55, layers: selectedLayers = constructions[kind], segmentsPerUnit = 10, layScale = 1}: {length?:number; wire?:number; step?:number; layers?:Layer[]; segmentsPerUnit?:number; layScale?:number} = {}) {
  const group = new T.Group()
  const layers = selectedLayers
  const geometries: T.BufferGeometry[] = []
  let inner = 0
  const lay = 11 * wire * layers.length * layScale // lay length grows with the conductor diameter, as in real stranding
  layers.forEach((layer, index) => {
    const thickness = wire * (layer.size ?? (layer.shape === 'tube' ? .5 : 1)), gap = (layer.gap ?? 0) * wire
    const base = inner + gap                            // inner surface of this layer, after any radial gap
    const outer = index === 0 ? thickness / 2 : base + thickness
    const centre = index === 0 ? 0 : (base + outer) / 2
    const end = -index * step                           // each outer layer stops earlier: the stepped cutaway
    const len = length + end
    const direction = index % 2 ? 1 : -1                // alternate lay directions, like the real thing
    const turns = index === 0 || layer.shape === 'tube' ? 0 : direction / lay
    const parts: T.BufferGeometry[] = [], ends: T.BufferGeometry[] = []
    for (let k = 0; k < layer.count; k++) {
      const angle = k / layer.count * Math.PI * 2
      let g: T.BufferGeometry
      if (layer.shape === 'tube') {
        // One continuous sleeve: an annulus extruded along the conductor.
        const shape = new T.Shape().absarc(0, 0, outer - .003, 0, Math.PI * 2, false)
        shape.holes.push(new T.Path().absarc(0, 0, base + .003, 0, Math.PI * 2, true))
        g = new T.ExtrudeGeometry(shape, {depth:len, steps:Math.max(2, Math.round(len * segmentsPerUnit)), bevelEnabled:false, curveSegments:48})
        g.translate(0, 0, end - len)
      } else if (layer.shape === 'round' || index === 0) {
        const r = index === 0 ? thickness / 2 : Math.min(thickness / 2, Math.sin(Math.PI / layer.count) * centre) * .985
        g = new T.CylinderGeometry(r, r, len, 18, Math.max(2, Math.round(len * segmentsPerUnit)), false)
        g.rotateX(Math.PI / 2)
        g.translate(Math.cos(angle) * centre, Math.sin(angle) * centre, end - len / 2)
      } else {
        // Trapezoidal (TW) wire: an annular sector with softened corners and a hairline gap to its neighbours.
        const span = Math.PI * 2 / layer.count, gap = .022 / centre, a0 = angle - span / 2 + gap / 2, a1 = angle + span / 2 - gap / 2
        const ri = base + .004, ro = outer - .004, shape = new T.Shape()
        const steps = 10
        shape.moveTo(Math.cos(a0) * ri, Math.sin(a0) * ri)
        for (let s = 0; s <= steps; s++) { const a = a0 + (a1 - a0) * s / steps; shape.lineTo(Math.cos(a) * ro, Math.sin(a) * ro) }
        for (let s = steps; s >= 0; s--) { const a = a0 + (a1 - a0) * s / steps; shape.lineTo(Math.cos(a) * ri, Math.sin(a) * ri) }
        g = new T.ExtrudeGeometry(shape, {depth:len, steps:Math.max(2, Math.round(len * segmentsPerUnit)), bevelEnabled:true, bevelThickness:.012, bevelSize:.01, bevelSegments:3, curveSegments:4})
        g.translate(0, 0, end - len)
      }
      if (turns) twist(g, turns)
      // Cylinder caps are groups 1 and 2; extruded (trapezoidal) lids are group 0.
      const split = splitEnds(g, (layer.shape === 'round' || index === 0) && layer.shape !== 'tube' ? new Set([1, 2]) : new Set([0]))
      g.dispose()
      parts.push(split.sides); ends.push(split.ends)
    }
    const merged = mergeGeometries(parts), mergedEnds = mergeGeometries(ends)
    parts.forEach(g => g.dispose()); ends.forEach(g => g.dispose())
    geometries.push(merged, mergedEnds)
    // One group per layer, so callers that move layers (the product viewer's separation) keep each wire whole.
    const layerGroup = new T.Group()
    // Read by the product viewer's layer separation (lib/layer-separation.ts).
    layerGroup.userData = {index, count:layer.count, turns, end, trapezoid:layer.shape === 'trapezoid' && index > 0, centre, solid:layer.shape === 'tube'}
    layerGroup.add(new T.Mesh(merged, materials[layer.metal]), new T.Mesh(mergedEnds, materials[`${layer.metal}Cut` as const]))
    group.add(layerGroup)
    inner = outer
  })
  return {group, radius:inner, dispose:() => geometries.forEach(g => g.dispose())}
}
