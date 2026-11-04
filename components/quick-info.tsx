'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

const preference = 'pci-pause-motion'

export function QuickInfo() {
  const dialog = useRef<HTMLDialogElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const [open,setOpen] = useState(false)
  const [pause,setPause] = useState(false)
  useEffect(()=>{
    try {
      const paused = localStorage.getItem(preference)==='yes'
      setPause(paused)
      document.documentElement.dataset.pciMotion = paused?'paused':''
    } catch {}
  },[])
  function setMotion() {
    const next = !pause
    setPause(next)
    document.documentElement.dataset.pciMotion = next?'paused':''
    try { localStorage.setItem(preference,next?'yes':'no') } catch {}
  }
  function show() {
    dialog.current?.showModal()
    setOpen(true)
  }
  function close() { dialog.current?.close() }
  return <>
    <button className="info-trigger" ref={trigger} type="button" aria-haspopup="dialog" aria-controls="pci-quick-info" aria-expanded={open} onClick={show}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7"/><path d="M12 11v5m0-8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg> Quick info
    </button>
    <dialog className="info-dialog" id="pci-quick-info" ref={dialog} aria-labelledby="info-title" onClose={()=>{setOpen(false);trigger.current?.focus()}} onClick={e=>{if(e.target===e.currentTarget) close()}}>
      <div className="info-body">
        <div className="info-heading"><div><span>PCI CABLES · QUICK ACCESS</span><h2 id="info-title">How can we help?</h2></div><button type="button" aria-label="Close quick information" onClick={close}>×</button></div>
        <a className="info-item" href="/media/catalogue.pdf"><span><strong>Product catalogue</strong><small>Download the PCI catalogue · PDF</small></span><span aria-hidden="true">↗</span></a>
        <Link className="info-item" onClick={close} href="/products/"><span><strong>Explore products</strong><small>Cables, conductors and earth wire</small></span><span aria-hidden="true">↗</span></Link>
        <Link className="info-item" onClick={close} href="/request-quote/"><span><strong>Request a quote</strong><small>Send your requirements to PCI sales</small></span><span aria-hidden="true">↗</span></Link>
        <a className="info-item" href="tel:+919062207003"><span><strong>Call sales</strong><small>+91 90622 07003</small></span><span aria-hidden="true">↗</span></a>
        <label className="motion-choice"><input type="checkbox" checked={pause} onChange={setMotion}/> Pause background motion</label>
      </div>
    </dialog>
  </>
}
