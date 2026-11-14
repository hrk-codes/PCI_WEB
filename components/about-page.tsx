import type { CSSProperties, ReactNode } from 'react'
import Link from 'next/link'
import { catalogue } from '@/lib/content'
import { reachExports, reachStates } from '@/content/reach'
import { Arrow, Kicker, Picture } from './site'
import { PciLogo3D } from './pci-logo-3d'
import { AboutMotion } from './about-motion'
import styles from './about-page.module.css'

export const aboutHeadline = 'Built in Bengal. Strung across India and beyond.'

const facts = [
  {value:2013, label:'Founded in Dankuni, West Bengal', count:false},
  {value:catalogue.length, label:'Products across three families', count:true},
  {value:reachStates.length, label:'Indian states with PCI clients', count:true},
  {value:reachExports.length, label:'Countries supplied abroad', count:true},
  {value:800, unit:'kV', label:'Line rating our conductors serve', count:true},
]

const range = [
  {family:'cables', title:'Cables', image:'/media/products/lt-xlpe-cable.webp', text:'PVC and XLPE insulated power and control cables, service and aerial bunched cables up to 1.1 kV, and covered conductors up to 33 kV.'},
  {family:'conductors', title:'Overhead conductors', image:'/media/products/acsr.webp', text:'AAC, AAAC, ACSR, AACSR, AL-59, ACAR and ECO conductors for lines up to 800 kV, made to BIS, BS, IEC and ASTM standards.'},
  {family:'earth-wire', title:'Earth wire', image:'/media/products/gi-earth-wire.webp', text:'Hot-dip galvanised steel earth wire and stay strand that shields lines and anchors their supports.'},
]

const iso = [
  {code:'ISO 9001:2015', name:'Quality management'},
  {code:'ISO 14001:2015', name:'Environmental management'},
  {code:'ISO 45001:2018', name:'Occupational health and safety'},
]

const journey = [
  {year:'2013', text:'PCI Cables begins in West Bengal'},
  {year:'2014', text:'Cable manufacturing and supply'},
  {year:'2019', text:'Conductors join the range'},
  {year:'2022', text:'First exports, to Uganda and Nepal'},
  {year:'2023', text:'First AL-59 conductor order'},
  {year:'2024', text:'First ECO Panther order'},
  {year:'2025', text:'First 33 kV covered conductor'},
]

const adeep = ['Transmission and distribution line hardware', 'Tubular poles', 'Galvanised structures and towers', 'Cable drums of every type']

const d = (i: number) => ({'--d':i} as CSSProperties)
/** Height of the journey wire (a quadratic sag, 6 → 46 → 6 in a 40 px strip) at fraction t, as an offset for the node. */
const sag = (t: number) => 6 + 80 * t * (1 - t) - 32.5

/** A lattice transmission tower in line art, for the ADEEP Industries panel. */
function TowerArt() {
  const legs = 'M60 236 82 64M140 236 118 64M82 64 92 18h16l10 46'
  const braces = Array.from({length:7}, (_, k) => {
    const y0 = 236 - k * 24.6, y1 = y0 - 24.6
    const x = (y: number) => 60 + (236 - y) * (22 / 172)
    return `M${x(y0)} ${y0} ${200 - x(y1)} ${y1}M${200 - x(y0)} ${y0} ${x(y1)} ${y1}M${x(y1)} ${y1}H${200 - x(y1)}`
  }).join('')
  return <svg className={styles.tower} viewBox="0 0 200 250" aria-hidden="true" focusable="false">
    <path d={legs + braces} />
    <path d="M30 64h140M44 100h112M36 64v10M164 64v10M50 100v10M150 100v10M92 18l-40 46M108 18l40 46" />
    <path className={styles.towerWire} d="M-40 76 Q 0 96 36 74M164 74Q 200 96 240 76M-40 112Q 10 130 50 110M150 110Q 190 130 240 112"/>
  </svg>
}

