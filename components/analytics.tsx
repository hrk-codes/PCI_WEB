'use client'
import { useEffect, useState } from 'react'
import Script from 'next/script'
import { usePathname } from 'next/navigation'

type AnalyticsWindow = Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void }
const key = 'pci-analytics-choice'
export function AnalyticsPreference({ id }: { id: string }) {
  const pathname = usePathname()
  const [enabled,setEnabled] = useState(false)
  const [loaded,setLoaded] = useState(false)
  useEffect(()=>{setEnabled(localStorage.getItem(key)==='yes')},[])
  useEffect(()=>{
    if (loaded && enabled) (window as AnalyticsWindow).gtag?.('event','page_view',{ page_path:pathname })
  },[pathname,loaded,enabled])
  function toggle() {
    const next = !enabled
    localStorage.setItem(key,next?'yes':'no')
    setEnabled(next)
    if (!next && loaded) window.location.reload()
  }
  return <>
    <button type="button" className="analytics-preference" aria-pressed={enabled} onClick={toggle}>Analytics {enabled?'on':'off'}</button>
    {enabled && <Script src={'https://www.googletagmanager.com/gtag/js?id='+id} strategy="afterInteractive" onReady={()=>{
      const w = window as AnalyticsWindow
      if (!w.gtag) {
        w.dataLayer = w.dataLayer || []
        w.gtag = function () { w.dataLayer!.push(arguments) }
        w.gtag('js',new Date())
        w.gtag('config',id,{send_page_view:false})
      }
      setLoaded(true)
    }}/>}
  </>
}
