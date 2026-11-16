import * as T from 'three'
import { createLook, drift, ease, easeInOut, lerp } from '@/lib/hero-film/look'
import { buildCountryside } from '@/lib/hero-film/countryside'
import { createMist } from '@/lib/hero-film/mist'
import { addPulse } from '@/lib/hero-film/pulse'
import { createInsulatorShot } from '@/lib/hero-film/insulator-shot'
import { createConductorShot } from '@/lib/hero-film/conductor-shot'
import { createCableShot } from '@/lib/hero-film/cable-shot'
import { createBrandShot } from '@/lib/hero-film/brand-shot'
import { screenUv, type Shot } from '@/lib/hero-film/studio-set'

/**
 * The homepage opening film "Dawn to current", rendered offline to video (scripts/render-hero-film.mjs). Original 3D:
 * 0–4 s dawn aerial over misty plains and a transmission line · 4–8 s glass insulator string and clamps at the
 * crossarm · 8–12 s inside a PCI ACSR conductor, current racing along the strands, layers opening to the steel core ·
 * 12–16 s PCI's armoured XLPE cable opening layer by layer · 16–20 s blue hour, current flowing down the line to the
 * town · 20–24 s a cable draws the PCI mark, then the loop. Deterministic: every frame depends only on setTime(t).
 */
export const FILM_SECONDS = 24

export function createHeroFilm(canvas: HTMLCanvasElement, width: number, height: number) {
  const renderer = new T.WebGLRenderer({canvas, antialias:true, preserveDrawingBuffer:true, powerPreference:'high-performance'})
  renderer.setPixelRatio(1)
  renderer.setSize(width, height, false)
  const scene = new T.Scene()
  const camera = new T.PerspectiveCamera(38, width / height, .1, 25000)
  const look = createLook(renderer, scene, camera, width, height)
  const land = buildCountryside(scene)
  const mist = createMist(scene)
  const linePulse = addPulse(land.conductorMaterial, {axis:new T.Vector3(0, 0, -1), speed:140, spacing:330, width:7})
  const target = new T.Vector3(), focus = new T.Vector3(), sunPoint = new T.Vector3()
  const fogs = {dawn:new T.FogExp2(0x8a6450, .00055), blue:new T.FogExp2(0x2c3a58, .00055)}
  let mood = ''
  function setMood(next: 'dawn' | 'blue') {
    if (mood === next) return
    mood = next
    land.setNight(next === 'blue')
    if (next === 'dawn') { look.setTwilight(false); look.setSun({elevation:1.8, azimuth:-9, turbidity:6, rayleigh:2.2, mie:.0014, mieG:.975, colour:0xff9a5c, intensity:2.6, exposure:.27}) }
    else look.setTwilight(true, 1.05)
    look.hemisphere.intensity = next === 'dawn' ? .5 : .8
    look.hemisphere.color.set(next === 'dawn' ? 0xa7b4cc : 0x7f97cc)
    scene.fog = fogs[next]
  }
  const ground = (x: number, z: number) => land.heightAt(x, z) + .2
  function landscape(near = .5, far = 25000) {
    look.useScene(scene)
    renderer.toneMapping = T.ACESFilmicToneMapping
    camera.near = near; camera.far = far
  }
  /** The sun on screen, for the grade's anamorphic streak. */
  function flareFromSun(strength: number) {
    sunPoint.copy(camera.position).addScaledVector(look.sun.position.clone().sub(look.sun.target.position).normalize(), 5000)
    const s = screenUv(camera, sunPoint)
    look.setFlare(s.x, s.y, s.inFront ? strength : 0)
  }

  /** 0–4 s · dawn: a drone rises over mist lying in the fields as the sun clears the horizon behind the line. */
  function dawn(t: number) {
    const u = t / 4
    landscape()
    setMood('dawn')
    mist.visible = true
    mist.uniforms.opacity.value = .55
    camera.fov = camera.aspect < 1 ? 52 : 38
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
    linePulse.strength.value = 0
  }
  /** 16–20 s · blue hour over the same line: lights on, current flowing toward the town on the horizon. */
  function blueHour(t: number) {
    const u = t / 4
    landscape()
    setMood('blue')
    mist.visible = true
    mist.uniforms.opacity.value = .18
    camera.fov = camera.aspect < 1 ? 52 : 38
    camera.position.set(lerp(-62, -44, ease(u)) + drift(t * .3, 11) * .5, lerp(30, 40, easeInOut(u)), lerp(-60, -230, u))
    target.set(lerp(-12, -2, u), 26, camera.position.z - 460)
    camera.up.set(drift(t * .2, 12) * .01, 1, 0).normalize()
    camera.lookAt(target)
    focus.set(0, 20, camera.position.z - 80)
    look.aimShadows(focus, 220)
    look.setDepthOfField(300, .000002, .001)
    look.setAo(2.5, .5)
    look.setBloom(.75, .9, .7)
    look.setFlare(.5, .5, 0)
    linePulse.time.value = t
    linePulse.strength.value = 3.2 * ease(t / .8)
  }

  const closeUps = {insulator:createInsulatorShot(renderer), conductor:createConductorShot(renderer), cable:createCableShot(renderer), brand:createBrandShot(renderer)}
  /** Close-ups have their own exposure; the studio shots use neutral tone mapping so PCI's colours stay true. */
  function closeUp(shot: Shot, near: number, far: number, exposure: number, neutral: boolean) {
    return (t: number) => {
      look.useScene(shot.scene)
      camera.near = near; camera.far = far
      mood = ''
      renderer.toneMapping = neutral ? T.NeutralToneMapping : T.ACESFilmicToneMapping
      renderer.toneMappingExposure = exposure
      shot.frame(t, camera, look)
    }
  }
  const shots = [
    {start:0, end:4, run:dawn, warmth:.8},
    {start:4, end:8, run:closeUp(closeUps.insulator, .01, 1200, .95, false), warmth:.75},
    {start:8, end:12, run:closeUp(closeUps.conductor, .05, 900, .9, true), warmth:.6},
    {start:12, end:16, run:closeUp(closeUps.cable, .1, 900, 1, true), warmth:.5},
    {start:16, end:20, run:blueHour, warmth:.25},
    {start:20, end:FILM_SECONDS, run:closeUp(closeUps.brand, 5, 6000, 1, true), warmth:.45},
  ]
  const cuts = [0, ...shots.map(s => s.end)]

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
    shot.run(t - shot.start)
    camera.updateProjectionMatrix()
    land.update(t)
    mist.update(t)
    // A brief dip at each cut and at the loop point, so cuts feel like an edit rather than a jump.
    const dip = Math.max(...cuts.map(c => 1 - ease(Math.abs(t - c) / .28)))
    look.setGrade({time:t, fade:dip * .92, warmth:shot.warmth})
    look.render()
  }
  return {setTime, resize, duration:FILM_SECONDS, dispose() { Object.values(closeUps).forEach(s => s.dispose()); mist.dispose(); land.dispose(); look.dispose(); renderer.dispose() }}
}
