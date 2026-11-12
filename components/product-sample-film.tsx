'use client'

import { useEffect, useRef, useState } from 'react'
import type { ProductSample } from '@/content/product-samples'
import './product-sample-film.css'

/** "See the real sample": a short steadied loop of PCI's own display sample, filmed at the works. */
export function ProductSampleFilm({ sample, name }: { sample: ProductSample; name: string }) {
  const host = useRef<HTMLElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(false)
  const choice = useRef<'auto' | 'play' | 'pause'>('auto')
  const sync = useRef(() => {})
  useEffect(() => {
    const el = host.current!, film = video.current
    if (!film) return
    const reduced = matchMedia('(prefers-reduced-motion: reduce)')
    let visible = false
    const still = () => reduced.matches || document.documentElement.dataset.pciMotion === 'paused'
    // Plays muted while on screen; reduced motion and the saved pause show the poster until the visitor presses play.
    function update() {
      const allowed = choice.current === 'play' || (choice.current === 'auto' && !still())
      if (allowed && visible && !document.hidden) { if (!film!.src) film!.src = sample.video; film!.play().catch(() => setPlaying(false)) }
      else film!.pause()
    }
    sync.current = update
    const onPlay = () => { setPlaying(true); el.dataset.film = 'playing' }
    const onPause = () => setPlaying(false)
    const io = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; update() }, {threshold:.25})
    const prefs = new MutationObserver(() => { if (choice.current === 'auto') update() })
    film.addEventListener('playing', onPlay); film.addEventListener('pause', onPause)
    io.observe(el); prefs.observe(document.documentElement, {attributes:true, attributeFilter:['data-pci-motion']})
    reduced.addEventListener('change', update); document.addEventListener('visibilitychange', update)
    return () => {
      io.disconnect(); prefs.disconnect(); film.pause()
      film.removeEventListener('playing', onPlay); film.removeEventListener('pause', onPause)
      reduced.removeEventListener('change', update); document.removeEventListener('visibilitychange', update)
    }
  }, [sample.video, failed])
  const toggle = () => { choice.current = playing ? 'pause' : 'play'; sync.current() }
  return <section ref={host} className="sample-film" aria-labelledby="sample-film-heading" data-film="poster">
    <div className="sample-film-copy">
      <p className="kicker sample-film-kicker"><span aria-hidden="true"/>Real sample</p>
      <h2 id="sample-film-heading">See it up close.</h2>
      <p>Filmed at our works in Dankuni: a {sample.label}, cut back to show each layer of its construction.</p>
      <small>Display sample shown to explain the construction of {name}. Sizes and constructions vary by order; see the datasheet for specifications.</small>
    </div>
    <figure className="sample-film-frame">
      {/* eslint-disable-next-line @next/next/no-img-element -- fixed-size poster beneath the video */}
      <img className="sample-film-poster" src={sample.poster} width={864} height={1536} alt={`${sample.label}, PCI display sample`} loading="lazy" decoding="async"/>
      {!failed && <video ref={video} className="sample-film-video" muted loop playsInline preload="none" disablePictureInPicture aria-hidden="true" onError={() => setFailed(true)}/>}
      {!failed && <button type="button" className="sample-film-toggle" onClick={toggle} aria-label={playing ? 'Pause sample film' : 'Play sample film'}><span aria-hidden="true" data-icon={playing ? 'pause' : 'play'}/></button>}
      <figcaption>{sample.label}</figcaption>
    </figure>
  </section>
}
