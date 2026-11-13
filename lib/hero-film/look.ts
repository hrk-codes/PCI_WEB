import * as T from 'three'
import { Sky } from 'three/addons/objects/Sky.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js'
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'

/** Smooth deterministic 1D noise in [-1, 1], used for handheld/drone camera drift. */
export function drift(t: number, seed = 0) {
  const hash = (n: number) => { const s = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453; return s - Math.floor(s) }
  const i = Math.floor(t), f = t - i, u = f * f * (3 - 2 * f)
  return (hash(i) * (1 - u) + hash(i + 1) * u) * 2 - 1
}
export const ease = (x: number) => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t) }
export const easeInOut = (x: number) => { const t = Math.max(0, Math.min(1, x)); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2 }
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p

/**
 * The filmic look shared by every shot: physical sky, sun with soft shadows, aerial haze, ambient occlusion,
 * a little depth of field, and a camera-like finish (grade, vignette, fine grain, slight barrel distortion and
 * colour fringing at the edges). Deterministic for offline rendering.
 */
export function createLook(renderer: T.WebGLRenderer, scene: T.Scene, camera: T.PerspectiveCamera, width: number, height: number) {
  renderer.toneMapping = T.ACESFilmicToneMapping
  renderer.toneMappingExposure = .55
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = T.PCFSoftShadowMap

  const sky = new Sky()
  sky.scale.setScalar(20000)
  scene.add(sky)
  const skyUniforms = sky.material.uniforms
  const sun = new T.DirectionalLight(0xffc89a, 3)
  sun.castShadow = true
  sun.shadow.mapSize.set(4096, 4096)
  sun.shadow.bias = -.0004
  sun.shadow.normalBias = .6
  sun.shadow.radius = 4
  scene.add(sun, sun.target)
  const hemisphere = new T.HemisphereLight(0x9fb8d6, 0x4a3a2c, .55)
  scene.add(hemisphere)
  const sunDirection = new T.Vector3()

  // Reflections come from the same sky, so metal and glass pick up the real horizon glow.
  const pmrem = new T.PMREMGenerator(renderer)
  const envScene = new T.Scene()
  const envSky = new Sky(); envSky.scale.setScalar(1000); envScene.add(envSky)
  let envTarget: T.WebGLRenderTarget | null = null

  /** elevation/azimuth in degrees; azimuth 0 is straight ahead of a camera looking down -z (backlight). */
  function setSun({elevation, azimuth, turbidity = 8, rayleigh = 2.2, mie = .006, mieG = .86, colour = 0xffc89a, intensity = 3, exposure = .55}: {elevation:number, azimuth:number, turbidity?:number, rayleigh?:number, mie?:number, mieG?:number, colour?:number, intensity?:number, exposure?:number}) {
    const phi = T.MathUtils.degToRad(90 - elevation), theta = T.MathUtils.degToRad(180 + azimuth)
    sunDirection.setFromSphericalCoords(1, phi, theta)
    for (const u of [skyUniforms, envSky.material.uniforms]) {
      u.turbidity.value = turbidity; u.rayleigh.value = rayleigh; u.mieCoefficient.value = mie; u.mieDirectionalG.value = mieG
      u.sunPosition.value.copy(sunDirection)
    }
    sun.color.set(colour); sun.intensity = intensity
    renderer.toneMappingExposure = exposure
    envTarget?.dispose()
    envTarget = pmrem.fromScene(envScene)
    scene.environment = envTarget.texture
  }
  // Blue-hour sky: the physical model goes black once the sun is below the horizon, so twilight has its own dome.
  const twilightMaterial = new T.ShaderMaterial({
    side:T.BackSide, depthWrite:false, fog:false,
    uniforms:{top:{value:new T.Color(0x0a1830)}, mid:{value:new T.Color(0x1f3a66)}, band:{value:new T.Color(0xc0714a)}, ground:{value:new T.Color(0x0b111a)}, glow:{value:new T.Vector3(0, 0, -1)}},
    vertexShader:'varying vec3 vDir;void main(){vDir=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`uniform vec3 top;uniform vec3 mid;uniform vec3 band;uniform vec3 ground;uniform vec3 glow;varying vec3 vDir;
      void main(){vec3 d=normalize(vDir);float h=d.y;float g=pow(max(dot(normalize(vec3(d.x,0.,d.z)),normalize(glow)),0.),3.);
        vec3 c=mix(mid,top,smoothstep(.05,.55,h));
        c=mix(mix(band*.55,band,g),c,smoothstep(-.005,.17+.08*g,h));
        c=mix(ground,c,smoothstep(-.04,0.,h));
        gl_FragColor=vec4(c,1.);}`,
  })
  const twilight = new T.Mesh(new T.SphereGeometry(15000, 48, 24), twilightMaterial)
  twilight.visible = false
  scene.add(twilight)
  const twilightScene = new T.Scene(); twilightScene.add(new T.Mesh(new T.SphereGeometry(500, 32, 16), twilightMaterial))
  /** Switches to the blue-hour dome (or back to the physical sky) and rebuilds reflections from it. */
  function setTwilight(on: boolean, exposure = 1) {
    twilight.visible = on; sky.visible = !on
    if (!on) return
    renderer.toneMappingExposure = exposure
    sun.color.set(0x7d8fc0); sun.intensity = .25
    sunDirection.set(0, .15, -1).normalize()
    envTarget?.dispose()
    envTarget = pmrem.fromScene(twilightScene)
    scene.environment = envTarget.texture
  }
  /** Keeps the shadow camera centred on what the camera is looking at. */
  function aimShadows(focus: T.Vector3, extent = 180) {
    sun.position.copy(focus).addScaledVector(sunDirection, 600)
    sun.target.position.copy(focus)
    const cam = sun.shadow.camera
    cam.left = cam.bottom = -extent; cam.right = cam.top = extent
    cam.near = 1; cam.far = 1600
    cam.updateProjectionMatrix()
  }

  const composer = new EffectComposer(renderer)
  composer.setPixelRatio(1)
  composer.setSize(width, height)
  composer.addPass(new RenderPass(scene, camera))
  const ao = new GTAOPass(scene, camera, width, height)
  ao.updateGtaoMaterial({radius:2.5, distanceExponent:1.5, thickness:4, scale:1.2, samples:16})
  ao.blendIntensity = .7
  composer.addPass(ao)
  const bokeh = new BokehPass(scene, camera, {focus:100, aperture:.00002, maxblur:.006})
  composer.addPass(bokeh)
  const bokehUniforms = (bokeh as unknown as {uniforms:Record<string, {value:number}>}).uniforms
  const grade = new ShaderPass({
    uniforms:{tDiffuse:{value:null}, time:{value:0}, fade:{value:0}, fadeColour:{value:new T.Color(0x05101b)}, aspect:{value:width / height}, warmth:{value:.5}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`uniform sampler2D tDiffuse;uniform float time;uniform float fade;uniform vec3 fadeColour;uniform float aspect;uniform float warmth;varying vec2 vUv;
      float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
      void main(){
        vec2 c=vUv-.5; float r2=dot(c*vec2(aspect,1.),c*vec2(aspect,1.));
        vec2 uv=.5+c*(1.-.035*r2);                                   // slight barrel distortion
        float ca=.0016*r2;                                            // colour fringing grows toward the edges
        vec3 col=vec3(texture2D(tDiffuse,uv+c*ca).r,texture2D(tDiffuse,uv).g,texture2D(tDiffuse,uv-c*ca).b);
        float l=dot(col,vec3(.2126,.7152,.0722));
        col=mix(col*vec3(.92,1.,1.06),col,smoothstep(.0,.35,l));      // cool shadows
        col=mix(col,col*vec3(1.+.06*warmth,1.,1.-.06*warmth),smoothstep(.35,1.,l)); // warm highlights
        col*=mix(1.,.62,smoothstep(.25,1.05,r2));                     // vignette
        float g=hash(vUv*vec2(1920.,1080.)+fract(time*7.31))-.5;
        col+=g*.018*(.35+l);                                          // fine film grain, gentle in the shadows
        col=mix(col,fadeColour,fade);
        gl_FragColor=vec4(col,1.);
      }`,
  })
  composer.addPass(grade)
  composer.addPass(new OutputPass())

  return {
    sky, sun, hemisphere, setSun, setTwilight, aimShadows,
    setDepthOfField(focus: number, aperture: number, maxblur = .006) { bokehUniforms.focus.value = focus; bokehUniforms.aperture.value = aperture; bokehUniforms.maxblur.value = maxblur },
    setAo(radius: number, intensity: number) { ao.updateGtaoMaterial({radius}); ao.blendIntensity = intensity },
    setGrade({time, fade = 0, warmth = .5}: {time:number, fade?:number, warmth?:number}) { grade.uniforms.time.value = time; grade.uniforms.fade.value = fade; grade.uniforms.warmth.value = warmth },
    render() { composer.render() },
    resize(w: number, h: number) { composer.setSize(w, h); ao.setSize(w, h); grade.uniforms.aspect.value = w / h },
    dispose() { envTarget?.dispose(); pmrem.dispose(); ao.dispose(); bokeh.dispose?.(); composer.dispose(); sky.material.dispose(); envSky.material.dispose(); sky.geometry.dispose(); twilight.geometry.dispose(); twilightMaterial.dispose() },
  }
}
export type Look = ReturnType<typeof createLook>
