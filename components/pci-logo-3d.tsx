'use client'

import { useEffect, useRef, useState } from 'react'
import styles from './about-page.module.css'

type Scene = { replay(): void; hold(on: boolean): void; dispose(): void }

/**
 * The 3D PCI Cables mark. The vector logo is server-rendered and stays in place without JavaScript or WebGL; the
 * cable-drawn 3D version replaces it once three.js has loaded. It plays on arrival, again every few seconds
 * while on screen, and whenever the mark is clicked.
 */
export function PciLogo3D() {
  const host = useRef<HTMLDivElement>(null)
  const scene = useRef<Scene | null>(null)
  const [live, setLive] = useState(false)
  const [playable, setPlayable] = useState(false)
  useEffect(() => {
    const el = host.current!
    const reduced = matchMedia('(prefers-reduced-motion: reduce)')
    const paused = () => reduced.matches || document.documentElement.dataset.pciMotion === 'paused'
    let stopped = false
    import('@/lib/pci-logo-scene').then(({ createPciLogoScene }) => {
      if (stopped) return
      scene.current = createPciLogoScene(el, {still:paused()})
      setLive(true)
    }).catch(() => { /* WebGL unavailable: the vector logo stays */ })
    setPlayable(!paused())
    const sync = () => { scene.current?.hold(paused()); setPlayable(!paused()) }
    const preference = new MutationObserver(sync)
    preference.observe(document.documentElement, {attributes:true, attributeFilter:['data-pci-motion']})
    reduced.addEventListener('change', sync)
    return () => { stopped = true; preference.disconnect(); reduced.removeEventListener('change', sync); scene.current?.dispose(); scene.current = null }
  }, [])
  return <div className={styles.logoStage}>
    <div className={styles.logoFrame} aria-hidden="true"><span/><span/><span/><span/></div>
    <img className={styles.logoFallback} src="/media/brand/pci-logo-mark.svg" width={165} height={100} alt="PCI Cables logo" data-hidden={live ? 'yes' : undefined}/>
    <div ref={host} className={styles.logoCanvas}/>
    {live && playable && <button type="button" className={styles.logoPlay} onClick={() => scene.current?.replay()} aria-label="Play the PCI logo animation"/>}
  </div>
}
