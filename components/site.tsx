import Image from 'next/image'
import Link from 'next/link'
import { address, company } from '@/lib/content'
import { AnalyticsPreference } from '@/components/analytics'
import { Ambient } from '@/components/ambient'

export const menus = [
  { title: 'Company', items: [['About PCI','/about-us/'], ['Management','/management/'], ['Clients','/clients/'], ['Milestones','/achievements/'], ['Turnover','/turnover/']] },
  { title: 'Products', items: [['All products','/products/'], ['Cables','/cables/'], ['Conductors','/conductors/'], ['Earth wire','/earth-wire/']] },
  { title: 'Capabilities', items: [['Testing facilities','/testing/'], ['Certifications','/certificates/'], ['EPC & turnkey contracting','/epc/']] },
  { title: 'Updates', items: [['News','/news/'], ['Blog','/blog/'], ['Press releases','/press-releases/'], ['Gallery','/gallery/']] },
]
export function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={diagonal ? 'M6 18 18 6M7 6h11v11' : 'M3 12h17m-7-7 7 7-7 7'} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
}
export function Brand() {
  return <Link className="brand" href="/"><span className="brand-mark"><Image src="/media/logo.webp" width={62} height={48} alt="" /></span><span><strong>PCI Cables</strong><small>INDUSTRIES PVT. LTD.</small></span></Link>
}
export function Header() {
  return <header className="site-head" id="top">
    <div className="head-meta"><div className="wrap meta-inner"><span>Manufactured in West Bengal, India</span><div><a href="mailto:info@pcicablesindustries.com">info@pcicablesindustries.com</a><a href="tel:+919062207003">+91 90622 07003</a></div></div></div>
    <div className="wrap navbar"><Brand/>
      <nav className="main-nav" aria-label="Main navigation"><Link href="/">Home</Link>{menus.map(m=><details className="drop" key={m.title}><summary>{m.title}<span aria-hidden="true">⌄</span></summary><div>{m.items.map(([label, url])=><Link key={url} href={url}>{label}</Link>)}</div></details>)}<Link href="/contact-us/">Contact</Link></nav>
      <Link className="button nav-cta" href="/request-quote/">Request a quote <Arrow diagonal/></Link>
      <details className="mobile-nav"><summary>Menu <span aria-hidden="true">☰</span></summary><nav aria-label="Mobile navigation"><Link href="/">Home</Link>{menus.map(m=><details key={m.title}><summary>{m.title}</summary>{m.items.map(([label,url])=><Link key={url} href={url}>{label}</Link>)}</details>)}<Link href="/contact-us/">Contact</Link><Link href="/request-quote/">Request a quote</Link></nav></details>
    </div>
  </header>
}
export function Footer() {
  const analytics = process.env.SITE_INDEXABLE === 'true' && /^G-[A-Z0-9]+$/.test(process.env.NEXT_PUBLIC_GA_ID || '') ? process.env.NEXT_PUBLIC_GA_ID : undefined
  return <footer className="site-foot"><div className="wrap foot-grid">
    <div><Brand/><p>Cables, conductors and earth wire for the power networks people depend on.</p><a href="mailto:info@pcicablesindustries.com">info@pcicablesindustries.com</a></div>
    <div><h2>Company</h2><Link href="/about-us/">About PCI</Link><Link href="/management/">Management</Link><Link href="/clients/">Clients</Link><Link href="/certificates/">Certifications</Link></div>
    <div><h2>Explore</h2><Link href="/products/">Product range</Link><Link href="/testing/">Testing facilities</Link><Link href="/epc/">EPC & turnkey</Link><a href="/media/catalogue.pdf">Product catalogue <Arrow diagonal/></a></div>
    <div><h2>Connect</h2><Link href="/contact-us/">Contact</Link><Link href="/career/">Careers</Link><Link href="/vendor-registration/">Vendor registration</Link><Link href="/news/">News</Link></div>
  </div><div className="wrap foot-end"><p><strong>Registered office & works</strong> · {address}</p><div><span>© {new Date().getFullYear()} {company}</span><div><Link href="/privacy/">Privacy notice</Link>{analytics && <AnalyticsPreference id={analytics}/>}</div></div></div></footer>
}
export function Kicker({ children }: { children: React.ReactNode }) {
  return <div className="kicker"><span aria-hidden="true"/> {children}</div>
}
export function PageHead({ title, label, intro, image }: { title: string; label: string; intro?: string; image?: string }) {
  return <section className={'page-head '+(image?'page-head-photo':'')}>{image && <div className="page-head-image"><Picture src={image} alt="" priority sizes="100vw"/></div>}<Ambient className="ambient-dark"/><div className="wrap"><div className="breadcrumbs"><Link href="/">Home</Link><span aria-hidden="true">/</span><span>{label}</span></div><Kicker>{label}</Kicker><h1>{title}</h1>{intro && <p>{intro}</p>}</div></section>
}
export function Picture({ src, alt, priority = false, sizes = '(max-width: 700px) 100vw, 40vw' }: { src: string; alt: string; priority?: boolean; sizes?: string }) {
  return <Image src={src} alt={alt} fill sizes={sizes} preload={priority} />
}
export function TextLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="text-link">{children}<Arrow diagonal/></Link>
}
