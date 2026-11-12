'use client'

import { useEffect, useRef, type CSSProperties } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import './conductor-line.css'

/** Overhead conductor range (names follow content/catalogue.json `short`). */
const conductors = [
  {slug:'aac', name:'AAC', note:'All aluminium'},
  {slug:'aaac', name:'AAAC', note:'Alloy strength'},
  {slug:'acsr', name:'ACSR', note:'Steel-cored'},
  {slug:'aacsr', name:'AACSR', note:'Alloy, steel-cored'},
  {slug:'acar', name:'ACAR', note:'Alloy-reinforced'},
  {slug:'eco-panther', name:'ECO Panther', note:'Trapezoidal strands'},
]

// The span between the towers, in the SVG's 1200 × 200 coordinate space.
const WIRE = {x0:52, y0:30, c1:[340, 118], c2:[860, 118], x1:1148, y1:30} as const
const wirePath = `M${WIRE.x0} ${WIRE.y0} C ${WIRE.c1.join(' ')}, ${WIRE.c2.join(' ')}, ${WIRE.x1} ${WIRE.y1}`
/** Height of the main wire (as a % of the stage) where a conductor at `x%` across hangs. */
function wireAt(xPercent: number) {
  const target = xPercent / 100 * 1200
  const bez = (t: number, a: number, b: number, c: number, d: number) => (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t ** 2 * c + t ** 3 * d
  let lo = 0, hi = 1
  for (let i = 0; i < 24; i++) { const mid = (lo + hi) / 2; if (bez(mid, WIRE.x0, WIRE.c1[0], WIRE.c2[0], WIRE.x1) < target) lo = mid; else hi = mid }
  return bez(lo, WIRE.y0, WIRE.c1[1], WIRE.c2[1], WIRE.y1) / 200 * 100
}
const placed = conductors.map((item, i) => {
  const x = 13 + i * (74 / (conductors.length - 1))
  return {...item, x, y:wireAt(x)}
})

function Tower({ x }: { x: number }) {
  const l = x - 16, r = x + 16
  return <path className="line-tower" pathLength={1} d={`M${l} 198 L${x} 12 L${r} 198 M${l + 5} 150 L${r - 5} 150 M${l + 9} 104 L${r - 9} 104 M${l + 12} 64 L${r - 12} 64 M${l + 5} 150 L${r - 9} 104 M${r - 5} 150 L${l + 9} 104 M${l + 9} 104 L${r - 12} 64 M${r - 9} 104 L${l + 12} 64 M${x - 34} 30 L${x + 34} 30 M${x - 26} 20 L${x + 26} 20`}/>
}

/** Featured products: PCI's overhead conductors hanging on a drawn transmission span. */
export function ConductorLine() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current!
    const reduced = matchMedia('(prefers-reduced-motion: reduce)')
    const still = () => reduced.matches || document.documentElement.dataset.pciMotion === 'paused'
    // Text and links are visible by default (no JavaScript, reduced motion); the entrance only runs when the span is still below the fold.
    if (still() || el.getBoundingClientRect().top < innerHeight * .8) return
    el.dataset.entrance = 'waiting'
    const show = () => { el.dataset.entrance = 'running'; io.disconnect(); el.removeEventListener('focusin', show) }
    const io = new IntersectionObserver(entries => { if (entries[0].isIntersecting) show() }, {threshold:.3})
    io.observe(el)
    el.addEventListener('focusin', show)
    return () => { io.disconnect(); el.removeEventListener('focusin', show) }
  }, [])
  return <div ref={ref} className="conductor-line">
    <div className="conductor-span">
      <svg className="conductor-span-art" viewBox="0 0 1200 200" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <Tower x={WIRE.x0}/>
        <Tower x={WIRE.x1}/>
        <path className="line-wire" pathLength={1} d={wirePath}/>
        <path className="line-wire line-wire-two" pathLength={1} d={`M${WIRE.x0 - 8} 20 C 340 98, 860 98, ${WIRE.x1 + 8} 20`}/>
      </svg>
      <ul className="conductor-list" aria-label="Featured overhead conductors">
        {placed.map((item, i) => <li key={item.slug} style={{'--i':i, '--x':`${item.x}%`, '--y':`${item.y}%`} as CSSProperties}>
          <Link href={`/products/${item.slug}/`}>
            <span className="conductor-clamp" aria-hidden="true"/>
            <Image src={`/media/${item.slug}.webp`} width={570} height={300} alt="" sizes="(max-width: 820px) 46vw, 16vw"/>
            <b>{item.name}</b>
            <small>{item.note}</small>
          </Link>
        </li>)}
      </ul>
    </div>
    <p className="conductor-line-note">Overhead conductors for transmission and distribution lines, made to BIS, BS, IEC and ASTM standards.</p>
  </div>
}
