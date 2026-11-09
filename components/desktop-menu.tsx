'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'

export function DesktopMenu({ title, items }: { title: string; items: string[][] }) {
  const menu = useRef<HTMLDetailsElement>(null)
  const trigger = useRef<HTMLElement>(null)

  useEffect(() => {
    const details = menu.current
    if (!details) return

    const dismissOutside = (event: PointerEvent) => {
      if (details.open && !event.composedPath().includes(details)) details.open = false
    }

    document.addEventListener('pointerdown', dismissOutside, true)
    return () => document.removeEventListener('pointerdown', dismissOutside, true)
  }, [])

  return <details ref={menu} className="drop" name="main-menu"
    onPointerEnter={event => { if (event.pointerType === 'mouse') event.currentTarget.open = true }}
    onPointerLeave={event => { if (event.pointerType === 'mouse' && !event.currentTarget.contains(document.activeElement)) event.currentTarget.open = false }}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false }}
    onKeyDown={event => {
      if (event.key !== 'Escape' || !event.currentTarget.open) return
      event.preventDefault()
      trigger.current?.focus()
      event.currentTarget.open = false
    }}>
    <summary ref={trigger}>{title}<span className="menu-chevron" aria-hidden="true"/></summary>
    <div>{items.map(([label, url]) => <Link key={url} href={url}>{label}</Link>)}</div>
  </details>
}
