import * as T from 'three'
import { reachHub, reachStates, reachExports, type ReachState } from '@/content/reach'

export type EarthData={land:number[][][][];india:number[][][][]}
export type EarthCallbacks={india:(persistent:boolean)=>void;hover:(id:string|null)=>void;select:(id:string)=>void}
const rad=Math.PI/180
const clamp=(n:number)=>Math.max(0,Math.min(1,n))
const ease=(n:number)=>{const t=clamp(n);return t*t*(3-2*t)}
export function earthPoint(lat:number,lon:number,r=1){const p=lat*rad,l=lon*rad;return new T.Vector3(Math.cos(p)*Math.sin(l)*r,Math.sin(p)*r,Math.cos(p)*Math.cos(l)*r)}
function ringContains(ring:number[][],lon:number,lat:number){
  let inside=false
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const a=ring[i],b=ring[j]
    if((a[1]>lat)!==(b[1]>lat) && lon<(b[0]-a[0])*(lat-a[1])/(b[1]-a[1])+a[0])inside=!inside
  }
  return inside
}
export function inIndia(data:EarthData,lat:number,lon:number){return data.india.some(poly=>ringContains(poly[0],lon,lat)&&!poly.slice(1).some(r=>ringContains(r,lon,lat)))}

export function createEarthScene(host:HTMLElement,data:EarthData,initial:ReachState,callbacks:EarthCallbacks){
  const canvas=document.createElement('canvas')
  const context=canvas.getContext('webgl2',{alpha:true,antialias:true,powerPreference:'low-power'})
  if(!context)return null
  const renderer=new T.WebGLRenderer({canvas,context,alpha:true,antialias:true})
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0,0)
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1
  const scene=new T.Scene(),root=new T.Group()
  scene.add(root,new T.AmbientLight(0x8ac0df,1.9))
  const sun=new T.DirectionalLight(0xd9efff,2.4);sun.position.set(-3,4,5);scene.add(sun)
  const rim=new T.DirectionalLight(0x236a99,1.2);rim.position.set(3,-1,-2);scene.add(rim)
  const camera=new T.PerspectiveCamera(40,1,.01,30);camera.position.z=3.25
  const geometries:T.BufferGeometry[]=[],materials:T.Material[]=[],textures:T.Texture[]=[]
  function trackG<G extends T.BufferGeometry>(g:G){geometries.push(g);return g}
  function trackM<M extends T.Material>(m:M){materials.push(m);return m}
  const map=document.createElement('canvas');map.width=2048;map.height=1024
  const ctx=map.getContext('2d')!
  ctx.fillStyle='#082239';ctx.fillRect(0,0,map.width,map.height)
  function path(poly:number[][][],offset:number){
    ctx.beginPath()
    for(const ring of poly){
      let last=ring[0][0]
      ring.forEach(([lon,lat],i)=>{
        while(lon-last>180)lon-=360
        while(lon-last< -180)lon+=360
        last=lon
        const x=((lon+90)/360+offset)*map.width,y=(90-lat)/180*map.height
        if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)
      });ctx.closePath()
    }
  }
  ctx.fillStyle='#31657c';ctx.strokeStyle='#6396a8';ctx.lineWidth=.6
  for(const poly of data.land)for(const offset of [-1,0,1]){path(poly,offset);ctx.fill('evenodd');ctx.stroke()}
  const texture=new T.CanvasTexture(map);texture.colorSpace=T.SRGBColorSpace;textures.push(texture)
  const relief=document.createElement('canvas');relief.width=2048;relief.height=1024
  const rctx=relief.getContext('2d')!;rctx.drawImage(map,0,0)
  const pixels=rctx.getImageData(0,0,2048,1024)
  for(let i=0;i<pixels.data.length;i+=4){const value=pixels.data[i]>30?180:0;pixels.data[i]=value;pixels.data[i+1]=value;pixels.data[i+2]=value}
  rctx.putImageData(pixels,0,0)
  const displacement=new T.CanvasTexture(relief);textures.push(displacement)
  const globe=new T.Mesh(trackG(new T.SphereGeometry(1,160,96)),trackM(new T.MeshStandardMaterial({map:texture,displacementMap:displacement,displacementScale:.006,bumpMap:displacement,bumpScale:.008,roughness:.84,metalness:.12})))
  root.add(globe)
  const atmosphere=new T.Mesh(trackG(new T.SphereGeometry(1.024,64,48)),trackM(new T.ShaderMaterial({
    vertexShader:'varying vec3 n;varying vec3 p;void main(){n=normalize(normalMatrix*normal);vec4 v=modelViewMatrix*vec4(position,1.);p=v.xyz;gl_Position=projectionMatrix*v;}',
    fragmentShader:'varying vec3 n;varying vec3 p;void main(){float a=pow(1.-abs(dot(normalize(n),normalize(-p))),3.5);gl_FragColor=vec4(.22,.52,.68,a*.36);}',
    side:T.BackSide,transparent:true,depthWrite:false,blending:T.AdditiveBlending,
  })))
  root.add(atmosphere)
  const gridPoints:number[]=[]
  for(let lat=-60;lat<=60;lat+=30)for(let lon=-180;lon<180;lon+=3){gridPoints.push(...earthPoint(lat,lon,1.009).toArray(),...earthPoint(lat,lon+3,1.009).toArray())}
  for(let lon=-180;lon<180;lon+=30)for(let lat=-90;lat<90;lat+=3){gridPoints.push(...earthPoint(lat,lon,1.009).toArray(),...earthPoint(lat+3,lon,1.009).toArray())}
  const grid=new T.LineSegments(trackG(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(gridPoints,3))),trackM(new T.LineBasicMaterial({color:0x79b0c8,transparent:true,opacity:.12})))
  root.add(grid)
  const outlinePoints:number[]=[]
  for(const poly of data.india)for(const ring of poly)for(let i=1;i<ring.length;i++)outlinePoints.push(...earthPoint(ring[i-1][1],ring[i-1][0],1.011).toArray(),...earthPoint(ring[i][1],ring[i][0],1.011).toArray())
  const indiaMaterial=trackM(new T.LineBasicMaterial({color:0xffa171,transparent:true,opacity:.35}))
  root.add(new T.LineSegments(trackG(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(outlinePoints,3))),indiaMaterial))
  const markerGeometry=trackG(new T.SphereGeometry(.008,12,8))
  const hubMaterial=trackM(new T.MeshBasicMaterial({color:0xff9969}))
  const hub=new T.Mesh(trackG(new T.SphereGeometry(.014,16,12)),hubMaterial);hub.position.copy(earthPoint(reachHub.lat,reachHub.lon,1.018));root.add(hub)
  const halo=new T.Mesh(trackG(new T.RingGeometry(.023,.027,40)),trackM(new T.MeshBasicMaterial({color:0xffa173,side:T.DoubleSide,transparent:true,opacity:.8})))
  halo.position.copy(earthPoint(reachHub.lat,reachHub.lon,1.018));halo.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),halo.position.clone().normalize());root.add(halo)
  function makeRoute(destination:{id:string;lat:number;lon:number},height:number){
    const a=earthPoint(reachHub.lat,reachHub.lon),b=earthPoint(destination.lat,destination.lon),angle=a.angleTo(b)
    const points=Array.from({length:81},(_,i)=>{
      const t=i/80
      return a.clone().multiplyScalar(Math.sin((1-t)*angle)/Math.sin(angle)).add(b.clone().multiplyScalar(Math.sin(t*angle)/Math.sin(angle))).normalize().multiplyScalar(1.016+Math.sin(t*Math.PI)*height)
    })
    const geometry=trackG(new T.BufferGeometry().setFromPoints(points))
    const material=trackM(new T.LineBasicMaterial({color:0xff8858,transparent:true,opacity:.6}))
    const line=new T.Line(geometry,material);line.userData.destination=destination.id;root.add(line)
    const marker=new T.Mesh(markerGeometry,trackM(new T.MeshBasicMaterial({color:0xff9969})))
    marker.position.copy(earthPoint(destination.lat,destination.lon,1.018));root.add(marker)
    const traveller=new T.Mesh(trackG(new T.SphereGeometry(.004,8,6)),trackM(new T.MeshBasicMaterial({color:0xffdfbb})))
    traveller.visible=false;root.add(traveller)
    return {id:destination.id,points,geometry,material,line,marker,traveller}
  }
  const domestic=reachStates.map(s=>makeRoute(s,.035+earthPoint(s.lat,s.lon).angleTo(earthPoint(reachHub.lat,reachHub.lon))*.16))
  const international=reachExports.map(s=>makeRoute(s,s.id==='uganda'?.22:.055))
  const base=new T.Quaternion().setFromEuler(new T.Euler(22*rad,-80*rad,0))
  const worldBase=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),23.4*rad).multiply(base)
  const axis=new T.Vector3(0,1,0)
  let state={...initial},visible=true,disposed=false,lost=false,frame=0,last=performance.now(),angle=0,focus=initial.view==='world'?0:1
  let transitionStart=performance.now()-1100,transitionFrom=focus,targetFocus=focus,routeStart=performance.now()-5000
  let startQ=worldBase.clone(),targetQ=base.clone(),worldQ=worldBase.clone(),hoverIndia=false
  let hoverTimer:ReturnType<typeof setTimeout>|undefined
  let pitch=0
  let drag:{id:number;x:number;y:number;angle:number;pitch:number;moved:boolean}|undefined
  const horizontalAxis=new T.Vector3(1,0,0)
  function endDrag(){
    const id=drag?.id;drag=undefined;delete canvas.dataset.dragging
    if(id!==undefined&&canvas.hasPointerCapture(id))canvas.releasePointerCapture(id)
    canvas.style.cursor=state.view==='world'?'grab':'default'
  }
  root.quaternion.copy(initial.view==='world'?worldBase:base)
  const viewport=host.parentElement!
  const hubLabel=viewport.querySelector<HTMLElement>('.earth-hub-label')
  const selectedLabel=viewport.querySelector<HTMLElement>('.earth-selected-label')
  const pointButtons=new Map(Array.from(viewport.querySelectorAll<HTMLButtonElement>('[data-earth-point]')).map(button=>[button.dataset.earthPoint!,button]))
  function label(element:HTMLElement|null,position:T.Vector3){
    if(!element)return
    const world=root.localToWorld(position.clone()),normal=world.clone().normalize()
    const front=normal.dot(camera.position.clone().sub(world))>0
    const screen=world.clone().project(camera)
    const show=front && Math.abs(screen.x)<.88 && Math.abs(screen.y)<.9
    element.hidden=!show
    element.style.left=((screen.x+1)/2*host.clientWidth)+'px';element.style.top=((1-screen.y)/2*host.clientHeight)+'px'
  }
  function render(now:number){
    frame=0
    if(disposed||lost||!visible||document.hidden)return
    const dt=Math.min((now-last)/1000,.05);last=now
    const moving=state.reduced||state.paused?1:ease((now-transitionStart)/1100)
    focus=transitionFrom+(targetFocus-transitionFrom)*moving
    if(moving<1){root.quaternion.slerpQuaternions(startQ,targetQ,moving)}
    else if(state.view==='world'){
      if(!state.paused&&!state.reduced&&!state.interacting&&!drag)angle+=dt*Math.PI*2/180
      worldQ.setFromAxisAngle(horizontalAxis,pitch).multiply(worldBase).multiply(new T.Quaternion().setFromAxisAngle(axis,angle));root.quaternion.copy(worldQ)
    }else root.quaternion.copy(base)
    camera.position.z=3.25+(1.79-3.25)*focus;camera.lookAt(0,0,0)
    const chosen=state.preview||state.selected
    const elapsed=(now-routeStart)/1000
    domestic.forEach((route,i)=>{
      route.line.visible=route.marker.visible=focus>.5
      const reveal=state.paused||state.reduced?1:clamp((elapsed-i*.12)/.65)
      route.geometry.setDrawRange(0,Math.max(0,Math.floor(reveal*81)))
      route.marker.visible=route.line.visible&&reveal===1
      route.material.opacity=chosen?(chosen===route.id?1:.24):.65
      route.material.color.setHex(chosen===route.id?0xffcf9a:0xff8858)
      route.marker.scale.setScalar((1-focus*.42)*(chosen===route.id?1.5:1))
      route.traveller.visible=focus>.9&&reveal>0&&reveal<1
      route.traveller.position.copy(route.points[Math.floor(reveal*80)])
    })
    international.forEach(route=>{
      route.line.visible=route.marker.visible=focus<.25;route.geometry.setDrawRange(0,81)
      route.material.opacity=chosen?(chosen===route.id?1:.3):.65
      route.material.color.setHex(chosen===route.id?0xffcf9a:0xff8858)
      route.marker.scale.setScalar(chosen===route.id?1.35:1)
    })
    indiaMaterial.opacity=focus>.5?.7:hoverIndia?.8:.3
    hub.scale.setScalar(1-focus*.42);halo.scale.setScalar(1-focus*.4)
    root.updateMatrixWorld(true)
    label(hubLabel,hub.position)
    for(const route of [...domestic,...international]){
      const button=pointButtons.get(route.id)
      if(button){if(route.marker.visible)label(button,route.marker.position);else button.hidden=true}
    }
    const selected=(state.view==='india'?domestic:international).find(r=>r.id===chosen)
    if(selected && selected.marker.visible){
      label(selectedLabel,selected.marker.position)
      if(selectedLabel&&!selectedLabel.hidden&&hubLabel&&!hubLabel.hidden){
        const a=selectedLabel.getBoundingClientRect(),b=hubLabel.getBoundingClientRect()
        if(a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top)selectedLabel.style.top=(parseFloat(selectedLabel.style.top)-45)+'px'
      }
    }else if(selectedLabel)selectedLabel.hidden=true
    renderer.render(scene,camera)
    host.dataset.ready='yes';canvas.dataset.view=state.view;canvas.dataset.routes=String(domestic.filter(r=>r.line.visible).length);canvas.dataset.angle=angle.toFixed(5)
    canvas.dataset.focus=focus.toFixed(3)
    canvas.dataset.internationalRoutes=String(international.filter(r=>r.line.visible).length)
    const rotating=state.view==='world'&&!state.paused&&!state.reduced&&!state.interacting&&!drag
    if(rotating||moving<1||(state.view==='india'&&!state.paused&&!state.reduced&&elapsed<(domestic.length-1)*.12+.75))schedule()
  }
  function schedule(){if(!frame&&!disposed)frame=requestAnimationFrame(render)}
  function update(next:ReachState){
    const viewChanged=next.view!==state.view
    if(viewChanged){
      endDrag();clearTimeout(hoverTimer);hoverIndia=false
      transitionStart=performance.now();transitionFrom=focus;targetFocus=next.view==='world'?0:1
      startQ.copy(root.quaternion);targetQ.copy(next.view==='world'?worldQ:base)
      if(next.view==='india')routeStart=performance.now()+650
    }
    state={...next};schedule()
  }
  const ray=new T.Raycaster(),pointer=new T.Vector2()
  function hit(event:PointerEvent){
    const rect=canvas.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1)
    ray.setFromCamera(pointer,camera)
    const result=ray.intersectObject(globe)[0]
    if(!result)return null
    const local=root.worldToLocal(result.point.clone()).normalize()
    return {lat:Math.asin(local.y)/rad,lon:Math.atan2(local.x,local.z)/rad}
  }
  function stateHit(event:PointerEvent){
    let nearest:string|null=null,best=event.pointerType==='touch'?25:17
    const rect=canvas.getBoundingClientRect()
    ;(state.view==='india'?domestic:international).forEach(route=>{
      if(!route.marker.visible)return
      const world=root.localToWorld(route.marker.position.clone())
      if(world.clone().normalize().dot(camera.position.clone().sub(world))<=0)return
      const point=world.project(camera)
      const distance=Math.hypot((point.x+1)/2*rect.width-(event.clientX-rect.left),(1-point.y)/2*rect.height-(event.clientY-rect.top))
      if(distance<best){best=distance;nearest=route.id}
    });return nearest
  }
  function move(event:PointerEvent){
    if(event.pointerType!=='mouse')return
    if(drag&&event.pointerId===drag.id){
      const dx=event.clientX-drag.x,dy=event.clientY-drag.y
      if(!drag.moved&&Math.hypot(dx,dy)<5)return
      drag.moved=true;canvas.dataset.dragging='yes';canvas.style.cursor='grabbing'
      angle=drag.angle+dx/canvas.clientWidth*Math.PI*1.3
      pitch=Math.max(-Math.PI/3,Math.min(Math.PI/3,drag.pitch+dy/canvas.clientHeight*Math.PI*.7))
      schedule();return
    }
    if(state.view==='india'){
      const id=stateHit(event);callbacks.hover(id);canvas.style.cursor=id?'pointer':'default';return
    }
    const id=stateHit(event);callbacks.hover(id)
    const point=hit(event),inside=!id&&!!point&&inIndia(data,point.lat,point.lon)
    if(inside&&!hoverIndia){hoverTimer=setTimeout(()=>{callbacks.india(false)},180)}
    if(!inside){clearTimeout(hoverTimer)}
    hoverIndia=inside;canvas.style.cursor=inside||id?'pointer':'grab';schedule()
  }
  function leave(){if(drag)return;clearTimeout(hoverTimer);hoverIndia=false;callbacks.hover(null);schedule()}
  function down(event:PointerEvent){
    if(event.pointerType!=='mouse'||event.button!==0||state.view!=='world'||focus>.02||!hit(event))return
    clearTimeout(hoverTimer);hoverIndia=false
    drag={id:event.pointerId,x:event.clientX,y:event.clientY,angle,pitch,moved:false}
    canvas.setPointerCapture(event.pointerId)
    event.preventDefault()
  }
  function click(event:PointerEvent){
    if(event.button!==0)return
    if(drag){
      const moved=drag.moved;endDrag()
      if(moved){clearTimeout(hoverTimer);hoverIndia=false;schedule();return}
    }
    if(state.view==='india'){const id=stateHit(event);if(id)callbacks.select(id);else callbacks.india(true)}
    else {const id=stateHit(event);if(id)callbacks.select(id);else {const point=hit(event);if(point&&inIndia(data,point.lat,point.lon))callbacks.india(true)}}
  }
  function resize(){const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();schedule()}
  function contextLost(event:Event){event.preventDefault();endDrag();lost=true;delete host.dataset.ready;if(hubLabel)hubLabel.hidden=true;if(selectedLabel)selectedLabel.hidden=true;pointButtons.forEach(button=>{button.hidden=true})}
  function restored(){lost=false;schedule()}
  function visibility(){last=performance.now();schedule()}
  const resizeObserver=new ResizeObserver(resize),intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;last=performance.now();if(visible)schedule()})
  host.append(canvas);resizeObserver.observe(host);intersection.observe(host)
  canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerleave',leave);canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointerup',click)
  canvas.addEventListener('pointercancel',endDrag);canvas.addEventListener('lostpointercapture',endDrag)
  canvas.addEventListener('webglcontextlost',contextLost);canvas.addEventListener('webglcontextrestored',restored);document.addEventListener('visibilitychange',visibility)
  resize()
  return {update,dispose(){
    disposed=true;endDrag();cancelAnimationFrame(frame);clearTimeout(hoverTimer);resizeObserver.disconnect();intersection.disconnect()
    canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerleave',leave);canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointerup',click)
    canvas.removeEventListener('pointercancel',endDrag);canvas.removeEventListener('lostpointercapture',endDrag)
    canvas.removeEventListener('webglcontextlost',contextLost);canvas.removeEventListener('webglcontextrestored',restored);document.removeEventListener('visibilitychange',visibility)
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer.dispose();canvas.remove();delete host.dataset.ready
  }}
}
