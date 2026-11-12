'use client'

import { Fragment, useEffect, useRef, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import { getImageProps } from 'next/image'
import { chapterAtTime, heroChapters } from '@/lib/hero-film-timeline'
import './hero.css'

export const heroDefaults = {
  title: 'Engineered to carry the current.',
  summary: 'Cables, overhead conductors and earth wire from Dankuni, made for power networks across India and beyond.',
}

type Copy = { title: string; summary: string } | null

/** Art-directed poster: landscape on wide screens, portrait on tall phones. It is the LCP image and the reduced-motion view. */
function Poster() {
  const common = {alt:'', sizes:'100vw'}
  const { props: { srcSet: wide } } = getImageProps({...common, width:1920, height:1080, src:'/media/pci-hero-film-landscape.webp'})
  const { props: { srcSet: tall, ...rest } } = getImageProps({...common, width:1080, height:1350, src:'/media/pci-hero-film-portrait.webp'})
  return <picture>
    <source media="(orientation: portrait) and (max-width: 820px)" srcSet={tall}/>
    <source srcSet={wide}/>
    <img {...rest} alt="" className="hero-film-poster" fetchPriority="high" loading="eager"/>
  </picture>
}

export function HeroFilm({ copy, productCount }: { copy: Copy; productCount: number }) {
  const { title, summary } = copy ?? heroDefaults
  const section = useRef<HTMLElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const chapters = useRef<HTMLAnchorElement[]>([])
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(false)
  const choice = useRef<'auto' | 'play' | 'pause'>('auto')
  const sync = useRef<() => void>(() => {})

  useEffect(() => {
    const el = section.current!, film = video.current
    if (!film) return
    const reduced = matchMedia('(prefers-reduced-motion: reduce)')
    let visible = true, frame = 0, active = ''
    const motionOff = () => reduced.matches || document.documentElement.dataset.pciMotion === 'paused'
    function paint() {
      frame = 0
      const { chapter, progress } = chapterAtTime(film!.currentTime)
      if (chapter.key !== active) {
        active = chapter.key
        el.dataset.chapter = active
        for (const link of chapters.current) link.dataset.active = String(link.dataset.key === active)
      }
      chapters.current.find(link => link.dataset.key === active)?.style.setProperty('--p', progress.toFixed(3))
      if (!film!.paused) frame = requestAnimationFrame(paint)
    }
    function update() {
      const allowed = choice.current === 'play' || (choice.current === 'auto' && !motionOff())
      if (allowed && visible && !document.hidden) {
        film!.play().catch(() => { /* Autoplay refused: the poster stays and the button offers Play. */ setPlaying(false) })
      } else film!.pause()
    }
    sync.current = update
    const onPlaying = () => { setPlaying(true); el.dataset.film = 'playing'; if (!frame) frame = requestAnimationFrame(paint) }
    const onPause = () => { setPlaying(false); cancelAnimationFrame(frame); frame = 0 }
    const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; update() }, {threshold:.05})
    const preference = new MutationObserver(() => { if (choice.current === 'auto') update() })
    film.addEventListener('playing', onPlaying); film.addEventListener('pause', onPause)
    observer.observe(el)
    preference.observe(document.documentElement, {attributes:true, attributeFilter:['data-pci-motion']})
    reduced.addEventListener('change', update)
    document.addEventListener('visibilitychange', update)
    update()
    return () => {
      cancelAnimationFrame(frame); observer.disconnect(); preference.disconnect()
      film.removeEventListener('playing', onPlaying); film.removeEventListener('pause', onPause)
      reduced.removeEventListener('change', update); document.removeEventListener('visibilitychange', update)
      film.pause()
    }
  }, [failed])

  function toggle() {
    choice.current = playing ? 'pause' : 'play'
    sync.current()
  }

  const words = title.split(' ')
  const poster = chapterAtTime(0)
  return <section ref={section} className="hero-film" aria-label="PCI Cables introduction" data-chapter={poster.chapter.key} data-film="poster">
    <div className="hero-film-media" aria-hidden="true">
      <Poster/>
      {!failed && <video ref={video} className="hero-film-video" muted loop playsInline preload="none" disablePictureInPicture onError={() => setFailed(true)}>
        <source src="/media/pci-hero-film-portrait.webm" type="video/webm" media="(orientation: portrait) and (max-width: 820px)"/>
        <source src="/media/pci-hero-film-portrait.mp4" type="video/mp4" media="(orientation: portrait) and (max-width: 820px)"/>
        <source src="/media/pci-hero-film-landscape.webm" type="video/webm"/>
        <source src="/media/pci-hero-film-landscape.mp4" type="video/mp4"/>
      </video>}
    </div>
    <div className="hero-film-shade" aria-hidden="true"/>
    <div className="wrap hero-film-content">
      <p className="kicker hero-film-kicker"><span aria-hidden="true"/>PCI Cables · Dankuni, India</p>
      <h1>{words.map((word, i) => <Fragment key={i}>{i > 0 && ' '}<span className="hero-word" style={{'--d':i} as CSSProperties}>{word}</span></Fragment>)}</h1>
      <p className="hero-film-lead">{summary}</p>
      <div className="hero-film-actions">
        <Link className="button" href="/products/">Explore our products <span aria-hidden="true">↗</span></Link>
        <Link className="hero-film-ghost" href="/request-quote/">Request a quote</Link>
      </div>
      <nav className="hero-chapters" aria-label="Product families">
        {heroChapters.map((chapter, i) => <Link key={chapter.key} href={chapter.href} data-key={chapter.key} data-active={String(chapter.key === poster.chapter.key)} ref={node => { if (node) chapters.current[i] = node }}>
          <small aria-hidden="true">0{i + 1}</small>{chapter.label}<i aria-hidden="true"/>
        </Link>)}
      </nav>
    </div>
    <div className="wrap hero-film-bar">
      <ul className="hero-facts" aria-label="PCI at a glance">
        <li><b>{productCount}</b> products</li>
        <li><b>17</b> Indian states</li>
        <li><b>7</b> export countries</li>
        <li><b>2013</b> founded</li>
      </ul>
      {!failed && <button type="button" className="hero-film-toggle" onClick={toggle} aria-label={playing ? 'Pause background film' : 'Play background film'}>
        <span aria-hidden="true" data-icon={playing ? 'pause' : 'play'}/>
      </button>}
      <a className="hero-scroll" href="#about-pci-title"><span>Scroll</span><i aria-hidden="true"/></a>
    </div>
  </section>
}
