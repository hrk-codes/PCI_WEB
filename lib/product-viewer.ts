import * as T from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { createStudioEnvironment } from './studio'
import { buildConductor, conductorMaterials, constructions, type ConductorKind } from './conductor-models'
import { createCableKit } from './cable-models'

export type ProductViewerApi = ReturnType<typeof createProductViewer>

function visibleBounds(object: T.Object3D) {
  object.updateWorldMatrix(true, true)
  const bounds = new T.Box3()
  object.traverseVisible(part => { if (part instanceof T.Mesh) bounds.expandByObject(part) })
  return bounds
}

/** Catalogue-family cutaways informed by the filmed PCI samples. The directory supplies order dimensions. */
function productModel(slug: string) {
  const root = new T.Group()
  const parts: T.Object3D[] = []
  const movements = new Map<T.Object3D, T.Vector3>()
  const buriedSections: T.Object3D[] = []
  const disposers: (() => void)[] = []
  const metals = conductorMaterials()
  disposers.push(() => Object.values(metals).forEach(material => material.dispose()))

  if (slug in constructions || slug === 'al-59' || slug === 'gi-earth-wire') {
    const kind = slug === 'al-59' ? 'aaac' : slug === 'gi-earth-wire' ? 'aac' : slug as ConductorKind
    let layers = constructions[kind]
    if (slug === 'aac') layers = [...constructions.aac, { count: 24, metal: 'aluminium', shape: 'round' }]
    if (slug === 'acsr') layers = [...constructions.acsr, { count: 24, metal: 'aluminium', shape: 'round' }]
    if (slug === 'gi-earth-wire') layers = constructions.aac.slice(0, 3).map(layer => ({ ...layer, metal: 'steel' }))
    if (slug === 'eco-panther') layers = layers.map(layer => ({ ...layer, metal: 'alloy' }))
    const built = buildConductor(kind, metals, { length: 6, wire: .2, step: .55, layers })
    root.add(built.group)
    parts.push(...built.group.children)
    disposers.push(built.dispose)
  } else {
    const kit = createCableKit()
    const { rubber, aluminium, steel, bedding, colours } = kit.materials
    const pale = new T.MeshPhysicalMaterial({ color: 0xd8dfde, roughness: .44, clearcoat: .15 })
    const copper = new T.MeshPhysicalMaterial({ color: 0xd38b57, metalness: .95, roughness: .22 })
    const blue = rubber.clone(); blue.color.set(0x12629a)
    disposers.push(kit.dispose, () => { pale.dispose(); copper.dispose(); blue.dispose() })

    function layer(movement?: T.Vector3) {
      const group = new T.Group()
      root.add(group)
      parts.push(group)
      if (movement) movements.set(group, movement)
      return group
    }
    function sleeve(parent: T.Group, radius: number, inner: number, bottom: number, top: number, material: T.Material, x = 0, z = 0) {
      const outline = new T.Shape()
      outline.absarc(0, 0, radius, 0, Math.PI * 2, false)
      const hole = new T.Path()
      hole.absarc(0, 0, inner, 0, Math.PI * 2, true)
      outline.holes.push(hole)
      const geometry = kit.track(new T.ExtrudeGeometry(outline, { depth: top - bottom, bevelEnabled: false, steps: 1, curveSegments: 48 }))
      geometry.rotateX(-Math.PI / 2)
      const mesh = new T.Mesh(geometry, material)
      mesh.position.set(x, bottom, z)
      parent.add(mesh)
    }
    function core(parent: T.Group, radius: number, x: number, z: number, insulation: T.Material, top: number, metal = aluminium) {
      sleeve(parent, radius, radius * .71, -2.8, top - .55, insulation, x, z)
      kit.bundle(parent, radius * .7, -2.8, top, x, z, metal)
    }

    if (slug === 'control-cable') {
      // Keep the nested radii clear of one another and retain the conductor-to-insulation alignment.
      sleeve(layer(new T.Vector3(0, -.6, 0)), .72, .65, -3.15, -.2, rubber)
      const armour = layer(new T.Vector3(0, .4, 0))
      const buriedArmour = new T.Group()
      armour.add(buriedArmour)
      buriedSections.push(buriedArmour)
      for (let index = 0; index < 52; index++) {
        const angle = index * Math.PI * 2 / 52
        const x = Math.cos(angle) * .61, z = Math.sin(angle) * .61
        kit.cylinder(armour, .031, .92, .26, steel, x, z)
        kit.cylinder(buriedArmour, .031, 2.9, -1.65, steel, x, z)
      }
      const innerSheath = layer(new T.Vector3(0, 1.7, 0))
      sleeve(innerSheath, .57, .52, -.2, 1.35, bedding)
      const buriedSheath = new T.Group()
      innerSheath.add(buriedSheath)
      sleeve(buriedSheath, .57, .52, -3.1, -.2, bedding)
      buriedSections.push(buriedSheath)
      const ends = [2.98, 2.87, 3.06, 2.92]
      for (let index = 0; index < 4; index++) {
        const x = index % 2 ? .21 : -.21
        const z = index < 2 ? .21 : -.21
        const insulation = layer(new T.Vector3(0, 2.45, 0))
        const conductor = layer(new T.Vector3(0, 4.35, 0))
        sleeve(insulation, .20, .145, 1.35, ends[index], colours[index], x, z)
        kit.bundle(conductor, .14, 1.35, ends[index] + .56, x, z, copper)
        const buriedInsulation = new T.Group(), buriedCopper = new T.Group()
        insulation.add(buriedInsulation); conductor.add(buriedCopper)
        sleeve(buriedInsulation, .20, .145, -3.1, 1.35, colours[index], x, z)
        kit.bundle(buriedCopper, .14, -3.1, 1.35, x, z, copper)
        buriedSections.push(buriedInsulation, buriedCopper)
      }
    } else if (slug === 'aerial-bunched-cable') {
      const cores = layer()
      for (let index = 0; index < 3; index++) {
        const angle = index * Math.PI * 2 / 3
        core(cores, .3, Math.cos(angle) * .48, Math.sin(angle) * .48, rubber, 2.8 - index * .15)
      }
      const messenger = layer()
      core(messenger, .27, 0, 0, rubber, 3.25, steel)
      const lighting = layer()
      core(lighting, .14, -.68, -.24, rubber, 2.45)
      kit.cylinder(lighting, .012, 5.2, -.2, colours[1], -.8, -.24)
    } else if (slug === 'covered-conductor') {
      sleeve(layer(), .7, .58, -2.8, .25, rubber)
      sleeve(layer(), .58, .42, -2.8, .95, pale)
      sleeve(layer(), .42, .38, -2.8, 1.55, bedding)
      const conductor = layer()
      const built = buildConductor('aaac', metals, { length: 5.7, wire: .105, step: .16, layers: constructions.aaac.slice(0, 3) })
      built.group.rotation.x = -Math.PI / 2
      built.group.position.y = 2.9
      conductor.add(built.group)
      disposers.push(built.dispose)
    } else {
      const xlpe = slug === 'lt-xlpe-cable'
      const count = xlpe ? 4 : slug === 'pvc-power-cable' ? 2 : 1
      const radius = count === 1 ? .44 : .8
      sleeve(layer(), radius, radius - .1, -2.8, .3, xlpe ? blue : rubber)
      if (xlpe) {
        const armour = layer()
        const wires = 60
        for (let index = 0; index < wires; index++) {
          const angle = index * Math.PI * 2 / wires
          kit.cylinder(armour, .031, 4.1, -.75, steel, Math.cos(angle) * (radius - .15), Math.sin(angle) * (radius - .15))
        }
        sleeve(layer(), radius - .2, radius - .27, -2.8, 1.75, bedding)
      }
      const cores = layer()
      for (let index = 0; index < count; index++) {
        let x = 0, z = 0
        if (count === 4) {
          x = index % 2 ? .25 : -.25; z = index < 2 ? .25 : -.25
        } else if (count === 2) x = index ? .31 : -.31
        const insulation = count === 2 && index === 1 ? colours[3] : colours[index % colours.length]
        core(cores, count === 1 ? .29 : .285, x, z, insulation, 3.05 + (index % 3) * .15)
      }
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
  const environment = createStudioEnvironment(renderer)
  scene.environment = environment.texture
  scene.environmentIntensity = .85
  // Poster capture (scripts/render-product-posters.mjs opens the page with ?poster=1) adds ambient occlusion
  // between strands and layers. The live viewer skips it to stay light.
  const poster = new URLSearchParams(location.search).has('poster')
  let composer: EffectComposer | null = null, ao: GTAOPass | null = null
  const key = new T.DirectionalLight(0xfff5e8, 3.2); key.position.set(-4, 7, 8)
  const rim = new T.DirectionalLight(0xc9e1ff, 3); rim.position.set(6, 3, -4)
  scene.add(key, rim, new T.HemisphereLight(0xe5efff, 0x798a86, 1.3))
  const model = productModel(slug)
  scene.add(model.group)
  const initial = slug === 'control-cable' ? { yaw: .14, pitch: -1.2, roll: .15 } : { yaw: .72, pitch: -.36, roll: .52 }
  let { yaw, pitch, roll } = initial
  let zoom = 1
  let visible = true, frame = 0, lost = false, disposed = false
  let drag: { id: number; x: number; y: number; yaw: number; pitch: number } | null = null
  function paint() {
    frame = 0
    if (disposed || lost || !visible || document.hidden) return
    const width = canvas.clientWidth, height = canvas.clientHeight
    if (!width || !height) return
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    model.group.rotation.set(pitch, yaw, roll)
    if (slug === 'control-cable') {
      const bounds = visibleBounds(model.group)
      const size = bounds.getSize(new T.Vector3()), centre = bounds.getCenter(new T.Vector3())
      const distance = Math.max(size.y, size.x / camera.aspect) / (2 * Math.tan(T.MathUtils.degToRad(camera.fov / 2))) * 1.14 / zoom + size.z / 2
      camera.position.set(centre.x, centre.y, centre.z + distance)
      camera.lookAt(centre)
    } else {
      camera.position.set(0, 0, 10.6 / zoom / Math.min(camera.aspect, 1))
      camera.lookAt(0, 0, 0)
    }
    camera.updateProjectionMatrix()
    if (poster) {
      if (!composer) {
        composer = new EffectComposer(renderer)
        composer.addPass(new RenderPass(scene, camera))
        ao = new GTAOPass(scene, camera, width, height)
        ao.updateGtaoMaterial({radius:.6, distanceExponent:1.4, thickness:2, scale:1.4, samples:32})
        ao.blendIntensity = 1
        composer.addPass(ao)
        composer.addPass(new OutputPass())
      }
      composer.setPixelRatio(renderer.getPixelRatio())
      composer.setSize(width, height)
      composer.render()
    } else renderer.render(scene, camera)
    canvas.dataset.ready = 'yes'
    onReady(true)
  }
  function request() { if (!disposed && !frame) frame = requestAnimationFrame(paint) }
  function rotate(x: number, y = 0) { yaw += x; pitch = T.MathUtils.clamp(pitch + y, -1.4, 1.4); request() }
  function pointerDown(event: PointerEvent) {
    if (event.button !== 0) return
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, yaw, pitch }
    canvas.setPointerCapture(event.pointerId)
  }
  function pointerMove(event: PointerEvent) {
    if (!drag || drag.id !== event.pointerId) return
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
  request()
  return {
    rotate,
    zoom(value: number) { zoom = value; request() },
    separate(value: number) { model.separate(value); request() },
    reset() { yaw = initial.yaw; pitch = initial.pitch; roll = initial.roll; zoom = 1; model.separate(0); request() },
    endView() { yaw = 0; pitch = 0; roll = 0; zoom = slug === 'control-cable' ? 1 : 2; request(); return zoom },
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
      model.dispose(); environment.dispose(); renderer.dispose()
    },
  }
}
