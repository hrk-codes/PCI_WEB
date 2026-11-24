import * as T from 'three'

/**
 * Shared helpers for the product viewer's "Separate layers" control: geometry that bends in place (wires flaring
 * open, cores fanning out) rather than whole layers sliding apart. At separation 0 every model is unchanged.
 */
export const smooth = (value: number) => { const t = Math.min(1, Math.max(0, value)); return t * t * (3 - 2 * t) }
export const stage = (value: number, start: number, end: number) => smooth((value - start) / (end - start))

type Displace = (x: number, y: number, z: number, meta: Float32Array, offset: number, out: T.Vector3) => void

/**
 * Keeps a geometry's original positions and moves every vertex by `displace` on each call. `meta` holds `size`
 * numbers per vertex (for example the direction of the wire the vertex belongs to). Normals are kept: the bends are
 * gentle, and the original shading reads better than recomputed normals on merged wire geometry.
 */
export function morph(geometry: T.BufferGeometry, meta: Float32Array, size: number) {
  const position = geometry.getAttribute('position') as T.BufferAttribute
  const base = (position.array as Float32Array).slice(), out = new T.Vector3()
  return (displace: Displace) => {
    const array = position.array as Float32Array
    for (let i = 0; i < position.count; i++) {
      const x = base[i * 3], y = base[i * 3 + 1], z = base[i * 3 + 2]
      out.set(0, 0, 0)
      displace(x, y, z, meta, i * size, out)
      array[i * 3] = x + out.x; array[i * 3 + 1] = y + out.y; array[i * 3 + 2] = z + out.z
    }
    position.needsUpdate = true
    geometry.computeBoundingBox(); geometry.computeBoundingSphere()
  }
}

export type ConductorLayerInfo = {index: number, count: number, turns: number, end: number, trapezoid: boolean, centre: number, solid?: boolean}

/**
 * Separation for a stranded overhead conductor built by buildConductor: working from the outside in, each layer's
 * wires flare open and curl back over the last stretch before their sawn ends (as a conductor does when its layers
 * are unstranded), so every layer and its lay direction are clear. The centre wire then stands forward.
 */
