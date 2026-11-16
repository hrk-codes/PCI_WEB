import * as T from 'three'

/**
 * Night storm over the line, for the earth-wire shot: a low cloud deck that lights up from inside with each flash,
 * wind-blown rain around the camera, and a branching lightning bolt that strikes the earth-wire peak of a tower.
 * Everything is seeded, so every render of a frame is identical.
 */
export function createStorm(scene: T.Scene, strike: T.Vector3) {
  const group = new T.Group()
  group.visible = false
  scene.add(group)
  const disposables: {dispose():void}[] = []
  const keep = <D extends {dispose():void}>(d: D) => { disposables.push(d); return d }
  let seed = 7
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647

  // Cloud deck: a ceiling of soft fbm cloud, lit from within around the bolt during a flash.
  const cloudUniforms = {time:{value:0}, flash:{value:0}, flashAt:{value:new T.Vector2(strike.x + 60, strike.z - 100)}}
  const clouds = new T.Mesh(keep(new T.PlaneGeometry(9000, 9000)), keep(new T.ShaderMaterial({
    uniforms:cloudUniforms, transparent:true, depthWrite:false, side:T.DoubleSide, fog:false,
    vertexShader:'varying vec3 vWorld;void main(){vec4 w=modelMatrix*vec4(position,1.);vWorld=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
    fragmentShader:`uniform float time,flash;uniform vec2 flashAt;varying vec3 vWorld;
      float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float n(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),u.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x),u.y);}
      float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<6;i++){v+=a*n(p);p=p*2.02+3.1;a*=.5;}return v;}
      void main(){vec2 p=vWorld.xz/520.+vec2(time*.03,time*.01);float c=fbm(p);float d=smoothstep(.25,.75,c);
        float lit=flash*exp(-distance(vWorld.xz,flashAt)/520.)*(.4+c);
        vec3 col=mix(vec3(.025,.03,.045),vec3(.07,.08,.1),d)+vec3(.75,.72,1.)*lit*1.1;
        gl_FragColor=vec4(col,.55+.45*d);}`,
  })))
  clouds.rotation.x = -Math.PI / 2
  clouds.position.set(strike.x, 420, strike.z)
  clouds.renderOrder = 1
  group.add(clouds)

  // Rain: short streaks in a box around the camera, slanting with the wind.
  const DROPS = 7000, box = {x:[-140, 80], y:[0, 140], z:[strike.z - 140, strike.z + 140]}
  const base = new Float32Array(DROPS * 3)
  for (let i = 0; i < DROPS; i++) base.set([box.x[0] + random() * (box.x[1] - box.x[0]), random() * box.y[1], box.z[0] + random() * (box.z[1] - box.z[0])], i * 3)
  const rainGeo = keep(new T.BufferGeometry())
  rainGeo.setAttribute('position', new T.BufferAttribute(new Float32Array(DROPS * 6), 3))
  const rain = new T.LineSegments(rainGeo, keep(new T.LineBasicMaterial({color:0x9fb4cf, transparent:true, opacity:.32, fog:true})))
  rain.frustumCulled = false
  group.add(rain)

  // Lightning: a jagged main channel by midpoint displacement, plus a few forks.
  const top = new T.Vector3(strike.x + 70, 400, strike.z - 120)
  function jag(a: T.Vector3, b: T.Vector3, depth: number, spread: number): T.Vector3[] {
    if (depth === 0) return [a, b]
    const mid = a.clone().lerp(b, .5)
    mid.x += (random() - .5) * spread; mid.z += (random() - .5) * spread * .6; mid.y += (random() - .5) * spread * .25
    return [...jag(a, mid, depth - 1, spread * .55).slice(0, -1), ...jag(mid, b, depth - 1, spread * .55)]
  }
  const main = jag(top, strike, 7, 120)
  const forks = [.18, .34, .52, .7].map(f => {
    const from = main[Math.floor(f * (main.length - 1))]
    const to = from.clone().add(new T.Vector3((random() - .5) * 140, -40 - random() * 90, (random() - .5) * 60))
    return jag(from, to, 5, 50)
  })
  const boltCore = keep(new T.MeshBasicMaterial({color:new T.Color(0xe9e4ff).multiplyScalar(6), fog:false}))
  const boltGlow = keep(new T.MeshBasicMaterial({color:new T.Color(0x8f7dff).multiplyScalar(2.2), transparent:true, opacity:.22, depthWrite:false, blending:T.AdditiveBlending, fog:false}))
  const bolt = new T.Group()
  const channel = (points: T.Vector3[], r: number) => {
    const curve = new T.CatmullRomCurve3(points, false, 'catmullrom', .05)
    bolt.add(new T.Mesh(keep(new T.TubeGeometry(curve, points.length * 3, r, 6)), boltCore), new T.Mesh(keep(new T.TubeGeometry(curve, points.length * 3, r * 7, 8)), boltGlow))
  }
  channel(main, .32)
  forks.forEach(f => channel(f, .16))
  bolt.visible = false
  group.add(bolt)
  const strikeLight = new T.PointLight(0xd9d2ff, 0, 900, 1.2)
  strikeLight.position.copy(strike).add(new T.Vector3(10, 60, -20))
  group.add(strikeLight)

  /** Lightning brightness at a time in the shot: a first leader, the main stroke, a re-strike, then dark. */
  function flashAt(t: number) {
    const pulse = (at: number, len: number, peak: number) => t >= at && t < at + len ? peak * (1 - (t - at) / len) : 0
    return Math.max(pulse(.55, .06, .45), pulse(.68, .22, 1), pulse(1.02, .1, .7), pulse(2.55, .12, .5))
  }
  return {
    group,
    set visible(on: boolean) { group.visible = on },
    flashAt,
    /** t: seconds into the shot. Returns the flash level (0–1) for the grade and lights. */
    update(t: number) {
      const flash = flashAt(t)
      bolt.visible = flash > .05
      strikeLight.intensity = flash * 2600
      cloudUniforms.time.value = t; cloudUniforms.flash.value = flash
      const p = rainGeo.attributes.position as T.BufferAttribute
      for (let i = 0; i < DROPS; i++) {
        const y = ((base[i * 3 + 1] - t * 62) % box.y[1] + box.y[1]) % box.y[1]
        const x = base[i * 3] + (box.y[1] - y) * .18, z = base[i * 3 + 2]
        p.setXYZ(i * 2, x, y, z); p.setXYZ(i * 2 + 1, x + .35, y + 2.2, z)
      }
      p.needsUpdate = true
      return flash
    },
    dispose() { disposables.forEach(d => d.dispose()); group.removeFromParent() },
  }
}
