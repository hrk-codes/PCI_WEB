'use client'

import { useEffect, useRef } from 'react'
import { CABLE_DURATION, createAluminiumCableScene, type CableLayout } from '@/lib/aluminium-cable-scene'
import { CableBrand } from './aluminium-cable-feature'

declare global { interface Window { __pciRenderFrame?: (seconds: number) => void } }

export function AluminiumCableStudio({ layout, branding = false, renderMode = false }: { layout: CableLayout; branding?: boolean; renderMode?: boolean }) {
  const host = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const element = canvas.current
    const container = host.current
    if (!element || !container) return
    let scene: ReturnType<typeof createAluminiumCableScene>
    try { scene = createAluminiumCableScene(element, layout) } catch { container.dataset.error = 'WebGL unavailable'; return }
    let frame = 0
    const started = performance.now()
    const resize = () => {
      const bounds = container.getBoundingClientRect()
      scene.resize(Math.max(1, Math.round(bounds.width)), Math.max(1, Math.round(bounds.height)))
      scene.setTime(0)
    }
    const observer = new ResizeObserver(resize)
    observer.observe(container)
    resize()
    container.dataset.ready = 'yes'
    if (renderMode) {
      window.__pciRenderFrame = seconds => scene.setTime(seconds)
    } else {
      const tick = (now: number) => { scene.setTime(((now - started) / 1000) % CABLE_DURATION); frame = requestAnimationFrame(tick) }
      frame = requestAnimationFrame(tick)
    }
    return () => { cancelAnimationFrame(frame); observer.disconnect(); delete window.__pciRenderFrame; scene.dispose(); delete container.dataset.ready }
  }, [layout, renderMode])
  return <div ref={host} className={`pci-cable-studio pci-cable-${layout}`} data-render={renderMode ? 'yes' : 'no'}>
    <div className="pci-studio-orbit pci-studio-orbit-one"/><div className="pci-studio-orbit pci-studio-orbit-two"/>
    <div className="pci-studio-light"/><canvas ref={canvas} aria-hidden="true"/>
    <div className="pci-studio-coordinate pci-studio-coordinate-left"/><div className="pci-studio-coordinate pci-studio-coordinate-right"/>
    <CableBrand visible={branding}/>
  </div>
}
