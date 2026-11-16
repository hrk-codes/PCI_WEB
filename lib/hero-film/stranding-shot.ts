import * as T from 'three'
import { buildConductor, conductorMaterials, constructions } from '@/lib/conductor-models'
import { drift, ease, easeInOut, lerp, type Look } from './look'
import { createStudioSet, type Shot } from './studio-set'

/**
 * Shot · made by PCI: a rigid stranding machine in a dark works. The cage turns, twelve bobbins pay aluminium wire
 * forward, the wires converge into the closing die and the finished ACSR conductor turns out of it toward the camera.
 * Model units (0.2 per wire diameter); illustrative, not a drawing of PCI's actual line.
 */
const SPIN = 1.25 // cage rad/s
const FEED = 1.1  // conductor units/s out of the die

export function createStrandingShot(renderer: T.WebGLRenderer): Shot {
  const set = createStudioSet(renderer, {glow:0xffa25a, glowAt:new T.Vector3(.2, .25, 1), envIntensity:.6, glowStrength:.12, size:300})
  const {scene} = set
  const geometries: T.BufferGeometry[] = []
  const keep = <G extends T.BufferGeometry>(g: G) => { geometries.push(g); return g }
  const paint = new T.MeshStandardMaterial({color:0x2a4e6e, metalness:.35, roughness:.45})   // machine enamel
  const steel = new T.MeshStandardMaterial({color:0x8e979e, metalness:.9, roughness:.32})
  const darkSteel = new T.MeshStandardMaterial({color:0x3b4247, metalness:.8, roughness:.5})
  const metals = conductorMaterials()
  const wound = metals.aluminium.clone(); wound.roughness = .3

  // Overhead practical lights.
  for (const z of [-14, -4, 6]) {
    const lamp = new T.PointLight(0xffb070, 60, 40, 1.6); lamp.position.set(0, 11, z); scene.add(lamp)
    const fitting = new T.Mesh(keep(new T.CylinderGeometry(1.1, 1.4, .5, 24)), darkSteel); fitting.position.set(0, 12.2, z); scene.add(fitting)
  }

  // Closing die: a heavy block with a bell-mouth, on a pedestal.
  const die = new T.Group()
  const block = new T.Mesh(keep(new T.BoxGeometry(3.2, 3.2, 1.4)), paint); die.add(block)
  const mouth = new T.Mesh(keep(new T.CylinderGeometry(1.25, .95, .3, 40, 1, true)), steel); mouth.rotation.x = Math.PI / 2; mouth.position.z = -.8; die.add(mouth)
  const pedestal = new T.Mesh(keep(new T.BoxGeometry(2.2, 3.8, 2.2)), paint); pedestal.position.y = -3.5; die.add(pedestal)
  scene.add(die)

  // The rotating cage: three ring frames, longitudinal bars and two banks of six bobbins.
  const cage = new T.Group()
  for (const z of [-3.6, -9.6, -15.6]) { const ring = new T.Mesh(keep(new T.TorusGeometry(4.3, .18, 16, 96)), paint); ring.position.z = z; cage.add(ring) }
  for (let k = 0; k < 6; k++) {
    const a = k / 6 * Math.PI * 2, bar = new T.Mesh(keep(new T.CylinderGeometry(.12, .12, 12.2, 12)), steel)
    bar.rotation.x = Math.PI / 2; bar.position.set(Math.cos(a) * 4.3, Math.sin(a) * 4.3, -9.6); cage.add(bar)
  }
  const hubGeo = keep(new T.CylinderGeometry(.62, .62, 1.3, 40)); hubGeo.rotateX(Math.PI / 2)
  const turnsGeo = keep(new T.CylinderGeometry(.66, .66, 1.26, 40, 24)); turnsGeo.rotateX(Math.PI / 2)
  // Wound wire: ripple the turns so the spool reads as wire, not a smooth drum.
  { const p = turnsGeo.attributes.position; for (let i = 0; i < p.count; i++) { const z = p.getZ(i), r = Math.hypot(p.getX(i), p.getY(i)); if (r > .6) { const k = 1 + Math.sin(z * 60) * .012; p.setXY(i, p.getX(i) * k, p.getY(i) * k) } } turnsGeo.computeVertexNormals() }
  const flangeGeo = keep(new T.CylinderGeometry(1.0, 1.0, .08, 48)); flangeGeo.rotateX(Math.PI / 2)
  const bobbins: {exit:T.Object3D}[] = []
  for (const [bank, z] of [[0, -6.6], [1, -12.6]] as const) for (let k = 0; k < 6; k++) {
    const a = (k + bank * .5) / 6 * Math.PI * 2
    const b = new T.Group(); b.position.set(Math.cos(a) * 2.9, Math.sin(a) * 2.9, z)
    b.add(new T.Mesh(turnsGeo, wound), new T.Mesh(hubGeo, darkSteel))
    for (const dz of [-.68, .68]) { const f = new T.Mesh(flangeGeo, darkSteel); f.position.z = dz; b.add(f) }
    const exit = new T.Object3D(); exit.position.set(0, .7, .75); b.add(exit) // where the wire leaves the spool
    cage.add(b); bobbins.push({exit})
  }
  scene.add(cage)

  // Wires from each spool to the die, rebuilt in place every frame as the cage turns.
  const wireGeo = keep(new T.CylinderGeometry(.035, .035, 1, 8)); wireGeo.translate(0, .5, 0); wireGeo.rotateX(Math.PI / 2)
  const wires = bobbins.map(() => { const m = new T.Mesh(wireGeo, metals.aluminium); scene.add(m); return m })
  const entry = new T.Vector3(), from = new T.Vector3()

  // The finished conductor coming out of the die.
  // Its own materials, clipped at the die face so it only exists once it has been closed.
  renderer.localClippingEnabled = true
  const dieFace = [new T.Plane(new T.Vector3(0, 0, 1), -.55)]
  const productMetals = conductorMaterials()
  Object.values(productMetals).forEach(m => { m.clippingPlanes = dieFace })
  const layers = [...constructions.acsr]
  const built = buildConductor('acsr', productMetals, {length:46, wire:.2, step:0, layers, segmentsPerUnit:4})
  // The galvanised steel core runs down the machine's axis into the die.
  const core = new T.Mesh(keep(new T.CylinderGeometry(.3, .3, 17, 24)), metals.steel); core.rotation.x = Math.PI / 2; core.position.z = -9; scene.add(core)
  const product = new T.Group(); product.add(built.group)
  scene.add(product)
  scene.traverse(o => { if (o instanceof T.Mesh) { o.castShadow = true; o.receiveShadow = true } })
  set.key.position.set(8, 9, 10); set.key.intensity = 2.4
  set.rim.position.set(-9, 4, -6); set.rim.intensity = 2.4

  const target = new T.Vector3()
  return {
    scene,
    frame(t: number, camera: T.PerspectiveCamera, look: Look) {
      camera.fov = camera.aspect < 1 ? 52 : 36
      camera.updateProjectionMatrix()
      const angle = t * SPIN
      cage.rotation.z = angle
      cage.updateMatrixWorld(true)
      bobbins.forEach(({exit}, i) => {
        exit.getWorldPosition(from)
        const a = angle + i * .52
        entry.set(Math.cos(a) * .38, Math.sin(a) * .38, -.75)
        const w = wires[i]
        w.position.copy(from); w.lookAt(entry); w.scale.set(1, 1, from.distanceTo(entry))
      })
      // The conductor is laid as it leaves the die: it turns with the cage and feeds forward.
      built.group.position.z = 30 + t * FEED // body runs back to z = -16 + t·FEED, clipped behind the die face
      built.group.rotation.z = angle
      // Glide past the turning cage toward the die, ending on the conductor coming at the lens.
      const u = easeInOut(t / 4)
      camera.position.set(lerp(15, 6.2, u) + drift(t * .5, 71) * .05, lerp(6.5, 1.8, u) + drift(t * .45, 72) * .04, lerp(-13, 9.5, ease(t / 4)))
      target.set(lerp(-4.5, -2.6, u), lerp(-1, .1, u), lerp(-9, 2, u))
      camera.up.set(drift(t * .3, 73) * .01, 1, 0).normalize()
      camera.lookAt(target)
      look.setDepthOfField(camera.position.distanceTo(new T.Vector3(0, 0, lerp(-9, 1.5, u))), .0011, .01)
      look.setAo(.6, .7)
      look.setBloom(.35, 1.6, .6)
      look.setFlare(.5, .5, 0)
    },
    dispose() {
      geometries.forEach(g => g.dispose()); built.dispose()
      ;[paint, steel, darkSteel, wound, ...Object.values(metals), ...Object.values(productMetals)].forEach(m => m.dispose())
      set.dispose()
    },
  }
}
