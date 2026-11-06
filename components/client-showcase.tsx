'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import clientData from '@/content/clients.json'
import styles from './client-showcase.module.css'

type Client = { name: string; image: string }
const groups = Object.values(clientData) as Client[][]
const count = groups.reduce((total, group) => total + group.length, 0)
const tileCount = groups.length * 2

function clientAt(slot: number, wave: number) {
  const group = groups[slot % groups.length]
  const row = Math.floor(slot / groups.length)
  return group[(wave * 2 + row) % group.length]
}

const firstClients = Array.from({ length: tileCount }, (_, slot) => clientAt(slot, 0))

export function ClientShowcase() {
  const section = useRef<HTMLDivElement>(null)
  const current = useRef(firstClients)
  const exitTimers = useRef<ReturnType<typeof setTimeout>[]>([])
  const [clients, setClients] = useState(firstClients)
  const [outgoing, setOutgoing] = useState<(Client | null)[]>(() => Array(tileCount).fill(null))
  const [phase, setPhase] = useState({ wave: 0, step: 0 })
  const [visible, setVisible] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [paused, setPaused] = useState(false)
  const [reduced, setReduced] = useState(false)
  const [sitePaused, setSitePaused] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updateMotion = () => setReduced(media.matches)
    const updateSiteMotion = () => setSitePaused(document.documentElement.dataset.pciMotion === 'paused')
    const observer = new IntersectionObserver(entries => setVisible(entries[0]?.isIntersecting ?? false), { threshold: 0.15 })
    const preferenceObserver = new MutationObserver(updateSiteMotion)
    if (section.current) observer.observe(section.current)
    preferenceObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-pci-motion'] })
    media.addEventListener('change', updateMotion)
    updateMotion()
    updateSiteMotion()
    setReady(true)
    return () => {
      observer.disconnect()
      preferenceObserver.disconnect()
      media.removeEventListener('change', updateMotion)
      exitTimers.current.forEach(clearTimeout)
    }
  }, [])

  const running = visible && !hovered && !focused && !paused && !reduced && !sitePaused

  useEffect(() => {
    if (!running) return
    const timer = setTimeout(() => {
      if (phase.step === tileCount) {
        setPhase({ wave: phase.wave + 1, step: 0 })
        return
      }
      const slot = phase.step
      const next = clientAt(slot, phase.wave + 1)
      const previous = current.current[slot]
      if (next.image !== previous.image) {
        current.current = current.current.map((client, index) => index === slot ? next : client)
        setClients(current.current)
        setOutgoing(old => old.map((client, index) => index === slot ? previous : client))
        clearTimeout(exitTimers.current[slot])
        exitTimers.current[slot] = setTimeout(() => {
          setOutgoing(old => old.map((client, index) => index === slot ? null : client))
        }, 480)
      }
      setPhase({ wave: phase.wave, step: slot + 1 })
    }, phase.step === 0 ? 2800 : 420)
    return () => clearTimeout(timer)
  }, [running, phase])

  return <div className={styles.showcase} ref={section}>
    <div className={styles.toolbar}>
      <p><span className={styles.signal} aria-hidden="true"/>{count} featured clients</p>
      {ready && !reduced && !sitePaused && <button className={styles.motion} type="button" aria-pressed={paused} onClick={() => setPaused(value => !value)}>
        <span aria-hidden="true">{paused
          ? <svg viewBox="0 0 18 18" width="16" height="16" fill="currentColor"><path d="M5 2.8 15 9 5 15.2z"/></svg>
          : <svg viewBox="0 0 18 18" width="16" height="16" fill="currentColor"><rect x="4" y="3" width="3.5" height="12" rx=".6"/><rect x="10.5" y="3" width="3.5" height="12" rx=".6"/></svg>}
        </span>{paused ? 'Play logos' : 'Pause logos'}
      </button>}
    </div>
    <ul className={styles.grid} aria-label="Featured PCI clients" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocusCapture={() => setFocused(true)} onBlurCapture={event => {
      if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setFocused(false)
    }}>
      {clients.map((client, slot) => <li className={styles.tile} tabIndex={0} aria-label={client.name} key={slot} data-client={client.name}>
        <span className={styles.number} aria-hidden="true">{String(slot + 1).padStart(2, '0')}</span>
        {outgoing[slot] && <span className={`${styles.face} ${styles.leaving}`} aria-hidden="true" key={'out-'+outgoing[slot].image}>
          <span className={styles.image}><Image src={outgoing[slot].image} alt="" width={180} height={88}/></span><span className={styles.name}>{outgoing[slot].name}</span>
        </span>}
        <span className={`${styles.face} ${outgoing[slot] ? styles.entering : ''}`} key={client.image}>
          <span className={styles.image}><Image src={client.image} alt="" width={180} height={88}/></span><span className={styles.name}>{client.name}</span>
        </span>
      </li>)}
    </ul>
  </div>
}
