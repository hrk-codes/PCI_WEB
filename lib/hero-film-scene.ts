import * as T from 'three'
import { createLook, drift, ease, easeInOut, lerp } from '@/lib/hero-film/look'
import { buildCountryside, halfWidth } from '@/lib/hero-film/countryside'
import { createMist } from '@/lib/hero-film/mist'
import { addPulse, addScan } from '@/lib/hero-film/pulse'
import { createScanOverlay } from '@/lib/hero-film/scan-overlay'
import { createStorm } from '@/lib/hero-film/storm'
import { createStrandingShot } from '@/lib/hero-film/stranding-shot'
import { createConductorShot } from '@/lib/hero-film/conductor-shot'
import { createCoreShot } from '@/lib/hero-film/core-shot'
import { createFieldShot } from '@/lib/hero-film/field-shot'
import { createBrandShot } from '@/lib/hero-film/brand-shot'
import { screenUv, type Shot } from '@/lib/hero-film/studio-set'

/**
 * The homepage opening film "Dawn to current", rendered offline to video (scripts/render-hero-film.mjs). Original 3D,
 * nine shots in 32.5 s:
 *  0–4     dawn aerial over misty plains and a transmission line
 *  4–7.5   an engineering scan sweeps up a lattice tower
 *  7.5–11.5 a stranding machine closes wires into conductor
 *  11.5–15 inside a PCI ACSR conductor, layers opening to the steel core
 *  15–18 the cut face lights ring by ring
 *  18–21.5 insulated bundle support and magnetic field
 *  21.5–25 three-phase current flowing toward the town
 *  25–28.5 earth-wire storm protection
 *  28.5–32.5 the PCI mark, then the loop
 * Deterministic: every frame depends only on setTime(t).
 */
export const FILM_SECONDS = 32.5

const BLUE_HOUR = {top:0x0a1830, mid:0x1f3a66, band:0xc0714a, ground:0x0b111a}
const STORM_SKY = {top:0x04060a, mid:0x0d1320, band:0x1d2230, ground:0x05070b}

