'use client'

import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import Image from 'next/image'
import { reachHub, reachStates, reachExports, type ReachState } from '@/content/reach'
import type { createEarthScene } from '@/lib/earth-scene'
import './reach.css'

type DirectoryPoint = { id:string; name:string; client:string }
const byName = (a: DirectoryPoint, b: DirectoryPoint) => a.name.localeCompare(b.name, 'en')
const groups: { label:string; points:DirectoryPoint[] }[] = [
  { label:'India', points:[reachHub, ...reachStates].sort(byName) },
  { label:'International', points:[...reachExports].sort(byName) },
]
const locations = groups.flatMap(group => group.points)
const countries = new Map(reachExports.map(point => [point.id, point]))
const idleRotationDelay = 4000

export function ReachExplorer(){
  const host = useRef<HTMLDivElement>(null)
  const controller = useRef<ReturnType<typeof createEarthScene>>(null)
  const explore = useRef<HTMLButtonElement>(null)
  const directory = useRef<HTMLDivElement>(null)
  const rows = useRef(new Map<string, HTMLButtonElement>())
  const locked = useRef(false)
  const pointerInside = useRef(false)
  const focusInside = useRef(false)
  const idleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [view, setView] = useState<ReachState['view']>('world')
  const [selected, setSelected] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [directoryFocus, setDirectoryFocus] = useState(locations[0].id)
  const [localPause, setLocalPause] = useState(false)
  const [globalPause, setGlobalPause] = useState(false)
  const [reduced, setReduced] = useState(false)
  const [interacting, setInteracting] = useState(false)
  const [interactive, setInteractive] = useState(false)
  const state: ReachState = { view, selected, preview, paused:localPause || globalPause || reduced, reduced, interacting }
  const latest = useRef(state)
  latest.current = state
  const activeId = preview ?? selected
  const active = locations.find(point => point.id === activeId)
  const activeCountry = activeId ? countries.get(activeId) : undefined

  function india(persistent: boolean) {
    if (persistent) locked.current = true
    setView('india')
    setSelected(id => id && !countries.has(id) ? id : null)
    setPreview(null)
  }
  function select(id: string) {
    locked.current = true
    setView(countries.has(id) ? 'world' : 'india')
    setSelected(id)
    setPreview(null)
  }
  function world() {
    locked.current = false
    setView('world')
    setSelected(null)
    setPreview(null)
  }
  function syncInteraction(pointerActive = pointerInside.current) {
    clearTimeout(idleTimer.current)
    setInteracting(pointerActive || focusInside.current)
    // A keyboard user may still be reading a focused marker or connection.
    if (focusInside.current) return
    idleTimer.current = setTimeout(() => {
      setInteracting(false)
      if (pointerActive && latest.current.paused) return
      if (locked.current) setPreview(null)
      else world()
    }, pointerActive ? idleRotationDelay : 500)
  }
  function navigateDirectory(event: KeyboardEvent<HTMLDivElement>) {
    const target = event.target
    if (!(target instanceof HTMLButtonElement)) return
    const index = locations.findIndex(point => point.id === target.dataset.connectionId)
    if (index < 0) return
    let next: number
    switch (event.key) {
      case 'ArrowDown': next = Math.min(index + 1, locations.length - 1); break
      case 'ArrowUp': next = Math.max(index - 1, 0); break
      case 'Home': next = 0; break
      case 'End': next = locations.length - 1; break
      default: return
    }
    event.preventDefault()
    rows.current.get(locations[next].id)?.focus({ preventScroll:true })
  }
  useEffect(()=>{
    setInteractive(true)
    const media=matchMedia('(prefers-reduced-motion: reduce)')
    const sync=()=>{setReduced(media.matches);setGlobalPause(document.documentElement.dataset.pciMotion==='paused')}
    const observer=new MutationObserver(sync)
    observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-pci-motion']})
    media.addEventListener('change',sync);sync()
    return()=>{observer.disconnect();media.removeEventListener('change',sync)}
  },[])
  useEffect(() => { controller.current?.update(latest.current) }, [view, selected, preview, localPause, globalPause, reduced, interacting])
  useEffect(() => {
    const list = directory.current
    const row = activeId ? rows.current.get(activeId) : undefined
    if (!list || !row) return
    list.scrollTo({ top:list.scrollTop, behavior:'instant' })
    const bounds = list.getBoundingClientRect()
    const item = row.getBoundingClientRect()
    const headingHeight = list.querySelector('h4')?.offsetHeight ?? 0
    if (item.top >= bounds.top + headingHeight + 4 && item.bottom <= bounds.bottom - 4) return
    // Scroll only the panel, even when the directory sits below the map on a phone.
    const top = list.scrollTop + item.top - bounds.top - (list.clientHeight - item.height) / 2
    list.scrollTo({ top, behavior:reduced || globalPause || row === document.activeElement ? 'instant' : 'smooth' })
  }, [activeId, reduced, globalPause])
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
    return()=>{stopped=true;observer.disconnect();clearTimeout(idleTimer.current);controller.current?.dispose();controller.current=null}
  },[])
  return <div className="earth-explorer" data-view={view} data-motion={globalPause || reduced ? 'paused' : undefined}
    onPointerEnter={event => { if (event.pointerType === 'mouse') { pointerInside.current = true; syncInteraction() } }}
    onPointerLeave={event => { if (event.pointerType === 'mouse') { pointerInside.current = false; syncInteraction() } }}
    onPointerMoveCapture={event => { if (event.pointerType === 'mouse') syncInteraction(true) }}
    onPointerDownCapture={() => { focusInside.current = false; syncInteraction(true) }}
    onPointerUpCapture={() => syncInteraction(true)}
    onPointerCancelCapture={() => syncInteraction()}
    onWheelCapture={() => syncInteraction(true)}
    onKeyDownCapture={() => { focusInside.current = true; syncInteraction() }}
    onFocusCapture={event => { focusInside.current = event.target.matches(':focus-visible'); syncInteraction() }}
    onBlurCapture={event => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
        focusInside.current = false
        syncInteraction()
      }
    }}>
    <div className="earth-viewport" role="group" aria-label="Interactive globe showing PCI’s selected client connections">
      <div className="earth-orbit" aria-hidden="true"/>
      <div className="earth-static"><Image src="/media/reach-world.webp" width={960} height={960} alt="Earth centred on India, with PCI’s manufacturing hub in West Bengal" sizes="(max-width: 820px) 95vw, 56vw"/></div>
      <div className="earth-canvas" ref={host} aria-hidden="true"/>
      <span className="earth-hub-label" hidden aria-hidden="true"><b>WEST BENGAL</b><small>Dankuni · PCI works</small></span>
      <span className="earth-selected-label" hidden aria-hidden="true">{activeCountry?.image && <Image className="earth-client-logo" src={activeCountry.image} width={45} height={30} alt=""/>}<span><b>{active?.name}</b><small>{active?.client}</small></span></span>
      {locations.map(point=><button key={point.id} hidden data-earth-point={point.id} className="earth-map-point" type="button" aria-label={`${point.name}: ${point.client}`} aria-pressed={selected===point.id} onFocus={()=>setPreview(point.id)} onBlur={()=>setPreview(null)} onClick={()=>select(point.id)}><span>{point.name}</span></button>)}
      <div className="earth-view-tag" aria-hidden="true"><span/>{view==='world'?'A WORLD OF CONNECTIONS':'INDIA · SELECTED CLIENT CONNECTIONS'}</div>
      <p className="earth-gesture">{view==='world'?'Drag to turn · choose a pin or destination':'Choose a pin to explore its connection'}</p>
    </div>
    <div className="earth-controls">
      {view==='world'?<button type="button" className="earth-explore" ref={explore} onClick={()=>india(true)}>Explore India connections <span aria-hidden="true">↗</span></button>:<button type="button" className="earth-explore" onClick={()=>{world();requestAnimationFrame(()=>explore.current?.focus({preventScroll:true}))}}><span aria-hidden="true">←</span> Back to world</button>}
      <button type="button" className="earth-pause" aria-pressed={state.paused} disabled={globalPause||reduced} onClick={()=>setLocalPause(!localPause)}>{state.paused?'Resume rotation':'Pause rotation'}</button>
    </div>
    {(globalPause||reduced)&&<p className="earth-motion-note">Motion is paused by your device or saved preference.</p>}
    <section className="earth-directory" aria-labelledby="earth-directory-title">
      <header>
        <h3 id="earth-directory-title">Client connections</h3>
        {selected && <button type="button" onClick={() => {
          if (view === 'world') locked.current = false
          setSelected(null)
          setPreview(null)
          directory.current?.focus({ preventScroll:true })
        }}>Clear<span className="earth-sr-only"> selected connection</span></button>}
      </header>
      <div className="earth-directory-list" ref={directory} tabIndex={interactive ? -1 : 0} onKeyDown={navigateDirectory}>
        {groups.map(group => <div key={group.label} className="earth-directory-group">
          <h4>{group.label}<span>{group.points.length}</span></h4>
          <ul role="list">
            {group.points.map(point => <li key={point.id}>
              <button type="button" ref={element => {
                if (element) rows.current.set(point.id, element)
                else rows.current.delete(point.id)
              }} data-connection-id={point.id} data-active={activeId === point.id ? 'yes' : undefined}
                disabled={!interactive} tabIndex={(activeId ?? directoryFocus) === point.id ? 0 : -1}
                aria-pressed={selected === point.id}
                onFocus={() => { setDirectoryFocus(point.id); setPreview(point.id) }}
                onBlur={() => setPreview(null)} onClick={() => select(point.id)}>
                <span className="earth-directory-dot" aria-hidden="true"/>
                <span><strong>{point.name}</strong><small>{point.client}</small></span>
              </button>
            </li>)}
          </ul>
        </div>)}
      </div>
      <p>Lines link destinations to PCI’s works in Dankuni.</p>
    </section>
    <p className="earth-sr-only" role="status">{selected ? (selected === reachHub.id ? 'Selected PCI works in Dankuni, West Bengal.' : `Selected connection from West Bengal to ${locations.find(point => point.id === selected)?.name}.`) : ''}</p>
    <noscript><style>{'.earth-controls,.earth-gesture{display:none}'}</style></noscript>
  </div>
}
