import * as T from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { createStudioEnvironment } from './studio'
import { buildConductor, conductorMaterials, constructions, type ConductorKind } from './conductor-models'
import { createCableKit } from './cable-models'
import { createPowerCoreGeometry, powerCoreStrands } from './power-cable-cores'
import { buildAerialBunch } from './aerial-bunched-model'
import { buildControlCable } from './control-cable-model'
import { buildCoveredConductor, buildPowerCable, buildServiceCable } from './cable-separation'
import { separableConductor } from './layer-separation'

export type ProductViewerApi = ReturnType<typeof createProductViewer>

function visibleBounds(object: T.Object3D) {
  object.updateWorldMatrix(true, true)
  const bounds = new T.Box3()
  object.traverseVisible(part => { if (part instanceof T.Mesh) bounds.expandByObject(part) })
  return bounds
}

/** Catalogue-family cutaways informed by the filmed PCI samples. The directory supplies order dimensions. Also used by the hero film. */
export function productModel(slug: string) {
  const root = new T.Group()
  const parts: T.Object3D[] = []
  const movements = new Map<T.Object3D, T.Vector3>()
  const buriedSections: T.Object3D[] = []
  const disposers: (() => void)[] = []
  let customSeparate: ((value: number) => void) | undefined
  const metals = conductorMaterials()
  disposers.push(() => Object.values(metals).forEach(material => material.dispose()))

  if (slug in constructions || slug === 'al-59' || slug === 'gi-earth-wire') {
    const kind = slug === 'al-59' ? 'aaac' : slug === 'gi-earth-wire' ? 'aac' : slug as ConductorKind
    let layers = constructions[kind]
    if (slug === 'aac') layers = [...constructions.aac, { count: 24, metal: 'aluminium', shape: 'round' }]
    if (slug === 'acsr') layers = [...constructions.acsr, { count: 24, metal: 'aluminium', shape: 'round' }]
    if (slug === 'gi-earth-wire') layers = constructions.aac.slice(0, 3).map(layer => ({ ...layer, metal: 'steel' }))
    if (slug === 'eco-panther') layers = layers.map(layer => ({ ...layer, metal: 'alloy' }))
    // BEC is cut flush, with the long lay of a buried earth strand; every other conductor shows its stepped layers.
    const flush = slug === 'bec'
    const built = buildConductor(kind, metals, { length: 6, wire: .2, step: flush ? 0 : .55, layers, layScale: flush ? 2.4 : 1 })
    root.add(built.group)
    // Layers flare open in place (lib/layer-separation.ts) instead of sliding apart.
    customSeparate = separableConductor(built.group)
    disposers.push(built.dispose)
  } else {
    const kit = createCableKit()
    const { rubber, aluminium, steel, bedding, colours } = kit.materials
    const pale = new T.MeshPhysicalMaterial({ color: 0xd8dfde, roughness: .44, clearcoat: .15 })
    const copper = new T.MeshPhysicalMaterial({ color: 0xd38b57, metalness: .95, roughness: .22 })
    const blue = rubber.clone(); blue.color.set(0x12629a)
    disposers.push(kit.dispose, () => { pale.dispose(); copper.dispose(); blue.dispose() })

    if (slug === 'control-cable') {
      // Continuous layers that peel, flare and fan in place, in the manner of the aerial bunched cable.
      const cable = buildControlCable({ rubber, steel, bedding, colours, copper })
      root.add(cable.group)
      customSeparate = cable.separate
      disposers.push(cable.dispose)
    } else if (slug === 'aerial-bunched-cable') {
      const bunch = buildAerialBunch()
      root.add(bunch.group)
      customSeparate = bunch.separate
      disposers.push(bunch.dispose)
    } else {
      // Sheaths peel, armour flares, cores fan and strands spread in place (lib/cable-separation.ts).
      const cutFace = new T.MeshStandardMaterial({ color: 0x2c3236, roughness: .7 })
      disposers.push(() => cutFace.dispose())
      const materials = { rubber, steel, bedding, aluminium, colours, blue, pale, cutFace }
      const cable = slug === 'covered-conductor' ? buildCoveredConductor(materials)
        : slug === 'pvc-power-cable' || slug === 'lt-xlpe-cable' ? buildPowerCable(slug === 'lt-xlpe-cable', materials)
        : buildServiceCable(materials)
      root.add(cable.group)
      customSeparate = cable.separate
      disposers.push(cable.dispose)
    }
    // Kit cylinders are built along Y; conductor models use Z. Keep one viewing convention.
    root.rotation.x = Math.PI / 2
  }

  const pose = new T.Group()
  pose.add(root)
  function fit() {
    // Measure in model space, independent of the user's current viewing angle.
    const rotation = pose.rotation.clone()
    pose.rotation.set(0, 0, 0)
    pose.scale.setScalar(1)
    root.position.set(0, 0, 0)
    const bounds = visibleBounds(root)
    root.position.sub(bounds.getCenter(new T.Vector3()))
    const size = bounds.getSize(new T.Vector3())
    pose.scale.setScalar(6 / Math.max(size.x, size.y, size.z))
    pose.rotation.copy(rotation)
  }
  fit()
  const origins = parts.map(part => part.position.clone())
  return {
    group: pose,
    separate(value: number) {
      customSeparate?.(value)
      // Exploded views retain the exposed cutaway sections, rather than pulling hidden full-length fills through them.
      buriedSections.forEach(section => { section.visible = value === 0 })
      parts.forEach((part, index) => {
        part.position.copy(origins[index])
        const movement = movements.get(part)
        if (movement) part.position.addScaledVector(movement, value)
        else if (root.rotation.x) part.position.y += index * value * .33
        else part.position.z -= index * value * .38
      })
      fit()
    },
    dispose() { disposers.forEach(dispose => dispose()) },
  }
}