export function separableConductor(group: T.Group, {reach = 3.4, spread = 1, from = 0, to = 1} = {}) {
  const tau = Math.PI * 2
  const layers = group.children.map(layerGroup => {
    const {index, count, turns, end, trapezoid, centre, solid} = layerGroup.userData as ConductorLayerInfo
    const meshes = layerGroup.children.map(child => {
      const geometry = (child as T.Mesh).geometry
      const position = geometry.getAttribute('position') as T.BufferAttribute
      const normal = geometry.getAttribute('normal') as T.BufferAttribute
      // Which wire each vertex belongs to: undo the lay twist and round to the nearest wire position.
      const wire = new Float32Array(position.count)
      if (index) for (let i = 0; i < position.count; i++) {
        const x = position.getX(i), y = position.getY(i), twist = position.getZ(i) * turns * tau
        const c = Math.cos(-twist), s = Math.sin(-twist)
        wire[i] = Math.round(Math.atan2(x * s + y * c, x * c - y * s) / (tau / count))
      }
      return {geometry, position, normal, base:(position.array as Float32Array).slice(), baseNormal:(normal.array as Float32Array).slice(), wire}
    })
    return {index, count, turns, end, trapezoid, centre, solid, meshes}
  })
  const n = layers.length
  /**
   * Conductors with shaped (trapezoidal) wires or continuous sleeves (carbon core, gap, ECO) separate as stepped
   * sections instead: from the outside in, each layer slides back along the conductor and its wires part evenly
   * around the circle, keeping their own shape and orientation. Every layer then reads as a distinct ring, in side
   * view and end view alike, instead of shaped wires turning and overlapping.
   */
  const stepped = layers.some(layer => layer.trapezoid || layer.solid)
  function telescope(value: number) {
    for (const {index, count, turns, end, solid, meshes} of layers) {
      const order = n - 1 - index, start = .03 + order * (.6 / Math.max(1, n - 1))
      const open = index ? stage(value, start, start + .38) : 0
      const back = open * index * .72                    // outer layers retreat furthest: a clear stepped section
      const part = solid ? 0 : open * (.06 + .045 * index) * spread
      for (const {geometry, position, base, wire} of meshes) {
        const p = position.array as Float32Array
        for (let i = 0; i < position.count; i++) {
          const x = base[i * 3], y = base[i * 3 + 1], z = base[i * 3 + 2]
          // Wires part only over the exposed stretch near the cut, so the far end of the layer stays closed.
          const along = part ? smooth((z - (end - reach)) / reach) : 0
          const angle = wire[i] * tau / count + z * turns * tau
          p[i * 3] = x + Math.cos(angle) * part * along
          p[i * 3 + 1] = y + Math.sin(angle) * part * along
          p[i * 3 + 2] = z - back
        }
        position.needsUpdate = true
        geometry.computeBoundingBox(); geometry.computeBoundingSphere()
      }
    }
  }
  return (input: number) => {
    const value = Math.min(1, Math.max(0, (input - from) / (to - from)))
    if (stepped) return telescope(value)
    for (const {index, count, turns, end, trapezoid, centre, solid, meshes} of layers) {
      // The outer layer opens first and widest; each layer inside it follows. The centre wire stands forward last.
      const order = n - 1 - index, start = .03 + order * (.5 / Math.max(1, n - 2))
      // Continuous sleeves (a composite core's glass layer, a gap conductor's grease) stay with the core and stand
      // forward with it, rather than flaring like separate wires.
      const open = index && !solid ? stage(value, start, start + .44) : 0
      const slide = index && !solid ? 0 : stage(value, .74, 1) * .7
      const share = index / (n - 1), bend = end - reach
      const fan = (.34 + .8 * share) * (trapezoid ? 1.15 : 1) * spread
      for (const {geometry, position, normal, base, baseNormal, wire} of meshes) {
        const p = position.array as Float32Array, q = normal.array as Float32Array
        for (let i = 0; i < position.count; i++) {
          const x = base[i * 3], y = base[i * 3 + 1], z = base[i * 3 + 2]
          const along = open ? smooth((z - bend) / reach) : 0
          if (!along) {
            p[i * 3] = x; p[i * 3 + 1] = y; p[i * 3 + 2] = z + slide
            q[i * 3] = baseNormal[i * 3]; q[i * 3 + 1] = baseNormal[i * 3 + 1]; q[i * 3 + 2] = baseNormal[i * 3 + 2]
            continue
          }
          // The lay unwinds over the opened stretch, so the loose wires run straight out like a broom, as the
          // aerial bunched cable's strands do, instead of spiralling into hooks.
          let px = x, py = y, nx = baseNormal[i * 3], ny = baseNormal[i * 3 + 1]
          if (trapezoid) {
            // Flat trapezoidal wires also turn about their own length as they open, like the slats of a blind,
            // so a clear gap shows between each peeled wire instead of the layer reading as one overlapping bell.
            const at = wire[i] * tau / count + z * turns * tau, cx = Math.cos(at) * centre, cy = Math.sin(at) * centre
            const turn = open * along * 1.3, ct = Math.cos(turn), st = Math.sin(turn)
            px = cx + (x - cx) * ct - (y - cy) * st; py = cy + (x - cx) * st + (y - cy) * ct
            const tx = nx * ct - ny * st; ny = nx * st + ny * ct; nx = tx
          }
          const unwind = -open * along * (z - bend) * turns * tau
          const c = Math.cos(unwind), s = Math.sin(unwind)
          const angle = wire[i] * tau / count + (z * turns * tau + unwind)
          const radial = open * fan * along * along * (1 + .05 * Math.sin(wire[i] * 2.39))
          const tip = open * along ** 6 * .04 * Math.sin(wire[i] * 1.93 + index)
          const dx = Math.cos(angle), dy = Math.sin(angle)
          p[i * 3] = px * c - py * s + dx * radial - dy * tip
          p[i * 3 + 1] = px * s + py * c + dy * radial + dx * tip
          p[i * 3 + 2] = z - open * .06 * along
          q[i * 3] = nx * c - ny * s; q[i * 3 + 1] = nx * s + ny * c; q[i * 3 + 2] = baseNormal[i * 3 + 2]
        }
        position.needsUpdate = true; normal.needsUpdate = true
        geometry.computeBoundingBox(); geometry.computeBoundingSphere()
      }
    }
  }
}
