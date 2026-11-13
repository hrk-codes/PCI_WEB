import * as T from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

/**
 * Product-photography reflections for the cable and conductor models: the bright neutral room three.js provides,
 * plus two tall strip softboxes and an overhead panel. Drawn metal then shows crisp highlights running along each
 * strand instead of an even grey. Shared by the live product viewer and the offline renders.
 */
export function createStudioEnvironment(renderer: T.WebGLRenderer) {
  const room = new RoomEnvironment()
  const panels: T.Mesh[] = []
  const panel = (w: number, h: number, colour: number, strength: number, position: [number, number, number]) => {
    const mesh = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({color:new T.Color(colour).multiplyScalar(strength), side:T.DoubleSide}))
    mesh.position.set(...position)
    mesh.lookAt(0, 0, 0)
    room.add(mesh); panels.push(mesh)
  }
  panel(.9, 9, 0xfff3e6, 9, [-8.5, 1.5, 3])    // warm strip, front left
  panel(.9, 9, 0xe3efff, 8, [8.5, 1, -2.5])     // cool strip, back right
  panel(7, 2.4, 0xffffff, 4, [0, 9, 2])          // overhead softbox
  const pmrem = new T.PMREMGenerator(renderer)
  const target = pmrem.fromScene(room, .03)
  panels.forEach(mesh => { mesh.geometry.dispose(); (mesh.material as T.Material).dispose() })
  room.dispose()
  pmrem.dispose()
  return target
}
