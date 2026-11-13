import * as T from 'three'
import { createLook, drift, ease, easeInOut, lerp } from '@/lib/hero-film/look'
import { buildCountryside } from '@/lib/hero-film/countryside'

/**
 * The homepage opening film, rendered offline to video (scripts/render-hero-film.mjs). One transmission line:
 * 0–6 s golden-hour drone push past the towers · 6–10 s low tracking shot along insulators and conductors against
 * the sun · 10–14 s a stringing site paying conductor up to the tower · 14–18 s blue hour, looping to the start.
 * Deterministic: every frame depends only on the time passed to setTime(). Illustrative CG, not footage.
 */
export const FILM_SECONDS = 18

export function createHeroFilm(canvas: HTMLCanvasElement, width: number, height: number) {
  const renderer = new T.WebGLRenderer({canvas, antialias:true, preserveDrawingBuffer:true, powerPreference:'high-performance'})
  renderer.setPixelRatio(1)
  renderer.setSize(width, height, false)
  const scene = new T.Scene()
  const camera = new T.PerspectiveCamera(38, width / height, .1, 25000)
  const look = createLook(renderer, scene, camera, width, height)
  const land = buildCountryside(scene)
  const target = new T.Vector3(), focus = new T.Vector3()
  const fogs = {golden:new T.FogExp2(0xc9926c, .00085), blue:new T.FogExp2(0x2c3a58, .00055)}
  let mood = ''
  function setMood(next: 'golden' | 'blue') {
    if (mood === next) return
    mood = next
    land.setNight(next === 'blue')
    if (next === 'golden') { look.setTwilight(false); look.setSun({elevation:2.4, azimuth:-14, turbidity:12, rayleigh:2.8, mie:.0032, mieG:.94, colour:0xffa066, intensity:3.2, exposure:.36}) }
    else look.setTwilight(true, 1.05)
    look.hemisphere.intensity = next === 'golden' ? .55 : .8
    look.hemisphere.color.set(next === 'golden' ? 0x9fb8d6 : 0x7f97cc)
    scene.fog = fogs[next]
  }
  const ground = (x: number, z: number) => land.heightAt(x, z) + .2

  /** 0–6 s · a drone pushes along the line at golden hour and rises past the first tower's crossarms. */
  function push(t: number) {
    const u = t / 6
    setMood('golden')
    camera.position.set(lerp(34, 15, ease(u)) + drift(t * .35, 1) * .6, lerp(13, 61, easeInOut(u)) + drift(t * .4, 2) * .45, lerp(96, -74, u))
    target.set(lerp(-8, -2, u) + drift(t * .25, 3) * .8, lerp(33, 27, u), camera.position.z - 340)
    camera.up.set(drift(t * .2, 4) * .012, 1, 0).normalize()
    camera.lookAt(target)
    focus.set(0, 20, Math.min(0, camera.position.z - 60))
    look.aimShadows(focus, 220)
    look.setDepthOfField(camera.position.distanceTo(new T.Vector3(0, 30, 0)), .000003, .0015)
    look.setAo(2.5, .65)
  }
  /** 6–10 s · beside the second tower's crossarms: insulator strings and twin conductors in silhouette, sun beyond. */
  function track(t: number) {
    const u = easeInOut(t / 4), base = ground(0, -330)
    setMood('golden')
    camera.position.set(lerp(14.5, 12.4, u) + drift(t * .5, 5) * .08, base + lerp(32.5, 35.2, u) + drift(t * .45, 6) * .06, lerp(-292, -314, u))
    target.set(lerp(2, -1, u), base + lerp(29, 27, u), -760)
    camera.up.set(drift(t * .3, 7) * .01, 1, 0).normalize()
    camera.lookAt(target)
    focus.set(0, base + 20, -360)
    look.aimShadows(focus, 120)
    const insulator = new T.Vector3(9.2, base + 35, -330)
    look.setDepthOfField(camera.position.distanceTo(insulator), .00011, .009)
    look.setAo(1.2, .6)
  }
  /** 10–14 s · at ground level by the stringing site: the drum turns and conductor climbs to the tower's pulley. */
  function stringing(t: number) {
    const u = ease(t / 4), base = ground(10, 46)
    setMood('golden')
    camera.position.set(lerp(19.5, 15.5, u) + drift(t * .6, 8) * .05, base + lerp(1.6, 2.3, u) + drift(t * .5, 9) * .04, lerp(64, 57, u))
    target.set(lerp(6, 4, u), base + lerp(7, 13, u), lerp(14, 4, u))
    camera.up.set(drift(t * .3, 10) * .01, 1, 0).normalize()
    camera.lookAt(target)
    focus.set(8, base, 38)
    look.aimShadows(focus, 45)
    look.setDepthOfField(camera.position.distanceTo(new T.Vector3(9.5, base + 2, 46)), .00022, .01)
    look.setAo(1, .7)
  }
  /** 14–18 s · blue hour over the same line: aviation lights on, a town glowing on the horizon. */
  function blueHour(t: number) {
    const u = t / 4
    setMood('blue')
    camera.position.set(lerp(-62, -44, ease(u)) + drift(t * .3, 11) * .5, lerp(30, 40, easeInOut(u)), lerp(-60, -230, u))
    target.set(lerp(-12, -2, u), 26, camera.position.z - 460)
    camera.up.set(drift(t * .2, 12) * .01, 1, 0).normalize()
    camera.lookAt(target)
    focus.set(0, 20, camera.position.z - 80)
    look.aimShadows(focus, 220)
    look.setDepthOfField(300, .000002, .001)
    look.setAo(2.5, .5)
  }

  const shots = [{start:0, end:6, run:push}, {start:6, end:10, run:track}, {start:10, end:14, run:stringing}, {start:14, end:FILM_SECONDS, run:blueHour}]
  const cuts = [0, ...shots.map(s => s.end)]

  function resize(w: number, h: number) {
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.fov = w / h < 1 ? 52 : 38
    camera.updateProjectionMatrix()
    look.resize(w, h)
  }
  resize(width, height)

  function setTime(seconds: number) {
    const t = ((seconds % FILM_SECONDS) + FILM_SECONDS) % FILM_SECONDS
    const shot = shots.find(s => t >= s.start && t < s.end) ?? shots[0]
    shot.run(t - shot.start)
    land.update(t)
    // A brief dip at each cut and at the loop point, so cuts feel like an edit rather than a jump.
    const dip = Math.max(...cuts.map(c => 1 - ease(Math.abs(t - c) / .28)))
    look.setGrade({time:t, fade:dip * .92, warmth:mood === 'golden' ? .75 : .25})
    look.render()
  }
  return {setTime, resize, duration:FILM_SECONDS, dispose() { land.dispose(); look.dispose(); renderer.dispose() }}
}
