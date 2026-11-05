'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { reachStates, reachEvidence, type ReachState } from '@/content/reach'
import type { createEarthScene } from '@/lib/earth-scene'
import './reach.css'

export function ReachExplorer(){
  const host=useRef<HTMLDivElement>(null),controller=useRef<ReturnType<typeof createEarthScene>>(null)
  const explore=useRef<HTMLButtonElement>(null),locked=useRef(false),leaveTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined)
  const [view,setView]=useState<'world'|'india'>('world'),[selected,setSelected]=useState<string|null>(null),[preview,setPreview]=useState<string|null>(null)
  const [localPause,setLocalPause]=useState(false),[globalPause,setGlobalPause]=useState(false),[reduced,setReduced]=useState(false),[interacting,setInteracting]=useState(false)
  const state:ReachState=useMemo(()=>({view,selected,preview,paused:localPause||globalPause||reduced,reduced,interacting}),[view,selected,preview,localPause,globalPause,reduced,interacting])
  const latest=useRef(state);latest.current=state
  const active=reachStates.find(s=>s.id===(preview||selected))
  function india(persistent:boolean){if(persistent)locked.current=true;setView('india')}
  function select(id:string){locked.current=true;setView('india');setSelected(id);setPreview(null)}
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
      }catch{/* Static geography and the client list remain available. */}
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
      <span className="earth-selected-label" hidden aria-hidden="true">{active?.name}</span>
      <div className="earth-view-tag" aria-hidden="true"><span/>{view==='world'?'A WORLD OF CONNECTIONS':'INDIA · SELECTED CLIENT CONNECTIONS'}</div>
      <p className="earth-gesture">{view==='world'?'Click and drag to turn · hover over India to explore':'Select a state point to explore its connection'}</p>
    </div>
    <div className="earth-controls">
      {view==='world'?<button type="button" className="earth-explore" ref={explore} onClick={()=>india(true)}>Explore India connections <span aria-hidden="true">↗</span></button>:<button type="button" className="earth-explore" onClick={()=>{world();requestAnimationFrame(()=>explore.current?.focus())}}><span aria-hidden="true">←</span> Back to world</button>}
      <button type="button" className="earth-pause" aria-pressed={state.paused} disabled={globalPause||reduced} onClick={()=>setLocalPause(!localPause)}>{state.paused?'Resume rotation':'Pause rotation'}</button>
    </div>
    {(globalPause||reduced)&&<p className="earth-motion-note">Motion is paused by your device or saved preference.</p>}
    <div className="earth-information">
      <div className="earth-info-top"><span>SELECTED CLIENT CONNECTIONS</span><b>14 destination states</b></div>
      <label className="earth-state-label" htmlFor="reach-state">Explore a state</label>
      <select id="reach-state" value={selected||''} onChange={event=>{if(event.target.value)select(event.target.value);else {setSelected(null);setPreview(null)}}}><option value="">Choose a destination state</option>{reachStates.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>
      <div className="earth-state-info">
        {active?<><h3>{active.name}</h3><p><strong>{active.client}</strong></p><p>{active.organisation}</p><a href={active.source} target="_blank" rel="noopener noreferrer">Organisation’s state reference <span aria-hidden="true">↗</span></a></>:<><h3>From Dankuni, West Bengal</h3><p>{view==='world'?'Hover over India or choose a state to explore the connections.':'Follow the arcs from West Bengal. Select a point or choose a state for its published client.'}</p></>}
      </div>
      <p className="earth-selection-status" role="status">{selected?`Selected connection: West Bengal to ${reachStates.find(s=>s.id===selected)?.name}.`:''}</p>
      <p className="earth-source-note">Based on PCI’s published client organisations. State markers and connections are representative.</p>
      <details className="earth-client-list"><summary>View all 14 client-linked states</summary><ul>{reachStates.map(s=><li key={s.id}><strong>{s.name}</strong><span>{s.client}</span></li>)}</ul><a href={reachEvidence.clientSource} target="_blank" rel="noopener noreferrer">PCI’s published client list ↗</a></details>
    </div>
    <noscript><style>{'.earth-controls,.earth-state-label,#reach-state{display:none}'}</style><p className="earth-noscript">The globe is shown as a still image. Expand the state list above to read PCI’s selected client connections.</p></noscript>
  </div>
}
