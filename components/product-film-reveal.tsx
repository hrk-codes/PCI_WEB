'use client'

import { useEffect, useRef, type ReactNode } from 'react'

export function ProductFilmReveal({ children, className }: { children: ReactNode; className: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const copy = ref.current
    if (!copy || !('IntersectionObserver' in window)) return

    const root = document.documentElement
    const reduced = matchMedia('(prefers-reduced-motion: reduce)')
    const motionPaused = () => reduced.matches || root.dataset.pciMotion === 'paused'
    if (motionPaused() || copy.getBoundingClientRect().top < window.innerHeight || copy.contains(document.activeElement)) return

    const finish = () => {
      copy.dataset.filmEntrance = 'settled'
      observer.disconnect()
      preference.disconnect()
      reduced.removeEventListener('change', onPreferenceChange)
      copy.removeEventListener('focusin', finish)
      copy.removeEventListener('animationend', onAnimationEnd)
    }

    function onPreferenceChange() {
      if (motionPaused()) finish()
    }

    const onAnimationEnd = (event: AnimationEvent) => {
      if (event.target === copy.lastElementChild) finish()
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      observer.disconnect()
      if (motionPaused()) {
        finish()
        return
      }
      copy.dataset.filmEntrance = 'running'
    })
    const preference = new MutationObserver(onPreferenceChange)

    copy.dataset.filmEntrance = 'waiting'
    observer.observe(copy)
    preference.observe(root, { attributes: true, attributeFilter: ['data-pci-motion'] })
    reduced.addEventListener('change', onPreferenceChange)
    copy.addEventListener('focusin', finish)
    copy.addEventListener('animationend', onAnimationEnd)
    return finish
  }, [])

  return <div className={className} ref={ref} data-film-entrance="settled">{children}</div>
}
