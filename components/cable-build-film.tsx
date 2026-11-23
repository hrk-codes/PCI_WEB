'use client'

import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import styles from './product-film.module.css'

/** Layers in the order the film builds them (seconds on the film's own timeline). */
export const cableLayers = [
  {key:'conductor', name:'Stranded aluminium conductor', note:'Compacted aluminium strands carry the current.', start:0, end:1.4},
  {key:'cores', name:'Insulated cores', note:'Colour-coded insulation keeps every phase apart.', start:1.4, end:2.3},
  {key:'inner', name:'Inner sheath', note:'Bedding rounds the cores and seats the armour.', start:2.3, end:3.4},
  {key:'armour', name:'Wire armour', note:'Galvanised steel wires add mechanical strength.', start:3.4, end:4.8},
  {key:'outer', name:'Outer sheath', note:'A tough jacket for decades of service.', start:4.8, end:6.0},
] as const
/** After 6 s the film revisits the armour up close, then settles on the finished cable. */
const CLOSE_UP = {start:6.0, end:11.0}

function layerAt(t: number) {
  if (t >= CLOSE_UP.end) return {index:cableLayers.length, progress:1}
  if (t >= CLOSE_UP.start) return {index:3, progress:(t - CLOSE_UP.start) / (CLOSE_UP.end - CLOSE_UP.start)}
  const index = cableLayers.findIndex(l => t >= l.start && t < l.end)
  const layer = cableLayers[Math.max(0, index)]
  return {index:Math.max(0, index), progress:(t - layer.start) / (layer.end - layer.start)}
}
const clamp = (n: number) => Math.max(0, Math.min(1, n))
/** The film, and its exact first frame: shown as the video's own poster, so the hand-over to playback is invisible. */
const FILM = '/media/pci-cable-film-v2.mp4'
const FILM_START = '/media/pci-cable-film-v2-start.webp'
/** How long scrolling must rest before the film starts (ms), and when the play button's ring begins to fill. */
const REST = 320, DWELL = 1500

