import * as T from 'three'
import { createStudioEnvironment } from '@/lib/studio'
import { LOGO_WIDTH, MARK_HEIGHT } from '@/lib/pci-logo-geometry'
import { buildPciMark, ease, span } from '@/lib/pci-mark'

/**
 * The About page's 3D PCI mark. Every stroke of the logo is a real round cable: the orange cable draws the P,
 * its cut end opens to show insulation and copper strands, the blue C sweeps round, the I rises and CABLES is
 * strung letter by letter (the mark only: no company-suffix line). The finished mark rests with a light glint,
 * then plays again; a click replays it. Renders only while something is moving and the stage is on screen.
 */
const INTRO_SECONDS = 4.7
/** Finished mark rests this long before playing again; one glint runs part-way through the rest. */
const HOLD_SECONDS = 9, REWIND_SECONDS = .9
const GLINT_AT = INTRO_SECONDS + 4, GLINT_SECONDS = 1.3

export function createPciLogoScene(host: HTMLElement, {still = false}: {still?: boolean} = {}) {
  const renderer = new T.WebGLRenderer({antialias:true, alpha:true, powerPreference:'high-performance'})
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.toneMapping = T.NeutralToneMapping
  renderer.toneMappingExposure = 1
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = T.PCFSoftShadowMap
  renderer.domElement.setAttribute('aria-hidden', 'true')
  host.appendChild(renderer.domElement)

  const scene = new T.Scene()
  const env = createStudioEnvironment(renderer)
  scene.environment = env.texture
  scene.environmentIntensity = .32
  const camera = new T.PerspectiveCamera(20, 1, 10, 2000)
  const key = new T.DirectionalLight(0xffffff, 2.4)
  key.position.set(-60, 90, 140)
  key.castShadow = true
  key.shadow.mapSize.set(2048, 2048)
  key.shadow.radius = 9
  key.shadow.blurSamples = 16
  key.shadow.bias = -.0006
  Object.assign(key.shadow.camera, {left:-110, right:110, top:80, bottom:-80, near:20, far:400})
  scene.add(key)
  const fill = new T.HemisphereLight(0xffffff, 0xd9dfe2, .7)
  scene.add(fill)
  const glint = new T.PointLight(0xfff4e8, 0, 90, 1.4)
  scene.add(glint)

  // The mark stands a little proud of a backdrop that only shows its soft shadow; the stage colour is CSS.
  const backdrop = new T.Mesh(new T.PlaneGeometry(600, 400), new T.ShadowMaterial({opacity:.16}))
  backdrop.position.z = -11
  backdrop.receiveShadow = true
  scene.add(backdrop)
  const mark = buildPciMark()
  const logo = mark.group
  scene.add(logo)
  const pose = mark.pose

  // Timeline: the intro starts on the first frame the stage is on screen (not when the code loads), holds the
  // finished mark with one glint, then un-draws quickly and plays again. A click does the same at any time.
  let start: number | null = null, rewindFrom: number | null = null
  let frame = 0, idle = 0, visible = false, disposed = false

  function fit() {
    const w = host.clientWidth || 1, h = host.clientHeight || 1
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    const half = T.MathUtils.degToRad(camera.fov / 2)
    const distance = Math.max((MARK_HEIGHT * .74) / Math.tan(half), (LOGO_WIDTH * .68) / (Math.tan(half) * camera.aspect))
    camera.position.set(0, 0, distance)
    camera.near = distance * .3; camera.far = distance * 3
    camera.updateProjectionMatrix()
  }

  function render(now: number) {
    frame = 0
    if (disposed) return
    if (start === null) {
      if (!visible) return
      start = now - (still ? INTRO_SECONDS * 1000 : 0)
    }
    let t: number, rewinding = false
    if (rewindFrom !== null) {
      const p = (now - rewindFrom) / 1000 / REWIND_SECONDS
      if (p >= 1) { rewindFrom = null; start = now; t = 0 }
      else { t = INTRO_SECONDS * (1 - ease(p)); rewinding = true }
    } else t = (now - start) / 1000
    if (still) t = Math.max(t, INTRO_SECONDS)
    const intro = rewinding || t < INTRO_SECONDS
    pose(Math.min(t, INTRO_SECONDS))
    // The mark turns to face the visitor as it is drawn.
    const settle = ease(span(t, 0, 3.4))
    logo.rotation.set(.2 * (1 - settle), -.5 * (1 - settle), 0)
    logo.position.z = -18 * (1 - settle)
    // A light glint runs along the mark as the intro finishes, and once more while it rests.
    const sweep = still || rewinding ? 0 : t < INTRO_SECONDS ? span(t, 3.3, INTRO_SECONDS) : span(t, GLINT_AT, GLINT_AT + GLINT_SECONDS)
    glint.intensity = Math.sin(Math.PI * sweep) * 900
    glint.position.set(-95 + 190 * sweep, 30 - 35 * sweep, 22)
    renderer.render(scene, camera)
    host.dataset.ready = 'yes'
    host.dataset.phase = still ? 'still' : rewinding ? 'rewind' : intro ? 'intro' : 'rest'
    if (still || !visible) return
    if (!intro && t >= INTRO_SECONDS + HOLD_SECONDS) { rewindFrom = now; schedule(); return }
    if (intro || (sweep > 0 && sweep < 1)) { schedule(); return }
    const next = t < GLINT_AT ? GLINT_AT : INTRO_SECONDS + HOLD_SECONDS
    idle = window.setTimeout(schedule, Math.max(0, (next - t) * 1000))
  }
  function schedule() { clearTimeout(idle); if (!frame && !disposed) frame = requestAnimationFrame(render) }

  // Compile every material up front so the first drawn frame is the true start of the intro.
  renderer.compile(scene, camera)
  pose(0)
  const resize = new ResizeObserver(() => { fit(); if (start !== null) schedule() })
  resize.observe(host)
  const observer = new IntersectionObserver(entries => { visible = entries.some(e => e.isIntersecting); if (visible) schedule(); else clearTimeout(idle) })
  observer.observe(host)
  fit()

  return {
    /** Un-draws and plays the drawing again (a click on the mark). */
    replay() { if (still || start === null || rewindFrom !== null) return; rewindFrom = performance.now(); schedule() },
    /** Shows the finished mark with no motion (reduced motion, or the site-wide pause); off resumes the cycle. */
    hold(on: boolean) { still = on; rewindFrom = null; if (start !== null) start = performance.now() - INTRO_SECONDS * 1000; schedule() },
    dispose() {
      disposed = true
      cancelAnimationFrame(frame); clearTimeout(idle); resize.disconnect(); observer.disconnect()
      mark.dispose(); backdrop.geometry.dispose()
      ;(backdrop.material as T.Material).dispose(); env.dispose(); renderer.dispose()
      renderer.domElement.remove()
    },
  }
}
