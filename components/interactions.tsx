'use client'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import clientData from '@/content/clients.json'

const slides = [
  { title: 'The power behind every connection.', summary: 'Cables, overhead conductors and earth wire for power networks across India and beyond.', image: 'hero-cables.webp', href: '/products/', cta: 'Explore our products' },
  { title: 'Engineered for what comes next.', summary: 'Explore the cable and conductor manufacturing and testing capabilities behind every PCI product.', image: 'hero-range.webp', href: '/testing/', cta: 'See our capabilities' },
]

export function Hero({ copy }: { copy: { title: string; summary: string } | null }) {
  const [index, setIndex] = useState(0)
  const current = index === 0 && copy ? { ...slides[0], ...copy } : slides[index]
  return <section className="hero" aria-roledescription="carousel" aria-label="PCI Cables introduction">
    <div className="hero-media" key={current.image}><Image src={'/media/'+current.image} alt="" fill preload={index === 0} sizes="100vw"/></div>
    <div className="hero-shade"/>
    <div className="wrap hero-content" aria-live="polite"><div className="kicker"><span/> PCI CABLES INDUSTRIES</div>
      <h1>{current.title}</h1><p>{current.summary}</p><Link className="button" href={current.href}>{current.cta} <span aria-hidden="true">↗</span></Link>
    </div>
    <div className="wrap hero-controls"><div className="slide-count"><strong>0{index + 1}</strong><span/><span>02</span></div><div><button aria-label="Previous slide" onClick={()=>setIndex((index+slides.length-1)%slides.length)}>←</button><button aria-label="Next slide" onClick={()=>setIndex((index+1)%slides.length)}>→</button></div></div>
  </section>
}

const clients: Record<string, {name: string; image: string}[]> = clientData
export function Clients({ all = false }: { all?: boolean }) {
  const [active, setActive] = useState(Object.keys(clients)[0])
  return <><div className="client-tabs" aria-label="Client groups">{Object.keys(clients).map(label => <button key={label} aria-pressed={active===label} onClick={()=>setActive(label)}>{label}</button>)}</div>
    <div className="logo-grid" aria-live="polite">{clients[active].slice(0, all ? undefined : 12).map(client => <div key={client.name}><Image src={client.image} alt={client.name} width={120} height={64} /></div>)}</div></>
}
export const milestones = [
  ['2013','PCI Cables begins its journey in West Bengal.'], ['2014','Manufacturing and supply of cables begins.'],
  ['2019','PCI starts manufacturing and supplying conductors.'], ['2022','First conductor export to Uganda and first cable export to Nepal.'],
  ['2023','First order for AL-59 conductor executed.'], ['2024','First order for ECO Panther conductor executed.'],
]
export function Timeline() {
  const [active, setActive] = useState(3)
  return <><div className="milestone" aria-live="polite"><strong>{milestones[active][0]}</strong><p>{milestones[active][1]}</p></div><div className="milestone-tabs" aria-label="Milestone years">{milestones.map(([year], index)=><button key={year} aria-pressed={active===index} onClick={()=>setActive(index)}>{year}</button>)}</div></>
}
