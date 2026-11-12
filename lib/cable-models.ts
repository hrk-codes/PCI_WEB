import * as T from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

/**
 * Shared procedural cable builders used by the About scene and the hero film.
 * Illustrative marketing models; dimensions do not specify an actual PCI SKU.
 */
export function createCableKit() {
  const geometry: T.BufferGeometry[] = []
  const track = <G extends T.BufferGeometry>(geo: G) => { geometry.push(geo); return geo }
  const rubber = new T.MeshPhysicalMaterial({color:0x10151b,roughness:.37,metalness:.12,clearcoat:.25,clearcoatRoughness:.42})
  const aluminium = new T.MeshStandardMaterial({color:0xa7afb7,metalness:1,roughness:.19})
  const steel = new T.MeshStandardMaterial({color:0x99a5ad,metalness:.92,roughness:.3})
  const bedding = new T.MeshStandardMaterial({color:0x252a2d,roughness:.7})
  const colours = [0xd7513d,0xd5ab30,0x236f9d,0x262e37].map(color=>new T.MeshPhysicalMaterial({color,roughness:.31,metalness:.08,clearcoat:.25}))
  const yellow = new T.MeshStandardMaterial({color:0xf1bf34,roughness:.4})
  const materials = {rubber,aluminium,steel,bedding,colours,yellow}

  function cylinder(parent:T.Object3D,r:number,length:number,y:number,material:T.Material,x=0,z=0) {
    const geo = track(material===rubber ? new T.LatheGeometry([
      new T.Vector2(0,-length/2),new T.Vector2(r*.94,-length/2),
      new T.Vector2(r,-length/2+.035),new T.Vector2(r,length/2-.035),
      new T.Vector2(r*.96,length/2),new T.Vector2(0,length/2),
    ],64) : new T.CylinderGeometry(r,r,length,48,1))
    const mesh = new T.Mesh(geo,material)
    mesh.position.set(x,y,z); parent.add(mesh)
    return mesh
  }
  /** Closely packed, individually modelled round strands, including their end faces. */
  function bundle(parent:T.Object3D,r:number,bottom:number,top:number,x=0,z=0,material:T.Material=aluminium) {
    const strand = r / 5.15
    const geo = track(new T.CylinderGeometry(strand,strand,top-bottom,12,1))
    const positions: [number,number][] = [[0,0]]
    for (let ring=1;ring<=2;ring++) for (let i=0;i<ring*6;i++) {
      const angle=i*Math.PI*2/(ring*6)
      positions.push([Math.cos(angle)*strand*2.03*ring,Math.sin(angle)*strand*2.03*ring])
    }
    const instances = new T.InstancedMesh(geo,material,positions.length)
    const matrix = new T.Matrix4()
    for(let i=0;i<positions.length;i++) {
      matrix.makeTranslation(x+positions[i][0],(bottom+top)/2,z+positions[i][1])
      instances.setMatrixAt(i,matrix)
    }
    parent.add(instances)
    return instances
  }
  function collar(parent:T.Object3D,r:number,y:number,material:T.Material) {
    const geo = track(new T.TorusGeometry(r,.025,10,64))
    const mesh = new T.Mesh(geo,material)
    mesh.rotation.x=Math.PI/2;mesh.position.y=y;parent.add(mesh)
    return mesh
  }
  /** Helical stranded wire along local Y, with closed strand end faces. */
  function strandedWire(radius:number,length:number,material:T.Material,{rings=2,turns=.9,segments=48,radial=8}={}) {
    const group=new T.Group()
    const parts:T.BufferGeometry[]=[]
    const strand=radius/(1.03+rings*2.06)
    const positions:[number,number][]=[[0,0]]
    for(let ring=1;ring<=rings;ring++) for(let i=0;i<ring*6;i++) positions.push([ring*strand*2.03,i*Math.PI*2/(ring*6)])
    for(const [distance,start] of positions) {
      const points=Array.from({length:segments+1},(_,i)=>{
        const t=i/segments,angle=start+t*Math.PI*2*turns
        return new T.Vector3(Math.cos(angle)*distance,t*length-length/2,Math.sin(angle)*distance)
      })
      parts.push(new T.TubeGeometry(new T.CatmullRomCurve3(points),segments,strand,radial,false))
      for(const end of [points[0],points[segments]]) {
        const cap=new T.CircleGeometry(strand,12)
        cap.rotateX(end.y>0?-Math.PI/2:Math.PI/2)
        cap.translate(end.x,end.y,end.z);parts.push(cap)
      }
    }
    const merged=track(mergeGeometries(parts))
    parts.forEach(part=>part.dispose())
    group.add(new T.Mesh(merged,material))
    return group
  }
  function dispose() {
    geometry.forEach(g=>g.dispose())
    ;[rubber,aluminium,steel,bedding,yellow,...colours].forEach(m=>m.dispose())
  }
  return {materials,track,cylinder,bundle,collar,strandedWire,dispose}
}
export type CableKit = ReturnType<typeof createCableKit>
