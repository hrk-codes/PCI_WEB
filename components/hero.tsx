'use client'

import { Fragment, useEffect, useRef, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import { getImageProps } from 'next/image'
import './hero.css'

export const heroDefaults = {
  title: 'Engineered to carry the current.',
  summary: 'Cables, overhead conductors and earth wire from Dankuni, made for power networks across India and beyond.',
}

type Copy = { title: string; summary: string } | null
const LANDSCAPE_FILM = 'landscape-v7'
const PORTRAIT_FILM = 'portrait-v7'
const FILM_RELEASE = `${LANDSCAPE_FILM}:${PORTRAIT_FILM}`
const PORTRAIT_MEDIA = '(orientation: portrait) and (max-width: 820px)'
const LANDSCAPE_FRAME = {width:1920, height:1080}
const PORTRAIT_FRAME = {width:720, height:1280}
const MAX_AUTOPLAY_UPSCALE = 1.5
// New filenames keep Next's image cache from showing the previous film during the first frame.
const filmAsset = (name: string) => `/media/pci-hero-film-${name}`

/** Art-directed poster: landscape on wide screens, portrait on tall phones. It is the LCP image and the reduced-motion view. */
function Poster() {
  const common = {alt:'', sizes:'100vw'}
  const { props: { srcSet: wide } } = getImageProps({...common, ...LANDSCAPE_FRAME, src:filmAsset(`${LANDSCAPE_FILM}.webp`)})
  const { props: { srcSet: tall, ...rest } } = getImageProps({...common, ...PORTRAIT_FRAME, src:filmAsset(`${PORTRAIT_FILM}.webp`)})
  return <picture>
    <source media={PORTRAIT_MEDIA} srcSet={tall}/>
    <source srcSet={wide}/>
    <img {...rest} alt="" className="hero-film-poster" fetchPriority="high" loading="eager"/>
  </picture>
}

export function HeroFilm({ copy }: { copy: Copy }) {
  const { title, summary } = copy ?? heroDefaults
  const section = useRef<HTMLElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(false)
  const choice = useRef<'auto' | 'play' | 'pause'>('auto')
  const sync = useRef<() => void>(() => {})

  useEffect(() => {
    const el = section.current!, film = video.current
    if (!film) return
    el.dataset.film = 'poster'
    setPlaying(false)
    const reduced = matchMedia('(prefers-reduced-motion: reduce)')
    const portrait = matchMedia(PORTRAIT_MEDIA)
    let visible = true
    const motionOff = () => reduced.matches || document.documentElement.dataset.pciMotion === 'paused'
    function fitsDisplay() {
      const { width, height } = el.getBoundingClientRect()
      const source = portrait.matches ? PORTRAIT_FRAME : LANDSCAPE_FRAME
      const sourceWidth = film!.videoWidth || source.width
      const sourceHeight = film!.videoHeight || source.height
      // The film covers the section. Check the growing axis in display pixels, including high-density screens.
      return Math.max(width / sourceWidth, height / sourceHeight) * devicePixelRatio <= MAX_AUTOPLAY_UPSCALE
    }
    function update() {
      if (choice.current === 'auto' && !fitsDisplay()) {
        el.dataset.film = 'poster'
        film!.pause()
        return
      }
      const allowed = choice.current === 'play' || (choice.current === 'auto' && !motionOff())
      if (allowed && visible && !document.hidden) {
        film!.play().catch(() => { /* Autoplay refused: the poster stays and the button offers Play. */ setPlaying(false) })
      } else film!.pause()
    }
    sync.current = update
    const onPlaying = () => {
      if (choice.current === 'auto' && !fitsDisplay()) { update(); return }
      setPlaying(true); el.dataset.film = 'playing'
    }
    const onPause = () => { setPlaying(false) }
    const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; update() }, {threshold:.05})
    const preference = new MutationObserver(() => { if (choice.current === 'auto') update() })
    const resize = new ResizeObserver(update)
    film.addEventListener('playing', onPlaying); film.addEventListener('pause', onPause)
    film.addEventListener('loadedmetadata', update)
    observer.observe(el)
    resize.observe(el)
    preference.observe(document.documentElement, {attributes:true, attributeFilter:['data-pci-motion']})
    reduced.addEventListener('change', update)
    window.addEventListener('resize', update)
    document.addEventListener('visibilitychange', update)
    update()
    return () => {
      observer.disconnect(); preference.disconnect(); resize.disconnect()
      film.removeEventListener('playing', onPlaying); film.removeEventListener('pause', onPause)
      film.removeEventListener('loadedmetadata', update)
      reduced.removeEventListener('change', update); document.removeEventListener('visibilitychange', update)
      window.removeEventListener('resize', update)
      film.pause()
    }
  }, [failed, FILM_RELEASE])

  function toggle() {
    choice.current = playing ? 'pause' : 'play'
    sync.current()
  }

  const words = title.split(' ')
  return <section ref={section} className="hero-film" aria-label="PCI Cables introduction" data-film="poster">
    <div className="hero-film-media" aria-hidden="true">
      <Poster/>
      {!failed && <video key={FILM_RELEASE} ref={video} className="hero-film-video" muted loop playsInline preload="none" disablePictureInPicture onError={event => {
        // A source's error bubbles through React. Let the browser try the next codec first.
        if (event.target === event.currentTarget) setFailed(true)
      }}>
        <source src={filmAsset(`${PORTRAIT_FILM}.mp4`)} type="video/mp4" media={PORTRAIT_MEDIA}/>
        <source src={filmAsset(`${PORTRAIT_FILM}.webm`)} type="video/webm" media={PORTRAIT_MEDIA}/>
        <source src={filmAsset(`${LANDSCAPE_FILM}.mp4`)} type="video/mp4"/>
        <source src={filmAsset(`${LANDSCAPE_FILM}.webm`)} type="video/webm"/>
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
    </div>
    <div className="wrap hero-film-bar">
      {!failed && <button type="button" className="hero-film-toggle" onClick={toggle} aria-label={playing ? 'Pause background film' : 'Play background film'}>
        <span aria-hidden="true" data-icon={playing ? 'pause' : 'play'}/>
      </button>}
      <a className="hero-scroll" href="#about-pci-title"><span>Scroll</span><i aria-hidden="true"/></a>
    </div>
  </section>
}
