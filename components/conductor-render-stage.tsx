'use client'

import { useEffect, useRef } from 'react'
import type { ConductorKind } from '@/lib/conductor-models'

declare global { interface Window { __pciRenderConductor?: (kind: ConductorKind) => string } }

/**
 * Studio stage for rendering the conductor product images (see scripts/render-conductors.mjs).
 * `?kind=acsr` previews one conductor; the render script calls `__pciRenderConductor(kind)` for each.
 */
export function ConductorRenderStage() {
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    let disposed = false, cleanup = () => {}
    ;(async () => {
      const T = await import('three')
      const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js')
      const { buildConductor, conductorMaterials } = await import('@/lib/conductor-models')
      if (disposed || !canvas.current) return
      const el = canvas.current, width = innerWidth, height = innerHeight
      const renderer = new T.WebGLRenderer({canvas:el, antialias:true, alpha:true, preserveDrawingBuffer:true})
      renderer.setPixelRatio(1); renderer.setSize(width, height, false)
      renderer.setClearColor(0x000000, 0)
      renderer.toneMapping = T.NeutralToneMapping; renderer.toneMappingExposure = 1.2
      const scene = new T.Scene()
      // Bright, even room for reflections; the direct lights below carve the highlights along each strand.
      const pmrem = new T.PMREMGenerator(renderer), room = new RoomEnvironment()
      const env = pmrem.fromScene(room, .015); room.dispose()
      scene.environment = env.texture
      scene.environmentIntensity = .75
      // Soft studio: warm key from the upper left, cool rim from behind, low fill.
      const key = new T.DirectionalLight(0xfff3e4, 4.2); key.position.set(-4, 9, 8)
      const rim = new T.DirectionalLight(0xd6e8ff, 4.5); rim.position.set(8, 4, -4)
      const fill = new T.DirectionalLight(0x9fb4c4, .35); fill.position.set(2, -5, 4)
      scene.add(key, rim, fill)
      const camera = new T.PerspectiveCamera(22, width / height, .1, 100)
      camera.position.set(0, .8, 10.6)
      camera.lookAt(0, 0, 0)
      const materials = conductorMaterials()
      let current: {group:import('three').Group, dispose:() => void} | null = null
      function render(kind: ConductorKind) {
        if (current) { scene.remove(current.group); current.dispose() }
        const built = buildConductor(kind, materials, {length:5.4, wire:.2, step:.52})
        // Body runs lower-left to upper-right; the stepped end faces up and toward the viewer.
        const holder = new T.Group()
        holder.add(built.group)
        built.group.position.z = 2.2
        holder.rotation.set(-.42, .72, .52)
        scene.add(holder)
        current = {group:holder, dispose:built.dispose}
        renderer.render(scene, camera)
        return el.toDataURL('image/png')
      }
      window.__pciRenderConductor = render
      const kind = (new URLSearchParams(location.search).get('kind') || 'acsr') as ConductorKind
      render(kind)
      el.dataset.ready = 'yes'
      cleanup = () => { current?.dispose(); Object.values(materials).forEach(m => m.dispose()); env.dispose(); pmrem.dispose(); renderer.dispose(); delete window.__pciRenderConductor }
    })()
    return () => { disposed = true; cleanup() }
  }, [])
  return <canvas ref={canvas} style={{position:'fixed', inset:0, width:'100vw', height:'100vh', display:'block', background:'repeating-conic-gradient(#e9ece6 0 25%, #f7f6f0 0 50%) 0 0 / 24px 24px'}}/>
}
