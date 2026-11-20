'use client'

import { useEffect, useRef } from 'react'

export function FloatingScrollbar() {
  const rail = useRef<HTMLDivElement>(null)
  const thumb = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const track = rail.current, handle = thumb.current
    if (!track || !handle) return

    const root = document.documentElement
    const header = document.querySelector('.site-head')
    const quickInfo = document.querySelector('.info-trigger')
    const motion = matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) and (forced-colors: none)')
    let frame = 0, scrollRange = 0, travel = 0, movement = 0
    let lastY: number | null = null, dragPointer: number | null = null

    function endHover() {
      const capturedPointer = dragPointer
      dragPointer = null
      lastY = null
      movement = 0
      delete track!.dataset.tracking
      delete track!.dataset.dragging
      if (capturedPointer !== null && track!.hasPointerCapture(capturedPointer)) {
        track!.releasePointerCapture(capturedPointer)
      }
    }

    function paint() {
      frame = 0
      if (track!.hidden) return
      let top = window.scrollY
      if (movement) {
        const next = Math.max(0, Math.min(scrollRange, top + movement * (scrollRange / travel)))
        movement = 0
        window.scrollTo({ top:next, behavior:'instant' })
        top = window.scrollY
      }
      handle!.style.transform = `translateY(${Math.min(1, Math.max(0, top / scrollRange)) * travel}px)`
    }

    function schedule() {
      if (!frame && !track!.hidden) frame = requestAnimationFrame(paint)
    }

    function measure() {
      const start = (header?.getBoundingClientRect().bottom ?? 0) + 12
      const end = (quickInfo?.getBoundingClientRect().top ?? root.clientHeight) - 12
      const room = end - start
      const documentHeight = root.scrollHeight
      scrollRange = documentHeight - root.clientHeight
      const height = Math.max(42, (room * root.clientHeight) / documentHeight)
      travel = room - height
      // Hiding the native scrollbar can widen the layout and shorten wrapped content.
      const minRange = track!.hidden ? 120 : 60
      const minTravel = track!.hidden ? 24 : 16
      track!.hidden = !motion.matches || root.dataset.pciMotion === 'paused' || scrollRange < minRange || travel < minTravel
      if (track!.hidden) { endHover(); return }
      track!.style.top = `${start}px`
      track!.style.height = `${room}px`
      handle!.style.height = `${height}px`
      schedule()
    }

    function enterThumb(event: PointerEvent) {
      if (event.pointerType !== 'mouse' || lastY !== null) return
      lastY = event.clientY
      track!.dataset.tracking = 'yes'
    }

    function followPointer(event: PointerEvent) {
      if (event.pointerType !== 'mouse' || lastY === null) return
      movement += event.clientY - lastY
      lastY = event.clientY
      schedule()
    }

    function startDrag(event: PointerEvent) {
      if (event.pointerType !== 'mouse' || event.button !== 0 || dragPointer !== null) return
      event.preventDefault()
      dragPointer = event.pointerId
      lastY = event.clientY
      movement = 0
      track!.dataset.tracking = 'yes'
      track!.dataset.dragging = 'yes'
      track!.setPointerCapture(event.pointerId)

      if (event.target !== handle) {
        const offset = event.clientY - track!.getBoundingClientRect().top - handle!.offsetHeight / 2
        const fraction = Math.min(1, Math.max(0, offset / travel))
        window.scrollTo({ top:fraction * scrollRange, behavior:'instant' })
        schedule()
      }
    }

    function endDrag(event: PointerEvent) {
      if (event.pointerId !== dragPointer) return
      if (event.type !== 'pointerup') { endHover(); return }

      // Apply the final movement even if the pointer is released before the next frame.
      if (movement) {
        cancelAnimationFrame(frame)
        paint()
      }
      dragPointer = null
      delete track!.dataset.dragging
      const { left, right, top, bottom } = track!.getBoundingClientRect()
      if (event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom) endHover()
    }

    function leaveTrack() {
      if (dragPointer === null) endHover()
    }

    function cancelWithEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') endHover()
    }

    const size = new ResizeObserver(measure)
    size.observe(document.body)
    if (header) size.observe(header)
    if (quickInfo) size.observe(quickInfo)
    const preference = new MutationObserver(measure)
    preference.observe(root, { attributes:true, attributeFilter:['data-pci-motion'] })
    motion.addEventListener('change', measure)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', schedule, { passive:true })
    window.addEventListener('blur', endHover)
    window.addEventListener('keydown', cancelWithEscape)
    handle.addEventListener('pointerenter', enterThumb)
    track.addEventListener('pointerdown', startDrag)
    track.addEventListener('pointermove', followPointer)
    track.addEventListener('pointerleave', leaveTrack)
    track.addEventListener('pointerup', endDrag)
    track.addEventListener('pointercancel', endDrag)
    track.addEventListener('lostpointercapture', endDrag)
    measure()

    return () => {
      cancelAnimationFrame(frame)
      endHover()
      size.disconnect()
      preference.disconnect()
      motion.removeEventListener('change', measure)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('blur', endHover)
      window.removeEventListener('keydown', cancelWithEscape)
      handle.removeEventListener('pointerenter', enterThumb)
      track.removeEventListener('pointerdown', startDrag)
      track.removeEventListener('pointermove', followPointer)
      track.removeEventListener('pointerleave', leaveTrack)
      track.removeEventListener('pointerup', endDrag)
      track.removeEventListener('pointercancel', endDrag)
      track.removeEventListener('lostpointercapture', endDrag)
    }
  }, [])

  return <div ref={rail} className="edge-scroll" aria-hidden="true" hidden>
    <div ref={thumb} className="edge-scroll-thumb"/>
  </div>
}
