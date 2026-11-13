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
      const { createStudioEnvironment } = await import('@/lib/studio')
      const { EffectComposer } = await import('three/addons/postprocessing/EffectComposer.js')
      const { RenderPass } = await import('three/addons/postprocessing/RenderPass.js')
      const { GTAOPass } = await import('three/addons/postprocessing/GTAOPass.js')
      const { OutputPass } = await import('three/addons/postprocessing/OutputPass.js')
      const { buildConductor, conductorMaterials } = await import('@/lib/conductor-models')
      if (disposed || !canvas.current) return
      const el = canvas.current, width = innerWidth, height = innerHeight
      const renderer = new T.WebGLRenderer({canvas:el, antialias:true, alpha:true, preserveDrawingBuffer:true})
      renderer.setPixelRatio(1); renderer.setSize(width, height, false)
      renderer.setClearColor(0x000000, 0)
      renderer.toneMapping = T.NeutralToneMapping; renderer.toneMappingExposure = 1.2
      const scene = new T.Scene()
      // Studio reflections (bright room plus strip softboxes); the direct lights below carve each strand.
      const env = createStudioEnvironment(renderer)
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
      // Ambient occlusion adds the soft contact shadow where wires touch and where each layer steps back.
      const composer = new EffectComposer(renderer)
      composer.setPixelRatio(1); composer.setSize(width, height)
      composer.addPass(new RenderPass(scene, camera))
      const ao = new GTAOPass(scene, camera, width, height)
      ao.updateGtaoMaterial({radius:.55, distanceExponent:1.4, thickness:2, scale:1.4, samples:32})
      ao.blendIntensity = 1
      composer.addPass(ao)
      composer.addPass(new OutputPass())
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
        composer.render()
        return el.toDataURL('image/png')
      }
      window.__pciRenderConductor = render
      const kind = (new URLSearchParams(location.search).get('kind') || 'acsr') as ConductorKind
      render(kind)
      el.dataset.ready = 'yes'
      cleanup = () => { current?.dispose(); Object.values(materials).forEach(m => m.dispose()); env.dispose(); ao.dispose(); composer.dispose(); renderer.dispose(); delete window.__pciRenderConductor }
    })()
    return () => { disposed = true; cleanup() }
  }, [])
  return <canvas ref={canvas} style={{position:'fixed', inset:0, width:'100vw', height:'100vh', display:'block', background:'repeating-conic-gradient(#e9ece6 0 25%, #f7f6f0 0 50%) 0 0 / 24px 24px'}}/>
}
