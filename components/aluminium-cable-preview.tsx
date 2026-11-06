'use client'

import { useState } from 'react'
import { AluminiumCableFeature } from './aluminium-cable-feature'

export function AnimationPreview() {
  const [branded, setBranded] = useState(false)
  return <main className="pci-preview">
    <header><p>PCI CABLES / REFERENCE VIDEO EDIT</p><h1>Aluminum cores.</h1><span>Your reference clip, with its original structure, camera movement, and timing preserved. Copper-colored cores changed to silver aluminum. Silent · 12.28 seconds · 25 fps.</span></header>
    <div className="pci-preview-controls" aria-label="Video version"><button type="button" aria-pressed={!branded} onClick={() => setBranded(false)}>Clean video</button><button type="button" aria-pressed={branded} onClick={() => setBranded(true)}>PCI branding</button></div>
    <section aria-label="Edited reference video"><AluminiumCableFeature key={String(branded)} branding={branded ? 'baked' : 'none'} controls/><div className="pci-preview-downloads">{(['clean', 'branded'] as const).flatMap(variant => (['mp4', 'webm'] as const).map(format => <a key={`${variant}-${format}`} href={`/media/pci-reference-aluminum-${variant}.${format}`} download>{variant} {format.toUpperCase()}</a>))}<a href="/media/pci-reference-aluminum.webp" download>WebP poster</a></div></section>
  </main>
}
