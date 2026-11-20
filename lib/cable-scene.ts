import * as T from 'three'
import { aboutTimeline, clamp } from '@/lib/about-timeline'
import { createCableKit } from '@/lib/cable-models'
import { createStudioEnvironment } from '@/lib/studio'
import { addCurrent, buildCopperCable, currentHalo, drawnMarks, helicalWire, legendShell, motes, pvcGrain, sparks, strandTip, zincSpangle } from '@/lib/cable-scene-fx'

type Anchor = {name:string,object:T.Object3D,path?:SVGPathElement|null,dot?:SVGCircleElement|null,label?:HTMLElement|null,ax:number,ay:number,left:boolean,last:string}

/**
 * Procedural marketing models; dimensions do not specify an actual PCI SKU.
 * The canvas must only ever be moved by CSS translate: anatomy leader lines are
 * drawn from projected 3D points into the same coordinate space as `.about-art`.
 */
export function createCableScene(host: HTMLElement, section: HTMLElement) {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('webgl2', {alpha:true, antialias:true, powerPreference:'high-performance'})
  if (!context) return () => {}
  const renderer = new T.WebGLRenderer({canvas, context, alpha:true, antialias:true})
  renderer.setClearColor(0x000000,0)
  renderer.toneMapping = T.NeutralToneMapping
  renderer.toneMappingExposure = 1
  renderer.shadowMap.enabled = true
  // PCF is three's soft-filtered shadow type now (PCFSoftShadowMap is swapped for it after the first shadow pass,
  // which recompiled every shader mid-scroll).
  renderer.shadowMap.type = T.PCFShadowMap
  // Shadows are redrawn only when the composition moves, not on frames where only the current animates.
  renderer.shadowMap.autoUpdate = false
  // Sharp on every screen: at least 1.5x (supersampled on standard displays), up to 2x, within a pixel budget.
  // If the device cannot hold a smooth frame rate, `quality` steps down (see render).
  let quality = Math.min(2,Math.max(devicePixelRatio,1.25))
  const pixelBudget = 2.6e6
  const scene = new T.Scene()
  const camera = new T.PerspectiveCamera(32,1,.1,50)
  const cameraHome = new T.Vector3(4,4.7,10)
  const lookAt = new T.Vector3(0,.05,0)
  let cameraScale = 1
  // Product-photography reflections (strip softboxes), so metal and PVC catch real highlights.
  const environment = createStudioEnvironment(renderer)
  scene.environment = environment.texture
  scene.environmentIntensity = .9
  const key = new T.DirectionalLight(0xfff5e7,2.4)
  key.position.set(-4,6,6)
  // Soft shadows between the cables ground them as real objects.
  key.castShadow = true
  key.shadow.mapSize.set(1024,1024)
  key.shadow.radius = 5
  key.shadow.bias = -.0008
  key.shadow.normalBias = .02
  Object.assign(key.shadow.camera,{left:-4.5,right:4.5,top:4.5,bottom:-4.5,near:1,far:20})
  const rim = new T.DirectionalLight(0xd4e9ff,1.8)
  rim.position.set(5,3,-2)
  scene.add(key,rim,new T.HemisphereLight(0xffffff,0x39454c,.8))
  const kit = createCableKit()
  const {rubber,aluminium,steel,bedding,colours,yellow} = kit.materials
  const {cylinder,collar,track} = kit
  // Every exposed conductor uses the high-detail twisted strands with cut, chamfered ends.
  const bundle = (parent:T.Object3D,r:number,bottom:number,top:number,x=0,z=0) => strandTip(kit,parent,aluminium,r,bottom,top,x,z)
  // Surface realism: PVC grain, drawn-wire marks on the strands, zinc spangle on galvanised steel.
  const grain = pvcGrain(), tubeMarks = drawnMarks(false), spangle = zincSpangle()
  const tuned = (m: T.MeshStandardMaterial, bump: T.Texture, scale: number, rough: number, metal?: number) => { m.bumpMap = bump; m.bumpScale = scale; m.roughness = rough; if (metal !== undefined) m.metalness = metal; m.needsUpdate = true }
  tuned(rubber, grain, .5, .52); rubber.color.set(0x15181b)
  tuned(bedding, grain, .35, .62)
  tuned(aluminium, tubeMarks, .9, .26, 1); aluminium.color.set(0xc9d0d6)
  tuned(steel, spangle, .4, .36, .9); steel.color.set(0x9aa3a8)
  colours.forEach(c => tuned(c, grain, .18, .36))
  // Bare conductors and the copper cable get materials of their own, so current lights only them.
  const bareAluminium = aluminium.clone(); bareAluminium.bumpMap = tubeMarks
  const earthSteel = steel.clone(); earthSteel.bumpMap = tubeMarks
  const copper = new T.MeshPhysicalMaterial({color:0xc97a4a, metalness:1, roughness:.27, bumpMap:tubeMarks, bumpScale:.9, clearcoat:.15})

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
  const pulseMaterial = (map:T.Texture,opacity:number) => new T.MeshBasicMaterial({color:0xff7444,alphaMap:map,transparent:true,premultipliedAlpha:true,opacity,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false,side:T.DoubleSide})
  const pulseA = pulseMaterial(bandTexture,1), pulseB = pulseMaterial(bandTextureB,1), glow = pulseMaterial(bandTexture,.35)
  const shells: T.Mesh[] = []

  const root = new T.Group()
  scene.add(root)
  function shell(parent:T.Object3D,r:number,length:number,y:number,material:T.Material,x=0,z=0) {
    const geo = track(new T.CylinderGeometry(r,r,length,40,1,true))
    const mesh = new T.Mesh(geo,material)
    mesh.position.set(x,y,z); mesh.visible=false; mesh.renderOrder=2
    parent.add(mesh); shells.push(mesh)
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
  const armourGeo = track(new T.CylinderGeometry(.024,.024,.62,16,1))
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
  // Printed legend along the sheath, as on PCI's cables.
  const powerLegend = legendShell(.58,2.65,'PCI CABLES  ·  1.1 kV  ·  4C × 95 mm²  ·  A2XWY  ·  IS 7098')
  powerLegend.mesh.position.y=-.9; sheathG.add(powerLegend.mesh)
  root.add(power)

  // A separate single-core covered conductor, with its own metallic end face.
  const single = new T.Group()
  cylinder(single,.31,2.6,-.85,rubber)
  shell(single,.325,2.6,-.85,pulseA)
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
  const bare=helicalWire(kit,.245,3.05,bareAluminium)
  // Current travels inside the bare strands, with a halo riding each band.
  // Electric blue-white current: the live conductor of the set.
  const bareCurrent=addCurrent(bareAluminium,{colour:0x3fc4ff,speed:1.15,spacing:2.2,width:.24})
  const bareHalo=currentHalo(.31,3.05,bareCurrent,0x5fd4ff); bare.add(bareHalo.mesh)
  bare.position.set(-1.9,-.5,.2);bare.rotation.z=.28;root.add(bare)
  const earth=helicalWire(kit,.16,2.65,earthSteel,{radial:10})
  // The earth wire carries a cooler, fainter flicker: the protective path, not a live conductor.
  const earthCurrent=addCurrent(earthSteel,{colour:0x8fc8ff,speed:1.9,spacing:1.4,width:.12})
  const earthHalo=currentHalo(.205,2.65,earthCurrent,0x9fd0ff); earth.add(earthHalo.mesh)
  earth.position.set(1.95,-.18,-.1);earth.rotation.z=-.24;root.add(earth)
  // PCI's four-core armoured copper control cable joins the range at the back right, entering last.
  const copperCable=buildCopperCable(kit,{rubber,bedding,steel,copper})
  const copperCurrent=addCurrent(copper,{speed:.55,spacing:.9,width:.1})
  const copperLegend = legendShell(.36,2.2,'PCI CABLES  ·  1.1 kV  ·  4C × 2.5 mm² CU  ·  YWY  ·  IS 1554')
  copperLegend.mesh.position.y=-.8; copperCable.group.add(copperLegend.mesh)
  copperCable.group.scale.setScalar(.86);copperCable.group.rotation.set(.05,.3,-.12);copperCable.group.position.set(1.36,.3,-.7);root.add(copperCable.group)
  const companions = [single,aerial,bare,earth,copperCable.group].map(group=>({group,home:group.position.clone(),scale:group.scale.x}))
  // Sparks at the live tips (bare aluminium end, copper strand ends) and motes drifting through the light.
  const bareSparks=sparks(bare,[new T.Vector3(0,1.53,0)],46,0xbfe6ff)
  const copperSparks=sparks(copperCable.group,copperCable.tips,30)
  const dust=motes(root)
  // Sheaths and insulation receive the soft shadows; bare metal shows its own reflections instead (cheaper too).
  root.traverse(o=>{ const mesh=o as T.Mesh, m=mesh.material as T.MeshStandardMaterial; if(mesh.isMesh && !m.transparent){ mesh.castShadow=true; mesh.receiveShadow=!(m.metalness>.5) } })

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

  let visible=true,frame=0,disposed=false,contextLost=false,sized=false,pending=true,warmed=false
  let lastFrameAt=0,frameSum=0,frameCount=0
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
    if(disposed || !visible || contextLost || !sized || document.hidden) return
    // Every frame runs at the display rate. If a device keeps missing frames, render fewer pixels instead of
    // dropping frames: a slightly softer image reads as smooth, a stutter never does.
    // Average over 45 back-to-back frames; when below ~55fps, scale the pixel count to the measured headroom
    // (never below 0.8x). Only ever steps down, so it settles after one or two adjustments.
    if(lastFrameAt && now-lastFrameAt<120){
      frameSum+=now-lastFrameAt;frameCount++
      if(frameCount>=45){
        const fps=1000/(frameSum/frameCount);frameSum=frameCount=0
        if(fps<55 && quality>.8){quality=Math.max(.8,quality*Math.sqrt(fps/60)*.97);resize()}
      }
    }
    lastFrameAt=now
    if(!warmed) warmUp()
    const staticMode=section.dataset.mode!=='cinematic'
    const tl=aboutTimeline(progress)
    if(staticMode || tl.anatomy>.05){px=0;py=0}
    // Shadows follow the composition only when it actually moved since the last frame.
    renderer.shadowMap.needsUpdate=(pending || Math.abs(px-cx)+Math.abs(py-cy)>.0005)
    pending=false
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
      const t=ease((tl.companions-i*.08)/.66)
      c.group.visible=t>.001
      c.group.position.set(c.home.x*lerp(.6,1,t),c.home.y-(1-t)*.5,c.home.z-(1-t)*2.6)
      c.group.scale.setScalar(c.scale*lerp(.7,1,t))
    })
    const pulseOn=tl.pulse>.001
    shells.forEach(s=>{s.visible=pulseOn})
    const seconds=now/1000, live=tl.pulse
    bareCurrent.curTime.value=copperCurrent.curTime.value=seconds
    // The earth wire flickers irregularly rather than streaming.
    earthCurrent.curTime.value=seconds
    bareCurrent.curStrength.value=1.45*live
    copperCurrent.curStrength.value=1.1*live
    earthCurrent.curStrength.value=.6*live*(.55+.45*Math.abs(Math.sin(seconds*7.3)*Math.sin(seconds*2.1)))
    bareHalo.mesh.visible=earthHalo.mesh.visible=pulseOn
    bareSparks.update(seconds,live);copperSparks.update(seconds,live*.8);dust.update(seconds,Math.max(live,tl.companions*.6))
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
    const looping=pulseOn && !staticMode
    const pulseState=looping?'running':'idle'
    if(canvas.dataset.pulse!==pulseState)canvas.dataset.pulse=pulseState
    if(looping || Math.abs(px-cx)+Math.abs(py-cy)>.001) schedule()
  }
  /**
   * Compiles every shader and uploads every texture before the first visible frame. Without this, each part that
   * appears later in the scroll (companion cables, current, sparks) compiled on first sight and stalled the scroll.
   */
  function warmUp(){
    warmed=true
    const hidden:T.Object3D[]=[]
    scene.traverse(o=>{if(!o.visible){hidden.push(o);o.visible=true}})
    renderer.compile(scene,camera)
    renderer.shadowMap.needsUpdate=true
    renderer.render(scene,camera)
    hidden.forEach(o=>{o.visible=false})
  }
  function schedule(){if(!frame && visible && sized && !disposed && !contextLost && !document.hidden)frame=requestAnimationFrame(render)}
  function request(){pending=true;schedule()}
  function suspend(){
    cancelAnimationFrame(frame);frame=0
    lastFrameAt=0;frameSum=0;frameCount=0
    canvas.dataset.pulse='idle'
  }
  function resize(){
    width=host.clientWidth;height=host.clientHeight
    sized = width > 0 && height > 0
    if (!sized) return
    renderer.setPixelRatio(Math.min(quality,Math.max(1,Math.sqrt(pixelBudget/(width*height)))))
    renderer.setSize(width,height,false)
    camera.aspect=width/height
    cameraScale=.82*Math.max(1,1.06/camera.aspect)
    camera.updateProjectionMatrix()
    measure();request()
  }
  function onProgress(event:Event){progress=(event as CustomEvent<number>).detail;request()}
  function pointer(event:PointerEvent){
    if(event.pointerType!=='mouse')return
    const rect=host.getBoundingClientRect();px=(event.clientX-rect.left)/rect.width-.5;py=(event.clientY-rect.top)/rect.height-.5;request()
  }
  function leave(){px=0;py=0;request()}
  function lost(event:Event){event.preventDefault();contextLost=true;suspend();delete host.dataset.ready;if(art)delete art.dataset.anchors}
  function restored(){contextLost=false;warmed=false;request()}
  function onVisibility(){if(document.hidden)suspend();else request()}
  const resizeObserver=new ResizeObserver(resize)
  const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)request();else suspend()})
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
    kit.dispose()
    ;[grain,tubeMarks,spangle].forEach(t=>t.dispose())
    ;[bareAluminium,earthSteel,copper].forEach(m=>m.dispose())
    ;[powerLegend,copperLegend,bareHalo,earthHalo,bareSparks,copperSparks,dust,copperCable].forEach(x=>x.dispose())
    ;[pulseA,pulseB,glow].forEach(m=>m.dispose())
    bandTexture.dispose();bandTextureB.dispose()
    environment.dispose();renderer.dispose();canvas.remove();delete host.dataset.ready
    if(art)delete art.dataset.anchors
  }
}
