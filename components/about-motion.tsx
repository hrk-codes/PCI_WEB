'use client'

import { useEffect } from 'react'

/**
 * Scroll entrances for the About page: blocks marked data-reveal rise into place once, and fact counters run up
 * to their (server-rendered) values. Without JavaScript, with reduced motion or with the site-wide pause,
 * everything is simply shown as rendered.
 */
export function AboutMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('[data-about]')
    if (!root) return
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.pciMotion === 'paused'
    if (still) return
    const blocks = [...root.querySelectorAll<HTMLElement>('[data-reveal]')]
    // Only hide what is still below the fold, so nothing already on screen flickers.
    for (const el of blocks) if (el.getBoundingClientRect().top > innerHeight * .92) el.dataset.reveal = 'waiting'
    root.dataset.motion = 'on'
    const frames = new Set<number>()
    function count(el: HTMLElement) {
      const target = Number(el.dataset.countTo), begin = performance.now()
      const step = (now: number) => {
        const p = Math.min(1, (now - begin) / 1400), eased = 1 - Math.pow(1 - p, 4)
        el.textContent = String(Math.round(target * eased))
        if (p < 1) frames.add(requestAnimationFrame(step))
      }
      frames.add(requestAnimationFrame(step))
    }
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        const el = entry.target as HTMLElement
        observer.unobserve(el)
        el.dataset.reveal = 'shown'
        el.querySelectorAll<HTMLElement>('[data-count-to]').forEach(count)
      }
    }, {rootMargin:'0px 0px -8% 0px'})
    // A hidden (clipped) block hides its images from the browser's lazy loader too, so start them a screen ahead.
    const preload = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        preload.unobserve(entry.target)
        entry.target.querySelectorAll<HTMLImageElement>('img[loading=lazy]').forEach(img => { img.loading = 'eager' })
      }
    }, {rootMargin:'120% 0px'})
    blocks.forEach(el => { observer.observe(el); if (el.dataset.reveal === 'waiting') preload.observe(el) })
    return () => { observer.disconnect(); preload.disconnect(); frames.forEach(cancelAnimationFrame) }
  }, [])
  return null
}
