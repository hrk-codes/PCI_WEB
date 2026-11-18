import type { CSSProperties, ReactNode } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { bisLicences, certificationBody, certifiedScope, isoCertificates, testFamilies, tests } from '@/content/capabilities'
import { catalogue } from '@/lib/content'
import { Arrow, Kicker, Picture } from './site'
import { CapabilityMotion } from './capability-motion'
import { TestExplorer } from './test-explorer'
import { IsoCertificates } from './certificate-viewer'
import styles from './capabilities.module.css'

/**
 * Capabilities: testing facilities and certifications, designed as one compact section. Each page opens on a navy
 * stage, carries the same capability bar, and closes on the same call to action.
 */
type Kind = 'testing' | 'certificates'
const d = (i: number) => ({ '--d': i } as CSSProperties)
const capabilityPages: { kind: Kind; href: string; no: string; title: string; text: string }[] = [
  { kind: 'testing', href: '/testing/', no: '01', title: 'Testing facilities', text: `${tests.length} tests in our own laboratory` },
  { kind: 'certificates', href: '/certificates/', no: '02', title: 'Certifications', text: `${isoCertificates.length} ISO systems · ${bisLicences.length} BIS licences` },
]

function CapabilityBar({ current }: { current: Kind }) {
  return <nav className={styles.bar} aria-label="Capabilities">
    <div className={`wrap ${styles.barInner}`}>
      {capabilityPages.map(page => <Link key={page.kind} href={page.href} aria-current={page.kind === current ? 'page' : undefined}>
        <span className={styles.barNo}>{page.no}</span>
        <span><strong>{page.title}</strong><small>{page.text}</small></span>
        <Arrow diagonal/>
      </Link>)}
    </div>
  </nav>
}

function Hero({ label, title, intro, photo, actions, visual, facts }: { label: string; title: ReactNode; intro: string; photo: string; actions: ReactNode; visual: ReactNode; facts: [ReactNode, string][] }) {
  return <header className={styles.hero}>
    <div className={styles.heroPhoto} aria-hidden="true"><Picture src={photo} alt="" priority sizes="100vw"/></div>
    <div className={styles.heroGrid} aria-hidden="true"/>
    <svg className={styles.heroLines} viewBox="0 0 1600 600" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path d="M-20 130 Q 400 270 800 160 T 1620 120"/><path d="M-20 178 Q 400 310 800 206 T 1620 170"/>
    </svg>
    <div className={`wrap ${styles.heroLayout}`}>
      <div className={styles.heroCopy}>
        <div className="breadcrumbs"><Link href="/">Home</Link><span aria-hidden="true">/</span><span>Capabilities</span><span aria-hidden="true">/</span><span>{label}</span></div>
        <Kicker>Capabilities · {label}</Kicker>
        <h1>{title}</h1>
        <p>{intro}</p>
        <div className={styles.heroActions}>{actions}</div>
      </div>
      <div className={styles.heroVisual}>{visual}</div>
    </div>
    <div className={`wrap ${styles.facts}`}>{facts.map(([value, text], i) => <div key={i}><strong>{value}</strong><span>{text}</span></div>)}</div>
  </header>
}

function Heading({ kicker, title, text }: { kicker: string; title: string; text: string }) {
  return <div className={styles.heading} data-reveal>
    <div><Kicker>{kicker}</Kicker><h2>{title}</h2></div>
    <p>{text}</p>
  </div>
}

function Closing({ title, text }: { title: string; text: string }) {
  return <section className={styles.closing}>
    <div className={`wrap ${styles.closingInner}`} data-reveal>
      <div><h2>{title}</h2><p>{text}</p></div>
      <div className={styles.closingActions}>
        <Link className="button dark" href="/request-quote/">Request a quote <Arrow/></Link>
        <Link className={styles.closingLink} href="/contact-us/">Talk to our team <Arrow diagonal/></Link>
      </div>
    </div>
  </section>
}

