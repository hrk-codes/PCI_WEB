import * as T from 'three'

/**
 * The engineering-scan overlay for the tower shot: a square outline that hugs the tower body at the scan height and a
 * faint ring of grid light spreading out from it, both additive, so the sweep reads like a survey of the structure.
 */
export function createScanOverlay(scene: T.Scene, halfWidth: (y: number) => number) {
  const group = new T.Group()
  group.visible = false
  scene.add(group)
  const colour = new T.Color(0x47dcff)
  const edge = new T.MeshBasicMaterial({color:colour.clone().multiplyScalar(5), transparent:true, opacity:1, depthWrite:false, blending:T.AdditiveBlending, fog:false})
  const bar = new T.BoxGeometry(1, .09, .09)
  const square = new T.Group()
  const sides = [0, 1, 2, 3].map(() => { const m = new T.Mesh(bar, edge); square.add(m); return m })
  group.add(square)
  const discUniforms = {colour:{value:colour.clone().multiplyScalar(1.6)}, opacity:{value:0}, inner:{value:2}}
  const disc = new T.Mesh(new T.CircleGeometry(15, 96), new T.ShaderMaterial({
    uniforms:discUniforms, transparent:true, depthWrite:false, blending:T.AdditiveBlending, side:T.DoubleSide, fog:false,
    vertexShader:'varying vec2 vP;void main(){vP=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`uniform vec3 colour;uniform float opacity,inner;varying vec2 vP;
      void main(){float r=length(vP);float fade=smoothstep(inner+5.,inner,r)*smoothstep(inner*.9,inner*1.1,r);
        float ring=exp(-pow((r-inner-1.2)/.12,2.))+exp(-pow((r-inner-2.6)/.08,2.))*.6;
        vec2 g=abs(fract(vP/1.2)-.5);float grid=smoothstep(.46,.5,max(g.x,g.y))*.35;
        gl_FragColor=vec4(colour*(ring*1.6+grid+.04),fade*opacity*(ring+grid+.15));}`,
  }))
  disc.rotation.x = -Math.PI / 2
  group.add(disc)

  return {
    set visible(on: boolean) { group.visible = on },
    /** Places the overlay around a tower at `base`, at height `y` above it, with brightness `strength` (0–1). */
    update(base: T.Vector3, y: number, strength: number) {
      const w = halfWidth(Math.max(0, Math.min(48, y))) + .35
      square.position.set(base.x, base.y + y, base.z)
      sides.forEach((m, i) => {
        m.scale.x = w * 2
        m.position.set(i === 0 ? 0 : i === 1 ? w : i === 2 ? 0 : -w, 0, i === 0 ? w : i === 2 ? -w : 0)
        m.rotation.y = i % 2 ? Math.PI / 2 : 0
      })
      edge.opacity = strength
      disc.position.set(base.x, base.y + y, base.z)
      discUniforms.inner.value = w * 1.25
      discUniforms.opacity.value = strength * .75
    },
    dispose() { bar.dispose(); edge.dispose(); disc.geometry.dispose(); (disc.material as T.Material).dispose(); group.removeFromParent() },
  }
}
