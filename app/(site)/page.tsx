import type { Metadata } from 'next'
import { Kicker, Picture, TextLink } from '@/components/site'
import { Timeline } from '@/components/interactions'
import { HeroFilm } from '@/components/hero'
import { ClientShowcase } from '@/components/client-showcase'
import { Inquiry } from '@/components/inquiry'
import { Updates } from '@/components/catalogue'
import { ConductorLine } from '@/components/conductor-line'
import { Ambient } from '@/components/ambient'
import { AboutCable } from '@/components/about-cable'
import { Reach } from '@/components/reach'
import { ProductFilm } from '@/components/product-film'
import { address, catalogue, company, edited, siteUrl, structured } from '@/lib/content'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { alternates: { canonical: '/' }, openGraph: { url: '/' } }

export default async function Home() {
  const homeCopy = await edited('home')
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html:structured({ '@type':'Organization', name:company, url:siteUrl, logo:siteUrl+'/media/logo.webp', email:'info@pcicablesindustries.com', telephone:'+91-9062207003', address:{'@type':'PostalAddress', streetAddress:address.split(', Hooghly')[0], addressLocality:'Hooghly', addressRegion:'West Bengal', postalCode:'712311', addressCountry:'IN'} }) }}/>
    <HeroFilm copy={homeCopy} productCount={catalogue.length}/>
    <AboutCable/>
    <section className="section soft ambient-host"><Ambient/><div className="wrap"><div className="section-top"><div><Kicker>Product spotlight</Kicker><h2>Featured products.</h2></div><TextLink href="/products/">Full catalogue</TextLink></div><ConductorLine/></div></section>
    <Reach/>
    <ProductFilm productCount={catalogue.length}/>
    <section className="section soft ambient-host"><Ambient/><div className="wrap center"><Kicker>PCI at a glance</Kicker><h2>Built on steady progress.</h2><div className="stats">{[['2013','Our journey began'],[catalogue.length,'Products in the catalogue'],[3,'Core product families'],[2,'First export milestones in 2022']].map(([n,label])=><div key={label}><strong>{n}</strong><span>{label}</span></div>)}</div></div></section>
    <section className="section wrap center" aria-labelledby="home-clients-heading"><Kicker>Where our work connects</Kicker><h2 id="home-clients-heading">Our clients and partners.</h2><ClientShowcase/><div className="action"><TextLink href="/clients/">Explore our clients</TextLink></div></section>
    <section className="section soft"><div className="wrap split"><figure className="photo-frame"><div><Picture src="/media/testing.webp" alt="PCI Cables testing facility"/></div><figcaption>IN-HOUSE TESTING</figcaption></figure><div><Kicker>Quality and testing</Kicker><h2>Tested with purpose.</h2><p>See how PCI’s in-house laboratory supports its cable and conductor manufacturing work.</p><TextLink href="/testing/">Testing facilities</TextLink> <TextLink href="/certificates/">View certifications</TextLink></div></div></section>
    <section className="section wrap center"><Kicker>Our journey</Kicker><h2>Milestones that move us.</h2><Timeline/><div className="action"><TextLink href="/achievements/">View the full story</TextLink></div></section>
    <section className="section reach"><div className="wrap split"><div><Kicker>Inside PCI</Kicker><h2>See the work behind every connection.</h2><p>Take a look inside our facilities and see our team at work.</p><TextLink href="/gallery/">Explore the gallery</TextLink></div><div className="work-image"><Picture src="/media/plant.webp" alt="PCI Cables site in Dankuni"/></div></div></section>
    <section className="section wrap"><div className="section-top"><div><Kicker>Latest updates</Kicker><h2>News from PCI.</h2></div><TextLink href="/news/">All updates</TextLink></div><Updates/></section>
    <section className="quote-band" id="quote"><div className="wrap split"><div><Kicker>Start a conversation</Kicker><h2>Have a cable or conductor requirement?</h2><p>Tell us what you need and our sales team will follow up.</p><a href="mailto:info@pcicablesindustries.com">info@pcicablesindustries.com</a><a href="tel:+919062207003">+91 90622 07003</a></div><Inquiry/></div></section>
  </>
}