/* ---------------------------------------------------------------- Testing */

/** A breaking-load test running on a conductor sample: the load climbs, the curve draws, the result stamps PASS. */
function TestRig() {
  return <figure className={styles.rig} aria-label="Illustration: a breaking load test on a conductor sample">
    <div className={styles.rigScreen}>
      <div className={styles.rigHead}><span><i/> Live test</span><span>Sample ACSR · 01</span></div>
      <div className={styles.rigBody}>
        <svg className={styles.rigFrame} viewBox="0 0 160 300" aria-hidden="true" focusable="false">
          <rect x="14" y="10" width="132" height="22" rx="2"/><rect x="14" y="268" width="132" height="22" rx="2"/>
          <path d="M26 32v236M134 32v236"/>
          <g className={styles.rigHeadMove}><rect x="40" y="58" width="80" height="18" rx="2"/><path d="M70 76h20v14H70z"/></g>
          <path className={styles.rigBase} d="M70 230h20v14H70zM40 244h80v18H40z"/>
          <g className={styles.rigSample}>
            {[-6, -2, 2, 6].map(x => <path key={x} d={`M${80 + x} 90 C ${80 + x * 1.6} 140, ${80 - x * 1.6} 180, ${80 + x} 230`}/>)}
          </g>
        </svg>
        <div className={styles.rigData}>
          <span className={styles.rigLabel}>Breaking load</span>
          <strong className={styles.rigValue}><span className={styles.rigCounter}/> <small>kN</small></strong>
          <svg className={styles.rigChart} viewBox="0 0 240 110" aria-hidden="true" focusable="false">
            <path className={styles.rigAxes} d="M10 6v96h226"/>
            <path className={styles.rigLimit} d="M10 30h226"/>
            <path className={styles.rigCurve} pathLength="1" d="M10 102 C 40 86, 60 58, 90 44 S 150 26, 190 24 L 208 22"/>
          </svg>
          <div className={styles.rigFoot}><span>Rated minimum</span><span className={styles.rigPass}>Pass ✓</span></div>
        </div>
      </div>
    </div>
    <figcaption>Illustrative readout. Conductors are tested against their rated breaking load.</figcaption>
  </figure>
}

const photoStrip = [
  { src: '/media/capabilities/stranding-hall.webp', caption: 'The production hall' },
  { src: '/media/capabilities/machine-operator.webp', caption: 'On the line' },
  { src: '/media/capabilities/drum-winding.webp', caption: 'Onto the drum' },
  { src: '/media/capabilities/drum-stacks.webp', caption: 'Drums at the works' },
  { src: '/media/capabilities/dispatch-drums.webp', caption: 'Ready for dispatch' },
]

export function TestingPage({ title, intro, children }: { title: string; intro: string; children?: ReactNode }) {
  return <div className={styles.page} data-capability>
    <CapabilityMotion/>
    <Hero label={title} photo="/media/capabilities/production-floor.webp"
      title={<>Every metre, <span className={styles.accent}>proven</span> before it leaves.</>}
      intro={intro}
      actions={<><a className="button" href="#tests">Explore the {tests.length} tests <Arrow/></a><Link className={styles.ghost} href="/certificates/">Our certifications <Arrow diagonal/></Link></>}
      visual={<TestRig/>}
      facts={[[tests.length, 'In-house tests'], [Object.keys(testFamilies).length, 'Test families, conductor to fire'], [bisLicences.length, 'BIS product licences'], ['ISO', '9001 quality system']]}/>
    <CapabilityBar current="testing"/>

    <section id="tests" className={styles.band}>
      <div className="wrap">
        <Heading kicker="Our laboratory" title={`${tests.length} tests, in our own hands.`} text="Every instrument is properly installed, periodically calibrated and recertified when its certificate falls due. Choose a family to narrow the list." />
        <TestExplorer/>
      </div>
    </section>

    <section className={`${styles.band} ${styles.dark}`}>
      <div className="wrap">
        <Heading kicker="Tested where it is made" title="From the line to the lab to the drum." text="Our laboratory sits in the same Dankuni works as the lines that make the product." />
        <div className={styles.photoStrip}>
          {photoStrip.map((photo, i) => <figure key={photo.src} data-reveal style={d(i)}>
            <div><Image src={photo.src} alt={photo.caption} fill sizes="(max-width: 820px) 50vw, 20vw"/></div>
            <figcaption>{photo.caption}</figcaption>
          </figure>)}
        </div>
      </div>
    </section>
    {children && <section className={styles.band}><div className="wrap reading">{children}</div></section>}
    <Closing title="Need test reports with your order?" text="Tell us the specification and the tests your utility or consultant requires." />
  </div>
}

