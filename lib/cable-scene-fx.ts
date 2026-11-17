import * as T from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { CableKit } from '@/lib/cable-models'

/**
 * Realism and current effects for the homepage About cable composition (lib/cable-scene.ts):
 * procedural surface detail (PVC grain, drawn-wire marks, zinc spangle), a printed sheath legend, light that travels
 * inside bare conductors with a matching halo, sparks at live strand tips, drifting motes, and the four-core copper
 * control cable modelled on PCI's display sample. Everything is generated in code; no photographs are used.
 */

function canvasTexture(size: number, draw: (g: CanvasRenderingContext2D, size: number) => void, repeat: [number, number] = [1, 1]) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  draw(canvas.getContext('2d')!, size)
  const texture = new T.CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = T.RepeatWrapping
  texture.repeat.set(...repeat)
  texture.anisotropy = 4
  return texture
}
let seed = 17
const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647

/** Fine mottled grain for extruded PVC: catches the light like a real sheath instead of flat plastic. */
export function pvcGrain() {
  return canvasTexture(512, (g, s) => {
    const image = g.createImageData(s, s)
    for (let i = 0; i < s * s; i++) { const v = 118 + random() * 26 + (random() < .012 ? 60 : 0); image.data.set([v, v, v, 255], i * 4) }
    g.putImageData(image, 0, 0)
  }, [3, 6])
}
/** Drawing-die marks along a wire. `alongV` for cylinders (length runs along V), otherwise along U (tubes). */
export function drawnMarks(alongV: boolean) {
  return canvasTexture(512, (g, s) => {
    for (let x = 0; x < s; x++) {
      const v = 120 + Math.sin(x * .45) * 10 + random() * 40
      g.fillStyle = `rgb(${v},${v},${v})`
      if (alongV) g.fillRect(x, 0, 1, s); else g.fillRect(0, x, s, 1)
    }
  }, alongV ? [2, 1] : [1, 2])
}
/** Galvanised zinc: soft spangle patches. */
export function zincSpangle() {
  return canvasTexture(512, (g, s) => {
    g.fillStyle = '#808080'; g.fillRect(0, 0, s, s)
    for (let i = 0; i < 520; i++) {
      const x = random() * s, y = random() * s, r = 8 + random() * 32, v = 100 + random() * 70
      g.fillStyle = `rgba(${v},${v},${v},.55)`; g.beginPath(); g.ellipse(x, y, r, r * (.5 + random()), random() * 3, 0, Math.PI * 2); g.fill()
    }
  }, [2, 2])
}

/** Printed legend running along a sheath, as on PCI's real cables. Returns a thin shell to wrap the sheath. */
export function legendShell(radius: number, length: number, text: string) {
  const canvas = document.createElement('canvas')
  // Drawn at 2x so the print stays crisp on high-density screens.
  canvas.width = 128; canvas.height = 2048
  const g = canvas.getContext('2d')!
  g.translate(64, 0); g.rotate(Math.PI / 2)
  g.fillStyle = 'rgba(214,218,214,.82)'; g.font = '700 30px Arial, Helvetica, sans-serif'; g.textBaseline = 'middle'
  g.fillText(text, 40, 0)
  const texture = new T.CanvasTexture(canvas)
  texture.wrapS = T.ClampToEdgeWrapping; texture.wrapT = T.RepeatWrapping
  texture.repeat.set(1, length / 1.15)
  texture.anisotropy = 8
  // The print occupies a narrow strip of the circumference facing the camera.
  texture.offset.set(-.42, 0); texture.repeat.x = 8
  const material = new T.MeshStandardMaterial({map:texture, transparent:true, alphaTest:.35, roughness:.6, depthWrite:false, polygonOffset:true, polygonOffsetFactor:-2})
  const mesh = new T.Mesh(new T.CylinderGeometry(radius * 1.004, radius * 1.004, length, 64, 1, true), material)
  mesh.renderOrder = 1
  return {mesh, dispose() { texture.dispose(); material.dispose(); mesh.geometry.dispose() }}
}

/**
 * Current inside a bare conductor: warm bands travel along the strands as emission in the metal itself, with a
 * soft fresnel halo that rides with each band. `axis` is the conductor's local length axis (Y).
 */
