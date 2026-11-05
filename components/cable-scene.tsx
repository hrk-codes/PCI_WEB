'use client'

import { useEffect, useRef } from 'react'

/** Loads real geometry only as the About section approaches the viewport. */
export function CableScene() {
  const mount = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const host = mount.current!
    const section = host.closest<HTMLElement>('.about-cable')!
    let stopped = false, dispose: (() => void) | undefined
    const observer = new IntersectionObserver(async entries => {
      if (!entries.some(e => e.isIntersecting)) return
      observer.disconnect()
      try {
        const { createCableScene } = await import('@/lib/cable-scene')
        if (!stopped) dispose = createCableScene(host, section)
      } catch { /* The server-rendered artwork remains visible if WebGL is unavailable. */ }
    }, {rootMargin:'350px'})
    observer.observe(host)
    return () => { stopped = true; observer.disconnect(); dispose?.() }
  }, [])
  return <div className="cable-webgl" ref={mount} aria-hidden="true"/>
}
