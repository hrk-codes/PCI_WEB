import * as T from 'three'

/**
 * Low dawn mist: a few large horizontal sheets of soft procedural fog lying in the fields at different heights,
 * lit warm toward the sun and cool away from it. They drift slowly; fully deterministic.
 */
export function createMist(scene: T.Scene, {centre = new T.Vector3(0, 0, -600), size = 5200, heights = [3, 8, 15, 24]} = {}) {
  const uniforms = {
    time:{value:0}, opacity:{value:0},
    sunDir:{value:new T.Vector3(0, .05, -1)},
    warm:{value:new T.Color(0xd98f62)}, cool:{value:new T.Color(0x56606e)},
  }
  const material = new T.ShaderMaterial({
    uniforms, transparent:true, depthWrite:false, side:T.DoubleSide, fog:false,
    vertexShader:`varying vec3 vWorld; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader:`uniform float time, opacity; uniform vec3 sunDir, warm, cool; varying vec3 vWorld;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
        return mix(mix(h(i), h(i + vec2(1, 0)), u.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), u.x), u.y); }
      float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 5; i++) { v += a * n(p); p = p * 2.03 + 7.1; a *= .5; } return v; }
      void main(){
        vec2 p = vWorld.xz / 420. + vec2(time * .012, time * .004);
        float d = smoothstep(.38, .82, fbm(p) * .75 + fbm(p * 3.1 - time * .02) * .35);
        vec3 view = normalize(vWorld - cameraPosition);
        float toSun = pow(max(dot(normalize(vec3(view.x, 0., view.z)), normalize(vec3(sunDir.x, 0., sunDir.z))), 0.), 30.);
        float far = smoothstep(40., 420., distance(vWorld, cameraPosition));  // thin out right in front of the lens
        gl_FragColor = vec4(mix(cool, warm, toSun * .8), d * opacity * far);
      }`,
  })
  const geometry = new T.PlaneGeometry(size, size)
  geometry.rotateX(-Math.PI / 2)
  const sheets = heights.map((y, i) => {
    const mesh = new T.Mesh(geometry, material)
    mesh.position.set(centre.x, y, centre.z)
    mesh.rotation.y = i * .7
    mesh.renderOrder = 2
    scene.add(mesh)
    return mesh
  })
  return {
    uniforms,
    set visible(on: boolean) { sheets.forEach(s => { s.visible = on }) },
    update(time: number) { uniforms.time.value = time },
    dispose() { geometry.dispose(); material.dispose(); sheets.forEach(s => s.removeFromParent()) },
  }
}
