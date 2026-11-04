'use client'

import { useEffect, useRef } from 'react'

const paths = [
  'M6 5h12v14H6z M9 8h6 M9 11h6 M9 14h4',
  'M3 12h5l3-7 2 14 3-7h5',
  'M6 8c0-2 12-2 12 0v8c0 2-12 2-12 0zm0 0c0 2 12 2 12 0M8 7V4h8v3m-8 10v3h8v-3',
  'M12 3l7 3v6c0 4-4 7-7 9-3-2-7-5-7-9V6zm-3 9 2 2 4-4',
  'M4 7h6l4 4h6M4 12h5l4 4h7M4 17h5m7-11h4',
  'M6 20l2-16h8l2 16M4 20h16M8 9h8M7 15h10M8 4l8 5-9 6 11 5',
]
const points = [[8,18],[24,72],[39,24],[53,86],[65,13],[78,66],[91,22],[94,80],[12,90],[49,51]]

export function Ambient({ className = '' }: { className?: string }) {
  const layer = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = layer.current
    if (!el || !('IntersectionObserver' in window)) return
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry=>entry.isIntersecting)) return
      el.dataset.entered = 'yes'
      observer.disconnect()
    }, { threshold: .14 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return <div ref={layer} className={'ambient '+className} aria-hidden="true">
    {points.map(([x,y],i)=><svg key={x} width={i%3===0?40:28} height={i%3===0?40:28} viewBox="0 0 24 24" style={{left:x+'%',top:y+'%','--drift':(i%2===0?1:-1),'--angle':(i%2===0?-12:12)+'deg'} as React.CSSProperties}><path d={paths[i%paths.length]} fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/></svg>)}
  </div>
}
