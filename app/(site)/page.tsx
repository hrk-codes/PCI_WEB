import type { Metadata } from 'next'
import Link from 'next/link'
import { Arrow, Kicker, Picture, TextLink } from '@/components/site'
import { Hero, Clients, Timeline } from '@/components/interactions'
import { Inquiry } from '@/components/inquiry'
import { ProductGrid, Updates } from '@/components/catalogue'
import { Ambient } from '@/components/ambient'
import { AboutCable } from '@/components/about-cable'
import { address, catalogue, company, edited, siteUrl, structured } from '@/lib/content'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { alternates: { canonical: '/' }, openGraph: { url: '/' } }
const select = (slugs: string[]) => slugs.map(slug=>catalogue.find(p=>p.slug===slug)!).filter(Boolean)
const features = select(['eco-panther','lt-xlpe-cable','aerial-bunched-cable'])
const range = select(['lt-xlpe-cable','acsr','aerial-bunched-cable','control-cable','pvc-power-cable','aaac','gi-earth-wire','eco-panther'])

function Globe() {
  return <svg className="globe" viewBox="0 0 500 340" role="img" aria-labelledby="reach-title">
    <title id="reach-title">PCI manufacturing in West Bengal and export milestones in Nepal and Uganda</title>
    <defs><radialGradient id="sphere" cx=".35" cy=".3"><stop stopColor="#286283"/><stop offset="1" stopColor="#071c2e"/></radialGradient><clipPath id="sphere-clip"><circle cx="245" cy="170" r="130"/></clipPath></defs>
    <ellipse cx="245" cy="170" rx="188" ry="48" transform="rotate(-17 245 170)" fill="none" stroke="#5493a9" strokeOpacity=".32"/>
    <circle cx="245" cy="170" r="130" fill="url(#sphere)" stroke="#69a4bb" strokeOpacity=".64"/>
    <g clipPath="url(#sphere-clip)" stroke="#6cabc3" strokeOpacity=".33" fill="none">
      <ellipse cx="245" cy="170" rx="90" ry="130"/><ellipse cx="245" cy="170" rx="42" ry="130"/>
      <path d="M115 170h260M245 40v260M123 113q122 45 244 0M123 227q122-45 244 0M154 75q91 38 182 0M154 265q91-38 182 0"/>
      <path d="m172 105 20-17 27 7 21-11 52 10 39 24 9 21-26 1-14 26-17 1-11 30-15-14-10-30-24-14-11 13-19-4-17-13-16-6zm17 60 32-10 21 10 12 31-22 39-16 13-11-31-18-20z" fill="#467f96" fillOpacity=".42"/>
    </g><g fill="none" stroke="#ff854f" strokeWidth="1.5" strokeDasharray="3 5"><path d="M277 154Q256 110 217 191"/><path d="M277 154q-6-24-15-14"/></g>
    <g fill="#ff854f"><circle cx="277" cy="154" r="5"/><circle cx="262" cy="140" r="4"/><circle cx="217" cy="191" r="4"/></g>
    <g fill="#e1f0f7" fontSize="13" fontFamily="system-ui,sans-serif"><text x="287" y="163">WEST BENGAL</text><text x="252" y="123">NEPAL</text><text x="158" y="207">UGANDA</text></g>
  </svg>
}

export default async function Home() {
  const homeCopy = await edited('home')
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html:structured({ '@type':'Organization', name:company, url:siteUrl, logo:siteUrl+'/media/logo.webp', email:'info@pcicablesindustries.com', telephone:'+91-9062207003', address:{'@type':'PostalAddress', streetAddress:address.split(', Hooghly')[0], addressLocality:'Hooghly', addressRegion:'West Bengal', postalCode:'712311', addressCountry:'IN'} }) }}/>
    <Hero copy={homeCopy}/>
    <AboutCable/>
    <section className="section soft ambient-host"><Ambient/><div className="wrap"><div className="section-top"><div><Kicker>Product spotlight</Kicker><h2>Featured products.</h2></div><TextLink href="/products/">Full catalogue</TextLink></div><ProductGrid items={features} feature/></div></section>
    <section className="section reach ambient-host"><Ambient className="ambient-dark"/><div className="wrap split"><div><Kicker>Our reach</Kicker><h2>From West Bengal to wider horizons.</h2><p>Manufacturing in Dankuni. Supplying power networks in India and recording early export milestones in Uganda and Nepal.</p><TextLink href="/achievements/">Explore our milestones</TextLink></div><div className="reach-visual"><Globe/><div className="reach-note"><span aria-hidden="true"/><div><strong>Dankuni, West Bengal</strong><small>PCI manufacturing and works</small></div></div></div></div></section>
    <section className="section wrap"><div className="section-top"><div><Kicker>What we make</Kicker><h2>Explore the range.</h2></div><p>Find products for power transmission, distribution, control and earthing.</p></div><ProductGrid items={range}/><div className="center action"><Link className="button" href="/products/">View all {catalogue.length} products <Arrow diagonal/></Link></div></section>
    <section className="section soft ambient-host"><Ambient/><div className="wrap center"><Kicker>PCI at a glance</Kicker><h2>Built on steady progress.</h2><div className="stats">{[['2013','Our journey began'],[catalogue.length,'Products in the catalogue'],[3,'Core product families'],[2,'First export milestones in 2022']].map(([n,label])=><div key={label}><strong>{n}</strong><span>{label}</span></div>)}</div></div></section>
    <section className="section wrap center"><Kicker>Where our work connects</Kicker><h2>Our clients and partners.</h2><Clients/><div className="action"><TextLink href="/clients/">Explore our clients</TextLink></div></section>
    <section className="section soft"><div className="wrap split"><figure className="photo-frame"><div><Picture src="/media/testing.webp" alt="PCI Cables testing facility"/></div><figcaption>IN-HOUSE TESTING</figcaption></figure><div><Kicker>Quality and testing</Kicker><h2>Tested with purpose.</h2><p>See how PCI’s in-house laboratory supports its cable and conductor manufacturing work.</p><TextLink href="/testing/">Testing facilities</TextLink> <TextLink href="/certificates/">View certifications</TextLink></div></div></section>
    <section className="section wrap center"><Kicker>Our journey</Kicker><h2>Milestones that move us.</h2><Timeline/><div className="action"><TextLink href="/achievements/">View the full story</TextLink></div></section>
    <section className="section reach"><div className="wrap split"><div><Kicker>Inside PCI</Kicker><h2>See the work behind every connection.</h2><p>Take a look inside our facilities and see our team at work.</p><TextLink href="/gallery/">Explore the gallery</TextLink></div><div className="work-image"><Picture src="/media/plant.webp" alt="PCI Cables site in Dankuni"/></div></div></section>
    <section className="section wrap"><div className="section-top"><div><Kicker>Latest updates</Kicker><h2>News from PCI.</h2></div><TextLink href="/news/">All updates</TextLink></div><Updates/></section>
    <section className="quote-band" id="quote"><div className="wrap split"><div><Kicker>Start a conversation</Kicker><h2>Have a cable or conductor requirement?</h2><p>Tell us what you need and our sales team will follow up.</p><a href="mailto:info@pcicablesindustries.com">info@pcicablesindustries.com</a><a href="tel:+919062207003">+91 90622 07003</a></div><Inquiry/></div></section>
  </>
}
