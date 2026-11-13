import * as T from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { drift } from './look'

/**
 * Indian plains with a double-circuit transmission line marching to the horizon. Units are metres.
 * Used by the golden-hour opening shot and the blue-hour closing shot.
 */
export const TOWER = {height:47, spacing:330}
const towerZ = [0, -330, -660, -990, -1320, -1650, -1980, -2310, -2640]
// Double circuit: three crossarm levels per side, each carrying a twin-bundle conductor on a suspension string.
const ARMS = [{y:31, reach:7.6}, {y:37.5, reach:9.2}, {y:44, reach:7.2}]
const STRING = 4.6

function member(a: T.Vector3, b: T.Vector3, w: number) {
  const length = a.distanceTo(b)
  const g = new T.BoxGeometry(w, length, w)
  g.translate(0, length / 2, 0)
  g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), b.clone().sub(a).normalize()))
  g.translate(a.x, a.y, a.z)
  return g
}
/** Half-width of the tower body at height y: wide splayed base, a waist, then a slender top. */
const halfWidth = (y: number) => y < 26 ? 5.2 - (y / 26) * 3.6 : 1.6 - ((y - 26) / 22) * .9

function towerGeometry() {
  const frame: T.BufferGeometry[] = [], lace: T.BufferGeometry[] = []
  const corners = (y: number) => { const w = halfWidth(y); return [[-w, -w], [w, -w], [w, w], [-w, w]].map(([x, z]) => new T.Vector3(x, y, z)) }
  const levels = [0, 4.5, 9, 13.5, 18, 22, 26, 31, 34.5, 37.5, 41, 44, 47.5]
  for (let l = 0; l < levels.length - 1; l++) {
    const lo = corners(levels[l]), hi = corners(levels[l + 1])
    for (let i = 0; i < 4; i++) {
      frame.push(member(lo[i], hi[i], .36))
      lace.push(member(hi[i], hi[(i + 1) % 4], .14))
      lace.push(member(lo[i], hi[(i + 1) % 4], .11), member(lo[(i + 1) % 4], hi[i], .11))
    }
  }
  // Crossarms: a triangular truss to each conductor point, both sides.
  for (const {y, reach} of ARMS) for (const s of [-1, 1]) {
    const w = halfWidth(y), tip = new T.Vector3(s * reach, y, 0)
    frame.push(member(new T.Vector3(s * w, y, -w), tip, .24), member(new T.Vector3(s * w, y, w), tip, .24))
    frame.push(member(new T.Vector3(s * w, y + 2.6, 0), tip, .16))
    for (let k = 1; k < 4; k++) { const x = s * (w + (reach - w) * k / 4); lace.push(member(new T.Vector3(x, y, -w * (1 - k / 4)), new T.Vector3(x, y + 2.6 * (1 - k / 4), 0), .08)) }
  }
  // Earth-wire peak.
  const top = corners(47.5)
  for (const s of [-1, 1]) { frame.push(member(new T.Vector3(s * .6, 47.5, 0), new T.Vector3(s * 3.4, 49.2, 0), .18)); frame.push(member(top[s < 0 ? 0 : 1], new T.Vector3(s * 3.4, 49.2, 0), .12)) }
  // Concrete chimney footings.
  const footings = [-1, 1].flatMap(sx => [-1, 1].map(sz => { const g = new T.CylinderGeometry(.75, .9, 1.4, 10); g.translate(sx * 5.2, .3, sz * 5.2); return g }))
  // Glass disc insulator strings hanging from every arm tip.
  const discs: T.BufferGeometry[] = []
  for (const {y, reach} of ARMS) for (const s of [-1, 1]) {
    discs.push(member(new T.Vector3(s * reach, y, 0), new T.Vector3(s * reach, y - STRING, 0), .05))
    for (let k = 0; k < 22; k++) { const g = new T.CylinderGeometry(.15, .15, .055, 14); g.translate(s * reach, y - .35 - k * .19, 0); discs.push(g) }
  }
  const merge = (list: T.BufferGeometry[]) => { const m = mergeGeometries(list.map(g => g.index ? g.toNonIndexed() : g)); list.forEach(g => g.dispose()); return m }
  return {frame:merge(frame), lace:merge(lace), footings:merge(footings), discs:merge(discs)}
}