export function addCurrent(material: T.MeshStandardMaterial, {colour = 0xff8a3d, speed = 1.1, spacing = 2.1, width = .26} = {}) {
  const uniforms = {curTime:{value:0}, curStrength:{value:0}, curSpeed:{value:speed}, curSpacing:{value:spacing}, curWidth:{value:width}, curColour:{value:new T.Color(colour)}, curOffset:{value:0}}
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vCurAlong;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vCurAlong = (instanceMatrix * vec4(transformed, 1.)).y;
        #else
          vCurAlong = transformed.y;
        #endif`)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vCurAlong;\nuniform float curTime, curStrength, curSpeed, curSpacing, curWidth, curOffset;\nuniform vec3 curColour;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        {
          float s = vCurAlong - curTime * curSpeed + curOffset;
          float d = (fract(s / curSpacing) - .5) * curSpacing;
          float band = exp(-d * d / (curWidth * curWidth));
          // A slight crackle along the band, so it reads as live current rather than a steady light.
          band *= .82 + .18 * sin(curTime * 41. + vCurAlong * 37.) * sin(curTime * 23. - vCurAlong * 13.);
          totalEmissiveRadiance += curStrength * (curColour * band * 1.8 + vec3(.92, .97, 1.) * pow(band, 4.) * 1.5);
        }`)
  }
  material.customProgramCacheKey = () => 'pci-about-current'
  material.needsUpdate = true
  return uniforms
}
export type Current = ReturnType<typeof addCurrent>

/**
 * The halo that rides with the current, as light around the metal. Premultiplied additive output only ever adds
 * light: it never dims the page behind the transparent canvas (straight-alpha additive blending did, which drew
 * dark lines along both sides of the wire).
 */
export function currentHalo(radius: number, length: number, current: Current, colour = 0xff9a52) {
  const material = new T.ShaderMaterial({
    uniforms:{...current, haloColour:{value:new T.Color(colour)}, haloHalf:{value:length / 2}},
    transparent:true, premultipliedAlpha:true, depthWrite:false, blending:T.AdditiveBlending, side:T.FrontSide, toneMapped:false,
    vertexShader:`varying float vAlong; varying float vRim;
      void main(){ vAlong = position.y; vec4 mv = modelViewMatrix * vec4(position, 1.);
        vec3 n = normalize(normalMatrix * normal); vRim = 1. - abs(dot(n, normalize(-mv.xyz)));
        gl_Position = projectionMatrix * mv; }`,
    fragmentShader:`uniform float curTime, curStrength, curSpeed, curSpacing, curWidth, curOffset, haloHalf; uniform vec3 haloColour;
      varying float vAlong; varying float vRim;
      void main(){ float s = vAlong - curTime * curSpeed + curOffset; float d = (fract(s / curSpacing) - .5) * curSpacing;
        float band = exp(-d * d / (curWidth * curWidth * 2.2));
        // Fades out before the silhouette and at both ends, so the glow has no visible edge.
        float rim = smoothstep(.04, .55, vRim) * (1. - smoothstep(.8, 1., vRim));
        float ends = 1. - smoothstep(haloHalf - .3, haloHalf, abs(vAlong));
        float a = band * rim * ends * curStrength * .5;
        gl_FragColor = vec4(haloColour * a, a * .18); }`,
  })
  const mesh = new T.Mesh(new T.CylinderGeometry(radius, radius, length, 64, 1, true), material)
  mesh.renderOrder = 3
  return {mesh, dispose() { material.dispose(); mesh.geometry.dispose() }}
}

/** Sparks thrown off live strand tips: short-lived, warm, falling away. Positions are local to `parent`. */
export function sparks(parent: T.Object3D, tips: T.Vector3[], count = 46, colour = 0xffb46a) {
  const data = Array.from({length:count}, (_, i) => ({tip:tips[i % tips.length], dir:new T.Vector3(random() - .5, .6 + random() * .8, random() - .5).normalize(), speed:.25 + random() * .45, life:.5 + random() * .7, phase:random() * 3}))
  const geometry = new T.BufferGeometry()
  geometry.setAttribute('position', new T.BufferAttribute(new Float32Array(count * 3), 3))
  const dot = canvasTexture(32, (g, s) => { const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); r.addColorStop(0, '#fff'); r.addColorStop(.3, 'rgba(255,200,140,.85)'); r.addColorStop(1, 'rgba(255,140,60,0)'); g.fillStyle = r; g.fillRect(0, 0, s, s) })
  const material = new T.PointsMaterial({size:.06, map:dot, color:new T.Color(colour).multiplyScalar(2.2), transparent:true, premultipliedAlpha:true, depthWrite:false, blending:T.AdditiveBlending, toneMapped:false})
  const points = new T.Points(geometry, material)
  points.frustumCulled = false
  parent.add(points)
  const p = geometry.attributes.position as T.BufferAttribute
  return {
    update(time: number, strength: number) {
      points.visible = strength > .02
      material.opacity = strength
      data.forEach((d, i) => {
        const age = (time * .9 + d.phase) % (d.life + .6)
        if (age > d.life) { p.setXYZ(i, 0, -999, 0); return }
        const k = age * d.speed
        p.setXYZ(i, d.tip.x + d.dir.x * k, d.tip.y + d.dir.y * k - age * age * .35, d.tip.z + d.dir.z * k)
      })
      p.needsUpdate = true
    },
    dispose() { geometry.dispose(); material.dispose(); dot.dispose(); points.removeFromParent() },
  }
}

/** Fine motes drifting through the light around the composition, warm and cool, for depth. */
export function motes(parent: T.Object3D, count = 140) {
  const base = new Float32Array(count * 3), colours = new Float32Array(count * 3)
  const warm = new T.Color(0xffb27a), cool = new T.Color(0x9fd0ff)
  for (let i = 0; i < count; i++) {
    base.set([(random() - .5) * 6.4, (random() - .5) * 4.6, (random() - .5) * 3.2], i * 3)
    const c = random() < .55 ? warm : cool
    colours.set([c.r, c.g, c.b], i * 3)
  }
  const geometry = new T.BufferGeometry()
  geometry.setAttribute('position', new T.BufferAttribute(base.slice(), 3))
  geometry.setAttribute('color', new T.BufferAttribute(colours, 3))
  const dot = canvasTexture(32, (g, s) => { const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, s, s) })
  const material = new T.PointsMaterial({size:.035, map:dot, vertexColors:true, transparent:true, premultipliedAlpha:true, opacity:.6, depthWrite:false, blending:T.AdditiveBlending, toneMapped:false})
  const points = new T.Points(geometry, material)
  points.frustumCulled = false
  parent.add(points)
  const p = geometry.attributes.position as T.BufferAttribute
  return {
    update(time: number, strength: number) {
      points.visible = strength > .02
      material.opacity = .55 * strength
      for (let i = 0; i < count; i++) p.setXYZ(i, base[i * 3] + Math.sin(time * .21 + i) * .12, base[i * 3 + 1] + ((time * .05 + i * .37) % 1) * .5, base[i * 3 + 2] + Math.cos(time * .17 + i) * .1)
      p.needsUpdate = true
    },
    dispose() { geometry.dispose(); material.dispose(); dot.dispose(); points.removeFromParent() },
  }
}

/**
 * PCI's four-core armoured copper control cable, after the display sample: black PVC sheath, galvanised round-wire
 * armour, black inner sheath, red, yellow, blue and black cores, fine copper strands. Built along local Y.
 */
export function buildCopperCable(kit: CableKit, {rubber, bedding, steel, copper}: {rubber:T.Material, bedding:T.Material, steel:T.Material, copper:T.MeshStandardMaterial}) {
  const group = new T.Group()
  const materials = [0xc4231c, 0xe6bd16, 0x1f49ad, 0x1b1d20].map(color => new T.MeshPhysicalMaterial({color, roughness:.34, metalness:.04, clearcoat:.45, clearcoatRoughness:.3}))
  kit.cylinder(group, .36, 2.2, -.8, rubber)              // outer sheath, top at y = .3
  kit.collar(group, .345, .3, rubber)
  const armour = kit.track(new T.CylinderGeometry(.021, .021, .3, 14, 1))
  const ring = new T.InstancedMesh(armour, steel, 44), m = new T.Matrix4()
  for (let i = 0; i < 44; i++) { const a = i / 44 * Math.PI * 2; m.makeTranslation(Math.cos(a) * .325, .44, Math.sin(a) * .325); ring.setMatrixAt(i, m) }
  group.add(ring)
  kit.cylinder(group, .3, .32, .66, bedding)              // inner sheath, .5 → .82
  const tips: T.Vector3[] = []
  materials.forEach((material, i) => {
    const a = i * Math.PI / 2 + Math.PI / 4, x = Math.cos(a) * .135, z = Math.sin(a) * .135
    const top = 1.18 + [0, .09, .04, .13][i]
    kit.cylinder(group, .118, top - .8, (top + .8) / 2, material, x, z)
    strandTip(kit, group, copper, .098, top - .02, top + .3, x, z)
    tips.push(new T.Vector3(x, top + .3, z))
  })
  return {group, tips, dispose() { materials.forEach(m => m.dispose()) }}
}

const up = new T.Vector3(0, 1, 0)
/** A chamfered cut face for one strand, so each wire end catches a bright ring of light like real sawn metal. */
function strandCap(r: number, radial: number, end: T.Vector3, direction: T.Vector3) {
  const h = r * .2
  const cap = new T.LatheGeometry([new T.Vector2(r, 0), new T.Vector2(r * .95, h * .6), new T.Vector2(r * .78, h), new T.Vector2(0, h)], radial)
  cap.applyQuaternion(new T.Quaternion().setFromUnitVectors(up, direction))
  cap.translate(end.x, end.y, end.z)
  return cap
}
/** One round strand following `points`, with a chamfered cut face at the chosen ends. */
function strand(points: T.Vector3[], r: number, radial: number, caps: {start?: boolean, end?: boolean}) {
  const parts: T.BufferGeometry[] = [new T.TubeGeometry(new T.CatmullRomCurve3(points), points.length - 1, r, radial, false)]
  const n = points.length - 1
  if (caps.end) parts.push(strandCap(r, radial, points[n], points[n].clone().sub(points[n - 1]).normalize()))
  if (caps.start) parts.push(strandCap(r, radial, points[0], points[0].clone().sub(points[1]).normalize()))
  return parts
}
const smooth = (a: number, b: number, v: number) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t) }

/**
 * The exposed conductor at a stripped cable end, in high detail: 19 round strands laid in a gentle helix (each
 * layer in the opposite direction, as stranded conductors are made), fanning very slightly where the insulation
 * was cut back, with individually cut, chamfered ends. Same footprint as the kit's straight bundle (radius `r`,
 * from `bottom` to `top`), merged into one mesh. Lengths run along local Y.
 */
export function strandTip(kit: CableKit, parent: T.Object3D, material: T.Material, r: number, bottom: number, top: number, x = 0, z = 0) {
  const s = r / 5.15, lay = r * 22, radial = 10
  const positions: [number, number, number][] = [[0, 0, 0]]
  for (let ring = 1; ring <= 2; ring++) for (let i = 0; i < ring * 6; i++) positions.push([s * 2.03 * ring, i * Math.PI * 2 / (ring * 6), ring])
  const segments = Math.max(8, Math.ceil((top - bottom) * 16))
  const parts: T.BufferGeometry[] = []
  for (const [distance, start, ring] of positions) {
    const end = top - (ring ? random() * r * .1 : 0)
    const twist = (ring === 1 ? -1 : 1) * Math.PI * 2 / lay
    const points = Array.from({length:segments + 1}, (_, i) => {
      const y = bottom + (end - bottom) * i / segments, a = start + (y - top) * twist
      const d = distance * (1 + .045 * smooth(top - .22, top, y))
      return new T.Vector3(x + Math.cos(a) * d, y, z + Math.sin(a) * d)
    })
    parts.push(...strand(points, s * .985, radial, {end:true}))
  }
  const geometry = kit.track(mergeGeometries(parts))
  parts.forEach(p => p.dispose())
  const mesh = new T.Mesh(geometry, material)
  parent.add(mesh)
  return mesh
}

/**
 * A bare helically stranded wire (overhead conductor or earth wire) in high detail: smooth round strands with
 * chamfered cut ends at both ends. Same layout and lay as the kit's strandedWire. Built along local Y.
 */
export function helicalWire(kit: CableKit, radius: number, length: number, material: T.Material, {rings = 2, turns = .9, segments = 120, radial = 12} = {}) {
  const group = new T.Group()
  const s = radius / (1.03 + rings * 2.06)
  const positions: [number, number][] = [[0, 0]]
  for (let ring = 1; ring <= rings; ring++) for (let i = 0; i < ring * 6; i++) positions.push([ring * s * 2.03, i * Math.PI * 2 / (ring * 6)])
  const parts: T.BufferGeometry[] = []
  for (const [distance, start] of positions) {
    const points = Array.from({length:segments + 1}, (_, i) => {
      const t = i / segments, angle = start + t * Math.PI * 2 * turns
      return new T.Vector3(Math.cos(angle) * distance, t * length - length / 2, Math.sin(angle) * distance)
    })
    parts.push(...strand(points, s, radial, {start:true, end:true}))
  }
  const geometry = kit.track(mergeGeometries(parts))
  parts.forEach(p => p.dispose())
  group.add(new T.Mesh(geometry, material))
  return group
}
