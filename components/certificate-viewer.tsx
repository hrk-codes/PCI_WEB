'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { certificationBody, isoCertificates } from '@/content/capabilities'
import styles from './capabilities.module.css'

/**
 * PCI's three ISO certificates as cards; each scan opens full size in a dialog with previous / next. Every trigger
 * is a real link to the image, so without JavaScript it opens the scan itself.
 */
export function IsoCertificates() {
  const dialog = useRef<HTMLDialogElement>(null)
  const [index, setIndex] = useState(0)
  const open = (i: number) => (event: React.MouseEvent) => {
    if (!dialog.current?.showModal) return
    event.preventDefault()
    setIndex(i)
    dialog.current.showModal()
  }
  const step = (by: number) => setIndex((index + by + isoCertificates.length) % isoCertificates.length)
  const current = isoCertificates[index]
  return <>
    <div className={styles.isoGrid}>
      {isoCertificates.map((cert, i) => <article key={cert.code} className={styles.isoCard} data-reveal style={{'--d': i} as React.CSSProperties}>
        <a className={styles.isoScan} href={cert.image} onClick={open(i)} aria-label={`View the ${cert.code} certificate`}>
          <Image src={cert.image} alt="" width={1100} height={1546} sizes="(max-width: 820px) 80vw, 26vw"/>
          <span className={styles.isoZoom} aria-hidden="true">View certificate ↗</span>
        </a>
        <div className={styles.isoBody}>
          <span className={styles.isoSystem}>{cert.system}</span>
          <h3>{cert.code}</h3>
          <dl>
            <div><dt>Certificate no.</dt><dd>{cert.number}</dd></div>
            <div><dt>Issued</dt><dd>{cert.issued}</dd></div>
            <div><dt>Valid until</dt><dd>{cert.validUntil}</dd></div>
          </dl>
          <p>Registered by {certificationBody}</p>
        </div>
      </article>)}
    </div>
    <dialog ref={dialog} className={styles.certDialog} aria-label={`${current.code} certificate`} onClick={event => { if (event.target === dialog.current) dialog.current.close() }} onKeyDown={event => { if (event.key === 'ArrowRight') step(1); if (event.key === 'ArrowLeft') step(-1) }}>
      <div className={styles.certDialogBar}>
        <div><strong>{current.code}</strong><span>{current.system} · {current.number}</span></div>
        <div className={styles.certDialogActions}>
          <button type="button" onClick={() => step(-1)} aria-label="Previous certificate">‹</button>
          <button type="button" onClick={() => step(1)} aria-label="Next certificate">›</button>
          <a href={current.image} target="_blank" rel="noopener">Open image ↗</a>
          <button type="button" onClick={() => dialog.current?.close()} aria-label="Close">×</button>
        </div>
      </div>
      <div className={styles.certDialogImage}><Image key={current.image} src={current.image} alt={`${current.code} certificate of registration issued to PCI Cables Industries Pvt. Ltd.`} width={1100} height={1546} sizes="(max-width: 700px) 92vw, 620px"/></div>
    </dialog>
  </>
}
