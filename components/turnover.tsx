'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { turnoverHistory } from '@/content/turnover'
import styles from './turnover.module.css'

const history = turnoverHistory
const SCALE = 30000 // ₹ lakh at the top of the plot (₹300 crore)
const lakh = new Intl.NumberFormat('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2})
const crore = (value: number) => (value / 100).toLocaleString('en-IN', {minimumFractionDigits:1, maximumFractionDigits:1})
const last = history.length - 1
const first = history[0][1], latest = history[last][1]
const multiple = Math.round(latest / first)
const cagr = Math.round((Math.pow(latest / first, 1 / last) - 1) * 100)
const peak = history.reduce((best, row) => row[1] > best[1] ? row : best)

/** Bar-top points in a 0–100 plot space, and a smooth trend curve through them (Catmull-Rom as cubic Béziers). */
const points = history.map(([, value], i) => [(i + .5) * (100 / history.length), 100 - value / SCALE * 100] as const)
const trend = points.map((p, i) => {
  if (!i) return `M${p[0]} ${p[1]}`
  const p0 = points[i - 2] ?? points[i - 1], p1 = points[i - 1], p3 = points[i + 1] ?? p
  return `C${p1[0] + (p[0] - p0[0]) / 6} ${p1[1] + (p[1] - p0[1]) / 6} ${p[0] - (p3[0] - p1[0]) / 6} ${p[1] - (p3[1] - p1[1]) / 6} ${p[0]} ${p[1]}`
}).join('')
/** Height of the trend at x (0–100), for the spark that runs along it. */
function trendAt(x: number) {
  const i = Math.min(points.length - 2, Math.max(0, Math.floor(x / (100 / history.length) - .5)))
  const [x0, y0] = points[i], [x1, y1] = points[i + 1]
  const u = Math.min(1, Math.max(0, (x - x0) / (x1 - x0))), s = u * u * (3 - 2 * u)
  return y0 + (y1 - y0) * s
}

export function Turnover() {
  const root = useRef<HTMLElement>(null)
  const [selected, setSelected] = useState(last)
  const [shown, setShown] = useState<number>(latest)
  useEffect(() => {
    const el = root.current!
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.pciMotion === 'paused') return
    el.dataset.motion = 'waiting'
    let frame = 0
    // The entrance plays each time the chart comes into view: bars rise year by year, the readout counts up,
    // and the trend line draws across with a spark riding its leading edge.
    function play() {
      cancelAnimationFrame(frame)
      el.dataset.motion = 'waiting'
      void el.offsetWidth
      el.dataset.motion = 'playing'
      const begin = performance.now()
      const spark = el.querySelector<HTMLElement>('[data-spark]')!, line = el.querySelector<SVGElement>('[data-line]')!
      const step = (now: number) => {
        const t = (now - begin) / 1000
        const count = Math.min(1, t / 1.6), counted = 1 - Math.pow(1 - count, 3)
        setShown(latest * counted)
        const p = Math.min(1, Math.max(0, (t - .55) / 1.7)), x = 100 * (p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2)
        line.style.clipPath = `inset(-10% ${100 - x}% -10% 0)`
        spark.style.left = `${x}%`; spark.style.top = `${trendAt(x)}%`
        spark.style.opacity = p > 0 && p < 1 ? '1' : '0'
        if (t < 2.4) frame = requestAnimationFrame(step)
        else { el.dataset.motion = 'done'; line.style.clipPath = '' }
      }
      frame = requestAnimationFrame(step)
    }
    const observer = new IntersectionObserver(entries => {
      const entry = entries[0]
      if (entry.isIntersecting && el.dataset.motion === 'waiting') play()
      else if (!entry.isIntersecting && entry.boundingClientRect.top > 0) { cancelAnimationFrame(frame); el.dataset.motion = 'waiting' }
    }, {threshold:.55})
    // Plays when the bars themselves are on screen, so the rise is never missed below the fold.
    observer.observe(el.querySelector('[data-plot]')!)
    return () => { observer.disconnect(); cancelAnimationFrame(frame) }
  }, [])

  const [year, value] = history[selected]
  const previous = selected ? history[selected - 1][1] : null
  const change = previous ? (value / previous - 1) * 100 : null
  const isLatest = selected === last
  const readout = isLatest ? shown : value
  return <section ref={root} className={styles.panel} aria-labelledby="turnover-title" onPointerLeave={event => { if (event.pointerType === 'mouse') setSelected(last) }}>
    <div className={styles.head}>
      <div>
        <p className={styles.eyebrow}>Financial years {history[0][0]} to {history[last][0]}</p>
        <h2 id="turnover-title">Annual turnover</h2>
        <p className={styles.note}>As published by PCI Cables. Select a year to compare.</p>
      </div>
      <div className={styles.readout}>
        <p className={styles.readYear}>FY {year}</p>
        <p className={styles.readValue}><span>₹</span>{crore(readout)}<small>crore</small></p>
        <p className={styles.readLakh}>₹{lakh.format(value)} lakh</p>
        {change !== null
          ? <p className={styles.change} data-trend={change >= 0 ? 'up' : 'down'}><span aria-hidden="true">{change >= 0 ? '▲' : '▼'}</span>{change >= 0 ? '+' : '−'}{Math.abs(change).toFixed(1)}% on FY {history[selected - 1][0]}</p>
          : <p className={styles.change}>First published year</p>}
      </div>
    </div>

    <div className={styles.chart}>
      <div className={styles.axis} aria-hidden="true">{[300, 200, 100, 0].map(v => <span key={v} style={{'--y':`${100 - v / 3}%`} as CSSProperties}>₹{v} Cr</span>)}</div>
      <div className={styles.plot} data-plot>
        {[0, 1, 2, 3].map(k => <i key={k} className={styles.grid} style={{'--y':`${k * 100 / 3}%`} as CSSProperties} aria-hidden="true"/>)}
        <div className={styles.bars} style={{'--years':history.length} as CSSProperties}>
          {history.map(([fy, v], i) => <button key={fy} type="button" className={styles.bar} aria-pressed={i === selected}
            aria-label={`FY ${fy}: ₹${lakh.format(v)} lakh`} onPointerEnter={event => { if (event.pointerType === 'mouse') setSelected(i) }} onFocus={() => setSelected(i)} onClick={() => setSelected(i)}
            style={{'--h':`${v / SCALE * 100}%`, '--i':i} as CSSProperties}>
            <span className={styles.fill}><em>₹{crore(v)} Cr</em></span>
            <small><span>{fy.slice(2, 5)}</span>{fy.slice(5)}</small>
          </button>)}
        </div>
        <svg className={styles.trend} data-line viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <path d={trend}/>
        </svg>
        <span className={styles.spark} data-spark aria-hidden="true"/>
      </div>
    </div>

    <dl className={styles.summary}>
      <div><dt>Growth since 2015–16</dt><dd>{multiple}×</dd></div>
      <div><dt>Compound annual growth</dt><dd>{cagr}%</dd></div>
      <div><dt>Highest turnover, FY {peak[0]}</dt><dd>₹{crore(peak[1])} Cr</dd></div>
    </dl>

    <details className={styles.data}><summary>View turnover data</summary>
      <table><thead><tr><th scope="col">Financial year</th><th scope="col">Turnover (₹ lakh)</th><th scope="col">Change</th></tr></thead>
        <tbody>{history.map(([fy, v], i) => <tr key={fy}><th scope="row">{fy}</th><td>{lakh.format(v)}</td><td>{i ? `${v >= history[i - 1][1] ? '+' : '−'}${Math.abs((v / history[i - 1][1] - 1) * 100).toFixed(1)}%` : '—'}</td></tr>)}</tbody></table>
    </details>
  </section>
}