export function AboutPage({ title, intro, children }: { title: string; intro: string; children?: ReactNode }) {
  const isDefault = title === aboutHeadline
  const [lead, rest] = isDefault ? ['Built in Bengal.', 'Strung across India and beyond.'] : [title, '']
  return <div className={styles.about} data-about>
    <AboutMotion/>
    <header className={styles.hero}>
      <div className={styles.heroPhoto} aria-hidden="true"><Picture src="/media/factory.webp" alt="" priority sizes="100vw"/></div>
      <div className={styles.heroGrid} aria-hidden="true"/>
      <svg className={styles.heroLines} viewBox="0 0 1600 600" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <path d="M-20 120 Q 400 260 800 150 T 1620 110"/><path d="M-20 168 Q 400 300 800 196 T 1620 160"/><path d="M-20 214 Q 400 340 800 240 T 1620 206"/>
      </svg>
      <div className={`wrap ${styles.heroLayout}`}>
        <div className={styles.heroCopy}>
          <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">About us</span></nav>
          <Kicker>About PCI Cables</Kicker>
          <h1>{lead}{rest && <> <span className={styles.accent}>{rest}</span></>}</h1>
          <p>{intro}</p>
          <div className={styles.heroActions}>
            <Link className="button" href="/products/">Explore the range <Arrow/></Link>
            <Link className={styles.ghost} href="/achievements/">Our journey <Arrow diagonal/></Link>
          </div>
        </div>
        <PciLogo3D/>
      </div>
      <div className="wrap">
        <dl className={styles.facts}>
          {facts.map((f, i) => <div key={f.label} data-reveal style={d(i)}>
            <dt>{f.label}</dt>
            <dd><span data-count-to={f.count ? f.value : undefined}>{f.value}</span>{f.unit && <small>{f.unit}</small>}</dd>
          </div>)}
        </dl>
      </div>
    </header>

    <section className={`section ${styles.who}`} aria-labelledby="who-we-are">
      <div className={`wrap ${styles.whoLayout}`}>
        <div className={styles.whoCopy} data-reveal>
          <Kicker>Who we are</Kicker>
          <h2 id="who-we-are">A cable and conductor works built for the grid.</h2>
          <p className="lead">PCI Cables Industries Pvt. Ltd. makes the cables, overhead conductors and earth wire that utilities use to move power, from the transmission line to the last service connection.</p>
          <p>Our works in Dankuni, West Bengal, runs modern stranding, insulating and sheathing lines alongside an in-house test laboratory, so every drum leaves to specification. We supply electricity boards across India and utilities overseas.</p>
          <ul className={styles.values} role="list">
            <li><strong>Cost-effective</strong><span>Lean manufacturing, competitive supply</span></li>
            <li><strong>Reliable</strong><span>Tested before every dispatch</span></li>
            <li><strong>To standard</strong><span>BIS, BS, IEC and ASTM</span></li>
          </ul>
        </div>
        <div className={styles.collage} data-reveal style={d(1)}>
          <figure className={styles.photoMain}><div><Picture src="/media/factory.webp" alt="Cable drums and production lines inside the PCI works" sizes="(max-width: 820px) 90vw, 40vw"/></div></figure>
          <figure className={styles.photoInset}><div><Picture src="/media/plant.webp" alt="Stranding machines on the PCI shop floor" sizes="(max-width: 820px) 50vw, 22vw"/></div></figure>
          <p className={styles.pin}><span aria-hidden="true"/><strong>Dankuni, West Bengal</strong><small>Registered office and works</small></p>
        </div>
      </div>
    </section>

    <section className={`section ${styles.range}`} aria-labelledby="what-we-make">
      <div className="wrap">
        <div className={styles.sectionHead} data-reveal>
          <div><Kicker>What we make</Kicker><h2 id="what-we-make">One works. Three families. Every span of the network.</h2></div>
          <p>From the conductor strung between towers to the cable that reaches a customer’s meter, PCI’s range covers the whole line.</p>
        </div>
        <div className={styles.rangeGrid}>
          {range.map((item, i) => {
            const items = catalogue.filter(p => p.family === item.family)
            return <article key={item.family} className={styles.rangeCard} data-reveal style={d(i)}>
              <div className={styles.rangeImage}><Picture src={item.image} alt="" sizes="(max-width: 820px) 90vw, 30vw"/><span>{String(i + 1).padStart(2, '0')}</span></div>
              <div className={styles.rangeBody}>
                <p className={styles.count}>{items.length} {items.length === 1 ? 'product' : 'products'}</p>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <ul role="list">{items.map(p => <li key={p.slug}><Link href={`/products/${p.slug}/`}>{p.short}</Link></li>)}</ul>
                <Link className="text-link" href={`/${item.family}/`}>Browse {item.title.toLowerCase()} <Arrow diagonal/></Link>
              </div>
            </article>
          })}
        </div>
      </div>
    </section>

    <section className={`section ${styles.quality}`} aria-labelledby="quality">
      <div className={`wrap ${styles.qualityLayout}`}>
        <div className={styles.qualityCopy} data-reveal>
          <Kicker>Quality built in</Kicker>
          <h2 id="quality">Certified systems. Licensed products. Tested in-house.</h2>
          <p>Continuous, systematic work on quality is recognised by three ISO management system certifications, and PCI holds BIS licences for its cable, conductor and stay strand ranges.</p>
          <div className={styles.links}><Link className="text-link" href="/certificates/">See our certificates <Arrow diagonal/></Link><Link className="text-link" href="/testing/">Inside the test lab <Arrow diagonal/></Link></div>
        </div>
        <div className={styles.qualityGrid}>
          {iso.map((c, i) => <div key={c.code} className={styles.seal} data-reveal style={d(i)}>
            <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><circle cx="32" cy="32" r="29"/><circle cx="32" cy="32" r="22"/><path d="m22 33 7 7 14-16"/></svg>
            <strong>{c.code}</strong><span>{c.name}</span>
          </div>)}
          <div className={`${styles.seal} ${styles.bis}`} data-reveal style={d(3)}>
            <strong><b>8</b> BIS licences</strong><span>IS 14255 · IS 1554 · IS 7098 · IS 694 · IS 398 parts 1, 2 and 4 · IS 2141</span>
          </div>
          <figure className={styles.lab} data-reveal style={d(4)}>
            <div><Picture src="/media/testing.webp" alt="A technician testing a sample in PCI’s laboratory" sizes="(max-width: 820px) 90vw, 45vw"/></div>
            <figcaption>In-house laboratory · calibrated test equipment</figcaption>
          </figure>
        </div>
      </div>
    </section>

    <section className={`section ${styles.beyond}`} aria-labelledby="beyond">
      <div className="wrap">
        <div className={styles.sectionHead} data-reveal>
          <div><Kicker>Beyond cables</Kicker><h2 id="beyond">From the drum to the finished line.</h2></div>
          <p>PCI is growing past manufacturing into projects and line hardware, so one group can support a transmission or distribution line from end to end.</p>
        </div>
        <div className={styles.beyondGrid}>
          <article className={styles.epc} data-reveal>
            <div className={styles.epcImage}><Picture src="/media/2024-01-epc.webp" alt="An outdoor electrical substation with a power transformer" sizes="(max-width: 820px) 90vw, 50vw"/></div>
            <div className={styles.epcBody}>
              <p className={styles.tag}>EPC and turnkey contracting</p>
              <h3>Building substations, not just supplying them.</h3>
              <p>PCI now takes on EPC and turnkey work for power transmission and distribution, including a <strong>₹45 crore</strong> project from Assam Power Distribution Company Ltd to build a new substation.</p>
              <Link className="text-link" href="/epc/">EPC and turnkey projects <Arrow diagonal/></Link>
            </div>
          </article>
          <article className={styles.adeep} data-reveal style={d(1)}>
            <TowerArt/>
            <p className={styles.tag}>Sister concern</p>
            <h3>ADEEP Industries</h3>
            <p>Manufactures the hardware and structures that carry PCI’s conductors.</p>
            <ul role="list">{adeep.map(a => <li key={a}>{a}</li>)}</ul>
          </article>
        </div>
        <p className={styles.umbrella} data-reveal>Our aim: every support and solution a transmission and distribution line needs, <span>under one umbrella.</span></p>
      </div>
    </section>

    <section className={`section ${styles.journey}`} aria-labelledby="journey">
      <div className="wrap">
        <div className={styles.sectionHead} data-reveal>
          <div><Kicker>Our journey</Kicker><h2 id="journey">Since 2013, span by span.</h2></div>
          <Link className="text-link" href="/achievements/">Read the full story <Arrow diagonal/></Link>
        </div>
        <ol className={styles.span} data-reveal>
          <svg className={styles.spanWire} viewBox="0 0 1000 40" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M0 6 Q 500 46 1000 6"/></svg>
          {journey.map((j, i) => <li key={j.year} style={{...d(i), '--sag':`${sag(i / journey.length).toFixed(1)}px`} as CSSProperties}><span className={styles.node} aria-hidden="true"/><strong>{j.year}</strong><span>{j.text}</span></li>)}
        </ol>
      </div>
    </section>

    {children && <section className="section wrap"><div className="reading">{children}</div></section>}

    <section className={styles.cta} aria-labelledby="about-cta">
      <div className={`wrap ${styles.ctaLayout}`} data-reveal>
        <div><Kicker>Work with PCI</Kicker><h2 id="about-cta">Planning a line, a network or a plant?</h2></div>
        <div className={styles.ctaActions}><Link className="button dark" href="/request-quote/">Request a quote <Arrow/></Link><Link className={styles.ctaLink} href="/contact-us/">Contact our team <Arrow diagonal/></Link></div>
      </div>
    </section>
  </div>
}
