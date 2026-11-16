import * as T from 'three'
import { MARK_INTRO_SECONDS, buildPciMark, ease, span } from '@/lib/pci-mark'
import { drift, lerp, type Look } from './look'
import { createStudioSet, type Shot } from './studio-set'

/**
 * Shot 6 · brand: in the navy studio a cable draws the PCI mark (PCI and CABLES, no suffix line), a light glint runs
 * across it, and the film dips to the loop point. On wide screens the mark sits in the right half, clear of the hero
 * headline; on phones it sits in the upper half.
 */
export function createBrandShot(renderer: T.WebGLRenderer): Shot {
  const set = createStudioSet(renderer, {glow:0x4a86c8, glowAt:new T.Vector3(.45, .1, -1), envIntensity:.32, glowStrength:.07, size:2400})
  const {scene} = set
  set.key.position.set(-60, 90, 140); set.key.intensity = 2.6
  set.rim.position.set(80, 40, -60); set.rim.intensity = 2
  set.fill.intensity = .55
  const mark = buildPciMark()
  scene.add(mark.group)
  // On the navy backdrop the logo's dark grey CABLES would vanish; a lighter satin steel keeps it legible.
  mark.materials.grey.color.set(0xb4bcc2); mark.materials.grey.metalness = .55; mark.materials.grey.roughness = .3
  const glint = new T.PointLight(0xfff1e0, 0, 110, 1.4)
  scene.add(glint)
  // The drawing plays a little faster than on the About page so the finished mark holds before the loop.
  const SPEED = 1.25

  return {
    scene,
    frame(t: number, camera: T.PerspectiveCamera, look: Look) {
      const wide = camera.aspect >= 1
      camera.fov = 22
      camera.updateProjectionMatrix()
      mark.pose(Math.min(MARK_INTRO_SECONDS, Math.max(0, t - .15) * SPEED))
      // The mark settles toward the camera as it is drawn, then breathes very slightly.
      const settle = ease(span(t, 0, 2.6))
      mark.group.rotation.set(.16 * (1 - settle) + drift(t * .3, 61) * .01, -.42 * (1 - settle) + drift(t * .25, 62) * .015, 0)
      // Keep the complete mark above the phone's headline, in the tall film's clear upper area.
      mark.group.position.set(wide ? 64 : 0, wide ? 2 : 125, -16 * (1 - settle))
      const half = T.MathUtils.degToRad(camera.fov / 2)
      // Frame so the mark takes about 40% of the width on wide screens and 80% on phones.
      const distance = wide ? (165 / .4 / 2) / (Math.tan(half) * camera.aspect) : (165 / .8 / 2) / (Math.tan(half) * camera.aspect)
      camera.position.set(0, 0, distance + lerp(12, 0, settle))
      camera.up.set(0, 1, 0)
      camera.lookAt(0, 0, 0)
      const sweep = span(t, 2.7, 3.7)
      glint.intensity = Math.sin(Math.PI * sweep) * 1100
      glint.position.set(mark.group.position.x - 95 + 190 * sweep, (wide ? 30 : mark.group.position.y + 30) - 35 * sweep, 24)
      look.setDepthOfField(distance, 0, .001)
      look.setAo(4, .5)
      look.setBloom(.3, 1.3, .5)
      look.setFlare(.5, .5, 0)
    },
    dispose() { mark.dispose(); glint.dispose(); set.dispose() },
  }
}
