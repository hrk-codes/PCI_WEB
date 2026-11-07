'use client'

import { useEffect, useRef, useState } from 'react'
import type { CableLayout } from '@/lib/aluminium-cable-scene'
import './aluminium-cable-feature.css'

export type CableBranding = 'none' | 'overlay' | 'baked'

export function CableBrand({ visible = true }: { visible?: boolean }) {
  if (!visible) return null
  return <div className="pci-animation-brand"><div className="pci-animation-brand-inner"><div className="pci-animation-brand-name"><img src="/media/logo.webp" alt="PCI Cables Industries Pvt. Ltd."/></div><div className="pci-animation-brand-copy"><span>INSIDE EVERY CONNECTION</span><strong>Aluminum at the core.</strong><small>Illustrative cable construction</small></div></div></div>
}

/** Reusable website media. Branding can be HTML, baked into the export, or omitted. */
export function AluminiumCableFeature({ layout = 'landscape', branding = 'none', className = '', controls = false, interactive = false }: { layout?: CableLayout; branding?: CableBranding; className?: string; controls?: boolean; interactive?: boolean }) {
  const video = useRef<HTMLVideoElement>(null)
  const host = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [motionBlocked, setMotionBlocked] = useState(true)
  const [ready, setReady] = useState(false)
  const intendedPause = useRef(false)
  const requestedPlayback = useRef(false)
  const pointerFrame = useRef(0)
  const resetDepth = () => {
    cancelAnimationFrame(pointerFrame.current)
    const element = host.current
    if (!element) return
    for (const name of ['--cable-rx', '--cable-ry', '--cable-x', '--cable-y', '--cable-light-x']) element.style.removeProperty(name)
  }
  const variant = branding === 'baked' ? 'branded' : 'clean'
  const base = `/media/pci-reference-aluminum-${variant}`
  const poster = '/media/pci-reference-aluminum.webp'

  useEffect(() => {
    const element = video.current
    const container = host.current
    if (!element || !container) return
    setReady(true)
    const reduced = matchMedia('(prefers-reduced-motion: reduce)')
    let visible = false
    const update = () => {
      // The homepage film is foreground content, not background motion.
      // Reduced-motion visitors can still opt in by activating the film.
      const blocked = (reduced.matches && !requestedPlayback.current) || (!interactive && document.documentElement.dataset.pciMotion === 'paused')
      setMotionBlocked(blocked)
      if (visible && !blocked && !document.hidden && !intendedPause.current) element.play().catch(() => setPlaying(false))
      else element.pause()
    }
    const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; update() }, { threshold: 0.1 })
    const preference = new MutationObserver(update)
    preference.observe(document.documentElement, { attributes: true, attributeFilter: ['data-pci-motion'] })
    observer.observe(container)
    reduced.addEventListener('change', update)
    document.addEventListener('visibilitychange', update)
    update()
    return () => { observer.disconnect(); preference.disconnect(); reduced.removeEventListener('change', update); document.removeEventListener('visibilitychange', update); cancelAnimationFrame(pointerFrame.current); element.pause() }
  }, [layout, branding, failed, interactive])

  useEffect(() => { if (!playing || motionBlocked) resetDepth() }, [playing, motionBlocked])

  function togglePlayback() {
    const element = video.current
    if (!element) return
    if (motionBlocked) {
      requestedPlayback.current = true
      intendedPause.current = false
      setMotionBlocked(false)
      element.play().catch(() => setPlaying(false))
      return
    }
    intendedPause.current = !element.paused
    if (intendedPause.current) element.pause()
    else element.play().catch(() => setPlaying(false))
  }

  return <div ref={host} className={`pci-cable-feature pci-cable-${layout} ${interactive ? 'pci-cable-interactive' : ''} ${motionBlocked ? 'pci-cable-motion-blocked' : ''} ${className}`} aria-label="Cable structure with silver aluminium cores" onPointerLeave={resetDepth} onPointerMove={event => {
    if (!interactive || !playing || motionBlocked || event.pointerType !== 'mouse' || !matchMedia('(hover: hover) and (pointer: fine)').matches) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const x = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1))
    const y = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1))
    cancelAnimationFrame(pointerFrame.current)
    pointerFrame.current = requestAnimationFrame(() => {
      const style = host.current?.style
      style?.setProperty('--cable-rx', `${-y * 2}deg`)
      style?.setProperty('--cable-ry', `${x * 2}deg`)
      style?.setProperty('--cable-x', `${x * 4}px`)
      style?.setProperty('--cable-y', `${y * 4}px`)
      style?.setProperty('--cable-light-x', `${50 + x * 8}%`)
    })
  }}>
    <div className="pci-cable-surface">
    <img className="pci-cable-poster" src={poster} alt=""/>
    {!failed && <video key={base} ref={video} muted loop playsInline controls={interactive ? false : controls} preload="none" poster={poster} aria-label="Aluminum cable structure animation" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onError={() => setFailed(true)}><source src={`${base}.webm`} type="video/webm"/><source src={`${base}.mp4`} type="video/mp4"/></video>}
    {branding === 'overlay' && <CableBrand/>}
    </div>
    {interactive && ready && !failed && <button type="button" className="pci-cable-toggle" onClick={togglePlayback} aria-label={playing ? 'Pause cable animation' : 'Play cable animation'}><span aria-hidden="true">Click to {playing ? 'pause' : 'play'}</span></button>}
  </div>
}