/** Simple smooth 2D noise for terrain. */
function noise2(x: number, z: number) {
  const h = (a: number, b: number) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s) }
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf)
  return h(xi, zi) * (1 - u) * (1 - v) + h(xi + 1, zi) * u * (1 - v) + h(xi, zi + 1) * (1 - u) * v + h(xi + 1, zi + 1) * u * v
}

export function buildCountryside(scene: T.Scene) {
  const world = new T.Group()
  const disposables: {dispose():void}[] = []
  const keep = <D extends {dispose():void}>(d: D) => { disposables.push(d); return d }
  let seed = 11
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647

  // Terrain: gentle rises, a patchwork of harvested, ploughed and green fields, darker field edges.
  const size = 9000, segments = 360
  const ground = keep(new T.PlaneGeometry(size, size, segments, segments))
  ground.rotateX(-Math.PI / 2)
  const pos = ground.attributes.position, colours = new Float32Array(pos.count * 3)
  const palette = [new T.Color(0x8a7a45), new T.Color(0x6f7a3a), new T.Color(0x9b8a5a), new T.Color(0x5d6b33), new T.Color(0x7d5f3e), new T.Color(0xa8925e)]
  const c = new T.Color()
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i)
    const corridor = Math.min(1, Math.abs(x) / 160)
    pos.setY(i, (noise2(x / 700, z / 700) * 26 + noise2(x / 160, z / 160) * 5) * corridor - 2)
    // Fields: a rotated grid of plots, each with its own crop colour.
    const rx = x * .94 + z * .34, rz = -x * .34 + z * .94
    const fx = Math.floor(rx / 74), fz = Math.floor(rz / 52)
    const pick = Math.floor(noise2(fx * 3.1, fz * 1.7) * palette.length * .999)
    c.copy(palette[pick]).multiplyScalar(.82 + noise2(x / 9, z / 9) * .3)
    const edge = Math.min(Math.abs(rx / 74 - Math.round(rx / 74)), Math.abs(rz / 52 - Math.round(rz / 52)))
    if (edge < .03) c.multiplyScalar(.62)
    colours.set([c.r, c.g, c.b], i * 3)
  }
  ground.setAttribute('color', new T.BufferAttribute(colours, 3))
  ground.computeVertexNormals()
  const groundMesh = new T.Mesh(ground, keep(new T.MeshStandardMaterial({vertexColors:true, roughness:1, metalness:0})))
  groundMesh.receiveShadow = true
  world.add(groundMesh)
  const heightAt = (x: number, z: number) => (noise2(x / 700, z / 700) * 26 + noise2(x / 160, z / 160) * 5) * Math.min(1, Math.abs(x) / 160) - 2

  // Trees: clusters along field edges and village groves, thinning near the line corridor.
  const crowns = keep(new T.IcosahedronGeometry(1, 1)), trunks = keep(new T.CylinderGeometry(.18, .26, 1, 6))
  const count = 4200
  const crownMesh = new T.InstancedMesh(crowns, keep(new T.MeshStandardMaterial({color:0x2c3a1f, roughness:.95})), count)
  const trunkMesh = new T.InstancedMesh(trunks, keep(new T.MeshStandardMaterial({color:0x3a2c20, roughness:1})), count)
  const m = new T.Matrix4(), q = new T.Quaternion(), s = new T.Vector3(), p = new T.Vector3()
  for (let i = 0; i < count; i++) {
    let x = 0, z = 0
    for (let tries = 0; tries < 6; tries++) {
      const grove = Math.floor(random() * 60)
      x = (noise2(grove, 1) - .5) * 4200 + (random() - .5) * 140
      z = 300 - noise2(grove, 7) * 3600 + (random() - .5) * 140
      if (Math.abs(x) > 40) break
    }
    const h = 6 + random() * 9, y = heightAt(x, z)
    s.set(h * .42, h * .36, h * .42); p.set(x, y + h * .8, z); q.setFromAxisAngle(new T.Vector3(0, 1, 0), random() * 6.3)
    crownMesh.setMatrixAt(i, m.compose(p, q, s))
    s.set(1, h * .55, 1); p.set(x, y + h * .27, z)
    trunkMesh.setMatrixAt(i, m.compose(p, q, s))
  }
  crownMesh.castShadow = trunkMesh.castShadow = true
  crownMesh.receiveShadow = true
  world.add(crownMesh, trunkMesh)

  // Towers and the line.
  const geo = towerGeometry()
  Object.values(geo).forEach(g => keep(g))
  const galvanised = keep(new T.MeshStandardMaterial({color:0x6f777c, metalness:.7, roughness:.55, envMapIntensity:.4}))
  const glass = keep(new T.MeshPhysicalMaterial({color:0x6e9c95, metalness:.1, roughness:.08, transmission:0, clearcoat:1, clearcoatRoughness:.05}))
  const concrete = keep(new T.MeshStandardMaterial({color:0x9a958b, roughness:.95}))
  const conductor = keep(new T.MeshStandardMaterial({color:0xa4abb0, metalness:1, roughness:.52}))
  const earthWire = keep(new T.MeshStandardMaterial({color:0x8a9196, metalness:.85, roughness:.45}))
  const towers: T.Group[] = []
  const placeTower = (x: number, z: number, yaw = 0, scale = 1) => {
    const t = new T.Group()
    const frame = new T.Mesh(geo.frame, galvanised), lace = new T.Mesh(geo.lace, galvanised), discs = new T.Mesh(geo.discs, glass), feet = new T.Mesh(geo.footings, concrete)
    frame.castShadow = lace.castShadow = discs.castShadow = true
    t.add(frame, lace, discs, feet)
    t.position.set(x, heightAt(x, z) + .2, z); t.rotation.y = yaw; t.scale.setScalar(scale)
    world.add(t); towers.push(t)
    return t
  }
  towerZ.forEach(z => placeTower(0, z))
  // A second, older single line further out, and a third crossing in the far distance, for depth.
  for (let k = 0; k < 9; k++) placeTower(-260, 140 - k * 300, 0, .82)
  for (let k = 0; k < 7; k++) placeTower(-1500 + k * 420, -2900, Math.PI / 2, .8)

  // Catenary spans: twin-bundle conductors per phase, earth wires on the peaks, spacers along each span.
  const tubes: T.BufferGeometry[] = [], earths: T.BufferGeometry[] = [], spacers: T.BufferGeometry[] = []
  const span = (x: number, y: number, za: number, zb: number, sag: number, xa = x) => {
    const points: T.Vector3[] = []
    for (let k = 0; k <= 48; k++) { const f = k / 48; points.push(new T.Vector3(T.MathUtils.lerp(xa, x, f), y + heightAt(0, T.MathUtils.lerp(za, zb, f)) * 0 - sag * 4 * f * (1 - f), T.MathUtils.lerp(za, zb, f))) }
    return new T.CatmullRomCurve3(points)
  }
  for (let i = 0; i < towerZ.length - 1; i++) {
    const za = towerZ[i], zb = towerZ[i + 1], ya = heightAt(0, za) + .2, yb = heightAt(0, zb) + .2, base = (ya + yb) / 2
    for (const {y, reach} of ARMS) for (const sgn of [-1, 1]) for (const b of [-.23, .23]) {
      const curve = span(sgn * reach + b, base + y - STRING, za, zb, 10)
      tubes.push(new T.TubeGeometry(curve, 96, .065, 6, false))
      if (b > 0) for (const f of [.2, .4, .6, .8]) { const pt = curve.getPoint(f); const g = new T.BoxGeometry(.5, .06, .06); g.translate(pt.x - .23, pt.y, pt.z); spacers.push(g) }
    }
    for (const sgn of [-1, 1]) earths.push(new T.TubeGeometry(span(sgn * 3.4, base + 49.2, za, zb, 7.5), 96, .05, 6, false))
  }
  const merged = (list: T.BufferGeometry[]) => { const g = keep(mergeGeometries(list.map(x => x.index ? x.toNonIndexed() : x))); list.forEach(x => x.dispose()); return g }
  const lineMesh = new T.Mesh(merged(tubes), conductor), earthMesh = new T.Mesh(merged(earths), earthWire), spacerMesh = new T.Mesh(merged(spacers), galvanised)
  lineMesh.castShadow = true
  world.add(lineMesh, earthMesh, spacerMesh)

  // A few birds crossing high over the line, wings beating.
  const wingGeo = keep(new T.PlaneGeometry(.9, .32)); wingGeo.translate(.45, 0, 0)
  const birdMaterial = keep(new T.MeshBasicMaterial({color:0x1d1a18, side:T.DoubleSide}))
  const birds = Array.from({length:9}, (_, i) => {
    const bird = new T.Group(), left = new T.Mesh(wingGeo, birdMaterial), right = new T.Mesh(wingGeo, birdMaterial)
    right.scale.x = -1
    bird.add(left, right); world.add(bird)
    return {bird, left, right, offset:new T.Vector3((i % 3) * 6 + random() * 3, (i % 4) * 2.5, Math.floor(i / 3) * 5), phase:random() * 6}
  })

  // Aviation lights for the blue-hour shot (off at golden hour).
  const lampMaterial = keep(new T.MeshBasicMaterial({color:0xff3b26, toneMapped:false}))
  const lampGeo = keep(new T.SphereGeometry(.45, 10, 8))
  const lamps = towers.slice(0, towerZ.length).map(t => { const l = new T.Mesh(lampGeo, lampMaterial); l.position.set(0, 50, 0); t.add(l); return l })

  // A town glowing on the horizon, seen only at blue hour.
  const townPositions: number[] = []
  for (let i = 0; i < 1600; i++) townPositions.push((random() - .5) * 2600, 2 + random() * 14, -3600 - random() * 900)
  const townGeo = keep(new T.BufferGeometry()); townGeo.setAttribute('position', new T.Float32BufferAttribute(townPositions, 3))
  const town = new T.Points(townGeo, keep(new T.PointsMaterial({color:new T.Color(0xffb46e).multiplyScalar(1.1), size:1.4, sizeAttenuation:false, toneMapped:false, fog:false, transparent:true, opacity:.8})))
  town.visible = false
  world.add(town)

  // Stringing site in front of the first tower: a drum on a trailer pays conductor up through a stringing pulley
  // hanging from the crossarm, next to a hydraulic tensioner. Dust drifts through the low sun.
  const site = new T.Group()
  const siteY = heightAt(10, 46)
  const wood = keep(new T.MeshStandardMaterial({color:0x6a4a2d, roughness:.85}))
  const reelMetal = keep(new T.MeshStandardMaterial({color:0x5c6266, metalness:.7, roughness:.5}))
  const machineYellow = keep(new T.MeshStandardMaterial({color:0xb8892a, metalness:.25, roughness:.55}))
  const tyre = keep(new T.MeshStandardMaterial({color:0x151617, roughness:.92}))
  const drum = new T.Group()
  const flange = keep(new T.CylinderGeometry(1.35, 1.35, .09, 48)); flange.rotateZ(Math.PI / 2)
  for (const x of [-.62, .62]) { const f = new T.Mesh(flange, wood); f.position.x = x; f.castShadow = true; drum.add(f) }
  const wound = keep(new T.CylinderGeometry(1.08, 1.08, 1.15, 48)); wound.rotateZ(Math.PI / 2)
  drum.add(new T.Mesh(wound, conductor))
  const turns: T.BufferGeometry[] = []
  for (let k = 0; k < 16; k++) { const g = new T.TorusGeometry(1.1, .035, 6, 64); g.rotateY(Math.PI / 2); g.translate(-.54 + k * .072, 0, 0); turns.push(g) }
  drum.add(new T.Mesh(merged(turns), conductor))
  drum.position.set(9.5, siteY + 2.1, 46)
  const trailer = new T.Group()
  const bed = new T.Mesh(keep(new T.BoxGeometry(2.6, .18, 3.6)), reelMetal); bed.position.y = siteY + .78; bed.castShadow = true
  const axle = keep(new T.CylinderGeometry(.44, .44, .32, 22)); axle.rotateZ(Math.PI / 2)
  for (const [x, z] of [[-1.4, .9], [1.4, .9], [-1.4, -.9], [1.4, -.9]]) { const w = new T.Mesh(axle, tyre); w.position.set(x, siteY + .44, z); w.castShadow = true; trailer.add(w) }
  for (const x of [-.9, .9]) { const stand = new T.Mesh(keep(new T.BoxGeometry(.12, 1.5, .12)), reelMetal); stand.position.set(x, siteY + 1.5, 0); trailer.add(stand) }
  trailer.add(bed); trailer.position.set(9.5, 0, 46)
  const tensioner = new T.Group()
  const body = new T.Mesh(keep(new T.BoxGeometry(2.2, 1.6, 3.4)), machineYellow); body.position.y = siteY + 1.4; body.castShadow = true
  const bullwheel = keep(new T.CylinderGeometry(.8, .8, .2, 36)); bullwheel.rotateZ(Math.PI / 2)
  for (const z of [-.6, .6]) { const b = new T.Mesh(bullwheel, reelMetal); b.position.set(1.15, siteY + 2.2, z); tensioner.add(b) }
  for (const [x, z] of [[-1.1, 1.1], [1.1, 1.1], [-1.1, -1.1], [1.1, -1.1]]) { const w = new T.Mesh(axle, tyre); w.position.set(x, siteY + .44, z); tensioner.add(w) }
  tensioner.add(body); tensioner.position.set(4.2, 0, 34)
  // Stringing pulley under the right lower arm of tower 1.
  const tip = new T.Vector3(ARMS[0].reach, heightAt(0, 0) + .2 + ARMS[0].y - STRING, 0)
  const sheave = new T.Mesh(keep(new T.CylinderGeometry(.42, .42, .14, 28)), reelMetal); sheave.rotation.z = Math.PI / 2; sheave.position.copy(tip).add(new T.Vector3(0, -.5, 0))
  const pull = new T.CatmullRomCurve3([new T.Vector3(9.5, siteY + 3.2, 45.2), new T.Vector3(7.4, siteY + 3.9, 37.3), new T.Vector3(5.3, siteY + 3.3, 35), new T.Vector3(6.8, siteY + 9, 26), new T.Vector3(tip.x, tip.y - .1, 1.2)])
  site.add(new T.Mesh(keep(new T.TubeGeometry(pull, 120, .045, 6)), conductor), drum, trailer, tensioner, sheave)
  for (const [x, z] of [[12.5, 40], [12.5, 50], [2, 44], [6.5, 54]]) { const cone = new T.Mesh(keep(new T.ConeGeometry(.18, .55, 16)), keep(new T.MeshStandardMaterial({color:0xd8522c, roughness:.6}))); cone.position.set(x, heightAt(x, z) + .27, z); site.add(cone) }
  world.add(site)
  // Dust motes catching the low sun near the ground.
  const dustCount = 900, dustBase = new Float32Array(dustCount * 3)
  for (let i = 0; i < dustCount; i++) dustBase.set([(random() - .5) * 30 + 8, random() * 6, (random() - .5) * 30 + 44], i * 3)
  const dustGeo = keep(new T.BufferGeometry()); dustGeo.setAttribute('position', new T.Float32BufferAttribute(dustBase.slice(), 3))
  const dotCanvas = document.createElement('canvas'); dotCanvas.width = dotCanvas.height = 32
  const dc = dotCanvas.getContext('2d')!; const grad = dc.createRadialGradient(16, 16, 0, 16, 16, 16); grad.addColorStop(0, '#fff'); grad.addColorStop(1, 'rgba(255,255,255,0)'); dc.fillStyle = grad; dc.fillRect(0, 0, 32, 32)
  const dust = new T.Points(dustGeo, keep(new T.PointsMaterial({color:0xffc890, size:.07, map:keep(new T.CanvasTexture(dotCanvas)), transparent:true, opacity:.75, depthWrite:false, blending:T.AdditiveBlending})))
  site.add(dust)

  scene.add(world)
  return {
    world, towers, heightAt,
    update(time: number) {
      drum.rotation.x = -time * .22
      const dp = dustGeo.attributes.position as T.BufferAttribute
      for (let i = 0; i < dustCount; i++) {
        dp.setXYZ(i, dustBase[i * 3] + drift(time * .2 + i, 21) * .8 + time * .25, siteY + dustBase[i * 3 + 1] + ((time * .12 + dustBase[i * 3 + 1]) % 6) * .2, dustBase[i * 3 + 2] + drift(time * .15 + i, 22) * .6)
      }
      dp.needsUpdate = true
      birds.forEach(({bird, left, right, offset, phase}) => {
        bird.position.set(160 - time * 9 + offset.x, 92 + offset.y + drift(time * .3 + phase, 3) * 1.5, -420 + offset.z)
        bird.rotation.y = Math.PI / 2
        const flap = Math.sin(time * 9 + phase) * .55
        left.rotation.z = flap; right.rotation.z = -flap
        bird.scale.setScalar(1.6)
      })
    },
    setNight(on: boolean) { lamps.forEach(l => { l.visible = on }); town.visible = on; lampMaterial.color.set(on ? new T.Color(0xff3b26).multiplyScalar(4) : 0x000000) },
    dispose() { disposables.forEach(d => d.dispose()) },
  }
}
