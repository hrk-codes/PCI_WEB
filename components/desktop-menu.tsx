'use client'

import Link from 'next/link'

export function DesktopMenu({ title, items }: { title: string; items: string[][] }) {
  return <details className="drop" name="main-menu"
    onPointerEnter={event => { if (event.pointerType === 'mouse') event.currentTarget.open = true }}
    onPointerLeave={event => { if (event.pointerType === 'mouse' && !event.currentTarget.contains(document.activeElement)) event.currentTarget.open = false }}>
    <summary>{title}<span className="menu-chevron" aria-hidden="true"/></summary>
    <div>{items.map(([label, url]) => <Link key={url} href={url}>{label}</Link>)}</div>
  </details>
}
