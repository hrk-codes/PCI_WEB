import * as T from 'three'
import { buildConductor, conductorMaterials, constructions } from '@/lib/conductor-models'
import { drift, ease, lerp, type Look } from './look'
import { addPulse } from './pulse'
import { createStudioSet, type Shot } from './studio-set'

/**
 * Shot · core ignition: the cut face of a PCI ACSR conductor, seen almost head-on. Current arrives along the strands
 * and the face lights up ring by ring from the steel core outward, a ring of light spreading across it and sparks
 * spinning off the rim, before it settles to a warm glow. Model units (0.2 per wire diameter).
 */
const IGNITE = .35, STEP = .38 // seconds: first (core) ring, then each layer outward

export function createCoreShot(renderer: T.WebGLRenderer): Shot {
  const set = createStudioSet(renderer, {glow:0xff8a3d, glowAt:new T.Vector3(.3, .05, -1), envIntensity:.5, glowStrength:.1})
  const {scene} = set
  const metals = conductorMaterials()
  const pulse = addPulse(metals.aluminium, {axis:new T.Vector3(0, 0, 1), speed:9, spacing:11, width:.9})
  const layers = [...constructions.acsr, {count:24, metal:'aluminium' as const, shape:'round' as const}]
  const built = buildConductor('acsr', metals, {length:24, wire:.2, step:0, layers, segmentsPerUnit:3})
  scene.add(built.group)
  // Each layer's cut ends get their own material, so the rings can ignite one after another.
  const faces = built.group.children.map((layer, i) => {
    const ends = (layer as T.Group).children[1] as T.Mesh
    const m = (ends.material as T.MeshPhysicalMaterial).clone()
    m.emissive.set(i < 2 ? 0xffd2a0 : 0xff8a3d)
    ends.material = m
    return m
  })
  const radius = .1 + (layers.length - 1) * .2

  // A ring of light that spreads across the face, and sparks thrown off the rim.
  const ringUniforms = {radius:{value:0}, opacity:{value:0}}
  const ring = new T.Mesh(new T.PlaneGeometry(8, 8), new T.ShaderMaterial({
    uniforms:ringUniforms, transparent:true, depthWrite:false, blending:T.AdditiveBlending, fog:false,
    vertexShader:'varying vec2 vP;void main(){vP=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`uniform float radius,opacity;varying vec2 vP;void main(){float d=length(vP)-radius;
      float band=exp(-d*d/.004)*1.2+exp(-d*d/.08)*.2;gl_FragColor=vec4(vec3(1.,.62,.3)*band*2.,band*opacity);}`,
  }))
  ring.position.z = .03
  scene.add(ring)
  const SPARKS = 420
  let seed = 3
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  const sparkData = Array.from({length:SPARKS}, () => ({a:random() * Math.PI * 2, v:.6 + random() * 1.6, born:IGNITE + STEP * (layers.length - 1) + random() * 1.1, z:random() * .6, life:.5 + random() * .7}))
  const sparkGeo = new T.BufferGeometry(); sparkGeo.setAttribute('position', new T.BufferAttribute(new Float32Array(SPARKS * 3), 3))
  const dot = document.createElement('canvas'); dot.width = dot.height = 32
  { const g = dot.getContext('2d')!, r = g.createRadialGradient(16, 16, 0, 16, 16, 16); r.addColorStop(0, '#fff'); r.addColorStop(.35, 'rgba(255,190,120,.8)'); r.addColorStop(1, 'rgba(255,140,60,0)'); g.fillStyle = r; g.fillRect(0, 0, 32, 32) }
  const sparkTexture = new T.CanvasTexture(dot)
  const sparkMaterial = new T.PointsMaterial({size:.07, map:sparkTexture, color:new T.Color(0xffc690).multiplyScalar(3), transparent:true, depthWrite:false, blending:T.AdditiveBlending, fog:false})
  const sparks = new T.Points(sparkGeo, sparkMaterial)
  sparks.frustumCulled = false
  scene.add(sparks)
  set.key.position.set(4, 5, 6); set.key.intensity = 2.2

  const target = new T.Vector3()
  return {
    scene,
    frame(t: number, camera: T.PerspectiveCamera, look: Look) {
      camera.fov = camera.aspect < 1 ? 50 : 32
      camera.updateProjectionMatrix()
      pulse.time.value = t; pulse.strength.value = 1.8
      faces.forEach((m, i) => {
        const since = t - (IGNITE + i * STEP)
        // Flash white-hot, then settle to a steady warm glow.
        m.emissiveIntensity = since < 0 ? 0 : since < .12 ? since / .12 * 4.5 : 1.3 + 3.2 * Math.exp(-(since - .12) * 3.2)
      })
      const spread = (t - IGNITE) / (STEP * layers.length)
      ringUniforms.radius.value = Math.max(0, spread) * radius * 1.15
      ringUniforms.opacity.value = spread > 0 && spread < 1.3 ? Math.sin(Math.min(1, spread / 1.3) * Math.PI) : 0
      const p = sparkGeo.attributes.position as T.BufferAttribute
      sparkData.forEach((s, i) => {
        const age = t - s.born
        if (age < 0 || age > s.life) { p.setXYZ(i, 0, 0, -50); return }
        const r = radius * 1.02 + age * s.v, a = s.a + age * .9
        p.setXYZ(i, Math.cos(a) * r, Math.sin(a) * r - age * age * .5, s.z + age * .9)
      })
      p.needsUpdate = true
      sparkMaterial.opacity = 1
      // A slow push toward the face, turning slightly, with the face held right of centre on wide screens.
      const wide = camera.aspect >= 1, u = ease(t / 3)
      camera.position.set(lerp(1.6, .7, u) + drift(t * .5, 81) * .02, lerp(.9, .35, u) + drift(t * .4, 82) * .02, lerp(7.2, 4.1, u))
      target.set(wide ? lerp(-1.9, -1.35, u) : 0, wide ? 0 : -.9, 0)
      camera.up.set(Math.sin(t * .25) * .06, 1, 0).normalize()
      camera.lookAt(target)
      look.setDepthOfField(camera.position.length(), .0012, .009)
      look.setAo(.1, .6)
      look.setBloom(.42, 1.5, .5)
      look.setFlare(.5, .5, 0)
    },
    dispose() {
      built.dispose(); faces.forEach(m => m.dispose()); Object.values(metals).forEach(m => m.dispose())
      ring.geometry.dispose(); (ring.material as T.Material).dispose(); sparkGeo.dispose(); sparkTexture.dispose(); sparkMaterial.dispose(); set.dispose()
    },
  }
}
