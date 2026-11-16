import * as T from 'three'

/**
 * Light effects added to a standard or physical material's emission, in world space. Deterministic: driven only by
 * the uniforms the film sets for each frame. A material carries one effect (the last one added).
 *
 * - addPulse: the film's "current" · soft bands of warm light travelling along a direction, repeating. `phase` shifts
 *   the bands across another direction, so the three phases of a line light up a third of a cycle apart.
 * - addScan: a single band at a set distance along a direction (or both ways from an origin), with an optional fading
 *   trail behind it and a reach limit around the axis. Used for the engineering scan up a tower and for a lightning
 *   surge running along the earth wire and down to ground.
 */
export type Pulse = { time: {value:number}; strength: {value:number}; axis: {value:T.Vector3}; origin: {value:T.Vector3}; colour: {value:T.Color} }
export type Scan = { level: {value:number}; strength: {value:number}; width: {value:number}; trail: {value:number}; reach: {value:number}; axis: {value:T.Vector3}; origin: {value:T.Vector3}; colour: {value:T.Color}; both: {value:number} }

function inject(material: T.MeshStandardMaterial, key: string, uniforms: Record<string, {value:unknown}>, declarations: string, body: string) {
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vFxWorld;')
      .replace('#include <project_vertex>', `#include <project_vertex>
        #ifdef USE_INSTANCING
          vFxWorld = (modelMatrix * instanceMatrix * vec4(transformed, 1.)).xyz;
        #else
          vFxWorld = (modelMatrix * vec4(transformed, 1.)).xyz;
        #endif`)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vFxWorld;\n${declarations}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n{\n${body}\n}`)
  }
  material.customProgramCacheKey = () => key
  material.needsUpdate = true
}

export function addPulse(material: T.MeshStandardMaterial, {axis = new T.Vector3(0, 0, -1), origin = new T.Vector3(), speed = 6, spacing = 9, width = .6, colour = 0xff8a3d, phase = new T.Vector3()}: {axis?:T.Vector3; origin?:T.Vector3; speed?:number; spacing?:number; width?:number; colour?:number; phase?:T.Vector3} = {}): Pulse {
  const uniforms = {
    pulseTime:{value:0}, pulseStrength:{value:0},
    pulseAxis:{value:axis.clone().normalize()}, pulseOrigin:{value:origin.clone()}, pulsePhase:{value:phase.clone()},
    pulseSpeed:{value:speed}, pulseSpacing:{value:spacing}, pulseWidth:{value:width}, pulseColour:{value:new T.Color(colour)},
  }
  inject(material, 'pci-pulse', uniforms,
    'uniform float pulseTime, pulseStrength, pulseSpeed, pulseSpacing, pulseWidth; uniform vec3 pulseAxis, pulseOrigin, pulsePhase, pulseColour;',
    `float s = dot(vFxWorld - pulseOrigin, pulseAxis) + dot(vFxWorld, pulsePhase) - pulseTime * pulseSpeed;
     float d = (fract(s / pulseSpacing) - .5) * pulseSpacing;
     float band = exp(-d * d / (pulseWidth * pulseWidth));
     // A white-hot core inside a warm halo.
     totalEmissiveRadiance += pulseStrength * (pulseColour * band + vec3(1.) * pow(band, 6.) * .6);`)
  return {time:uniforms.pulseTime, strength:uniforms.pulseStrength, axis:uniforms.pulseAxis, origin:uniforms.pulseOrigin, colour:uniforms.pulseColour}
}

export function addScan(material: T.MeshStandardMaterial, {colour = 0x3fd8ff} = {}): Scan {
  const uniforms = {
    scanLevel:{value:0}, scanStrength:{value:0}, scanWidth:{value:.6}, scanTrail:{value:0}, scanReach:{value:1e6},
    scanAxis:{value:new T.Vector3(0, 1, 0)}, scanOrigin:{value:new T.Vector3()}, scanColour:{value:new T.Color(colour)}, scanBoth:{value:0},
  }
  inject(material, 'pci-scan', uniforms,
    'uniform float scanLevel, scanStrength, scanWidth, scanTrail, scanReach, scanBoth; uniform vec3 scanAxis, scanOrigin, scanColour;',
    `vec3 rel = vFxWorld - scanOrigin;
     float along = dot(rel, scanAxis);
     along = mix(along, abs(along), scanBoth);
     float side = length(rel - dot(rel, scanAxis) * scanAxis);
     float within = 1. - smoothstep(scanReach, scanReach * 1.35, side);
     float d = along - scanLevel;
     float band = exp(-d * d / (scanWidth * scanWidth));
     float behind = scanTrail * step(d, 0.) * exp(d / max(scanWidth * 14., .001));
     totalEmissiveRadiance += scanStrength * within * (scanColour * (band + behind * .35) + vec3(1.) * pow(band, 8.) * .5);`)
  return {level:uniforms.scanLevel, strength:uniforms.scanStrength, width:uniforms.scanWidth, trail:uniforms.scanTrail, reach:uniforms.scanReach, axis:uniforms.scanAxis, origin:uniforms.scanOrigin, colour:uniforms.scanColour, both:uniforms.scanBoth}
}
