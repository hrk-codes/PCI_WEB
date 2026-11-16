import * as T from 'three'
import { buildConductor, conductorMaterials, constructions } from '@/lib/conductor-models'
import { drift, ease, easeInOut, lerp, type Look } from './look'
import { addPulse } from './pulse'
import { createStudioSet, type Shot } from './studio-set'

/**
 * Shot · the field: an illustrative insulated suspension assembly gripping four ACSR subconductors. Warm current runs along the
 * conductors while cyan rings of magnetic field draw themselves around each one and flow, dust drifting through the
 * light. Stylised and illustrative (bundle spacing is drawn closer than real lines to keep the spacer in frame).
 */
const HALF = 3 // half the bundle spacing, model units

export function createFieldShot(renderer: T.WebGLRenderer): Shot {
  const set = createStudioSet(renderer, {glow:0x2a9dff, glowAt:new T.Vector3(.3, .2, -1), envIntensity:.55, glowStrength:.14, size:300})
  const {scene} = set
  const geometries: T.BufferGeometry[] = []
  const keep = <G extends T.BufferGeometry>(g: G) => { geometries.push(g); return g }
  const metals = conductorMaterials()
  const pulse = addPulse(metals.aluminium, {axis:new T.Vector3(1, 0, 0), speed:10, spacing:14, width:1})
  const cast = new T.MeshStandardMaterial({color:0xb8c0c6, metalness:.75, roughness:.36})
  const bolt = new T.MeshStandardMaterial({color:0x6f777d, metalness:.9, roughness:.3})
  const cushion = new T.MeshPhysicalMaterial({color:0x16272d, roughness:.65, clearcoat:.1})
  const silicone = new T.MeshPhysicalMaterial({color:0xabbcc5, roughness:.38, clearcoat:.22})
  const contact = new T.MeshBasicMaterial({color:0x49d8e8, transparent:true, opacity:.18, toneMapped:false})
  function annulus(outer:number, inner:number, length:number) {
    const shape = new T.Shape()
    shape.absarc(0, 0, outer, 0, Math.PI * 2, false)
    const hole = new T.Path(); hole.absarc(0, 0, inner, 0, Math.PI * 2, true); shape.holes.push(hole)
    const g = keep(new T.ExtrudeGeometry(shape, {depth:length, bevelEnabled:false, curveSegments:40}))
    g.translate(0, 0, -length / 2); g.rotateY(Math.PI / 2)
    return g
  }

  // Four conductors along x, at the corners of a square.
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([y, z]) => new T.Vector3(0, y * HALF, z * HALF))
  const conductors = corners.map(c => {
    const built = buildConductor('acsr', metals, {length:44, wire:.2, step:0, layers:constructions.acsr, segmentsPerUnit:1.6})
    built.group.rotation.y = -Math.PI / 2       // along x
    built.group.position.set(-22, c.y, c.z)      // spans x = -22 … 22
    scene.add(built.group)
    return built
  })
  // The spacer: a cast body with four arms, each ending in a clamp around a conductor.
  const spacer = new T.Group()
  const body = new T.Mesh(keep(new T.BoxGeometry(.9, 2.6, 2.6)), cast); spacer.add(body)
  const boss = new T.Mesh(keep(new T.CylinderGeometry(.55, .55, 1.1, 32)), bolt); boss.rotation.z = Math.PI / 2; spacer.add(boss)
  corners.forEach(c => {
    const dir = c.clone().setX(0).normalize(), len = c.length() - 1.6
    const arm = new T.Mesh(keep(new T.BoxGeometry(.6, len, .55)), cast)
    arm.position.copy(dir.clone().multiplyScalar(.9 + len / 2)); arm.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir); spacer.add(arm)
    const clampGeo = annulus(1.08, .94, 1.25)
    const clamp = new T.Mesh(clampGeo, cast); clamp.position.copy(c); spacer.add(clamp)
    const liner = new T.Mesh(annulus(.94, .708, 1.6), cushion); liner.position.copy(c); spacer.add(liner)
    const lip = new T.Mesh(keep(new T.TorusGeometry(1.06, .07, 12, 48)), cast); lip.rotation.y = Math.PI / 2
    for (const x of [-.62, .62]) { const l = lip.clone(); l.position.copy(c).setX(x); spacer.add(l) }
    for (const x of [-.82, .82]) {
      const seal = new T.Mesh(keep(new T.TorusGeometry(.91, .018, 8, 48)), contact)
      seal.rotation.y = Math.PI / 2; seal.position.copy(c).setX(x); spacer.add(seal)
    }
    const b = new T.Mesh(keep(new T.CylinderGeometry(.16, .16, .9, 16)), bolt); b.position.copy(c).add(dir.clone().multiplyScalar(1.3)); b.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir); spacer.add(b)
    for (const x of [-.47, .47]) {
      const washer = new T.Mesh(keep(new T.TorusGeometry(.2, .04, 8, 24)), bolt)
      washer.rotation.y = Math.PI / 2; washer.position.copy(c).setX(x); washer.position.addScaledVector(dir, 1.15); spacer.add(washer)
      const nut = new T.Mesh(keep(new T.CylinderGeometry(.22, .22, .16, 6)), cast)
      nut.rotation.z = Math.PI / 2; nut.position.copy(washer.position); spacer.add(nut)
    }
  })
  scene.add(spacer)

  // A polymer long-rod suspension support: the insulation is between the live bundle and the support above it,
  // not a fictitious PVC coating on bare overhead conductors. Dimensions are illustrative, not a rated design.
  const support = new T.Group()
  function rod(a:T.Vector3, b:T.Vector3, radius:number, material:T.Material) {
    const mesh = new T.Mesh(keep(new T.CylinderGeometry(radius, radius, a.distanceTo(b), 24)), material)
    mesh.position.copy(a).lerp(b, .5)
    mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), b.clone().sub(a).normalize())
    support.add(mesh)
  }
  for (const z of [-.8, .8]) rod(new T.Vector3(0, 1.3, z), new T.Vector3(0, 5.1, 0), .16, cast)
  rod(new T.Vector3(0, 5.05, 0), new T.Vector3(0, 5.9, 0), .28, bolt)
  rod(new T.Vector3(0, 5.9, 0), new T.Vector3(0, 10.1, 0), .21, silicone)
  const shedProfile = [new T.Vector2(.21, -.1), new T.Vector2(.69, -.1), new T.Vector2(.73, -.04), new T.Vector2(.65, .02), new T.Vector2(.23, .17)]
  const shed = keep(new T.LatheGeometry(shedProfile, 48))
  for (let i = 0; i < 12; i++) {
    const m = new T.Mesh(shed, silicone); m.position.y = 6.08 + i * .34
    if (i % 2) m.scale.set(.8, 1, .8)
    support.add(m)
  }
  rod(new T.Vector3(0, 10.1, 0), new T.Vector3(0, 10.9, 0), .28, bolt)
  for (const y of [5.8, 10.6]) {
    const ring = new T.Mesh(keep(new T.TorusGeometry(1.05, .075, 12, 64)), cast)
    ring.rotation.x = Math.PI / 2; ring.position.y = y; support.add(ring)
    for (const z of [-.65, .65]) rod(new T.Vector3(0, y, z), new T.Vector3(0, y + .3, 0), .045, bolt)
  }
  const eye = new T.Mesh(keep(new T.TorusGeometry(.32, .11, 12, 32)), cast); eye.position.y = 11.0; support.add(eye)
  const beam = new T.Mesh(keep(new T.BoxGeometry(.65, .32, 6.6)), bolt); beam.position.y = 11.5; support.add(beam)
  scene.add(support)

  // Magnetic field rings: tubes around each conductor, drawn on, then flowing with bright dashes.
  const fieldUniforms = {time:{value:0}, reveal:{value:0}, glow:{value:new T.Color(0x41dcff).multiplyScalar(1.5)}}
  const fieldMaterial = new T.ShaderMaterial({
    uniforms:fieldUniforms, transparent:true, depthWrite:false, blending:T.AdditiveBlending, fog:false,
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`uniform float time,reveal;uniform vec3 glow;varying vec2 vUv;
      void main(){float drawn=step(vUv.x,reveal);float f=fract(vUv.x*4.-time*.8);
        float dash=smoothstep(0.,.08,f)*smoothstep(.62,.5,f);float head=smoothstep(.45,.6,f)*smoothstep(.62,.6,f);
        float a=drawn*(.12+dash*.55+head*.7);gl_FragColor=vec4(glow*(.35+dash+head*1.3),a);}`,
  })
  const rings = new T.Group()
  corners.forEach((c, k) => {
    for (const x of [-9, -4.2, 4.2, 9]) for (const r of [1.6, 2.5]) {
      // These four subconductors belong to one phase; show a consistent circulation direction.
      const path = new T.EllipseCurve(0, 0, r, r, 0, Math.PI * 2, false, 0)
      const pts = path.getPoints(96).slice(0, -1).map(p => new T.Vector3(x, c.y + p.x, c.z + p.y))
      const tube = keep(new T.TubeGeometry(new T.CatmullRomCurve3(pts, true), 96, .022, 6, true))
      rings.add(new T.Mesh(tube, fieldMaterial))
    }
  })
  scene.add(rings)
  // Dust drifting through the light, for depth.
  let seed = 5
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  const DUST = 900, dust = new Float32Array(DUST * 3)
  for (let i = 0; i < DUST; i++) dust.set([(random() - .5) * 60, (random() - .5) * 26, (random() - .5) * 40], i * 3)
  const dustGeo = keep(new T.BufferGeometry()); dustGeo.setAttribute('position', new T.BufferAttribute(dust.slice(), 3))
  const dustMaterial = new T.PointsMaterial({color:0x9fc6e6, size:.05, transparent:true, opacity:.45, depthWrite:false, blending:T.AdditiveBlending, fog:false})
  scene.add(new T.Points(dustGeo, dustMaterial))
  scene.traverse(o => { if (o instanceof T.Mesh && o.material !== fieldMaterial) o.castShadow = o.receiveShadow = true })
  set.key.position.set(6, 8, 9); set.key.intensity = 1.8
  set.rim.position.set(-8, 3, -7); set.rim.intensity = 1.3

  const target = new T.Vector3()
  return {
    scene,
    frame(t: number, camera: T.PerspectiveCamera, look: Look) {
      camera.fov = camera.aspect < 1 ? 52 : 34
      camera.updateProjectionMatrix()
      pulse.time.value = t; pulse.strength.value = 1.1
      fieldUniforms.time.value = t
      fieldUniforms.reveal.value = ease((t - .25) / 1.4)
      contact.opacity = .12 + .3 * ease(t / .9) * (1 - .5 * ease((t - 2.2) / 1.3))
      const dp = dustGeo.attributes.position as T.BufferAttribute
      for (let i = 0; i < DUST; i++) dp.setXYZ(i, dust[i * 3] + t * .35, dust[i * 3 + 1] + Math.sin(t * .6 + i) * .15, dust[i * 3 + 2])
      dp.needsUpdate = true
      // Drift in toward the spacer and round it, the bundle crossing the right of the frame.
      const wide = camera.aspect >= 1, u = easeInOut(t / 3.5)
      camera.position.set(lerp(16, 13, u) + drift(t * .4, 91) * .05, lerp(9.5, 8, u) + drift(t * .45, 92) * .04, lerp(25, 22, ease(t / 3.5)))
      target.set(wide ? lerp(-4.5, -3.4, u) : 0, wide ? 2.4 : -1.4, 0)
      camera.up.set(drift(t * .3, 93) * .01, 1, 0).normalize()
      camera.lookAt(target)
      look.setDepthOfField(camera.position.length(), .0009, .01)
      look.setAo(.4, .6)
      look.setBloom(.4, 1.8, .55)
      look.setFlare(.5, .5, 0)
    },
    dispose() {
      geometries.forEach(g => g.dispose()); conductors.forEach(c => c.dispose())
      ;[cast, bolt, cushion, silicone, contact, fieldMaterial, dustMaterial, ...Object.values(metals)].forEach(m => m.dispose())
      set.dispose()
    },
  }
}
