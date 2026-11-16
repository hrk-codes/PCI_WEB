import * as T from 'three'
import { LOGO_WIDTH, MARK_HEIGHT, MARK_TOP, cStroke, cableEnd, iStroke, letters, lettersRadius, logoColours, pStroke, type Point } from '@/lib/pci-logo-geometry'

/**
 * The PCI mark as 3D cables, shared by the About page stage (lib/pci-logo-scene.ts) and the hero film's brand shot.
 * Every stroke of the logo is a real round cable: the orange cable draws the P, its cut end opens to show insulation
 * and copper strands, the blue C sweeps round, the I rises and CABLES is strung letter by letter. `pose(t)` sets the
 * drawing at t seconds (complete at MARK_INTRO_SECONDS). Units are the 165 × 107 logo units, centred on the mark.
 */
export const MARK_INTRO_SECONDS = 3.3
export const ease = (x: number) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t) }
export const easeOut = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3)
export const span = (t: number, a: number, b: number) => Math.min(1, Math.max(0, (t - a) / (b - a)))
const centre = {x:LOGO_WIDTH / 2, y:MARK_TOP + MARK_HEIGHT / 2}
const toWorld = ([x, y]: Point, z = 0) => new T.Vector3(x - centre.x, centre.y - y, z)

/** Arc-length parametrised polyline, so drawing progress moves at an even speed. */
class Polyline extends T.Curve<T.Vector3> {
  private lengths: number[] = [0]
  constructor(private pts: T.Vector3[]) {
    super()
    for (let i = 1; i < pts.length; i++) this.lengths.push(this.lengths[i - 1] + pts[i].distanceTo(pts[i - 1]))
  }
  get length() { return this.lengths[this.lengths.length - 1] }
  getPoint(u: number, target = new T.Vector3()) {
    const d = Math.min(1, Math.max(0, u)) * this.length
    let i = 1
    while (i < this.lengths.length - 1 && this.lengths[i] < d) i++
    const a = this.lengths[i - 1], b = this.lengths[i]
    return target.lerpVectors(this.pts[i - 1], this.pts[i], b > a ? (d - a) / (b - a) : 0)
  }
}

type Stroke = { mesh: T.Mesh; curve: Polyline; segments: number; radial: number; tip?: T.Mesh; start?: T.Mesh }

