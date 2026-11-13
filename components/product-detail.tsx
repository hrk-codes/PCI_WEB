import type { ReactNode } from 'react'
import Link from 'next/link'
import { catalogue, families } from '@/lib/content'
import { productDetails, productSpecifications } from '@/content/product-details'
import { ProductGrid, productImage } from './catalogue'
import { ProductViewer } from './product-viewer'
import { ProductSpecifications } from './product-specifications'
import { Arrow, Kicker, TextLink } from './site'
import styles from './product-detail.module.css'

type Product = typeof catalogue[number]
function StrandSections({ slug }: { slug: string }) {
  const sections = productDetails[slug].sections
  if (!sections) return null
  return <div className={styles.strandPanel}>
    <div className={styles.sectionHeading}>
      <div><Kicker>Inside the conductor</Kicker><h3>Typical strand arrangements.</h3></div>
      <p>{sections.some(section => section.core > 0) ? 'Aluminium or alloy wires surround the darker steel core.' : 'Circular stranded constructions shown in the catalogue.'}</p>
    </div>
    <div className={styles.strandGrid}>
      {sections.map(section => {
        const rings = Math.round((Math.sqrt(12 * section.total - 3) - 3) / 6)
        const wires = []
        for (let q = -rings; q <= rings; q++) {
          for (let r = Math.max(-rings, -q - rings); r <= Math.min(rings, -q + rings); r++) {
            wires.push({ x: 2 * (q + r / 2), y: Math.sqrt(3) * r, ring: Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)) })
          }
        }
        wires.sort((a, b) => a.ring - b.ring)
        const gradient = `${slug}-strand-${section.total}`
        const edge = rings * 2 + 1.2
        return <figure key={section.label}>
          <svg viewBox={`${-edge} ${-edge} ${edge * 2} ${edge * 2}`} role="img" aria-label={`${section.label}${section.core ? ' outer wires plus steel core' : ' of aluminium or aluminium alloy'}`}>
            <defs><linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fcfefd"/><stop offset=".45" stopColor="#d5e0e3"/><stop offset="1" stopColor="#7b939f"/></linearGradient></defs>
            {wires.map((wire, index) => <circle key={index} cx={wire.x} cy={wire.y} r=".94" fill={index < section.core ? '#365469' : `url(#${gradient})`} stroke="#6e8793" strokeWidth=".08" />)}
          </svg>
          <figcaption>{section.label}</figcaption>
        </figure>
      })}
    </div>
    <p className={styles.figureNote}>Cross sections illustrate strand arrangements. Wire diameters and dimensions are listed in the technical directory.</p>
  </div>
}

