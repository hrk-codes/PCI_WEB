'use client'

import { useLayoutEffect, useRef, type CSSProperties } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { CableScene } from '@/components/cable-scene'
import { aboutTimeline, chapterAt } from '@/lib/about-timeline'
import './about-cable.css'

/** Layers called out during the anatomy beat; anchor names match lib/cable-scene.ts. */
const anatomy = [
  {anchor:'conductor', name:'Stranded aluminium', note:'Compact conductor strands'},
  {anchor:'insulation', name:'XLPE insulation', note:'Colour-coded cores'},
  {anchor:'bedding', name:'Inner bedding', note:'Seats the armour evenly'},
  {anchor:'armour', name:'Steel wire armour', note:'Galvanised, mechanical shield'},
  {anchor:'sheath', name:'Outer sheath', note:'PVC / PE, weather-ready'},
]

const stats = [
  {label:'Products', value:14, count:true},
  {label:'Indian states', value:17, count:true},
  {label:'Export countries', value:7, count:true},
  {label:'Making cable since', value:2013, count:false},
]

const headline = ['Building', 'confidence', 'into every', 'connection.']

export function AboutCable() {
  const section = useRef<HTMLElement>(null)
  const finish = useRef<() => void>(() => {})
  useLayoutEffect(() => {
    const el = section.current!
    const header = document.querySelector<HTMLElement>('.site-head')
    const counters = [...el.querySelectorAll<HTMLElement>('[data-count-to]')]
    const reduced = matchMedia('(prefers-reduced-motion: reduce)')
    const large = matchMedia('(min-width: 821px) and (min-height: 701px)')
    let frame = 0, near = true, skipped = false, mode = '', headerHeight = 106
    const set = (name: string, value: number) => el.style.setProperty(name, value.toFixed(4))
    function draw(p: number) {
      const tl = aboutTimeline(p)
      set('--anatomy', tl.anatomy)
      set('--settle', tl.settle)
      set('--headline-in', tl.headlineIn)
      set('--headline', tl.headline)
      set('--story-copy', tl.copy)
      set('--stats', tl.stats)
      set('--story-progress', p)
      for (const counter of counters) {
        const value = String(Math.round(Number(counter.dataset.countTo) * tl.stats))
        if (counter.textContent !== value) counter.textContent = value
      }
      const chapter = chapterAt(p)
      if (el.dataset.chapter !== chapter) el.dataset.chapter = chapter
      const pose = p < .36 ? 'opening' : 'settled'
      if (el.dataset.cablePose !== pose) el.dataset.cablePose = pose
      el.dispatchEvent(new CustomEvent('pci-cable-progress', {detail:p}))
    }
    function drawFromScroll() {
      const rect = el.getBoundingClientRect()
      const travel = el.offsetHeight - (innerHeight - headerHeight)
      draw(Math.max(0, Math.min(1, (headerHeight - rect.top) / Math.max(1, travel))))
    }
    function update() {
      frame = 0
      if (near && mode === 'cinematic') drawFromScroll()
    }
    function schedule() { if (!frame && near) frame = requestAnimationFrame(update) }
    function configure() {
      const wasPinned = mode === 'cinematic'
      const rect = el.getBoundingClientRect()
      headerHeight = header?.getBoundingClientRect().height || 106
      el.style.setProperty('--story-header', `${headerHeight}px`)
      mode = reduced.matches || document.documentElement.dataset.pciMotion === 'paused' || skipped ? 'static' : large.matches ? 'cinematic' : 'flow'
      el.dataset.mode = mode
      if (wasPinned && mode !== 'cinematic' && rect.top < headerHeight && rect.bottom > headerHeight) {
        window.scrollTo({top:scrollY + rect.top - headerHeight, behavior:'instant'})
      }
      if (mode === 'cinematic') drawFromScroll()
      else draw(1)
    }
    finish.current = () => { if (!skipped) { skipped = true; configure() } }
    // Any keyboard focus inside the story (other than Skip) shows the finished composition.
    function onFocus(event: FocusEvent) {
      if (mode === 'cinematic' && !(event.target as HTMLElement).closest('.about-skip')) finish.current()
    }
    const intersection = new IntersectionObserver(entries => {
      near = entries[0].isIntersecting
      if (near) { el.dataset.entered = 'yes'; schedule() }
    }, {rootMargin:'100px'})
    const preference = new MutationObserver(configure)
    preference.observe(document.documentElement, {attributes:true, attributeFilter:['data-pci-motion']})
    const resize = new ResizeObserver(configure)
    if (header) resize.observe(header)
    configure()
    intersection.observe(el)
    el.addEventListener('focusin', onFocus)
    window.addEventListener('scroll', schedule, {passive:true})
    window.addEventListener('resize', configure)
    reduced.addEventListener('change', configure)
    large.addEventListener('change', configure)
    return () => {
      cancelAnimationFrame(frame); intersection.disconnect(); preference.disconnect(); resize.disconnect()
      el.removeEventListener('focusin', onFocus)
      window.removeEventListener('scroll', schedule); window.removeEventListener('resize', configure)
      reduced.removeEventListener('change', configure); large.removeEventListener('change', configure)
    }
  }, [])
  return <section ref={section} className="about-cable" aria-labelledby="about-pci-title">
    <div className="about-stage">
      <div className="about-marquee" aria-hidden="true"><span data-words="CABLES · CONDUCTORS · EARTH WIRE · CABLES · CONDUCTORS · EARTH WIRE ·"/></div>
      <div className="wrap about-topline"><div className="kicker"><span aria-hidden="true"/> About PCI Cables</div><a className="about-skip" href="#about-pci-title" onClick={event => { event.preventDefault(); finish.current(); document.getElementById('about-pci-title')?.focus({preventScroll:true}) }}>Skip animation <span aria-hidden="true">↘</span></a></div>
      <div className="wrap about-composition">
        <div className="about-art">
          <div className="about-visual" aria-hidden="true">
            <div className="conductor-halo"/>
            <div className="conductor-grid"/>
            <div className="conductor-main">
              <Image className="cable-fallback cable-fallback-opening" src="/media/about-cable-opening.webp" width={1280} height={800} alt="" sizes="(max-width: 820px) 100vw, 70vw" />
              <Image className="cable-fallback cable-fallback-settled" src="/media/about-cable-settled.webp" width={1280} height={800} alt="" sizes="(max-width: 820px) 100vw, 70vw" />
              <CableScene />
            </div>
            <div className="conductor-floor"/>
          </div>
          <svg className="anatomy-leaders" aria-hidden="true" focusable="false">
            {anatomy.map(layer => <g key={layer.anchor}><path data-anchor-line={layer.anchor}/><circle data-anchor-dot={layer.anchor} r="3.5"/></g>)}
          </svg>
          <ol className="anatomy" aria-label="Inside a four-core armoured cable">
            {anatomy.map((layer, k) => <li key={layer.anchor} data-anchor={layer.anchor} style={{'--k':k} as CSSProperties}><b>{layer.name}</b><span>{layer.note}</span></li>)}
          </ol>
        </div>
        <div className="about-copy">
          <p className="about-eyebrow" aria-hidden="true"><span/>Engineered for connection</p>
          <h2 id="about-pci-title" tabIndex={-1}>{headline.map((word, i) => <span key={word} className="hw" style={{'--i':i} as CSSProperties}>{word}{i < headline.length - 1 ? ' ' : ''}</span>)}</h2>
          <div className="about-description"><p className="lead">Cable and conductor manufacturing for the networks that move power forward.</p><p>From our works in Dankuni, PCI manufactures cables, overhead conductors and earth wire for utilities, infrastructure projects and industrial customers.</p><Link className="text-link" href="/about-us/">Our story <span aria-hidden="true">↗</span></Link></div>
        </div>
      </div>
      <div className="wrap about-baseline">
        <div className="about-chapters" aria-hidden="true"><span data-tick="anatomy">01 Anatomy</span><span data-tick="range">02 Range</span><span data-tick="reach">03 Reach</span><div className="about-progress"><span/></div></div>
        <dl className="about-stats">
          {stats.map(stat => <div key={stat.label}><dt>{stat.label}</dt><dd>{stat.count ? <><span className="about-sr">{stat.value}</span><span aria-hidden="true" data-count-to={stat.value}>{stat.value}</span></> : stat.value}</dd></div>)}
        </dl>
      </div>
    </div>
  </section>
}
