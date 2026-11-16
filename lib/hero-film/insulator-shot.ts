import * as T from 'three'
import { buildConductor, conductorMaterials, constructions } from '@/lib/conductor-models'
import { drift, ease, easeInOut, lerp, type Look } from './look'
import { screenUv, type Shot } from './studio-set'

/**
 * Shot 2 · close-up at the crossarm: the camera glides down a string of toughened-glass cap-and-pin discs, dawn sun
 * glowing through the glass, to the yoke plate and suspension clamps holding a twin bundle of ACSR conductor.
 * Real proportions in metres (254 mm discs at 146 mm spacing, ~32 mm conductor).
 */
const DISC_SPACING = .146, DISCS = 10
const SUN = new T.Vector3(-1, .16, -.42).normalize()

function discProfile() {
  // Cap-and-pin disc: glass shed sloping down from the cap, a rolled rim, and anti-fog ribs underneath.
  const p: [number, number][] = [
    [0.036, .004], [.06, -.004], [.095, -.02], [.124, -.036], [.128, -.042], [.126, -.048], [.118, -.05],
    [.108, -.046], [.102, -.07], [.094, -.073], [.088, -.05], [.074, -.046], [.068, -.072], [.06, -.075],
    [.054, -.048], [.042, -.044], [.036, -.03], [.034, -.008],
  ]
  return p.map(([r, y]) => new T.Vector2(r, y))
}
function capProfile() {
  const p: [number, number][] = [[0, .05], [.018, .05], [.03, .046], [.04, .036], [.044, .02], [.044, -.012], [.04, -.026], [.012, -.03], [0, -.03]]
  return p.map(([r, y]) => new T.Vector2(r, y))
}

