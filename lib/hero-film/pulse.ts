import * as T from 'three'

/**
 * The film's "current": soft bands of warm light that travel along a direction in world space, added to a standard or
 * physical material's emission. Used on conductors, strands and lines. Deterministic: driven by `time` only.
 */
export type Pulse = { time: {value:number}; strength: {value:number}; axis: {value:T.Vector3}; origin: {value:T.Vector3} }

export function addPulse(material: T.MeshStandardMaterial, {axis = new T.Vector3(0, 0, -1), origin = new T.Vector3(), speed = 6, spacing = 9, width = .6, colour = 0xff8a3d}: {axis?:T.Vector3; origin?:T.Vector3; speed?:number; spacing?:number; width?:number; colour?:number} = {}): Pulse {
  const uniforms = {
    pulseTime:{value:0}, pulseStrength:{value:0},
    pulseAxis:{value:axis.clone().normalize()}, pulseOrigin:{value:origin.clone()},
    pulseSpeed:{value:speed}, pulseSpacing:{value:spacing}, pulseWidth:{value:width}, pulseColour:{value:new T.Color(colour)},
  }
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vPulseWorld;')
      .replace('#include <project_vertex>', `#include <project_vertex>
        #ifdef USE_INSTANCING
          vPulseWorld = (modelMatrix * instanceMatrix * vec4(transformed, 1.)).xyz;
        #else
          vPulseWorld = (modelMatrix * vec4(transformed, 1.)).xyz;
        #endif`)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vPulseWorld;
        uniform float pulseTime, pulseStrength, pulseSpeed, pulseSpacing, pulseWidth;
        uniform vec3 pulseAxis, pulseOrigin, pulseColour;`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        {
          float s = dot(vPulseWorld - pulseOrigin, pulseAxis) - pulseTime * pulseSpeed;
          float d = (fract(s / pulseSpacing) - .5) * pulseSpacing;
          float band = exp(-d * d / (pulseWidth * pulseWidth));
          // A white-hot core inside a warm halo.
          totalEmissiveRadiance += pulseStrength * (pulseColour * band + vec3(1.) * pow(band, 6.) * .6);
        }`)
  }
  material.customProgramCacheKey = () => 'pci-pulse'
  material.needsUpdate = true
  return {time:uniforms.pulseTime, strength:uniforms.pulseStrength, axis:uniforms.pulseAxis, origin:uniforms.pulseOrigin}
}
