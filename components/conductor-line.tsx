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

// The wires live in a stretched 1200 × 200 space; the towers are separate fixed-ratio drawings centred on x0 and x1.
const WIRE = {x0:52, y0:30, c1:[340, 118], c2:[860, 118], x1:1148, y1:30} as const
const wirePath = `M${WIRE.x0} ${WIRE.y0} C ${WIRE.c1.join(' ')}, ${WIRE.c2.join(' ')}, ${WIRE.x1} ${WIRE.y1}`
const earthPath = `M${WIRE.x0} 20 C 340 96, 860 96, ${WIRE.x1} 20`
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
  return {...item, x, y:wireAt(x), t:(x / 100 * 1200 - WIRE.x0) / (WIRE.x1 - WIRE.x0)}
})

/**
 * A lattice transmission tower in a 140 × 420 drawing (centre x = 70). The main crossarm sits at y = 63 and the
 * earth-wire peak at y = 42, i.e. 15% and 10% of the height, matching where the wires meet the tower.
 */
const tower = (() => {
  const H = 416, legAt = (y: number) => y <= 150 ? 8 + (y - 42) / 108 * 10 : 18 + (y - 150) / (H - 150) * 34
  const L = (y: number) => 70 - legAt(y), R = (y: number) => 70 + legAt(y)
  const seg = (x1: number, y1: number, x2: number, y2: number) => `M${x1.toFixed(1)} ${y1}L${x2.toFixed(1)} ${y2}`
  const frame: string[] = [], lace: string[] = [], insulators: string[] = []
  frame.push(`M${L(42).toFixed(1)} 42L${L(150).toFixed(1)} 150L${L(H).toFixed(1)} ${H}`, `M${R(42).toFixed(1)} 42L${R(150).toFixed(1)} 150L${R(H).toFixed(1)} ${H}`)
  const levels = [42, 63, 84, 105, 128, 150, 188, 232, 284, 344, H]
  levels.forEach((y, i) => {
    if (y < H) lace.push(seg(L(y), y, R(y), y))
    const next = levels[i + 1]
    if (next) lace.push(seg(L(y), y, R(next), next), seg(R(y), y, L(next), next))
  })
  // Earth-wire peak and its bracket.
  frame.push('M56 42L70 26L84 42', seg(52, 42, 88, 42))
  // Two crossarms, each a triangular truss with lacing and a disc insulator string at each tip.
  for (const [y, reach, drop] of [[63, 64, 15], [105, 46, 13]] as const) {
    for (const s of [-1, 1]) {
      const tip = 70 + s * reach, root = 70 + s * legAt(y + drop)
      frame.push(seg(70 + s * legAt(y), y, tip, y), seg(tip, y, root, y + drop))
      for (let k = 1; k < 4; k++) { const x = 70 + s * (legAt(y) + (reach - legAt(y)) * k / 4); lace.push(seg(x, y, x - s * 6, y + drop * (1 - k / 4) + 1)) }
      insulators.push(seg(tip, y, tip, y + 16))
      for (let d = 0; d < 4; d++) insulators.push(seg(tip - 3.4, y + 5 + d * 3.2, tip + 3.4, y + 5 + d * 3.2))
    }
  }
  // Footings.
  frame.push(seg(L(H) - 8, H, L(H) + 8, H), seg(R(H) - 8, H, R(H) + 8, H))
  return {frame:frame.join(''), lace:lace.join(''), insulators:insulators.join('')}
})()

function Tower({ side }: { side: 'start' | 'end' }) {
  return <svg className={`span-tower span-tower-${side}`} viewBox="0 0 140 420" aria-hidden="true" focusable="false">
    <ellipse className="tower-shadow" cx="70" cy="417" rx="62" ry="3"/>
    <path className="tower-lace" d={tower.lace}/>
    <path className="tower-frame" d={tower.frame}/>
    <path className="tower-insulators" d={tower.insulators}/>
    <circle className="tower-light-glow" cx="70" cy="26" r="9"/>
    <circle className="tower-light" cx="70" cy="26" r="2.6"/>
  </svg>
}

const PLAY_MS = 5600
/**
 * Featured products: PCI's overhead conductors hanging on a drawn transmission span.
 * The span plays once each time it comes to rest fully in view: the line draws tower to tower, the conductors
 * drop onto it, then a soft spark runs from the left tower to the right one, lighting each clamp as it passes.
 */
export function ConductorLine() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current!, span = el.querySelector<HTMLElement>('.conductor-span')!
    const reduced = matchMedia('(prefers-reduced-motion: reduce)')
    // No JavaScript, reduced motion or the saved pause: the finished span is shown as it is.
    if (reduced.matches || document.documentElement.dataset.pciMotion === 'paused') return
    let state = '', idle = 0, finish = 0
    const set = (next: string) => { state = next; el.dataset.entrance = next }
    const headerBottom = () => document.querySelector('.site-head')?.getBoundingClientRect().bottom ?? 0
    // "Settled" means the whole span is on screen (or nearly all of it on short screens) and scrolling has stopped.
    function settled() {
      const r = span.getBoundingClientRect(), top = headerBottom(), room = innerHeight - top
      if (r.height <= room) return r.top >= top - 8 && r.bottom <= innerHeight + 8
      return Math.min(r.bottom, innerHeight) - Math.max(r.top, top) >= room * .9
    }
    const gone = () => { const r = span.getBoundingClientRect(); return r.bottom < headerBottom() || r.top > innerHeight }
    function play() {
      if (state !== 'armed' || !settled()) return
      // The hidden "armed" look has been on screen since load, so the transitions can start straight away.
      set('running')
      finish = window.setTimeout(() => set('done'), PLAY_MS)
    }
    function onScroll() {
      if (state === 'done' && gone()) set('armed')
      clearTimeout(idle)
      idle = window.setTimeout(play, 180)
    }
    const reveal = () => { if (state === 'armed') { clearTimeout(idle); set('done') } }
    set('armed')
    idle = window.setTimeout(play, 450)
    addEventListener('scroll', onScroll, {passive:true})
    addEventListener('resize', onScroll)
    el.addEventListener('focusin', reveal)
    return () => {
      clearTimeout(idle); clearTimeout(finish)
      removeEventListener('scroll', onScroll); removeEventListener('resize', onScroll)
      el.removeEventListener('focusin', reveal)
      delete el.dataset.entrance
    }
  }, [])
  return <div ref={ref} className="conductor-line">
    <div className="conductor-span">
      <svg className="conductor-span-art" viewBox="0 0 1200 200" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <path className="line-wire line-wire-two" pathLength={1} d={earthPath}/>
        <path className="line-wire" pathLength={1} d={wirePath}/>
        <path className="line-spark" pathLength={1} d={wirePath}/>
        <path className="line-spark line-spark-core" pathLength={1} d={wirePath}/>
      </svg>
      <Tower side="start"/>
      <Tower side="end"/>
      <ul className="conductor-list" aria-label="Featured overhead conductors">
        {placed.map((item, i) => <li key={item.slug} style={{'--i':i, '--x':`${item.x}%`, '--y':`${item.y}%`, '--t':item.t.toFixed(3)} as CSSProperties}>
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