/** Render only on input, resize or visibility changes. No continuous animation or automatic rotation. */
export function createProductViewer(canvas: HTMLCanvasElement, slug: string, onReady: (ready: boolean) => void) {
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5))
  renderer.setClearColor(0x000000, 0)
  renderer.toneMapping = T.NeutralToneMapping
  renderer.toneMappingExposure = 1.1
  const scene = new T.Scene()
  const camera = new T.PerspectiveCamera(30, 1, .1, 100)
  const endCamera = new T.OrthographicCamera(-1, 1, 1, -1, .1, 100)
  const packedPowerCable = slug === 'pvc-power-cable' || slug === 'lt-xlpe-cable'
  const aerialBunch = slug === 'aerial-bunched-cable'
  let orthographicEnd = false
  let environment: ReturnType<typeof createStudioEnvironment> | null = null
  // Poster capture (scripts/render-product-posters.mjs opens the page with ?poster=1) adds ambient occlusion
  // between strands and layers. The live viewer skips it to stay light.
  const poster = new URLSearchParams(location.search).has('poster')
  let composer: EffectComposer | null = null, ao: GTAOPass | null = null
  let composerCamera: T.Camera | null = null
  const key = new T.DirectionalLight(0xfff5e8, 3.2); key.position.set(-4, 7, 8)
  const rim = new T.DirectionalLight(0xc9e1ff, 3); rim.position.set(6, 3, -4)
  scene.add(key, rim, new T.HemisphereLight(0xe5efff, 0x798a86, 1.3))
  let model: ReturnType<typeof productModel> | null = null
  const initial = slug === 'control-cable' ? { yaw: .14, pitch: -1.2, roll: .15 } : { yaw: .72, pitch: -.36, roll: .52 }
  let { yaw, pitch, roll } = initial
  let zoom = 1
  let visible = true, frame = 0, lost = false, disposed = false
  let pendingSeparation: number | null = null
  let drag: { id: number; x: number; y: number; yaw: number; pitch: number } | null = null
  function paint() {
    frame = 0
    if (disposed || lost || !visible || document.hidden || !model) return
    const width = canvas.clientWidth, height = canvas.clientHeight
    if (!width || !height) return
    if (pendingSeparation !== null) { model.separate(pendingSeparation); pendingSeparation = null }
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    model.group.rotation.set(pitch, yaw, roll)
    if (slug === 'control-cable' || packedPowerCable || aerialBunch) {
      const bounds = visibleBounds(model.group)
      const size = bounds.getSize(new T.Vector3()), centre = bounds.getCenter(new T.Vector3())
      const distance = Math.max(size.y, size.x / camera.aspect) / (2 * Math.tan(T.MathUtils.degToRad(camera.fov / 2))) * 1.14 / zoom + size.z / 2
      camera.position.set(centre.x, centre.y, centre.z + distance)
      camera.lookAt(centre)
      if (orthographicEnd) {
        // A true axial section: perspective must not make the near cores look larger than the jacket.
        const halfHeight = Math.max(size.y, size.x / camera.aspect) * .57 / zoom
        endCamera.left = -halfHeight * camera.aspect; endCamera.right = halfHeight * camera.aspect
        endCamera.top = halfHeight; endCamera.bottom = -halfHeight
        endCamera.position.set(centre.x, centre.y, centre.z + 15)
        endCamera.lookAt(centre)
        // Isolate ABC's terminations: the helical length behind them must not read as a common outer jacket.
        endCamera.far = aerialBunch ? endCamera.position.z - bounds.max.z + 1.15 : 100
        endCamera.updateProjectionMatrix()
      }
    } else {
      camera.position.set(0, 0, 10.6 / zoom / Math.min(camera.aspect, 1))
      camera.lookAt(0, 0, 0)
    }
    camera.updateProjectionMatrix()
    const renderCamera = orthographicEnd ? endCamera : camera
    if (poster) {
      if (composer && composerCamera !== renderCamera) {
        ao?.dispose(); composer.dispose(); composer = null
      }
      if (!composer) {
        composer = new EffectComposer(renderer)
        composerCamera = renderCamera
        composer.addPass(new RenderPass(scene, renderCamera))
        ao = new GTAOPass(scene, renderCamera, width, height)
        ao.updateGtaoMaterial({radius:.6, distanceExponent:1.4, thickness:2, scale:1.4, samples:32})
        ao.blendIntensity = 1
        composer.addPass(ao)
        composer.addPass(new OutputPass())
      }
      composer.setPixelRatio(renderer.getPixelRatio())
      composer.setSize(width, height)
      composer.render()
    } else renderer.render(scene, renderCamera)
    canvas.dataset.ready = 'yes'
    onReady(true)
  }
  function request() { if (!disposed && !frame) frame = requestAnimationFrame(paint) }
  function rotate(x: number, y = 0) { orthographicEnd = false; yaw += x; pitch = T.MathUtils.clamp(pitch + y, -1.4, 1.4); request() }
  function pointerDown(event: PointerEvent) {
    if (event.button !== 0) return
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, yaw, pitch }
    canvas.setPointerCapture(event.pointerId)
  }
  function pointerMove(event: PointerEvent) {
    if (!drag || drag.id !== event.pointerId) return
    orthographicEnd = false
    yaw = drag.yaw + (event.clientX - drag.x) * .009
    pitch = T.MathUtils.clamp(drag.pitch + (event.clientY - drag.y) * .006, -1.4, 1.4)
    request()
  }
  function pointerEnd() { drag = null }
  function contextLost(event: Event) { event.preventDefault(); lost = true; delete canvas.dataset.ready; onReady(false) }
  function contextRestored() { lost = false; request() }
  const resize = new ResizeObserver(request)
  resize.observe(canvas)
  const intersection = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; if (visible) request() })
  intersection.observe(canvas)
  canvas.addEventListener('pointerdown', pointerDown)
  canvas.addEventListener('pointermove', pointerMove)
  canvas.addEventListener('pointerup', pointerEnd)
  canvas.addEventListener('pointercancel', pointerEnd)
  canvas.addEventListener('lostpointercapture', pointerEnd)
  canvas.addEventListener('webglcontextlost', contextLost)
  canvas.addEventListener('webglcontextrestored', contextRestored)
  document.addEventListener('visibilitychange', request)
  // Start-up is spread over several frames (lighting, then the model, then shader compilation off the main thread),
  // so opening a product page never freezes. The poster stays in place until the first finished frame.
  const nextFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)))
  ;(async () => {
    await nextFrame(); if (disposed) return
    environment = createStudioEnvironment(renderer)
    scene.environment = environment.texture
    scene.environmentIntensity = .85
    await nextFrame(); if (disposed) return
    const built = productModel(slug)
    if (disposed) { built.dispose(); return }
    built.group.rotation.set(pitch, yaw, roll)
    scene.add(built.group)
    await nextFrame(); if (disposed) return
    try { await renderer.compileAsync(scene, camera) } catch { /* compiled on first render instead */ }
    if (disposed) return
    model = built
    request()
  })()
  return {
    rotate,
    zoom(value: number) { zoom = value; request() },
    // Bending models rebuild vertex positions, so slider input is coalesced into the next frame.
    separate(value: number) { pendingSeparation = value; request() },
    reset() { pendingSeparation = null; orthographicEnd = false; yaw = initial.yaw; pitch = initial.pitch; roll = initial.roll; zoom = 1; model?.separate(0); request() },
    endView() { orthographicEnd = packedPowerCable || aerialBunch; yaw = 0; pitch = 0; roll = 0; zoom = slug === 'control-cable' || packedPowerCable || aerialBunch ? 1 : 2; request(); return zoom },
    dispose() {
      disposed = true
      cancelAnimationFrame(frame)
      resize.disconnect(); intersection.disconnect()
      canvas.removeEventListener('pointerdown', pointerDown)
      canvas.removeEventListener('pointermove', pointerMove)
      canvas.removeEventListener('pointerup', pointerEnd)
      canvas.removeEventListener('pointercancel', pointerEnd)
      canvas.removeEventListener('lostpointercapture', pointerEnd)
      canvas.removeEventListener('webglcontextlost', contextLost)
      canvas.removeEventListener('webglcontextrestored', contextRestored)
      document.removeEventListener('visibilitychange', request)
      delete canvas.dataset.ready
      ao?.dispose(); composer?.dispose()
      model?.dispose(); environment?.dispose(); renderer.dispose()
    },
  }
}