export function createHeroFilm(canvas: HTMLCanvasElement, width: number, height: number) {
  const renderer = new T.WebGLRenderer({canvas, antialias:true, preserveDrawingBuffer:true, powerPreference:'high-performance'})
  renderer.setPixelRatio(1)
  renderer.setSize(width, height, false)
  const scene = new T.Scene()
  const camera = new T.PerspectiveCamera(38, width / height, .1, 25000)
  const look = createLook(renderer, scene, camera, width, height)
  const land = buildCountryside(scene)
  const mist = createMist(scene)
  // Three-phase current: each crossarm level (6.5 m apart) is a third of a cycle behind the one below.
  const linePulse = addPulse(land.conductorMaterial, {axis:new T.Vector3(0, 0, -1), speed:150, spacing:330, width:8, phase:new T.Vector3(0, 330 / 3 / 6.5, 0)})
  const steelScan = addScan(land.steelMaterial)
  const earthScan = addScan(land.earthWireMaterial, {colour:0xc4b8ff})
  const overlay = createScanOverlay(scene, halfWidth)
  const ground = (x: number, z: number) => land.heightAt(x, z) + .2
  const scanTower = new T.Vector3(0, ground(0, -330), -330)
  const stormTower = new T.Vector3(0, ground(0, -660), -660)
  const strike = new T.Vector3(3.4, stormTower.y + 49.2, stormTower.z)
  const storm = createStorm(scene, strike)
  const target = new T.Vector3(), focus = new T.Vector3(), sunPoint = new T.Vector3()
  const fogs = {dawn:new T.FogExp2(0x8a6450, .00055), blue:new T.FogExp2(0x2c3a58, .00055), storm:new T.FogExp2(0x0c111b, .0011)}
  let mood = ''
  function setMood(next: 'dawn' | 'blue' | 'storm') {
    if (mood === next) return
    mood = next
    land.setNight(next !== 'dawn')
    if (next === 'dawn') { look.setTwilight(false); look.setSun({elevation:1.8, azimuth:-9, turbidity:6, rayleigh:2.2, mie:.0014, mieG:.975, colour:0xff9a5c, intensity:2.6, exposure:.27}) }
    else { look.setTwilightColours(next === 'blue' ? BLUE_HOUR : STORM_SKY); look.setTwilight(true, next === 'blue' ? 1.05 : .95) }
    look.hemisphere.color.set(next === 'dawn' ? 0xa7b4cc : next === 'blue' ? 0x7f97cc : 0x6a7898)
    scene.fog = fogs[next]
  }
  /** Common setup for a landscape shot; every effect the shot does not use is switched off. */
  function landscape(next: 'dawn' | 'blue' | 'storm') {
    look.useScene(scene)
    renderer.toneMapping = T.ACESFilmicToneMapping
    camera.near = .5; camera.far = 25000
    setMood(next)
    look.hemisphere.intensity = next === 'dawn' ? .5 : next === 'blue' ? .8 : .35
    camera.fov = camera.aspect < 1 ? 52 : 38
    linePulse.strength.value = 0
    steelScan.strength.value = 0; earthScan.strength.value = 0
    overlay.visible = false
    storm.visible = false
    mist.visible = next !== 'storm'
  }
  /** The sun on screen, for the grade's anamorphic streak. */
  function flareFromSun(strength: number) {
    sunPoint.copy(camera.position).addScaledVector(look.sun.position.clone().sub(look.sun.target.position).normalize(), 5000)
    const s = screenUv(camera, sunPoint)
    look.setFlare(s.x, s.y, s.inFront ? strength : 0)
  }

  /** dawn: a drone rises over mist lying in the fields as the sun clears the horizon behind the line. */
  function dawn(t: number) {
    const u = t / 4
    landscape('dawn')
    mist.uniforms.opacity.value = .55
    camera.position.set(lerp(-40, -27, ease(u)) + drift(t * .35, 1) * .6, lerp(14, 40, easeInOut(u)) + drift(t * .4, 2) * .4, lerp(150, 10, u))
    target.set(lerp(30, 20, u) + drift(t * .25, 3) * .6, lerp(30, 26, u), camera.position.z - 380)
    camera.up.set(drift(t * .2, 4) * .012, 1, 0).normalize()
    camera.lookAt(target)
    focus.set(0, 20, camera.position.z - 120)
    look.aimShadows(focus, 260)
    look.setDepthOfField(200, .000002, .001)
    look.setAo(2.5, .6)
    look.setBloom(0) // the sky's sun is far too bright in HDR for bloom; the lens streak carries it
    flareFromSun(.45)
    mist.uniforms.sunDir.value.copy(look.sun.position).sub(look.sun.target.position).normalize()
  }
  /** the scan: low beside a tower, looking up into the dawn as a survey scan sweeps from the footings to the peak. */
  function towerScan(t: number) {
    const u = easeInOut(t / 3.5)
    landscape('dawn')
    mist.uniforms.opacity.value = .4
    const b = scanTower
    camera.position.set(b.x + lerp(19, 13, u) + drift(t * .4, 21) * .15, b.y + lerp(2.2, 6.5, u) + drift(t * .45, 22) * .1, b.z + lerp(34, 22, u))
    target.set(b.x - lerp(5, 3, u), b.y + lerp(24, 30, u), b.z - 6)
    camera.up.set(drift(t * .3, 23) * .01, 1, 0).normalize()
    camera.fov = camera.aspect < 1 ? 60 : 46
    camera.lookAt(target)
    focus.copy(b).add(new T.Vector3(0, 20, 0))
    look.aimShadows(focus, 60)
    look.setDepthOfField(camera.position.distanceTo(focus), .00001, .002)
    look.setAo(1.2, .6)
    look.setBloom(.55, 1.6, .55)
    flareFromSun(.35)
    const level = lerp(-1, 51, ease((t - .25) / 2.9))
    const strength = ease(t / .3) * (1 - ease((t - 3.1) / .4))
    steelScan.origin.value.copy(b); steelScan.axis.value.set(0, 1, 0); steelScan.both.value = 0
    steelScan.colour.value.set(0x3fd8ff); steelScan.level.value = level; steelScan.width.value = .55; steelScan.trail.value = 1; steelScan.reach.value = 11
    steelScan.strength.value = 3.2 * strength
    overlay.visible = true
    overlay.update(b, level, strength)
  }
  /** blue hour over the same line: lights on, three-phase current flowing toward the town on the horizon. */
  function threePhase(t: number) {
    const u = t / 3.5
    landscape('blue')
    mist.uniforms.opacity.value = .18
    camera.position.set(lerp(-62, -46, ease(u)) + drift(t * .3, 11) * .5, lerp(30, 39, easeInOut(u)), lerp(-60, -215, u))
    target.set(lerp(-12, -2, u), 26, camera.position.z - 460)
    camera.up.set(drift(t * .2, 12) * .01, 1, 0).normalize()
    camera.lookAt(target)
    focus.set(0, 20, camera.position.z - 80)
    look.aimShadows(focus, 220)
    look.setDepthOfField(300, .000002, .001)
    look.setAo(2.5, .5)
    look.setBloom(.8, .9, .7)
    look.setFlare(.5, .5, 0)
    linePulse.time.value = t
    linePulse.strength.value = 4 * ease(t / .6)
  }
  let stormFlash = 0
  /** the storm: lightning strikes the earth wire; the surge runs along it both ways and down the tower to ground. */
  function lightning(t: number) {
    const u = easeInOut(t / 3.5)
    landscape('storm')
    storm.visible = true
    stormFlash = storm.update(t)
    const b = stormTower
    camera.position.set(b.x + lerp(-34, -27, u) + drift(t * .5, 31) * .25, b.y + lerp(5, 9, u) + drift(t * .45, 32) * .15, b.z + lerp(70, 54, u))
    target.set(b.x + 4, b.y + lerp(33, 37, u), b.z - 10)
    camera.up.set(drift(t * .4, 33) * .012 + stormFlash * .004, 1, 0).normalize()
    camera.lookAt(target)
    focus.copy(b).add(new T.Vector3(0, 25, 0))
    look.aimShadows(focus, 80)
    look.setDepthOfField(camera.position.distanceTo(focus), .00001, .002)
    look.setAo(1.5, .5)
    look.setBloom(.55, 1.4, .6)
    look.setFlare(.5, .5, 0)
    look.hemisphere.intensity = .35 + stormFlash * 1.2
    // The surge: out along the earth wires both ways, and down the tower steel to the footings.
    const since = t - .7, fade = 1 - ease((since - .9) / 1.4)
    earthScan.origin.value.copy(strike).setX(0); earthScan.axis.value.set(0, 0, 1); earthScan.both.value = 1
    earthScan.level.value = Math.max(0, since) * 240; earthScan.width.value = 7; earthScan.trail.value = 1; earthScan.reach.value = 6
    earthScan.strength.value = since > 0 ? 7 * fade : 0
    steelScan.origin.value.copy(b).setY(b.y + 49); steelScan.axis.value.set(0, -1, 0); steelScan.both.value = 0
    steelScan.colour.value.set(0xc4b8ff); steelScan.level.value = Math.max(0, since) * 60; steelScan.width.value = 1.8; steelScan.trail.value = .7; steelScan.reach.value = 8
    steelScan.strength.value = since > 0 ? 5 * fade : 0
  }

  const closeUps = {stranding:createStrandingShot(renderer), conductor:createConductorShot(renderer), core:createCoreShot(renderer), field:createFieldShot(renderer), brand:createBrandShot(renderer)}
  /** Close-ups have their own exposure; the studio shots use neutral tone mapping so PCI's colours stay true.
   *  `pace` replays a shot designed for one length in another (a 4 s conductor view in 3.5 s, for example). */
  function closeUp(shot: Shot, near: number, far: number, exposure: number, neutral: boolean, pace = 1) {
    return (t: number) => {
      look.useScene(shot.scene)
      camera.near = near; camera.far = far
      mood = ''
      renderer.toneMapping = neutral ? T.NeutralToneMapping : T.ACESFilmicToneMapping
      renderer.toneMappingExposure = exposure
      shot.frame(t * pace, camera, look)
    }
  }
  // cut: how the shot starts · a dip through navy, or a quick flash of light in the given colour.
  type Cut = {kind:'dip'} | {kind:'flash', colour:number}
  const dip: Cut = {kind:'dip'}
  const shots: {start:number, end:number, run:(t:number) => void, warmth:number, cut:Cut}[] = [
    {start:0, end:4, run:dawn, warmth:.8, cut:dip},
    {start:4, end:7.5, run:towerScan, warmth:.65, cut:{kind:'flash', colour:0xcff4ff}},
    {start:7.5, end:11.5, run:closeUp(closeUps.stranding, .1, 600, .95, true), warmth:.6, cut:{kind:'flash', colour:0xffe2bf}},
    {start:11.5, end:15, run:closeUp(closeUps.conductor, .05, 900, .9, true, 4 / 3.5), warmth:.6, cut:dip},
    {start:15, end:18, run:closeUp(closeUps.core, .05, 600, .95, true), warmth:.6, cut:{kind:'flash', colour:0xffd2a0}},
    {start:18, end:21.5, run:closeUp(closeUps.field, .1, 600, .85, true), warmth:.35, cut:{kind:'flash', colour:0xc8f2ff}},
    {start:21.5, end:25, run:threePhase, warmth:.25, cut:dip},
    {start:25, end:28.5, run:lightning, warmth:.15, cut:dip},
    {start:28.5, end:FILM_SECONDS, run:closeUp(closeUps.brand, 5, 6000, 1, true), warmth:.45, cut:dip},
  ]

  function resize(w: number, h: number) {
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    look.resize(w, h)
  }
  resize(width, height)

  function setTime(seconds: number) {
    const t = ((seconds % FILM_SECONDS) + FILM_SECONDS) % FILM_SECONDS
    const shot = shots.find(s => t >= s.start && t < s.end) ?? shots[0]
    stormFlash = 0
    shot.run(t - shot.start)
    camera.updateProjectionMatrix()
    land.update(t)
    mist.update(t)
    // Cuts: a brief dip through navy (and at the loop point), or a short flash of light into the next shot.
    let fade = 0, flash = 0, flashColour = 0xfff1df
    for (const [i, s] of shots.entries()) {
      const d = Math.abs(t - s.start), loop = i === 0 ? Math.abs(t - FILM_SECONDS) : Infinity
      if (s.cut.kind === 'dip') fade = Math.max(fade, 1 - ease(Math.min(d, loop) / .28))
      else if (d < .22) { const k = (1 - ease(d / .22)) * (t < s.start ? .55 : 1); if (k > flash) { flash = k; flashColour = s.cut.colour } }
    }
    // Lightning lights the whole frame for an instant.
    if (stormFlash * .2 > flash) { flash = stormFlash * .2; flashColour = 0xdcd8ff }
    look.setGrade({time:t, fade:fade * .92, warmth:shot.warmth, flash:flash * .85, flashColour})
    look.render()
  }
  return {setTime, resize, duration:FILM_SECONDS, dispose() { Object.values(closeUps).forEach(s => s.dispose()); overlay.dispose(); storm.dispose(); mist.dispose(); land.dispose(); look.dispose(); renderer.dispose() }}
}
