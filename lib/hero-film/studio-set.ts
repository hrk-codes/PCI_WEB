import * as T from 'three'
import { createStudioEnvironment } from '@/lib/studio'
import type { Look } from './look'

/** One shot of the film: its own scene, posed for a local time in seconds (0 at the shot's first frame). */
export type Shot = {
  scene: T.Scene
  frame(t: number, camera: T.PerspectiveCamera, look: Look): void
  dispose(): void
}

/**
 * A dark product-photography set for the close-ups: a deep navy backdrop with a soft warm glow behind the subject,
 * a warm key, a cool rim and studio reflections. Same palette as the site's navy.
 */
export function createStudioSet(renderer: T.WebGLRenderer, {glow = 0xff9a52, glowAt = new T.Vector3(.35, .1, -1), envIntensity = .55, glowStrength = .22, size = 400} = {}) {
  const scene = new T.Scene()
  const env = createStudioEnvironment(renderer)
  scene.environment = env.texture
  scene.environmentIntensity = envIntensity
  const backdropMaterial = new T.ShaderMaterial({
    side:T.BackSide, depthWrite:false, fog:false,
    uniforms:{top:{value:new T.Color(0x0b2034)}, bottom:{value:new T.Color(0x03080f)}, glow:{value:new T.Color(glow)}, glowDir:{value:glowAt.clone().normalize()}, glowStrength:{value:glowStrength}},
    vertexShader:'varying vec3 vDir;void main(){vDir=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`uniform vec3 top,bottom,glow,glowDir;uniform float glowStrength;varying vec3 vDir;
      void main(){vec3 d=normalize(vDir);vec3 c=mix(bottom,top,smoothstep(-.6,.7,d.y));
        float g=pow(max(dot(d,normalize(glowDir)),0.),6.);c+=glow*g*glowStrength;gl_FragColor=vec4(c,1.);}`,
  })
  const backdrop = new T.Mesh(new T.SphereGeometry(size, 48, 24), backdropMaterial)
  scene.add(backdrop)
  const key = new T.DirectionalLight(0xffe2c2, 3.4); key.position.set(6, 5, 4)
  const rim = new T.DirectionalLight(0x9cc6ff, 2.6); rim.position.set(-6, 3, -5)
  const fill = new T.HemisphereLight(0x8fb3d9, 0x0b1520, .35)
  scene.add(key, rim, fill)
  return {
    scene, key, rim, fill, backdropMaterial,
    dispose() { env.dispose(); backdrop.geometry.dispose(); backdropMaterial.dispose() },
  }
}

/** Where a world direction (e.g. the sun) lands on screen, in 0–1 UV, for the grade's lens flare. */
export function screenUv(camera: T.PerspectiveCamera, worldPoint: T.Vector3) {
  const p = worldPoint.clone().project(camera)
  return {x:p.x * .5 + .5, y:p.y * .5 + .5, inFront:p.z < 1}
}
