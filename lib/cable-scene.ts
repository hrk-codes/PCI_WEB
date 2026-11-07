import * as T from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

/** Procedural marketing models; dimensions do not specify an actual PCI SKU. */
export function createCableScene(host: HTMLElement, section: HTMLElement) {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('webgl2', {alpha:true, antialias:true, powerPreference:'low-power'})
  if (!context) return () => {}
  const renderer = new T.WebGLRenderer({canvas, context, alpha:true, antialias:true})
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.6))
  renderer.setClearColor(0x000000,0)
  renderer.toneMapping = T.ACESFilmicToneMapping
  renderer.toneMappingExposure = .95
  const scene = new T.Scene()
  const camera = new T.PerspectiveCamera(32,1,.1,50)
  camera.position.set(5,5.2,10)
  camera.lookAt(0,.1,0)
  const pmrem = new T.PMREMGenerator(renderer)
  const room = new RoomEnvironment()
  const environment = pmrem.fromScene(room,.04)
  scene.environment = environment.texture
  room.dispose()
  const key = new T.DirectionalLight(0xfff5e7,2.6)
  key.position.set(-4,6,6)
  const rim = new T.DirectionalLight(0xd4e9ff,1.8)
  rim.position.set(5,3,-2)
  scene.add(key,rim,new T.HemisphereLight(0xffffff,0x39454c,.8))
  const rubber = new T.MeshPhysicalMaterial({color:0x10151b,roughness:.37,metalness:.12,clearcoat:.25,clearcoatRoughness:.42})
  const aluminium = new T.MeshStandardMaterial({color:0xa7afb7,metalness:1,roughness:.19})
  const steel = new T.MeshStandardMaterial({color:0x99a5ad,metalness:.92,roughness:.3})
  const bedding = new T.MeshStandardMaterial({color:0x252a2d,roughness:.7})
  const colours = [0xd7513d,0xd5ab30,0x236f9d,0x262e37].map(color=>new T.MeshPhysicalMaterial({color,roughness:.31,metalness:.08,clearcoat:.25}))
  const yellow = new T.MeshStandardMaterial({color:0xf1bf34,roughness:.4})
  const root = new T.Group()
  scene.add(root)
  const moving: T.Group[] = []
  const geometry: T.BufferGeometry[] = []
  function cylinder(parent:T.Group,r:number,length:number,y:number,material:T.Material,x=0,z=0) {
    const geo = material===rubber ? new T.LatheGeometry([
      new T.Vector2(0,-length/2),new T.Vector2(r*.94,-length/2),
      new T.Vector2(r,-length/2+.035),new T.Vector2(r,length/2-.035),
      new T.Vector2(r*.96,length/2),new T.Vector2(0,length/2),
    ],64) : new T.CylinderGeometry(r,r,length,48,1)
    geometry.push(geo)
    const mesh = new T.Mesh(geo,material)
    mesh.position.set(x,y,z); parent.add(mesh)
    return mesh
  }
  function bundle(parent:T.Group,r:number,bottom:number,top:number,x=0,z=0) {
    // Closely packed, individually modelled round strands, including their end faces.
    const strand = r / 5.15
    const geo = new T.CylinderGeometry(strand,strand,top-bottom,12,1)
    geometry.push(geo)
    const positions: [number,number][] = [[0,0]]
    for (let ring=1;ring<=2;ring++) for (let i=0;i<ring*6;i++) {
      const angle=i*Math.PI*2/(ring*6)
      positions.push([Math.cos(angle)*strand*2.03*ring,Math.sin(angle)*strand*2.03*ring])
    }
    const instances = new T.InstancedMesh(geo,aluminium,positions.length)
    const matrix = new T.Matrix4()
    for(let i=0;i<positions.length;i++) {
      matrix.makeTranslation(x+positions[i][0],(bottom+top)/2,z+positions[i][1])
      instances.setMatrixAt(i,matrix)
    }
    parent.add(instances)
  }
  function collar(parent:T.Group,r:number,y:number,material:T.Material) {
    const geo = new T.TorusGeometry(r,.025,10,64)
    geometry.push(geo)
    const mesh = new T.Mesh(geo,material)
    mesh.rotation.x=Math.PI/2;mesh.position.y=y;parent.add(mesh)
  }
  // Four-core armoured power cable: outer sheath, armour, bedding, insulation and strand bundles.
  const power = new T.Group()
  cylinder(power,.58,2.65,-.9,rubber)
  cylinder(power,.535,.65,.7,bedding)
  collar(power,.565,.425,rubber)
  const armour = new T.Group()
  const armourGeo = new T.CylinderGeometry(.024,.024,.62,10,1)
  geometry.push(armourGeo)
  const armourMesh = new T.InstancedMesh(armourGeo,steel,54)
  const mat = new T.Matrix4()
  for(let i=0;i<54;i++) {
    const angle=i*Math.PI*2/54
    mat.makeTranslation(Math.cos(angle)*.54,.73,Math.sin(angle)*.54)
    armourMesh.setMatrixAt(i,mat)
  }
  armour.add(armourMesh);power.add(armour)
  collar(power,.53,1.04,bedding)
  const powerCores = new T.Group()
  for(let i=0;i<4;i++) {
    const angle=i*Math.PI/2+Math.PI/4
    const x=Math.cos(angle)*.28,z=Math.sin(angle)*.28
    const lift=z<0?.27:0
    cylinder(powerCores,.215,.82+lift,1.26+lift/2,colours[i],x,z)
    bundle(powerCores,.19,1.5+lift,2.03+lift+(i%2)*.1,x,z)
  }
  power.add(powerCores);moving.push(powerCores)
  power.rotation.z=-.17;power.position.set(-.08,0,.15);root.add(power)
  // A separate single-core covered conductor, with its own metallic end face.
  const single = new T.Group()
  cylinder(single,.31,2.6,-.85,rubber)
  collar(single,.295,.45,rubber)
  const singleCore = new T.Group()
  bundle(singleCore,.265,.35,1.4)
  single.add(singleCore);moving.push(singleCore)
  single.rotation.z=.12;single.position.set(-1.05,-.32,-.15);root.add(single)
  // Aerial assembly: three separate insulated conductors with an exposed aluminium bundle.
  const aerial = new T.Group()
  const aerialCores = new T.Group()
  for(let i=0;i<3;i++) {
    const angle=i*Math.PI*2/3
    const x=Math.cos(angle)*.27,z=Math.sin(angle)*.27
    cylinder(aerial,.265,2.5,-.8,rubber,x,z)
    cylinder(aerial,.24,.1,.48,bedding,x,z)
    bundle(aerialCores,.22,.44,1.12+(i%2)*.09,x,z)
  }
  const stripe=cylinder(aerial,.018,2.4,-.8,yellow,.27,.266)
  stripe.scale.x=.7
  aerial.add(aerialCores);moving.push(aerialCores)
  aerial.scale.setScalar(.77);aerial.rotation.z=-.27;aerial.position.set(1.1,-.8,.4);root.add(aerial)
  // Additional bare aluminium conductor and galvanised earth wire frame the main cutaways.
  // Helical strands give these products a recognisably different construction and silhouette.
  function strandedWire(radius:number,length:number,material:T.Material) {
    const group=new T.Group()
    const parts:T.BufferGeometry[]=[]
    const strand=radius/5.15
    const positions:[number,number][]=[[0,0]]
    for(let ring=1;ring<=2;ring++) for(let i=0;i<ring*6;i++) {
      positions.push([ring*strand*2.03,i*Math.PI*2/(ring*6)])
    }
    for(const [distance,start] of positions) {
      const points=Array.from({length:49},(_,i)=>{
        const t=i/48,angle=start+t*Math.PI*1.8
        return new T.Vector3(Math.cos(angle)*distance,t*length-length/2,Math.sin(angle)*distance)
      })
      const curve=new T.CatmullRomCurve3(points)
      parts.push(new T.TubeGeometry(curve,48,strand,8,false))
      for(const end of [points[0],points[48]]) {
        const cap=new T.CircleGeometry(strand,12)
        cap.rotateX(end.y>0?-Math.PI/2:Math.PI/2)
        cap.translate(end.x,end.y,end.z);parts.push(cap)
      }
    }
    const merged=mergeGeometries(parts)
    parts.forEach(part=>part.dispose())
    geometry.push(merged)
    group.add(new T.Mesh(merged,material))
    return group
  }
  const bare=strandedWire(.245,3.05,aluminium)
  bare.position.set(-1.9,-.5,.2);bare.rotation.z=.28;root.add(bare)
  const earth=strandedWire(.16,2.65,steel)
  earth.position.set(1.95,-.18,-.1);earth.rotation.z=-.24;root.add(earth)
  root.rotation.set(.02,-.35,-.08)
  let visible=true,frame=0,disposed=false,contextLost=false,sized=false
  let progress=Number(getComputedStyle(section).getPropertyValue('--story-progress')) || 0
  let px=0,py=0,cx=0,cy=0
  const smooth=(a:number,b:number,p:number)=>a+(b-a)*p
  const ease=(p:number)=>{const t=Math.max(0,Math.min(1,p));return t*t*(3-2*t)}
  function render() {
    frame=0
    if(disposed || !visible || contextLost || !sized) return
    const staticMode=section.dataset.mode!=='cinematic'
    if(staticMode){px=0;py=0}
    cx=smooth(cx,px,.14);cy=smooth(cy,py,.14)
    const turn=ease((progress-.12)/.42)
    root.rotation.y=-.48+turn*.7+cx*.1
    root.rotation.x=.03+cy*.07
    root.rotation.z=-.1+turn*.06
    moving.forEach((g,i)=>{g.position.y=Math.sin(ease((progress-.12)/.5)*Math.PI)*(.13+i*.025)})
    const spread=ease((progress-.12)/.5)
    bare.position.x=-1.65-spread*.25;bare.rotation.y=spread*.2
    earth.position.x=1.7+spread*.25;earth.rotation.y=-spread*.15
    renderer.render(scene,camera)
    if (renderer.getContext().isContextLost()) return
    canvas.dataset.progress=progress.toFixed(3)
    if (host.dataset.ready !== 'yes') host.dataset.ready = 'yes'
    if(Math.abs(px-cx)+Math.abs(py-cy)>.001) schedule()
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(render)}
  function resize(){
    // The shared CSS transform belongs to the artwork, not the camera viewport.
    const { clientWidth: width, clientHeight: height } = host
    sized = width > 0 && height > 0
    if (!sized) return
    renderer.setSize(width,height,false)
    camera.aspect=width/height
    camera.position.set(4,4.7,10).multiplyScalar(.82*Math.max(1,1.06/camera.aspect))
    camera.lookAt(0,.05,0);camera.updateProjectionMatrix();schedule()
  }
  function onProgress(event:Event){progress=(event as CustomEvent<number>).detail;schedule()}
  function pointer(event:PointerEvent){
    if(event.pointerType!=='mouse')return
    const rect=host.getBoundingClientRect();px=(event.clientX-rect.left)/rect.width-.5;py=(event.clientY-rect.top)/rect.height-.5;schedule()
  }
  function leave(){px=0;py=0;schedule()}
  function lost(event:Event){event.preventDefault();contextLost=true;delete host.dataset.ready}
  function restored(){contextLost=false;schedule()}
  const resizeObserver=new ResizeObserver(resize)
  const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)schedule()},{rootMargin:'100px'})
  host.append(canvas)
  resizeObserver.observe(host);intersection.observe(host)
  section.addEventListener('pci-cable-progress',onProgress)
  host.addEventListener('pointermove',pointer);host.addEventListener('pointerleave',leave)
  canvas.addEventListener('webglcontextlost',lost);canvas.addEventListener('webglcontextrestored',restored)
  resize()
  return ()=>{
    disposed=true;cancelAnimationFrame(frame);resizeObserver.disconnect();intersection.disconnect()
    section.removeEventListener('pci-cable-progress',onProgress)
    host.removeEventListener('pointermove',pointer);host.removeEventListener('pointerleave',leave)
    canvas.removeEventListener('webglcontextlost',lost);canvas.removeEventListener('webglcontextrestored',restored)
    geometry.forEach(g=>g.dispose())
    ;[rubber,aluminium,steel,bedding,yellow,...colours].forEach(m=>m.dispose())
    environment.dispose();pmrem.dispose();renderer.dispose();canvas.remove();delete host.dataset.ready
  }
}
