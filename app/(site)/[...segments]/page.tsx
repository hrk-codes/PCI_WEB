import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Arrow, Kicker, PageHead, Picture, TextLink } from '@/components/site'
import { ProductGrid, Updates, articleImages, productImage } from '@/components/catalogue'
import { Inquiry } from '@/components/inquiry'
import { ClientDirectory } from '@/components/client-directory'
import { MilestoneStory } from '@/components/milestone-story'
import { Turnover } from '@/components/turnover'
import { ProductDetail } from '@/components/product-detail'
import { AboutPage, aboutHeadline } from '@/components/about-page'
import { address, articles, catalogue, cleanHtml, company, edited, families, publicDocs, siteUrl, structured } from '@/lib/content'

export const dynamic = 'force-dynamic'
type Props = { params: Promise<{ segments: string[] }>; searchParams: Promise<Record<string, string | string[] | undefined>> }
const intros: Record<string, [string,string]> = {
  products: ['Explore the product range.', 'Find cables, overhead conductors and earth wire for power distribution, transmission and industrial projects.'],
  cables: ['Cables', 'Explore PCI’s power, control and service cable range, including aerial bunched cable and LT XLPE cable.'],
  conductors: ['Overhead conductors', 'Compare PCI’s stranded aluminium, aluminium alloy and reinforced conductor families.'],
  'earth-wire': ['Earth wire', 'Explore galvanised steel earth wire for power networks.'],
  'request-quote': ['Request a quote', 'Tell us which product or application you have in mind. PCI’s sales team can confirm specifications and availability.'],
  'contact-us': ['Contact PCI Cables', 'Reach our sales, purchasing and HR teams or visit our registered office and works in Dankuni.'],
  'vendor-registration': ['Vendor registration', 'Introduce your company and the products or services you supply to PCI’s procurement team.'],
  career: ['Careers at PCI Cables', 'Tell us about your area of interest and how you’d like to contribute.'],
  privacy: ['Privacy notice', 'How PCI uses details submitted through this website.'],
  blog: ['Stories and updates', 'Events, project news and manufacturing updates from PCI Cables.'],
  news: ['PCI Cables news', 'Company milestones, product developments and industry events.'],
  turnover: ['Company turnover', 'PCI Cables’ published financial year turnover from 2015–16 through 2024–25.'],
  clients: ['Clients', 'Explore the organisations PCI Cables has supplied across utilities, rail and public sector, international markets, and renewable energy.'],
  achievements: ['Built connection by connection.', 'Follow PCI Cables from its first years in West Bengal through cable and conductor manufacturing, first exports and new product milestones.'],
}
const pages = new Map(publicDocs.map(d=>[d.slug,d]))
const pagePhotos: Record<string,string> = {
  'about-us':'factory.webp', products:'hero-range.webp', cables:'hero-cables.webp', conductors:'2025-12-conductors-2.webp',
  'earth-wire':'2025-12-earth-wire-1.webp', testing:'testing.webp', gallery:'plant.webp', career:'factory.webp', news:'event.webp',
}

async function resolve(segments: string[]) {
  const [first, second] = segments
  if (segments.length === 2 && first === 'products') {
    const product = catalogue.find(p=>p.slug===second)
    if (!product) notFound()
    const revision = await edited('product:'+second)
    return { slug: first, product, title: revision?.title || product.name, summary: revision?.summary || product.summary, html: revision?.html || '', article: undefined }
  }
  if (segments.length === 2 && first === 'blog') {
    const article = articles.find(a=>a.slug===second)
    if (!article) notFound()
    const revision = await edited(second)
    return { slug: first, article, title: revision?.title || article.title, summary: revision?.summary || article.summary, html: revision?.html || article.html, product: undefined }
  }
  if (segments.length !== 1 || (!intros[first] && !pages.has(first))) notFound()
  const doc = pages.get(first)
  const revision = await edited(first)
  if (first === 'about-us') {
    // The designed page carries the story; CMS edits to the title, summary or body still take effect.
    const title = revision?.title.trim()
    const html = revision?.html.trim()
    return {
      slug: first,
      title: title && !['about us', doc?.title.trim().toLowerCase()].includes(title.toLowerCase()) ? title : aboutHeadline,
      summary: revision?.summary.trim() || doc!.summary,
      html: html && html !== cleanHtml(doc?.html || '').trim() ? html : '',
      product: undefined,
      article: undefined,
    }
  }
  if (first === 'clients' || first === 'achievements') {
    const title = revision?.title.trim()
    const summary = revision?.summary.trim()
    const html = revision?.html.trim()
    return {
      slug: first,
      title: title && title !== doc?.title.trim() ? title : intros[first][0],
      summary: summary && summary !== doc?.summary.trim() ? summary : intros[first][1],
      html: html && html !== cleanHtml(doc?.html || '').trim() ? html : '',
      product: undefined,
      article: undefined,
    }
  }
  return { slug:first, title:revision?.title || intros[first]?.[0] || doc!.title, summary:revision?.summary || intros[first]?.[1] || doc!.summary, html:revision?.html || doc?.html || '', product:undefined, article:undefined }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { segments } = await params
  const d = await resolve(segments)
  const url = '/'+segments.join('/')+'/'
  const title = d.slug === 'achievements' && d.title === intros.achievements[0] ? 'Milestones' : d.slug === 'about-us' && d.title === aboutHeadline ? 'About us' : d.title
  const images = d.product ? [productImage(d.product)] : d.article ? ['/media/'+articleImages[d.article.slug]] : [d.slug === 'achievements' ? '/media/plant.webp' : '/media/hero-cables.webp']
  return { title, description:d.summary, alternates:{canonical:url}, openGraph:{ title, description:d.summary, url, images, type:d.article?'article':'website' } }
}

