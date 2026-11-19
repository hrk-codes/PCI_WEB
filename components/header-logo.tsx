'use client'

import { useEffect, useRef } from 'react'
import { whenSettled } from '@/lib/when-settled'

/** Decorative live mark inside the existing home link; the vector remains the static fallback. */
export function HeaderLogo() {
  const host = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const element = host.current!
    const reduced = matchMedia('(prefers-reduced-motion: reduce)')
    const paused = () => reduced.matches || document.documentElement.dataset.pciMotion === 'paused'
    let stopped = false
    let scene: { hold(on: boolean): void; dispose(): void } | undefined
    // Built once the page has loaded, so it never delays a page; the vector mark shows until then and the intro
    // starts on the scene's first frame.
    const cancel = whenSettled(() => {
      import('@/lib/pci-logo-scene').then(({ createPciLogoScene }) => {
        if (!stopped) scene = createPciLogoScene(element, { still: paused(), compact: true })
      }).catch(() => { /* Keep the vector when WebGL is unavailable. */ })
    })
    const sync = () => scene?.hold(paused())
    const preference = new MutationObserver(sync)
    preference.observe(document.documentElement, { attributes: true, attributeFilter: ['data-pci-motion'] })
    reduced.addEventListener('change', sync)
    const lost = () => { delete element.dataset.ready }
    element.addEventListener('webglcontextlost', lost, true)
    return () => {
      stopped = true; cancel(); preference.disconnect(); reduced.removeEventListener('change', sync)
      element.removeEventListener('webglcontextlost', lost, true); scene?.dispose()
    }
  }, [])
  return <span className="brand-mark brand-mark-live" aria-hidden="true">
    <img src="/media/brand/pci-logo-mark.svg" width={165} height={100} alt="" />
    <span ref={host} className="header-logo-canvas" data-logo-animation="cable-draw-v3" />
  </span>
}
