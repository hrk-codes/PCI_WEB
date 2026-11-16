import * as T from 'three'
import { productModel } from '@/lib/product-viewer'
import { drift, ease, easeInOut, lerp, type Look } from './look'
import { addPulse, type Pulse } from './pulse'
import { createStudioSet, type Shot } from './studio-set'

/**
 * Shot 4 · cable cutaway: PCI's four-core armoured LT XLPE cable (the product page model) turns in the dark studio as
 * its layers separate (sheath, steel wire armour, inner sheath, coloured cores, sector-shaped aluminium conductors)
 * while warm current runs through the aluminium.
 */
export function createCableShot(renderer: T.WebGLRenderer): Shot {
  const set = createStudioSet(renderer, {glow:0x5fa8ff, glowAt:new T.Vector3(-.6, .2, -1), envIntensity:.7})
  const {scene} = set
  const model = productModel('lt-xlpe-cable')
  scene.add(model.group)
  model.group.traverse(o => { o.castShadow = o.receiveShadow = true })
  // Current along the cable axis on the aluminium conductor strands.
  const pulses: Pulse[] = []
  const seen = new Set<T.Material>()
  model.group.traverse(o => {
    const m = (o as T.Mesh).material as T.Material | undefined
    if (m && m.name === 'aluminium' && !seen.has(m) && m instanceof T.MeshStandardMaterial) { seen.add(m); pulses.push(addPulse(m, {axis:new T.Vector3(0, 0, 1), speed:5, spacing:7, width:.35})) }
  })
  set.key.position.set(4, 7, 6); set.key.intensity = 3.6

  const target = new T.Vector3()
  return {
    scene,
    frame(t: number, camera: T.PerspectiveCamera, look: Look) {
      camera.fov = camera.aspect < 1 ? 46 : 30
      camera.updateProjectionMatrix()
      model.separate(ease((t - .5) / 2.6) * .9)
      // A slow orbit around the cable, held in the right two thirds of the frame on wide screens.
      model.group.rotation.set(-.32, lerp(.95, .35, easeInOut(t / 4)), .48)
      model.group.updateMatrixWorld()
      for (const p of pulses) { p.time.value = t; p.strength.value = 1.9 * ease((t - .9) / 1); p.axis.value.set(0, 0, 1).applyQuaternion(model.group.quaternion) }
      const wide = camera.aspect >= 1
      camera.position.set(lerp(-1.2, -.6, t / 4) + drift(t * .4, 51) * .03, lerp(1.4, .9, t / 4), lerp(10.5, 9.2, ease(t / 4)))
      target.set(wide ? -1.7 : 0, wide ? .05 : .8, 0)
      camera.up.set(drift(t * .3, 52) * .008, 1, 0).normalize()
      camera.lookAt(target)
      look.setDepthOfField(camera.position.length(), .0007, .008)
      look.setAo(.25, .65)
      look.setBloom(.6, 1.05, .55)
      look.setFlare(.8, .55, 0)
    },
    dispose() { model.dispose(); set.dispose() },
  }
}
