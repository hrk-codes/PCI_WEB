'use client'

import { useLayoutEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { CableScene } from '@/components/cable-scene'
import './about-cable.css'

const clamp = (n: number) => Math.max(0, Math.min(1, n))
const phase = (p: number, start: number, end: number) => {
  const t = clamp((p - start) / (end - start))
  return t * t * (3 - 2 * t)
}

/** Reference-inspired cable artwork; illustrative rather than a technical specification. */
function CableArtwork() {
  return <div className="conductor-study" aria-hidden="true">
    <div className="conductor-halo"/>
    <div className="conductor-blueprint"><span className="blueprint-label label-aluminium">ALUMINIUM<br/><b>Stranded conductor</b></span><span className="blueprint-label label-earth">EARTH WIRE<br/><b>Galvanised steel</b></span></div>
    <div className="conductor-caption"><span/> ENGINEERED FOR CONNECTION</div>
    <div className="conductor-main">
      <Image className="cable-fallback cable-fallback-opening" src="/media/about-cable-opening.webp" width={848} height={800} alt="" sizes="(max-width: 820px) 94vw, 52vw" />
      <Image className="cable-fallback cable-fallback-settled" src="/media/about-cable-settled.webp" width={848} height={800} alt="" sizes="(max-width: 820px) 94vw, 52vw" />
      <CableScene />
    </div>
    <div className="conductor-floor"/>
    <div className="conductor-references"><div className="satellite-one"><Image src="/media/story-aac-conductor.webp" width={570} height={300} alt="" sizes="(max-width:820px) 28vw, 16vw"/><span><b>01</b> AAC</span></div><div className="satellite-two"><Image src="/media/story-acsr-conductor.webp" width={570} height={300} alt="" sizes="(max-width:820px) 28vw, 16vw"/><span><b>02</b> ACSR</span></div><div className="reference-last"><Image src="/media/story-eco-conductor.webp" width={570} height={300} alt="" sizes="(max-width:820px) 28vw, 16vw"/><span><b>03</b> ECO Panther</span></div></div>
  </div>
}

export function AboutCable() {
  const section = useRef<HTMLElement>(null)
  const finish = useRef<() => void>(() => {})
  useLayoutEffect(() => {
    const el = section.current!
    const header = document.querySelector<HTMLElement>('.site-head')
    const reduced = matchMedia('(prefers-reduced-motion: reduce)')
    const large = matchMedia('(min-width: 821px) and (min-height: 701px)')
    let frame = 0, near = true, skipped = false, mode = '', headerHeight = 106
    const set = (name: string, value: number) => el.style.setProperty(name, String(value))
    function draw(p: number) {
      set('--cable-open', phase(p,0,.15))
      set('--companion-one', phase(p,.5,.68))
      set('--companion-two', phase(p,.57,.75))
      set('--cable-settle', phase(p,.12,.52))
      set('--story-line-1', phase(p,.52,.64))
      set('--story-line-2', phase(p,.60,.72))
      set('--story-line-3', phase(p,.68,.8))
      set('--story-copy', phase(p,.78,.88))
      set('--story-progress',p)
      const pose = p < .33 ? 'opening' : 'settled'
      if (el.dataset.cablePose !== pose) el.dataset.cablePose = pose
      el.dispatchEvent(new CustomEvent('pci-cable-progress',{detail:p}))
    }
    function drawFromScroll() {
      const rect = el.getBoundingClientRect()
      const travel = el.offsetHeight - (innerHeight - headerHeight)
      draw(clamp((headerHeight - rect.top) / Math.max(1,travel)))
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
        window.scrollTo({top:scrollY + rect.top - headerHeight,behavior:'instant'})
      }
      if (mode === 'cinematic') drawFromScroll()
      else draw(1)
    }
    finish.current = () => { skipped = true; configure() }
    const intersection = new IntersectionObserver(entries => {
      near = entries[0].isIntersecting
      if (near) { el.dataset.entered = 'yes'; schedule() }
    }, {rootMargin:'100px'})
    const preference = new MutationObserver(configure)
    preference.observe(document.documentElement,{attributes:true,attributeFilter:['data-pci-motion']})
    const resize = new ResizeObserver(configure)
    if (header) resize.observe(header)
    configure()
    intersection.observe(el)
    window.addEventListener('scroll',schedule,{passive:true})
    window.addEventListener('resize',configure)
    reduced.addEventListener('change',configure)
    large.addEventListener('change',configure)
    return () => {
      cancelAnimationFrame(frame); intersection.disconnect(); preference.disconnect(); resize.disconnect()
      window.removeEventListener('scroll',schedule); window.removeEventListener('resize',configure)
      reduced.removeEventListener('change',configure); large.removeEventListener('change',configure)
    }
  },[])
  return <section ref={section} className="about-cable" aria-labelledby="about-pci-title">
    <div className="about-stage">
      <div className="wrap about-topline"><div className="kicker"><span aria-hidden="true"/> About PCI Cables</div><a className="about-skip" href="#about-pci-title" onClick={event=>{event.preventDefault();finish.current();document.getElementById('about-pci-title')?.focus({preventScroll:true})}}>Skip animation <span aria-hidden="true">↘</span></a></div>
      <div className="wrap about-composition">
        <div className="about-art"><CableArtwork/><div className="about-art-note" aria-hidden="true"><span>CRAFTED TO CARRY POSSIBILITY.</span><span>PCI CABLES / INDIA</span></div></div>
        <div className="about-copy">
          <h2 id="about-pci-title" tabIndex={-1}><span className="story-line line-one">Building confidence</span>{' '}<span className="story-line line-two">into every</span>{' '}<span className="story-line line-three">connection.</span></h2>
          <div className="about-description"><p className="lead">Cable and conductor manufacturing for the networks that move power forward.</p><p>From our works in Dankuni, PCI manufactures cables, overhead conductors and earth wire for utilities, infrastructure projects and industrial customers.</p><Link className="text-link" href="/about-us/" onFocus={()=>finish.current()}>Our story <span aria-hidden="true">↗</span></Link></div>
        </div>
      </div>
      <div className="wrap about-baseline" aria-hidden="true"><span>SCROLL TO EXPLORE</span><div className="about-progress"><span/></div><span>MADE IN DANKUNI. CONNECTING BEYOND.</span></div>
    </div>
  </section>
}