export async function ProductDetail({ product, title, summary, children }: { product: Product; title: string; summary: string; children?: ReactNode }) {
  const detail = productDetails[product.slug]
  const tables = productSpecifications[product.slug] || []
  const rowCount = tables.reduce((count, table) => count + table.rows.length, 0)
  const quote = `/request-quote/?product=${product.slug}`
  const sourcePage = detail.pages[0]
  const related = catalogue.filter(item => item.family === product.family && item.slug !== product.slug).slice(0, 4)
  return <div className={styles.page}>
    <header className={styles.hero}>
      <div className="wrap">
        <nav className={`breadcrumbs ${styles.breadcrumbs}`} aria-label="Breadcrumb">
          <Link href="/">Home</Link><span aria-hidden="true">/</span><Link href="/products/">Products</Link><span aria-hidden="true">/</span><span aria-current="page">{product.short}</span>
        </nav>
        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <Kicker>{families[product.family]} · PCI Cables</Kicker>
            <h1>{title}</h1>
            <p>{summary}</p>
            <div className={styles.actions}>
              <Link href={tables.length ? '#product-specifications' : '#product-overview'} className="button">{tables.length ? 'Explore sizes & data' : 'Explore the construction'} <span aria-hidden="true">↓</span></Link>
              <Link href={quote} className={styles.heroQuote}>Request a quote <Arrow diagonal /></Link>
            </div>
          </div>
          <div className={styles.heroFigure} id="product-construction">
            <ProductViewer slug={product.slug} name={product.short} poster={productImage(product)} layers={product.slug === 'control-cable' ? detail.layers.map(layer => layer.name) : undefined} />
          </div>
        </div>
        <dl className={styles.heroFacts}>
          <div><dt>Product family</dt><dd>{families[product.family]}</dd></div>
          <div><dt>{tables.length ? 'Catalogue entries' : 'Specification'}</dt><dd>{tables.length ? rowCount : 'By requirement'}</dd></div>
          <div><dt>{tables.length ? 'Technical tables' : 'Construction reference'}</dt><dd>{tables.length || `Catalogue p. ${sourcePage}`}</dd></div>
        </dl>
      </div>
    </header>

    <nav className={styles.jumpNav} aria-label="On this product page">
      <div className="wrap">
        <a href="#product-overview">Overview</a>
        {tables.length > 0 && <a href="#product-specifications">Sizes & technical data</a>}
        <a href="#product-construction">3D construction</a>
        <a href="#product-downloads">Documents</a>
      </div>
    </nav>

    <div className={`wrap ${styles.content}`}>
      <section id="product-overview" className={styles.section} aria-labelledby="product-overview-title">
        <div className={styles.sectionHeading}>
          <div><Kicker>Know the construction</Kicker><h2 id="product-overview-title">Product information.</h2></div>
          <a className={styles.sourceLink} href={`/media/catalogue.pdf#page=${sourcePage}`} target="_blank" rel="noopener noreferrer">Catalogue page {sourcePage} <Arrow diagonal /></a>
        </div>
        <div className={styles.overviewGrid}>
          <div className={styles.construction}>
            <h3>How it is built.</h3>
            <ol>
              {detail.layers.map((layer, index) => <li key={layer.name}>
                <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><div><h4>{layer.name}</h4><p>{layer.detail}</p></div>
              </li>)}
            </ol>
          </div>
          <div className={styles.application}>
            <Kicker>Where it connects</Kicker>
            <h3>Application & specification.</h3>
            <p>{detail.application}</p>
            {detail.standards.length > 0 && <><h4>References in PCI’s documents</h4><ul className={styles.standards}>{detail.standards.map(standard => <li key={standard}>{standard}</li>)}</ul></>}
            {detail.notes.map(note => <p className={styles.overviewNote} key={note}>{note}</p>)}
          </div>
        </div>
        <StrandSections slug={product.slug} />
        {children && <details className={styles.additional}><summary>Additional product information</summary>{children}</details>}
      </section>

      {tables.length > 0 ? <section id="product-specifications" className={styles.section} aria-labelledby="product-specifications-title">
        <div className={styles.sectionHeading}>
          <div><Kicker>The technical directory</Kicker><h2 id="product-specifications-title">Find your specification.</h2></div>
          <p>Browse {rowCount} published entries. Choose a standard or construction, then search by code word, area, wire format or diameter.</p>
        </div>
        <ProductSpecifications tables={tables} />
      </section> : <section className={styles.enquiry} aria-labelledby="product-enquiry-title">
        <Kicker>Your required construction</Kicker><h2 id="product-enquiry-title">Specify it with PCI.</h2>
        <p>{detail.sizeEnquiry}</p>
        <Link className="button" href={quote}>Discuss your specification <Arrow diagonal /></Link>
      </section>}

      <section id="product-downloads" className={styles.section} aria-labelledby="product-downloads-title">
        <div className={styles.sectionHeading}><div><Kicker>Keep the details</Kicker><h2 id="product-downloads-title">Documents & next steps.</h2></div><p>Keep the source documents at hand, or send PCI your size, quantity, standard and installation requirements.</p></div>
        <div className={styles.downloads}>
          <a href="/media/catalogue.pdf" className={styles.document}><span>01 / PDF</span><h3>PCI product catalogue</h3><p>2026 edition · 30 pages</p><span className={styles.documentAction}>Open the catalogue <Arrow diagonal /></span></a>
          {product.pdf && product.slug !== 'control-cable' && <a href={`/media/${product.pdf}`} className={styles.document}><span>02 / PDF</span><h3>{product.short} reference sheet</h3><p>PCI’s dedicated product document</p><span className={styles.documentAction}>Open reference sheet <Arrow diagonal /></span></a>}
          <div className={styles.quoteCard}><Kicker>Talk to PCI</Kicker><h3>Take your specification forward.</h3><p>Include the code word, cross-sectional area, construction and applicable standard in your enquiry.</p><Link className="button" href={quote}>Request a quote <Arrow diagonal /></Link></div>
        </div>
      </section>

      {related.length > 0 && <section className={styles.section} aria-labelledby="product-related-title">
        <div className={styles.sectionHeading}><div><Kicker>Keep exploring</Kicker><h2 id="product-related-title">Related products.</h2></div><TextLink href={`/${product.family}/`}>See all {families[product.family].toLowerCase()}</TextLink></div>
        <ProductGrid items={related} />
      </section>}
    </div>
  </div>
}
