'use client'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import clientData from '@/content/clients.json'


const clients: Record<string, {name: string; image: string}[]> = clientData
export function Clients({ all = false }: { all?: boolean }) {
  const [active, setActive] = useState(Object.keys(clients)[0])
  return <><div className="client-tabs" aria-label="Client groups">{Object.keys(clients).map(label => <button key={label} aria-pressed={active===label} onClick={()=>setActive(label)}>{label}</button>)}</div>
    <div className="logo-grid" aria-live="polite">{clients[active].slice(0, all ? undefined : 12).map(client => <div key={client.name}><Image src={client.image} alt={client.name} width={120} height={64} /></div>)}</div></>
}
