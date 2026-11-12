import * as T from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { createCableKit } from '@/lib/cable-models'
import { HERO_FILM_SECONDS } from '@/lib/hero-film-timeline'

/**
 * Deterministic three-shot film for the homepage hero, rendered offline to video.
 * 0–4 s macro conductor strands · 4–8 s armoured cable pull-back · 8–12 s dusk transmission line.
 * Illustrative marketing imagery, not a technical specification.
 */
export function createHeroFilm(canvas: HTMLCanvasElement, width: number, height: number) {
  const renderer = new T.WebGLRenderer({canvas, antialias:true, preserveDrawingBuffer:true, powerPreference:'high-performance'})
  renderer.setPixelRatio(1)
  renderer.setSize(width, height, false)
  renderer.toneMapping = T.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  const scene = new T.Scene()
  const camera = new T.PerspectiveCamera(34, width / height, .05, 1200)
  const kit = createCableKit()
  const {rubber, aluminium, steel, bedding, colours} = kit.materials
  const disposables: {dispose():void}[] = []
  const keep = <D extends {dispose():void}>(d: D) => { disposables.push(d); return d }
  let seed = 7
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  const ease = (x: number) => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t) }
  const easeOut = (x: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, x)), 3)
  const lerp = (a: number, b: number, p: number) => a + (b - a) * p

  // Sky dome: a studio gradient for the product shots, a dusk horizon for the line.
  const skyUniforms = {
    top:{value:new T.Color()}, mid:{value:new T.Color()}, horizon:{value:new T.Color()}, ground:{value:new T.Color()},
    glow:{value:new T.Color()}, glowStrength:{value:0}, sun:{value:new T.Vector3(0, .05, -1).normalize()},
  }
  const skyMaterial = keep(new T.ShaderMaterial({
    side:T.BackSide, depthWrite:false, fog:false, uniforms:skyUniforms,
    vertexShader:'varying vec3 vDir;void main(){vDir=normalize(position);vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;}',
    fragmentShader:`uniform vec3 top;uniform vec3 mid;uniform vec3 horizon;uniform vec3 ground;uniform vec3 glow;uniform float glowStrength;uniform vec3 sun;varying vec3 vDir;
      void main(){vec3 d=normalize(vDir);float h=d.y;
        vec3 c=mix(horizon,mid,smoothstep(0.,.07,h));c=mix(c,top,smoothstep(.07,.42,h));
        c=mix(ground,c,smoothstep(-.06,.0,h));
        float s=max(dot(d,normalize(sun)),0.);c+=glow*glowStrength*(pow(s,28.)*.75+pow(s,400.)*2.2)*smoothstep(-.08,.02,h);
        gl_FragColor=vec4(c,1.);}`,
  }))
  const skyGeometry = kit.track(new T.SphereGeometry(900, 48, 24))
  const sky = new T.Mesh(skyGeometry, skyMaterial)
  scene.add(sky)
  function setSky(mode: 'studio' | 'dusk') {
    if (mode === 'studio') {
      skyUniforms.top.value.set(0x050f1a); skyUniforms.mid.value.set(0x0a1d2e); skyUniforms.horizon.value.set(0x12324a)
      skyUniforms.ground.value.set(0x07131f); skyUniforms.glow.value.set(0x2a6a8a); skyUniforms.glowStrength.value = .35
      skyUniforms.sun.value.set(.4, .1, -1).normalize()
    } else {
      skyUniforms.top.value.set(0x040d18); skyUniforms.mid.value.set(0x173450); skyUniforms.horizon.value.set(0xc8683e)
      skyUniforms.ground.value.set(0x120d0d); skyUniforms.glow.value.set(0xff8a4c); skyUniforms.glowStrength.value = 1.3
      skyUniforms.sun.value.set(-.08, .02, -1).normalize()
    }
  }
  // Environment maps: an indoor softbox for products, the dusk sky for the line.
  const pmrem = keep(new T.PMREMGenerator(renderer))
  const room = new RoomEnvironment()
  const studioEnv = keep(pmrem.fromScene(room, .04)); room.dispose()
  setSky('dusk')
  const skyScene = new T.Scene(); skyScene.add(new T.Mesh(skyGeometry, skyMaterial))
  const duskEnv = keep(pmrem.fromScene(skyScene, .02))

  // Soft orange travelling band, shared by the pulse shells.
  const bandData = new Uint8Array(256 * 4)
  for (let i = 0; i < 256; i++) {
    const v = i / 255, a = Math.round(Math.min(1, Math.exp(-(((v - .5) / .035) ** 2)) + Math.exp(-(((v - .42) / .1) ** 2)) * .25) * 255)
    bandData.set([a, a, a, a], i * 4)
  }
  const band = keep(new T.DataTexture(bandData, 256, 1))
  band.wrapS = band.wrapT = T.RepeatWrapping; band.magFilter = band.minFilter = T.LinearFilter; band.needsUpdate = true
  band.repeat.set(3, 1)
  const pulseMaterial = keep(new T.MeshBasicMaterial({color:0xffa066, alphaMap:band, transparent:true, blending:T.AdditiveBlending, depthWrite:false, toneMapped:false}))

  // Wooden cable drum with wound turns; used in the studio and on the line.
  const wood = keep(new T.MeshStandardMaterial({color:0x5a3d26, roughness:.85, metalness:0}))
  function cableDrum() {
    const drum = new T.Group()
    const parts: T.BufferGeometry[] = []
    for (let layer = 0; layer < 4; layer++) for (let k = 0; k < 15; k++) {
      const g = new T.TorusGeometry(1.18 + layer * .13, .066, 8, 48)
      g.rotateY(Math.PI / 2); g.translate(-.88 + k * .126 + (layer % 2) * .063, 0, 0); parts.push(g)
    }
    const turns = kit.track(mergeGeometries(parts)); parts.forEach(g => g.dispose())
    drum.add(new T.Mesh(turns, rubber))
    const barrel = kit.track(new T.CylinderGeometry(1.1, 1.1, 1.9, 40)); barrel.rotateZ(Math.PI / 2)
    drum.add(new T.Mesh(barrel, wood))
    const flange = kit.track(new T.CylinderGeometry(2.3, 2.3, .14, 56)); flange.rotateZ(Math.PI / 2)
    for (const x of [-1.02, 1.02]) { const f = new T.Mesh(flange, wood); f.position.x = x; drum.add(f) }
    const hub = kit.track(new T.CylinderGeometry(.22, .22, 2.6, 16)); hub.rotateZ(Math.PI / 2)
    drum.add(new T.Mesh(hub, steel))
    return drum
  }

  // ── Shot A: ACSR conductor stranded live ───────────────────────────────────
  const shotA = new T.Group()
  const brightAluminium = keep(new T.MeshStandardMaterial({color:0xc3ccd4, metalness:1, roughness:.16, envMapIntensity:1.1}))
  // Galvanised steel core and two aluminium layers with opposite lay, each turning like a strander.
  const galvanised = keep(new T.MeshStandardMaterial({color:0x7d8992, metalness:.95, roughness:.3}))
  const hero = new T.Group()
  function strandLayer(distance:number, count:number, r:number, from:number, to:number, pitch:number, material:T.Material, segments:number) {
    const turns = pitch ? (to - from) / pitch : 0
    const parts: T.BufferGeometry[] = []
    for (let i = 0; i < count; i++) {
      const start = i * Math.PI * 2 / count
      const pts = Array.from({length:segments + 1}, (_, k) => { const t = k / segments, a = start + t * Math.PI * 2 * turns; return new T.Vector3(Math.cos(a) * distance, from + t * (to - from), Math.sin(a) * distance) })
      parts.push(new T.TubeGeometry(new T.CatmullRomCurve3(pts), segments, r, 10, false))
      const cap = new T.CircleGeometry(r, 14); cap.rotateX(-Math.PI / 2); cap.translate(pts[segments].x, pts[segments].y, pts[segments].z); parts.push(cap)
    }
    const merged = kit.track(mergeGeometries(parts)); parts.forEach(g => g.dispose())
    const mesh = new T.Mesh(merged, material); hero.add(mesh); return mesh
  }
  // Stepped like a cutaway: outer aluminium ends first, then the inner layer, leaving the steel core running into the die.
  strandLayer(0, 1, .105, -24, 4, 0, galvanised, 2)
  const coreLayer = strandLayer(.21, 6, .105, -24, 4, 4.4, galvanised, 500)
  const innerLayer = strandLayer(.427, 12, .112, -24, .9, -5.6, brightAluminium, 600)
  const outerLayer = strandLayer(.651, 18, .112, -24, -.7, 7, brightAluminium, 700)
  hero.rotation.z = -Math.PI / 2
  shotA.add(hero)
  // Closing die the conductor runs through, with a warm indicator ring.
  const die = new T.Group()
  const dieBody = kit.track(new T.CylinderGeometry(1.05, 1.6, 1.3, 48, 1, true)); dieBody.rotateZ(Math.PI / 2)
  die.add(new T.Mesh(dieBody, keep(new T.MeshStandardMaterial({color:0x2a3640, metalness:.85, roughness:.35, side:T.DoubleSide}))))
  const lip = kit.track(new T.TorusGeometry(.8, .13, 16, 64)); lip.rotateY(Math.PI / 2)
  die.add(new T.Mesh(lip, steel))
  const glowRing = kit.track(new T.TorusGeometry(1.07, .022, 8, 96)); glowRing.rotateY(Math.PI / 2)
  const glowLine = new T.Mesh(glowRing, keep(new T.MeshBasicMaterial({color:0xff7444, toneMapped:false}))); glowLine.position.x = -.66
  die.add(glowLine)
  die.position.x = 2.4; shotA.add(die)
  for (const [y, z, r] of [[-1.25, -2.6, .42], [1.6, -5.5, .5], [-2.2, -8, .6]] as const) {
    const wire = kit.strandedWire(r, 40, aluminium, {rings:2, turns:9, segments:300, radial:8})
    wire.rotation.z = -Math.PI / 2; wire.position.set(0, y, z); shotA.add(wire)
  }
  const keyA = new T.DirectionalLight(0xffd6ae, 3.2)
  const rimA = new T.DirectionalLight(0x8fc8ff, 1.6); rimA.position.set(2, -1, -4)
  const accentA = new T.DirectionalLight(0xff7444, 1.4); accentA.position.set(-3, -2, 2)
  shotA.add(keyA, keyA.target, rimA, accentA)
  scene.add(shotA)

  // ── Shot B: four-core armoured cable pull-back ─────────────────────────────
  const shotB = new T.Group()
  const cable = new T.Group()
  kit.cylinder(cable, .58, 2.65, -.9, rubber)
  kit.collar(cable, .565, .425, rubber)
  kit.cylinder(cable, .535, .65, .7, bedding)
  kit.collar(cable, .53, 1.04, bedding)
  const armourGeo = kit.track(new T.CylinderGeometry(.024, .024, .62, 10, 1))
  const armourG = new T.Group(), coresG = new T.Group()
  const armour = new T.InstancedMesh(armourGeo, steel, 54)
  const m = new T.Matrix4()
  for (let i = 0; i < 54; i++) { const a = i * Math.PI * 2 / 54; m.makeTranslation(Math.cos(a) * .54, .73, Math.sin(a) * .54); armour.setMatrixAt(i, m) }
  armourG.add(armour); cable.add(armourG, coresG)
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4, x = Math.cos(a) * .28, z = Math.sin(a) * .28, lift = z < 0 ? .27 : 0
    kit.cylinder(coresG, .215, .82 + lift, 1.26 + lift / 2, colours[i], x, z)
    kit.bundle(coresG, .19, 1.5 + lift, 2.03 + lift + (i % 2) * .1, x, z)
  }
  shotB.add(cable)
  const studioDrum = cableDrum(); studioDrum.position.set(-5.8, .2, -8.5); studioDrum.rotation.y = -.15; shotB.add(studioDrum)
  const bareB = kit.strandedWire(.24, 3.2, aluminium); bareB.position.set(2.5, -.4, -1.7); bareB.rotation.z = -.22; shotB.add(bareB)
  const earthB = kit.strandedWire(.16, 2.8, steel); earthB.position.set(-2.2, -.5, -1.4); earthB.rotation.z = .18; shotB.add(earthB)
  const singleB = new T.Group(); kit.cylinder(singleB, .31, 2.6, -.85, rubber); kit.bundle(singleB, .265, .35, 1.3); singleB.position.set(1.6, -.6, -3.4); singleB.rotation.z = -.1; shotB.add(singleB)
  const keyB = new T.DirectionalLight(0xfff1e2, 2.8); keyB.position.set(-4, 6, 5)
  const rimB = new T.DirectionalLight(0x9fd0ff, 2.2); rimB.position.set(5, 3, -4)
  const accentB = new T.DirectionalLight(0xff7444, 1.1); accentB.position.set(3, -2, 4)
  shotB.add(keyB, rimB, accentB)
  scene.add(shotB)

  // ── Shot C: dusk transmission line ─────────────────────────────────────────
  const shotC = new T.Group()
  const towerMaterial = keep(new T.MeshStandardMaterial({color:0x16222d, metalness:.7, roughness:.55}))
  const lineMaterial = keep(new T.MeshStandardMaterial({color:0xb9c4cc, metalness:1, roughness:.25}))
  const earthMaterial = keep(new T.MeshStandardMaterial({color:0x8a959d, metalness:.9, roughness:.35}))
  const H = 24
  const strut = (a: T.Vector3, b: T.Vector3, r: number) => {
    const g = new T.CylinderGeometry(r, r, a.distanceTo(b), 5, 1)
    g.translate(0, a.distanceTo(b) / 2, 0)
    g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), b.clone().sub(a).normalize()))
    g.translate(a.x, a.y, a.z)
    return g
  }
  function towerGeometry() {
    const parts: T.BufferGeometry[] = []
    const corner = (y: number) => { const w = lerp(3.2, .7, Math.min(1, y / (H * .8))); return [[-w, -w], [w, -w], [w, w], [-w, w]].map(([x, z]) => new T.Vector3(x, y, z)) }
    const levels = [0, 3.5, 7, 10.5, 13.5, 16, 18.5]
    for (let l = 0; l < levels.length - 1; l++) {
      const lo = corner(levels[l]), hi = corner(levels[l + 1])
      for (let i = 0; i < 4; i++) {
        parts.push(strut(lo[i], hi[i], .09))
        parts.push(strut(hi[i], hi[(i + 1) % 4], .05))
        parts.push(strut(lo[i], hi[(i + 1) % 4], .04), strut(lo[(i + 1) % 4], hi[i], .04))
      }
    }
    const top = corner(18.5), peak = new T.Vector3(0, H, 0)
    for (const c of top) parts.push(strut(c, peak, .07))
    for (const [y, span] of [[H * .62, 6], [H * .76, 4.6]]) {
      for (const s of [-1, 1]) {
        parts.push(strut(new T.Vector3(0, y, -.5), new T.Vector3(s * span, y, 0), .07), strut(new T.Vector3(0, y, .5), new T.Vector3(s * span, y, 0), .07))
        parts.push(strut(new T.Vector3(0, y + 1.6, 0), new T.Vector3(s * span, y, 0), .045))
        parts.push(strut(new T.Vector3(s * span, y, 0), new T.Vector3(s * span, y - 1.7, 0), .025))
      }
    }
    parts.push(strut(new T.Vector3(-1, H, 0), new T.Vector3(1, H, 0), .06))
    const merged = mergeGeometries(parts); parts.forEach(p => p.dispose())
    return kit.track(merged)
  }
  const towerGeo = towerGeometry()
  // Disc insulator strings under every cross-arm tip.
  const insulatorParts: T.BufferGeometry[] = []
  for (const [y, span] of [[H * .62, 6], [H * .76, 4.6]]) for (const sgn of [-1, 1]) for (let k = 0; k < 9; k++) {
    const g = new T.CylinderGeometry(.34, .34, .07, 18); g.translate(sgn * span, y - .2 - k * .17, 0); insulatorParts.push(g)
  }
  const insulatorGeo = kit.track(mergeGeometries(insulatorParts)); insulatorParts.forEach(g => g.dispose())
  const glass = keep(new T.MeshStandardMaterial({color:0x5f8f8a, metalness:.1, roughness:.12, emissive:0x10302c}))
  const towerZ = [24, -46, -116, -186, -256, -326, -396]
  for (const z of towerZ) { const t = new T.Mesh(towerGeo, towerMaterial); t.position.set(0, 0, z); shotC.add(t); const ins = new T.Mesh(insulatorGeo, glass); ins.position.z = z; shotC.add(ins) }
  const damperParts: T.BufferGeometry[] = []
  for (const z of [-20, -95, -170, -245, -320]) { const t = new T.Mesh(towerGeo, towerMaterial); t.position.set(-95, 0, z); t.scale.setScalar(.9); shotC.add(t) }
  const attachments: [number, number, boolean][] = [[-6, H * .62 - 1.7, false], [6, H * .62 - 1.7, false], [-4.6, H * .76 - 1.7, false], [4.6, H * .76 - 1.7, false], [-1, H, true], [1, H, true]]
  const pulses: T.Mesh[] = []
  for (const [x, y, earth] of attachments) {
    const points: T.Vector3[] = []
    for (let i = 0; i < towerZ.length - 1; i++) for (let k = 0; k < 40; k++) {
      const s = k / 40, sag = earth ? 2.4 : 3.6
      points.push(new T.Vector3(x, y - sag * 4 * s * (1 - s), lerp(towerZ[i], towerZ[i + 1], s)))
    }
    points.push(new T.Vector3(x, y, towerZ[towerZ.length - 1]))
    const curve = new T.CatmullRomCurve3(points, false, 'centripetal')
    shotC.add(new T.Mesh(kit.track(new T.TubeGeometry(curve, 600, earth ? .05 : .075, 6, false)), earth ? earthMaterial : lineMaterial))
    // Stockbridge vibration dampers near each tower.
    for (let i = 0; i < towerZ.length - 1; i++) for (const s of [.05, .95]) {
      const sag = earth ? 2.4 : 3.6, cy = y - sag * 4 * s * (1 - s) - .32, cz = lerp(towerZ[i], towerZ[i + 1], s)
      for (const dz of [-.42, .42]) { const g = new T.CylinderGeometry(.1, .13, .38, 10); g.rotateX(Math.PI / 2); g.translate(x, cy, cz + dz); damperParts.push(g) }
      const m2 = new T.CylinderGeometry(.025, .025, 1.1, 6); m2.rotateX(Math.PI / 2); m2.translate(x, cy, cz); damperParts.push(m2)
      const c2 = new T.CylinderGeometry(.03, .03, .32, 6); c2.translate(x, cy + .16, cz); damperParts.push(c2)
    }
    if (!earth) { const p = new T.Mesh(kit.track(new T.TubeGeometry(curve, 600, .2, 6, false)), pulseMaterial); p.renderOrder = 2; shotC.add(p); pulses.push(p) }
  }
  shotC.add(new T.Mesh(kit.track(mergeGeometries(damperParts)), earthMaterial)); damperParts.forEach(g => g.dispose())
  // Stringing site: a drum paying out conductor up to the nearest tower.
  const lineDrum = cableDrum(); lineDrum.scale.setScalar(1.3); lineDrum.position.set(15, 3, 30); lineDrum.rotation.y = .35; shotC.add(lineDrum)
  const payout = new T.CatmullRomCurve3([new T.Vector3(13.8, 5.6, 29.2), new T.Vector3(11, 6.6, 27.5), new T.Vector3(6, H * .62 - 1.7, 24.2)])
  shotC.add(new T.Mesh(kit.track(new T.TubeGeometry(payout, 80, .08, 6, false)), lineMaterial))
  const payoutPulse = new T.Mesh(kit.track(new T.TubeGeometry(payout, 80, .2, 6, false)), pulseMaterial); payoutPulse.renderOrder = 2; shotC.add(payoutPulse)
  const ground = new T.Mesh(kit.track(new T.PlaneGeometry(2400, 2400)), keep(new T.MeshStandardMaterial({color:0x060b10, roughness:1})))
  ground.rotation.x = -Math.PI / 2; shotC.add(ground)
  // Distant settlement lights along the horizon.
  const lightPositions: number[] = []
  for (let i = 0; i < 420; i++) lightPositions.push((random() - .5) * 1400, .4 + random() * 2, -380 - random() * 420)
  const dotCanvas = document.createElement('canvas'); dotCanvas.width = dotCanvas.height = 32
  const dc = dotCanvas.getContext('2d')!; const grad = dc.createRadialGradient(16, 16, 0, 16, 16, 16)
  grad.addColorStop(0, '#fff'); grad.addColorStop(.35, '#ffffff88'); grad.addColorStop(1, '#ffffff00'); dc.fillStyle = grad; dc.fillRect(0, 0, 32, 32)
  const dot = keep(new T.CanvasTexture(dotCanvas))
  const pointsGeo = kit.track(new T.BufferGeometry()); pointsGeo.setAttribute('position', new T.Float32BufferAttribute(lightPositions, 3))
  shotC.add(new T.Points(pointsGeo, keep(new T.PointsMaterial({color:0xffc48c, size:2.4, map:dot, transparent:true, depthWrite:false, blending:T.AdditiveBlending, fog:false}))))
  const sunC = new T.DirectionalLight(0xffa36e, 2.2); sunC.position.set(-20, 12, -200)
  shotC.add(sunC, new T.HemisphereLight(0x5d86a8, 0x0b1218, .7))
  scene.add(shotC)
  const duskFog = new T.Fog(0x6a3a28, 90, 760)

  // ── Post: depth of field, grade, output ────────────────────────────────────
  const composer = new EffectComposer(renderer)
  composer.setPixelRatio(1); composer.setSize(width, height)
  composer.addPass(new RenderPass(scene, camera))
  const bokeh = new BokehPass(scene, camera, {focus:2, aperture:.002, maxblur:.01})
  composer.addPass(bokeh)
  const grade = new ShaderPass({
    uniforms:{tDiffuse:{value:null}, fade:{value:0}, aspect:{value:width / height}, navy:{value:new T.Color(0x061626)}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`uniform sampler2D tDiffuse;uniform float fade;uniform float aspect;uniform vec3 navy;varying vec2 vUv;
      void main(){vec4 c=texture2D(tDiffuse,vUv);float l=dot(c.rgb,vec3(.2126,.7152,.0722));
        c.rgb=mix(c.rgb*vec3(.86,.98,1.12),c.rgb,smoothstep(0.,.45,l));
        vec2 q=vUv-vec2(.56,.5);q.x*=aspect;c.rgb*=mix(1.,.5,smoothstep(.45,1.15,length(q)));
        c.rgb*=mix(.78,1.,smoothstep(.0,.6,vUv.x));
        c.rgb=mix(c.rgb,navy,fade);gl_FragColor=c;}`,
  })
  composer.addPass(grade)
  composer.addPass(new OutputPass())
  const bokehUniforms = (bokeh as unknown as {uniforms:Record<string,{value:number}>}).uniforms

  function resize(w: number, h: number) {
    renderer.setSize(w, h, false); composer.setSize(w, h)
    camera.aspect = w / h
    camera.fov = w / h < 1 ? 48 : 34
    camera.updateProjectionMatrix()
    grade.uniforms.aspect.value = w / h
  }
  resize(width, height)

  const look = new T.Vector3()
  function setTime(seconds: number) {
    const t = ((seconds % HERO_FILM_SECONDS) + HERO_FILM_SECONDS) % HERO_FILM_SECONDS
    const shot = t < 4 ? 0 : t < 8 ? 1 : 2
    shotA.visible = shot === 0; shotB.visible = shot === 1; shotC.visible = shot === 2
    // A short dip to navy hides each cut and the loop point.
    const dip = Math.max(...[0, 4, 8, 12].map(c => 1 - ease(Math.abs(t - c) / .38)))
    grade.uniforms.fade.value = dip * .92
    if (shot === 0) {
      const u = t / 4
      setSky('studio'); scene.environment = studioEnv.texture; scene.fog = null
      camera.position.set(lerp(-6.5, -3.2, u), lerp(.95, .82, u), lerp(1.45, 1.25, u))
      look.set(camera.position.x + 3.2, -.05, -.15)
      camera.up.set(Math.sin(lerp(-.06, .04, u)), 1, 0).normalize()
      camera.lookAt(look)
      coreLayer.rotation.y = t * .55; innerLayer.rotation.y = -t * .4; outerLayer.rotation.y = t * .3
      const sweep = lerp(-1, 1, ease(u))
      keyA.position.set(camera.position.x + sweep * 6, 3, 2.5); keyA.target.position.set(camera.position.x + 2, 0, 0)
      bokehUniforms.focus.value = camera.position.distanceTo(look) * .92
      bokehUniforms.aperture.value = .0028; bokehUniforms.maxblur.value = .007
    } else if (shot === 1) {
      const u = easeOut((t - 4) / 4)
      setSky('studio'); scene.environment = studioEnv.texture; scene.fog = null
      camera.position.set(lerp(.55, 3.9, u), lerp(2.95, 3.3, u), lerp(.95, 7.4, u))
      look.set(lerp(-.15, -1.7, u), lerp(2.0, .35, u), 0)
      camera.up.set(0, 1, 0); camera.lookAt(look)
      cable.rotation.y = .5 + ((t - 4) / 4) * .55
      const build = (t - 4) / 4
      armourG.position.y = (1 - ease(build / .5)) * 1.5
      coresG.rotation.y = (1 - ease(build / .7)) * -1.2
      studioDrum.rotation.x = t * .35
      bareB.rotation.y = t * .4; earthB.rotation.y = -t * .35
      bokehUniforms.focus.value = camera.position.distanceTo(look)
      bokehUniforms.aperture.value = lerp(.004, .0012, u); bokehUniforms.maxblur.value = .007
    } else {
      const u = (t - 8) / 4
      setSky('dusk'); scene.environment = duskEnv.texture; scene.fog = duskFog
      camera.position.set(lerp(16, 12, u), lerp(7, 10.5, u), lerp(46, 14, ease(u)))
      look.set(-2, 22, -160)
      camera.up.set(0, 1, 0); camera.lookAt(look)
      band.offset.x = -((t - 8) * .16) % 1
      lineDrum.rotation.x = -t * .3
      bokehUniforms.focus.value = 80; bokehUniforms.aperture.value = .00012; bokehUniforms.maxblur.value = .004
    }
    composer.render()
  }
  function dispose() {
    composer.dispose(); bokeh.dispose?.(); grade.dispose?.()
    kit.dispose(); disposables.forEach(d => d.dispose()); renderer.dispose()
  }
  return {setTime, resize, dispose}
}