/* ----------------------------------------------------------- Certificates */

const productName = (slug: string) => catalogue.find(product => product.slug === slug)?.name

export function CertificatesPage({ title, intro, children }: { title: string; intro: string; children?: ReactNode }) {
  return <div className={styles.page} data-capability>
    <CapabilityMotion/>
    <Hero label={title} photo="/media/capabilities/drum-hall.webp"
      title={<>Certified at <span className={styles.accent}>every level</span>.</>}
      intro={intro}
      actions={<><a className="button" href="#bis">See our BIS licences <Arrow/></a><Link className={styles.ghost} href="/testing/">Our testing <Arrow diagonal/></Link></>}
      visual={<a className={styles.certStack} href="#iso" aria-label="Our three ISO certificates">
        {isoCertificates.map((cert, i) => <span key={cert.code} style={d(i)}><Image src={cert.image} alt="" width={1100} height={1546} sizes="(max-width: 820px) 40vw, 14vw" priority={i === 1}/></span>)}
        <span className={styles.certSeal} aria-hidden="true"><b>ISO</b><small>9001 · 14001 · 45001</small></span>
      </a>}
      facts={[[isoCertificates.length, 'ISO management systems'], [bisLicences.length, 'BIS product licences'], ['2028', 'ISO 14001 and 45001 valid until'], [tests.length, 'In-house tests behind them']]}/>
    <CapabilityBar current="certificates"/>

    <section id="iso" className={styles.band}>
      <div className="wrap">
        <Heading kicker="Management systems" title="Quality, environment and safety." text={`Independently audited and registered by ${certificationBody}. Select a certificate to read it in full.`} />
        <IsoCertificates/>
        <blockquote className={styles.scope} data-reveal><span>Certified scope</span><p>{certifiedScope}</p></blockquote>
      </div>
    </section>

    <section id="bis" className={`${styles.band} ${styles.tint}`}>
      <div className="wrap">
        <Heading kicker="Bureau of Indian Standards" title="Product licences." text="Each licence lets PCI mark the product to its Indian Standard, under BIS surveillance of our works and laboratory." />
        <ol className={styles.bisGrid}>
          {bisLicences.map((licence, i) => {
            const name = licence.product ? productName(licence.product) : undefined
            const [code, year] = licence.standard.split(' : ')
            return <li key={licence.licence} data-reveal style={d(i % 4)}>
              <div className={styles.bisTop}><strong className={styles.bisCode}>{code}</strong><span className={styles.bisYear}>{year}</span></div>
              <p>{licence.name}</p>
              <div className={styles.bisFoot}>
                <span>Licence <b>{licence.licence}</b></span>
                {licence.product && name && <Link href={`/products/${licence.product}/`}>{name} <Arrow diagonal/></Link>}
              </div>
            </li>
          })}
        </ol>
      </div>
    </section>
    {children && <section className={styles.band}><div className="wrap reading">{children}</div></section>}
    <Closing title="Need certificate copies for a tender?" text="Ask our sales team for current copies of any ISO certificate or BIS licence." />
  </div>
}
