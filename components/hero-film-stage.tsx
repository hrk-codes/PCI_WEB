'use client'

import { useEffect, useRef } from 'react'

declare global { interface Window { __pciRenderFrame?: (seconds: number) => void } }

/** Full-viewport stage for previewing and capturing the hero film. `?render=1` waits for frame calls; `?t=4.5` freezes a frame. */
export function HeroFilmStage() {
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    let stopped = false, frame = 0, dispose: (() => void) | undefined
    const params = new URLSearchParams(location.search)
    ;(async () => {
      const { createHeroFilm } = await import('@/lib/hero-film-scene')
      if (stopped || !canvas.current) return
      const film = createHeroFilm(canvas.current, innerWidth, innerHeight)
      dispose = film.dispose
      const onResize = () => film.resize(innerWidth, innerHeight)
      addEventListener('resize', onResize)
      const previous = dispose
      dispose = () => { removeEventListener('resize', onResize); previous() }
      window.__pciRenderFrame = seconds => film.setTime(seconds)
      const fixed = params.get('t')
      if (params.has('render') || fixed !== null) film.setTime(Number(fixed) || 0)
      else {
        const start = performance.now()
        const loop = (now: number) => { film.setTime((now - start) / 1000); frame = requestAnimationFrame(loop) }
        frame = requestAnimationFrame(loop)
      }
      canvas.current.dataset.ready = 'yes'
    })()
    return () => { stopped = true; cancelAnimationFrame(frame); delete window.__pciRenderFrame; dispose?.() }
  }, [])
  return <canvas ref={canvas} className="pci-hero-film-stage" style={{position:'fixed', inset:0, width:'100vw', height:'100vh', display:'block'}}/>
}
