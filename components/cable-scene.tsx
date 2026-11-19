'use client'

import { useEffect, useRef } from 'react'
import { whenSettled } from '@/lib/when-settled'

/** Loads real geometry only as the About section approaches the viewport, once the page has settled. */
export function CableScene() {
  const mount = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const host = mount.current!
    const section = host.closest<HTMLElement>('.about-cable')!
    let stopped = false, dispose: (() => void) | undefined, cancel: (() => void) | undefined
    const build = async () => {
      try {
        const { createCableScene } = await import('@/lib/cable-scene')
        if (!stopped) dispose = createCableScene(host, section)
      } catch { /* The server-rendered artwork remains visible if WebGL is unavailable. */ }
    }
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(e => e.isIntersecting)) return
      observer.disconnect()
      // The artwork underneath already shows the cable; the live scene takes over without a visible change.
      cancel = whenSettled(build)
    }, {rootMargin:'600px'})
    observer.observe(host)
    return () => { stopped = true; observer.disconnect(); cancel?.(); dispose?.() }
  }, [])
  return <div className="cable-webgl" ref={mount} aria-hidden="true"/>
}
