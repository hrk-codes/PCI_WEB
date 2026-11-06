import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

export type CableLayout = 'landscape' | 'portrait'
export const CABLE_DURATION = 8

const smooth = (a: number, b: number, value: number) => {
  const t = Math.max(0, Math.min(1, (value - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/** Illustrative marketing cutaway. Each insulated core contains aluminum strands. */
export function createAluminiumCableScene(canvas: HTMLCanvasElement, layout: CableLayout) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' })
  renderer.setClearColor(0x000000, 0)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.12

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(33, 1, .1, 60)
  const pmrem = new THREE.PMREMGenerator(renderer)
  const room = new RoomEnvironment()
  const environment = pmrem.fromScene(room, .04)
  room.dispose()
  scene.environment = environment.texture
  scene.add(new THREE.HemisphereLight(0xeaf5ff, 0x142439, 2.0))
  const key = new THREE.DirectionalLight(0xf4f8ff, 4.2)
  key.position.set(-3, 8, 8)
  const rim = new THREE.DirectionalLight(0x73b5d4, 3.4)
  rim.position.set(5, 3, -5)
  scene.add(key, rim)

  const jacketMaterial = new THREE.MeshPhysicalMaterial({ color: 0x111a24, roughness: .38, metalness: .05, clearcoat: .42, clearcoatRoughness: .35, side: THREE.DoubleSide })
  const jacketEdge = new THREE.MeshStandardMaterial({ color: 0x35434d, roughness: .52, metalness: .1, side: THREE.DoubleSide })
  const fillerMaterial = new THREE.MeshStandardMaterial({ color: 0x253441, roughness: .78, side: THREE.DoubleSide })
  const insulators = [0x1f718a, 0x394e74, 0x283e49].map(color => new THREE.MeshPhysicalMaterial({ color, roughness: .31, metalness: .04, clearcoat: .46, side: THREE.DoubleSide }))
  const aluminum = new THREE.MeshStandardMaterial({ color: 0xc6d4dd, metalness: 1, roughness: .22, side: THREE.DoubleSide })
  const aluminumEnd = new THREE.MeshStandardMaterial({ color: 0xe0e9ec, metalness: .88, roughness: .3, side: THREE.DoubleSide })
  const materials = [jacketMaterial, jacketEdge, fillerMaterial, ...insulators, aluminum, aluminumEnd]
  const geometries: THREE.BufferGeometry[] = []
  const add = <G extends THREE.BufferGeometry>(geometry: G) => { geometries.push(geometry); return geometry }

  const cable = new THREE.Group()
  cable.name = 'PCI illustrative aluminum cable'
  scene.add(cable)
  const outerSheath = new THREE.Group()
  outerSheath.name = '01 outer sheath'
  cable.add(outerSheath)
  const body = new THREE.Mesh(add(new THREE.CylinderGeometry(1.04, 1.04, 3.15, 96, 1, true)), jacketMaterial)
  body.position.y = -1.36
  outerSheath.add(body)
  const cutLip = new THREE.Mesh(add(new THREE.RingGeometry(.88, 1.04, 96)), jacketEdge)
  cutLip.rotation.x = -Math.PI / 2
  cutLip.position.y = .217
  outerSheath.add(cutLip)
  for (let i = 0; i < 4; i++) {
    const groove = new THREE.Mesh(add(new THREE.TorusGeometry(1.043, .007, 5, 96)), jacketEdge)
    groove.rotation.x = Math.PI / 2
    groove.position.y = -2.55 + i * .045
    outerSheath.add(groove)
  }

  const filler = new THREE.Group()
  filler.name = '02 nonmetallic filler and bedding'
  cable.add(filler)
  const fillerFace = new THREE.Mesh(add(new THREE.CircleGeometry(.879, 96)), fillerMaterial)
  fillerFace.rotation.x = -Math.PI / 2
  fillerFace.position.y = .218
  filler.add(fillerFace)
  const bedding = new THREE.Mesh(add(new THREE.CylinderGeometry(.88, .88, .25, 96, 1, true)), fillerMaterial)
  bedding.position.y = .08
  filler.add(bedding)

  const cores: { group: THREE.Group; insulation: THREE.Group; strands: THREE.Group; x: number; z: number }[] = []
  const angles = [Math.PI / 2, 7 * Math.PI / 6, 11 * Math.PI / 6]
  angles.forEach((angle, index) => {
    const x = Math.cos(angle) * .45
    const z = Math.sin(angle) * .45
    const core = new THREE.Group()
    core.name = `0${index + 3} insulated aluminum core ${index + 1}`
    core.position.set(x, 0, z)
    cable.add(core)
    const insulation = new THREE.Group()
    insulation.name = `insulation sleeve ${index + 1}`
    core.add(insulation)
    const sleeve = new THREE.Mesh(add(new THREE.CylinderGeometry(.315, .315, 3.15, 48, 1, false)), insulators[index])
    sleeve.position.y = -.82
    insulation.add(sleeve)
    const rimMesh = new THREE.Mesh(add(new THREE.TorusGeometry(.29, .027, 10, 48)), insulators[index])
    rimMesh.rotation.x = Math.PI / 2
    rimMesh.position.y = .755
    insulation.add(rimMesh)

    const strands = new THREE.Group()
    strands.name = `aluminum wire bundle ${index + 1}`
    core.add(strands)
    const strandRadius = .047
    const strandPositions: { r: number; a: number }[] = [{ r: 0, a: 0 }]
    for (let ring = 1; ring <= 2; ring++) {
      const count = ring * 6
      for (let i = 0; i < count; i++) strandPositions.push({ r: ring * .099, a: i * Math.PI * 2 / count })
    }
    strandPositions.forEach(({ r, a }, strandIndex) => {
      const steps = 32
      const points = Array.from({ length: steps + 1 }, (_, step) => {
        const u = step / steps
        const rotation = a + u * Math.PI * 1.35 * (index % 2 ? -1 : 1)
        return new THREE.Vector3(Math.cos(rotation) * r, .62 + u * .81 + (strandIndex % 3) * .004, Math.sin(rotation) * r)
      })
      const wire = new THREE.Mesh(add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), steps, strandRadius, 8, false)), aluminum)
      wire.name = `silver aluminum strand ${strandIndex + 1}`
      strands.add(wire)
      const end = points[points.length - 1]
      const cap = new THREE.Mesh(add(new THREE.CircleGeometry(strandRadius, 12)), aluminumEnd)
      cap.rotation.x = -Math.PI / 2
      cap.position.copy(end)
      strands.add(cap)
    })
    cores.push({ group: core, insulation, strands, x, z })
  })

  function resize(width: number, height: number) {
    renderer.setSize(width, height, false)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
    camera.aspect = width / height
    camera.updateProjectionMatrix()
  }

  function setTime(seconds: number) {
    const t = ((seconds % CABLE_DURATION) + CABLE_DURATION) % CABLE_DURATION / CABLE_DURATION
    const approach = smooth(.1, .27, t) * (1 - smooth(.74, .96, t))
    const reveal = smooth(.29, .44, t) * (1 - smooth(.62, .8, t))
    outerSheath.position.y = -.48 * reveal
    filler.position.y = -.27 * reveal
    cores.forEach(({ group, insulation, strands, x, z }, index) => {
      group.position.set(x * (1 + .39 * reveal), .06 * reveal, z * (1 + .39 * reveal))
      insulation.position.y = -.17 * reveal
      strands.position.y = .2 * reveal
      group.rotation.y = (index - 1) * .07 * reveal
    })
    cable.rotation.set(.13 + .06 * approach, -.29 + .2 * approach, -.37 + .08 * reveal)
    cable.position.y = -.08 + .08 * approach
    const portrait = layout === 'portrait'
    camera.position.set((portrait ? 3.15 : 3.45) + .6 * approach, (portrait ? 2.7 : 3.1) + .6 * approach, (portrait ? 11.6 : 7.6) - .9 * approach)
    camera.lookAt(0, portrait ? -.27 : -.22, 0)
    renderer.render(scene, camera)
  }

  return {
    setTime, resize,
    dispose() {
      geometries.forEach(geometry => geometry.dispose())
      materials.forEach(material => material.dispose())
      environment.dispose()
      pmrem.dispose()
      renderer.dispose()
    },
  }
}
