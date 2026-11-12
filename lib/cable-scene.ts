import * as T from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { aboutTimeline, clamp } from '@/lib/about-timeline'

type Anchor = {name:string,object:T.Object3D,path?:SVGPathElement|null,dot?:SVGCircleElement|null,label?:HTMLElement|null,ax:number,ay:number,left:boolean,last:string}

/**
 * Procedural marketing models; dimensions do not specify an actual PCI SKU.
 * The canvas must only ever be moved by CSS translate: anatomy leader lines are
 * drawn from projected 3D points into the same coordinate space as `.about-art`.
 */
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
  const cameraHome = new T.Vector3(4,4.7,10)
  const lookAt = new T.Vector3(0,.05,0)
  let cameraScale = 1
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

  // Energy pulse: a soft orange band scrolling along additive shells. No post-processing.
  const band = new Uint8Array(128*4)
  for (let i=0;i<128;i++) {
    const v=i/127, core=Math.exp(-(((v-.5)/.07)**2)), tail=Math.exp(-(((v-.36)/.16)**2))*.28
    const a=Math.round(Math.min(1,core+tail)*255)
    band.set([a,a,a,a],i*4)
  }
  const bandTexture = new T.DataTexture(band,1,128)
  bandTexture.wrapS = bandTexture.wrapT = T.RepeatWrapping
  bandTexture.magFilter = bandTexture.minFilter = T.LinearFilter
  bandTexture.needsUpdate = true
  const bandTextureB = bandTexture.clone()
  bandTextureB.needsUpdate = true
  const pulseMaterial = (map:T.Texture,opacity:number) => new T.MeshBasicMaterial({color:0xff7444,alphaMap:map,transparent:true,opacity,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false,side:T.DoubleSide})
  const pulseA = pulseMaterial(bandTexture,1), pulseB = pulseMaterial(bandTextureB,1), glow = pulseMaterial(bandTexture,.35)
  const shells: T.Mesh[] = []

  const root = new T.Group()
  scene.add(root)
  const geometry: T.BufferGeometry[] = []
  function cylinder(parent:T.Object3D,r:number,length:number,y:number,material:T.Material,x=0,z=0) {
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
  function shell(parent:T.Object3D,r:number,length:number,y:number,material:T.Material,x=0,z=0) {
    const geo = new T.CylinderGeometry(r,r,length,40,1,true)
    geometry.push(geo)
    const mesh = new T.Mesh(geo,material)
    mesh.position.set(x,y,z); mesh.visible=false; mesh.renderOrder=2
    parent.add(mesh); shells.push(mesh)
  }
  function bundle(parent:T.Object3D,r:number,bottom:number,top:number,x=0,z=0) {
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
  function collar(parent:T.Object3D,r:number,y:number,material:T.Material) {
    const geo = new T.TorusGeometry(r,.025,10,64)
    geometry.push(geo)
    const mesh = new T.Mesh(geo,material)
    mesh.rotation.x=Math.PI/2;mesh.position.y=y;parent.add(mesh)
  }
  // Anchor points sit on the camera-facing side of each layer.
  const facing = new T.Vector3(.37,0,.93).normalize()
  function anchor(parent:T.Object3D,r:number,y:number) {
    const point = new T.Object3D()
    point.position.set(facing.x*r,y,facing.z*r)
    parent.add(point)
    return point
  }

  // Four-core armoured power cable, built as separable layers for the anatomy beat.
  const power = new T.Group()
  const sheathG = new T.Group(), armourG = new T.Group(), beddingG = new T.Group(), insulG = new T.Group()
  cylinder(sheathG,.58,2.65,-.9,rubber)
  collar(sheathG,.565,.425,rubber)
  cylinder(beddingG,.535,.65,.7,bedding)
  collar(beddingG,.53,1.04,bedding)
  const armourGeo = new T.CylinderGeometry(.024,.024,.62,10,1)
  geometry.push(armourGeo)
  const armourMesh = new T.InstancedMesh(armourGeo,steel,54)
  const mat = new T.Matrix4()
  for(let i=0;i<54;i++) {
    const angle=i*Math.PI*2/54
    mat.makeTranslation(Math.cos(angle)*.54,.73,Math.sin(angle)*.54)
    armourMesh.setMatrixAt(i,mat)
  }
  armourG.add(armourMesh)
  const cores: {group:T.Group,strands:T.Group,x:number,z:number}[] = []
  for(let i=0;i<4;i++) {
    const angle=i*Math.PI/2+Math.PI/4
    const x=Math.cos(angle)*.28,z=Math.sin(angle)*.28
    const lift=z<0?.27:0
    const group=new T.Group(), strands=new T.Group()
    group.position.set(x,0,z)
    cylinder(group,.215,.82+lift,1.26+lift/2,colours[i])
    shell(group,.228,.82+lift,1.26+lift/2,i%2?pulseB:pulseA)
    shell(group,.27,.82+lift,1.26+lift/2,glow)
    bundle(strands,.19,1.5+lift,2.03+lift+(i%2)*.1)
    group.add(strands); insulG.add(group)
    cores.push({group,strands,x,z})
  }
  power.add(sheathG,armourG,beddingG,insulG)
  const anchors: Anchor[] = [
    {name:'sheath',object:anchor(sheathG,.58,-.35)},
    {name:'armour',object:anchor(armourG,.56,.62)},
    {name:'bedding',object:anchor(beddingG,.54,.92)},
    {name:'insulation',object:anchor(cores[0].group,.215,1.18)},
    {name:'conductor',object:anchor(cores[0].strands,.08,1.98)},
  ].map(a=>({...a,ax:0,ay:0,left:true,last:''}))
  root.add(power)

  // A separate single-core covered conductor, with its own metallic end face.
  const single = new T.Group()
  cylinder(single,.31,2.6,-.85,rubber)
  collar(single,.295,.45,rubber)
  bundle(single,.265,.35,1.4)
  single.rotation.z=.12;single.position.set(-1.05,-.32,-.15);root.add(single)
  // Aerial assembly: three separate insulated conductors with an exposed aluminium bundle.
  const aerial = new T.Group()
  for(let i=0;i<3;i++) {
    const angle=i*Math.PI*2/3
    const x=Math.cos(angle)*.27,z=Math.sin(angle)*.27
    cylinder(aerial,.265,2.5,-.8,rubber,x,z)
    shell(aerial,.28,2.5,-.8,i%2?pulseA:pulseB,x,z)
    cylinder(aerial,.24,.1,.48,bedding,x,z)
    bundle(aerial,.22,.44,1.12+(i%2)*.09,x,z)
  }
  const stripe=cylinder(aerial,.018,2.4,-.8,yellow,.27,.266)
  stripe.scale.x=.7
  aerial.scale.setScalar(.77);aerial.rotation.z=-.27;aerial.position.set(1.1,-.8,.4);root.add(aerial)
  // Additional bare aluminium conductor and galvanised earth wire frame the main cutaways.
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
  shell(bare,.262,3.05,0,pulseB)
  bare.position.set(-1.9,-.5,.2);bare.rotation.z=.28;root.add(bare)
  const earth=strandedWire(.16,2.65,steel)
  earth.position.set(1.95,-.18,-.1);earth.rotation.z=-.24;root.add(earth)
  const companions = [single,aerial,bare,earth].map(group=>({group,home:group.position.clone(),scale:group.scale.x}))

  // DOM targets for the anatomy leader lines (all optional; the scene works without them).
  const art = section.querySelector<HTMLElement>('.about-art')
  for (const a of anchors) {
    a.path = section.querySelector<SVGPathElement>(`[data-anchor-line="${a.name}"]`)
    a.dot = section.querySelector<SVGCircleElement>(`[data-anchor-dot="${a.name}"]`)
    a.label = section.querySelector<HTMLElement>(`[data-anchor="${a.name}"]`)
  }
  let hostX=0,hostY=0,width=0,height=0
  function measure() {
    if (!art) return
    const artRect=art.getBoundingClientRect(), hostRect=host.getBoundingClientRect()
    hostX=hostRect.left-artRect.left;hostY=hostRect.top-artRect.top
    const middle=artRect.width/2
    for (const a of anchors) {
      if (!a.label) continue
      const r=a.label.getBoundingClientRect()
      const left=r.left-artRect.left, right=r.right-artRect.left
      a.left = (left+right)/2 < middle
      a.ax = a.left ? right+10 : left-10
      a.ay = r.top-artRect.top+9
      a.last=''
    }
  }

  let visible=true,frame=0,disposed=false,contextLost=false,sized=false,pending=true,lastDraw=0,lastProgressAt=performance.now()
  let progress=Number(getComputedStyle(section).getPropertyValue('--story-progress')) || 0
  let px=0,py=0,cx=0,cy=0
  const lerp=(a:number,b:number,p:number)=>a+(b-a)*p
  const ease=(p:number)=>{const t=clamp(p);return t*t*(3-2*t)}
  const projected = new T.Vector3()
  function drawLeaders(anatomy:number) {
    if (!art || anatomy<.001 || !width) return
    root.updateMatrixWorld(true)
    for (const a of anchors) {
      if (!a.path) continue
      projected.setFromMatrixPosition(a.object.matrixWorld).project(camera)
      const sx=hostX+(projected.x+1)/2*width, sy=hostY+(1-projected.y)/2*height
      const knee=a.ax+(a.left?26:-26)
      const d=`M${sx.toFixed(1)} ${sy.toFixed(1)}L${knee.toFixed(1)} ${a.ay.toFixed(1)}L${a.ax.toFixed(1)} ${a.ay.toFixed(1)}`
      if (d===a.last) continue
      a.last=d
      a.path.setAttribute('d',d)
      a.dot?.setAttribute('cx',sx.toFixed(1));a.dot?.setAttribute('cy',sy.toFixed(1))
    }
    if (art.dataset.anchors!=='live') art.dataset.anchors='live'
  }
  function render(now:number) {
    frame=0
    if(disposed || !visible || contextLost || !sized) return
    // Pulse-only frames run at ~30fps; scroll and pointer frames are never throttled.
    if(!pending && now-lastDraw<30){schedule();return}
    pending=false;lastDraw=now
    const staticMode=section.dataset.mode!=='cinematic'
    const tl=aboutTimeline(progress)
    if(staticMode || tl.anatomy>.05){px=0;py=0}
    cx=lerp(cx,px,.14);cy=lerp(cy,py,.14)
    const e=tl.anatomy, settle=tl.settle
    // Pose: diagonal hero for the anatomy beat, upright composition once settled.
    root.rotation.y=-.72+ease(progress/.5)*.94+cx*.1
    root.rotation.x=lerp(-.32,.03,settle)+cy*.07
    root.rotation.z=lerp(-1.02,-.04,settle)
    power.rotation.z=-.17
    power.position.set(lerp(.05,-.08,settle),lerp(-.25,0,settle)-e*.8,lerp(.2,.15,settle))
    sheathG.position.y=-.5*e
    armourG.position.y=.4*e
    armourG.scale.set(1+.5*e,1,1+.5*e)
    beddingG.position.y=.88*e
    insulG.position.y=1.42*e
    insulG.rotation.y=.7*e
    for (const c of cores) {
      c.group.position.set(c.x*(1+1.15*e),0,c.z*(1+1.15*e))
      c.strands.position.y=.6*e
    }
    companions.forEach((c,i)=>{
      const t=ease((tl.companions-i*.12)/.64)
      c.group.visible=t>.001
      c.group.position.set(c.home.x*lerp(.6,1,t),c.home.y-(1-t)*.5,c.home.z-(1-t)*2.6)
      c.group.scale.setScalar(c.scale*lerp(.7,1,t))
    })
    const pulseOn=tl.pulse>.001
    shells.forEach(s=>{s.visible=pulseOn})
    if (pulseOn) {
      const travel=now*.00042+progress*1.5
      bandTexture.offset.y=-(travel%1);bandTextureB.offset.y=-((travel+.47)%1)
      pulseA.opacity=pulseB.opacity=tl.pulse*.95;glow.opacity=tl.pulse*.32
    }
    camera.position.copy(cameraHome).multiplyScalar(cameraScale*lerp(.9,1,settle))
    camera.lookAt(lookAt)
    renderer.render(scene,camera)
    if (renderer.getContext().isContextLost()) return
    drawLeaders(e)
    canvas.dataset.progress=progress.toFixed(3)
    if (host.dataset.ready !== 'yes') host.dataset.ready = 'yes'
    const looping=pulseOn && !staticMode && !document.hidden && now-lastProgressAt<6000
    canvas.dataset.pulse=looping?'running':'idle'
    if(looping || Math.abs(px-cx)+Math.abs(py-cy)>.001) schedule()
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(render)}
  function request(){pending=true;schedule()}
  function resize(){
    width=host.clientWidth;height=host.clientHeight
    sized = width > 0 && height > 0
    if (!sized) return
    renderer.setPixelRatio(Math.min(devicePixelRatio,width>900?1.35:1.6))
    renderer.setSize(width,height,false)
    camera.aspect=width/height
    cameraScale=.82*Math.max(1,1.06/camera.aspect)
    camera.updateProjectionMatrix()
    measure();request()
  }
  function onProgress(event:Event){progress=(event as CustomEvent<number>).detail;lastProgressAt=performance.now();request()}
  function pointer(event:PointerEvent){
    if(event.pointerType!=='mouse')return
    const rect=host.getBoundingClientRect();px=(event.clientX-rect.left)/rect.width-.5;py=(event.clientY-rect.top)/rect.height-.5;request()
  }
  function leave(){px=0;py=0;request()}
  function lost(event:Event){event.preventDefault();contextLost=true;delete host.dataset.ready;if(art)delete art.dataset.anchors}
  function restored(){contextLost=false;request()}
  function onVisibility(){if(!document.hidden)request()}
  const resizeObserver=new ResizeObserver(resize)
  const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)request()},{rootMargin:'100px'})
  const modeObserver=new MutationObserver(()=>{measure();request()})
  host.append(canvas)
  resizeObserver.observe(host);if(art)resizeObserver.observe(art);intersection.observe(host)
  modeObserver.observe(section,{attributes:true,attributeFilter:['data-mode']})
  section.addEventListener('pci-cable-progress',onProgress)
  host.addEventListener('pointermove',pointer);host.addEventListener('pointerleave',leave)
  canvas.addEventListener('webglcontextlost',lost);canvas.addEventListener('webglcontextrestored',restored)
  document.addEventListener('visibilitychange',onVisibility)
  resize()
  return ()=>{
    disposed=true;cancelAnimationFrame(frame);resizeObserver.disconnect();intersection.disconnect();modeObserver.disconnect()
    section.removeEventListener('pci-cable-progress',onProgress)
    host.removeEventListener('pointermove',pointer);host.removeEventListener('pointerleave',leave)
    canvas.removeEventListener('webglcontextlost',lost);canvas.removeEventListener('webglcontextrestored',restored)
    document.removeEventListener('visibilitychange',onVisibility)
    geometry.forEach(g=>g.dispose())
    ;[rubber,aluminium,steel,bedding,yellow,pulseA,pulseB,glow,...colours].forEach(m=>m.dispose())
    bandTexture.dispose();bandTextureB.dispose()
    environment.dispose();pmrem.dispose();renderer.dispose();canvas.remove();delete host.dataset.ready
    if(art)delete art.dataset.anchors
  }
}
