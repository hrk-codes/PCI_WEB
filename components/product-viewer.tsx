'use client'

import { useEffect, useId, useRef, useState } from 'react'
import Image from 'next/image'
import type { ProductViewerApi } from '@/lib/product-viewer'
import { productSamples } from '@/content/product-samples'
import styles from './product-detail.module.css'

export function ProductViewer({ slug, name, poster }: { slug: string; name: string; poster: string }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const api = useRef<ProductViewerApi | null>(null)
  const [ready, setReady] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [separation, setSeparation] = useState(0)
  const id = useId()
  const sample = productSamples[slug]
  useEffect(() => {
    let disposed = false
    const element = canvas.current!
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return
      observer.disconnect()
      import('@/lib/product-viewer').then(module => {
        if (disposed) return
        try { api.current = module.createProductViewer(element, slug, setReady) }
        catch { setReady(false) }
      }).catch(() => setReady(false))
    }, { rootMargin: '150px' })
    observer.observe(element)
    return () => { disposed = true; observer.disconnect(); api.current?.dispose(); api.current = null }
  }, [slug])
  function reset() { api.current?.reset(); setZoom(1); setSeparation(0) }

  return <div className={styles.viewer} data-product-viewer={slug}>
    <div className={styles.viewerStage} tabIndex={0} role="group" aria-label={`${name} 3D construction`} aria-describedby={`${id}-hint`} onKeyDown={event => {
      const direction = { ArrowLeft: [-.15, 0], ArrowRight: [.15, 0], ArrowUp: [0, -.15], ArrowDown: [0, .15] }[event.key]
      if (direction) { event.preventDefault(); api.current?.rotate(direction[0], direction[1]) }
      if (event.key === 'Home') { event.preventDefault(); reset() }
    }}>
      <Image src={poster} alt={`${name} construction illustration`} fill preload sizes="(max-width: 899px) 90vw, 45vw" className={ready ? styles.viewerPosterHidden : styles.viewerPoster} />
      <canvas ref={canvas} className={`${styles.viewerCanvas} ${ready ? styles.viewerReady : ''}`} aria-hidden="true" />
      <span className={styles.viewerBadge}>{ready ? 'Interactive 3D' : 'Construction view'}</span>
    </div>
    <p id={`${id}-hint`} className={styles.viewerHint}>Drag to rotate. Arrow keys turn the model. Home resets the view.</p>
    <div className={styles.viewerControls}>
      <div className={styles.viewerButtons}>
        <button type="button" disabled={!ready} onClick={() => api.current?.rotate(-.3)} aria-label="Rotate product left">↶</button>
        <button type="button" disabled={!ready} onClick={() => api.current?.rotate(.3)} aria-label="Rotate product right">↷</button>
        <button type="button" disabled={!ready} onClick={() => { api.current?.endView(); setZoom(2) }}>End view</button>
        <button type="button" disabled={!ready} onClick={reset}>Reset</button>
      </div>
      <label htmlFor={`${id}-zoom`}>Zoom<input id={`${id}-zoom`} type="range" min=".8" max="2.2" step=".05" value={zoom} disabled={!ready} onChange={event => { const value = Number(event.target.value); setZoom(value); api.current?.zoom(value) }} /></label>
      <label htmlFor={`${id}-layers`}>Separate layers<input id={`${id}-layers`} type="range" min="0" max="1" step=".05" value={separation} disabled={!ready} onChange={event => { const value = Number(event.target.value); setSeparation(value); api.current?.separate(value) }} /></label>
    </div>
    <p className={styles.viewerNote}>Illustrative construction. Use the size directory for the dimensions of your selected specification.</p>
    {sample && <details className={styles.sampleReference}>
      <summary>View PCI’s display sample reference</summary>
      <figure><Image src={sample.poster} width={864} height={1536} alt={sample.label} sizes="(max-width: 600px) 70vw, 260px" /><figcaption>{sample.label}. Still extracted from PCI’s sample recording.</figcaption></figure>
    </details>}
  </div>
}