export function buildPciMark() {
  const logo = new T.Group()
  // Saturated brand colours under a glossy clear coat: the colour comes from the lights, the shine from the reflections.
  const plastic = (colour: string, roughness = .42) => new T.MeshPhysicalMaterial({color:colour, roughness, clearcoat:1, clearcoatRoughness:.12})
  const materials = {
    orange: plastic(logoColours.orange),
    blue: plastic(logoColours.blue),
    grey: new T.MeshPhysicalMaterial({color:logoColours.grey, roughness:.38, metalness:.35, clearcoat:.4}),
    insulation: new T.MeshPhysicalMaterial({color:'#f2ede2', roughness:.45, clearcoat:.3}),
    copper: new T.MeshPhysicalMaterial({color:'#e58a4e', metalness:1, roughness:.24}),
  }
  const sphere = new T.SphereGeometry(1, 32, 16)

  function stroke(points: Point[], radius: number, material: T.Material, radial = 36): Stroke {
    const curve = new Polyline(points.map(p => toWorld(p)))
    const segments = Math.max(8, Math.round(curve.length / .5))
    const mesh = new T.Mesh(new T.TubeGeometry(curve, segments, radius, radial, false), material)
    mesh.castShadow = true
    const cap = () => { const s = new T.Mesh(sphere, material); s.scale.setScalar(radius); s.castShadow = true; logo.add(s); return s }
    logo.add(mesh)
    return {mesh, curve, segments, radial, start:cap(), tip:cap()}
  }
  /** Shows the first `p` of a stroke, with a round cap riding the growing end. */
  function draw(s: Stroke, p: number) {
    const visible = p > .001
    s.mesh.visible = s.start!.visible = s.tip!.visible = visible
    s.mesh.geometry.setDrawRange(0, Math.ceil(s.segments * p) * s.radial * 6)
    s.start!.position.copy(s.curve.getPoint(0))
    s.curve.getPoint(p, s.tip!.position)
  }

  const p = stroke(pStroke.points, pStroke.radius, materials.orange, 48)
  const c = stroke(cStroke.points, cStroke.radius, materials.blue, 48)
  const i = stroke(iStroke.points, iStroke.radius, materials.blue, 48)
  const cables = letters.map(strokes => strokes.map(points => stroke(points, lettersRadius, materials.grey, 16)))

  // The cut cable end, built along its own axis (local +y) and turned to 45° in the plane of the logo.
  const from = toWorld(cableEnd.from), cut = toWorld(cableEnd.cut)
  const axis = cut.clone().sub(from).normalize()
  const branch = new T.Group()
  branch.position.copy(from)
  branch.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), axis)
  logo.add(branch)
  const sheathLength = from.distanceTo(cut)
  const sheath = new T.Mesh(new T.CylinderGeometry(cableEnd.sheathRadius, cableEnd.sheathRadius, sheathLength, 48, 1, true).translate(0, sheathLength / 2, 0), materials.orange)
  const sheathFace = new T.Mesh(new T.RingGeometry(cableEnd.insulationRadius - .05, cableEnd.sheathRadius, 48).rotateX(-Math.PI / 2), materials.orange)
  const insulation = new T.Mesh(new T.CylinderGeometry(cableEnd.insulationRadius, cableEnd.insulationRadius, cableEnd.insulationLength, 40).translate(0, cableEnd.insulationLength / 2, 0), materials.insulation)
  sheath.castShadow = insulation.castShadow = true
  branch.add(sheath, sheathFace, insulation)
  // Seven copper strands: one centre wire and a ring of six, splaying a little at their ends.
  const strandGeometry = new T.CylinderGeometry(cableEnd.strandRadius, cableEnd.strandRadius, 1, 14).translate(0, .5, 0)
  const strands = Array.from({length:7}, (_, k) => {
    const angle = k * Math.PI / 3 + .3
    const offset = k === 6 ? new T.Vector2() : new T.Vector2(Math.cos(angle), Math.sin(angle)).multiplyScalar(cableEnd.strandRadius * 2.05)
    const wire = new T.Group()
    const body = new T.Mesh(strandGeometry, materials.copper)
    const end = new T.Mesh(sphere, materials.copper)
    end.scale.setScalar(cableEnd.strandRadius)
    body.castShadow = true
    wire.add(body, end)
    branch.add(wire)
    return {wire, body, end, offset}
  })

  function pose(t: number) {
    draw(p, ease(span(t, .15, 1.55)))
    const grow = easeOut(span(t, .95, 1.55))
    sheath.scale.y = Math.max(.0001, grow)
    sheath.visible = grow > 0
    sheathFace.position.y = sheathLength * grow
    sheathFace.visible = grow > .98
    const open = span(t, 1.5, 2.3)
    insulation.position.y = sheathLength - cableEnd.insulationLength * (1 - easeOut(span(open, 0, .45)))
    insulation.visible = open > 0
    const reach = easeOut(span(open, .2, 1)), fan = ease(span(open, .45, 1))
    for (const s of strands) {
      s.wire.visible = reach > 0
      const length = Math.max(.001, cableEnd.strandLength * reach)
      const spread = s.offset.clone().multiplyScalar(1 + fan * .9)
      s.wire.position.set(spread.x, sheathLength + .2, spread.y)
      s.wire.rotation.set(spread.y * .06 * fan, 0, -spread.x * .06 * fan)
      s.body.scale.y = length
      s.end.position.y = length
    }
    draw(c, easeOut(span(t, .9, 2.15)))
    draw(i, easeOut(span(t, 1.7, 2.45)))
    cables.forEach((strokes, k) => strokes.forEach(s => draw(s, ease(span(t, 2 + k * .13, 2.6 + k * .13)))))
  }

  return {
    group:logo, materials, pose,
    dispose() {
      logo.traverse(o => { if (o instanceof T.Mesh) o.geometry.dispose() })
      Object.values(materials).forEach(m => m.dispose())
    },
  }
}
export type PciMark = ReturnType<typeof buildPciMark>
