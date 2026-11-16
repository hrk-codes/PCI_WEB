import * as T from 'three'
import { buildConductor, conductorMaterials, constructions } from '@/lib/conductor-models'
import { drift, ease, easeInOut, lerp, type Look } from './look'
import { addPulse } from './pulse'
import { createStudioSet, type Shot } from './studio-set'

/**
 * Shot 3 · inside the conductor: a grazing track along a PCI ACSR conductor, strands spiralling past while warm current
 * pulses race along the aluminium; then the camera swings to the stepped end as the layers telescope apart to show
 * the galvanised steel core. Model units (0.2 per wire diameter).
 */
export function createConductorShot(renderer: T.WebGLRenderer): Shot {
  const set = createStudioSet(renderer, {glow:0xff9a52, glowAt:new T.Vector3(.5, .15, 1)})
  const {scene} = set
  const metals = conductorMaterials()
  const pulse = addPulse(metals.aluminium, {axis:new T.Vector3(0, 0, 1), speed:16, spacing:22, width:1.3})
  const layers = [...constructions.acsr, {count:24, metal:'aluminium' as const, shape:'round' as const}]
  const built = buildConductor('acsr', metals, {length:70, wire:.2, step:.6, layers, segmentsPerUnit:3})
  const conductor = built.group
  conductor.traverse(o => { o.castShadow = o.receiveShadow = true })
  scene.add(conductor)
  const groups = conductor.children
  set.key.position.set(5, 6, 2); set.key.intensity = 2.6
  set.rim.intensity = 2.2
  set.key.castShadow = true
  set.key.shadow.mapSize.set(2048, 2048)
  Object.assign(set.key.shadow.camera, {left:-4, right:4, top:4, bottom:-4, near:.5, far:40})

  const target = new T.Vector3()
  return {
    scene,
    frame(t: number, camera: T.PerspectiveCamera, look: Look) {
      camera.fov = camera.aspect < 1 ? 50 : 34
      camera.updateProjectionMatrix()
      pulse.time.value = t
      pulse.strength.value = 2.6
      // Layers part from 2.1 s: each layer slides forward of the one outside it, the steel core furthest.
      const open = ease((t - 2.1) / 1.6)
      groups.forEach((g, i) => { g.position.z = (groups.length - 1 - i) * open * 1.1 })
      const swing = easeInOut((t - 1.7) / 2.3)
      // Track beside the body (the conductor runs through the right of frame into the distance), then round to a
      // three-quarter view of the opened end.
      const along = lerp(-36, -14, ease(t / 2.4))
      const side = new T.Vector3(-2.1 + drift(t * .7, 41) * .02, .85 + drift(t * .6, 42) * .015, along)
      const end = new T.Vector3(-3.4, 1.5, 4.6 + open)
      camera.position.lerpVectors(side, end, swing)
      target.lerpVectors(new T.Vector3(.55, -.1, along - 6.5), new T.Vector3(-.9, .05, .6 + open * 1.6), swing)
      camera.up.set(drift(t * .3, 43) * .008, 1, 0).normalize()
      camera.lookAt(target)
      look.setDepthOfField(swing < .5 ? 2.6 : camera.position.distanceTo(new T.Vector3(0, 0, .6 + open)), .0012, .01)
      look.setAo(.12, .6)
      look.setBloom(.55, 1.4, .55)
      look.setFlare(.72, .52, .0)
    },
    dispose() { built.dispose(); Object.values(metals).forEach(m => m.dispose()); set.dispose() },
  }
}
