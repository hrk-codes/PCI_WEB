import type { Metadata } from 'next'
import { Header, Footer } from '@/components/site'
import { QuickInfo } from '@/components/quick-info'
import { company, indexable, siteUrl } from '@/lib/content'
import './site.css'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'PCI Cables | Cable & Conductor Manufacturer in India', template: '%s | PCI Cables' },
  description: 'Explore cables, overhead conductors and earth wire manufactured by PCI Cables Industries in West Bengal, India.',
  robots: { index: indexable, follow: indexable },
  icons: { icon: '/media/logo.webp' },
  openGraph: { siteName: company, locale: 'en_IN', type: 'website', images: ['/media/hero-cables.webp'] },
  verification: { google: process.env.GOOGLE_SITE_VERIFICATION },
}
export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="en-IN"><body><a className="skip" href="#main">Skip to content</a><Header/><main id="main">{children}</main><Footer/><QuickInfo/></body></html>
}
