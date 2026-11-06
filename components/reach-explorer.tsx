'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { reachStates, reachExports, type ReachState } from '@/content/reach'
import type { createEarthScene } from '@/lib/earth-scene'
import './reach.css'

export function ReachExplorer(){
  const host=useRef<HTMLDivElement>(null),controller=useRef<ReturnType<typeof createEarthScene>>(null)
  const explore=useRef<HTMLButtonElement>(null),locked=useRef(false),leaveTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined)
  const [view,setView]=useState<'world'|'india'>('world'),[selected,setSelected]=useState<string|null>(null),[preview,setPreview]=useState<string|null>(null)
  const [localPause,setLocalPause]=useState(false),[globalPause,setGlobalPause]=useState(false),[reduced,setReduced]=useState(false),[interacting,setInteracting]=useState(false)
  const state:ReachState=useMemo(()=>({view,selected,preview,paused:localPause||globalPause||reduced,reduced,interacting}),[view,selected,preview,localPause,globalPause,reduced,interacting])
  const latest=useRef(state);latest.current=state
  const locations=[...reachStates,...reachExports]
  const active=locations.find(s=>s.id===(preview||selected))
  const activeCountry=reachExports.find(s=>s.id===(preview||selected))
  function india(persistent:boolean){if(persistent)locked.current=true;setView('india');setSelected(id=>reachExports.some(s=>s.id===id)?null:id);setPreview(null)}
  function select(id:string){locked.current=true;setView(reachStates.some(s=>s.id===id)?'india':'world');setSelected(id);setPreview(null)}
  function world(){clearTimeout(leaveTimer.current);locked.current=false;setView('world');setSelected(null);setPreview(null)}
  function enter(){clearTimeout(leaveTimer.current);setInteracting(true)}
  function leave(){
    setInteracting(false)
    leaveTimer.current=setTimeout(()=>{
      if(!locked.current){setView('world');setSelected(null);setPreview(null)}
    },500)
  }
  useEffect(()=>{
    const media=matchMedia('(prefers-reduced-motion: reduce)')
    const sync=()=>{setReduced(media.matches);setGlobalPause(document.documentElement.dataset.pciMotion==='paused')}
    const observer=new MutationObserver(sync)
    observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-pci-motion']})
    media.addEventListener('change',sync);sync()
    return()=>{observer.disconnect();media.removeEventListener('change',sync)}
  },[])
  useEffect(()=>{controller.current?.update(state)},[state])
  useEffect(()=>{
    let stopped=false
    const element=host.current!
    const observer=new IntersectionObserver(async entries=>{
      if(!entries.some(e=>e.isIntersecting))return
      observer.disconnect()
      try{
        const [module,response]=await Promise.all([import('@/lib/earth-scene'),fetch('/geography/earth.json')])
        if(!response.ok)throw new Error('Geographic data unavailable')
        const data=await response.json()
        if(!stopped)controller.current=module.createEarthScene(element,data,latest.current,{india,hover:setPreview,select})
      }catch{/* Static geography and descriptive fallback text remain available. */}
    },{rootMargin:'300px'})
    observer.observe(element)
    return()=>{stopped=true;observer.disconnect();clearTimeout(leaveTimer.current);controller.current?.dispose();controller.current=null}
  },[])
  return <div className="earth-explorer" data-view={view} onPointerEnter={enter} onPointerLeave={leave} onFocusCapture={enter} onBlurCapture={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node|null))leave()}}>
    <div className="earth-viewport" role="group" aria-label="Interactive globe showing PCI’s selected client connections">
      <div className="earth-orbit" aria-hidden="true"/>
      <div className="earth-static"><Image src="/media/reach-world.webp" width={960} height={960} alt="Earth centred on India, with PCI’s manufacturing hub in West Bengal" sizes="(max-width: 820px) 95vw, 56vw"/></div>
      <div className="earth-canvas" ref={host} aria-hidden="true"/>
      <span className="earth-hub-label" hidden aria-hidden="true"><b>WEST BENGAL</b><small>Dankuni · PCI works</small></span>
      <span className="earth-selected-label" hidden aria-hidden="true">{activeCountry&&<Image className="earth-client-logo" src={activeCountry.image} width={45} height={30} alt=""/>}<span><b>{active?.name}</b><small>{active?.client}</small></span></span>
      {locations.map(point=><button key={point.id} hidden data-earth-point={point.id} className="earth-map-point" type="button" aria-label={`${point.name}: ${point.client}`} aria-pressed={selected===point.id} onFocus={()=>setPreview(point.id)} onBlur={()=>setPreview(null)} onClick={()=>select(point.id)}><span>{point.name}</span></button>)}
      <div className="earth-view-tag" aria-hidden="true"><span/>{view==='world'?'A WORLD OF CONNECTIONS':'INDIA · SELECTED CLIENT CONNECTIONS'}</div>
      <p className="earth-gesture">{view==='world'?'Click and drag to turn · hover over India to explore':'Select a state point to explore its connection'}</p>
    </div>
    <div className="earth-controls">
      {view==='world'?<button type="button" className="earth-explore" ref={explore} onClick={()=>india(true)}>Explore India connections <span aria-hidden="true">↗</span></button>:<button type="button" className="earth-explore" onClick={()=>{world();requestAnimationFrame(()=>explore.current?.focus())}}><span aria-hidden="true">←</span> Back to world</button>}
      <button type="button" className="earth-pause" aria-pressed={state.paused} disabled={globalPause||reduced} onClick={()=>setLocalPause(!localPause)}>{state.paused?'Resume rotation':'Pause rotation'}</button>
    </div>
    {(globalPause||reduced)&&<p className="earth-motion-note">Motion is paused by your device or saved preference.</p>}
    <p className="earth-sr-only" role="status">{selected?`Selected connection: West Bengal to ${locations.find(s=>s.id===selected)?.name||''}.`:''}</p>
    <p className="earth-sr-only">Domestic client-linked states: {reachStates.map(s=>`${s.name}: ${s.client}`).join('; ')}. International client locations: {reachExports.map(s=>`${s.name}: ${s.client}`).join('; ')}.</p>
    <noscript><style>{'.earth-controls,.earth-gesture{display:none}'}</style><p className="earth-noscript">International client locations: {reachExports.map(s=>`${s.name}: ${s.client}`).join('; ')}. Indian client-linked states: {reachStates.map(s=>`${s.name}: ${s.client}`).join('; ')}.</p></noscript>
  </div>
}