export function CableBuildFilm({ copy }: { copy: ReactNode }) {
  const section = useRef<HTMLElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const [mode, setMode] = useState<'flow' | 'static'>('static')
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(false)
  const userPaused = useRef(false)
  const optedIn = useRef(false)
  const choose = useRef<() => void>(() => {})
  const control = useRef({ load: () => {}, disarm: () => {} })

  useLayoutEffect(() => {
    const el = section.current!, film = video.current
    const reduced = matchMedia('(prefers-reduced-motion: reduce)')
    const items = [...el.querySelectorAll<HTMLElement>('[data-layer]')]
    const caption = el.querySelector<HTMLElement>('[data-caption]')
    let frame = 0, inView = false, away = true, active = -1, modeNow = ''
    const duration = () => film && Number.isFinite(film.duration) && film.duration > 0 ? film.duration : 12.28

    // The layer list and caption follow the film as each layer is added.
    function paint(t: number) {
      const {index, progress} = layerAt(t)
      el.style.setProperty('--build', clamp(t / duration()).toFixed(4))
      if (index !== active) {
        active = index
        el.dataset.layer = String(index)
        items.forEach((item, i) => { item.dataset.state = i < index ? 'done' : i === index ? 'active' : 'next' })
        if (caption) {
          const layer = cableLayers[Math.min(index, cableLayers.length - 1)]
          caption.querySelector('b')!.textContent = index >= cableLayers.length ? '05' : `0${index + 1}`
          caption.querySelector('span')!.textContent = index >= cableLayers.length ? 'Finished cable' : t >= CLOSE_UP.start ? 'Armour, up close' : layer.name
        }
      }
      items[Math.min(index, items.length - 1)]?.style.setProperty('--fill', index >= items.length ? '1' : clamp(progress).toFixed(3))
    }
    function follow() {
      frame = 0
      if (!film || modeNow !== 'flow') return
      paint(film.currentTime)
      if (!film.paused) frame = requestAnimationFrame(follow)
    }
    // Nothing is downloaded or decoded while a visitor scrolls past: the film's first frame (its poster) stands in.
    function load() {
      if (!film || modeNow !== 'flow' || film.src) return
      film.preload = 'auto'
      film.src = FILM
    }
    // The film waits, paused. Once the visitor rests on it (scrolling stopped, film mostly on screen) a ring fills on
    // the play button and the film starts; it carries on while they read, and pauses once they scroll away.
    // A visitor's own pause or play always wins.
    let resting = 0, starting = 0
    function disarm() {
      clearTimeout(resting); clearTimeout(starting); resting = starting = 0
      if (el.dataset.arming) delete el.dataset.arming
    }
    function arm() {
      disarm()
      if (!film || modeNow !== 'flow' || !inView || document.hidden || userPaused.current || !film.paused) return
      resting = window.setTimeout(() => {
        load()
        el.dataset.arming = 'yes'
        starting = window.setTimeout(() => {
          delete el.dataset.arming
          if (inView && !document.hidden && !userPaused.current) film.play().catch(() => setPlaying(false))
        }, DWELL - REST)
      }, REST)
    }
    function sync() {
      if (!film || modeNow !== 'flow') return
      if (away || document.hidden) { disarm(); film.pause() }
      else if (film.paused) arm()
    }
    // Scrolling restarts the wait (only while the film is waiting to start; a playing film keeps playing).
    const onScroll = () => { if (inView && film?.paused) arm() }
    function pick() {
      const next = (reduced.matches || document.documentElement.dataset.pciMotion === 'paused') && !optedIn.current ? 'static' : 'flow'
      if (next === modeNow) return
      modeNow = next
      setMode(next); el.dataset.mode = next
      if (next === 'static') { disarm(); film?.pause(); cancelAnimationFrame(frame); frame = 0; paint(CLOSE_UP.end) }
      else {
        if (film) { film.loop = true; if (!film.currentTime) paint(0) }
        sync()
      }
    }
    choose.current = pick
    control.current = { load, disarm }
    const onPlay = () => { setPlaying(true); if (!frame) frame = requestAnimationFrame(follow) }
    const onPause = () => setPlaying(false)
    const onLoaded = () => { el.dataset.film = 'ready' }
    // "In view": most of the film on screen. "Away": all but a sliver scrolled off, the visitor has moved on.
    const io = new IntersectionObserver(entries => {
      const ratio = entries[0].intersectionRatio
      inView = ratio >= .55; away = ratio < .2
      sync()
    }, {threshold:[0, .2, .55, .8, 1]})
    const prefs = new MutationObserver(pick)
    film?.addEventListener('play', onPlay); film?.addEventListener('pause', onPause); film?.addEventListener('loadeddata', onLoaded)
    io.observe(film ?? el); prefs.observe(document.documentElement, {attributes:true, attributeFilter:['data-pci-motion']})
    reduced.addEventListener('change', pick); document.addEventListener('visibilitychange', sync)
    addEventListener('scroll', onScroll, {passive:true})
    pick()
    el.dataset.ready = 'yes'
    return () => {
      cancelAnimationFrame(frame); disarm(); io.disconnect(); prefs.disconnect(); removeEventListener('scroll', onScroll)
      film?.removeEventListener('play', onPlay); film?.removeEventListener('pause', onPause); film?.removeEventListener('loadeddata', onLoaded)
      reduced.removeEventListener('change', pick); document.removeEventListener('visibilitychange', sync)
      film?.pause()
    }
  }, [failed])

  function toggle() {
    const film = video.current
    if (!film) return
    if (mode === 'static') { optedIn.current = true; userPaused.current = false; choose.current(); return }
    control.current.disarm()
    userPaused.current = !film.paused
    if (userPaused.current) film.pause()
    else { control.current.load(); film.play().catch(() => setPlaying(false)) }
  }

  return <section ref={section} className={`section ${styles.scene}`} aria-labelledby="product-film-heading" data-mode="static" data-layer={cableLayers.length} style={{'--dwell':`${DWELL - REST}ms`} as CSSProperties}>
    <svg className={styles.transition} viewBox="0 0 1440 112" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="product-film-trace">
          <stop stopColor="#ff8e61" stopOpacity="0"/><stop offset=".25" stopColor="#ff8e61" stopOpacity=".3"/><stop offset=".55" stopColor="#ffad83" stopOpacity=".85"/><stop offset=".78" stopColor="#ff8e61" stopOpacity=".35"/><stop offset="1" stopColor="#ff8e61" stopOpacity="0"/>
        </linearGradient>
      </defs>
      <g fill="none" stroke="url(#product-film-trace)">
        <path d="M0 20H430C545 20 550 64 665 64H1440" vectorEffect="non-scaling-stroke"/>
        <path d="M0 28H406C530 28 538 74 662 74H1440" opacity=".56" vectorEffect="non-scaling-stroke"/>
        <path d="M0 36H384C515 36 526 84 657 84H1440" opacity=".28" vectorEffect="non-scaling-stroke"/>
      </g>
    </svg>
    <div className={styles.stage}>
      <div className={`wrap ${styles.grid}`}>
        {copy}
        <ol className={styles.layers} aria-label="Layers inside an armoured aluminium cable">
          {cableLayers.map((layer, i) => <li key={layer.key} data-layer={layer.key} data-state="done" style={{'--fill':1} as CSSProperties}>
            <span className={styles.layerIndex} aria-hidden="true">0{i + 1}</span>
            <span className={styles.layerText}><b>{layer.name}</b><small>{layer.note}</small></span>
            <i aria-hidden="true"/>
          </li>)}
        </ol>
        <div className={styles.film}>
          <div className={styles.filmArt} aria-hidden="true">
          <div className={styles.glow}/>
          <img className={styles.poster} src="/media/pci-cable-film-final.webp" alt="" width={1920} height={1080} loading="lazy" decoding="async"/>
          {!failed && <video ref={video} className={styles.video} poster={FILM_START} muted playsInline preload="none" disablePictureInPicture onError={() => setFailed(true)}/>}
          <div className={styles.caption} data-caption data-complete="true"><b>05</b><span>Finished cable</span></div>
          </div>
          {!failed && <button type="button" className={styles.toggle} onClick={toggle} aria-label={playing ? 'Pause cable film' : 'Play cable film'}><svg className={styles.ring} viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="22" pathLength="1"/></svg><span aria-hidden="true" data-icon={playing ? 'pause' : 'play'}/></button>}
        </div>
      </div>
      <div className={`wrap ${styles.rail}`} aria-hidden="true"><span>Inside the cable</span><div><i/></div><span>{cableLayers.length} layers</span></div>
    </div>
  </section>
}