/** Dawn sky dome for the close-ups: warm horizon, glowing sun, a soft distant tree line. */
function dawnDome() {
  return new T.ShaderMaterial({
    side:T.BackSide, depthWrite:false, fog:false,
    uniforms:{sun:{value:SUN.clone()}},
    vertexShader:'varying vec3 vDir;void main(){vDir=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`uniform vec3 sun;varying vec3 vDir;
      float h(float x){return fract(sin(x*127.1)*43758.5453);}
      float n(float x){float i=floor(x),f=fract(x);return mix(h(i),h(i+1.),f*f*(3.-2.*f));}
      void main(){vec3 d=normalize(vDir);float y=d.y;
        float s=max(dot(d,sun),0.);
        vec3 zen=vec3(.07,.15,.32),mid=vec3(.36,.42,.58),hor=vec3(.95,.52,.28);
        vec3 c=mix(hor,mid,smoothstep(.0,.16,y));c=mix(c,zen,smoothstep(.12,.7,y));
        c+=vec3(1.,.5,.2)*pow(s,8.)*.7+vec3(1.,.78,.5)*pow(s,80.)*1.6+vec3(1.,.95,.85)*smoothstep(.9994,.9997,s)*12.;
        float az=atan(d.z,d.x);float line=.018+n(az*40.)*.012+n(az*170.)*.006;
        float trees=1.-smoothstep(line-.004,line+.002,y);
        c=mix(c,vec3(.18,.13,.12)+hor*.12,trees*smoothstep(-.05,.0,y));
        c=mix(vec3(.2,.15,.13),c,smoothstep(-.06,-.0,y));
        gl_FragColor=vec4(c,1.);}`,
  })
}

export function createInsulatorShot(renderer: T.WebGLRenderer): Shot {
  const scene = new T.Scene()
  const domeMaterial = dawnDome()
  const dome = new T.Mesh(new T.SphereGeometry(900, 64, 32), domeMaterial)
  scene.add(dome)
  // Reflections from the same dawn sky.
  const pmrem = new T.PMREMGenerator(renderer)
  const envScene = new T.Scene(); envScene.add(new T.Mesh(new T.SphereGeometry(50, 64, 32), domeMaterial))
  const env = pmrem.fromScene(envScene, .02)
  scene.environment = env.texture
  scene.environmentIntensity = .9
  const sun = new T.DirectionalLight(0xffb27a, 3)
  sun.position.copy(SUN).multiplyScalar(20)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  Object.assign(sun.shadow.camera, {left:-2.5, right:2.5, top:2.5, bottom:-2.5, near:1, far:60})
  sun.shadow.bias = -.0002
  scene.add(sun, new T.HemisphereLight(0x9fb3d0, 0x3a2c22, .5))

  const glass = new T.MeshPhysicalMaterial({color:0x7cc4a6, transmission:.94, thickness:.03, roughness:.03, ior:1.52, attenuationColor:new T.Color(0x2f7a62), attenuationDistance:.035, clearcoat:.5, clearcoatRoughness:.05, specularIntensity:.8})
  const zinc = new T.MeshStandardMaterial({color:0x9aa1a5, metalness:.85, roughness:.38})
  const darkZinc = new T.MeshStandardMaterial({color:0x6c7378, metalness:.8, roughness:.5})
  const geometries: T.BufferGeometry[] = []
  const keep = <G extends T.BufferGeometry>(g: G) => { geometries.push(g); return g }
  const discGeo = keep(new T.LatheGeometry(discProfile(), 96)), capGeo = keep(new T.LatheGeometry(capProfile(), 48))
  const pinGeo = keep(new T.CylinderGeometry(.009, .009, .08, 16))

  function insulatorString() {
    const string = new T.Group()
    for (let k = 0; k < DISCS; k++) {
      const y = -.12 - k * DISC_SPACING
      const disc = new T.Mesh(discGeo, glass), cap = new T.Mesh(capGeo, zinc), pin = new T.Mesh(pinGeo, darkZinc)
      disc.position.y = cap.position.y = y; pin.position.y = y - .07
      disc.rotation.y = k * .7
      cap.castShadow = pin.castShadow = disc.castShadow = true
      string.add(disc, cap, pin)
    }
    // Top: ball-eye and clevis to the crossarm. Bottom: socket-clevis to a yoke plate carrying two clamps.
    const eye = new T.Mesh(keep(new T.TorusGeometry(.03, .011, 12, 32)), zinc); eye.position.y = -.035; string.add(eye)
    const link = new T.Mesh(keep(new T.CylinderGeometry(.012, .012, .08, 12)), zinc); link.position.y = -.08; string.add(link)
    const bottom = -.12 - DISCS * DISC_SPACING
    const socket = new T.Mesh(keep(new T.CylinderGeometry(.02, .02, .12, 16)), zinc); socket.position.y = bottom + .02; string.add(socket)
    // The yoke runs across the line (x); the twin conductors hang side by side from it and run along the line (z).
    // Yoke plate: a triangular plate with rounded corners, apex up at the string, carrying the two clamps.
    const yokeShape = new T.Shape()
    yokeShape.moveTo(-.27, -.03); yokeShape.lineTo(.27, -.03); yokeShape.quadraticCurveTo(.29, -.03, .27, .0)
    yokeShape.lineTo(.03, .1); yokeShape.quadraticCurveTo(0, .115, -.03, .1); yokeShape.lineTo(-.27, 0); yokeShape.quadraticCurveTo(-.29, -.03, -.27, -.03)
    const yokeGeo = keep(new T.ExtrudeGeometry(yokeShape, {depth:.014, bevelEnabled:true, bevelThickness:.003, bevelSize:.003, bevelSegments:2}))
    yokeGeo.translate(0, 0, -.007)
    const yoke = new T.Mesh(yokeGeo, zinc); yoke.position.y = bottom - .13; yoke.castShadow = true; string.add(yoke)
    // Suspension clamps: a cast body around the conductor, two U-bolts, and twin straps up to the yoke.
    const clampProfile = [[.0165, -.1], [.022, -.095], [.027, -.07], [.029, -.02], [.029, .02], [.027, .07], [.022, .095], [.0165, .1]].map(([r, y]) => new T.Vector2(r, y))
    const clampGeo = keep(new T.LatheGeometry(clampProfile, 40)); clampGeo.rotateX(Math.PI / 2)
    const uGeo = keep(new T.TorusGeometry(.031, .0045, 10, 28))
    const strapGeo = keep(new T.BoxGeometry(.006, .13, .028))
    for (const x of [-.24, .24]) {
      const clamp = new T.Mesh(clampGeo, zinc); clamp.position.set(x, bottom - .25, 0); clamp.castShadow = true; string.add(clamp)
      for (const z of [-.045, .045]) { const u = new T.Mesh(uGeo, darkZinc); u.position.set(x, bottom - .25, z); string.add(u) }
      for (const dz of [-.022, .022]) { const strap = new T.Mesh(strapGeo, zinc); strap.position.set(x, bottom - .19, dz); strap.castShadow = true; string.add(strap) }
    }
    return {string, bottom}
  }

  const {string, bottom} = insulatorString()
  scene.add(string)
  // Crossarm above: galvanised angle chords and lacing, running off toward the tower body.
  const arm = new T.Group()
  const angle = (length: number) => { const g = new T.Group(); const a = new T.Mesh(keep(new T.BoxGeometry(length, .06, .006)), darkZinc), b = new T.Mesh(keep(new T.BoxGeometry(length, .006, .06)), darkZinc); a.position.y = .03; b.position.z = .03; g.add(a, b); g.traverse(o => { o.castShadow = true }); return g }
  // Bottom chords converge to the arm tip; lacing zig-zags between them; a hanger plate takes the string.
  // The arm runs back over the camera to the tower body (+x), so only its tip is seen above the string.
  for (const z of [-1, 1]) { const chord = angle(9); chord.rotation.y = -z * .045; chord.position.set(4.5, .04, z * .2); arm.add(chord) }
  for (let k = 0; k < 11; k++) { const lace = angle(.5 + k * .04); lace.rotation.y = k % 2 ? 1.1 : -1.1; lace.position.set(.35 + k * .8, .04, 0); arm.add(lace) }
  const hanger = new T.Mesh(keep(new T.BoxGeometry(.12, .1, .012)), darkZinc); hanger.position.y = .01; arm.add(hanger)
  scene.add(arm)

  // Twin-bundle ACSR conductor through the clamps, along the line (z), drooping gently either side.
  const metals = conductorMaterials()
  const scale = .0159 / .9 // model radius .9 units (four layers of .2 wire around the core) → 31.8 mm conductor
  const conductors: {dispose():void}[] = []
  for (const x of [-.24, .24]) for (const side of [-1, 1]) {
    const built = buildConductor('acsr', metals, {length:260, wire:.2, step:0, layers:[...constructions.acsr, {count:24, metal:'aluminium', shape:'round'}], segmentsPerUnit:1.6})
    const g = built.group
    g.scale.setScalar(scale)
    // buildConductor runs back along -z from z = 0: flip one half so the two halves leave the clamp both ways.
    g.rotation.y = side < 0 ? 0 : Math.PI
    const holder = new T.Group(); holder.add(g)
    holder.position.set(x, bottom - .25, 0)
    holder.rotation.x = side * .05 // a little droop away from the clamp
    g.traverse(o => { o.castShadow = true })
    scene.add(holder)
    conductors.push(built)
  }

  const target = new T.Vector3(), sunPoint = new T.Vector3()
  return {
    scene,
    frame(t: number, camera: T.PerspectiveCamera, look: Look) {
      const u = easeInOut(t / 4)
      camera.fov = camera.aspect < 1 ? 48 : 32
      camera.updateProjectionMatrix()
      // A slow crane down beside the string, looking slightly up into the dawn so the sun glows through the glass,
      // ending on the clamps and the twin conductor heading off along the line.
      const y = lerp(-.5, bottom - .34, u)
      camera.position.set(lerp(1.25, 1.05, u) + drift(t * .6, 31) * .006, y + drift(t * .5, 32) * .005, lerp(.42, .3, u))
      target.set(0, y + lerp(.32, .12, u), lerp(.3, .26, u))
      camera.up.set(drift(t * .3, 33) * .006, 1, 0).normalize()
      camera.lookAt(target)
      look.setDepthOfField(camera.position.distanceTo(new T.Vector3(0, y, 0)), .0008, .011)
      look.setAo(.08, .55)
      look.setBloom(.3, 2.6, .7)
      sunPoint.copy(camera.position).addScaledVector(SUN, 500)
      const s = screenUv(camera, sunPoint)
      look.setFlare(s.x, s.y, s.inFront ? .5 : 0)
    },
    dispose() {
      geometries.forEach(g => g.dispose()); conductors.forEach(c => c.dispose())
      ;[glass, zinc, darkZinc, domeMaterial, ...Object.values(metals)].forEach(m => m.dispose())
      dome.geometry.dispose(); env.dispose(); pmrem.dispose()
    },
  }
}
