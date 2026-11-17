'use client'

import { useEffect, useId, useRef, useState } from 'react'
import Image from 'next/image'
import type { ProductViewerApi } from '@/lib/product-viewer'
import { productSamples } from '@/content/product-samples'
import styles from './product-detail.module.css'

export function ProductViewer({ slug, name, poster, layers = [] }: { slug: string; name: string; poster: string; layers?: string[] }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const api = useRef<ProductViewerApi | null>(null)
  const [ready, setReady] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [separation, setSeparation] = useState(0)
  const id = useId()
  const sample = productSamples[slug]
  const reference = sample?.reference || (sample ? { image: sample.poster, label: sample.label } : undefined)
  const aerial = slug === 'aerial-bunched-cable'
  const bunchStages = [
    { label: 'Bunched', value: 0, detail: 'Four equal black-insulated members twist together, with a thinner bare aluminium messenger on the outside.' },
    { label: 'Open bunch', value: .4, detail: 'The helical members open out while their common lay remains visible.' },
    { label: 'Peel insulation', value: .75, detail: 'The split black insulation curls back, revealing its thickness and the aluminium underneath.' },
    { label: 'See strands', value: 1, detail: 'Individual aluminium strands spread at the tips. Move back to reassemble the cable.' },
  ]
  const steelCore = slug === 'acsr' || slug === 'aacsr' || slug === 'gi-earth-wire'
  const conductorStages = [
    { label: 'Stranded', value: 0, detail: 'Concentric layers of wire, each laid in the opposite direction to the one beneath it and stepped back at the end.' },
    { label: 'Open outer layer', value: .35, detail: 'The outer layer flares open and curls back, showing the layer it was stranded over.' },
    { label: 'Open every layer', value: .72, detail: 'Each layer opens in turn from the outside in, so every lay direction can be seen.' },
    { label: 'See the core', value: 1, detail: steelCore ? 'The galvanised steel core stands clear of the wires stranded around it. Move back to close the conductor.' : 'The centre wire stands clear of the layers stranded around it. Move back to close the conductor.' },
  ]
  const controlStages = [
    { label: 'Assembled', value: 0, detail: 'Black PVC sheath over galvanised round-wire armour, an inner sheath and four colour-coded copper cores.' },
    { label: 'Peel sheath', value: .42, detail: 'The outer sheath splits and curls back, and the steel armour wires flare open.' },
    { label: 'Peel inner sheath', value: .72, detail: 'The inner sheath opens to show the four insulated cores it holds together.' },
    { label: 'Spread cores', value: 1, detail: 'The red, yellow, blue and black cores fan apart, their insulation peels and the copper strands spread. Move back to reassemble the cable.' },
  ]
  const stages = aerial ? bunchStages : slug === 'control-cable' ? controlStages : ['aac', 'aaac', 'acsr', 'aacsr', 'acar', 'eco-panther', 'al-59', 'gi-earth-wire'].includes(slug) ? conductorStages : null
  const bunchStage = aerial ? (separation < .2 ? 0 : separation < .55 ? 1 : separation < .88 ? 2 : 3)
    : stages ? Math.max(0, stages.filter(stage => separation >= stage.value - .12).length - 1) : 0
  function separate(value: number) { setSeparation(value); api.current?.separate(value) }
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
  }, [slug, poster])
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
        <button type="button" disabled={!ready} onClick={() => { const next = api.current?.endView(); if (next) setZoom(next) }}>End view</button>
        <button type="button" disabled={!ready} onClick={reset}>Reset</button>
      </div>
      <label htmlFor={`${id}-zoom`}>Zoom<input id={`${id}-zoom`} type="range" min=".8" max="2.2" step=".05" value={zoom} disabled={!ready} onChange={event => { const value = Number(event.target.value); setZoom(value); api.current?.zoom(value) }} /></label>
      <label htmlFor={`${id}-layers`}>Separate layers<input id={`${id}-layers`} type="range" min="0" max="1" step=".05" value={separation} disabled={!ready} aria-valuetext={stages ? stages[bunchStage].label : undefined} aria-describedby={stages ? `${id}-bunch-description` : undefined} onChange={event => separate(Number(event.target.value))} /></label>
      {stages && <div className={styles.bunchExploration}>
        <div role="group" aria-label={aerial ? 'Cable construction stages' : 'Construction stages'}>{stages.map((stage, index) => <button type="button" key={stage.label} disabled={!ready} aria-pressed={bunchStage === index} onClick={() => separate(stage.value)}>{stage.label}</button>)}</div>
        <p id={`${id}-bunch-description`}>{stages[bunchStage].detail}</p>
      </div>}
    </div>
    {layers.length > 0 && <div className={styles.viewerLayers}><span>Outside → inside</span><ol>{layers.map(layer => <li key={layer}>{layer}</li>)}</ol></div>}
    <p className={styles.viewerNote}>Illustrative construction. Use the size directory for the dimensions of your selected specification.</p>
    {reference && <details className={styles.sampleReference}>
      <summary>View PCI’s display sample reference</summary>
      <figure><Image src={reference.image} width={864} height={1536} alt={reference.label} sizes="(max-width: 600px) 70vw, 260px" /><figcaption>{reference.label}. Still extracted from PCI’s sample recording.</figcaption></figure>
    </details>}
  </div>
}