function Rich({ html }: { html: string }) { return <div className="rich" dangerouslySetInnerHTML={{ __html: html }}/> }
function ContactDetails() {
  return <div className="contact-info"><Kicker>Registered office & works</Kicker><h2>Find us in Dankuni.</h2><p>{address}</p><dl>
    <dt>Sales & marketing</dt><dd><a href="tel:+919062207003">+91 90622 07003</a></dd>
    <dt>Purchase</dt><dd><a href="tel:+919062207005">+91 90622 07005</a></dd>
    <dt>HR</dt><dd><a href="tel:+919062207010">+91 90622 07010</a></dd>
    <dt>Email</dt><dd><a href="mailto:info@pcicablesindustries.com">info@pcicablesindustries.com</a></dd>
  </dl><a className="text-link" href={'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(company+' '+address)}>View directions <Arrow diagonal/></a></div>
}
function Privacy() {
  return <div className="rich"><h2>Information you send us</h2><p>When you send an inquiry or application, PCI receives the information you enter, such as your name, email address, phone number, company and message. Our website also applies limited technical checks to help prevent abuse.</p><h2>How we use it</h2><p>We use your details to review and respond to your request and to follow up about your submission. Authorized PCI staff and service providers that run the site and deliver notifications may process this information.</p><h2>Website analytics</h2><p>When analytics is available, you can turn it on or off in the footer. It is off by default. We use it to understand visits to public pages. Form contents are excluded.</p><h2>Questions about your details</h2><p>Contact <a href="mailto:info@pcicablesindustries.com">info@pcicablesindustries.com</a> with questions or requests about your information. Please avoid including passwords, identity numbers or sensitive documents in these forms.</p></div>
}

export default async function PublicPage({ params, searchParams }: Props) {
  const { segments } = await params
  const filters = await searchParams
  const selected = typeof filters.product === 'string' ? filters.product : undefined
  const d = await resolve(segments)
  const url = siteUrl+'/'+segments.join('/')+'/'
  const breadcrumbs = { '@type':'BreadcrumbList', itemListElement:[
    {'@type':'ListItem',position:1,name:'Home',item:siteUrl+'/'},
    ...(d.product ? [{'@type':'ListItem',position:2,name:'Products',item:siteUrl+'/products/'}] : d.article ? [{'@type':'ListItem',position:2,name:'Blog',item:siteUrl+'/blog/'}] : []),
    {'@type':'ListItem',position:d.product||d.article?3:2,name:d.slug === 'achievements' ? 'Milestones' : d.slug === 'about-us' ? 'About us' : d.title,item:url},
  ] }
  if (d.slug === 'achievements') {
    return <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structured(breadcrumbs) }} />
      <MilestoneStory title={d.title} intro={d.summary}>{d.html ? <Rich html={d.html} /> : null}</MilestoneStory>
    </>
  }
  if (d.slug === 'about-us') {
    return <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structured(breadcrumbs) }} />
      <AboutPage title={d.title} intro={d.summary}>{d.html ? <Rich html={d.html} /> : null}</AboutPage>
    </>
  }
  const schema = d.product ? {'@type':'Product', name:d.title, description:d.summary, image:siteUrl+productImage(d.product), url, manufacturer:{'@type':'Organization',name:company}} : d.article ? {'@type':'Article',headline:d.title,description:d.summary,datePublished:d.article.date+'+05:30',image:siteUrl+'/media/'+articleImages[d.article.slug],mainEntityOfPage:url,author:{'@type':'Organization',name:company,url:siteUrl}} : null
  let body: React.ReactNode
  if (d.product) {
    return <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structured(breadcrumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structured(schema!) }} />
      <ProductDetail product={d.product} title={d.title} summary={d.summary}>{d.html ? <Rich html={d.html} /> : null}</ProductDetail>
    </>
  } else if (d.article) {
    body = <article className="reading"><div className="article-hero"><Picture src={'/media/'+articleImages[d.article.slug]} alt="" priority/></div><Rich html={d.html}/><TextLink href="/blog/">All stories</TextLink></article>
  } else if (d.slug==='products' || families[d.slug]) {
    body = <><nav className="family-nav" aria-label="Product families">{[['products','All products'], ...Object.entries(families)].map(([id,label])=><Link aria-current={d.slug===id?'page':undefined} key={id} href={'/'+id+'/'}>{label}</Link>)}<a href="/media/catalogue.pdf">Catalogue PDF ↗</a></nav>
      {d.slug==='products' ? Object.entries(families).map(([family,label])=>{
        const items = catalogue.filter(p=>p.family===family)
        return <section className="catalogue-family" key={family} aria-labelledby={'family-'+family}><div className="section-top"><div><Kicker>{items.length} {items.length===1?'product':'products'}</Kicker><h2 id={'family-'+family}>{label}</h2></div><TextLink href={'/'+family+'/'}>Browse {label.toLowerCase()}</TextLink></div><ProductGrid items={items}/></section>
      }) : <ProductGrid items={catalogue.filter(p=>p.family===d.slug)}/>}</>
  } else if (['request-quote','contact-us','career','vendor-registration'].includes(d.slug)) {
    const kind = d.slug==='request-quote'?'quote':d.slug==='contact-us'?'contact':d.slug==='career'?'career':'vendor'
    body = <div className="split form-page">{kind==='contact' ? <ContactDetails/> : <div><Kicker>{kind==='quote'?'Sales':kind==='career'?'Human resources':'Procurement'}</Kicker><h2>{kind==='quote'?'Tell us about your requirement.':kind==='career'?'Introduce yourself.':'Tell us about your company.'}</h2><p>{d.summary}</p>{kind==='career' && <p>Send your résumé separately to <a href="mailto:hr@pcicablesindustries.com">hr@pcicablesindustries.com</a>.</p>}</div>}<Inquiry kind={kind} product={catalogue.some(p=>p.slug===selected)?selected:undefined}/></div>
  } else if (d.slug==='privacy') {
    body = <Privacy/>
  } else if (d.slug==='turnover') {
    body = <div className="reading"><Turnover/></div>
  } else if (d.slug==='clients') {
    body = <ClientDirectory filters={filters}>{d.html ? <Rich html={d.html} /> : null}</ClientDirectory>
  } else if (d.slug==='blog' || d.slug==='news') {
    body = <><Updates/>{d.slug==='news' && <div className="reading spaced"><Rich html={d.html}/></div>}</>
  } else if (d.slug==='gallery') {
    body = <><div className="gallery-grid">{['factory.webp','plant.webp','testing.webp','event.webp','2025-11-elecrama-2.webp','2025-11-elecrama-3.webp'].map((asset,i)=><a key={asset} href={'/media/'+asset}><Image src={'/media/'+asset} alt={['Manufacturing facility','PCI Cables works','Testing laboratory','PCI exhibit at Elecrama','Elecrama exhibit','PCI at Elecrama'][i]} width={540} height={360}/></a>)}</div><div className="reading spaced"><Rich html={d.html}/></div></>
  } else {
    body = <div className="reading"><Rich html={d.html}/></div>
  }
  const image = !d.product && !d.article && pagePhotos[d.slug]
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html:structured(breadcrumbs)}}/>{schema && <script type="application/ld+json" dangerouslySetInnerHTML={{__html:structured(schema)}}/>}<PageHead label={d.product?'Products':d.article?'Updates':d.title} title={d.title} intro={d.summary} image={image ? '/media/'+image : undefined}/><div className={d.slug === 'clients' ? 'wrap' : 'section wrap'}>{body}</div></>
}
